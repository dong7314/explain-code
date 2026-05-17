import { Router } from "express";
import { z } from "zod";
import { query, withTransaction } from "../db/pool.js";
import { notFound } from "../errors.js";
import { asyncHandler } from "../middleware/async-handler.js";
import { requireAuth } from "../middleware/auth.js";
import {
  createPlainApiToken,
  hashApiToken,
  tokenPrefix,
} from "../security.js";
import type { AuthRequest } from "../types.js";

const router = Router();

const tokenSchema = z.object({
  name: z.string().min(1).max(80).default("관리자 API 토큰"),
  scopes: z.array(z.enum(["admin", "read", "write"])).min(1).default(["read", "write"]),
  expiresInDays: z.number().int().min(1).max(365).default(24),
});

const mapToken = (row: any) => ({
  id: row.id,
  name: row.name,
  tokenPrefix: row.token_prefix,
  scopes: row.scopes,
  expiresAt: row.expires_at,
  lastUsedAt: row.last_used_at,
  revokedAt: row.revoked_at,
  createdAt: row.created_at,
});

const createTokenRecord = async (
  ownerId: string,
  input: z.infer<typeof tokenSchema>,
) => {
  const plainToken = createPlainApiToken();
  const result = await query(
    `
      INSERT INTO api_tokens (
        owner_id,
        name,
        token_prefix,
        token_hash,
        scopes,
        expires_at
      )
      VALUES ($1, $2, $3, $4, $5, now() + ($6::text || ' days')::interval)
      RETURNING *
    `,
    [
      ownerId,
      input.name,
      tokenPrefix(plainToken),
      hashApiToken(plainToken),
      input.scopes,
      input.expiresInDays,
    ],
  );

  return {
    token: mapToken(result.rows[0]),
    plainToken,
  };
};

router.get(
  "/",
  requireAuth,
  asyncHandler(async (request: AuthRequest, response) => {
    const result = await query(
      `
        SELECT *
        FROM api_tokens
        WHERE owner_id = $1
        ORDER BY created_at DESC
      `,
      [request.user?.id],
    );

    response.json({ tokens: result.rows.map(mapToken) });
  }),
);

router.post(
  "/",
  requireAuth,
  asyncHandler(async (request: AuthRequest, response) => {
    const input = tokenSchema.parse(request.body);
    const created = await createTokenRecord(String(request.user?.id), input);

    response.status(201).json(created);
  }),
);

router.post(
  "/:tokenId/reissue",
  requireAuth,
  asyncHandler(async (request: AuthRequest, response) => {
    const existing = await query(
      `
        SELECT *
        FROM api_tokens
        WHERE id = $1 AND owner_id = $2
      `,
      [request.params.tokenId, request.user?.id],
    );

    if (!existing.rowCount) throw notFound("API 토큰을 찾을 수 없습니다.");

    const created = await withTransaction(async (client) => {
      await client.query("UPDATE api_tokens SET revoked_at = now() WHERE id = $1", [
        request.params.tokenId,
      ]);

      const plainToken = createPlainApiToken();
      const result = await client.query(
        `
          INSERT INTO api_tokens (
            owner_id,
            name,
            token_prefix,
            token_hash,
            scopes,
            expires_at
          )
          VALUES ($1, $2, $3, $4, $5, $6)
          RETURNING *
        `,
        [
          request.user?.id,
          existing.rows[0].name,
          tokenPrefix(plainToken),
          hashApiToken(plainToken),
          existing.rows[0].scopes,
          existing.rows[0].expires_at,
        ],
      );

      return {
        token: mapToken(result.rows[0]),
        plainToken,
      };
    });

    response.status(201).json(created);
  }),
);

router.delete(
  "/:tokenId",
  requireAuth,
  asyncHandler(async (request: AuthRequest, response) => {
    const result = await query(
      `
        UPDATE api_tokens
        SET revoked_at = COALESCE(revoked_at, now())
        WHERE id = $1 AND owner_id = $2
      `,
      [request.params.tokenId, request.user?.id],
    );

    if (!result.rowCount) throw notFound("API 토큰을 찾을 수 없습니다.");

    response.status(204).send();
  }),
);

export default router;
