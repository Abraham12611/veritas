'use client'

import { useEffect, useState } from 'react'
import { Session } from '@supabase/supabase-js'
import { createClient } from '@/lib/supabase/client'
import { SessionManager } from '@/lib/auth/session'

export function useSession() {
  const [session, setSession] = useState<Session | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const supabase = createClient()
    const sessionManager = SessionManager.getInstance()

    // Get initial session
    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session)
      setLoading(false)
    })

    // Listen for auth state changes
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, session) => {
      setSession(session)
      setLoading(false)
    })

    return () => {
      subscription.unsubscribe()
      sessionManager.cleanup()
    }
  }, [])

  return {
    session,
    loading,
  }
} 