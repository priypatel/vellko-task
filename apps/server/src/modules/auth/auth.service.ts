import { randomBytes } from 'node:crypto';
import { query } from '../../lib/db';
import { blocklistAdd, blocklistHas } from '../../lib/redis';
import { sendPasswordResetEmail } from '../../lib/mailer';
import { hashPassword, comparePassword, sha256 } from '../../utils/hash';
import {
  signAccessToken,
  signRefreshToken,
  verifyRefreshToken,
} from '../../utils/token';
import { writeAuditLog, AuditAction } from '../../utils/audit';
import { httpError } from '../../utils/httpError';
import type { UserRole } from '../../types';

export interface PublicUser {
  id: string;
  name: string;
  email: string;
  role: UserRole;
  createdAt: Date;
  updatedAt: Date;
}

interface UserRow {
  id: string;
  name: string;
  email: string;
  password_hash: string;
  role: UserRole;
  created_at: Date;
  updated_at: Date;
}

function toPublicUser(row: UserRow): PublicUser {
  return {
    id: row.id,
    name: row.name,
    email: row.email,
    role: row.role,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

/**
 * Fetch the current user's public profile (used to restore a session after a
 * page reload, where only the access token's userId/role are available).
 */
export async function getMe(userId: string): Promise<PublicUser> {
  const result = await query<UserRow>(
    `SELECT id, name, email, password_hash, role, created_at, updated_at
     FROM users WHERE id = $1`,
    [userId],
  );
  const user = result.rows[0];
  if (!user) {
    throw httpError(404, 'User not found');
  }
  return toPublicUser(user);
}

/**
 * Register a new account.
 */
export async function register(
  name: string,
  email: string,
  password: string,
  ip?: string,
): Promise<PublicUser> {
  const existing = await query<{ id: string }>(
    'SELECT id FROM users WHERE email = $1',
    [email],
  );
  if (existing.rowCount && existing.rowCount > 0) {
    throw httpError(409, 'Email already registered');
  }

  const passwordHash = await hashPassword(password);

  const result = await query<UserRow>(
    `INSERT INTO users (name, email, password_hash)
     VALUES ($1, $2, $3)
     RETURNING id, name, email, password_hash, role, created_at, updated_at`,
    [name, email, passwordHash],
  );

  const user = result.rows[0];
  await writeAuditLog(AuditAction.USER_REGISTERED, { userId: user.id, ip });

  return toPublicUser(user);
}

/**
 * Authenticate a user and issue tokens.
 */
export async function login(
  email: string,
  password: string,
  ip?: string,
): Promise<{ accessToken: string; refreshToken: string; user: PublicUser }> {
  const result = await query<UserRow>(
    `SELECT id, name, email, password_hash, role, created_at, updated_at
     FROM users WHERE email = $1`,
    [email],
  );

  const user = result.rows[0];

  // Always run a bcrypt comparison (against a dummy hash if the user does not
  // exist) so the response time does not reveal whether an email is registered.
  const DUMMY_HASH =
    '$2a$12$abcdefghijklmnopqrstuv0123456789012345678901234567890ab';
  const valid = await comparePassword(
    password,
    user ? user.password_hash : DUMMY_HASH,
  );

  if (!user || !valid) {
    throw httpError(401, 'Invalid credentials');
  }

  const accessToken = signAccessToken({ userId: user.id, role: user.role });
  const refreshToken = signRefreshToken({ userId: user.id });

  await query(
    `INSERT INTO refresh_tokens (user_id, token_hash, expires_at)
     VALUES ($1, $2, NOW() + INTERVAL '7 days')`,
    [user.id, sha256(refreshToken)],
  );

  await writeAuditLog(AuditAction.USER_LOGIN, { userId: user.id, ip });

  return { accessToken, refreshToken, user: toPublicUser(user) };
}

/**
 * Revoke a refresh token on logout. Best-effort: an invalid token still
 * resolves successfully so the client can clear its cookie.
 */
export async function logout(
  refreshToken: string | undefined,
  userId: string,
  ip?: string,
): Promise<void> {
  if (refreshToken) {
    try {
      const { jti, exp } = verifyRefreshToken(refreshToken);
      const ttl = exp - Math.floor(Date.now() / 1000);
      await blocklistAdd(jti, ttl);
    } catch {
      // Invalid/expired token — nothing to blocklist.
    }

    await query(
      `UPDATE refresh_tokens SET revoked_at = NOW()
       WHERE token_hash = $1 AND user_id = $2 AND revoked_at IS NULL`,
      [sha256(refreshToken), userId],
    );
  }

  await writeAuditLog(AuditAction.USER_LOGOUT, { userId, ip });
}

/**
 * Issue a new access token from a valid, non-revoked refresh token.
 */
export async function refreshTokens(
  refreshToken: string | undefined,
): Promise<{ accessToken: string }> {
  if (!refreshToken) {
    throw httpError(401, 'Missing refresh token');
  }

  let payload: { userId: string; jti: string; exp: number };
  try {
    payload = verifyRefreshToken(refreshToken);
  } catch {
    throw httpError(401, 'Invalid refresh token');
  }

  if (await blocklistHas(payload.jti)) {
    throw httpError(401, 'Token revoked');
  }

  const stored = await query<{ id: string }>(
    `SELECT id FROM refresh_tokens
     WHERE token_hash = $1 AND revoked_at IS NULL`,
    [sha256(refreshToken)],
  );
  if (!stored.rowCount) {
    throw httpError(401, 'Invalid refresh token');
  }

  const userResult = await query<{ role: UserRole }>(
    'SELECT role FROM users WHERE id = $1',
    [payload.userId],
  );
  if (!userResult.rowCount) {
    throw httpError(401, 'Invalid refresh token');
  }

  const accessToken = signAccessToken({
    userId: payload.userId,
    role: userResult.rows[0].role,
  });

  return { accessToken };
}

/**
 * Begin the password-recovery flow. Always resolves the same way regardless of
 * whether the email exists, to avoid account enumeration.
 */
export async function forgotPassword(
  email: string,
  ip?: string,
): Promise<void> {
  const result = await query<{ id: string; name: string }>(
    'SELECT id, name FROM users WHERE email = $1',
    [email],
  );
  const user = result.rows[0];
  if (!user) return; // Silent no-op.

  const rawToken = randomBytes(32).toString('hex');
  const tokenHash = sha256(rawToken);

  await query(
    `INSERT INTO password_reset_tokens (user_id, token_hash, expires_at)
     VALUES ($1, $2, NOW() + INTERVAL '1 hour')`,
    [user.id, tokenHash],
  );

  const frontendUrl = process.env.FRONTEND_URL || 'http://localhost:3010';
  const resetUrl = `${frontendUrl}/reset-password?token=${rawToken}`;
  await sendPasswordResetEmail(email, user.name, resetUrl);

  await writeAuditLog(AuditAction.PASSWORD_RESET_REQUESTED, {
    userId: user.id,
    ip,
  });
}

/**
 * Complete the password reset using a valid, unused, unexpired token.
 */
export async function resetPassword(
  rawToken: string,
  newPassword: string,
  ip?: string,
): Promise<void> {
  const tokenHash = sha256(rawToken);

  const result = await query<{ id: string; user_id: string }>(
    `SELECT id, user_id FROM password_reset_tokens
     WHERE token_hash = $1 AND expires_at > NOW() AND used_at IS NULL`,
    [tokenHash],
  );
  const token = result.rows[0];
  if (!token) {
    throw httpError(400, 'Invalid or expired token');
  }

  const passwordHash = await hashPassword(newPassword);

  await query(
    'UPDATE users SET password_hash = $1, updated_at = NOW() WHERE id = $2',
    [passwordHash, token.user_id],
  );
  await query(
    'UPDATE password_reset_tokens SET used_at = NOW() WHERE id = $1',
    [token.id],
  );

  await writeAuditLog(AuditAction.PASSWORD_RESET_COMPLETED, {
    userId: token.user_id,
    ip,
  });
}
