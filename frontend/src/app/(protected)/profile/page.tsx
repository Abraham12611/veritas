'use client';

import { useEffect, useState } from 'react';
import { createSupabaseComponentClient } from '@/lib/supabase/client';
import { EmailVerification } from '@/components/auth/EmailVerification';
import ProfileForm from '@/components/auth/ProfileForm';

export default function ProfilePage() {
  const [isVerified, setIsVerified] = useState<boolean | null>(null);
  const supabase = createSupabaseComponentClient();

  useEffect(() => {
    const checkVerification = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      setIsVerified(user?.email_confirmed_at != null);
    };

    checkVerification();
  }, [supabase.auth]);

  return (
    <div className="container max-w-2xl mx-auto p-6 space-y-8">
      <h1 className="text-2xl font-bold">Profile Settings</h1>
      
      {isVerified === false && (
        <EmailVerification />
      )}

      <ProfileForm />
    </div>
  );
} 