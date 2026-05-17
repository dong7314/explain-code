import { Router } from "express";
import { query } from "../db/pool.js";
import { asyncHandler } from "../middleware/async-handler.js";
import { requireAuth } from "../middleware/auth.js";
import { timeAgo } from "../utils/time.js";
import type { AuthRequest } from "../types.js";

const router = Router();

router.get(
  "/",
  requireAuth,
  asyncHandler(async (request: AuthRequest, response) => {
    const limit = Math.min(50, Math.max(1, Number(request.query.limit ?? 20)));
    const result = await query(
      `
        SELECT
          l.*,
          g.name AS group_name,
          e.title AS episode_title
        FROM integration_logs l
        LEFT JOIN project_groups g ON g.id = l.group_id
        LEFT JOIN episodes e ON e.group_id = l.group_id AND e.id = l.episode_id
        WHERE g.owner_id = $1 OR g.owner_id IS NULL OR $2 = 'admin'
        ORDER BY l.created_at DESC
        LIMIT $3
      `,
      [request.user?.id, request.user?.role, limit],
    );
    const statsResult = await query(
      `
        WITH visible_groups AS (
          SELECT id, owner_id
          FROM project_groups
          WHERE owner_id = $1 OR $2 = 'admin'
        ),
        visible_logs AS (
          SELECT l.id
          FROM integration_logs l
          LEFT JOIN project_groups g ON g.id = l.group_id
          WHERE g.owner_id = $1 OR g.owner_id IS NULL OR $2 = 'admin'
        ),
        participants AS (
          SELECT owner_id AS user_id
          FROM visible_groups
          WHERE owner_id IS NOT NULL
          UNION
          SELECT e.created_by AS user_id
          FROM episodes e
          JOIN visible_groups g ON g.id = e.group_id
          WHERE e.created_by IS NOT NULL
        )
        SELECT
          (SELECT count(*)::int FROM episodes e JOIN visible_groups g ON g.id = e.group_id) AS episode_count,
          (SELECT count(*)::int FROM participants) AS participant_count,
          (SELECT count(*)::int FROM visible_groups) AS group_count,
          (SELECT count(*)::int FROM visible_logs) AS call_count
      `,
      [request.user?.id, request.user?.role],
    );
    const stats = statsResult.rows[0] ?? {
      episode_count: 0,
      participant_count: 0,
      group_count: 0,
      call_count: 0,
    };

    response.json({
      logs: result.rows.map((row) => ({
        id: Number(row.id),
        connector: row.connector,
        groupId: row.group_id,
        groupName: row.group_name,
        episodeId: row.episode_id,
        episodeTitle: row.episode_title,
        status: row.status,
        message: row.message,
        payload: row.payload,
        time: timeAgo(row.created_at),
        createdAt: row.created_at,
      })),
      stats: {
        episodeCount: Number(stats.episode_count),
        participantCount: Number(stats.participant_count),
        groupCount: Number(stats.group_count),
        callCount: Number(stats.call_count),
      },
    });
  }),
);

export default router;
