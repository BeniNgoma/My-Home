'use client'
import { useEffect, useState } from 'react'
import { createClient } from '@/lib/supabase'
import { formatDuration } from '@/lib/types'
import type { TimeEntryWithRelations } from '@/lib/types'
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts'
import { Users, Clock, AlertTriangle, TrendingUp, UserCheck, CalendarDays, Activity, MapPin } from 'lucide-react'

interface ActiveSession extends TimeEntryWithRelations { duration_live?: number }
interface DayStats { date: string; hours: number }
interface GlobalStats { totalAgents: number; totalClients: number; activeAssignments: number }

function greeting() {
  const h = new Date().getHours()
  if (h < 12) return 'Good morning'
  if (h < 18) return 'Good afternoon'
  return 'Good evening'
}

function LiveDot() {
  return (
    <span className="relative flex h-2.5 w-2.5 shrink-0">
      <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-sage-400 opacity-75" />
      <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-sage-500" />
    </span>
  )
}

export default function DashboardPage() {
  const supabase = createClient()
  const [activeSessions, setActiveSessions] = useState<ActiveSession[]>([])
  const [weekHours, setWeekHours] = useState(0)
  const [monthHours, setMonthHours] = useState(0)
  const [dayStats, setDayStats] = useState<DayStats[]>([])
  const [globalStats, setGlobalStats] = useState<GlobalStats>({ totalAgents: 0, totalClients: 0, activeAssignments: 0 })
  const [now, setNow] = useState(Date.now())

  useEffect(() => {
    const t = setInterval(() => setNow(Date.now()), 30000)
    return () => clearInterval(t)
  }, [])

  useEffect(() => {
    loadDashboard()
    const channel = supabase
      .channel('dashboard-realtime')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'time_entries' }, loadDashboard)
      .subscribe()
    return () => { supabase.removeChannel(channel) }
  }, [])

  async function loadDashboard() {
    const { data: sessions } = await supabase
      .from('time_entries')
      .select('*, agent:profiles!agent_id(id,full_name,email), client:clients!client_id(id,full_name)')
      .eq('status', 'active')
      .order('clock_in_at', { ascending: true })
    setActiveSessions((sessions || []) as ActiveSession[])

    const [{ count: agentCount }, { count: clientCount }, { count: assignCount }] = await Promise.all([
      supabase.from('profiles').select('*', { count: 'exact', head: true }).eq('role', 'agent').eq('is_active', true),
      supabase.from('clients').select('*', { count: 'exact', head: true }).eq('is_active', true),
      supabase.from('agent_client_assignments').select('*', { count: 'exact', head: true }).eq('is_active', true),
    ])
    setGlobalStats({ totalAgents: agentCount ?? 0, totalClients: clientCount ?? 0, activeAssignments: assignCount ?? 0 })

    const n = new Date()
    const startOfWeek = new Date(n); startOfWeek.setDate(n.getDate() - n.getDay()); startOfWeek.setHours(0,0,0,0)
    const startOfMonth = new Date(n.getFullYear(), n.getMonth(), 1)

    const [{ data: weekData }, { data: monthData }] = await Promise.all([
      supabase.from('time_entries').select('duration_minutes').in('status', ['completed','corrected']).not('duration_minutes','is',null).gte('clock_in_at', startOfWeek.toISOString()),
      supabase.from('time_entries').select('duration_minutes').in('status', ['completed','corrected']).not('duration_minutes','is',null).gte('clock_in_at', startOfMonth.toISOString()),
    ])
    setWeekHours((weekData || []).reduce((s: number, e: any) => s + (e.duration_minutes || 0), 0) / 60)
    setMonthHours((monthData || []).reduce((s: number, e: any) => s + (e.duration_minutes || 0), 0) / 60)

    const thirtyDaysAgo = new Date(); thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30)
    const { data: histData } = await supabase
      .from('time_entries').select('clock_in_at,duration_minutes')
      .in('status', ['completed','corrected']).not('duration_minutes','is',null)
      .gte('clock_in_at', thirtyDaysAgo.toISOString())

    const byDay: Record<string, number> = {}
    for (let i = 29; i >= 0; i--) {
      const d = new Date(); d.setDate(d.getDate() - i)
      byDay[d.toISOString().slice(0, 10)] = 0
    }
    for (const e of histData || []) {
      const day = (e as any).clock_in_at.slice(0, 10)
      if (byDay[day] !== undefined) byDay[day] += ((e as any).duration_minutes || 0) / 60
    }
    setDayStats(Object.entries(byDay).map(([date, hours]) => ({
      date: new Date(date + 'T12:00:00').toLocaleDateString('en-US', { month:'2-digit', day:'2-digit' }),
      hours: Math.round(hours * 10) / 10,
    })))
  }

  function getLiveDuration(clockInAt: string) {
    return formatDuration((Date.now() - new Date(clockInAt).getTime()) / 60000)
  }

  const alertSessions = activeSessions.filter(s => (Date.now() - new Date(s.clock_in_at).getTime()) / 3600000 > 12)
  const today = new Date().toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric', year: 'numeric' })

  return (
    <div className="p-8 space-y-7 max-w-[1400px]">

      {/* Header */}
      <div className="flex items-end justify-between">
        <div>
          <h1 className="font-serif text-3xl font-bold text-warm-900">{greeting()} 👋</h1>
          <p className="text-warm-500 text-sm mt-1.5">Here's today's care overview</p>
        </div>
        <div className="hidden md:flex items-center gap-2 text-warm-400 text-sm bg-white rounded-xl px-4 py-2.5 border border-warm-100" style={{ boxShadow: '0 1px 4px rgba(0,0,0,0.04)' }}>
          <CalendarDays size={15} className="text-sage-500" />
          {today}
        </div>
      </div>

      {/* Metric row */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {[
          { icon: Users, label: 'Total Agents', value: globalStats.totalAgents, color: 'sage', sub: 'active' },
          { icon: UserCheck, label: 'Total Clients', value: globalStats.totalClients, color: 'terra', sub: 'active' },
          { icon: CalendarDays, label: 'Assignments', value: globalStats.activeAssignments, color: 'sage', sub: 'ongoing' },
          { icon: Activity, label: 'On Duty Now', value: activeSessions.length, color: activeSessions.length > 0 ? 'sage' : 'warm', sub: 'caregivers' },
        ].map(({ icon: Icon, label, value, color, sub }) => (
          <div key={label} className="card flex items-center gap-4">
            <div className={`p-3 rounded-2xl shrink-0 ${
              color === 'sage' ? 'bg-sage-100' :
              color === 'terra' ? 'bg-terra-100' : 'bg-warm-100'
            }`}>
              <Icon size={22} className={
                color === 'sage' ? 'text-sage-600' :
                color === 'terra' ? 'text-terra-500' : 'text-warm-500'
              } />
            </div>
            <div>
              <p className="text-xs text-warm-500 font-medium">{label}</p>
              <p className="text-2xl font-bold text-warm-900 leading-tight">{value}</p>
              <p className="text-xs text-warm-400">{sub}</p>
            </div>
          </div>
        ))}
      </div>

      {/* Hours row */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="card flex items-center gap-4">
          <div className="p-3 bg-sage-100 rounded-2xl shrink-0">
            <Clock size={22} className="text-sage-600" />
          </div>
          <div>
            <p className="text-xs text-warm-500 font-medium">Hours This Week</p>
            <p className="text-2xl font-bold text-warm-900">{weekHours.toFixed(1)}h</p>
          </div>
        </div>
        <div className="card flex items-center gap-4">
          <div className="p-3 bg-terra-100 rounded-2xl shrink-0">
            <TrendingUp size={22} className="text-terra-500" />
          </div>
          <div>
            <p className="text-xs text-warm-500 font-medium">Hours This Month</p>
            <p className="text-2xl font-bold text-warm-900">{monthHours.toFixed(1)}h</p>
          </div>
        </div>
        <div className={`card flex items-center gap-4 ${alertSessions.length > 0 ? 'border-red-200 bg-red-50/60' : ''}`}>
          <div className={`p-3 rounded-2xl shrink-0 ${alertSessions.length > 0 ? 'bg-red-100' : 'bg-warm-100'}`}>
            <AlertTriangle size={22} className={alertSessions.length > 0 ? 'text-red-600' : 'text-warm-400'} />
          </div>
          <div>
            <p className="text-xs text-warm-500 font-medium">Missed Clock-out (+12h)</p>
            <p className={`text-2xl font-bold ${alertSessions.length > 0 ? 'text-red-600' : 'text-warm-900'}`}>
              {alertSessions.length}
            </p>
          </div>
        </div>
      </div>

      {/* Alerts banner */}
      {alertSessions.length > 0 && (
        <div className="bg-red-50 border border-red-200 rounded-2xl p-5">
          <h3 className="font-semibold text-red-800 mb-3 flex items-center gap-2 text-sm">
            <AlertTriangle size={16} /> Suspicious sessions — active for more than 12 hours
          </h3>
          <div className="space-y-2">
            {alertSessions.map(s => (
              <div key={s.id} className="flex justify-between items-center bg-white rounded-xl px-4 py-3 border border-red-100 text-sm">
                <span className="font-semibold text-warm-900">{(s as any).agent?.full_name}</span>
                <span className="text-warm-500 text-xs">{(s as any).client?.full_name}</span>
                <span className="text-red-600 font-bold">{getLiveDuration(s.clock_in_at)}</span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Active sessions */}
      <div className="card p-0 overflow-hidden">
        <div className="flex items-center justify-between px-6 py-5 border-b border-warm-100">
          <div className="flex items-center gap-2.5">
            {activeSessions.length > 0 && <LiveDot />}
            <h2 className="font-semibold text-warm-900">Active Sessions</h2>
          </div>
          <span className="text-xs text-warm-400 bg-warm-50 px-3 py-1 rounded-full border border-warm-200">
            {activeSessions.length} agent{activeSessions.length !== 1 ? 's' : ''} on duty
          </span>
        </div>
        {activeSessions.length === 0 ? (
          <div className="py-12 text-center">
            <Activity size={36} className="mx-auto mb-3 text-warm-300" />
            <p className="text-warm-400 text-sm">No agents currently on duty</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr>
                  <th className="table-header">Agent</th>
                  <th className="table-header">Client</th>
                  <th className="table-header">Start</th>
                  <th className="table-header">Duration</th>
                  <th className="table-header">Alerts</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-warm-100">
                {activeSessions.map(s => {
                  const diffH = (Date.now() - new Date(s.clock_in_at).getTime()) / 3600000
                  const isAlert = diffH > 12
                  return (
                    <tr key={s.id} className={isAlert ? 'bg-red-50/60' : 'hover:bg-warm-50/60'}>
                      <td className="table-cell">
                        <div className="flex items-center gap-2.5">
                          <div className="w-7 h-7 rounded-lg bg-sage-100 flex items-center justify-center shrink-0">
                            <span className="text-sage-700 text-[10px] font-bold">
                              {(s as any).agent?.full_name?.[0] ?? '?'}
                            </span>
                          </div>
                          <span className="font-semibold text-warm-900">{(s as any).agent?.full_name}</span>
                        </div>
                      </td>
                      <td className="table-cell text-warm-600">{(s as any).client?.full_name}</td>
                      <td className="table-cell text-warm-500">
                        {new Date(s.clock_in_at).toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' })}
                      </td>
                      <td className="table-cell">
                        <span className="font-bold text-sage-600">{getLiveDuration(s.clock_in_at)}</span>
                      </td>
                      <td className="table-cell">
                        <div className="flex items-center gap-2">
                          {isAlert && (
                            <span className="text-xs px-2 py-0.5 rounded-full bg-red-100 text-red-700 font-semibold">
                              +12h
                            </span>
                          )}
                          {s.gps_alert && (
                            <span className="flex items-center gap-1 text-xs px-2 py-0.5 rounded-full bg-amber-100 text-amber-700 font-semibold">
                              <MapPin size={10} /> GPS
                            </span>
                          )}
                        </div>
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Chart */}
      <div className="card">
        <div className="flex items-center justify-between mb-6">
          <h2 className="font-semibold text-warm-900">Hours Worked</h2>
          <span className="text-xs text-warm-400 bg-warm-50 px-3 py-1 rounded-full border border-warm-200">
            Last 30 days
          </span>
        </div>
        <ResponsiveContainer width="100%" height={200}>
          <BarChart data={dayStats} margin={{ left: -20, right: 8, top: 4, bottom: 0 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="#E8E5DE" vertical={false} />
            <XAxis
              dataKey="date"
              tick={{ fontSize: 10, fill: '#9B9286' }}
              interval={4}
              axisLine={false}
              tickLine={false}
            />
            <YAxis
              tick={{ fontSize: 10, fill: '#9B9286' }}
              unit="h"
              axisLine={false}
              tickLine={false}
            />
            <Tooltip
              contentStyle={{
                background: 'white',
                border: '1px solid #E8E5DE',
                borderRadius: '12px',
                boxShadow: '0 4px 16px rgba(0,0,0,0.08)',
                fontSize: 12,
              }}
              formatter={(v: number) => [`${v}h`, 'Hours']}
              cursor={{ fill: '#eef7f2' }}
            />
            <Bar dataKey="hours" fill="#2D6A4F" radius={[4, 4, 0, 0]} maxBarSize={24} />
          </BarChart>
        </ResponsiveContainer>
      </div>
    </div>
  )
}
