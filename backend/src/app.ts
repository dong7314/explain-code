import cors from "cors";
import express from "express";
import helmet from "helmet";
import morgan from "morgan";
import { config, isProduction } from "./config.js";
import { errorHandler, notFound } from "./errors.js";
import apiTokensRouter from "./routes/api-tokens.js";
import authRouter from "./routes/auth.js";
import commentsRouter from "./routes/comments.js";
import ingestRouter from "./routes/ingest.js";
import integrationLogsRouter from "./routes/integration-logs.js";
import notificationsRouter from "./routes/notifications.js";
import postsRouter from "./routes/posts.js";
import projectGroupsRouter from "./routes/project-groups.js";
import searchRouter from "./routes/search.js";

export const createApp = () => {
  const app = express();

  app.set("trust proxy", 1);
  app.use(helmet());
  app.use(
    cors({
      credentials: true,
      origin(origin, callback) {
        if (!origin || config.corsOrigins.includes(origin)) {
          callback(null, true);
          return;
        }

        callback(new Error(`CORS origin not allowed: ${origin}`));
      },
    }),
  );
  app.use(express.json({ limit: "1mb" }));
  app.use(morgan(isProduction ? "combined" : "dev"));

  app.get("/health", (_request, response) => {
    response.json({ ok: true, service: "explain-code-backend" });
  });

  app.get("/api/health", (_request, response) => {
    response.json({ ok: true, service: "explain-code-backend" });
  });

  app.use("/api/auth", authRouter);
  app.use("/api/project-groups", projectGroupsRouter);
  app.use("/api/posts", postsRouter);
  app.use("/api/comments", commentsRouter);
  app.use("/api/search", searchRouter);
  app.use("/api/notifications", notificationsRouter);
  app.use("/api/api-tokens", apiTokensRouter);
  app.use("/api/ingest", ingestRouter);
  app.use("/api/integration-logs", integrationLogsRouter);

  app.use((_request, _response, next) => {
    next(notFound("요청한 API를 찾을 수 없습니다."));
  });

  app.use(errorHandler);

  return app;
};
