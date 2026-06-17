import { NextResponse, type NextRequest } from 'next/server';

/**
 * Fast redirect guard for protected routes. This is a UX optimization, NOT the
 * security boundary — every API request is independently authorized server-side
 * with the Bearer access token.
 *
 * The backend's refresh cookie is httpOnly and scoped to the API origin, so it
 * is unreadable here. Instead we read the non-sensitive `ds_auth` / `ds_role`
 * signal cookies set client-side after login.
 */
export function middleware(req: NextRequest) {
  const { pathname } = req.nextUrl;
  const isAuthed = req.cookies.get('ds_auth')?.value === '1';
  const role = req.cookies.get('ds_role')?.value;

  if (!isAuthed) {
    const loginUrl = new URL('/login', req.url);
    loginUrl.searchParams.set('from', pathname);
    return NextResponse.redirect(loginUrl);
  }

  if (pathname.startsWith('/admin') && role !== 'admin') {
    return NextResponse.redirect(new URL('/dashboard', req.url));
  }

  return NextResponse.next();
}

export const config = {
  matcher: ['/dashboard/:path*', '/admin/:path*'],
};
