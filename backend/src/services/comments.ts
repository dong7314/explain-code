import type pg from "pg";
import { badRequest, forbidden, notFound } from "../errors.js";
import { mapCommentTree } from "../mappers.js";
import { query, withTransaction } from "../db/pool.js";

export type CommentTarget =
  | { postId: number; type: "post" }
  | { episodeId: string; groupId: string; type: "episode" };

type CommentRow = {
  author_id: string;
  id: string;
  parent_id: string | null;
  resource_type: "episode" | "post";
};

const targetClause = (target: CommentTarget) => {
  if (target.type === "post") {
    return {
      params: [target.postId],
      sql: "resource_type = 'post' AND post_id = $1",
    };
  }

  return {
    params: [target.groupId, target.episodeId],
    sql: "resource_type = 'episode' AND group_id = $1 AND episode_id = $2",
  };
};

const recalculateCommentCount = async (
  client: pg.PoolClient,
  target: CommentTarget,
) => {
  if (target.type === "post") {
    await client.query(
      `
        UPDATE posts
        SET comments_count = (
          SELECT count(*)::int
          FROM comments
          WHERE resource_type = 'post'
            AND post_id = $1
            AND deleted_at IS NULL
        )
        WHERE id = $1
      `,
      [target.postId],
    );
    return;
  }

  await client.query(
    `
      UPDATE episodes
      SET comments_count = (
        SELECT count(*)::int
        FROM comments
        WHERE resource_type = 'episode'
          AND group_id = $1
          AND episode_id = $2
          AND deleted_at IS NULL
      )
      WHERE group_id = $1 AND id = $2
    `,
    [target.groupId, target.episodeId],
  );
};

export const ensureTargetExists = async (target: CommentTarget) => {
  if (target.type === "post") {
    const post = await query("SELECT 1 FROM posts WHERE id = $1", [target.postId]);
    if (!post.rowCount) throw notFound("게시글을 찾을 수 없습니다.");
    return;
  }

  const episode = await query(
    "SELECT 1 FROM episodes WHERE group_id = $1 AND id = $2",
    [target.groupId, target.episodeId],
  );
  if (!episode.rowCount) throw notFound("학습 글을 찾을 수 없습니다.");
};

export const listComments = async (
  target: CommentTarget,
  currentUserId: string | undefined,
) => {
  const clause = targetClause(target);
  const result = await query(
    `
      SELECT
        c.id::text,
        c.parent_id::text,
        c.body,
        c.deleted_at,
        c.created_at,
        c.updated_at,
        u.username AS author_username,
        c.author_id = $${clause.params.length + 1} AS owned
      FROM comments c
      JOIN users u ON u.id = c.author_id
      WHERE ${clause.sql}
      ORDER BY COALESCE(c.parent_id, c.id), c.parent_id NULLS FIRST, c.created_at
    `,
    [...clause.params, currentUserId ?? "00000000-0000-0000-0000-000000000000"],
  );

  return mapCommentTree(result.rows, currentUserId);
};

export const createComment = async (
  target: CommentTarget,
  authorId: string,
  body: string,
  parentId?: number,
) => {
  await ensureTargetExists(target);

  return withTransaction(async (client) => {
    if (parentId) {
      const clause = targetClause(target);
      const parent = await client.query<CommentRow>(
        `
          SELECT id::text, parent_id::text, author_id, resource_type
          FROM comments
          WHERE id = $${clause.params.length + 1}
            AND ${clause.sql}
            AND deleted_at IS NULL
        `,
        [...clause.params, parentId],
      );
      const parentComment = parent.rows[0];

      if (!parentComment) throw notFound("원 댓글을 찾을 수 없습니다.");
      if (parentComment.parent_id) {
        throw badRequest("대댓글에는 다시 답글을 달 수 없습니다.");
      }
    }

    const values =
      target.type === "post"
        ? ["post", target.postId, null, null, parentId ?? null, authorId, body]
        : [
            "episode",
            null,
            target.groupId,
            target.episodeId,
            parentId ?? null,
            authorId,
            body,
          ];

    const created = await client.query<{ id: string }>(
      `
        INSERT INTO comments (
          resource_type,
          post_id,
          group_id,
          episode_id,
          parent_id,
          author_id,
          body
        )
        VALUES ($1, $2, $3, $4, $5, $6, $7)
        RETURNING id::text
      `,
      values,
    );

    await recalculateCommentCount(client, target);

    return created.rows[0];
  });
};

export const updateComment = async (
  commentId: number,
  authorId: string,
  body: string,
) => {
  const result = await query<CommentRow>(
    `
      UPDATE comments
      SET body = $1
      WHERE id = $2
        AND author_id = $3
        AND deleted_at IS NULL
      RETURNING id::text, parent_id::text, author_id, resource_type
    `,
    [body, commentId, authorId],
  );

  if (!result.rowCount) throw forbidden("댓글을 수정할 권한이 없습니다.");
  return result.rows[0];
};

export const deleteComment = async (commentId: number, authorId: string) => {
  return withTransaction(async (client) => {
    const existing = await client.query<
      CommentRow & {
        episode_id: string | null;
        group_id: string | null;
        post_id: number | null;
      }
    >(
      `
        SELECT
          id::text,
          parent_id::text,
          author_id,
          resource_type,
          post_id,
          group_id,
          episode_id
        FROM comments
        WHERE id = $1 AND deleted_at IS NULL
      `,
      [commentId],
    );
    const comment = existing.rows[0];

    if (!comment) throw notFound("댓글을 찾을 수 없습니다.");
    if (comment.author_id !== authorId) {
      throw forbidden("댓글을 삭제할 권한이 없습니다.");
    }

    await client.query(
      `
        UPDATE comments
        SET deleted_at = now()
        WHERE id = $1 OR parent_id = $1
      `,
      [commentId],
    );

    await recalculateCommentCount(
      client,
      comment.resource_type === "post"
        ? { type: "post", postId: Number(comment.post_id) }
        : {
            type: "episode",
            groupId: String(comment.group_id),
            episodeId: String(comment.episode_id),
          },
    );

    return { id: commentId };
  });
};
