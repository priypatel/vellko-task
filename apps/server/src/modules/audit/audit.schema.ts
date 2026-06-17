import { z } from 'zod';

export const listAuditLogsSchema = z
  .object({
    page: z.coerce.number().int().min(1).default(1),
    limit: z.coerce.number().int().min(1).max(100).default(20),
  })
  .strip();

export type ListAuditLogsQuery = z.infer<typeof listAuditLogsSchema>;
