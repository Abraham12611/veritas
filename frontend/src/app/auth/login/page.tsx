'use client'

import { useEffect } from 'react'
import { useSearchParams } from 'next/navigation'
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert'
import SignInForm from '@/components/auth/SignInForm'

const errorMessages = {
  session_expired: {
    title: 'Session Expired',
    description: 'Your session has expired. Please sign in again.',
  },
  max_retries: {
    title: 'Connection Error',
    description: 'We had trouble maintaining your session. Please sign in again.',
  },
  unknown: {
    title: 'Error',
    description: 'An unexpected error occurred. Please try signing in again.',
  },
}

export default function LoginPage() {
  const searchParams = useSearchParams()
  const error = searchParams.get('error')

  return (
    <div className="container max-w-md mx-auto p-6 space-y-6">
      <div className="text-center space-y-2">
        <h1 className="text-2xl font-bold">Welcome Back</h1>
        <p className="text-muted-foreground">
          Sign in to your account to continue
        </p>
      </div>

      {error && errorMessages[error as keyof typeof errorMessages] && (
        <Alert variant="destructive">
          <AlertTitle>
            {errorMessages[error as keyof typeof errorMessages].title}
          </AlertTitle>
          <AlertDescription>
            {errorMessages[error as keyof typeof errorMessages].description}
          </AlertDescription>
        </Alert>
      )}

      <SignInForm />
    </div>
  )
} 