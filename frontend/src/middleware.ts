import { createMiddlewareClient } from '@supabase/auth-helpers-nextjs'
import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'

export async function middleware(req: NextRequest) {
  const res = NextResponse.next()
  const supabase = createMiddlewareClient({ req, res })

  const {
    data: { session },
  } = await supabase.auth.getSession()

  // Auth condition
  const isAuthPage = req.nextUrl.pathname.startsWith('/auth')
  const isProtectedPage = req.nextUrl.pathname.startsWith('/(protected)') || 
                         req.nextUrl.pathname === '/dashboard' ||
                         req.nextUrl.pathname === '/instances' ||
                         req.nextUrl.pathname === '/data-sources' ||
                         req.nextUrl.pathname === '/deployments'

  // Redirect if signed in and trying to access auth pages
  if (session && isAuthPage) {
    return NextResponse.redirect(new URL('/dashboard', req.url))
  }

  // Redirect if not signed in and trying to access protected pages
  if (!session && isProtectedPage) {
    return NextResponse.redirect(new URL('/auth/sign-in', req.url))
  }

  return res
}

export const config = {
  matcher: [
    '/((?!api|_next/static|_next/image|favicon.ico).*)',
  ],
} 