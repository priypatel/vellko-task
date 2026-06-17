import { Router } from 'express';
import * as signaturesController from './signatures.controller';
import { createSignatureSchema } from './signatures.schema';
import { authenticate } from '../../middleware/authenticate';
import { validate } from '../../middleware/validate';
import { signatureUpload } from '../../middleware/upload';
import { asyncHandler } from '../../utils/asyncHandler';

const router = Router();

router.get(
  '/',
  authenticate,
  asyncHandler(signaturesController.listSignatures),
);

router.post(
  '/',
  authenticate,
  signatureUpload.single('image'),
  validate(createSignatureSchema),
  asyncHandler(signaturesController.createSignature),
);

router.delete(
  '/:id',
  authenticate,
  asyncHandler(signaturesController.deleteSignature),
);

export default router;
