import type { NextFunction, Request, Response } from "express";
import { ZodError } from "zod";

export class HttpError extends Error {
  status: number;
  code: string;
  details?: unknown;

  constructor(status: number, message: string, code = "HTTP_ERROR", details?: unknown) {
    super(message);
    this.name = "HttpError";
    this.status = status;
    this.code = code;
    this.details = details;
  }
}

export const notFound = (message = "Not found") =>
  new HttpError(404, message, "NOT_FOUND");

export const unauthorized = (message = "Authentication required") =>
  new HttpError(401, message, "UNAUTHORIZED");

export const forbidden = (message = "Forbidden") =>
  new HttpError(403, message, "FORBIDDEN");

export const badRequest = (message = "Invalid request", details?: unknown) =>
  new HttpError(400, message, "BAD_REQUEST", details);

export const conflict = (message = "Conflict") =>
  new HttpError(409, message, "CONFLICT");

export const errorHandler = (
  error: unknown,
  _request: Request,
  response: Response,
  _next: NextFunction,
) => {
  if (error instanceof ZodError) {
    response.status(400).json({
      code: "VALIDATION_ERROR",
      message: "요청 형식이 올바르지 않습니다.",
      details: error.flatten(),
    });
    return;
  }

  if (error instanceof HttpError) {
    response.status(error.status).json({
      code: error.code,
      message: error.message,
      details: error.details,
    });
    return;
  }

  console.error(error);
  response.status(500).json({
    code: "INTERNAL_SERVER_ERROR",
    message: "서버에서 오류가 발생했습니다.",
  });
};
