import crypto from "node:crypto";
import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";
import { config } from "./config.js";

export type JwtUser = {
  id: string;
  role: "admin" | "member";
  username: string;
};

export const hashPassword = (password: string) => bcrypt.hash(password, 12);

export const verifyPassword = (password: string, hash: string) =>
  bcrypt.compare(password, hash);

export const signJwt = (user: JwtUser) =>
  jwt.sign(
    {
      role: user.role,
      username: user.username,
    },
    config.jwtSecret,
    {
      expiresIn: "7d",
      subject: user.id,
    },
  );

export const verifyJwt = (token: string) => {
  const payload = jwt.verify(token, config.jwtSecret);

  if (typeof payload === "string" || !payload.sub) return null;

  return {
    id: payload.sub,
    role: payload.role as JwtUser["role"],
    username: payload.username as string,
  };
};

export const createPlainApiToken = () => {
  return `expc_live_${crypto.randomBytes(24).toString("base64url")}`;
};

export const hashApiToken = (token: string) => {
  return crypto
    .createHash("sha256")
    .update(`${token}:${config.tokenPepper}`)
    .digest("hex");
};

export const tokenPrefix = (token: string) => {
  if (token.length <= 14) return token;
  return `${token.slice(0, 10)}...${token.slice(-4)}`;
};
