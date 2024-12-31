'use client';

import { useState } from 'react';
import { createSupabaseComponentClient } from '@/lib/supabase/client';
import { Button } from '@/components/ui/button';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { LoadingSpinner } from '@/components/ui/loading-spinner';

export function EmailVerification() {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);
  const supabase = createSupabaseComponentClient();

  const sendVerificationEmail = async () => {
    try {
      setLoading(true);
      setError(null);
      
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('No user found');

      const { error } = await supabase.auth.resend({
        type: 'signup',
        email: user.email!,
      });

      if (error) throw error;
      
      setSuccess(true);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to send verification email');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-4">
      {!success ? (
        <>
          <Alert variant="warning">
            <AlertTitle>Email Not Verified</AlertTitle>
            <AlertDescription>
              Please verify your email address to access all features.
            </AlertDescription>
          </Alert>
          <Button
            onClick={sendVerificationEmail}
            disabled={loading}
            className="w-full"
          >
            {loading ? (
              <LoadingSpinner className="mr-2 h-4 w-4" />
            ) : null}
            {loading ? 'Sending...' : 'Resend Verification Email'}
          </Button>
        </>
      ) : (
        <Alert variant="success">
          <AlertTitle>Verification Email Sent</AlertTitle>
          <AlertDescription>
            Please check your email for the verification link.
          </AlertDescription>
        </Alert>
      )}
      
      {error && (
        <Alert variant="destructive">
          <AlertTitle>Error</AlertTitle>
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}
    </div>
  );
} 