import axios, {
  type AxiosInstance,
  type AxiosRequestConfig,
  type InternalAxiosRequestConfig,
} from 'axios';
import { getAccessToken, setAccessToken, clearAccessToken } from './auth';
import type {
  ApiResponse,
  AuditLog,
  AdminDocument,
  Document,
  PaginatedResponse,
  Signature,
  SignaturePlacement,
  User,
  UserRole,
  VerificationResult,
} from '@/types';

const baseURL =
  process.env.NEXT_PUBLIC_API_URL || 'http://localhost:4000/api';

const client: AxiosInstance = axios.create({
  baseURL,
  withCredentials: true,
});

// ── Request: attach the in-memory access token ──────────────────────────────
client.interceptors.request.use((config: InternalAxiosRequestConfig) => {
  const token = getAccessToken();
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

// ── Response: transparently refresh the access token on 401 ─────────────────
interface RetriableConfig extends AxiosRequestConfig {
  _retry?: boolean;
}

client.interceptors.response.use(
  (response) => response,
  async (error) => {
    const original = error.config as RetriableConfig;
    const status = error.response?.status;
    const url: string = original?.url ?? '';

    // Only attempt a refresh for 401s on non-auth endpoints, once.
    const isAuthEndpoint = url.includes('/auth/');
    if (status === 401 && !original._retry && !isAuthEndpoint) {
      original._retry = true;
      try {
        const refreshRes = await client.post<
          ApiResponse<{ accessToken: string }>
        >('/auth/refresh');
        const newToken = refreshRes.data.data?.accessToken;
        if (newToken) {
          setAccessToken(newToken);
          original.headers = {
            ...original.headers,
            Authorization: `Bearer ${newToken}`,
          };
          return client(original);
        }
      } catch {
        // fall through to redirect
      }
      clearAccessToken();
      if (typeof window !== 'undefined') {
        window.location.href = '/login';
      }
    }

    return Promise.reject(error);
  },
);

// ── Typed helpers ───────────────────────────────────────────────────────────

export interface ListParams {
  page?: number;
  limit?: number;
  status?: string;
}

export interface AdminAuditParams extends ListParams {
  userId?: string;
  action?: string;
  dateFrom?: string;
  dateTo?: string;
}

export const api = {
  auth: {
    register: (body: { name: string; email: string; password: string }) =>
      client
        .post<ApiResponse<{ user: User }>>('/auth/register', body)
        .then((r) => r.data),
    login: (body: { email: string; password: string }) =>
      client
        .post<ApiResponse<{ accessToken: string; user: User }>>(
          '/auth/login',
          body,
        )
        .then((r) => r.data),
    logout: () =>
      client.post<ApiResponse<null>>('/auth/logout').then((r) => r.data),
    refresh: () =>
      client
        .post<ApiResponse<{ accessToken: string }>>('/auth/refresh')
        .then((r) => r.data),
    me: () =>
      client.get<ApiResponse<{ user: User }>>('/auth/me').then((r) => r.data),
    forgotPassword: (body: { email: string }) =>
      client
        .post<ApiResponse<null>>('/auth/forgot-password', body)
        .then((r) => r.data),
    resetPassword: (body: { token: string; password: string }) =>
      client
        .post<ApiResponse<null>>('/auth/reset-password', body)
        .then((r) => r.data),
  },

  documents: {
    list: (params: ListParams = {}) =>
      client
        .get<
          ApiResponse<{
            documents: Document[];
            total: number;
            page: number;
            limit: number;
          }>
        >('/documents', { params })
        .then((r) => r.data),
    upload: (formData: FormData, onUploadProgress?: (e: ProgressEvent) => void) =>
      client
        .post<ApiResponse<{ document: Document }>>('/documents', formData, {
          headers: { 'Content-Type': 'multipart/form-data' },
          onUploadProgress: onUploadProgress as never,
        })
        .then((r) => r.data),
    get: (id: string) =>
      client
        .get<
          ApiResponse<{ document: Document; signatures: SignaturePlacement[] }>
        >(`/documents/${id}`)
        .then((r) => r.data),
    delete: (id: string) =>
      client
        .delete<ApiResponse<null>>(`/documents/${id}`)
        .then((r) => r.data),
    // Fetches a short-lived presigned download URL (authenticated request).
    getDownloadUrl: (id: string) =>
      client
        .get<ApiResponse<{ url: string }>>(`/documents/${id}/download`)
        .then((r) => r.data.data?.url ?? ''),
    // Presigned URL for in-browser preview (original, or signed if signed).
    getPreviewUrl: (id: string) =>
      client
        .get<ApiResponse<{ url: string }>>(`/documents/${id}/preview`)
        .then((r) => r.data.data?.url ?? ''),
    sign: (
      id: string,
      body: {
        signatureId: string;
        page: number;
        x: number;
        y: number;
        width: number;
        height: number;
      },
    ) =>
      client
        .post<ApiResponse<{ document: Document }>>(`/documents/${id}/sign`, body)
        .then((r) => r.data),
  },

  signatures: {
    list: () =>
      client
        .get<ApiResponse<{ signatures: Signature[] }>>('/signatures')
        .then((r) => r.data),
    create: (formData: FormData) =>
      client
        .post<ApiResponse<{ signature: Signature }>>('/signatures', formData, {
          headers: { 'Content-Type': 'multipart/form-data' },
        })
        .then((r) => r.data),
    delete: (id: string) =>
      client
        .delete<ApiResponse<null>>(`/signatures/${id}`)
        .then((r) => r.data),
  },

  verification: {
    verify: (token: string) =>
      client
        .get<ApiResponse<VerificationResult>>(`/verify/${token}`)
        .then((r) => r.data),
  },

  auditLogs: {
    list: (params: ListParams = {}) =>
      client
        .get<
          ApiResponse<{
            logs: AuditLog[];
            total: number;
            page: number;
            limit: number;
          }>
        >('/audit-logs', { params })
        .then((r) => r.data),
  },

  admin: {
    listUsers: (params: ListParams = {}) =>
      client
        .get<
          ApiResponse<{
            users: User[];
            total: number;
            page: number;
            limit: number;
          }>
        >('/admin/users', { params })
        .then((r) => r.data),
    updateRole: (userId: string, role: UserRole) =>
      client
        .patch<ApiResponse<{ user: User }>>(`/admin/users/${userId}/role`, {
          role,
        })
        .then((r) => r.data),
    listDocuments: (params: ListParams = {}) =>
      client
        .get<
          ApiResponse<{
            documents: AdminDocument[];
            total: number;
            page: number;
            limit: number;
          }>
        >('/admin/documents', { params })
        .then((r) => r.data),
    listAuditLogs: (params: AdminAuditParams = {}) =>
      client
        .get<
          ApiResponse<{
            logs: AuditLog[];
            total: number;
            page: number;
            limit: number;
          }>
        >('/admin/audit-logs', { params })
        .then((r) => r.data),
  },
};

export type { PaginatedResponse };
export default client;
