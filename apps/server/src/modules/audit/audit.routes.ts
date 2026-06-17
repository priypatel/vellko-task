import { Router } from 'express';
import * as auditController from './audit.controller';
import { listAuditLogsSchema } from './audit.schema';
import { authenticate } from '../../middleware/authenticate';
import { validate } from '../../middleware/validate';
import { asyncHandler } from '../../utils/asyncHandler';

const router = Router();

router.get(
  '/',
  authenticate,
  validate(listAuditLogsSchema, 'query'),
  asyncHandler(auditController.listOwnAuditLogs),
);

export default router;
