export type UserRole = 'user' | 'admin';
export type DocumentStatus = 'uploaded' | 'signing' | 'signed';
export type SignatureType = 'drawn' | 'typed' | 'uploaded';

export interface User {
  id: string;
  name: string;
  email: string;
  role: UserRole;
  createdAt: string;
}

export interface Document {
  id: string;
  userId: string;
  title: string;
  status: DocumentStatus;
  verificationToken: string;
  pageCount: number | null;
  fileSizeBytes: number | null;
  fileHash: string;
  createdAt: string;
  updatedAt: string;
}

export interface Signature {
  id: string;
  userId: string;
  label: string | null;
  type: SignatureType;
  imageUrl: string;
  createdAt: string;
}

export interface AuditLog {
  id: string;
  action: string;
  metadata: Record<string, unknown> | null;
  ipAddress: string | null;
  createdAt: string;
  documentTitle?: string;
  userName?: string;
}

export interface VerificationResult {
  verified: boolean;
  title: string;
  signerName?: string;
  signedAt?: string;
  fileHash?: string;
  status: string;
}

/** A signature placement on a document (history table). */
export interface SignaturePlacement {
  id: string;
  page: number;
  signedAt: string;
}

/** Admin document view includes the owner's name. */
export interface AdminDocument extends Document {
  ownerName: string;
}

export interface PaginatedResponse<T> {
  data: T[];
  total: number;
  page: number;
  limit: number;
}

export interface ApiResponse<T> {
  success: boolean;
  data?: T;
  message?: string;
  errors?: unknown[];
}
