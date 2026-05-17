import { query } from "../db/pool.js";
import { forbidden, unauthorized } from "../errors.js";
import { hashApiToken, verifyJwt } from "../security.js";
import type { ApiTokenAuth, AuthRequest, AuthUser } from "../types.js";
import type { NextFunction, Response } from "express";

const getBearerToken = (authorization: string | undefined) => {
  if (!authorization?.startsWith("Bearer ")) return null;
  return authorization.slice("Bearer ".length).trim();
};

const loadUser = async (user: AuthUser) => {
  const result = await query<AuthUser>(
    `
      SELECT id, username, role
      FROM users
      WHERE id = $1
    `,
    [user.id],
  );

  return result.rows[0] ?? null;
};

export const optionalAuth = async (
  request: AuthRequest,
  _response: Response,
  next: NextFunction,
) => {
  const token = getBearerToken(request.headers.authorization);
  if (!token || token.startsWith("expc_")) {
    next();
    return;
  }

  const jwtUser = verifyJwt(token);
  if (!jwtUser) {
    next();
    return;
  }

  request.user = await loadUser(jwtUser);
  next();
};

export const requireAuth = async (
  request: AuthRequest,
  _response: Response,
  next: NextFunction,
) => {
  const token = getBearerToken(request.headers.authorization);
  if (!token || token.startsWith("expc_")) throw unauthorized();

  const jwtUser = verifyJwt(token);
  if (!jwtUser) throw unauthorized("로그인이 만료되었거나 올바르지 않습니다.");

  const user = await loadUser(jwtUser);
  if (!user) throw unauthorized("사용자를 찾을 수 없습니다.");

  request.user = user;
  next();
};

export const requireAdmin = async (
  request: AuthRequest,
  response: Response,
  next: NextFunction,
) => {
  await requireAuth(request, response, () => undefined);
  if (request.user?.role !== "admin") {
    throw forbidden("관리자 권한이 필요합니다.");
  }
  next();
};

export const requireApiToken = (scope: "read" | "write" | "admin") => {
  return async (request: AuthRequest, _response: Response, next: NextFunction) => {
    const rawToken =
      request.headers["x-api-token"]?.toString() ??
      getBearerToken(request.headers.authorization);

    if (!rawToken) throw unauthorized("API 토큰이 필요합니다.");

    const result = await query<ApiTokenAuth & { revokedAt: Date | null; expiresAt: Date }>(
      `
        SELECT
          id,
          owner_id AS "ownerId",
          scopes,
          revoked_at AS "revokedAt",
          expires_at AS "expiresAt"
        FROM api_tokens
        WHERE token_hash = $1
      `,
      [hashApiToken(rawToken)],
    );
    const token = result.rows[0];

    if (!token || token.revokedAt) throw unauthorized("API 토큰이 올바르지 않습니다.");
    if (new Date(token.expiresAt).getTime() <= Date.now()) {
      throw unauthorized("API 토큰이 만료되었습니다.");
    }
    if (!token.scopes.includes(scope) && !token.scopes.includes("admin")) {
      throw forbidden(`${scope} 권한이 있는 API 토큰이 필요합니다.`);
    }

    await query("UPDATE api_tokens SET last_used_at = now() WHERE id = $1", [
      token.id,
    ]);

    request.apiToken = token;
    next();
  };
};
