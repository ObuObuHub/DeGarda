import type { Metadata } from 'next'
import './globals.css'

export const metadata: Metadata = {
  title: 'Degarda - Programare Ture Spital',
  description: 'Aplicație simplă pentru programarea turelor în spital',
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="ro">
      <body className="bg-gray-50 min-h-screen">
        {children}
      </body>
    </html>
  )
}