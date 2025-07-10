'use client'

import { useRouter } from 'next/navigation'
import { useEffect } from 'react'

export default function Home() {
  const router = useRouter()

  useEffect(() => {
    // Temporarily redirect to admin dashboard without login
    router.push('/admin/dashboard')
  }, [router])

  return (
    <div className="min-h-screen flex items-center justify-center p-4">
      <div className="text-center">
        <h1 className="text-3xl font-bold text-label-primary mb-2">
          DeGarda
        </h1>
        <p className="text-label-secondary">
          Redirecționare către panou...
        </p>
      </div>
    </div>
  )
}