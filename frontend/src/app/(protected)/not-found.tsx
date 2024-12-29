import Link from 'next/link'

export default function ProtectedNotFound() {
  return (
    <div className="flex items-center justify-center min-h-screen">
      <div className="flex flex-col items-center space-y-4 max-w-md text-center px-4">
        <h2 className="text-2xl font-semibold">Page Not Found</h2>
        <p className="text-gray-400">
          The page you're looking for doesn't exist or has been moved.
        </p>
        <Link
          href="/dashboard"
          className="px-4 py-2 bg-brand-blue text-white rounded-md hover:bg-blue-600 transition-colors"
        >
          Return to Dashboard
        </Link>
      </div>
    </div>
  )
} 