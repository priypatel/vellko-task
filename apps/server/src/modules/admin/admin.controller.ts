import type { Request, Response } from 'express';
import * as adminService from './admin.service';
import type { DocumentStatus, UserRole } from '../../types';

export async function listUsers(req: Request, res: Response): Promise<void> {
  const { page, limit } = req.query as unknown as {
    page: number;
    limit: number;
  };
  const result = await adminService.listUsers(page, limit);
  res.status(200).json({
    success: true,
    data: {
      users: result.data,
      total: result.total,
      page: result.page,
      limit: result.limit,
    },
  });
}

export async function updateUserRole(
  req: Request,
  res: Response,
): Promise<void> {
  const user = await adminService.updateUserRole(
    req.params.id,
    req.user!.id,
    req.body.role as UserRole,
  );
  res.status(200).json({ success: true, data: { user } });
}

export async function listAllDocuments(
  req: Request,
  res: Response,
): Promise<void> {
  const { page, limit, status } = req.query as unknown as {
    page: number;
    limit: number;
    status?: DocumentStatus;
  };
  const result = await adminService.listAllDocuments(page, limit, status);
  res.status(200).json({
    success: true,
    data: {
      documents: result.data,
      total: result.total,
      page: result.page,
      limit: result.limit,
    },
  });
}

export async function listAllAuditLogs(
  req: Request,
  res: Response,
): Promise<void> {
  const { page, limit, userId, action, dateFrom, dateTo } =
    req.query as unknown as {
      page: number;
      limit: number;
      userId?: string;
      action?: string;
      dateFrom?: string;
      dateTo?: string;
    };
  const result = await adminService.listAllAuditLogs(page, limit, {
    userId,
    action,
    dateFrom,
    dateTo,
  });
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
