import { Router } from 'express';
import * as documentsController from './documents.controller';
import {
  listDocumentsSchema,
  signDocumentSchema,
  uploadDocumentSchema,
} from './documents.schema';
import { authenticate } from '../../middleware/authenticate';
import { validate } from '../../middleware/validate';
import { pdfUpload } from '../../middleware/upload';
import { uploadLimiter } from '../../middleware/rateLimiter';
import { asyncHandler } from '../../utils/asyncHandler';

const router = Router();

router.get(
  '/',
  authenticate,
  validate(listDocumentsSchema, 'query'),
  asyncHandler(documentsController.listDocuments),
);

router.post(
  '/',
  authenticate,
  uploadLimiter,
  pdfUpload.single('file'),
  validate(uploadDocumentSchema),
  asyncHandler(documentsController.uploadDocument),
);

router.get(
  '/:id',
  authenticate,
  asyncHandler(documentsController.getDocument),
);

router.delete(
  '/:id',
  authenticate,
  asyncHandler(documentsController.deleteDocument),
);

router.get(
  '/:id/download',
  authenticate,
  asyncHandler(documentsController.getDownloadUrl),
);

router.post(
  '/:id/sign',
  authenticate,
  validate(signDocumentSchema),
  asyncHandler(documentsController.signDocument),
);

export default router;
