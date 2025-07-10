'use client'

import { useRouter } from 'next/navigation'
import { Button } from '@/components/ui/Button'
import { Card } from '@/components/ui/Card'

export default function SchedulePage() {
  const router = useRouter()

  return (
    <div className="min-h-screen bg-background-secondary p-4">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="flex justify-between items-center mb-8">
          <div>
            <h1 className="text-2xl font-bold text-label-primary">
              Schedule
            </h1>
            <p className="text-label-secondary mt-1">
              Manage shift schedules
            </p>
          </div>
          <Button variant="ghost" onClick={() => router.push('/admin/dashboard')}>
            Back to Dashboard
          </Button>
        </div>

        {/* Calendar Placeholder */}
        <Card className="p-8">
          <div className="text-center">
            <div className="mb-4">
              <div className="inline-flex items-center justify-center w-16 h-16 bg-system-blue/10 rounded-full mb-4">
                <svg className="w-8 h-8 text-system-blue" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                </svg>
              </div>
            </div>
            <h2 className="text-xl font-semibold mb-2">Calendar View Coming Soon</h2>
            <p className="text-label-secondary mb-6">
              The shift calendar with reservation and swap features will be available here
            </p>
            <Button onClick={() => router.push('/admin/dashboard')}>
              Return to Dashboard
            </Button>
          </div>
        </Card>
      </div>
    </div>
  )
}