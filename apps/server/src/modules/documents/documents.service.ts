import { v4 as uuidv4 } from 'uuid';
import { query } from '../../lib/db';
import { uploadFile, getSignedUrl, deleteFile, downloadFile } from '../../lib/supabase';
import { sha256 } from '../../utils/hash';
import { getPageCount, embedSignature } from '../../utils/pdf';
import { writeAuditLog, AuditAction } from '../../utils/audit';
import { httpError } from '../../utils/httpError';
import type { Document, DocumentStatus } from '../../types';

const BUCKET = process.env.SUPABASE_STORAGE_BUCKET || 'docsign';
const DOWNLOAD_URL_TTL = 3600; // 1 hour

interface DocumentRow {
  id: string;
  user_id: string;
  title: string;
  original_file_key: string;
  signed_file_key: string | null;
  file_hash: string;
  status: DocumentStatus;
  verification_token: string;
  page_count: number | null;
  file_size_bytes: string | number | null;
  created_at: Date;
  updated_at: Date;
}

const DOCUMENT_COLUMNS = `
  id, user_id, title, original_file_key, signed_file_key, file_hash,
  status, verification_token, page_count, file_size_bytes, created_at, updated_at
`;

function mapDocument(row: DocumentRow): Document {
  return {
    id: row.id,
    userId: row.user_id,
    title: row.title,
    originalFileKey: row.original_file_key,
    signedFileKey: row.signed_file_key,
    fileHash: row.file_hash,
    status: row.status,
    verificationToken: row.verification_token,
    pageCount: row.page_count,
    fileSizeBytes:
      row.file_size_bytes === null ? null : Number(row.file_size_bytes),
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

/** Verify a buffer begins with the %PDF magic bytes. */
function isPdf(buffer: Buffer): boolean {
  return (
    buffer.length >= 4 &&
    buffer[0] === 0x25 &&
    buffer[1] === 0x50 &&
    buffer[2] === 0x44 &&
    buffer[3] === 0x46
  );
}

export async function uploadDocument(
  userId: string,
  title: string,
  fileBuffer: Buffer,
  fileSize: number,
  ip?: string,
): Promise<Document> {
  if (!isPdf(fileBuffer)) {
    throw httpError(400, 'Uploaded file is not a valid PDF');
  }

  const fileHash = sha256(fileBuffer);
  const pageCount = await getPageCount(fileBuffer);
  const fileKey = `originals/${uuidv4()}.pdf`;

  await uploadFile(BUCKET, fileKey, fileBuffer, 'application/pdf');

  const result = await query<DocumentRow>(
    `INSERT INTO documents
       (user_id, title, original_file_key, file_hash, status, page_count, file_size_bytes)
     VALUES ($1, $2, $3, $4, 'uploaded', $5, $6)
     RETURNING ${DOCUMENT_COLUMNS}`,
    [userId, title, fileKey, fileHash, pageCount, fileSize],
  );

  const document = result.rows[0];
  await writeAuditLog(AuditAction.DOCUMENT_UPLOADED, {
    userId,
    documentId: document.id,
    ip,
    metadata: { title, fileSize },
  });

  return mapDocument(document);
}

export async function listDocuments(
  userId: string,
  page: number,
  limit: number,
  status?: DocumentStatus,
): Promise<{ data: Document[]; total: number; page: number; limit: number }> {
  const offset = (page - 1) * limit;
  const conditions = ['user_id = $1'];
  const params: unknown[] = [userId];

  if (status) {
    params.push(status);
    conditions.push(`status = $${params.length}`);
  }

  params.push(limit, offset);
  const limitParam = params.length - 1;
  const offsetParam = params.length;

  const result = await query<DocumentRow & { total: string }>(
    `SELECT ${DOCUMENT_COLUMNS}, COUNT(*) OVER() AS total
     FROM documents
     WHERE ${conditions.join(' AND ')}
     ORDER BY created_at DESC
     LIMIT $${limitParam} OFFSET $${offsetParam}`,
    params,
  );

  const total = result.rows[0] ? Number(result.rows[0].total) : 0;
  return {
    data: result.rows.map(mapDocument),
    total,
    page,
    limit,
  };
}

async function findOwnedDocument(
  documentId: string,
  userId: string,
): Promise<DocumentRow> {
  const result = await query<DocumentRow>(
    `SELECT ${DOCUMENT_COLUMNS} FROM documents WHERE id = $1 AND user_id = $2`,
    [documentId, userId],
  );
  const document = result.rows[0];
  if (!document) {
    throw httpError(404, 'Document not found');
  }
  return document;
}

export interface SignaturePlacement {
  id: string;
  page: number;
  signedAt: Date;
}

export async function getDocument(
  documentId: string,
  userId: string,
  ip?: string,
): Promise<{ document: Document; signatures: SignaturePlacement[] }> {
  const document = await findOwnedDocument(documentId, userId);

  const placements = await query<{
    id: string;
    page: number;
    signed_at: Date;
  }>(
    `SELECT id, page, signed_at
     FROM document_signatures
     WHERE document_id = $1
     ORDER BY signed_at ASC`,
    [documentId],
  );

  await writeAuditLog(AuditAction.DOCUMENT_VIEWED, {
    userId,
    documentId,
    ip,
  });

  return {
    document: mapDocument(document),
    signatures: placements.rows.map((r) => ({
      id: r.id,
      page: r.page,
      signedAt: r.signed_at,
    })),
  };
}

export async function deleteDocument(
  documentId: string,
  userId: string,
  ip?: string,
): Promise<void> {
  const document = await findOwnedDocument(documentId, userId);

  // Best-effort storage cleanup; do not block deletion on storage errors.
  try {
    await deleteFile(BUCKET, document.original_file_key);
    if (document.signed_file_key) {
      await deleteFile(BUCKET, document.signed_file_key);
    }
  } catch (err) {
    console.error('[documents] storage cleanup failed during delete', err);
  }

  await query('DELETE FROM documents WHERE id = $1', [documentId]);

  await writeAuditLog(AuditAction.DOCUMENT_DELETED, {
    userId,
    documentId,
    ip,
    metadata: { title: document.title },
  });
}

export async function getDownloadUrl(
  documentId: string,
  userId: string,
  ip?: string,
): Promise<string> {
  const document = await findOwnedDocument(documentId, userId);

  if (document.status !== 'signed' || !document.signed_file_key) {
    throw httpError(400, 'Document is not signed yet');
  }

  const url = await getSignedUrl(
    BUCKET,
    document.signed_file_key,
    DOWNLOAD_URL_TTL,
  );

  await writeAuditLog(AuditAction.DOCUMENT_DOWNLOADED, {
    userId,
    documentId,
    ip,
  });

  return url;
}

/**
 * Presigned URL for in-browser preview. Returns the signed file if the
 * document is signed, otherwise the original. Owner-only.
 */
export async function getPreviewUrl(
  documentId: string,
  userId: string,
): Promise<string> {
  const document = await findOwnedDocument(documentId, userId);
  const key =
    document.status === 'signed' && document.signed_file_key
      ? document.signed_file_key
      : document.original_file_key;
  return getSignedUrl(BUCKET, key, DOWNLOAD_URL_TTL);
}

export async function signDocument(
  documentId: string,
  userId: string,
  input: {
    signatureId: string;
    page: number;
    x: number;
    y: number;
    width: number;
    height: number;
  },
  ip?: string,
): Promise<Document> {
  const document = await findOwnedDocument(documentId, userId);

  if (document.status === 'signed') {
    throw httpError(400, 'Document already signed');
  }

  const signatureResult = await query<{ image_key: string }>(
    'SELECT image_key FROM signatures WHERE id = $1 AND user_id = $2',
    [input.signatureId, userId],
  );
  const signature = signatureResult.rows[0];
  if (!signature) {
    throw httpError(404, 'Signature not found');
  }

  // Mark as in-progress while we generate the signed PDF.
  await query('UPDATE documents SET status = $1 WHERE id = $2', [
    'signing',
    documentId,
  ]);

  const pdfBuffer = await downloadFile(BUCKET, document.original_file_key);
  const signatureBuffer = await downloadFile(BUCKET, signature.image_key);

  const signedPdfBuffer = await embedSignature({
    pdfBuffer,
    signatureBuffer,
    page: input.page,
    xPct: input.x,
    yPct: input.y,
    widthPct: input.width,
    heightPct: input.height,
  });

  const signedKey = `signed/${uuidv4()}.pdf`;
  await uploadFile(BUCKET, signedKey, signedPdfBuffer, 'application/pdf');

  await query(
    `INSERT INTO document_signatures
       (document_id, signature_id, page, x, y, width, height)
     VALUES ($1, $2, $3, $4, $5, $6, $7)`,
    [
      documentId,
      input.signatureId,
      input.page,
      input.x,
      input.y,
      input.width,
      input.height,
    ],
  );

  const updated = await query<DocumentRow>(
    `UPDATE documents
       SET signed_file_key = $1, status = 'signed', updated_at = NOW()
     WHERE id = $2
     RETURNING ${DOCUMENT_COLUMNS}`,
    [signedKey, documentId],
  );

  await writeAuditLog(AuditAction.DOCUMENT_SIGNED, {
    userId,
    documentId,
    ip,
    metadata: { signatureId: input.signatureId, page: input.page },
  });

  return mapDocument(updated.rows[0]);
}
