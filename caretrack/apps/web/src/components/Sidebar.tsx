'use client'
import Link from 'next/link'
import { usePathname, useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase'
import {
  LayoutDashboard, Users, UserCheck, Clock, CreditCard, LogOut, CalendarDays, Home, Settings,
} from 'lucide-react'

const navItems = [
  { href: '/',             label: 'Dashboard',    icon: LayoutDashboard },
  { href: '/agents',       label: 'Agents',       icon: Users },
  { href: '/clients',      label: 'Clients',      icon: UserCheck },
  { href: '/affectations', label: 'Assignments',  icon: CalendarDays },
  { href: '/pointages',    label: 'Time Entries', icon: Clock },
  { href: '/paie',         label: 'Payroll',      icon: CreditCard },
  { href: '/settings',     label: 'Settings',     icon: Settings },
]

export default function Sidebar({ userEmail, orgName }: { userEmail: string; orgName?: string }) {
  const pathname = usePathname()
  const router = useRouter()
  const supabase = createClient()

  const initials = userEmail
    .split('@')[0]
    .split(/[._\-]/)
    .slice(0, 2)
    .map(s => s[0]?.toUpperCase() ?? '')
    .join('') || '?'

  async function handleLogout() {
    await supabase.auth.signOut()
    router.replace('/login')
  }

  return (
    <aside
      className="w-64 min-h-screen bg-white flex flex-col shrink-0"
      style={{ borderRight: '1px solid #E8E5DE' }}
    >
      {/* Brand */}
      <div className="px-6 pt-8 pb-6">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 bg-sage-600 rounded-2xl flex items-center justify-center shadow-sm shrink-0">
            <Home size={19} className="text-white" />
          </div>
          <div className="min-w-0">
            <h1 className="font-serif font-bold text-warm-900 text-[15px] leading-tight truncate">
              {orgName ?? 'My Home Support'}
            </h1>
            <p className="text-warm-400 text-[10px] mt-0.5 tracking-widest font-semibold">
              ADMIN PORTAL
            </p>
          </div>
        </div>
      </div>

      <div className="h-px bg-warm-100 mx-5 mb-5" />

      {/* Nav */}
      <nav className="flex-1 px-3 space-y-0.5" aria-label="Main navigation">
        {navItems.map(({ href, label, icon: Icon }) => {
          const isActive = href === '/' ? pathname === '/' : pathname.startsWith(href)
          return (
            <Link
              key={href}
              href={href}
              aria-current={isActive ? 'page' : undefined}
              className={`flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-medium transition-all duration-200 ${
                isActive
                  ? 'bg-sage-600 text-white shadow-sm'
                  : 'text-warm-600 hover:bg-warm-100 hover:text-warm-900'
              }`}
            >
              <Icon size={17} strokeWidth={isActive ? 2.5 : 1.8} />
              {label}
            </Link>
          )
        })}
      </nav>

      {/* User footer */}
      <div className="p-4 mt-2">
        <div className="h-px bg-warm-100 mb-4" />
        <div className="flex items-center gap-3 px-3 py-2 mb-1">
          <div className="w-9 h-9 rounded-xl bg-sage-100 flex items-center justify-center shrink-0">
            <span className="text-sage-700 text-xs font-bold tracking-wide">{initials}</span>
          </div>
          <div className="min-w-0">
            <p className="text-warm-800 text-xs font-semibold">Administrator</p>
            <p className="text-warm-400 text-[11px] truncate">{userEmail}</p>
          </div>
        </div>
        <button
          onClick={handleLogout}
          aria-label="Logout"
          className="w-full flex items-center gap-3 px-3 py-2.5 text-sm text-warm-500 hover:text-red-600 hover:bg-red-50 rounded-xl transition-all duration-200"
        >
          <LogOut size={15} />
          Logout
        </button>
      </div>
    </aside>
  )
}
