import type { Metadata } from 'next'
import { Inter } from 'next/font/google'
import { Toaster } from 'sonner'

const inter = Inter({ subsets: ['latin'] })

export const metadata: Metadata = {
  title: 'Sign in - Veritas',
  description: 'Sign in to your Veritas account',
}

export default function AuthLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <div className={`${inter.className} bg-[#1e1e1e] text-white min-h-screen`}>
      {children}
      <Toaster richColors position="top-right" />
    </div>
  )
} 