import { createServerComponentClient } from '@/lib/supabase/client'
import { redirect } from 'next/navigation'
import AuthProvider from '@/components/auth/AuthProvider'

export default async function ProtectedLayout({
  children,
}: {
  children: React.ReactNode
}) {
  const supabase = await createServerComponentClient()
  const { data: { session } } = await supabase.auth.getSession()

  if (!session) {
    redirect('/auth/login')
  }

  return (
    <AuthProvider>
      {children}
    </AuthProvider>
  )
} 