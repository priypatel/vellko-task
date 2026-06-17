import type { Request, Response, NextFunction } from 'express';
import { verifyAccessToken } from '../utils/token';
import type { UserRole } from '../types';

/**
 * Require a valid access token. Extracts the Bearer token, verifies it, and
 * attaches `req.user`. Any failure returns a generic 401 (no detail about why
 * the token was rejected, to avoid leaking information).
 */
export function authenticate(
  req: Request,
  res: Response,
  next: NextFunction,
): void {
  const header = req.headers.authorization;

  if (!header || !header.startsWith('Bearer ')) {
    res.status(401).json({ success: false, message: 'Unauthorized' });
    return;
  }

  const token = header.slice('Bearer '.length).trim();

  try {
    const payload = verifyAccessToken(token);
    req.user = { id: payload.userId, role: payload.role as UserRole };
    next();
  } catch {
    res.status(401).json({ success: false, message: 'Unauthorized' });
  }
}
