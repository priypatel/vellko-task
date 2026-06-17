import jwt, { type SignOptions } from 'jsonwebtoken';
import { v4 as uuidv4 } from 'uuid';

const ACCESS_SECRET = process.env.JWT_ACCESS_SECRET;
const REFRESH_SECRET = process.env.JWT_REFRESH_SECRET;
const ACCESS_EXPIRES_IN = process.env.JWT_ACCESS_EXPIRES_IN || '15m';
const REFRESH_EXPIRES_IN = process.env.JWT_REFRESH_EXPIRES_IN || '7d';

if (!ACCESS_SECRET || !REFRESH_SECRET) {
  console.warn(
    '[token] JWT_ACCESS_SECRET or JWT_REFRESH_SECRET is not set — token operations will fail.',
  );
}

export interface AccessTokenPayload {
  userId: string;
  role: string;
  jti: string;
}

export interface RefreshTokenPayload {
  userId: string;
  jti: string;
  exp: number;
}

/**
 * Sign a short-lived access token. A unique jti is embedded so individual
 * tokens can be tracked/revoked if needed.
 */
export function signAccessToken(payload: {
  userId: string;
  role: string;
}): string {
  const options: SignOptions = {
    expiresIn: ACCESS_EXPIRES_IN as SignOptions['expiresIn'],
    jwtid: uuidv4(),
  };
  return jwt.sign(
    { userId: payload.userId, role: payload.role },
    ACCESS_SECRET as string,
    options,
  );
}

/**
 * Sign a long-lived refresh token. The jti is used as the blocklist key on
 * logout so the token can be invalidated before its natural expiry.
 */
export function signRefreshToken(payload: { userId: string }): string {
  const options: SignOptions = {
    expiresIn: REFRESH_EXPIRES_IN as SignOptions['expiresIn'],
    jwtid: uuidv4(),
  };
  return jwt.sign({ userId: payload.userId }, REFRESH_SECRET as string, options);
}

/**
 * Verify an access token. Throws if invalid or expired.
 */
export function verifyAccessToken(token: string): AccessTokenPayload {
  const decoded = jwt.verify(token, ACCESS_SECRET as string) as jwt.JwtPayload;
  return {
    userId: decoded.userId as string,
    role: decoded.role as string,
    jti: decoded.jti as string,
  };
}

/**
 * Verify a refresh token. Throws if invalid or expired.
 */
export function verifyRefreshToken(token: string): RefreshTokenPayload {
  const decoded = jwt.verify(token, REFRESH_SECRET as string) as jwt.JwtPayload;
  return {
    userId: decoded.userId as string,
    jti: decoded.jti as string,
    exp: decoded.exp as number,
  };
}
