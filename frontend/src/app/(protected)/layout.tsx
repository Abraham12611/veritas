'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useSession } from '@/lib/hooks/useSession';
import { LoadingSpinner } from '@/components/ui/loading-spinner';

export default function ProtectedLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const router = useRouter();
  const { loading, isAuthenticated, isVerified } = useSession();

  useEffect(() => {
    if (!loading && !isAuthenticated) {
      router.push('/auth/login');
    }
  }, [loading, isAuthenticated, router]);

  if (loading) {
    return (
      <div className="flex h-screen items-center justify-center">
        <LoadingSpinner className="h-8 w-8" />
      </div>
    );
  }

  if (!isAuthenticated) {
    return null; // Router will handle redirect
  }

  return (
    <div>
      {!isVerified && (
        <div className="bg-yellow-500/10 p-2 text-center text-sm text-yellow-600">
          Please verify your email address to access all features.
        </div>
      )}
      {children}
    </div>
  );
} 