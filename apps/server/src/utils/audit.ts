import { query } from '../lib/db';

/** Canonical set of tracked audit actions. */
export const AuditAction = {
  USER_REGISTERED: 'USER_REGISTERED',
  USER_LOGIN: 'USER_LOGIN',
  USER_LOGOUT: 'USER_LOGOUT',
  DOCUMENT_UPLOADED: 'DOCUMENT_UPLOADED',
  DOCUMENT_VIEWED: 'DOCUMENT_VIEWED',
  DOCUMENT_SIGNED: 'DOCUMENT_SIGNED',
  DOCUMENT_DOWNLOADED: 'DOCUMENT_DOWNLOADED',
  DOCUMENT_DELETED: 'DOCUMENT_DELETED',
  SIGNATURE_CREATED: 'SIGNATURE_CREATED',
  SIGNATURE_DELETED: 'SIGNATURE_DELETED',
  VERIFICATION_CHECKED: 'VERIFICATION_CHECKED',
  PASSWORD_RESET_REQUESTED: 'PASSWORD_RESET_REQUESTED',
  PASSWORD_RESET_COMPLETED: 'PASSWORD_RESET_COMPLETED',
} as const;

export type AuditActionType =
  (typeof AuditAction)[keyof typeof AuditAction];

interface AuditOptions {
  userId?: string | null;
  documentId?: string | null;
  ip?: string | null;
  metadata?: Record<string, unknown> | null;
}

/**
 * Append an entry to the audit trail. Failures are logged but never thrown —
 * auditing must not break the primary operation.
 */
export async function writeAuditLog(
  action: AuditActionType,
  opts: AuditOptions = {},
): Promise<void> {
  try {
    await query(
      `INSERT INTO audit_logs (user_id, document_id, action, metadata, ip_address)
       VALUES ($1, $2, $3, $4, $5)`,
      [
        opts.userId ?? null,
        opts.documentId ?? null,
        action,
        opts.metadata ? JSON.stringify(opts.metadata) : null,
        opts.ip ?? null,
      ],
    );
  } catch (err) {
    console.error('[audit] failed to write audit log', action, err);
  }
}
