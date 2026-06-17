import type { Request, Response, NextFunction } from 'express';

/**
 * Role guard factory. Must run after `authenticate` so `req.user` is set.
 * Returns 403 if the authenticated user does not have the required role.
 */
export function authorize(requiredRole: string) {
  return (req: Request, res: Response, next: NextFunction): void => {
    if (!req.user) {
      res.status(401).json({ success: false, message: 'Unauthorized' });
      return;
    }

    if (req.user.role !== requiredRole) {
      res.status(403).json({ success: false, message: 'Forbidden' });
      return;
    }

    next();
  };
}
