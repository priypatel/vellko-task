import type { Request, Response } from 'express';
import * as verificationService from './verification.service';

export async function getVerification(
  req: Request,
  res: Response,
): Promise<void> {
  const result = await verificationService.getVerification(
    req.params.token,
    req.ip,
  );
  res.status(200).json({ success: true, data: result });
}
