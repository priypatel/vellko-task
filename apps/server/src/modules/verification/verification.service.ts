import { query } from '../../lib/db';
import { writeAuditLog, AuditAction } from '../../utils/audit';
import { httpError } from '../../utils/httpError';
import type { DocumentStatus } from '../../types';

interface VerificationRow {
  id: string;
  title: string;
  file_hash: string;
  status: DocumentStatus;
  signed_at: Date;
  signer_name: string;
}

export interface VerificationResult {
  verified: boolean;
  title: string;
  status: DocumentStatus;
  signerName?: string;
  signedAt?: Date;
  fileHash?: string;
}

/**
 * Public verification lookup by a document's verification token.
 * Reveals only signing metadata — never internal ids or storage keys.
 */
export async function getVerification(
  token: string,
  ip?: string,
): Promise<VerificationResult> {
  const result = await query<VerificationRow>(
    `SELECT d.id, d.title, d.file_hash, d.status,
            d.updated_at AS signed_at, u.name AS signer_name
     FROM documents d
     JOIN users u ON u.id = d.user_id
     WHERE d.verification_token = $1`,
    [token],
  );

  const doc = result.rows[0];
  if (!doc) {
    throw httpError(404, 'Document not found');
  }

  if (doc.status !== 'signed') {
    return { verified: false, title: doc.title, status: doc.status };
  }

  await writeAuditLog(AuditAction.VERIFICATION_CHECKED, {
    userId: null,
    documentId: doc.id,
    ip,
    metadata: { token },
  });

  return {
    verified: true,
    title: doc.title,
    status: doc.status,
    signerName: doc.signer_name,
    signedAt: doc.signed_at,
    fileHash: doc.file_hash,
  };
}
