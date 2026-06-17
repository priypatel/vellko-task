import { query } from '../../lib/db';

interface AuditLogRow {
  id: string;
  user_id: string | null;
  document_id: string | null;
  action: string;
  metadata: Record<string, unknown> | null;
  ip_address: string | null;
  created_at: Date;
  document_title: string | null;
}

export interface AuditLogView {
  id: string;
  userId: string | null;
  documentId: string | null;
  action: string;
  metadata: Record<string, unknown> | null;
  ipAddress: string | null;
  createdAt: Date;
  documentTitle: string | null;
}

function mapAuditLog(row: AuditLogRow): AuditLogView {
  return {
    id: row.id,
    userId: row.user_id,
    documentId: row.document_id,
    action: row.action,
    metadata: row.metadata,
    ipAddress: row.ip_address,
    createdAt: row.created_at,
    documentTitle: row.document_title,
  };
}

/**
 * List the authenticated user's own audit log entries (paginated).
 */
export async function listOwnAuditLogs(
  userId: string,
  page: number,
  limit: number,
): Promise<{
  data: AuditLogView[];
  total: number;
  page: number;
  limit: number;
}> {
  const offset = (page - 1) * limit;

  const result = await query<AuditLogRow & { total: string }>(
    `SELECT a.id, a.user_id, a.document_id, a.action, a.metadata,
            a.ip_address, a.created_at, d.title AS document_title,
            COUNT(*) OVER() AS total
     FROM audit_logs a
     LEFT JOIN documents d ON d.id = a.document_id
     WHERE a.user_id = $1
     ORDER BY a.created_at DESC
     LIMIT $2 OFFSET $3`,
    [userId, limit, offset],
  );

  const total = result.rows[0] ? Number(result.rows[0].total) : 0;
  return {
    data: result.rows.map(mapAuditLog),
    total,
    page,
    limit,
  };
}
