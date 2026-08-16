export class HttpError extends Error {
  constructor(
    readonly statusCode: number,
    message: string,
    readonly code = "HTTP_ERROR",
  ) {
    super(message);
    this.name = "HttpError";
  }
}

export class AppError extends Error {
  constructor(
    message: string,
    readonly retryable = true,
    readonly code = "APP_ERROR",
  ) {
    super(message);
    this.name = "AppError";
  }
}

export const isHttpError = (e: unknown): e is HttpError => e instanceof HttpError;
export const isAppError = (e: unknown): e is AppError => e instanceof AppError;
