import type { Request, Response, NextFunction } from 'express';
import { ZodError } from 'zod';
import { MulterError } from 'multer';

interface HttpError extends Error {
  statusCode?: number;
}

/**
 * Global error boundary. Maps known error types to appropriate HTTP statuses
 * and a consistent response shape. Stack traces are never sent to clients and
 * internal details are hidden in production.
 */
export function errorHandler(
  err: unknown,
  _req: Request,
  res: Response,
  // `next` is required for Express to recognize this as an error handler.
  _next: NextFunction,
): void {
  // Zod validation errors (in case a schema is parsed outside `validate`).
  if (err instanceof ZodError) {
    res.status(400).json({
      success: false,
      message: 'Validation failed',
      errors: err.issues.map((issue) => ({
        path: issue.path.join('.'),
        message: issue.message,
      })),
    });
    return;
  }

  // Multer-specific errors (e.g. file too large).
  if (err instanceof MulterError) {
    const status = err.code === 'LIMIT_FILE_SIZE' ? 413 : 400;
    res.status(status).json({
      success: false,
      message:
        err.code === 'LIMIT_FILE_SIZE'
          ? 'File is too large'
          : err.message,
    });
    return;
  }

  const error = err as HttpError;
  const statusCode = error.statusCode ?? 500;

  // Log full detail server-side.
  if (statusCode >= 500) {
    console.error('[error]', error);
  }

  const isProduction = process.env.NODE_ENV === 'production';

  res.status(statusCode).json({
    success: false,
    message:
      statusCode >= 500 && isProduction
        ? 'Internal server error'
        : error.message || 'Internal server error',
  });
}
