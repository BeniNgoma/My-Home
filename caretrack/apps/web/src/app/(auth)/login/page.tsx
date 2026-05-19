'use client'
import { useFormState, useFormStatus } from 'react-dom'
import { loginAction } from './actions'
import { Home, Leaf, Shield } from 'lucide-react'
import { useSearchParams } from 'next/navigation'
import { Suspense } from 'react'

function SubmitButton() {
  const { pending } = useFormStatus()
  return (
    <button
      type="submit"
      disabled={pending}
      className="w-full btn-primary py-3.5 text-base"
      aria-label="Sign in"
    >
      {pending ? (
        <span className="flex items-center justify-center gap-2">
          <svg className="animate-spin h-4 w-4" viewBox="0 0 24 24" fill="none">
            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
          </svg>
          Signing in...
        </span>
      ) : (
        'Sign in'
      )}
    </button>
  )
}

function RegisteredBanner() {
  const params = useSearchParams()
  if (!params.get('registered')) return null
  return (
    <div className="bg-sage-50 border border-sage-200 text-sage-700 text-sm rounded-xl px-4 py-3 mb-5 flex items-center gap-2">
      <span>✓</span>
      <span>Account created! Sign in to access your dashboard.</span>
    </div>
  )
}

export default function LoginPage() {
  const [state, formAction] = useFormState(loginAction, { error: undefined })

  return (
    <div
      className="min-h-screen flex"
      style={{
        background:
          'radial-gradient(ellipse 120% 80% at 60% -10%, rgba(45,106,79,0.10) 0%, transparent 55%), #FAFAF8',
      }}
    >
      {/* Left decorative panel */}
      <div className="hidden lg:flex lg:w-[45%] bg-sage-700 flex-col justify-between p-14 relative overflow-hidden">
        {/* Subtle geometric pattern */}
        <div className="absolute inset-0 opacity-[0.07]">
          <svg width="100%" height="100%" xmlns="http://www.w3.org/2000/svg">
            <defs>
              <pattern id="grid" x="0" y="0" width="80" height="80" patternUnits="userSpaceOnUse">
                <circle cx="40" cy="40" r="30" fill="none" stroke="white" strokeWidth="1" />
                <circle cx="40" cy="40" r="15" fill="none" stroke="white" strokeWidth="0.5" />
                <circle cx="0" cy="0" r="5" fill="none" stroke="white" strokeWidth="0.5" />
                <circle cx="80" cy="0" r="5" fill="none" stroke="white" strokeWidth="0.5" />
                <circle cx="0" cy="80" r="5" fill="none" stroke="white" strokeWidth="0.5" />
                <circle cx="80" cy="80" r="5" fill="none" stroke="white" strokeWidth="0.5" />
              </pattern>
            </defs>
            <rect width="100%" height="100%" fill="url(#grid)" />
          </svg>
        </div>

        {/* Top brand */}
        <div className="relative z-10">
          <div className="flex items-center gap-3 mb-16">
            <div className="w-11 h-11 bg-white/15 rounded-2xl flex items-center justify-center backdrop-blur-sm">
              <Home size={21} className="text-white" />
            </div>
            <span className="font-serif font-bold text-white text-xl">My Home Support</span>
          </div>

          <p className="text-sage-300 text-sm font-semibold tracking-widest uppercase mb-6">
            Administrator Portal
          </p>
          <h2 className="font-serif text-[2.6rem] text-white leading-[1.15] mb-8">
            Caring for those<br />who care<br />for others.
          </h2>
          <p className="text-sage-200 text-base leading-relaxed max-w-xs">
            Built with empathy — supporting every caregiver in their daily mission, one visit at a time.
          </p>
        </div>

        {/* Bottom tagline */}
        <div className="relative z-10 flex items-center gap-4">
          <div className="h-px bg-white/20 flex-1" />
          <Leaf size={14} className="text-sage-300" />
          <span className="text-sage-300 text-xs tracking-widest">MY HOME SUPPORT</span>
          <Leaf size={14} className="text-sage-300" />
          <div className="h-px bg-white/20 flex-1" />
        </div>
      </div>

      {/* Right — form */}
      <div className="flex-1 flex items-center justify-center px-6 py-12">
        <div className="w-full max-w-[400px]">

          {/* Mobile logo */}
          <div className="flex items-center gap-3 mb-10 lg:hidden">
            <div className="w-10 h-10 bg-sage-600 rounded-2xl flex items-center justify-center shadow-sm">
              <Home size={19} className="text-white" />
            </div>
            <div>
              <h1 className="font-serif font-bold text-warm-900 text-[15px] leading-tight">My Home Support</h1>
              <p className="text-warm-400 text-[10px] tracking-widest font-semibold">ADMIN PORTAL</p>
            </div>
          </div>

          {/* Heading */}
          <div className="mb-8">
            <h2 className="font-serif text-[2rem] font-bold text-warm-900 leading-tight mb-2">
              Welcome back
            </h2>
            <p className="text-warm-500 text-sm">Sign in to your administrator account</p>
          </div>

          {/* Card */}
          <div
            className="bg-white rounded-3xl border border-warm-100 p-8"
            style={{ boxShadow: '0 4px 24px rgba(0,0,0,0.06), 0 1px 3px rgba(0,0,0,0.04)' }}
          >
            <form action={formAction} className="space-y-5" noValidate>
              <Suspense>
                <RegisteredBanner />
              </Suspense>
              {state?.error && (
                <div
                  className="bg-red-50 border border-red-200 text-red-700 rounded-xl px-4 py-3 text-sm flex items-start gap-2"
                  role="alert"
                  aria-live="polite"
                >
                  <span className="mt-0.5 text-red-400 shrink-0">⚠</span>
                  <span>{state.error}</span>
                </div>
              )}

              <div>
                <label className="label" htmlFor="email">Email address</label>
                <input
                  id="email"
                  type="email"
                  name="email"
                  className="input"
                  placeholder="admin@myhomesupport.com"
                  required
                  autoComplete="email"
                  aria-required="true"
                />
              </div>

              <div>
                <label className="label" htmlFor="password">Password</label>
                <input
                  id="password"
                  type="password"
                  name="password"
                  className="input"
                  placeholder="••••••••"
                  required
                  autoComplete="current-password"
                  aria-required="true"
                />
              </div>

              <div className="pt-1">
                <SubmitButton />
              </div>
            </form>
          </div>

          {/* Register link */}
          <p className="text-center text-sm text-warm-500 mt-6">
            New organization?{' '}
            <a href="/register" className="text-sage-600 hover:text-sage-700 font-semibold">
              Start free trial
            </a>
          </p>

          {/* Footer */}
          <div className="flex items-center justify-center gap-2 mt-6 text-warm-400 text-xs">
            <Shield size={12} />
            <span>Secure · Encrypted · HIPAA-aware</span>
          </div>
        </div>
      </div>
    </div>
  )
}
