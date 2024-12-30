import { useEffect, useState } from 'react'
import { createClientComponentClient } from '@/lib/supabase/client'
import type { User } from '@supabase/supabase-js'

export function useUser() {
  const [user, setUser] = useState<User | null>(null)
  const [isAdmin, setIsAdmin] = useState(false)
  const supabase = createClientComponentClient()

  useEffect(() => {
    const getUser = async () => {
      const { data: { user } } = await supabase.auth.getUser()
      setUser(user)
      // TODO: Implement proper admin check based on your requirements
      setIsAdmin(user?.email === 'admin@example.com') // Temporary admin check
    }

    getUser()
  }, [supabase])

  return { user, isAdmin }
} 