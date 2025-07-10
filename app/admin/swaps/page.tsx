'use client'

import { useRouter } from 'next/navigation'
import { Button } from '@/components/ui/Button'
import { Card } from '@/components/ui/Card'

export default function SwapsPage() {
  const router = useRouter()

  return (
    <div className="min-h-screen bg-background-secondary p-4">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="flex justify-between items-center mb-8">
          <div>
            <h1 className="text-2xl font-bold text-label-primary">
              Swap Requests
            </h1>
            <p className="text-label-secondary mt-1">
              Manage shift exchange requests
            </p>
          </div>
          <Button variant="ghost" onClick={() => router.push('/admin/dashboard')}>
            Back to Dashboard
          </Button>
        </div>

        {/* Tabs */}
        <div className="flex space-x-4 mb-6">
          <button className="pb-2 border-b-2 border-system-blue text-system-blue font-medium">
            Pending (2)
          </button>
          <button className="pb-2 border-b-2 border-transparent text-label-tertiary">
            Approved
          </button>
          <button className="pb-2 border-b-2 border-transparent text-label-tertiary">
            Rejected
          </button>
        </div>

        {/* Swap Requests */}
        <div className="space-y-4">
          <Card>
            <div className="space-y-4">
              <div className="flex justify-between items-start">
                <div>
                  <h3 className="font-semibold">Dr. Ana Popescu → Dr. Mihai Ionescu</h3>
                  <p className="text-sm text-label-secondary mt-1">
                    December 25, 2024 • Night Shift • Emergency
                  </p>
                  <p className="text-sm text-label-tertiary mt-2">
                    Reason: Family emergency
                  </p>
                </div>
                <div className="text-sm text-label-tertiary">
                  2 hours ago
                </div>
              </div>
              
              <div className="flex justify-end space-x-2">
                <Button variant="ghost" size="sm">
                  Reject
                </Button>
                <Button variant="primary" size="sm">
                  Approve
                </Button>
              </div>
            </div>
          </Card>

          <Card>
            <div className="space-y-4">
              <div className="flex justify-between items-start">
                <div>
                  <h3 className="font-semibold">Dr. Elena Dumitrescu → Any Available</h3>
                  <p className="text-sm text-label-secondary mt-1">
                    December 31, 2024 • 24h Shift • Pediatrics
                  </p>
                  <p className="text-sm text-label-tertiary mt-2">
                    Reason: Personal commitment
                  </p>
                </div>
                <div className="text-sm text-label-tertiary">
                  1 day ago
                </div>
              </div>
              
              <div className="flex justify-end space-x-2">
                <Button variant="ghost" size="sm">
                  Reject
                </Button>
                <Button variant="primary" size="sm">
                  Find Replacement
                </Button>
              </div>
            </div>
          </Card>

          {/* Empty State for other tabs */}
          <Card className="p-8">
            <div className="text-center text-label-tertiary">
              <p>No more pending swap requests</p>
            </div>
          </Card>
        </div>
      </div>
    </div>
  )
}