'use client'

import { useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import Link from 'next/link'
import { LoadingSpinner } from '@/components/ui/loading-spinner'

export default function ForgotPasswordPage() {
  const [email, setEmail] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [isLoading, setIsLoading] = useState(false)
  const [isSuccess, setIsSuccess] = useState(false)
  const supabase = createClient()

  const handleResetPassword = async (e: React.FormEvent) => {
    e.preventDefault()
    setError(null)
    setIsLoading(true)

    try {
      const { error: resetError } = await supabase.auth.resetPasswordForEmail(email, {
        redirectTo: `${window.location.origin}/auth/reset-password`,
      })

      if (resetError) {
        setError('Error sending reset password email. Please try again.')
        return
      }

      setIsSuccess(true)
    } catch (err) {
      setError('An unexpected error occurred. Please try again.')
    } finally {
      setIsLoading(false)
    }
  }

  if (isSuccess) {
    return (
      <div className="flex min-h-screen flex-col items-center justify-center bg-background">
        <div className="w-full max-w-md space-y-8 rounded-lg border border-border bg-card p-8 shadow-sm">
          <div className="space-y-2 text-center">
            <h1 className="text-3xl font-bold text-success">Check Your Email</h1>
            <p className="text-muted-foreground">
              We've sent you instructions to reset your password. Please check your email.
            </p>
          </div>
          <Link
            href="/auth/login"
            className="block w-full rounded-md bg-primary px-4 py-2 text-center text-primary-foreground transition-colors hover:bg-primary/90"
          >
            Return to Login
          </Link>
        </div>
      </div>
    )
  }

  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-background">
      <div className="w-full max-w-md space-y-8 rounded-lg border border-border bg-card p-8 shadow-sm transition-all duration-300 hover:shadow-md">
        <div className="space-y-2 text-center">
          <h1 className="text-3xl font-bold">Reset Password</h1>
          <p className="text-muted-foreground">
            Enter your email address and we'll send you instructions to reset your password.
          </p>
        </div>

        {error && (
          <div className="rounded-md bg-destructive/15 p-3 text-sm text-destructive animate-in fade-in slide-in-from-top-1">
            {error}
          </div>
        )}

        <form onSubmit={handleResetPassword} className="space-y-4">
          <div className="space-y-2">
            <label htmlFor="email" className="text-sm font-medium">
              Email
            </label>
            <input
              id="email"
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
              disabled={isLoading}
              className="w-full rounded-md border border-input bg-background px-3 py-2 transition-colors focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary disabled:cursor-not-allowed disabled:opacity-50"
              placeholder="you@example.com"
            />
          </div>

          <button
            type="submit"
            disabled={isLoading}
            className="group relative w-full rounded-md bg-primary px-4 py-2 text-primary-foreground transition-colors hover:bg-primary/90 disabled:cursor-not-allowed disabled:opacity-50"
          >
            {isLoading ? (
              <span className="flex items-center justify-center">
                <LoadingSpinner size="sm" className="mr-2" />
                Sending instructions...
              </span>
            ) : (
              'Send Reset Instructions'
            )}
          </button>
        </form>

        <div className="text-center text-sm">
          <Link
            href="/auth/login"
            className="text-primary transition-colors hover:text-primary/90 hover:underline"
            tabIndex={isLoading ? -1 : 0}
          >
            Back to Login
          </Link>
        </div>
      </div>
    </div>
  )
} 