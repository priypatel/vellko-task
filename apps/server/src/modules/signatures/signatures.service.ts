import { v4 as uuidv4 } from 'uuid';
import { query } from '../../lib/db';
import { uploadFile, getSignedUrl, deleteFile } from '../../lib/supabase';
import { writeAuditLog, AuditAction } from '../../utils/audit';
import { httpError } from '../../utils/httpError';
import type { Signature, SignatureType } from '../../types';

const BUCKET = process.env.SUPABASE_STORAGE_BUCKET || 'docsign';
const SIGNED_URL_TTL = 3600; // 1 hour

interface SignatureRow {
  id: string;
  user_id: string;
  label: string | null;
  type: SignatureType;
  image_key: string;
  created_at: Date;
}

export type SignatureWithUrl = Signature & { imageUrl: string };

async function mapSignature(row: SignatureRow): Promise<SignatureWithUrl> {
  const imageUrl = await getSignedUrl(BUCKET, row.image_key, SIGNED_URL_TTL);
  return {
    id: row.id,
    userId: row.user_id,
    label: row.label,
    type: row.type,
    imageKey: row.image_key,
    createdAt: row.created_at,
    imageUrl,
  };
}

export async function listSignatures(
  userId: string,
): Promise<SignatureWithUrl[]> {
  const result = await query<SignatureRow>(
    `SELECT id, user_id, label, type, image_key, created_at
     FROM signatures
     WHERE user_id = $1
     ORDER BY created_at DESC`,
    [userId],
  );

  return Promise.all(result.rows.map(mapSignature));
}

export async function createSignature(
  userId: string,
  label: string | undefined,
  type: SignatureType,
  imageBuffer: Buffer,
  mimeType: string,
  ip?: string,
): Promise<SignatureWithUrl> {
  const imageKey = `signatures/${uuidv4()}.png`;
  await uploadFile(BUCKET, imageKey, imageBuffer, mimeType);

  const result = await query<SignatureRow>(
    `INSERT INTO signatures (user_id, label, type, image_key)
     VALUES ($1, $2, $3, $4)
     RETURNING id, user_id, label, type, image_key, created_at`,
    [userId, label ?? null, type, imageKey],
  );

  const signature = result.rows[0];
  await writeAuditLog(AuditAction.SIGNATURE_CREATED, {
    userId,
    ip,
    metadata: { label: label ?? null, type },
  });

  return mapSignature(signature);
}

export async function deleteSignature(
  signatureId: string,
  userId: string,
  ip?: string,
): Promise<void> {
  const result = await query<{ image_key: string }>(
    'SELECT image_key FROM signatures WHERE id = $1 AND user_id = $2',
    [signatureId, userId],
  );
  const signature = result.rows[0];
  if (!signature) {
    throw httpError(404, 'Signature not found');
  }

  // Best-effort storage cleanup; do not block deletion on storage errors.
  try {
    await deleteFile(BUCKET, signature.image_key);
  } catch (err) {
    console.error('[signatures] storage cleanup failed during delete', err);
  }

  await query('DELETE FROM signatures WHERE id = $1', [signatureId]);

  await writeAuditLog(AuditAction.SIGNATURE_DELETED, {
    userId,
    ip,
    metadata: { signatureId },
  });
}
