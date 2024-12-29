import { createServerComponentClient } from '@/lib/supabase/client'
import ProfileForm from '@/components/auth/ProfileForm'

export default async function ProfilePage() {
  const supabase = await createServerComponentClient()
  const { data: { user } } = await supabase.auth.getUser()
  
  const { data: profile } = await supabase
    .from('profiles')
    .select('*')
    .eq('user_id', user?.id)
    .single()

  return (
    <div className="max-w-2xl mx-auto py-8 px-4">
      <div className="space-y-8">
        <div>
          <h2 className="text-2xl font-bold">Profile Settings</h2>
          <p className="text-gray-400 mt-1">
            Update your profile information and preferences.
          </p>
        </div>

        <div className="bg-gray-800 rounded-lg p-6">
          <ProfileForm 
            profile={profile} 
            user={{
              email: user?.email,
              email_confirmed_at: user?.email_confirmed_at
            }}
          />
        </div>

        <div className="bg-gray-800 rounded-lg p-6">
          <h3 className="text-lg font-medium mb-4">Email Settings</h3>
          <p className="text-gray-400 mb-4">
            Your email: {user?.email}
          </p>
          <button
            onClick={() => supabase.auth.signOut()}
            className="text-red-400 hover:text-red-300 text-sm font-medium"
          >
            Sign Out
          </button>
        </div>
      </div>
    </div>
  )
} 