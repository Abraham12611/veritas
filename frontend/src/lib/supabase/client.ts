import { createBrowserClient } from '@supabase/ssr'
import { createClientComponentClient as createSupabaseClientComponent } from '@supabase/auth-helpers-nextjs'
import type { Database } from './types'

export const createClient = () => {
  return createBrowserClient<Database>(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  )
}

export const createClientComponentClient = () => {
  return createSupabaseClientComponent<Database>()
}

export default createClient 