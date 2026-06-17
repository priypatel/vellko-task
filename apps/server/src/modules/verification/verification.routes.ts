import { Router } from 'express';
import * as verificationController from './verification.controller';
import { asyncHandler } from '../../utils/asyncHandler';

const router = Router();

// Public — no authentication required.
router.get('/:token', asyncHandler(verificationController.getVerification));

export default router;
