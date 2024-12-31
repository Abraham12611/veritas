import { createBrowserClient } from '@supabase/ssr'
import { createClientComponentClient } from '@supabase/auth-helpers-nextjs'
import type { Database } from './types'
import type { SupabaseClient } from '@supabase/supabase-js'

export const createClient = () => {
  return createBrowserClient<Database>(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        get(name: string) {
          const cookie = document.cookie
            .split('; ')
            .find((row) => row.startsWith(`${name}=`))
          if (!cookie) return null
          const value = cookie.split('=')[1]
          if (!value) return null
          try {
            return decodeURIComponent(value)
          } catch {
            return value
          }
        },
        set(name: string, value: string, options: { path?: string; maxAge?: number; domain?: string; secure?: boolean }) {
          let cookie = `${name}=${encodeURIComponent(value)}`
          if (options.path) cookie += `; path=${options.path}`
          if (options.maxAge) cookie += `; max-age=${options.maxAge}`
          if (options.domain) cookie += `; domain=${options.domain}`
          if (options.secure) cookie += '; secure'
          document.cookie = cookie
        },
        remove(name: string, options: { path?: string; domain?: string }) {
          let cookie = `${name}=; max-age=0`
          if (options.path) cookie += `; path=${options.path}`
          if (options.domain) cookie += `; domain=${options.domain}`
          document.cookie = cookie
        },
      },
    }
  )
}

export const createSupabaseComponentClient = (): SupabaseClient<Database> => {
  return createClientComponentClient()
}

export default createClient 