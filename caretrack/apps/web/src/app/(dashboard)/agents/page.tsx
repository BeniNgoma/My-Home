'use client'
import { useEffect, useState, useCallback } from 'react'
import Link from 'next/link'
import { createClient } from '@/lib/supabase'
import {
  UserPlus, Search, ChevronDown, ChevronUp, Clock, Users, CalendarDays, TrendingUp,
} from 'lucide-react'

const DAY_ORDER = ['monday','tuesday','wednesday','thursday','friday','saturday','sunday']
const DAY_SHORT: Record<string,string> = {
  monday:'Mon', tuesday:'Tue', wednesday:'Wed', thursday:'Thu',
  friday:'Fri', saturday:'Sat', sunday:'Sun',
}
const DAY_FULL: Record<string,string> = {
  monday:'Monday', tuesday:'Tuesday', wednesday:'Wednesday', thursday:'Thursday',
  friday:'Friday', saturday:'Saturday', sunday:'Sunday',
}

interface Schedule { day_of_week: string; start_time: string; end_time: string }

interface ClientDetail {
  clientId: string
  clientName: string
  weeklyHours: number
  schedules: Schedule[]
}

interface AgentWithStats {
  id: string
  full_name: string
  email: string
  phone: string | null
  hourly_rate: number
  is_active: boolean
  clientCount: number
  clientNames: string[]
  weeklyHours: number
  biWeeklyHours: number
  monthlyHours: number
  clientDetails: ClientDetail[]
}

function calcHours(schedules: Schedule[]): number {
  return schedules.reduce((sum, s) => {
    const [sh, sm] = s.start_time.split(':').map(Number)
    const [eh, em] = s.end_time.split(':').map(Number)
    return sum + (eh * 60 + em - sh * 60 - sm) / 60
  }, 0)
}

function fmt(h: number) { return `${h % 1 === 0 ? h : h.toFixed(1)}h` }

export default function AgentsPage() {
  const supabase = createClient()
  const [agents, setAgents] = useState<AgentWithStats[]>([])
  const [search, setSearch] = useState('')
  const [showForm, setShowForm] = useState(false)
  const [loading, setLoading] = useState(true)
  const [expanded, setExpanded] = useState<Set<string>>(new Set())
  const [form, setForm] = useState({ full_name: '', email: '', phone: '', hourly_rate: '15', password: '' })
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')

  const loadAgents = useCallback(async () => {
    setLoading(true)
    const { data } = await supabase
      .from('profiles')
      .select(`
        id, full_name, email, phone, hourly_rate, is_active,
        raw_assignments:agent_client_assignments!agent_id(
          id, is_active,
          client:clients!client_id(id, full_name),
          schedules:assignment_schedules(day_of_week, start_time, end_time)
        )
      `)
      .eq('role', 'agent')
      .order('full_name')

    const processed: AgentWithStats[] = (data || []).map((a: any) => {
      const active = (a.raw_assignments || []).filter((x: any) => x.is_active)
      const clientDetails: ClientDetail[] = active.map((assign: any) => {
        const wh = calcHours(assign.schedules || [])
        return {
          clientId: assign.client?.id ?? '',
          clientName: assign.client?.full_name ?? '—',
          weeklyHours: wh,
          schedules: (assign.schedules || []).sort(
            (x: Schedule, y: Schedule) => DAY_ORDER.indexOf(x.day_of_week) - DAY_ORDER.indexOf(y.day_of_week)
          ),
        }
      })
      const weeklyHours = clientDetails.reduce((s, c) => s + c.weeklyHours, 0)
      return {
        id: a.id,
        full_name: a.full_name,
        email: a.email,
        phone: a.phone,
        hourly_rate: a.hourly_rate,
        is_active: a.is_active,
        clientCount: clientDetails.length,
        clientNames: clientDetails.map(c => c.clientName),
        weeklyHours,
        biWeeklyHours: weeklyHours * 2,
        monthlyHours: weeklyHours * 52 / 12,
        clientDetails,
      }
    })
    setAgents(processed)
    setLoading(false)
  }, [])

  useEffect(() => {
    loadAgents()

    const channel = supabase
      .channel('agents-stats-realtime')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'agent_client_assignments' }, loadAgents)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'assignment_schedules' }, loadAgents)
      .subscribe()

    return () => { supabase.removeChannel(channel) }
  }, [loadAgents])

  async function handleCreate(e: React.FormEvent) {
    e.preventDefault()
    setError('')
    setSaving(true)
    try {
      const res = await fetch('/api/create-agent', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(form),
      })
      const json = await res.json()
      if (!res.ok) throw new Error(json.error || 'Error')
      setShowForm(false)
      setForm({ full_name: '', email: '', phone: '', hourly_rate: '15', password: '' })
      await loadAgents()
    } catch (err: any) {
      setError(err.message)
    } finally {
      setSaving(false)
    }
  }

  function toggleExpand(id: string) {
    setExpanded(prev => {
      const next = new Set(prev)
      next.has(id) ? next.delete(id) : next.add(id)
      return next
    })
  }

  const filtered = agents.filter(a =>
    a.full_name.toLowerCase().includes(search.toLowerCase()) ||
    a.email.toLowerCase().includes(search.toLowerCase()) ||
    a.clientNames.some(c => c.toLowerCase().includes(search.toLowerCase()))
  )

  const totalWeekly = agents.reduce((s, a) => s + a.weeklyHours, 0)
  const totalClients = new Set(agents.flatMap(a => a.clientDetails.map(c => c.clientId))).size

  return (
    <div className="p-8 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="font-serif text-2xl font-bold text-warm-900">Agents</h1>
          <p className="text-warm-500 text-sm mt-1">
            {agents.length} agent{agents.length !== 1 ? 's' : ''} · {totalClients} client{totalClients !== 1 ? 's' : ''} assigned · {fmt(totalWeekly)} / week total
          </p>
        </div>
        <button onClick={() => setShowForm(true)} className="btn-primary flex items-center gap-2">
          <UserPlus size={18} /> New Agent
        </button>
      </div>

      {/* Global stat cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <div className="card flex items-center gap-3 py-4">
          <div className="p-2.5 bg-sage-100 rounded-xl"><Users size={20} className="text-sage-600" /></div>
          <div>
            <p className="text-xs text-warm-500">Total Agents</p>
            <p className="text-xl font-bold text-warm-900">{agents.length}</p>
          </div>
        </div>
        <div className="card flex items-center gap-3 py-4">
          <div className="p-2.5 bg-terra-100 rounded-xl"><CalendarDays size={20} className="text-terra-500" /></div>
          <div>
            <p className="text-xs text-warm-500">Assigned Clients</p>
            <p className="text-xl font-bold text-warm-900">{totalClients}</p>
          </div>
        </div>
        <div className="card flex items-center gap-3 py-4">
          <div className="p-2.5 bg-sage-100 rounded-xl"><Clock size={20} className="text-sage-600" /></div>
          <div>
            <p className="text-xs text-warm-500">Hours / Week</p>
            <p className="text-xl font-bold text-warm-900">{fmt(totalWeekly)}</p>
          </div>
        </div>
        <div className="card flex items-center gap-3 py-4">
          <div className="p-2.5 bg-terra-100 rounded-xl"><TrendingUp size={20} className="text-terra-500" /></div>
          <div>
            <p className="text-xs text-warm-500">Hours / Month</p>
            <p className="text-xl font-bold text-warm-900">{fmt(Math.round(totalWeekly * 52 / 12))}</p>
          </div>
        </div>
      </div>

      {/* Search */}
      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={18} />
        <input
          className="input pl-10"
          placeholder="Search agents or clients..."
          value={search}
          onChange={e => setSearch(e.target.value)}
        />
      </div>

      {/* Create agent modal */}
      {showForm && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl p-8 w-full max-w-md">
            <h2 className="text-xl font-bold text-gray-900 mb-6">New Agent</h2>
            <form onSubmit={handleCreate} className="space-y-4">
              {error && <p className="text-sm text-red-600 bg-red-50 px-4 py-3 rounded-lg">{error}</p>}
              <div>
                <label className="label">Full Name</label>
                <input className="input" value={form.full_name} onChange={e => setForm({ ...form, full_name: e.target.value })} required />
              </div>
              <div>
                <label className="label">Email</label>
                <input type="email" className="input" value={form.email} onChange={e => setForm({ ...form, email: e.target.value })} required />
              </div>
              <div>
                <label className="label">Phone</label>
                <input className="input" value={form.phone} onChange={e => setForm({ ...form, phone: e.target.value })} />
              </div>
              <div>
                <label className="label">Hourly Rate ($/h)</label>
                <input type="number" step="0.01" min="0" className="input" value={form.hourly_rate} onChange={e => setForm({ ...form, hourly_rate: e.target.value })} required />
              </div>
              <div>
                <label className="label">Temporary Password</label>
                <input type="password" className="input" value={form.password} onChange={e => setForm({ ...form, password: e.target.value })} required minLength={6} />
              </div>
              <div className="flex gap-3 pt-2">
                <button type="button" className="btn-secondary flex-1" onClick={() => setShowForm(false)}>Cancel</button>
                <button type="submit" className="btn-primary flex-1" disabled={saving}>
                  {saving ? 'Creating...' : 'Create'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Agents table */}
      {loading ? (
        <div className="py-12 text-center text-gray-400">Loading...</div>
      ) : (
        <div className="space-y-3">
          {/* Table header */}
          <div className="hidden md:grid grid-cols-12 px-4 py-2 text-xs font-semibold text-gray-400 uppercase tracking-wide">
            <div className="col-span-3">Agent</div>
            <div className="col-span-1 text-center">Clients</div>
            <div className="col-span-3">Client Names</div>
            <div className="col-span-1 text-center">/ wk</div>
            <div className="col-span-1 text-center">/ 2wk</div>
            <div className="col-span-1 text-center">/ mo</div>
            <div className="col-span-2"></div>
          </div>

          {filtered.map(agent => {
            const isOpen = expanded.has(agent.id)
            return (
              <div key={agent.id} className={`card p-0 overflow-hidden border ${agent.is_active ? 'border-gray-100' : 'border-gray-100 opacity-60'}`}>
                {/* Main row */}
                <div className="grid grid-cols-12 items-center px-5 py-4 gap-2">
                  {/* Agent name + status */}
                  <div className="col-span-12 md:col-span-3 flex items-center gap-3">
                    <div className="w-9 h-9 rounded-full bg-blue-100 flex items-center justify-center shrink-0">
                      <span className="text-sage-600 font-bold text-sm">{agent.full_name?.[0] ?? '?'}</span>
                    </div>
                    <div className="min-w-0">
                      <p className="font-semibold text-gray-900 truncate">{agent.full_name}</p>
                      <p className="text-xs text-gray-400 truncate">{agent.email}</p>
                    </div>
                  </div>

                  {/* Client count */}
                  <div className="col-span-2 md:col-span-1 flex justify-center">
                    <span className={`w-7 h-7 rounded-full flex items-center justify-center text-sm font-bold ${
                      agent.clientCount > 0 ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-400'
                    }`}>
                      {agent.clientCount}
                    </span>
                  </div>

                  {/* Client names */}
                  <div className="col-span-10 md:col-span-3 flex flex-wrap gap-1">
                    {agent.clientNames.length === 0 ? (
                      <span className="text-xs text-gray-300">No clients</span>
                    ) : (
                      agent.clientNames.map(name => (
                        <span key={name} className="text-xs bg-gray-100 text-gray-600 px-2 py-0.5 rounded-full">
                          {name}
                        </span>
                      ))
                    )}
                  </div>

                  {/* Hours */}
                  <div className="col-span-4 md:col-span-1 text-center">
                    <p className="text-sm font-bold text-sage-600">{fmt(agent.weeklyHours)}</p>
                    <p className="text-xs text-gray-400 md:hidden">/ wk</p>
                  </div>
                  <div className="col-span-4 md:col-span-1 text-center">
                    <p className="text-sm font-semibold text-sage-700">{fmt(agent.biWeeklyHours)}</p>
                    <p className="text-xs text-gray-400 md:hidden">/ 2wk</p>
                  </div>
                  <div className="col-span-4 md:col-span-1 text-center">
                    <p className="text-sm font-semibold text-terra-500">{fmt(Math.round(agent.monthlyHours * 10) / 10)}</p>
                    <p className="text-xs text-gray-400 md:hidden">/ mo</p>
                  </div>

                  {/* Actions */}
                  <div className="col-span-12 md:col-span-2 flex items-center justify-end gap-2">
                    {agent.clientCount > 0 && (
                      <button
                        onClick={() => toggleExpand(agent.id)}
                        className="flex items-center gap-1 text-xs text-gray-500 hover:text-sage-600 px-2 py-1 rounded-lg hover:bg-blue-50 transition-colors"
                      >
                        {isOpen ? <><ChevronUp size={14} /> Collapse</> : <><ChevronDown size={14} /> Details</>}
                      </button>
                    )}
                    <Link
                      href={`/agents/${agent.id}`}
                      className="text-xs text-sage-600 hover:text-blue-800 font-medium px-2 py-1 rounded-lg hover:bg-blue-50 transition-colors"
                    >
                      Profile →
                    </Link>
                  </div>
                </div>

                {/* Expandable client breakdown */}
                {isOpen && agent.clientDetails.length > 0 && (
                  <div className="border-t border-gray-100 bg-gray-50 px-5 py-4">
                    <p className="text-xs font-semibold text-gray-400 uppercase tracking-wide mb-3">
                      Assignment Details
                    </p>
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                      {agent.clientDetails.map(cd => (
                        <div key={cd.clientId} className="bg-white rounded-xl border border-gray-100 p-4">
                          <div className="flex items-center justify-between mb-3">
                            <div className="flex items-center gap-2">
                              <div className="w-7 h-7 rounded-full bg-green-100 flex items-center justify-center">
                                <span className="text-green-700 font-bold text-xs">{cd.clientName?.[0] ?? '?'}</span>
                              </div>
                              <p className="font-semibold text-gray-800 text-sm">{cd.clientName}</p>
                            </div>
                            <span className="text-sm font-bold text-sage-600">{fmt(cd.weeklyHours)}<span className="text-xs font-normal text-gray-400">/wk</span></span>
                          </div>

                          {/* Day-by-day */}
                          <div className="space-y-1.5">
                            {cd.schedules.map(s => {
                              const [sh, sm] = s.start_time.split(':').map(Number)
                              const [eh, em] = s.end_time.split(':').map(Number)
                              const h = (eh * 60 + em - sh * 60 - sm) / 60
                              return (
                                <div key={s.day_of_week} className="flex items-center justify-between text-xs">
                                  <span className="w-20 text-gray-500 font-medium">{DAY_FULL[s.day_of_week]}</span>
                                  <span className="text-gray-600">{s.start_time.slice(0,5)} – {s.end_time.slice(0,5)}</span>
                                  <span className="text-blue-500 font-semibold w-10 text-right">{fmt(h)}</span>
                                </div>
                              )
                            })}
                          </div>

                          {/* Days summary chips */}
                          <div className="flex flex-wrap gap-1 mt-3">
                            {DAY_ORDER.map(d => {
                              const has = cd.schedules.some(s => s.day_of_week === d)
                              return (
                                <span key={d} className={`text-xs px-1.5 py-0.5 rounded font-medium ${
                                  has ? 'bg-sage-600 text-white' : 'bg-warm-100 text-warm-300'
                                }`}>
                                  {DAY_SHORT[d]}
                                </span>
                              )
                            })}
                          </div>
                        </div>
                      ))}
                    </div>

                    {/* Agent total summary */}
                    <div className="mt-4 flex items-center gap-6 pt-3 border-t border-gray-200">
                      <div className="flex items-center gap-2 text-sm">
                        <Clock size={14} className="text-blue-500" />
                        <span className="text-gray-500">Weekly:</span>
                        <span className="font-bold text-sage-600">{fmt(agent.weeklyHours)}</span>
                      </div>
                      <div className="flex items-center gap-2 text-sm">
                        <span className="text-gray-500">Bi-weekly:</span>
                        <span className="font-bold text-sage-700">{fmt(agent.biWeeklyHours)}</span>
                      </div>
                      <div className="flex items-center gap-2 text-sm">
                        <span className="text-gray-500">Monthly:</span>
                        <span className="font-bold text-terra-500">{fmt(Math.round(agent.monthlyHours * 10) / 10)}</span>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            )
          })}

          {filtered.length === 0 && !loading && (
            <div className="py-16 text-center text-gray-400">
              <Users size={40} className="mx-auto mb-3 opacity-30" />
              <p>No agents found</p>
            </div>
          )}
        </div>
      )}
    </div>
  )
}
