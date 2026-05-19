import { createClient } from '@/lib/supabase-server'
import { Building2, Users, CalendarDays, Shield, CreditCard } from 'lucide-react'

const PLAN_LABELS: Record<string, string> = {
  trial: 'Free Trial',
  starter: 'Starter',
  pro: 'Pro',
  enterprise: 'Enterprise',
}

const PLAN_COLORS: Record<string, string> = {
  trial: 'bg-warm-100 text-warm-600',
  starter: 'bg-blue-50 text-blue-700',
  pro: 'bg-sage-50 text-sage-700',
  enterprise: 'bg-terra-50 text-terra-700',
}

export default async function SettingsPage() {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()

  const { data: profile } = await supabase
    .from('profiles')
    .select('organization_id, role, full_name, email')
    .eq('id', user!.id)
    .single()

  const { data: org } = await supabase
    .from('organizations')
    .select('*')
    .eq('id', profile?.organization_id)
    .single()

  const { count: agentCount } = await supabase
    .from('profiles')
    .select('id', { count: 'exact', head: true })
    .eq('organization_id', profile?.organization_id)
    .eq('role', 'agent')
    .eq('is_active', true)

  const trialEnds = org?.trial_ends_at ? new Date(org.trial_ends_at) : null
  const daysLeft = trialEnds
    ? Math.max(0, Math.ceil((trialEnds.getTime() - Date.now()) / 86400000))
    : null

  return (
    <div className="p-8 max-w-3xl">
      {/* Header */}
      <div className="mb-8">
        <h1 className="font-serif text-3xl font-bold text-warm-900 mb-1">Settings</h1>
        <p className="text-warm-500 text-sm">Manage your organization and subscription</p>
      </div>

      {/* Organization card */}
      <div className="card mb-6">
        <div className="flex items-start justify-between mb-6">
          <div className="flex items-center gap-4">
            <div className="w-12 h-12 bg-sage-100 rounded-2xl flex items-center justify-center">
              <Building2 size={22} className="text-sage-600" />
            </div>
            <div>
              <h2 className="font-semibold text-warm-900 text-lg">{org?.name}</h2>
              <p className="text-warm-400 text-sm">/{org?.slug}</p>
            </div>
          </div>
          <span className={`px-3 py-1 rounded-full text-xs font-bold ${PLAN_COLORS[org?.plan ?? 'trial']}`}>
            {PLAN_LABELS[org?.plan ?? 'trial']}
          </span>
        </div>

        <div className="grid grid-cols-3 gap-4">
          <div className="bg-warm-50 rounded-xl p-4">
            <div className="flex items-center gap-2 mb-1">
              <Users size={14} className="text-warm-400" />
              <span className="text-xs text-warm-500 font-medium">Active agents</span>
            </div>
            <p className="font-bold text-warm-900 text-xl">
              {agentCount ?? 0}
              <span className="text-warm-400 font-normal text-sm"> / {org?.max_agents}</span>
            </p>
          </div>

          <div className="bg-warm-50 rounded-xl p-4">
            <div className="flex items-center gap-2 mb-1">
              <CalendarDays size={14} className="text-warm-400" />
              <span className="text-xs text-warm-500 font-medium">
                {org?.plan === 'trial' ? 'Trial days left' : 'Renewal'}
              </span>
            </div>
            <p className="font-bold text-warm-900 text-xl">
              {org?.plan === 'trial'
                ? (daysLeft !== null ? `${daysLeft}d` : '—')
                : (trialEnds ? trialEnds.toLocaleDateString('en-US', { month: 'short', day: 'numeric' }) : '—')}
            </p>
          </div>

          <div className="bg-warm-50 rounded-xl p-4">
            <div className="flex items-center gap-2 mb-1">
              <Shield size={14} className="text-warm-400" />
              <span className="text-xs text-warm-500 font-medium">Your role</span>
            </div>
            <p className="font-bold text-warm-900 text-xl capitalize">{profile?.role}</p>
          </div>
        </div>
      </div>

      {/* Plan upgrade card */}
      {org?.plan === 'trial' && (
        <div className="card border-sage-200 bg-gradient-to-br from-sage-50 to-white mb-6">
          <div className="flex items-start gap-4">
            <div className="w-10 h-10 bg-sage-600 rounded-xl flex items-center justify-center shrink-0">
              <CreditCard size={18} className="text-white" />
            </div>
            <div className="flex-1">
              <h3 className="font-semibold text-warm-900 mb-1">Upgrade to keep your data</h3>
              <p className="text-warm-500 text-sm mb-4">
                Your trial ends in {daysLeft} days. Upgrade to a paid plan to continue managing your team.
              </p>
              <div className="grid grid-cols-3 gap-3">
                {[
                  { name: 'Starter', price: '$49', agents: 'Up to 10 agents', color: 'border-warm-200' },
                  { name: 'Pro', price: '$99', agents: 'Up to 30 agents', color: 'border-sage-400 ring-1 ring-sage-400' },
                  { name: 'Enterprise', price: 'Custom', agents: 'Unlimited agents', color: 'border-warm-200' },
                ].map(plan => (
                  <div key={plan.name} className={`border rounded-xl p-4 bg-white ${plan.color}`}>
                    <p className="font-bold text-warm-900">{plan.name}</p>
                    <p className="text-sage-600 font-semibold text-lg">{plan.price}<span className="text-warm-400 text-xs font-normal">/mo</span></p>
                    <p className="text-warm-500 text-xs mt-1">{plan.agents}</p>
                    <button className="mt-3 w-full text-xs font-semibold bg-sage-600 hover:bg-sage-700 text-white rounded-lg py-1.5 transition-colors">
                      Choose {plan.name}
                    </button>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Account info */}
      <div className="card">
        <h3 className="font-semibold text-warm-900 mb-4">Account</h3>
        <div className="space-y-3">
          <div className="flex items-center justify-between py-3 border-b border-warm-100">
            <span className="text-warm-500 text-sm">Name</span>
            <span className="text-warm-900 text-sm font-medium">{profile?.full_name}</span>
          </div>
          <div className="flex items-center justify-between py-3">
            <span className="text-warm-500 text-sm">Email</span>
            <span className="text-warm-900 text-sm font-medium">{profile?.email}</span>
          </div>
        </div>
      </div>
    </div>
  )
}
