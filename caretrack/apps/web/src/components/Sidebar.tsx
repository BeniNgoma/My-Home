'use client'
import Link from 'next/link'
import { usePathname, useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase'
import {
  LayoutDashboard, Users, UserCheck, Clock, CreditCard, LogOut
} from 'lucide-react'

const navItems = [
  { href: '/',            label: 'Dashboard',  icon: LayoutDashboard },
  { href: '/agents',      label: 'Agents',     icon: Users },
  { href: '/clients',     label: 'Clients',    icon: UserCheck },
  { href: '/pointages',   label: 'Pointages',  icon: Clock },
  { href: '/paie',        label: 'Paie',       icon: CreditCard },
]

interface SidebarProps {
  userEmail: string
}

export default function Sidebar({ userEmail }: SidebarProps) {
  const pathname = usePathname()
  const router = useRouter()
  const supabase = createClient()

  async function handleLogout() {
    await supabase.auth.signOut()
    router.replace('/login')
  }

  return (
    <aside className="w-64 min-h-screen bg-[#1e3a5f] flex flex-col">
      <div className="p-6 border-b border-blue-800">
        <div className="flex items-center gap-3">
          <span className="text-3xl">🏥</span>
          <div>
            <h1 className="text-white font-bold text-lg leading-none">CareTrack</h1>
            <p className="text-blue-300 text-xs mt-0.5">Administration</p>
          </div>
        </div>
      </div>

      <nav className="flex-1 p-4 space-y-1">
        {navItems.map(({ href, label, icon: Icon }) => {
          const isActive = href === '/' ? pathname === '/' : pathname.startsWith(href)
          return (
            <Link
              key={href}
              href={href}
              className={`flex items-center gap-3 px-4 py-3 rounded-lg text-sm font-medium transition-colors ${
                isActive
                  ? 'bg-blue-600 text-white'
                  : 'text-blue-200 hover:bg-blue-800 hover:text-white'
              }`}
            >
              <Icon size={18} />
              {label}
            </Link>
          )
        })}
      </nav>

      <div className="p-4 border-t border-blue-800">
        <div className="flex items-center gap-3 px-4 py-2 mb-2">
          <div className="w-8 h-8 rounded-full bg-blue-600 flex items-center justify-center">
            <span className="text-white text-xs font-bold">
              {userEmail[0].toUpperCase()}
            </span>
          </div>
          <p className="text-blue-200 text-xs truncate flex-1">{userEmail}</p>
        </div>
        <button
          onClick={handleLogout}
          className="w-full flex items-center gap-3 px-4 py-2 text-sm text-blue-300 hover:text-white hover:bg-blue-800 rounded-lg transition-colors"
        >
          <LogOut size={16} />
          Déconnexion
        </button>
      </div>
    </aside>
  )
}
