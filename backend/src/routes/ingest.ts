import { Router } from "express";
import { z } from "zod";
import { query, withTransaction } from "../db/pool.js";
import { badRequest } from "../errors.js";
import { mapEpisode } from "../mappers.js";
import { asyncHandler } from "../middleware/async-handler.js";
import { requireApiToken } from "../middleware/auth.js";
import type { AuthRequest } from "../types.js";

const router = Router();

const fileSchema = z.union([
  z.string().min(1).max(300),
  z.object({
    path: z.string().min(1).max(300),
    summary: z.string().min(1).max(500).optional(),
    changeType: z.enum(["added", "modified", "removed", "renamed"]).optional(),
  }),
]);

const codeSnippetSchema = z.object({
  code: z.string().max(12000),
  language: z.string().max(30).default("ts"),
  title: z.string().max(120).optional(),
  description: z.string().max(500).optional(),
});

const syntaxNoteSchema = z.object({
  name: z.string().min(1).max(80),
  description: z.string().min(1).max(800),
  example: z.string().max(4000).optional(),
  referenceUrl: z.string().url().max(500).optional(),
});

const ingestSchema = z.object({
  groupKey: z.string().min(2).max(80),
  projectName: z.string().min(2).max(120).optional(),
  title: z.string().min(2).max(200),
  summary: z.string().min(2).max(800),
  overview: z.string().min(2).max(2000).optional(),
  frameworks: z.array(z.string().min(1).max(40)).default([]),
  concepts: z.array(z.string().min(1).max(80)).default([]),
  flow: z.array(z.string().min(1).max(200)).default([]),
  files: z.array(fileSchema).default([]),
  diffSummary: z.string().max(2000).optional(),
  codeSnippets: z.array(codeSnippetSchema).default([]),
  syntaxNotes: z.array(syntaxNoteSchema).default([]),
  markdown: z.string().max(20000).optional(),
  createdBy: z.enum(["api", "claude", "codex", "manual"]).default("api"),
  sessionId: z.string().max(120).optional(),
});

const slugify = (value: string) =>
  value
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9가-힣]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 50);

const createEpisodeId = () =>
  `ep-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 8)}`;

router.get(
  "/groups",
  requireApiToken("read"),
  asyncHandler(async (_request: AuthRequest, response) => {
    const result = await query(
      `
        SELECT
          g.id,
          g.name,
          g.project,
          g.goal,
          g.explain_target,
          g.frameworks,
          g.updated_at,
          count(e.id)::int AS episode_count
        FROM project_groups g
        LEFT JOIN episodes e ON e.group_id = g.id
        GROUP BY g.id
        ORDER BY g.updated_at DESC
      `,
    );

    response.json({
      groups: result.rows.map((row) => ({
        episodeCount: row.episode_count,
        explainTarget: row.explain_target,
        frameworks: row.frameworks,
        goal: row.goal,
        id: row.id,
        name: row.name,
        project: row.project,
        updatedAt: row.updated_at,
      })),
    });
  }),
);

router.post(
  "/episodes",
  requireApiToken("write"),
  asyncHandler(async (request: AuthRequest, response) => {
    const input = ingestSchema.parse(request.body);
    const groupId = slugify(input.groupKey);
    const episodeId = createEpisodeId();

    if (!groupId) throw badRequest("groupKey가 올바르지 않습니다.");

    const result = await withTransaction(async (client) => {
      const existingGroup = await client.query(
        "SELECT id FROM project_groups WHERE id = $1",
        [groupId],
      );

      if (!existingGroup.rowCount && !input.projectName) {
        throw badRequest("새 그룹을 만들려면 projectName이 필요합니다.");
      }

      await client.query(
        `
          INSERT INTO project_groups (
            id,
            name,
            project,
            goal,
            explain_target,
            frameworks,
            owner_id
          )
          VALUES ($1, $2, $3, $4, $5, $6, $7)
          ON CONFLICT (id)
          DO UPDATE SET
            frameworks = CASE
              WHEN cardinality(EXCLUDED.frameworks) > 0 THEN EXCLUDED.frameworks
              ELSE project_groups.frameworks
            END,
            updated_at = now()
        `,
        [
          groupId,
          groupId,
          input.projectName ?? groupId,
          input.diffSummary ??
            "AI 도구가 보낸 코드 변경 흐름을 학습 에피소드로 저장합니다.",
          "AI가 변경한 코드 흐름과 핵심 개념",
          input.frameworks,
          request.apiToken?.ownerId,
        ],
      );

      const episode = await client.query(
        `
          INSERT INTO episodes (
            id,
            group_id,
            title,
            summary,
            flow,
            concepts,
            body,
            source,
            created_by
          )
          VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
          RETURNING *
        `,
        [
          episodeId,
          groupId,
          input.title,
          input.summary,
          input.flow,
          input.concepts,
          {
            overview: input.overview ?? input.diffSummary ?? input.summary,
            diffSummary: input.diffSummary,
            files: input.files.map((file) =>
              typeof file === "string" ? { path: file } : file,
            ),
            codeSnippets: input.codeSnippets,
            syntaxNotes: input.syntaxNotes,
            markdown: input.markdown,
            sessionId: input.sessionId,
          },
          input.createdBy,
          request.apiToken?.ownerId,
        ],
      );

      await client.query(
        `
          INSERT INTO integration_logs (
            connector,
            group_id,
            episode_id,
            status,
            message,
            payload
          )
          VALUES ($1, $2, $3, 'success', $4, $5)
        `,
        [
          input.createdBy,
          groupId,
          episodeId,
          input.title,
          input,
        ],
      );

      await client.query(
        `
          INSERT INTO notifications (user_id, kind, title, description, href)
          VALUES ($1, 'learning', 'AI가 학습 글을 등록했어요', $2, $3)
        `,
        [
          request.apiToken?.ownerId,
          `${groupId} 그룹에 새 학습 에피소드가 등록되었습니다.`,
          `/learning/${groupId}/${episodeId}`,
        ],
      );

      return episode.rows[0];
    });

    response.status(201).json({
      episode: mapEpisode(result),
      href: `/learning/${groupId}/${episodeId}`,
    });
  }),
);

export default router;
