import { Router } from 'express';
import * as adminController from './admin.controller';
import {
  listUsersSchema,
  updateRoleSchema,
  listAdminDocumentsSchema,
  listAdminAuditLogsSchema,
} from './admin.schema';
import { authenticate } from '../../middleware/authenticate';
import { authorize } from '../../middleware/authorize';
import { validate } from '../../middleware/validate';
import { asyncHandler } from '../../utils/asyncHandler';

const router = Router();

// All admin routes require an authenticated admin.
router.use(authenticate, authorize('admin'));

router.get(
  '/users',
  validate(listUsersSchema, 'query'),
  asyncHandler(adminController.listUsers),
);

router.patch(
  '/users/:id/role',
  validate(updateRoleSchema),
  asyncHandler(adminController.updateUserRole),
);

router.get(
  '/documents',
  validate(listAdminDocumentsSchema, 'query'),
  asyncHandler(adminController.listAllDocuments),
);

router.get(
  '/audit-logs',
  validate(listAdminAuditLogsSchema, 'query'),
  asyncHandler(adminController.listAllAuditLogs),
);

export default router;
