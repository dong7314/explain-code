import { createHash } from "node:crypto";
import type { PoolClient } from "pg";
import { withTransaction } from "../db/pool.js";
import type { AuthRequest } from "../types.js";

const VIEW_DEDUPE_MS = 60 * 60 * 1000;

const createGuestViewerKey = (request: AuthRequest) => {
  const forwardedFor = request.headers["x-forwarded-for"]
    ?.toString()
    .split(",")[0]
    ?.trim();
  const ip = forwardedFor || request.ip || request.socket.remoteAddress || "";
  const userAgent = request.headers["user-agent"]?.toString() || "";
  const digest = createHash("sha256")
    .update(`${ip}|${userAgent}`)
    .digest("hex");

  return `guest:${digest}`;
};

const createViewerKey = (request: AuthRequest) =>
  request.user?.id ? `user:${request.user.id}` : createGuestViewerKey(request);

const shouldCountView = async (
  client: PoolClient,
  resourceType: "episode" | "post",
  targetKey: string,
  viewerKey: string,
) => {
  const result = await client.query<{ counted: boolean }>(
    `
      INSERT INTO content_views (resource_type, target_key, viewer_key, viewed_at)
      VALUES ($1, $2, $3, now())
      ON CONFLICT (resource_type, target_key, viewer_key)
      DO UPDATE SET viewed_at = EXCLUDED.viewed_at
      WHERE content_views.viewed_at <= now() - ($4::double precision * interval '1 millisecond')
      RETURNING true AS counted
    `,
    [resourceType, targetKey, viewerKey, VIEW_DEDUPE_MS],
  );

  return Boolean(result.rowCount);
};

export const recordPostView = async (request: AuthRequest, postId: number) =>
  withTransaction(async (client) => {
    const targetKey = `post:${postId}`;
    const counted = await shouldCountView(
      client,
      "post",
      targetKey,
      createViewerKey(request),
    );
    const result = counted
      ? await client.query<{ views_count: number }>(
          `
            UPDATE posts
            SET views_count = views_count + 1
            WHERE id = $1
            RETURNING views_count
          `,
          [postId],
        )
      : await client.query<{ views_count: number }>(
          "SELECT views_count FROM posts WHERE id = $1",
          [postId],
        );

    return { counted, views: result.rows[0]?.views_count ?? 0 };
  });

export const recordEpisodeView = async (
  request: AuthRequest,
  groupId: string,
  episodeId: string,
) =>
  withTransaction(async (client) => {
    const targetKey = `episode:${groupId}:${episodeId}`;
    const counted = await shouldCountView(
      client,
      "episode",
      targetKey,
      createViewerKey(request),
    );
    const result = counted
      ? await client.query<{ views_count: number }>(
          `
            UPDATE episodes
            SET views_count = views_count + 1
            WHERE group_id = $1 AND id = $2
            RETURNING views_count
          `,
          [groupId, episodeId],
        )
      : await client.query<{ views_count: number }>(
          "SELECT views_count FROM episodes WHERE group_id = $1 AND id = $2",
          [groupId, episodeId],
        );

    return { counted, views: result.rows[0]?.views_count ?? 0 };
  });
