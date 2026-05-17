import { Router } from "express";
import { query, withTransaction } from "../db/pool.js";
import { asyncHandler } from "../middleware/async-handler.js";

const router = Router();

const normalizeSearchTerm = (value: string) =>
  value.trim().replace(/\s+/g, " ").slice(0, 80);

type SearchTrend = "down" | "same" | "up";

type SearchRankRow = {
  normalized_term: string;
  rank_position: number;
};

const getTrend = (
  rankPosition: number | null,
  previousRankPosition: number | null,
): SearchTrend => {
  if (!rankPosition || !previousRankPosition) return "same";
  if (rankPosition < previousRankPosition) return "up";
  if (rankPosition > previousRankPosition) return "down";
  return "same";
};

const getRankSnapshot = async () => {
  const result = await query<SearchRankRow>(
    `
      SELECT
        normalized_term,
        row_number() OVER (
          ORDER BY search_count DESC, last_searched_at DESC
        )::int AS rank_position
      FROM search_terms
      LIMIT 100
    `,
  );

  return new Map(
    result.rows.map((row) => [row.normalized_term, row.rank_position]),
  );
};

const updateRankSnapshot = async (previousRanks: Map<string, number>) => {
  const currentRanks = await query<SearchRankRow>(
    `
      SELECT
        normalized_term,
        row_number() OVER (
          ORDER BY search_count DESC, last_searched_at DESC
        )::int AS rank_position
      FROM search_terms
      LIMIT 100
    `,
  );

  await Promise.all(
    currentRanks.rows.map((row) =>
      query(
        `
          UPDATE search_terms
          SET
            previous_rank_position = $2,
            rank_position = $3,
            updated_at = now()
          WHERE normalized_term = $1
        `,
        [
          row.normalized_term,
          previousRanks.get(row.normalized_term) ?? null,
          row.rank_position,
        ],
      ),
    ),
  );
};

const getPopularSearchTerms = async () => {
  const result = await query<{
    previous_rank_position: number | null;
    rank_position: number | null;
    search_count: number;
    term: string;
  }>(
    `
      SELECT term, search_count, rank_position, previous_rank_position
      FROM search_terms
      ORDER BY search_count DESC, last_searched_at DESC
      LIMIT 8
    `,
  );

  return result.rows.map((row) => ({
    count: Number(row.search_count),
    label: row.term,
    trend: getTrend(row.rank_position, row.previous_rank_position),
  }));
};

const recordSearchTerm = async (term: string) => {
  const normalizedTerm = normalizeSearchTerm(term);

  if (!normalizedTerm) return;

  const previousRanks = await getRankSnapshot();

  await withTransaction(async (client) => {
    await client.query(
      `
        INSERT INTO search_terms (
          normalized_term,
          term,
          search_count,
          last_searched_at
        )
        VALUES ($1, $2, 1, now())
        ON CONFLICT (normalized_term)
        DO UPDATE SET
          term = EXCLUDED.term,
          search_count = search_terms.search_count + 1,
          last_searched_at = now(),
          updated_at = now()
      `,
      [normalizedTerm.toLowerCase(), normalizedTerm],
    );
  });

  await updateRankSnapshot(previousRanks);
};

router.get(
  "/popular",
  asyncHandler(async (_request, response) => {
    response.json({ popular: await getPopularSearchTerms() });
  }),
);

router.get(
  "/",
  asyncHandler(async (request, response) => {
    const q = normalizeSearchTerm(String(request.query.q ?? ""));

    if (!q) {
      response.json({
        query: q,
        counts: { learning: 0, qa: 0, community: 0 },
        results: [],
        popular: await getPopularSearchTerms(),
      });
      return;
    }

    await recordSearchTerm(q);

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
      popular: await getPopularSearchTerms(),
    });
  }),
);

export default router;
