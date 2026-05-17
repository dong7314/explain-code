import { Router } from "express";
import { z } from "zod";
import { asyncHandler } from "../middleware/async-handler.js";
import { requireAuth } from "../middleware/auth.js";
import { deleteComment, updateComment } from "../services/comments.js";
import type { AuthRequest } from "../types.js";

const router = Router();

const updateSchema = z.object({
  body: z.string().min(1).max(3000).transform((value) => value.trim()),
});

router.patch(
  "/:commentId",
  requireAuth,
  asyncHandler(async (request: AuthRequest, response) => {
    const input = updateSchema.parse(request.body);
    const comment = await updateComment(
      Number(request.params.commentId),
      String(request.user?.id),
      input.body,
    );

    response.json({ comment });
  }),
);

router.delete(
  "/:commentId",
  requireAuth,
  asyncHandler(async (request: AuthRequest, response) => {
    await deleteComment(Number(request.params.commentId), String(request.user?.id));
    response.status(204).send();
  }),
);

export default router;
