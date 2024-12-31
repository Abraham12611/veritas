import { createBrowserClient } from '@supabase/ssr'
import { createClientComponentClient as createSupabaseClientComponent } from '@supabase/auth-helpers-nextjs'
import type { Database } from './types'

export const createClient = () => {
  return createBrowserClient<Database>(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        get(name: string) {
          return document.cookie
            .split('; ')
            .find((row) => row.startsWith(`${name}=`))
            ?.split('=')[1]
        },
        set(name: string, value: string, options: { path?: string; maxAge?: number; domain?: string; secure?: boolean }) {
          document.cookie = `${name}=${value}${options.path ? `; path=${options.path}` : ''}${
            options.maxAge ? `; max-age=${options.maxAge}` : ''
          }${options.domain ? `; domain=${options.domain}` : ''}${options.secure ? '; secure' : ''}`
        },
        remove(name: string, options: { path?: string; domain?: string }) {
          document.cookie = `${name}=; max-age=0${options.path ? `; path=${options.path}` : ''}${
            options.domain ? `; domain=${options.domain}` : ''
          }`
        },
      },
    }
  )
}

export const createClientComponentClient = () => {
  return createSupabaseClientComponent<Database>()
}

export default createClient 