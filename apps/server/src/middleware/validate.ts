import type { Request, Response, NextFunction } from 'express';
import type { ZodSchema } from 'zod';

type ValidationSource = 'body' | 'query' | 'params';

/**
 * Validate (and coerce) a request segment against a Zod schema. On success the
 * parsed value replaces the original so downstream handlers receive typed,
 * coerced data. On failure responds 400 with field-level errors.
 */
export function validate(
  schema: ZodSchema,
  source: ValidationSource = 'body',
) {
  return (req: Request, res: Response, next: NextFunction): void => {
    const result = schema.safeParse(req[source]);

    if (!result.success) {
      res.status(400).json({
        success: false,
        message: 'Validation failed',
        errors: result.error.issues.map((issue) => ({
          path: issue.path.join('.'),
          message: issue.message,
        })),
      });
      return;
    }

    // Replace with the parsed/coerced data.
    req[source] = result.data;
    next();
  };
}
