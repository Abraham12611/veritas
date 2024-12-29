import { createServerComponentClient } from '@/lib/supabase/client'
import { NextResponse } from 'next/server'

export async function POST(req: Request) {
  const supabase = await createServerComponentClient()

  // Check if user is logged in
  const { data: { session } } = await supabase.auth.getSession()

  if (session) {
    await supabase.auth.signOut()
  }

  return NextResponse.redirect(new URL('/auth/login', req.url), {
    status: 302,
  })
} 