import type { User, UserRole } from '@/types';

// The access token lives ONLY in memory — never localStorage/sessionStorage —
// so it is not exposed to XSS-readable storage.
let accessToken: string | null = null;

export function getAccessToken(): string | null {
  return accessToken;
}

export function setAccessToken(token: string): void {
  accessToken = token;
}

export function clearAccessToken(): void {
  accessToken = null;
}

/**
 * Decode (without verifying) the access token's payload to extract identity.
 * The signature is verified server-side on every request; this is only used
 * for client-side display/routing hints.
 */
export function getDecodedUser(): Pick<User, 'id' | 'role'> | null {
  if (!accessToken) return null;
  try {
    const payload = accessToken.split('.')[1];
    const json = JSON.parse(
      atob(payload.replace(/-/g, '+').replace(/_/g, '/')),
    );
    if (!payload || !json.userId) return null;
    return { id: json.userId as string, role: json.role as UserRole };
  } catch {
    return null;
  }
}

// ── Frontend "signal" cookies ──────────────────────────────────────────────
// These are NON-sensitive flags read by Next.js middleware for fast redirect
// guards. They are NOT used for authorization — the server validates the Bearer
// token on every request. The httpOnly refresh cookie lives on the API origin
// and is unreadable here, so we set our own readable signal instead.

const AUTH_COOKIE = 'ds_auth';
const ROLE_COOKIE = 'ds_role';
const COOKIE_MAX_AGE = 7 * 24 * 60 * 60; // match refresh token lifetime

export function setAuthSignal(role: UserRole): void {
  if (typeof document === 'undefined') return;
  const attrs = `path=/; max-age=${COOKIE_MAX_AGE}; samesite=lax`;
  document.cookie = `${AUTH_COOKIE}=1; ${attrs}`;
  document.cookie = `${ROLE_COOKIE}=${role}; ${attrs}`;
}

export function clearAuthSignal(): void {
  if (typeof document === 'undefined') return;
  document.cookie = `${AUTH_COOKIE}=; path=/; max-age=0`;
  document.cookie = `${ROLE_COOKIE}=; path=/; max-age=0`;
}
