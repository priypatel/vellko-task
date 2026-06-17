import { z } from 'zod';

const pagination = {
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(100).default(20),
};

export const listUsersSchema = z.object({ ...pagination }).strip();

export const updateRoleSchema = z
  .object({
    role: z.enum(['user', 'admin']),
  })
  .strict();

export const listAdminDocumentsSchema = z
  .object({
    ...pagination,
    status: z.enum(['uploaded', 'signing', 'signed']).optional(),
  })
  .strip();

export const listAdminAuditLogsSchema = z
  .object({
    ...pagination,
    userId: z.string().uuid().optional(),
    action: z.string().max(50).optional(),
    // Accept either a plain date (YYYY-MM-DD) or a full ISO datetime.
    dateFrom: z
      .string()
      .refine((s) => !Number.isNaN(Date.parse(s)), 'Invalid date')
      .optional(),
    dateTo: z
      .string()
      .refine((s) => !Number.isNaN(Date.parse(s)), 'Invalid date')
      .optional(),
  })
  .strip();

export type ListUsersQuery = z.infer<typeof listUsersSchema>;
export type UpdateRoleInput = z.infer<typeof updateRoleSchema>;
export type ListAdminDocumentsQuery = z.infer<typeof listAdminDocumentsSchema>;
export type ListAdminAuditLogsQuery = z.infer<typeof listAdminAuditLogsSchema>;
