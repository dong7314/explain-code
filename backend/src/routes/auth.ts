import { Router } from "express";
import { z } from "zod";
import { query } from "../db/pool.js";
import { asyncHandler } from "../middleware/async-handler.js";
import { requireAuth } from "../middleware/auth.js";
import { conflict, unauthorized } from "../errors.js";
import { hashPassword, signJwt, verifyPassword } from "../security.js";
import { mapUser } from "../mappers.js";
import type { AuthRequest } from "../types.js";

const router = Router();

const credentialsSchema = z.object({
  username: z.string().min(2).max(40).transform((value) => value.trim()),
  password: z.string().min(4).max(120),
});

const signupSchema = credentialsSchema.extend({
  displayName: z.string().min(1).max(40).optional(),
  passwordConfirm: z.string().min(4).max(120).optional(),
});

const authResponse = (row: {
  display_name: string;
  id: string;
  role: "admin" | "member";
  username: string;
}) => ({
  token: signJwt({
    id: row.id,
    role: row.role,
    username: row.username,
  }),
  user: mapUser(row),
});

router.post(
  "/signup",
  asyncHandler(async (request, response) => {
    const input = signupSchema.parse(request.body);

    if (input.passwordConfirm && input.passwordConfirm !== input.password) {
      throw unauthorized("비밀번호 확인이 일치하지 않습니다.");
    }

    const existing = await query("SELECT 1 FROM users WHERE username = $1", [
      input.username,
    ]);
    if (existing.rowCount) throw conflict("이미 사용 중인 아이디입니다.");

    const passwordHash = await hashPassword(input.password);
    const result = await query<{
      display_name: string;
      id: string;
      role: "admin" | "member";
      username: string;
    }>(
      `
        INSERT INTO users (username, password_hash, display_name, role)
        VALUES ($1, $2, $3, 'member')
        RETURNING id, username, display_name, role
      `,
      [input.username, passwordHash, input.displayName ?? input.username],
    );

    response.status(201).json(authResponse(result.rows[0]));
  }),
);

router.post(
  "/login",
  asyncHandler(async (request, response) => {
    const input = credentialsSchema.parse(request.body);
    const result = await query<{
      display_name: string;
      id: string;
      password_hash: string;
      role: "admin" | "member";
      username: string;
    }>(
      `
        SELECT id, username, password_hash, display_name, role
        FROM users
        WHERE username = $1
      `,
      [input.username],
    );
    const user = result.rows[0];

    if (!user || !(await verifyPassword(input.password, user.password_hash))) {
      throw unauthorized("아이디 또는 비밀번호가 올바르지 않습니다.");
    }

    response.json(authResponse(user));
  }),
);

router.get(
  "/me",
  requireAuth,
  asyncHandler(async (request: AuthRequest, response) => {
    const result = await query<{
      display_name: string;
      id: string;
      role: "admin" | "member";
      username: string;
    }>(
      `
        SELECT id, username, display_name, role
        FROM users
        WHERE id = $1
      `,
      [request.user?.id],
    );

    response.json({ user: mapUser(result.rows[0]) });
  }),
);

export default router;
