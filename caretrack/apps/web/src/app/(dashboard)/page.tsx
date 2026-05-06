'use client'
import { useEffect, useState } from 'react'
import { createClient } from '@/lib/supabase'
import { formatDuration } from '@caretrack/shared'
import type { TimeEntryWithRelations } from '@caretrack/shared'
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts'
import { Users, Clock, AlertTriangle, TrendingUp } from 'lucide-react'

interface ActiveSession extends TimeEntryWithRelations {
  duration_live?: number
}

interface DayStats { date: string; hours: number }

export default function DashboardPage() {
  const supabase = createClient()
  const [activeSessions, setActiveSessions] = useState<ActiveSession[]>([])
  const [weekHours, setWeekHours] = useState(0)
  const [monthHours, setMonthHours] = useState(0)
  const [dayStats, setDayStats] = useState<DayStats[]>([])
  const [now, setNow] = useState(Date.now())

  useEffect(() => { const t = setInterval(() => setNow(Date.now()), 30000); return () => clearInterval(t) }, [])

  useEffect(() => {
    loadDashboard()

    const channel = supabase
      .channel('time-entries-realtime')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'time_entries' }, () => {
        loadDashboard()
      })
      .subscribe()

    return () => { supabase.removeChannel(channel) }
  }, [])

  async function loadDashboard() {
    const { data: sessions } = await supabase
      .from('time_entries')
      .select('*, agent:profiles!agent_id(id, full_name, email), client:clients!client_id(id, full_name)')
      .eq('status', 'active')
      .order('clock_in_at', { ascending: true })

    setActiveSessions((sessions || []) as ActiveSession[])

    const now = new Date()
    const startOfWeek = new Date(now); startOfWeek.setDate(now.getDate() - now.getDay()); startOfWeek.setHours(0, 0, 0, 0)
    const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1)

    const { data: weekData } = await supabase
      .from('time_entries')
      .select('duration_minutes')
      .in('status', ['completed', 'corrected'])
      .not('duration_minutes', 'is', null)
      .gte('clock_in_at', startOfWeek.toISOString())
    setWeekHours((weekData || []).reduce((s: number, e: any) => s + (e.duration_minutes || 0), 0) / 60)

    const { data: monthData } = await supabase
      .from('time_entries')
      .select('duration_minutes')
      .in('status', ['completed', 'corrected'])
      .not('duration_minutes', 'is', null)
      .gte('clock_in_at', startOfMonth.toISOString())
    setMonthHours((monthData || []).reduce((s: number, e: any) => s + (e.duration_minutes || 0), 0) / 60)

    const thirtyDaysAgo = new Date(); thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30)
    const { data: histData } = await supabase
      .from('time_entries')
      .select('clock_in_at, duration_minutes')
      .in('status', ['completed', 'corrected'])
      .not('duration_minutes', 'is', null)
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
      date: new Date(date).toLocaleDateString('fr-FR', { day: '2-digit', month: '2-digit' }),
      hours: Math.round(hours * 10) / 10,
    })))
  }

  function getLiveDuration(clockInAt: string): string {
    const diffMin = (Date.now() - new Date(clockInAt).getTime()) / 60000
    return formatDuration(diffMin)
  }

  const alertSessions = activeSessions.filter(s => {
    const diffH = (Date.now() - new Date(s.clock_in_at).getTime()) / 3600000
    return diffH > 12
  })

  return (
    <div className="p-8 space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Tableau de bord</h1>
        <p className="text-gray-500 text-sm mt-1">Vue en temps réel de l'activité</p>
      </div>

      {/* Stats cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <div className="card flex items-center gap-4">
          <div className="p-3 bg-green-100 rounded-lg"><Users className="text-green-600" size={24} /></div>
          <div>
            <p className="text-sm text-gray-500">Agents actifs</p>
            <p className="text-2xl font-bold text-gray-900">{activeSessions.length}</p>
          </div>
        </div>
        <div className="card flex items-center gap-4">
          <div className="p-3 bg-blue-100 rounded-lg"><Clock className="text-blue-600" size={24} /></div>
          <div>
            <p className="text-sm text-gray-500">Heures cette semaine</p>
            <p className="text-2xl font-bold text-gray-900">{weekHours.toFixed(1)}h</p>
          </div>
        </div>
        <div className="card flex items-center gap-4">
          <div className="p-3 bg-purple-100 rounded-lg"><TrendingUp className="text-purple-600" size={24} /></div>
          <div>
            <p className="text-sm text-gray-500">Heures ce mois</p>
            <p className="text-2xl font-bold text-gray-900">{monthHours.toFixed(1)}h</p>
          </div>
        </div>
        <div className={`card flex items-center gap-4 ${alertSessions.length > 0 ? 'border-red-200 bg-red-50' : ''}`}>
          <div className={`p-3 rounded-lg ${alertSessions.length > 0 ? 'bg-red-100' : 'bg-gray-100'}`}>
            <AlertTriangle className={alertSessions.length > 0 ? 'text-red-600' : 'text-gray-400'} size={24} />
          </div>
          <div>
            <p className="text-sm text-gray-500">Oublis clock-out (+12h)</p>
            <p className={`text-2xl font-bold ${alertSessions.length > 0 ? 'text-red-600' : 'text-gray-900'}`}>
              {alertSessions.length}
            </p>
          </div>
        </div>
      </div>

      {/* Alerts */}
      {alertSessions.length > 0 && (
        <div className="bg-red-50 border border-red-200 rounded-xl p-4">
          <h3 className="font-semibold text-red-800 mb-3 flex items-center gap-2">
            <AlertTriangle size={18} /> Sessions suspectes — plus de 12h sans clock-out
          </h3>
          <div className="space-y-2">
            {alertSessions.map(s => (
              <div key={s.id} className="flex justify-between items-center bg-white rounded-lg px-4 py-2 border border-red-100">
                <span className="font-medium text-gray-900">{(s as any).agent?.full_name}</span>
                <span className="text-gray-500">→ {(s as any).client?.full_name}</span>
                <span className="text-red-600 font-semibold">{getLiveDuration(s.clock_in_at)}</span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Active sessions */}
      <div className="card">
        <h2 className="text-lg font-semibold text-gray-900 mb-4">Sessions en cours</h2>
        {activeSessions.length === 0 ? (
          <p className="text-gray-500 text-sm py-4 text-center">Aucun agent en service actuellement</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr>
                  <th className="table-header">Agent</th>
                  <th className="table-header">Client</th>
                  <th className="table-header">Heure début</th>
                  <th className="table-header">Durée</th>
                  <th className="table-header">Alerte</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {activeSessions.map(s => {
                  const diffH = (Date.now() - new Date(s.clock_in_at).getTime()) / 3600000
                  const isAlert = diffH > 12
                  return (
                    <tr key={s.id} className={isAlert ? 'bg-red-50' : 'hover:bg-gray-50'}>
                      <td className="table-cell font-medium">{(s as any).agent?.full_name}</td>
                      <td className="table-cell">{(s as any).client?.full_name}</td>
                      <td className="table-cell">
                        {new Date(s.clock_in_at).toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' })}
                      </td>
                      <td className="table-cell font-semibold text-blue-600">{getLiveDuration(s.clock_in_at)}</td>
                      <td className="table-cell">
                        {isAlert && <span className="text-red-600 text-xs font-semibold">⚠ +12h</span>}
                        {s.gps_alert && <span className="text-amber-600 text-xs font-semibold ml-2">📍 GPS</span>}
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
        <h2 className="text-lg font-semibold text-gray-900 mb-6">Heures travaillées — 30 derniers jours</h2>
        <ResponsiveContainer width="100%" height={220}>
          <BarChart data={dayStats} margin={{ left: -20 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="#F3F4F6" />
            <XAxis dataKey="date" tick={{ fontSize: 11 }} interval={4} />
            <YAxis tick={{ fontSize: 11 }} unit="h" />
            <Tooltip formatter={(v: number) => [`${v}h`, 'Heures']} />
            <Bar dataKey="hours" fill="#2563EB" radius={[4, 4, 0, 0]} />
          </BarChart>
        </ResponsiveContainer>
      </div>
    </div>
  )
}
