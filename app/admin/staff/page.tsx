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
              Gestionare Personal
            </h1>
            <p className="text-label-secondary mt-1">
              Gestionează doctori și personal medical
            </p>
          </div>
          <div className="space-x-2">
            <Button variant="ghost" onClick={() => router.push('/admin/dashboard')}>
              Înapoi
            </Button>
            <Button>
              Adaugă Doctor
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
                <p className="text-sm text-label-secondary">Urgențe • Spitalul Județean</p>
              </div>
              <Button size="sm" variant="ghost">
                Editează
              </Button>
            </div>
          </Card>

          <Card hoverable>
            <div className="flex items-center justify-between">
              <div>
                <h3 className="font-semibold">Dr. Mihai Ionescu</h3>
                <p className="text-sm text-label-secondary">Chirurgie • Spitalul Județean</p>
              </div>
              <Button size="sm" variant="ghost">
                Editează
              </Button>
            </div>
          </Card>

          <Card hoverable>
            <div className="flex items-center justify-between">
              <div>
                <h3 className="font-semibold">Dr. Elena Dumitrescu</h3>
                <p className="text-sm text-label-secondary">Pediatrie • Spitalul Municipal</p>
              </div>
              <Button size="sm" variant="ghost">
                Editează
              </Button>
            </div>
          </Card>
        </div>
      </div>
    </div>
  )
}