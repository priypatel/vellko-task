import { query } from '../../lib/db';
import { httpError } from '../../utils/httpError';
import type { DocumentStatus, UserRole } from '../../types';

// ───────────────────────────── Users ─────────────────────────────

interface AdminUserRow {
  id: string;
  name: string;
  email: string;
  role: UserRole;
  created_at: Date;
}

export interface AdminUserView {
  id: string;
  name: string;
  email: string;
  role: UserRole;
  createdAt: Date;
}

function mapUser(row: AdminUserRow): AdminUserView {
  return {
    id: row.id,
    name: row.name,
    email: row.email,
    role: row.role,
    createdAt: row.created_at,
  };
}

export async function listUsers(
  page: number,
  limit: number,
): Promise<{
  data: AdminUserView[];
  total: number;
  page: number;
  limit: number;
}> {
  const offset = (page - 1) * limit;
  const result = await query<AdminUserRow & { total: string }>(
    `SELECT id, name, email, role, created_at, COUNT(*) OVER() AS total
     FROM users
     ORDER BY created_at DESC
     LIMIT $1 OFFSET $2`,
    [limit, offset],
  );

  const total = result.rows[0] ? Number(result.rows[0].total) : 0;
  return { data: result.rows.map(mapUser), total, page, limit };
}

export async function updateUserRole(
  targetUserId: string,
  requestingUserId: string,
  newRole: UserRole,
): Promise<AdminUserView> {
  if (targetUserId === requestingUserId) {
    throw httpError(400, 'Cannot change your own role');
  }

  const result = await query<AdminUserRow>(
    `UPDATE users SET role = $1, updated_at = NOW()
     WHERE id = $2
     RETURNING id, name, email, role, created_at`,
    [newRole, targetUserId],
  );

  if (!result.rowCount) {
    throw httpError(404, 'User not found');
  }

  return mapUser(result.rows[0]);
}

// ─────────────────────────── Documents ───────────────────────────

interface AdminDocumentRow {
  id: string;
  user_id: string;
  title: string;
  status: DocumentStatus;
  verification_token: string;
  page_count: number | null;
  file_size_bytes: string | number | null;
  created_at: Date;
  updated_at: Date;
  owner_name: string;
}

export interface AdminDocumentView {
  id: string;
  userId: string;
  title: string;
  status: DocumentStatus;
  verificationToken: string;
  pageCount: number | null;
  fileSizeBytes: number | null;
  createdAt: Date;
  updatedAt: Date;
  ownerName: string;
}

function mapAdminDocument(row: AdminDocumentRow): AdminDocumentView {
  return {
    id: row.id,
    userId: row.user_id,
    title: row.title,
    status: row.status,
    verificationToken: row.verification_token,
    pageCount: row.page_count,
    fileSizeBytes:
      row.file_size_bytes === null ? null : Number(row.file_size_bytes),
    createdAt: row.created_at,
    updatedAt: row.updated_at,
    ownerName: row.owner_name,
  };
}

export async function listAllDocuments(
  page: number,
  limit: number,
  status?: DocumentStatus,
): Promise<{
  data: AdminDocumentView[];
  total: number;
  page: number;
  limit: number;
}> {
  const offset = (page - 1) * limit;
  const conditions: string[] = [];
  const params: unknown[] = [];

  if (status) {
    params.push(status);
    conditions.push(`d.status = $${params.length}`);
  }

  const whereClause = conditions.length
    ? `WHERE ${conditions.join(' AND ')}`
    : '';

  params.push(limit, offset);
  const limitParam = params.length - 1;
  const offsetParam = params.length;

  const result = await query<AdminDocumentRow & { total: string }>(
    `SELECT d.id, d.user_id, d.title, d.status, d.verification_token,
            d.page_count, d.file_size_bytes, d.created_at, d.updated_at,
            u.name AS owner_name, COUNT(*) OVER() AS total
     FROM documents d
     JOIN users u ON u.id = d.user_id
     ${whereClause}
     ORDER BY d.created_at DESC
     LIMIT $${limitParam} OFFSET $${offsetParam}`,
    params,
  );

  const total = result.rows[0] ? Number(result.rows[0].total) : 0;
  return { data: result.rows.map(mapAdminDocument), total, page, limit };
}

// ─────────────────────────── Audit Logs ──────────────────────────

interface AdminAuditLogRow {
  id: string;
  user_id: string | null;
  document_id: string | null;
  action: string;
  metadata: Record<string, unknown> | null;
  ip_address: string | null;
  created_at: Date;
  user_name: string | null;
  document_title: string | null;
}

export interface AdminAuditLogView {
  id: string;
  userId: string | null;
  documentId: string | null;
  action: string;
  metadata: Record<string, unknown> | null;
  ipAddress: string | null;
  createdAt: Date;
  userName: string | null;
  documentTitle: string | null;
}

function mapAdminAuditLog(row: AdminAuditLogRow): AdminAuditLogView {
  return {
    id: row.id,
    userId: row.user_id,
    documentId: row.document_id,
    action: row.action,
    metadata: row.metadata,
    ipAddress: row.ip_address,
    createdAt: row.created_at,
    userName: row.user_name,
    documentTitle: row.document_title,
  };
}

export async function listAllAuditLogs(
  page: number,
  limit: number,
  filters: {
    userId?: string;
    action?: string;
    dateFrom?: string;
    dateTo?: string;
  },
): Promise<{
  data: AdminAuditLogView[];
  total: number;
  page: number;
  limit: number;
}> {
  const offset = (page - 1) * limit;
  const conditions: string[] = [];
  const params: unknown[] = [];

  if (filters.userId) {
    params.push(filters.userId);
    conditions.push(`a.user_id = $${params.length}`);
  }
  if (filters.action) {
    params.push(filters.action);
    conditions.push(`a.action = $${params.length}`);
  }
  if (filters.dateFrom) {
    params.push(filters.dateFrom);
    conditions.push(`a.created_at >= $${params.length}`);
  }
  if (filters.dateTo) {
    params.push(filters.dateTo);
    conditions.push(`a.created_at <= $${params.length}`);
  }

  const whereClause = conditions.length
    ? `WHERE ${conditions.join(' AND ')}`
    : '';

  params.push(limit, offset);
  const limitParam = params.length - 1;
  const offsetParam = params.length;

  const result = await query<AdminAuditLogRow & { total: string }>(
    `SELECT a.id, a.user_id, a.document_id, a.action, a.metadata,
            a.ip_address, a.created_at,
            u.name AS user_name, d.title AS document_title,
            COUNT(*) OVER() AS total
     FROM audit_logs a
     LEFT JOIN users u ON u.id = a.user_id
     LEFT JOIN documents d ON d.id = a.document_id
     ${whereClause}
     ORDER BY a.created_at DESC
     LIMIT $${limitParam} OFFSET $${offsetParam}`,
    params,
  );

  const total = result.rows[0] ? Number(result.rows[0].total) : 0;
  return { data: result.rows.map(mapAdminAuditLog), total, page, limit };
}
