import type { Request, Response, NextFunction } from 'express';
import multer, { type FileFilterCallback } from 'multer';

const PDF_MIME = 'application/pdf';
const IMAGE_MIMES = ['image/png', 'image/jpeg', 'image/webp'];

const TWENTY_MB = 20 * 1024 * 1024;
const FIVE_MB = 5 * 1024 * 1024;

/** Build an Error tagged with an HTTP status for the global error handler. */
function badRequest(message: string): Error & { statusCode: number } {
  return Object.assign(new Error(message), { statusCode: 400 });
}

/**
 * Multer instance for PDF uploads (in-memory, 20 MB cap).
 *
 * NOTE: With memoryStorage the file buffer is not available inside fileFilter,
 * so the magic-byte (%PDF) check is enforced by `verifyPdfMagicBytes` below,
 * which runs after Multer has parsed the request. The fileFilter handles the
 * cheap MIME-type rejection.
 */
export const pdfUpload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: TWENTY_MB },
  fileFilter: (_req: Request, file, cb: FileFilterCallback) => {
    if (file.mimetype !== PDF_MIME) {
      cb(badRequest('Only PDF files are allowed'));
      return;
    }
    cb(null, true);
  },
});

/**
 * Post-Multer guard: verify the uploaded file really is a PDF by checking the
 * `%PDF` magic bytes, not just the client-supplied MIME type.
 */
export function verifyPdfMagicBytes(
  req: Request,
  res: Response,
  next: NextFunction,
): void {
  const buffer = req.file?.buffer;

  if (!buffer) {
    res.status(400).json({ success: false, message: 'No file uploaded' });
    return;
  }

  const isPdf =
    buffer.length >= 4 &&
    buffer[0] === 0x25 && // %
    buffer[1] === 0x50 && // P
    buffer[2] === 0x44 && // D
    buffer[3] === 0x46; // F

  if (!isPdf) {
    res.status(400).json({
      success: false,
      message: 'Uploaded file is not a valid PDF',
    });
    return;
  }

  next();
}

/**
 * Multer instance for signature image uploads (in-memory, 5 MB cap).
 */
export const signatureUpload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: FIVE_MB },
  fileFilter: (_req: Request, file, cb: FileFilterCallback) => {
    if (!IMAGE_MIMES.includes(file.mimetype)) {
      cb(badRequest('Only PNG, JPEG, or WebP images are allowed'));
      return;
    }
    cb(null, true);
  },
});
