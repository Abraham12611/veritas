'use client'

import { useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import { useRouter } from 'next/navigation'

interface ProfileFormProps {
  profile?: {
    id: string
    full_name: string | null
    username: string | null
    avatar_url: string | null
    organization_id: string | null
    role: 'admin' | 'editor' | 'viewer' | null
  }
}

export default function ProfileForm({ profile }: ProfileFormProps) {
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

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      {error && (
        <div className="bg-red-50 dark:bg-red-900/50 p-4 rounded-md">
          <p className="text-sm text-red-500 dark:text-red-200">{error}</p>
        </div>
      )}
      
      <div className="space-y-4">
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

        <div>
          <label htmlFor="avatar_url" className="block text-sm font-medium text-gray-300">
            Avatar URL
          </label>
          <input
            type="url"
            id="avatar_url"
            name="avatar_url"
            value={formData.avatar_url}
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