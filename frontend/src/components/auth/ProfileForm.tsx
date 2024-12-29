'use client'

import { useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import { useRouter } from 'next/navigation'
import AvatarUpload from './AvatarUpload'

interface ProfileFormProps {
  profile?: {
    id: string
    full_name: string | null
    username: string | null
    avatar_url: string | null
    organization_id: string | null
    role: 'admin' | 'editor' | 'viewer' | null
  }
  user?: {
    email: string | undefined
    email_confirmed_at?: string | null
  }
}

export default function ProfileForm({ profile, user }: ProfileFormProps) {
  const router = useRouter()
  const supabase = createClient()
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [formData, setFormData] = useState({
    full_name: profile?.full_name || '',
    username: profile?.username || '',
    avatar_url: profile?.avatar_url || ''
  })

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setFormData(prev => ({
      ...prev,
      [e.target.name]: e.target.value
    }))
  }

  const handleAvatarUpload = (url: string) => {
    setFormData(prev => ({
      ...prev,
      avatar_url: url
    }))
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    setError(null)

    try {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) throw new Error('No user found')

      const { error: updateError } = await supabase
        .from('profiles')
        .upsert({
          id: profile?.id || user.id,
          user_id: user.id,
          ...formData,
          updated_at: new Date().toISOString()
        })

      if (updateError) throw updateError

      router.refresh()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An error occurred')
    } finally {
      setLoading(false)
    }
  }

  const handleResendVerification = async () => {
    if (!user?.email) return

    try {
      const { error } = await supabase.auth.resend({
        type: 'signup',
        email: user.email
      })
      if (error) throw error
      alert('Verification email sent!')
    } catch (err) {
      alert('Error sending verification email')
    }
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-8">
      {error && (
        <div className="bg-red-50 dark:bg-red-900/50 p-4 rounded-md">
          <p className="text-sm text-red-500 dark:text-red-200">{error}</p>
        </div>
      )}

      <div className="flex flex-col items-center pb-6 border-b border-gray-700">
        <AvatarUpload
          url={formData.avatar_url}
          onUploadComplete={handleAvatarUpload}
          size={120}
        />
      </div>
      
      <div className="space-y-6">
        <div>
          <label htmlFor="email" className="block text-sm font-medium text-gray-300">
            Email
          </label>
          <div className="mt-1 flex items-center space-x-2">
            <input
              type="email"
              id="email"
              value={user?.email || ''}
              disabled
              className="block w-full rounded-md border border-gray-600 bg-gray-700 text-white shadow-sm focus:border-brand-blue focus:ring-brand-blue sm:text-sm px-3 py-2 disabled:opacity-50"
            />
            {user?.email_confirmed_at ? (
              <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-800 dark:bg-green-900/50 dark:text-green-200">
                Verified
              </span>
            ) : (
              <button
                type="button"
                onClick={handleResendVerification}
                className="text-sm text-brand-blue hover:text-blue-400"
              >
                Resend verification
              </button>
            )}
          </div>
        </div>

        <div>
          <label htmlFor="full_name" className="block text-sm font-medium text-gray-300">
            Full Name
          </label>
          <input
            type="text"
            id="full_name"
            name="full_name"
            value={formData.full_name}
            onChange={handleChange}
            className="mt-1 block w-full rounded-md border border-gray-600 bg-gray-700 text-white shadow-sm focus:border-brand-blue focus:ring-brand-blue sm:text-sm px-3 py-2"
          />
        </div>

        <div>
          <label htmlFor="username" className="block text-sm font-medium text-gray-300">
            Username
          </label>
          <input
            type="text"
            id="username"
            name="username"
            value={formData.username}
            onChange={handleChange}
            className="mt-1 block w-full rounded-md border border-gray-600 bg-gray-700 text-white shadow-sm focus:border-brand-blue focus:ring-brand-blue sm:text-sm px-3 py-2"
          />
        </div>
      </div>

      <div className="flex justify-end">
        <button
          type="submit"
          disabled={loading}
          className="inline-flex justify-center rounded-md border border-transparent bg-brand-blue px-4 py-2 text-sm font-medium text-white shadow-sm hover:bg-blue-600 focus:outline-none focus:ring-2 focus:ring-brand-blue focus:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {loading ? 'Saving...' : 'Save Changes'}
        </button>
      </div>
    </form>
  )
} 