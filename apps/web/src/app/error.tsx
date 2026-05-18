'use client'
import { useEffect } from 'react'

export default function Error({
  error,
  reset,
}: {
  error: Error & { digest?: string }
  reset: () => void
}) {
  useEffect(() => { console.error(error) }, [error])

  return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
      <div className="text-center">
        <p className="text-6xl font-bold text-red-500 mb-4">500</p>
        <h1 className="text-2xl font-bold text-gray-900 mb-2">Une erreur est survenue</h1>
        <p className="text-gray-500 mb-8">Quelque chose s&apos;est mal passé côté serveur.</p>
        <button onClick={reset} className="btn-primary">
          Réessayer
        </button>
      </div>
    </div>
  )
}
