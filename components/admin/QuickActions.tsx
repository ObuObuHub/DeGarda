'use client'

import { useRouter } from 'next/navigation'
import { Card } from '@/components/ui/Card'

interface QuickAction {
  id: string
  title: string
  description: string
  icon: string
  color: string
  onClick: () => void
  roles: string[]
}

interface QuickActionsProps {
  user: any
  onRefresh?: () => void
}

export function QuickActions({ user, onRefresh }: QuickActionsProps) {
  const router = useRouter()

  const quickActions: QuickAction[] = [
    {
      id: 'schedule-management',
      title: 'Program Gărzi',
      description: 'Vizualizează și gestionează programul',
      icon: '📅',
      color: 'bg-yellow-500',
      onClick: () => router.push('/admin/schedule'),
      roles: ['admin', 'manager']
    },
    {
      id: 'staff-management',
      title: 'Gestionare Personal',
      description: 'Personal, permisiuni și configurări',
      icon: '👥',
      color: 'bg-purple-500',
      onClick: () => router.push('/admin'),
      roles: ['admin', 'manager']
    },
    {
      id: 'reservations',
      title: 'Vezi Rezervări',
      description: 'Rezervările personalului pentru gărzi',
      icon: '📝',
      color: 'bg-blue-500',
      onClick: () => onRefresh?.(), // Refresh to show latest data
      roles: ['admin', 'manager']
    }
  ]

  const filteredActions = quickActions.filter(action => 
    action.roles.includes(user?.role || '')
  )

  return (
    <Card className="p-6 mb-8">
      <h2 className="text-xl font-semibold text-gray-900 mb-6">
        Acțiuni Rapide
      </h2>
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {filteredActions.map((action) => (
          <button
            key={action.id}
            onClick={action.onClick}
            className="p-4 bg-gray-50 hover:bg-gray-100 rounded-lg transition-colors text-left"
          >
            <div className="flex items-center space-x-3">
              <div className={`w-10 h-10 ${action.color} rounded-lg flex items-center justify-center`}>
                <span className="text-white text-lg">{action.icon}</span>
              </div>
              <div>
                <h3 className="font-medium text-gray-900">{action.title}</h3>
                <p className="text-sm text-gray-600">{action.description}</p>
              </div>
            </div>
          </button>
        ))}
      </div>
    </Card>
  )
}