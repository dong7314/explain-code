import { Router } from "express";
import { z } from "zod";
import { query } from "../db/pool.js";
import { badRequest, forbidden, notFound } from "../errors.js";
import { mapEpisode, mapGroup } from "../mappers.js";
import { asyncHandler } from "../middleware/async-handler.js";
import { optionalAuth, requireAuth } from "../middleware/auth.js";
import {
  createComment,
  listComments,
} from "../services/comments.js";
import {
  episodeTargetKey,
  setReaction,
  type ReactionValue,
} from "../services/reactions.js";
import { recordEpisodeView } from "../services/views.js";
import type { AuthRequest } from "../types.js";

const router = Router();
const anonymousUserId = "00000000-0000-0000-0000-000000000000";

const groupSelect = `
  SELECT
    g.*,
    u.username AS owner_username
  FROM project_groups g
  LEFT JOIN users u ON u.id = g.owner_id
`;

const episodeSelect = (viewerUserIdSql = "NULL") => `
  SELECT
    e.*,
    r.value AS viewer_reaction
  FROM episodes e
  LEFT JOIN reactions r
    ON r.resource_type = 'episode'
    AND r.target_key = concat('episode:', e.group_id, ':', e.id)
    AND r.user_id = ${viewerUserIdSql}
`;

const slugify = (value: string) =>
  value
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9가-힣]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 60);

const createEpisodeId = () =>
  `ep-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 8)}`;

const groupSchema = z.object({
  id: z.string().min(2).max(80).optional(),
  name: z.string().min(2).max(80),
  project: z.string().min(2).max(120),
  goal: z.string().min(2).max(500),
  explainTarget: z.string().min(2).max(200),
  frameworks: z.array(z.string().min(1).max(40)).min(1),
});

const episodeSchema = z.object({
  id: z.string().min(2).max(80).optional(),
  title: z.string().min(2).max(200),
  summary: z.string().min(2).max(800),
  flow: z.array(z.string().min(1).max(200)).default([]),
  concepts: z.array(z.string().min(1).max(80)).default([]),
  body: z.record(z.string(), z.unknown()).default({}),
});

const commentSchema = z.object({
  body: z.string().min(1).max(3000).transform((value) => value.trim()),
  parentId: z.number().int().positive().optional(),
});

const reactionSchema = z.object({
  value: z.enum(["dislike", "like"]).nullable(),
});

const parseReaction = (value: "dislike" | "like" | null): ReactionValue => {
  if (value === "like") return 1;
  if (value === "dislike") return -1;
  return null;
};

const getGroupWithEpisodes = async (groupId: string, currentUserId?: string) => {
  const groupResult = await query(`${groupSelect} WHERE g.id = $1`, [groupId]);
  const group = groupResult.rows[0];
  if (!group) throw notFound("프로젝트 그룹을 찾을 수 없습니다.");

  const episodeParams = currentUserId ? [groupId, currentUserId] : [groupId];
  const episodeResult = await query(
    `${episodeSelect(currentUserId ? "$2" : undefined)} WHERE e.group_id = $1 ORDER BY e.created_at DESC, e.id`,
    episodeParams,
  );

  return {
    ...mapGroup(group),
    episodes: episodeResult.rows.map(mapEpisode),
  };
};

router.get(
  "/",
  optionalAuth,
  asyncHandler(async (request: AuthRequest, response) => {
    const queryText = String(request.query.query ?? "").trim();
    const category = String(request.query.category ?? "전체").trim();
    const sort = String(request.query.sort ?? "recent");
    const params: unknown[] = [];
    const where: string[] = [];

    if (queryText) {
      params.push(`%${queryText}%`);
      where.push(`(
        g.name ILIKE $${params.length}
        OR g.project ILIKE $${params.length}
        OR g.goal ILIKE $${params.length}
        OR g.explain_target ILIKE $${params.length}
        OR array_to_string(g.frameworks, ' ') ILIKE $${params.length}
      )`);
    }

    if (category && category !== "전체") {
      params.push(category);
      where.push(`$${params.length} = ANY(g.frameworks)`);
    }

    const orderBy =
      sort === "name"
        ? "g.name ASC"
        : sort === "episodes"
          ? "episode_count DESC, g.updated_at DESC"
          : "g.updated_at DESC";

    const result = await query(
      `
        SELECT
          g.*,
          u.username AS owner_username,
          count(e.id)::int AS episode_count,
          EXISTS (
            SELECT 1
            FROM project_group_favorites f
            WHERE f.group_id = g.id AND f.user_id = $${params.length + 1}
          ) AS favorite
        FROM project_groups g
        LEFT JOIN users u ON u.id = g.owner_id
        LEFT JOIN episodes e ON e.group_id = g.id
        ${where.length ? `WHERE ${where.join(" AND ")}` : ""}
        GROUP BY g.id, u.username
        ORDER BY ${orderBy}
      `,
      [
        ...params,
        request.user?.id ?? "00000000-0000-0000-0000-000000000000",
      ],
    );

    const episodesResult = await query(
      `${episodeSelect("$1")} ORDER BY e.created_at DESC`,
      [request.user?.id ?? anonymousUserId],
    );
    const episodesByGroup = new Map<string, ReturnType<typeof mapEpisode>[]>();

    for (const episode of episodesResult.rows.map(mapEpisode)) {
      const current = episodesByGroup.get(episode.groupId) ?? [];
      current.push(episode);
      episodesByGroup.set(episode.groupId, current);
    }

    response.json({
      groups: result.rows.map((row) => ({
        ...mapGroup(row),
        episodeCount: row.episode_count,
        favorite: row.favorite,
        episodes: episodesByGroup.get(row.id) ?? [],
      })),
    });
  }),
);

router.post(
  "/",
  requireAuth,
  asyncHandler(async (request: AuthRequest, response) => {
    const input = groupSchema.parse(request.body);
    const id = input.id ?? slugify(input.name);
    if (!id) throw badRequest("프로젝트 그룹 id를 만들 수 없습니다.");

    const result = await query(
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
        RETURNING *
      `,
      [
        id,
        input.name,
        input.project,
        input.goal,
        input.explainTarget,
        input.frameworks,
        request.user?.id,
      ],
    );

    response.status(201).json({ group: mapGroup({ ...result.rows[0], owner_username: request.user?.username }) });
  }),
);

router.get(
  "/favorites/me",
  requireAuth,
  asyncHandler(async (request: AuthRequest, response) => {
    const result = await query(
      `
        ${groupSelect}
        JOIN project_group_favorites f ON f.group_id = g.id
        WHERE f.user_id = $1
        ORDER BY f.created_at DESC
      `,
      [request.user?.id],
    );

    response.json({ groups: result.rows.map(mapGroup) });
  }),
);

router.get(
  "/:groupId",
  optionalAuth,
  asyncHandler(async (request: AuthRequest, response) => {
    const groupId = String(request.params.groupId);
    response.json({ group: await getGroupWithEpisodes(groupId, request.user?.id) });
  }),
);

router.patch(
  "/:groupId",
  requireAuth,
  asyncHandler(async (request: AuthRequest, response) => {
    const groupId = String(request.params.groupId);
    const input = groupSchema.partial().parse(request.body);
    const group = await query<{ owner_id: string | null }>(
      "SELECT owner_id FROM project_groups WHERE id = $1",
      [groupId],
    );

    if (!group.rowCount) throw notFound("프로젝트 그룹을 찾을 수 없습니다.");
    if (group.rows[0].owner_id !== request.user?.id && request.user?.role !== "admin") {
      throw forbidden("프로젝트 그룹을 수정할 권한이 없습니다.");
    }

    await query(
      `
        UPDATE project_groups
        SET
          name = COALESCE($2, name),
          project = COALESCE($3, project),
          goal = COALESCE($4, goal),
          explain_target = COALESCE($5, explain_target),
          frameworks = COALESCE($6, frameworks)
        WHERE id = $1
      `,
      [
        groupId,
        input.name,
        input.project,
        input.goal,
        input.explainTarget,
        input.frameworks,
      ],
    );

    response.json({ group: await getGroupWithEpisodes(groupId, request.user?.id) });
  }),
);

router.post(
  "/:groupId/favorite",
  requireAuth,
  asyncHandler(async (request: AuthRequest, response) => {
    const groupId = String(request.params.groupId);
    await query(
      `
        INSERT INTO project_group_favorites (user_id, group_id)
        VALUES ($1, $2)
        ON CONFLICT DO NOTHING
      `,
      [request.user?.id, groupId],
    );

    response.status(204).send();
  }),
);

router.delete(
  "/:groupId/favorite",
  requireAuth,
  asyncHandler(async (request: AuthRequest, response) => {
    const groupId = String(request.params.groupId);
    await query(
      "DELETE FROM project_group_favorites WHERE user_id = $1 AND group_id = $2",
      [request.user?.id, groupId],
    );

    response.status(204).send();
  }),
);

router.get(
  "/:groupId/episodes",
  optionalAuth,
  asyncHandler(async (request: AuthRequest, response) => {
    const groupId = String(request.params.groupId);
    const result = await query(
      `${episodeSelect("$2")} WHERE e.group_id = $1 ORDER BY e.created_at DESC, e.id`,
      [groupId, request.user?.id ?? anonymousUserId],
    );

    response.json({ episodes: result.rows.map(mapEpisode) });
  }),
);

router.post(
  "/:groupId/episodes",
  requireAuth,
  asyncHandler(async (request: AuthRequest, response) => {
    const groupId = String(request.params.groupId);
    const input = episodeSchema.parse(request.body);
    const id = input.id ?? createEpisodeId();
    if (!id) throw badRequest("학습 글 id를 만들 수 없습니다.");

    await query(
      `
        INSERT INTO episodes (
          id,
          group_id,
          title,
          summary,
          flow,
          concepts,
          body,
          created_by,
          source
        )
        VALUES ($1, $2, $3, $4, $5, $6, $7, $8, 'manual')
      `,
      [
        id,
        groupId,
        input.title,
        input.summary,
        input.flow,
        input.concepts,
        input.body,
        request.user?.id,
      ],
    );

    response
      .status(201)
      .json({ episode: (await getGroupWithEpisodes(groupId, request.user?.id)).episodes.find((episode) => episode.id === id) });
  }),
);

router.get(
  "/:groupId/episodes/:episodeId",
  optionalAuth,
  asyncHandler(async (request: AuthRequest, response) => {
    const groupId = String(request.params.groupId);
    const episodeId = String(request.params.episodeId);
    const result = await query(
      `${episodeSelect("$3")} WHERE e.group_id = $1 AND e.id = $2`,
      [groupId, episodeId, request.user?.id ?? anonymousUserId],
    );
    const episode = result.rows[0];

    if (!episode) throw notFound("학습 글을 찾을 수 없습니다.");
    const view = await recordEpisodeView(request, groupId, episodeId);

    response.json({ episode: mapEpisode({ ...episode, views_count: view.views }) });
  }),
);

router.get(
  "/:groupId/episodes/:episodeId/comments",
  optionalAuth,
  asyncHandler(async (request: AuthRequest, response) => {
    const groupId = String(request.params.groupId);
    const episodeId = String(request.params.episodeId);
    response.json({
      comments: await listComments(
        {
          type: "episode",
          groupId,
          episodeId,
        },
        request.user?.id,
      ),
    });
  }),
);

router.post(
  "/:groupId/episodes/:episodeId/comments",
  requireAuth,
  asyncHandler(async (request: AuthRequest, response) => {
    const groupId = String(request.params.groupId);
    const episodeId = String(request.params.episodeId);
    const input = commentSchema.parse(request.body);

    const comment = await createComment(
      {
        type: "episode",
        groupId,
        episodeId,
      },
      String(request.user?.id),
      input.body,
      input.parentId,
    );

    response.status(201).json({ comment });
  }),
);

router.put(
  "/:groupId/episodes/:episodeId/reaction",
  requireAuth,
  asyncHandler(async (request: AuthRequest, response) => {
    const groupId = String(request.params.groupId);
    const episodeId = String(request.params.episodeId);
    const input = reactionSchema.parse(request.body);
    const counts = await setReaction(
      "episode",
      episodeTargetKey(groupId, episodeId),
      String(request.user?.id),
      parseReaction(input.value),
    );

    response.json(counts);
  }),
);

export default router;
