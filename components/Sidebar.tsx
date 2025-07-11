'use client'

import { useRouter, usePathname } from 'next/navigation'
import { Icon } from '@/components/ui/Icon'
import { HospitalSelector } from '@/components/HospitalSelector'
import { useHospital } from '@/contexts/HospitalContext'

interface NavItem {
  label: string
  href: string
  icon: string
}

const navItems: NavItem[] = [
  { label: 'Panou Principal', href: '/admin/dashboard', icon: 'dashboard' },
  { label: 'Program Gărzi', href: '/admin/schedule', icon: 'calendar' },
  { label: 'Personal', href: '/admin/staff', icon: 'users' },
  { label: 'Spitale', href: '/admin/hospitals', icon: 'hospital' },
  { label: 'Cereri Schimb', href: '/admin/swaps', icon: 'swap' },
]

export function Sidebar() {
  const router = useRouter()
  const pathname = usePathname()
  const { selectedHospital } = useHospital()

  return (
    <aside className="w-64 bg-white border-r border-separator h-full flex flex-col">
      {/* Logo Section */}
      <div className="p-6 border-b border-separator">
        <h1 className="text-2xl font-bold text-label-primary">DeGarda</h1>
        <p className="text-sm text-label-secondary mt-1">v2.0</p>
      </div>

      {/* Hospital Selector */}
      <div className="p-4 border-b border-separator">
        <label className="text-xs text-label-tertiary mb-2 block">Spital Selectat</label>
        <HospitalSelector />
        {selectedHospital && (
          <p className="text-xs text-label-tertiary mt-2">
            {selectedHospital.city} • {selectedHospital.staff} personal
          </p>
        )}
      </div>

      {/* Navigation */}
      <nav className="flex-1 p-4">
        <ul className="space-y-1">
          {navItems.map((item) => {
            const isActive = pathname === item.href
            return (
              <li key={item.href}>
                <button
                  onClick={() => router.push(item.href)}
                  className={`
                    w-full flex items-center gap-3 px-3 py-2.5 rounded-ios text-sm font-medium
                    transition-all duration-200
                    ${isActive 
                      ? 'bg-system-blue text-white' 
                      : 'text-label-primary hover:bg-system-gray-6/10'
                    }
                  `}
                >
                  <Icon name={item.icon} size="md" />
                  <span>{item.label}</span>
                </button>
              </li>
            )
          })}
        </ul>
      </nav>

      {/* Bottom Actions */}
      <div className="p-4 border-t border-separator">
        <button
          onClick={() => router.push('/')}
          className="w-full flex items-center gap-3 px-3 py-2.5 rounded-ios text-sm font-medium text-label-primary hover:bg-system-gray-6/10 transition-all duration-200"
        >
          <Icon name="logout" size="md" />
          <span>Deconectare</span>
        </button>
      </div>
    </aside>
  )
}