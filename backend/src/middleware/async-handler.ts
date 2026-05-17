import type { NextFunction, Request, Response } from "express";

export const asyncHandler =
  <RequestType extends Request = Request>(
    handler: (
      request: RequestType,
      response: Response,
      next: NextFunction,
    ) => Promise<unknown>,
  ) =>
  (request: Request, response: Response, next: NextFunction) => {
    Promise.resolve(handler(request as RequestType, response, next)).catch(next);
  };
