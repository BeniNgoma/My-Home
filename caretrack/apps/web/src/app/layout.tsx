import type { Metadata } from 'next'
import './globals.css'

export const metadata: Metadata = {
  title: 'CareTrack — Admin',
  description: 'Tableau de bord CareTrack pour les administrateurs',
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="fr">
      <body>{children}</body>
    </html>
  )
}
