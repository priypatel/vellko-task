import type { Request, Response } from 'express';
import * as auditService from './audit.service';

export async function listOwnAuditLogs(
  req: Request,
  res: Response,
): Promise<void> {
  const { page, limit } = req.query as unknown as {
    page: number;
    limit: number;
  };
  const result = await auditService.listOwnAuditLogs(
    req.user!.id,
    page,
    limit,
  );
  res.status(200).json({
    success: true,
    data: {
      logs: result.data,
      total: result.total,
      page: result.page,
      limit: result.limit,
    },
  });
}
