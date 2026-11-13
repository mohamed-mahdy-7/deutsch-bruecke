import type { NextFunction, Request, RequestHandler, Response } from "express";
import { ZodError } from "zod";
import { AppError } from "./errors.js";
import { logger } from "./logger.js";

export function asyncHandler(
  handler: (req: Request, res: Response, next: NextFunction) => Promise<unknown>,
): RequestHandler {
  return (req, res, next) => {
    Promise.resolve(handler(req, res, next)).catch(next);
  };
}

function requestId(res: Response): string | undefined {
  const value = res.locals.requestId;
  return typeof value === "string" ? value : undefined;
}

export function notFoundHandler(req: Request, res: Response): void {
  res.status(404).json({
    ok: false,
    error: {
      code: "not_found",
      message: "This API endpoint does not exist.",
      requestId: requestId(res),
    },
  });
}

export function errorHandler(
  error: unknown,
  req: Request,
  res: Response,
  _next: NextFunction,
): void {
  if (error instanceof ZodError) {
    res.status(400).json({
      ok: false,
      error: {
        code: "invalid_request",
        message: "Some of the submitted data is invalid.",
        requestId: requestId(res),
        details: error.issues.map((issue) => ({
          path: issue.path.join("."),
          message: issue.message,
        })),
      },
    });
    return;
  }

  if (error instanceof AppError) {
    res.status(error.status).json({
      ok: false,
      error: {
        code: error.code,
        message: error.message,
        requestId: requestId(res),
      },
    });
    return;
  }

  const maybeSyntaxError = error as { type?: string; status?: number };
  if (maybeSyntaxError?.type === "entity.parse.failed") {
    res.status(400).json({
      ok: false,
      error: {
        code: "invalid_json",
        message: "Request body must be valid JSON.",
        requestId: requestId(res),
      },
    });
    return;
  }
  if (maybeSyntaxError?.type === "entity.too.large") {
    res.status(413).json({
      ok: false,
      error: {
        code: "payload_too_large",
        message: "The request is too large.",
        requestId: requestId(res),
      },
    });
    return;
  }

  // Unexpected provider/server errors are logged with the request id, not leaked.
  logger.error("unhandled_error", {
    requestId: requestId(res),
    method: req.method,
    path: req.originalUrl,
    message: error instanceof Error ? error.message : String(error),
    stack: error instanceof Error ? error.stack : undefined,
  });
  res.status(500).json({
    ok: false,
    error: {
      code: "internal_error",
      message: "Something went wrong. Please try again.",
      requestId: requestId(res),
    },
  });
}
