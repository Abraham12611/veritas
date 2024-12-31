import { createBrowserClient } from '@supabase/ssr'
import type { Database } from './types'
import type { SupabaseClient } from '@supabase/supabase-js'

export const createClient = () => {
  return createBrowserClient<Database>(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookieOptions: {
        name: 'sb-auth-token',
        path: '/',
        sameSite: 'lax',
        secure: process.env.NODE_ENV === 'production',
      },
    }
  )
}

export const createSupabaseComponentClient = (): SupabaseClient<Database> => {
  return createBrowserClient<Database>(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookieOptions: {
        name: 'sb-auth-token',
        path: '/',
        sameSite: 'lax',
        secure: process.env.NODE_ENV === 'production',
      },
    }
  )
}

export default createClient 