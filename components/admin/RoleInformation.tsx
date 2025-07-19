'use client'

import { Card } from '@/components/ui/Card'

interface RoleInformationProps {
  user: any
}

export function RoleInformation({ user }: RoleInformationProps) {
  if (!user) return null

  return (
    <Card className="p-6">
      <h2 className="text-xl font-semibold text-gray-900 mb-4">
        Informații {user?.role === 'admin' ? 'Administrator' : 'Manager'}
      </h2>
      <div className="space-y-4">
        {user?.role === 'admin' && (
          <div className="bg-blue-50 p-4 rounded-lg">
            <h3 className="font-medium text-blue-900 mb-2">Acces Administrator</h3>
            <ul className="text-sm text-blue-800 space-y-1">
              <li>• Gestionare completă a ambelor spitale</li>
              <li>• Creare și gestionare manageri</li>
              <li>• Configurare sistem și setări globale</li>
              <li>• Acces la toate funcționalitățile</li>
            </ul>
          </div>
        )}
        
        {user?.role === 'manager' && (
          <div className="bg-green-50 p-4 rounded-lg">
            <h3 className="font-medium text-green-900 mb-2">Acces Manager - {user?.hospitalName}</h3>
            <ul className="text-sm text-green-800 space-y-1">
              <li>• Gestionare personal spital</li>
              <li>• Acordare permisiuni generare gărzi</li>
              <li>• Gestionare parole personal</li>
              <li>• Vizualizare și aprobare schimburi</li>
            </ul>
          </div>
        )}
      </div>
    </Card>
  )
}