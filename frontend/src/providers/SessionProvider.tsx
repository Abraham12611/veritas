'use client'

import { createContext, useContext } from 'react'
import { Session } from '@supabase/supabase-js'
import { useSession } from '@/hooks/use-session'

interface SessionContextValue {
  session: Session | null
  loading: boolean
}

const SessionContext = createContext<SessionContextValue>({
  session: null,
  loading: true,
})

export function SessionProvider({ children }: { children: React.ReactNode }) {
  const { session, loading } = useSession()

  return (
    <SessionContext.Provider value={{ session, loading }}>
      {children}
    </SessionContext.Provider>
  )
}

export function useSessionContext() {
  const context = useContext(SessionContext)
  if (!context) {
    throw new Error('useSessionContext must be used within a SessionProvider')
  }
  return context
} 