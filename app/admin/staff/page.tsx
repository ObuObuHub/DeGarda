'use client'

import { useRouter } from 'next/navigation'
import { Button } from '@/components/ui/Button'
import { Card } from '@/components/ui/Card'

export default function StaffPage() {
  const router = useRouter()

  return (
    <div className="min-h-screen bg-background-secondary p-4">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="flex justify-between items-center mb-8">
          <div>
            <h1 className="text-2xl font-bold text-label-primary">
              Staff Management
            </h1>
            <p className="text-label-secondary mt-1">
              Manage doctors and medical staff
            </p>
          </div>
          <div className="space-x-2">
            <Button variant="ghost" onClick={() => router.push('/admin/dashboard')}>
              Back
            </Button>
            <Button>
              Add Doctor
            </Button>
          </div>
        </div>

        {/* Staff List Placeholder */}
        <div className="grid gap-4">
          {/* Sample Staff Cards */}
          <Card hoverable>
            <div className="flex items-center justify-between">
              <div>
                <h3 className="font-semibold">Dr. Ana Popescu</h3>
                <p className="text-sm text-label-secondary">Emergency • Spitalul Județean</p>
              </div>
              <Button size="sm" variant="ghost">
                Edit
              </Button>
            </div>
          </Card>

          <Card hoverable>
            <div className="flex items-center justify-between">
              <div>
                <h3 className="font-semibold">Dr. Mihai Ionescu</h3>
                <p className="text-sm text-label-secondary">Surgery • Spitalul Județean</p>
              </div>
              <Button size="sm" variant="ghost">
                Edit
              </Button>
            </div>
          </Card>

          <Card hoverable>
            <div className="flex items-center justify-between">
              <div>
                <h3 className="font-semibold">Dr. Elena Dumitrescu</h3>
                <p className="text-sm text-label-secondary">Pediatrics • Spitalul Municipal</p>
              </div>
              <Button size="sm" variant="ghost">
                Edit
              </Button>
            </div>
          </Card>
        </div>
      </div>
    </div>
  )
}