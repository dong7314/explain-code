import { Router } from "express";
import { query } from "../db/pool.js";
import { asyncHandler } from "../middleware/async-handler.js";
import { requireAuth } from "../middleware/auth.js";
import { timeAgo } from "../utils/time.js";
import type { AuthRequest } from "../types.js";

const router = Router();

const mapNotification = (row: any) => ({
  id: row.id,
  kind: row.kind,
  title: row.title,
  description: row.description,
  href: row.href,
  time: timeAgo(row.created_at),
  read: Boolean(row.read_at),
  createdAt: row.created_at,
});

router.get(
  "/",
  requireAuth,
  asyncHandler(async (request: AuthRequest, response) => {
    const limit = Math.min(50, Math.max(1, Number(request.query.limit ?? 10)));
    const offset = Math.max(0, Number(request.query.offset ?? 0));
    const result = await query(
      `
        SELECT *
        FROM notifications
        WHERE (user_id = $1 OR user_id IS NULL) AND read_at IS NULL
        ORDER BY created_at DESC
        LIMIT $2 OFFSET $3
      `,
      [request.user?.id, limit, offset],
    );
    const counts = await query<{ total: number; unread: number }>(
      `
        SELECT
          count(*) FILTER (WHERE read_at IS NULL)::int AS total,
          count(*) FILTER (WHERE read_at IS NULL)::int AS unread
        FROM notifications
        WHERE user_id = $1 OR user_id IS NULL
      `,
      [request.user?.id],
    );

    response.json({
      notifications: result.rows.map(mapNotification),
      total: counts.rows[0]?.total ?? 0,
      unread: counts.rows[0]?.unread ?? 0,
      hasMore: offset + result.rows.length < (counts.rows[0]?.total ?? 0),
    });
  }),
);

router.patch(
  "/read-all",
  requireAuth,
  asyncHandler(async (request: AuthRequest, response) => {
    await query(
      `
        UPDATE notifications
        SET read_at = COALESCE(read_at, now())
        WHERE user_id = $1 OR user_id IS NULL
      `,
      [request.user?.id],
    );

    response.status(204).send();
  }),
);

router.patch(
  "/:notificationId/read",
  requireAuth,
  asyncHandler(async (request: AuthRequest, response) => {
    await query(
      `
        UPDATE notifications
        SET read_at = COALESCE(read_at, now())
        WHERE id = $1 AND (user_id = $2 OR user_id IS NULL)
      `,
      [request.params.notificationId, request.user?.id],
    );

    response.status(204).send();
  }),
);

export default router;
