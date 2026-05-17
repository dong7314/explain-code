import dotenv from "dotenv";

dotenv.config();

const pick = (value: string | undefined, fallback: string) => {
  const next = value?.trim();
  return next ? next : fallback;
};

const pickNumber = (value: string | undefined, fallback: number) => {
  const next = Number(value);
  return Number.isFinite(next) ? next : fallback;
};

export const config = {
  nodeEnv: pick(process.env.NODE_ENV, "development"),
  port: pickNumber(process.env.PORT, 4000),
  corsOrigins: pick(
    process.env.CORS_ORIGIN,
    "http://localhost:5173,http://127.0.0.1:5173,http://127.0.0.1:5174",
  )
    .split(",")
    .map((origin) => origin.trim())
    .filter(Boolean),
  databaseUrl: process.env.DATABASE_URL,
  pg: {
    host: pick(process.env.PGHOST, "localhost"),
    port: pickNumber(process.env.PGPORT, 5433),
    database: pick(process.env.PGDATABASE, "explain_code"),
    user: pick(process.env.PGUSER, "postgres"),
    password: pick(process.env.PGPASSWORD, ""),
  },
  jwtSecret: pick(process.env.JWT_SECRET, "local-dev-jwt-secret-change-me"),
  tokenPepper: pick(process.env.TOKEN_PEPPER, "local-dev-token-pepper-change-me"),
  seedAdminUsername: pick(process.env.SEED_ADMIN_USERNAME, "mirae.dev"),
  seedAdminPassword: pick(process.env.SEED_ADMIN_PASSWORD, "explain-code-demo"),
};

export const isProduction = config.nodeEnv === "production";
