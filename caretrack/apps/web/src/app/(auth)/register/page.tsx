'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'

export default function RegisterPage() {
  const router = useRouter()
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [form, setForm] = useState({
    company_name: '',
    admin_full_name: '',
    admin_email: '',
    admin_password: '',
    confirm_password: '',
  })

  const set = (k: string) => (e: React.ChangeEvent<HTMLInputElement>) =>
    setForm(f => ({ ...f, [k]: e.target.value }))

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setError('')

    if (form.admin_password !== form.confirm_password) {
      setError('Passwords do not match')
      return
    }
    if (form.admin_password.length < 8) {
      setError('Password must be at least 8 characters')
      return
    }

    setLoading(true)
    try {
      const res = await fetch('/api/register-organization', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          company_name: form.company_name,
          admin_full_name: form.admin_full_name,
          admin_email: form.admin_email,
          admin_password: form.admin_password,
          plan: 'trial',
        }),
      })
      const data = await res.json()
      if (!res.ok) {
        setError(data.error || 'Registration failed')
        return
      }
      router.push('/login?registered=1')
    } catch {
      setError('Network error. Please try again.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen bg-warm-50 flex">
      {/* Left panel */}
      <div className="hidden lg:flex lg:w-1/2 bg-sage-600 flex-col justify-between p-12 relative overflow-hidden">
        <div className="absolute inset-0 opacity-10">
          <svg width="100%" height="100%" xmlns="http://www.w3.org/2000/svg">
            <defs>
              <pattern id="reg-grid" width="60" height="60" patternUnits="userSpaceOnUse">
                <circle cx="30" cy="30" r="1.5" fill="white" />
              </pattern>
            </defs>
            <rect width="100%" height="100%" fill="url(#reg-grid)" />
          </svg>
        </div>
        <div className="relative">
          <div className="w-10 h-10 bg-white/20 rounded-2xl flex items-center justify-center mb-8">
            <svg className="w-5 h-5 text-white" fill="currentColor" viewBox="0 0 20 20">
              <path d="M10.394 2.08a1 1 0 00-.788 0l-7 3a1 1 0 000 1.84L5.25 8.051a.999.999 0 01.356-.257l4-1.714a1 1 0 11.788 1.838l-2.727 1.17 1.94.831a1 1 0 00.787 0l7-3a1 1 0 000-1.838l-7-3z" />
              <path d="M3.31 9.397L5 10.12v4.102a8.969 8.969 0 00-1.05-.174 1 1 0 01-.89-.89 11.115 11.115 0 01.25-3.762z" />
              <path d="M9.3 16.573A9.026 9.026 0 007 14.935v-3.957l1.818.78a3 3 0 002.364 0l5.508-2.361a11.026 11.026 0 01.25 3.762 1 1 0 01-.89.89 8.968 8.968 0 00-5.35 2.524 1 1 0 01-1.4 0zM6 18a1 1 0 001-1v-2.065a8.935 8.935 0 00-2-.712V17a1 1 0 001 1z" />
            </svg>
          </div>
          <h1 className="font-serif text-3xl font-bold text-white mb-4 leading-tight">
            Start your free<br />30-day trial
          </h1>
          <p className="text-sage-100 text-lg leading-relaxed">
            Set up your organization in minutes. No credit card required.
          </p>
        </div>
        <div className="relative space-y-4">
          {[
            { icon: '✓', text: 'Unlimited agents during trial' },
            { icon: '✓', text: 'GPS-verified clock-in & clock-out' },
            { icon: '✓', text: 'Automated payroll reports' },
            { icon: '✓', text: 'Cancel anytime' },
          ].map((item) => (
            <div key={item.text} className="flex items-center gap-3">
              <span className="w-5 h-5 bg-white/20 rounded-full flex items-center justify-center text-white text-xs font-bold">
                {item.icon}
              </span>
              <span className="text-sage-100">{item.text}</span>
            </div>
          ))}
        </div>
      </div>

      {/* Right panel */}
      <div className="flex-1 flex items-center justify-center p-8">
        <div className="w-full max-w-md">
          <div className="mb-8">
            <h2 className="font-serif text-2xl font-bold text-warm-900 mb-1">Create your account</h2>
            <p className="text-warm-500 text-sm">
              Already have an account?{' '}
              <Link href="/login" className="text-sage-600 hover:text-sage-700 font-medium">
                Sign in
              </Link>
            </p>
          </div>

          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block text-sm font-semibold text-warm-700 mb-1.5">
                Company name
              </label>
              <input
                type="text"
                value={form.company_name}
                onChange={set('company_name')}
                className="input"
                placeholder="My Home Support Inc."
                required
              />
            </div>

            <div>
              <label className="block text-sm font-semibold text-warm-700 mb-1.5">
                Your full name
              </label>
              <input
                type="text"
                value={form.admin_full_name}
                onChange={set('admin_full_name')}
                className="input"
                placeholder="Jane Doe"
                required
              />
            </div>

            <div>
              <label className="block text-sm font-semibold text-warm-700 mb-1.5">
                Work email
              </label>
              <input
                type="email"
                value={form.admin_email}
                onChange={set('admin_email')}
                className="input"
                placeholder="jane@company.com"
                required
              />
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-sm font-semibold text-warm-700 mb-1.5">
                  Password
                </label>
                <input
                  type="password"
                  value={form.admin_password}
                  onChange={set('admin_password')}
                  className="input"
                  placeholder="Min. 8 characters"
                  required
                />
              </div>
              <div>
                <label className="block text-sm font-semibold text-warm-700 mb-1.5">
                  Confirm
                </label>
                <input
                  type="password"
                  value={form.confirm_password}
                  onChange={set('confirm_password')}
                  className="input"
                  placeholder="Repeat password"
                  required
                />
              </div>
            </div>

            {error && (
              <div className="bg-red-50 border border-red-200 text-red-700 text-sm rounded-xl px-4 py-3">
                {error}
              </div>
            )}

            <button
              type="submit"
              disabled={loading}
              className="btn-primary w-full mt-2 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {loading ? 'Creating account…' : 'Start free trial'}
            </button>

            <p className="text-center text-xs text-warm-400 mt-4">
              By signing up you agree to our Terms of Service and Privacy Policy.
            </p>
          </form>
        </div>
      </div>
    </div>
  )
}
