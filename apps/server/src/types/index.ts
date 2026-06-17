// Shared backend domain types. Field names are camelCase here; the data layer
// maps snake_case DB columns to these where needed.

export type UserRole = 'user' | 'admin';
export type DocumentStatus = 'uploaded' | 'signing' | 'signed';
export type SignatureType = 'drawn' | 'typed' | 'uploaded';

/**
 * The minimal authenticated principal attached to a request after the
 * `authenticate` middleware verifies the access token.
 */
export interface AuthUser {
  id: string;
  role: UserRole;
}

export interface User {
  id: string;
  name: string;
  email: string;
  passwordHash: string;
  role: UserRole;
  createdAt: Date;
  updatedAt: Date;
}

export interface Document {
  id: string;
  userId: string;
  title: string;
  originalFileKey: string;
  signedFileKey: string | null;
  fileHash: string;
  status: DocumentStatus;
  verificationToken: string;
  pageCount: number | null;
  fileSizeBytes: number | null;
  createdAt: Date;
  updatedAt: Date;
}

export interface Signature {
  id: string;
  userId: string;
  label: string | null;
  type: SignatureType;
  imageKey: string;
  createdAt: Date;
}

export interface DocumentSignature {
  id: string;
  documentId: string;
  signatureId: string;
  page: number;
  x: number;
  y: number;
  width: number;
  height: number;
  signedAt: Date;
}

export interface AuditLog {
  id: string;
  userId: string | null;
  documentId: string | null;
  action: string;
  metadata: Record<string, unknown> | null;
  ipAddress: string | null;
  createdAt: Date;
}

export interface PasswordResetToken {
  id: string;
  userId: string;
  tokenHash: string;
  expiresAt: Date;
  usedAt: Date | null;
}

export interface RefreshToken {
  id: string;
  userId: string;
  tokenHash: string;
  expiresAt: Date;
  revokedAt: Date | null;
}

// Augment Express's Request so `req.user` is typed everywhere.
declare module 'express-serve-static-core' {
  interface Request {
    user?: AuthUser;
  }
}
