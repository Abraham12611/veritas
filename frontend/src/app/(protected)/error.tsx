'use client'

export default function ProtectedError({
  error,
  reset,
}: {
  error: Error
  reset: () => void
}) {
  return (
    <div className="flex items-center justify-center min-h-screen">
      <div className="flex flex-col items-center space-y-4 max-w-md text-center px-4">
        <h2 className="text-xl font-semibold text-red-500">Something went wrong!</h2>
        <p className="text-gray-400">{error.message}</p>
        <button
          onClick={reset}
          className="px-4 py-2 bg-brand-blue text-white rounded-md hover:bg-blue-600 transition-colors"
        >
          Try again
        </button>
      </div>
    </div>
  )
} 