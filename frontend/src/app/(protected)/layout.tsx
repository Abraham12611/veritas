'use client';

import { Navbar } from '@/components/layout/Navbar'
import { Sidebar } from '@/components/layout/Sidebar'
import { Footer } from '@/components/layout/Footer'
import { Toaster } from 'sonner'

export default function ProtectedLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <>
      <Navbar />
      <Sidebar />
      <main className="pt-14 pl-64 min-h-[calc(100vh-3.5rem)]">
        <div className="p-6">
          {children}
        </div>
      </main>
      <Footer />
      <Toaster richColors position="top-right" />
    </>
  )
} 