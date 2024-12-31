import { useEffect, useState } from 'react';
import { Session } from '@supabase/supabase-js';
import { SessionManager } from '@/lib/auth/session';
import { createSupabaseComponentClient } from '@/lib/supabase/client';

export function useSession() {
  const [session, setSession] = useState<Session | null>(null);
  const [loading, setLoading] = useState(true);
  const supabase = createSupabaseComponentClient();

  useEffect(() => {
    // Initialize session manager
    const sessionManager = SessionManager.getInstance();

    // Get initial session
    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session);
      setLoading(false);
    });

    // Listen for auth changes
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      setSession(session);
      setLoading(false);
    });

    // Cleanup
    return () => {
      subscription.unsubscribe();
      sessionManager.cleanup();
    };
  }, [supabase.auth]);

  return {
    session,
    loading,
    isAuthenticated: !!session,
    isVerified: session?.user?.email_confirmed_at != null,
  };
} 