import { createServerClient, type CookieOptions } from '@supabase/ssr'
import { cookies } from 'next/headers'
import type { Database } from './types'

export const createServerComponentClient = () => {
  return createServerClient<Database>(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll: () => {
          return cookies()
            .getAll()
            .map(({ name, value }) => ({ name, value }))
        },
        setAll: (cookieList) => {
          cookieList.forEach((cookie) => {
            cookies().set(cookie.name, cookie.value, cookie.options)
          })
        },
      },
    }
  )
} 