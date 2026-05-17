import { Router } from "express";
import { z } from "zod";
import { query } from "../db/pool.js";
import { badRequest, forbidden, notFound } from "../errors.js";
import { mapPost } from "../mappers.js";
import { asyncHandler } from "../middleware/async-handler.js";
import { optionalAuth, requireAuth } from "../middleware/auth.js";
import {
  createComment,
  listComments,
} from "../services/comments.js";
import {
  postTargetKey,
  setReaction,
  type ReactionValue,
} from "../services/reactions.js";
import { recordPostView } from "../services/views.js";
import type { AuthRequest } from "../types.js";

const router = Router();
const anonymousUserId = "00000000-0000-0000-0000-000000000000";

const postSelect = (viewerUserIdSql = "NULL") => `
  SELECT
    p.*,
    u.username AS author_username,
    r.value AS viewer_reaction
  FROM posts p
  LEFT JOIN users u ON u.id = p.author_id
  LEFT JOIN reactions r
    ON r.resource_type = 'post'
    AND r.target_key = concat('post:', p.id)
    AND r.user_id = ${viewerUserIdSql}
`;

const postSchema = z.object({
  page: z.enum(["qa", "community"]),
  category: z.string().min(1).max(40),
  title: z.string().min(2).max(200),
  excerpt: z.string().min(2).max(600).optional(),
  body: z.string().min(2).max(10000),
  repo: z.string().trim().max(80).optional(),
  tags: z.array(z.string().min(1).max(40)).default([]),
  solved: z.boolean().optional(),
});

const updatePostSchema = postSchema.partial().omit({ page: true });

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

const getPost = async (id: number, currentUserId?: string) => {
  const params = currentUserId ? [id, currentUserId] : [id];
  const result = await query(
    `${postSelect(currentUserId ? "$2" : undefined)} WHERE p.id = $1`,
    params,
  );
  const post = result.rows[0];
  if (!post) throw notFound("게시글을 찾을 수 없습니다.");
  return post;
};

const buildBoardName = (page: "community" | "qa", category: string) =>
  page === "qa" ? `Q&A ${category}` : `커뮤니티 ${category}`;

router.get(
  "/",
  optionalAuth,
  asyncHandler(async (request: AuthRequest, response) => {
    const page = String(request.query.page ?? "");
    const category = String(request.query.category ?? "전체");
    const field = String(request.query.field ?? "all");
    const search = String(request.query.query ?? "").trim().replace(/^#/, "");
    const sort = String(request.query.sort ?? "recent");
    const pageNo = Math.max(1, Number(request.query.pageNo ?? 1));
    const pageSize = Math.min(50, Math.max(1, Number(request.query.pageSize ?? 10)));
    const params: unknown[] = [];
    const where: string[] = [];

    if (page === "qa" || page === "community") {
      params.push(page);
      where.push(`p.page = $${params.length}`);
    }

    if (category && category !== "전체") {
      params.push(category);
      where.push(`p.category = $${params.length}`);
    }

    if (search) {
      params.push(`%${search}%`);
      const placeholder = `$${params.length}`;
      const fields: Record<string, string> = {
        title: `p.title ILIKE ${placeholder}`,
        content: `(p.excerpt ILIKE ${placeholder} OR p.body ILIKE ${placeholder})`,
        tag: `array_to_string(p.tags, ' ') ILIKE ${placeholder}`,
        all: `(
          p.title ILIKE ${placeholder}
          OR p.excerpt ILIKE ${placeholder}
          OR p.body ILIKE ${placeholder}
          OR p.category ILIKE ${placeholder}
          OR p.repo ILIKE ${placeholder}
          OR array_to_string(p.tags, ' ') ILIKE ${placeholder}
        )`,
      };
      where.push(fields[field] ?? fields.all);
    }

    const orderBy =
      sort === "name"
        ? "p.title ASC"
        : sort === "recommend"
          ? "p.likes_count DESC, p.created_at DESC"
          : sort === "comments"
            ? "p.comments_count DESC, p.created_at DESC"
            : sort === "views"
              ? "p.views_count DESC, p.created_at DESC"
              : "p.created_at DESC";
    const whereSql = where.length ? `WHERE ${where.join(" AND ")}` : "";
    const count = await query<{ total: number }>(
      `SELECT count(*)::int AS total FROM posts p ${whereSql}`,
      params,
    );
    const offset = (pageNo - 1) * pageSize;
    const resultParams = [
      ...params,
      request.user?.id ?? anonymousUserId,
    ];
    const result = await query(
      `
        ${postSelect(`$${resultParams.length}`)}
        ${whereSql}
        ORDER BY ${orderBy}
        LIMIT $${resultParams.length + 1}
        OFFSET $${resultParams.length + 2}
      `,
      [...resultParams, pageSize, offset],
    );
    const total = count.rows[0]?.total ?? 0;

    response.json({
      posts: result.rows.map(mapPost),
      pagination: {
        page: pageNo,
        pageSize,
        total,
        totalPages: Math.max(1, Math.ceil(total / pageSize)),
      },
    });
  }),
);

router.post(
  "/",
  requireAuth,
  asyncHandler(async (request: AuthRequest, response) => {
    const input = postSchema.parse(request.body);
    const excerpt = input.excerpt ?? input.body.slice(0, 240);
    const repo = input.repo?.trim();

    if (input.page === "qa" && !repo) {
      throw badRequest("Q&A 글은 프로젝트 그룹이 필요합니다.");
    }

    const result = await query(
      `
        INSERT INTO posts (
          page,
          board,
          category,
          title,
          excerpt,
          body,
          author_id,
          repo,
          tags,
          solved
        )
        VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)
        RETURNING *
      `,
      [
        input.page,
        buildBoardName(input.page, input.category),
        input.category,
        input.title,
        excerpt,
        input.body,
        request.user?.id,
        repo || input.category,
        input.tags,
        input.solved ?? false,
      ],
    );

    response.status(201).json({
      post: mapPost({ ...result.rows[0], author_username: request.user?.username }),
    });
  }),
);

router.get(
  "/:postId",
  optionalAuth,
  asyncHandler(async (request: AuthRequest, response) => {
    const id = Number(request.params.postId);
    const post = await getPost(id, request.user?.id);
    const view = await recordPostView(request, id);

    response.json({
      post: mapPost({ ...post, views_count: view.views }),
    });
  }),
);

router.patch(
  "/:postId",
  requireAuth,
  asyncHandler(async (request: AuthRequest, response) => {
    const id = Number(request.params.postId);
    const input = updatePostSchema.parse(request.body);
    const post = await getPost(id);
    const repo = input.repo?.trim();

    if (post.author_id !== request.user?.id && request.user?.role !== "admin") {
      throw forbidden("게시글을 수정할 권한이 없습니다.");
    }

    if (post.page === "qa" && input.repo !== undefined && !repo) {
      throw badRequest("Q&A 글은 프로젝트 그룹이 필요합니다.");
    }

    await query(
      `
        UPDATE posts
        SET
          board = COALESCE($2, board),
          category = COALESCE($3, category),
          title = COALESCE($4, title),
          excerpt = COALESCE($5, excerpt),
          body = COALESCE($6, body),
          repo = COALESCE($7, repo),
          tags = COALESCE($8, tags),
          solved = COALESCE($9, solved)
        WHERE id = $1
      `,
      [
        id,
        input.category ? buildBoardName(post.page, input.category) : undefined,
        input.category,
        input.title,
        input.excerpt,
        input.body,
        input.repo === undefined ? undefined : repo || input.category || post.category,
        input.tags,
        input.solved,
      ],
    );

    response.json({ post: mapPost(await getPost(id, request.user?.id)) });
  }),
);

router.delete(
  "/:postId",
  requireAuth,
  asyncHandler(async (request: AuthRequest, response) => {
    const id = Number(request.params.postId);
    const post = await getPost(id);

    if (post.author_id !== request.user?.id && request.user?.role !== "admin") {
      throw forbidden("게시글을 삭제할 권한이 없습니다.");
    }

    await query("DELETE FROM posts WHERE id = $1", [id]);
    response.status(204).send();
  }),
);

router.get(
  "/:postId/comments",
  optionalAuth,
  asyncHandler(async (request: AuthRequest, response) => {
    response.json({
      comments: await listComments(
        { type: "post", postId: Number(request.params.postId) },
        request.user?.id,
      ),
    });
  }),
);

router.post(
  "/:postId/comments",
  requireAuth,
  asyncHandler(async (request: AuthRequest, response) => {
    const input = commentSchema.parse(request.body);
    const comment = await createComment(
      { type: "post", postId: Number(request.params.postId) },
      String(request.user?.id),
      input.body,
      input.parentId,
    );

    response.status(201).json({ comment });
  }),
);

router.put(
  "/:postId/reaction",
  requireAuth,
  asyncHandler(async (request: AuthRequest, response) => {
    const input = reactionSchema.parse(request.body);
    const counts = await setReaction(
      "post",
      postTargetKey(Number(request.params.postId)),
      String(request.user?.id),
      parseReaction(input.value),
    );

    response.json(counts);
  }),
);

export default router;
