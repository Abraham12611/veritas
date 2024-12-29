'use client'

import { useCallback, useState } from 'react'
import Image from 'next/image'
import { createClient } from '@/lib/supabase/client'
import { useRouter } from 'next/navigation'

interface AvatarUploadProps {
  url: string | null
  onUploadComplete: (url: string) => void
  size?: number
}

export default function AvatarUpload({ 
  url, 
  onUploadComplete, 
  size = 150 
}: AvatarUploadProps) {
  const router = useRouter()
  const supabase = createClient()
  const [uploading, setUploading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const uploadAvatar = useCallback(async (event: React.ChangeEvent<HTMLInputElement>) => {
    try {
      setUploading(true)
      setError(null)

      if (!event.target.files || event.target.files.length === 0) {
        throw new Error('You must select an image to upload.')
      }

      const file = event.target.files[0]
      const fileExt = file.name.split('.').pop()
      const filePath = `${Math.random()}.${fileExt}`

      // Upload the file to Supabase Storage
      const { error: uploadError, data } = await supabase.storage
        .from('avatars')
        .upload(filePath, file)

      if (uploadError) throw uploadError

      // Get the public URL
      const { data: { publicUrl } } = supabase.storage
        .from('avatars')
        .getPublicUrl(filePath)

      onUploadComplete(publicUrl)
      router.refresh()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Error uploading avatar')
    } finally {
      setUploading(false)
    }
  }, [supabase, onUploadComplete, router])

  return (
    <div className="flex flex-col items-center space-y-4">
      <div className="relative" style={{ width: size, height: size }}>
        {url ? (
          <Image
            src={url}
            alt="Avatar"
            className="rounded-full object-cover"
            fill
            sizes={`${size}px`}
          />
        ) : (
          <div 
            className="w-full h-full rounded-full bg-gray-700 flex items-center justify-center text-gray-400"
          >
            <svg 
              className="w-1/2 h-1/2" 
              fill="none" 
              stroke="currentColor" 
              viewBox="0 0 24 24"
            >
              <path 
                strokeLinecap="round" 
                strokeLinejoin="round" 
                strokeWidth={2} 
                d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" 
              />
            </svg>
          </div>
        )}
        
        <label 
          className="absolute bottom-0 right-0 bg-brand-blue rounded-full p-2 cursor-pointer shadow-lg hover:bg-blue-600 transition-colors"
          htmlFor="avatar-upload"
        >
          <svg 
            className="w-4 h-4 text-white" 
            fill="none" 
            stroke="currentColor" 
            viewBox="0 0 24 24"
          >
            <path 
              strokeLinecap="round" 
              strokeLinejoin="round" 
              strokeWidth={2} 
              d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" 
            />
          </svg>
          <input
            type="file"
            id="avatar-upload"
            accept="image/*"
            onChange={uploadAvatar}
            disabled={uploading}
            className="hidden"
          />
        </label>
      </div>
      
      {uploading && (
        <div className="text-sm text-gray-400">Uploading...</div>
      )}
      
      {error && (
        <div className="text-sm text-red-400">{error}</div>
      )}
    </div>
  )
} 