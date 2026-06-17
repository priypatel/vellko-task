import { z } from 'zod';

export const listDocumentsSchema = z
  .object({
    page: z.coerce.number().int().min(1).default(1),
    limit: z.coerce.number().int().min(1).max(50).default(20),
    status: z.enum(['uploaded', 'signing', 'signed']).optional(),
  })
  .strip();

export const signDocumentSchema = z
  .object({
    signatureId: z.string().uuid('Invalid signature id'),
    page: z.coerce.number().int().min(1),
    x: z.coerce.number().min(0).max(100),
    y: z.coerce.number().min(0).max(100),
    width: z.coerce.number().min(1).max(100),
    height: z.coerce.number().min(1).max(100),
  })
  .strict();

export const uploadDocumentSchema = z
  .object({
    title: z.string().trim().min(1, 'Title is required').max(255, 'Title is too long'),
  })
  .strip();

export type ListDocumentsQuery = z.infer<typeof listDocumentsSchema>;
export type SignDocumentInput = z.infer<typeof signDocumentSchema>;
export type UploadDocumentInput = z.infer<typeof uploadDocumentSchema>;
