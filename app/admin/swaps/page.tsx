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
              Cereri de Schimb
            </h1>
            <p className="text-label-secondary mt-1">
              Gestionează cererile de schimb de gărzi
            </p>
          </div>
          <Button variant="ghost" onClick={() => router.push('/admin/dashboard')}>
            Înapoi la Panou
          </Button>
        </div>

        {/* Tabs */}
        <div className="flex space-x-4 mb-6">
          <button className="pb-2 border-b-2 border-system-blue text-system-blue font-medium">
            În Așteptare (2)
          </button>
          <button className="pb-2 border-b-2 border-transparent text-label-tertiary">
            Aprobate
          </button>
          <button className="pb-2 border-b-2 border-transparent text-label-tertiary">
            Respinse
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
                    25 Decembrie 2024 • Gardă de Noapte • Urgențe
                  </p>
                  <p className="text-sm text-label-tertiary mt-2">
                    Motiv: Urgență familială
                  </p>
                </div>
                <div className="text-sm text-label-tertiary">
                  acum 2 ore
                </div>
              </div>
              
              <div className="flex justify-end space-x-2">
                <Button variant="ghost" size="sm">
                  Respinge
                </Button>
                <Button variant="primary" size="sm">
                  Aprobă
                </Button>
              </div>
            </div>
          </Card>

          <Card>
            <div className="space-y-4">
              <div className="flex justify-between items-start">
                <div>
                  <h3 className="font-semibold">Dr. Elena Dumitrescu → Oricine Disponibil</h3>
                  <p className="text-sm text-label-secondary mt-1">
                    31 Decembrie 2024 • Gardă 24h • Pediatrie
                  </p>
                  <p className="text-sm text-label-tertiary mt-2">
                    Motiv: Angajament personal
                  </p>
                </div>
                <div className="text-sm text-label-tertiary">
                  acum 1 zi
                </div>
              </div>
              
              <div className="flex justify-end space-x-2">
                <Button variant="ghost" size="sm">
                  Respinge
                </Button>
                <Button variant="primary" size="sm">
                  Găsește Înlocuitor
                </Button>
              </div>
            </div>
          </Card>

          {/* Empty State for other tabs */}
          <Card className="p-8">
            <div className="text-center text-label-tertiary">
              <p>Nu mai sunt cereri de schimb în așteptare</p>
            </div>
          </Card>
        </div>
      </div>
    </div>
  )
}