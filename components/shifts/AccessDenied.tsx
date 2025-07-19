'use client'

import { Card } from '@/components/ui/Card'
import { Button } from '@/components/ui/Button'

interface AccessDeniedProps {
  isStaff: boolean
  onNavigateToDashboard: () => void
}

export function AccessDenied({ isStaff, onNavigateToDashboard }: AccessDeniedProps) {
  return (
    <div className="p-4 sm:p-6 lg:p-8">
      <div className="max-w-4xl mx-auto">
        <Card className="p-6 text-center">
          <span className="text-4xl mb-4 block">🔒</span>
          <h1 className="text-2xl font-bold text-gray-900 mb-4">Acces Restricționat</h1>
          <p className="text-gray-600 mb-6">
            {isStaff 
              ? 'Nu ai permisiunea de a genera gărzi. Contactează managerul pentru a obține această permisiune.'
              : 'Această pagină este disponibilă doar pentru manageri, administratori și personalul cu permisiuni speciale.'
            }
          </p>
          <Button onClick={onNavigateToDashboard}>
            Înapoi la Dashboard
          </Button>
        </Card>
      </div>
    </div>
  )
}