import type { Request, Response, CookieOptions } from 'express';
import * as authService from './auth.service';

const REFRESH_COOKIE = 'refreshToken';
const SEVEN_DAYS_MS = 7 * 24 * 60 * 60 * 1000;

/**
 * Cookie options for the refresh token. Restricted to the auth path so it is
 * only sent on auth requests. `secure` is enabled in production (HTTPS).
 */
function refreshCookieOptions(): CookieOptions {
  return {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'strict',
    path: '/api/auth',
    maxAge: SEVEN_DAYS_MS,
  };
}

export async function me(req: Request, res: Response): Promise<void> {
  const user = await authService.getMe(req.user!.id);
  res.status(200).json({ success: true, data: { user } });
}

export async function register(req: Request, res: Response): Promise<void> {
  const { name, email, password } = req.body;
  const user = await authService.register(name, email, password, req.ip);
  res.status(201).json({ success: true, data: { user } });
}

export async function login(req: Request, res: Response): Promise<void> {
  const { email, password } = req.body;
  const { accessToken, refreshToken, user } = await authService.login(
    email,
    password,
    req.ip,
  );
  res.cookie(REFRESH_COOKIE, refreshToken, refreshCookieOptions());
  res.status(200).json({ success: true, data: { accessToken, user } });
}

export async function logout(req: Request, res: Response): Promise<void> {
  const refreshToken = req.cookies?.[REFRESH_COOKIE];
  // `authenticate` guarantees req.user is set on this route.
  await authService.logout(refreshToken, req.user!.id, req.ip);
  res.clearCookie(REFRESH_COOKIE, { path: '/api/auth' });
  res.status(200).json({ success: true });
}

export async function refresh(req: Request, res: Response): Promise<void> {
  const refreshToken = req.cookies?.[REFRESH_COOKIE];
  const { accessToken } = await authService.refreshTokens(refreshToken);
  res.status(200).json({ success: true, data: { accessToken } });
}

export async function forgotPassword(
  req: Request,
  res: Response,
): Promise<void> {
  await authService.forgotPassword(req.body.email, req.ip);
  res.status(200).json({
    success: true,
    message: 'If that email exists, a reset link has been sent',
  });
}

export async function resetPassword(
  req: Request,
  res: Response,
): Promise<void> {
  const { token, password } = req.body;
  await authService.resetPassword(token, password, req.ip);
  res.status(200).json({ success: true, message: 'Password updated' });
}
