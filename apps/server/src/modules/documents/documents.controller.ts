import type { Request, Response } from 'express';
import * as documentsService from './documents.service';
import { httpError } from '../../utils/httpError';
import type { DocumentStatus } from '../../types';

export async function uploadDocument(
  req: Request,
  res: Response,
): Promise<void> {
  if (!req.file) {
    throw httpError(400, 'No file uploaded');
  }
  const document = await documentsService.uploadDocument(
    req.user!.id,
    req.body.title,
    req.file.buffer,
    req.file.size,
    req.ip,
  );
  res.status(201).json({ success: true, data: { document } });
}

export async function listDocuments(
  req: Request,
  res: Response,
): Promise<void> {
  const { page, limit, status } = req.query as unknown as {
    page: number;
    limit: number;
    status?: DocumentStatus;
  };
  const result = await documentsService.listDocuments(
    req.user!.id,
    page,
    limit,
    status,
  );
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

export async function getDocument(req: Request, res: Response): Promise<void> {
  const { document, signatures } = await documentsService.getDocument(
    req.params.id,
    req.user!.id,
    req.ip,
  );
  res.status(200).json({ success: true, data: { document, signatures } });
}

export async function deleteDocument(
  req: Request,
  res: Response,
): Promise<void> {
  await documentsService.deleteDocument(req.params.id, req.user!.id, req.ip);
  res.status(200).json({ success: true });
}

export async function getDownloadUrl(
  req: Request,
  res: Response,
): Promise<void> {
  const url = await documentsService.getDownloadUrl(
    req.params.id,
    req.user!.id,
    req.ip,
  );
  // Return the presigned URL as JSON rather than a 302. The SPA holds its
  // access token in memory (not a cookie), so a direct browser navigation to
  // this protected endpoint would not be authenticated. The client opens the
  // returned URL itself.
  res.status(200).json({ success: true, data: { url } });
}

export async function getPreviewUrl(
  req: Request,
  res: Response,
): Promise<void> {
  const url = await documentsService.getPreviewUrl(req.params.id, req.user!.id);
  res.status(200).json({ success: true, data: { url } });
}

export async function signDocument(req: Request, res: Response): Promise<void> {
  const document = await documentsService.signDocument(
    req.params.id,
    req.user!.id,
    req.body,
    req.ip,
  );
  res.status(200).json({ success: true, data: { document } });
}
