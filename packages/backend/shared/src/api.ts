import { ZodError } from "zod";
import { AppError, HttpError, isHttpError } from "./errors.js";
import { logger } from "./powertools.js";

export interface ApiResponse {
  statusCode: number;
  headers: Record<string, string>;
  body: string;
}

const allowedOrigin = process.env.ALLOWED_ORIGIN ?? "*";

export const CORS_HEADERS: Record<string, string> = {
  "access-control-allow-origin": allowedOrigin,
  "access-control-allow-methods": "GET,POST,PUT,DELETE,OPTIONS",
  "access-control-allow-headers": "content-type,authorization,x-idempotency-key",
  "access-control-max-age": "86400",
};

export const ok = (body: unknown, statusCode = 200): ApiResponse => ({
  statusCode,
  headers: CORS_HEADERS,
  body: JSON.stringify(body),
});

export const created = (body: unknown): ApiResponse => ok(body, 201);

export const noContent = (): ApiResponse => ok(null, 204);

export const errorResponse = (err: unknown): ApiResponse => {
  if (err instanceof ZodError) {
    return ok(
      {
        error: {
          code: "VALIDATION_ERROR",
          message: "Request validation failed",
          details: err.issues.map((i) => ({ path: i.path.join("."), message: i.message })),
        },
      },
      400,
    );
  }
  if (isHttpError(err)) {
    return ok({ error: { code: err.code, message: err.message } }, err.statusCode);
  }
  if (err instanceof AppError) {
    logger.error("app error", err);
    return ok({ error: { code: err.code, message: "Internal error" } }, 500);
  }
  logger.error("unhandled error", err instanceof Error ? err : new Error(String(err)));
  return ok({ error: { code: "INTERNAL_ERROR", message: "Internal error" } }, 500);
};
