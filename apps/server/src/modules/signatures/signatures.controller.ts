import type { Request, Response } from 'express';
import * as signaturesService from './signatures.service';
import { httpError } from '../../utils/httpError';

export async function listSignatures(
  req: Request,
  res: Response,
): Promise<void> {
  const signatures = await signaturesService.listSignatures(req.user!.id);
  res.status(200).json({ success: true, data: { signatures } });
}

export async function createSignature(
  req: Request,
  res: Response,
): Promise<void> {
  if (!req.file) {
    throw httpError(400, 'No image uploaded');
  }
  const signature = await signaturesService.createSignature(
    req.user!.id,
    req.body.label,
    req.body.type,
    req.file.buffer,
    req.file.mimetype,
    req.ip,
  );
  res.status(201).json({ success: true, data: { signature } });
}

export async function deleteSignature(
  req: Request,
  res: Response,
): Promise<void> {
  await signaturesService.deleteSignature(req.params.id, req.user!.id, req.ip);
  res.status(200).json({ success: true });
}
