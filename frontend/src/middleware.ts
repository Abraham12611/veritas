import { createServerClient } from '@supabase/ssr'
import { NextResponse, type NextRequest } from 'next/server'

export async function middleware(request: NextRequest) {
  let response = NextResponse.next({
    request: {
      headers: request.headers,
    },
  })

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        get(name: string) {
          const cookie = request.cookies.get(name)
          return cookie?.value
        },
        set(name: string, value: string, options: { path?: string; maxAge?: number; domain?: string; secure?: boolean }) {
          // This method needs to set the cookie on the response
          response.cookies.set({
            name,
            value,
            ...options,
          })
        },
        remove(name: string, options: { path?: string; domain?: string }) {
          // This method needs to delete the cookie on the response
          response.cookies.delete({
            name,
            ...options,
          })
        },
      },
    }
  )

  try {
    const { data: { session } } = await supabase.auth.getSession()

    // Auth routes handling
    if (request.nextUrl.pathname.startsWith('/auth/')) {
      if (session) {
        // If user is signed in and tries to access auth pages, redirect to dashboard
        return NextResponse.redirect(new URL('/dashboard', request.url))
      }
      // Allow access to auth pages for non-authenticated users
      return response
    }

    // Protected routes handling
    if (!session && !request.nextUrl.pathname.startsWith('/auth/')) {
      // If user is not signed in and tries to access protected pages, redirect to login
      const redirectUrl = request.nextUrl.pathname
      return NextResponse.redirect(
        new URL(`/auth/login?redirect=${redirectUrl}`, request.url)
      )
    }

    return response
  } catch (error) {
    console.error('Auth error:', error)
    return NextResponse.redirect(
      new URL('/auth/login', request.url)
    )
  }
}

export const config = {
  matcher: [
    /*
     * Match all request paths except for the ones starting with:
     * - _next/static (static files)
     * - _next/image (image optimization files)
     * - favicon.ico (favicon file)
     * Feel free to modify this pattern to include more paths.
     */
    '/((?!_next/static|_next/image|favicon.ico).*)',
  ],
} 