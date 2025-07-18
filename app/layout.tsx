import type { Metadata } from 'next'
import { Inter } from 'next/font/google'
import { DataProvider } from '@/contexts/DataContext'
import { ToastContainer } from '@/components/Toast'
import ErrorBoundary from '@/components/ErrorBoundary'
import '@/styles/globals.css'

const inter = Inter({ 
  subsets: ['latin'],
  variable: '--font-inter',
})

export const metadata: Metadata = {
  title: 'DeGarda - Medical Shift Scheduler',
  description: 'Simple and efficient medical shift scheduling',
}

export const viewport = {
  width: 'device-width',
  initialScale: 1,
  maximumScale: 1,
  themeColor: '#FFFFFF',
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="ro" className={inter.variable}>
      <body className="min-h-screen bg-background-secondary">
        <ErrorBoundary>
          <DataProvider>
            {children}
            <ToastContainer />
          </DataProvider>
        </ErrorBoundary>
      </body>
    </html>
  )
}