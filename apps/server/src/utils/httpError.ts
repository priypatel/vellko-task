/**
 * An Error carrying an HTTP status code, recognized by the global error handler.
 */
export class HttpError extends Error {
  statusCode: number;

  constructor(statusCode: number, message: string) {
    super(message);
    this.name = 'HttpError';
    this.statusCode = statusCode;
  }
}

/** Convenience factory. */
export function httpError(statusCode: number, message: string): HttpError {
  return new HttpError(statusCode, message);
}
