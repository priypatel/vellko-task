import { z } from 'zod';

export const createSignatureSchema = z
  .object({
    label: z.string().trim().max(100, 'Label is too long').optional(),
    type: z.enum(['drawn', 'typed', 'uploaded']),
  })
  .strip();

export type CreateSignatureInput = z.infer<typeof createSignatureSchema>;
