'use client'

import { useEffect } from 'react'
import { useRouter } from 'next/navigation'

export default function StaffRedirectPage() {
  const router = useRouter()

  useEffect(() => {
    // Redirect authenticated staff to their schedule
    // This page exists to maintain backward compatibility with old auth flow
    router.push('/staff/schedule')
  }, [router])

  return (
    <div className="min-h-screen bg-background-secondary flex items-center justify-center">
      <div className="text-center">
        <div className="inline-block animate-spin rounded-full h-12 w-12 border-4 border-blue-500 border-t-transparent"></div>
        <p className="mt-4 text-gray-600">Loading schedule...</p>
      </div>
    </div>
  )
}