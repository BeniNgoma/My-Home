'use client'
import { useEffect } from 'react'

export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string }
  reset: () => void
}) {
  useEffect(() => { console.error(error) }, [error])

  return (
    <html lang="fr">
      <body style={{ margin: 0, fontFamily: 'sans-serif', background: '#F3F4F6', display: 'flex', alignItems: 'center', justifyContent: 'center', minHeight: '100vh' }}>
        <div style={{ textAlign: 'center', padding: '2rem' }}>
          <p style={{ fontSize: '4rem', fontWeight: 700, color: '#DC2626', marginBottom: '1rem' }}>500</p>
          <h1 style={{ fontSize: '1.5rem', fontWeight: 700, color: '#111827', marginBottom: '0.5rem' }}>Erreur critique</h1>
          <p style={{ color: '#6B7280', marginBottom: '2rem' }}>L&apos;application a rencontré une erreur inattendue.</p>
          <button
            onClick={reset}
            style={{ background: '#2563EB', color: '#fff', border: 'none', borderRadius: '8px', padding: '12px 24px', fontSize: '1rem', fontWeight: 600, cursor: 'pointer' }}
          >
            Réessayer
          </button>
        </div>
      </body>
    </html>
  )
}
