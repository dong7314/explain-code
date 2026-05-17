import { Router } from "express";
import { query } from "../db/pool.js";
import { asyncHandler } from "../middleware/async-handler.js";

const router = Router();

const popularSearchTerms = [
  { label: "React", trend: "up" },
  { label: "토큰", trend: "up" },
  { label: "useMemo", trend: "same" },
  { label: "AI 학습", trend: "up" },
  { label: "NestJS", trend: "down" },
  { label: "댓글", trend: "same" },
  { label: "프로젝트", trend: "up" },
  { label: "모각코", trend: "down" },
];

router.get(
  "/",
  asyncHandler(async (request, response) => {
    const q = String(request.query.q ?? "").trim();

    if (!q) {
      response.json({
        query: q,
        counts: { learning: 0, qa: 0, community: 0 },
        results: [],
        popular: popularSearchTerms,
      });
      return;
    }

    const pattern = `%${q}%`;
    const learning = await query(
      `
        SELECT
          e.id AS episode_id,
          e.title,
          e.summary,
          e.concepts,
          e.views_count,
          e.comments_count,
          g.id AS group_id,
          g.name AS group_name,
          g.project
        FROM episodes e
        JOIN project_groups g ON g.id = e.group_id
        WHERE
          e.title ILIKE $1
          OR e.summary ILIKE $1
          OR array_to_string(e.concepts, ' ') ILIKE $1
          OR g.name ILIKE $1
          OR g.project ILIKE $1
          OR g.goal ILIKE $1
          OR array_to_string(g.frameworks, ' ') ILIKE $1
        ORDER BY e.created_at DESC
        LIMIT 20
      `,
      [pattern],
    );
    const posts = await query(
      `
        SELECT
          id,
          page,
          board,
          category,
          title,
          excerpt,
          repo,
          tags,
          views_count,
          comments_count
        FROM posts
        WHERE
          title ILIKE $1
          OR excerpt ILIKE $1
          OR body ILIKE $1
          OR category ILIKE $1
          OR repo ILIKE $1
          OR array_to_string(tags, ' ') ILIKE $1
        ORDER BY created_at DESC
        LIMIT 40
      `,
      [pattern],
    );

    const results = [
      ...learning.rows.map((row) => ({
        id: `learning-${row.group_id}-${row.episode_id}`,
        tab: "learning",
        title: row.title,
        description: row.summary,
        href: `/learning/${row.group_id}/${row.episode_id}`,
        meta: `${row.group_name} · 조회 ${row.views_count} · 댓글 ${row.comments_count}`,
        tags: [row.project, ...row.concepts.slice(0, 3)],
      })),
      ...posts.rows.map((row) => ({
        id: `${row.page}-${row.id}`,
        tab: row.page,
        title: row.title,
        description: row.excerpt,
        href: `/${row.page}/${row.id}`,
        meta: `${row.board} · 조회 ${row.views_count} · 댓글 ${row.comments_count}`,
        tags: [row.repo, ...row.tags.slice(0, 3)],
      })),
    ];

    response.json({
      query: q,
      counts: {
        learning: results.filter((item) => item.tab === "learning").length,
        qa: results.filter((item) => item.tab === "qa").length,
        community: results.filter((item) => item.tab === "community").length,
      },
      results,
      popular: popularSearchTerms,
    });
  }),
);

export default router;
