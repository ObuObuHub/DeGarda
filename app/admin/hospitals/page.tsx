'use client'

import { useRouter } from 'next/navigation'
import { Button } from '@/components/ui/Button'
import { Card } from '@/components/ui/Card'

export default function HospitalsPage() {
  const router = useRouter()

  return (
    <div className="min-h-screen bg-background-secondary p-4">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="flex justify-between items-center mb-8">
          <div>
            <h1 className="text-2xl font-bold text-label-primary">
              Hospital Management
            </h1>
            <p className="text-label-secondary mt-1">
              Configure medical facilities
            </p>
          </div>
          <div className="space-x-2">
            <Button variant="ghost" onClick={() => router.push('/admin/dashboard')}>
              Back
            </Button>
            <Button>
              Add Hospital
            </Button>
          </div>
        </div>

        {/* Hospitals Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <Card hoverable>
            <div className="space-y-4">
              <div>
                <h3 className="text-lg font-semibold">Spitalul Județean de Urgență</h3>
                <p className="text-label-secondary">Piatra-Neamț</p>
              </div>
              
              <div className="grid grid-cols-2 gap-4 text-sm">
                <div>
                  <p className="text-label-tertiary">Departments</p>
                  <p className="font-medium">8</p>
                </div>
                <div>
                  <p className="text-label-tertiary">Staff</p>
                  <p className="font-medium">45</p>
                </div>
              </div>

              <div className="flex justify-end space-x-2">
                <Button size="sm" variant="ghost">
                  View Details
                </Button>
                <Button size="sm">
                  Edit
                </Button>
              </div>
            </div>
          </Card>

          <Card hoverable>
            <div className="space-y-4">
              <div>
                <h3 className="text-lg font-semibold">Spitalul Municipal</h3>
                <p className="text-label-secondary">Roman</p>
              </div>
              
              <div className="grid grid-cols-2 gap-4 text-sm">
                <div>
                  <p className="text-label-tertiary">Departments</p>
                  <p className="font-medium">5</p>
                </div>
                <div>
                  <p className="text-label-tertiary">Staff</p>
                  <p className="font-medium">28</p>
                </div>
              </div>

              <div className="flex justify-end space-x-2">
                <Button size="sm" variant="ghost">
                  View Details
                </Button>
                <Button size="sm">
                  Edit
                </Button>
              </div>
            </div>
          </Card>
        </div>
      </div>
    </div>
  )
}