'use client'

import { Sidebar } from '@/components/Sidebar'
import { NotificationBell } from '@/components/NotificationBell'

export default function AdminLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <div className="min-h-screen bg-background-secondary flex">
      <Sidebar />
      <div className="flex-1 flex flex-col">
        {/* Top Bar */}
        <header className="bg-white border-b border-separator px-6 py-4 flex justify-between items-center">
          <div className="flex-1" />
          <NotificationBell userId="1" />
        </header>
        
        {/* Main Content */}
        <main className="flex-1 overflow-auto">
          {children}
        </main>
      </div>
    </div>
  )
}