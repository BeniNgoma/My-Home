'use client'
import { useFormState, useFormStatus } from 'react-dom'
import { loginAction } from './actions'

function SubmitButton() {
  const { pending } = useFormStatus()
  return (
    <button
      type="submit"
      disabled={pending}
      className="w-full btn-primary py-3 mt-2 disabled:opacity-60"
    >
      {pending ? 'Connexion...' : 'Se connecter'}
    </button>
  )
}

export default function LoginPage() {
  const [state, formAction] = useFormState(loginAction, { error: undefined })

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl shadow-xl w-full max-w-md p-8">
        <div className="text-center mb-8">
          <div className="text-5xl mb-3">🏥</div>
          <h1 className="text-2xl font-bold text-gray-900">CareTrack</h1>
          <p className="text-gray-500 text-sm mt-1">Portail Administrateur</p>
        </div>

        <form action={formAction} className="space-y-4">
          {state?.error && (
            <div className="bg-red-50 border border-red-200 text-red-700 rounded-lg px-4 py-3 text-sm">
              {state.error}
            </div>
          )}

          <div>
            <label className="label">Email</label>
            <input
              type="email"
              name="email"
              className="input"
              placeholder="admin@caretrack.com"
              required
              autoComplete="email"
            />
          </div>

          <div>
            <label className="label">Mot de passe</label>
            <input
              type="password"
              name="password"
              className="input"
              placeholder="••••••••"
              required
              autoComplete="current-password"
            />
          </div>

          <SubmitButton />
        </form>
      </div>
    </div>
  )
}
