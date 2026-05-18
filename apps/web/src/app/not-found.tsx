import Link from 'next/link'

export default function NotFound() {
  return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
      <div className="text-center">
        <p className="text-6xl font-bold text-blue-600 mb-4">404</p>
        <h1 className="text-2xl font-bold text-gray-900 mb-2">Page introuvable</h1>
        <p className="text-gray-500 mb-8">Cette page n&apos;existe pas ou a été déplacée.</p>
        <Link href="/" className="btn-primary inline-block">
          Retour au tableau de bord
        </Link>
      </div>
    </div>
  )
}
