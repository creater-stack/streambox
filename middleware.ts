import { NextResponse, type NextRequest } from 'next/server';

export function middleware(req: NextRequest) {
  const token = req.cookies.get('sb_token')?.value;
  const { pathname } = req.nextUrl;
  const needsAuth = ['/upload', '/dashboard', '/admin'];
  if (needsAuth.some(p => pathname.startsWith(p)) && !token) {
    const url = new URL('/login', req.url);
    url.searchParams.set('next', pathname);
    return NextResponse.redirect(url);
  }
  return NextResponse.next();
}

export const config = {
  matcher: ['/upload/:path*', '/dashboard/:path*', '/admin/:path*']
};
