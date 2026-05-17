import type { Request } from "express";

export type AuthUser = {
  id: string;
  role: "admin" | "member";
  username: string;
};

export type ApiTokenAuth = {
  id: string;
  ownerId: string;
  scopes: string[];
};

export type AuthRequest = Request & {
  apiToken?: ApiTokenAuth;
  user?: AuthUser;
};
