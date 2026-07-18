import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'

// Public routes that don't require auth
const PUBLIC_ROUTES = ['/login', '/register', '/reset-password']

export function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl
  // Allow public routes
  if (PUBLIC_ROUTES.some((r) => pathname.startsWith(r))) return NextResponse.next()
  // Allow Next.js internals
  if (pathname.startsWith('/_next') || pathname.startsWith('/api') || pathname === '/favicon.ico') return NextResponse.next()
  // All other routes are protected — Firebase auth is client-side so we rely on
  // the auth context redirect in each page; middleware just passes through
  return NextResponse.next()
}

export const config = {
  matcher: ['/((?!_next/static|_next/image|favicon.ico).*)'],
}
