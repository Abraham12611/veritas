import type { Metadata } from 'next';
import { Inter } from 'next/font/google';
import './globals.css';
import { Navbar } from '@/components/layout/Navbar';
import { Sidebar } from '@/components/layout/Sidebar';
import { Footer } from '@/components/layout/Footer';
import { Toaster } from 'sonner';
import { SessionProvider } from '@/providers/SessionProvider';

const inter = Inter({ subsets: ['latin'] });

export const metadata: Metadata = {
  title: 'Veritas - AI-Powered Knowledge Base',
  description: 'Unify your documentation, repositories, and support channels with AI-powered search and answers.',
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" className="dark">
      <body className={`${inter.className} bg-[#1e1e1e] text-white min-h-screen`}>
        <SessionProvider>
          <Navbar />
          <Sidebar />
          <main className="pt-14 pl-64 min-h-[calc(100vh-3.5rem)]">
            <div className="p-6">
              {children}
            </div>
          </main>
          <Footer />
          <Toaster richColors position="top-right" />
        </SessionProvider>
      </body>
    </html>
  );
}
