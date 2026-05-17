import { withTransaction } from "../db/pool.js";
import { badRequest } from "../errors.js";

export type ReactionValue = -1 | 1 | null;

export const postTargetKey = (postId: number) => `post:${postId}`;

export const episodeTargetKey = (groupId: string, episodeId: string) =>
  `episode:${groupId}:${episodeId}`;

export const setReaction = async (
  resourceType: "episode" | "post",
  targetKey: string,
  userId: string,
  value: ReactionValue,
) => {
  if (![1, -1, null].includes(value)) throw badRequest("지원하지 않는 반응입니다.");

  return withTransaction(async (client) => {
    const existing = await client.query<{ value: -1 | 1 }>(
      `
        SELECT value
        FROM reactions
        WHERE resource_type = $1 AND target_key = $2 AND user_id = $3
        FOR UPDATE
      `,
      [resourceType, targetKey, userId],
    );
    const previousValue = existing.rows[0]?.value ?? null;
    let likeDelta = 0;
    let dislikeDelta = 0;

    if (previousValue === 1) likeDelta -= 1;
    if (previousValue === -1) dislikeDelta -= 1;
    if (value === 1) likeDelta += 1;
    if (value === -1) dislikeDelta += 1;

    if (value === null) {
      await client.query(
        "DELETE FROM reactions WHERE resource_type = $1 AND target_key = $2 AND user_id = $3",
        [resourceType, targetKey, userId],
      );
    } else {
      await client.query(
        `
          INSERT INTO reactions (resource_type, target_key, user_id, value)
          VALUES ($1, $2, $3, $4)
          ON CONFLICT (resource_type, target_key, user_id)
          DO UPDATE SET value = EXCLUDED.value
        `,
        [resourceType, targetKey, userId, value],
      );
    }

    if (resourceType === "post") {
      const postId = Number(targetKey.replace("post:", ""));
      const result = await client.query<{ dislikes: number; likes: number }>(
        `
          UPDATE posts
          SET
            likes_count = greatest(0, likes_count + $1),
            dislikes_count = greatest(0, dislikes_count + $2)
          WHERE id = $3
          RETURNING likes_count AS likes, dislikes_count AS dislikes
        `,
        [likeDelta, dislikeDelta, postId],
      );

      return result.rows[0];
    }

    const [, groupId, episodeId] = targetKey.split(":");
    const result = await client.query<{ dislikes: number; likes: number }>(
      `
        UPDATE episodes
        SET
          likes_count = greatest(0, likes_count + $1),
          dislikes_count = greatest(0, dislikes_count + $2)
        WHERE group_id = $3 AND id = $4
        RETURNING likes_count AS likes, dislikes_count AS dislikes
      `,
      [likeDelta, dislikeDelta, groupId, episodeId],
    );

    return result.rows[0];
  }).then((counts) => {
    if (counts) return counts;

    return resourceType === "post"
      ? { likes: 0, dislikes: 0 }
      : { likes: 0, dislikes: 0 };
  });
};
