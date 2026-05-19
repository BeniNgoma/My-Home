'use client'
import { useEffect, useState } from 'react'
import { useParams, useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase'
import { formatDuration } from '@/lib/types'
import type { Client, Profile, TimeEntryWithRelations } from '@/lib/types'
import { ArrowLeft, MapPin, Pencil, X, Save, CalendarDays, Clock } from 'lucide-react'

const DAY_ORDER = ['monday','tuesday','wednesday','thursday','friday','saturday','sunday']
const DAY_LABELS: Record<string,string> = {
  monday:'Monday', tuesday:'Tuesday', wednesday:'Wednesday', thursday:'Thursday',
  friday:'Friday', saturday:'Saturday', sunday:'Sunday',
}

interface AssignmentWithSchedule {
  id: string
  agent_id: string
  start_date: string
  end_date: string | null
  recurrence_type: string
  agent: { full_name: string }
  schedules: { day_of_week: string; start_time: string; end_time: string }[]
}

interface AgentHoursSummary {
  agent_id: string
  agent_name: string
  total_minutes: number
  visits: number
}

export default function ClientDetailPage() {
  const { id } = useParams<{ id: string }>()
  const router = useRouter()
  const supabase = createClient()

  const [client, setClient] = useState<Client | null>(null)
  const [assignedAgents, setAssignedAgents] = useState<Profile[]>([])
  const [entries, setEntries] = useState<TimeEntryWithRelations[]>([])
  const [agentSummaries, setAgentSummaries] = useState<AgentHoursSummary[]>([])
  const [assignments, setAssignments] = useState<AssignmentWithSchedule[]>([])
  const [loading, setLoading] = useState(true)
  const [showEditForm, setShowEditForm] = useState(false)
  const [editForm, setEditForm] = useState({
    full_name: '', address: '', phone: '', email: '', notes: '',
    latitude: '', longitude: '',
  })
  const [editSaving, setEditSaving] = useState(false)
  const [togglingActive, setTogglingActive] = useState(false)

  useEffect(() => { loadAll() }, [id])

  async function loadAll() {
    setLoading(true)
    const [{ data: clientData }, { data: assignData }, { data: entriesData }, { data: assignWithSched }] = await Promise.all([
      supabase.from('clients').select('*').eq('id', id).single(),
      supabase.from('agent_client_assignments').select('agent_id, profiles(*)').eq('client_id', id).eq('is_active', true),
      supabase.from('time_entries').select('*, agent:profiles!agent_id(id, full_name, email)').eq('client_id', id).in('status', ['completed', 'corrected']).order('clock_in_at', { ascending: false }),
      supabase.from('agent_client_assignments')
        .select('id, agent_id, start_date, end_date, recurrence_type, agent:profiles!agent_id(full_name), schedules:assignment_schedules(day_of_week, start_time, end_time)')
        .eq('client_id', id)
        .eq('is_active', true),
    ])

    const c = clientData as Client
    setClient(c)
    if (c) {
      setEditForm({
        full_name: c.full_name || '',
        address: c.address || '',
        phone: c.phone || '',
        email: c.email || '',
        notes: c.notes || '',
        latitude: c.latitude != null ? String(c.latitude) : '',
        longitude: c.longitude != null ? String(c.longitude) : '',
      })
    }
    setAssignedAgents(((assignData || []) as any[]).map(a => a.profiles))

    const typed = (entriesData || []) as TimeEntryWithRelations[]
    setEntries(typed)

    const byAgent: Record<string, AgentHoursSummary> = {}
    for (const e of typed) {
      const agent = (e as any).agent
      if (!agent) continue
      if (!byAgent[agent.id]) {
        byAgent[agent.id] = { agent_id: agent.id, agent_name: agent.full_name, total_minutes: 0, visits: 0 }
      }
      byAgent[agent.id].total_minutes += e.duration_minutes || 0
      byAgent[agent.id].visits += 1
    }
    setAgentSummaries(Object.values(byAgent).sort((a, b) => b.total_minutes - a.total_minutes))
    setAssignments((assignWithSched || []) as unknown as AssignmentWithSchedule[])
    setLoading(false)
  }

  async function handleEditClient(e: React.FormEvent) {
    e.preventDefault()
    if (!editForm.full_name.trim()) return
    setEditSaving(true)
    await supabase.from('clients').update({
      full_name: editForm.full_name.trim(),
      address: editForm.address.trim() || null,
      phone: editForm.phone.trim() || null,
      email: editForm.email.trim() || null,
      notes: editForm.notes.trim() || null,
      latitude: editForm.latitude ? parseFloat(editForm.latitude) : null,
      longitude: editForm.longitude ? parseFloat(editForm.longitude) : null,
    }).eq('id', id)
    setEditSaving(false)
    setShowEditForm(false)
    await loadAll()
  }

  async function toggleActive() {
    if (!client) return
    setTogglingActive(true)
    await supabase.from('clients').update({ is_active: !client.is_active }).eq('id', id)
    setTogglingActive(false)
    await loadAll()
  }

  if (loading) return <div className="p-8 text-gray-400">Loading...</div>
  if (!client) return <div className="p-8 text-gray-400">Client not found</div>

  const totalMinutes = entries.reduce((s, e) => s + (e.duration_minutes || 0), 0)

  return (
    <div className="p-8 space-y-6">
      <button onClick={() => router.back()} className="flex items-center gap-2 text-gray-500 hover:text-gray-900 text-sm">
        <ArrowLeft size={16} /> Back to clients
      </button>

      <div className="flex items-start justify-between">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-2xl font-bold text-gray-900">{client.full_name}</h1>
            <button
              onClick={() => setShowEditForm(true)}
              className="text-gray-400 hover:text-blue-600 transition-colors"
              title="Edit"
            >
              <Pencil size={16} />
            </button>
          </div>
          <p className="text-gray-500 flex items-center gap-1 mt-1">
            <MapPin size={14} /> {client.address || 'No address on file'}
          </p>
        </div>
        <div className="flex items-center gap-3">
          <span className={`text-sm font-semibold px-3 py-1 rounded-full ${
            client.is_active ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-500'
          }`}>
            {client.is_active ? 'Active' : 'Inactive'}
          </span>
          <button
            onClick={toggleActive}
            disabled={togglingActive}
            className={client.is_active ? 'btn-danger' : 'btn-primary'}
          >
            {client.is_active ? 'Deactivate' : 'Reactivate'}
          </button>
        </div>
      </div>

      {/* Edit modal */}
      {showEditForm && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl p-8 w-full max-w-md max-h-screen overflow-y-auto">
            <div className="flex justify-between items-center mb-6">
              <h2 className="text-xl font-bold text-gray-900">Edit Client</h2>
              <button onClick={() => setShowEditForm(false)}><X size={20} className="text-gray-400" /></button>
            </div>
            <form onSubmit={handleEditClient} className="space-y-4">
              <div>
                <label className="label">Full Name *</label>
                <input className="input" value={editForm.full_name} onChange={e => setEditForm({ ...editForm, full_name: e.target.value })} required />
              </div>
              <div>
                <label className="label">Address</label>
                <input className="input" value={editForm.address} onChange={e => setEditForm({ ...editForm, address: e.target.value })} />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="label">GPS Latitude</label>
                  <input type="number" step="any" className="input" value={editForm.latitude} onChange={e => setEditForm({ ...editForm, latitude: e.target.value })} placeholder="48.8566" />
                </div>
                <div>
                  <label className="label">GPS Longitude</label>
                  <input type="number" step="any" className="input" value={editForm.longitude} onChange={e => setEditForm({ ...editForm, longitude: e.target.value })} placeholder="2.3522" />
                </div>
              </div>
              <div>
                <label className="label">Phone</label>
                <input className="input" value={editForm.phone} onChange={e => setEditForm({ ...editForm, phone: e.target.value })} />
              </div>
              <div>
                <label className="label">Email</label>
                <input type="email" className="input" value={editForm.email} onChange={e => setEditForm({ ...editForm, email: e.target.value })} />
              </div>
              <div>
                <label className="label">Notes</label>
                <textarea className="input resize-none" rows={3} value={editForm.notes} onChange={e => setEditForm({ ...editForm, notes: e.target.value })} />
              </div>
              <div className="flex gap-3 pt-2">
                <button type="button" className="btn-secondary flex-1" onClick={() => setShowEditForm(false)}>Cancel</button>
                <button type="submit" className="btn-primary flex-1 flex items-center justify-center gap-1" disabled={editSaving}>
                  <Save size={15} /> {editSaving ? 'Saving...' : 'Save'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Info cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="card">
          <p className="text-xs text-gray-400 mb-1">Phone</p>
          <p className="font-semibold">{client.phone || '—'}</p>
        </div>
        <div className="card">
          <p className="text-xs text-gray-400 mb-1">Email</p>
          <p className="font-semibold">{client.email || '—'}</p>
        </div>
        <div className="card">
          <p className="text-xs text-gray-400 mb-1">Total Hours (all visits)</p>
          <p className="font-semibold text-blue-600 text-xl">{formatDuration(totalMinutes)}</p>
        </div>
      </div>

      {client.notes && (
        <div className="card bg-amber-50 border-amber-100">
          <p className="text-xs text-amber-600 font-semibold mb-1">Notes</p>
          <p className="text-gray-700 text-sm">{client.notes}</p>
        </div>
      )}

      {client.latitude && client.longitude && (
        <div className="card">
          <div className="flex justify-between items-center">
            <p className="font-semibold text-gray-900 text-sm">GPS Location</p>
            <a
              href={`https://maps.google.com/?q=${client.latitude},${client.longitude}`}
              target="_blank"
              className="text-blue-600 text-sm hover:text-blue-800 flex items-center gap-1"
            >
              <MapPin size={14} /> Open in Google Maps
            </a>
          </div>
          <p className="text-gray-400 text-xs mt-1">{client.latitude}, {client.longitude}</p>
        </div>
      )}

      {/* Assigned agents */}
      <div className="card">
        <h2 className="font-semibold text-gray-900 mb-4">Assigned Agents ({assignedAgents.length})</h2>
        <div className="flex flex-wrap gap-2">
          {assignedAgents.map(a => (
            <span key={a.id} className="flex items-center gap-2 bg-blue-50 text-blue-700 text-sm font-medium px-3 py-1.5 rounded-full">
              <span className="w-5 h-5 rounded-full bg-blue-600 text-white text-xs flex items-center justify-center">
                {a.full_name?.[0] ?? '?'}
              </span>
              {a.full_name}
            </span>
          ))}
          {assignedAgents.length === 0 && <p className="text-gray-400 text-sm">No agents assigned</p>}
        </div>
      </div>

      {/* Agent schedules */}
      {assignments.length > 0 && (() => {
        let weeklyTotal = 0
        const rows = assignments.map(a => {
          const agentWeekly = a.schedules.reduce((sum, s) => {
            const [sh, sm] = s.start_time.split(':').map(Number)
            const [eh, em] = s.end_time.split(':').map(Number)
            return sum + (eh * 60 + em - sh * 60 - sm) / 60
          }, 0)
          weeklyTotal += agentWeekly
          return { a, agentWeekly }
        })
        return (
          <div className="card">
            <div className="flex items-center justify-between mb-4">
              <h2 className="font-semibold text-gray-900 flex items-center gap-2">
                <CalendarDays size={18} className="text-blue-600" /> Agent Schedules
              </h2>
              <span className="flex items-center gap-1 text-blue-600 font-semibold text-sm">
                <Clock size={14} /> {weeklyTotal.toFixed(1)}h / week (total)
              </span>
            </div>
            <div className="space-y-4">
              {rows.map(({ a, agentWeekly }) => (
                <div key={a.id} className="border border-gray-100 rounded-xl p-4">
                  <div className="flex items-center justify-between mb-3">
                    <div className="flex items-center gap-2">
                      <div className="w-7 h-7 rounded-full bg-blue-100 flex items-center justify-center">
                        <span className="text-blue-600 font-semibold text-xs">{a.agent?.full_name?.[0] ?? '?'}</span>
                      </div>
                      <span className="font-semibold text-gray-800 text-sm">{a.agent?.full_name}</span>
                    </div>
                    <span className="text-xs text-blue-600 font-semibold">{agentWeekly.toFixed(1)}h/week</span>
                  </div>
                  <div className="space-y-1">
                    {DAY_ORDER.map(day => {
                      const s = a.schedules.find(x => x.day_of_week === day)
                      if (!s) return null
                      const [sh, sm] = s.start_time.split(':').map(Number)
                      const [eh, em] = s.end_time.split(':').map(Number)
                      const h = (eh * 60 + em - sh * 60 - sm) / 60
                      return (
                        <div key={day} className="flex items-center gap-3 text-xs">
                          <span className="w-20 text-gray-500">{DAY_LABELS[day]}</span>
                          <span className="text-gray-700">{s.start_time.slice(0,5)} – {s.end_time.slice(0,5)}</span>
                          <span className="text-blue-500 font-medium">{h.toFixed(1)}h</span>
                        </div>
                      )
                    })}
                  </div>
                </div>
              ))}
            </div>
          </div>
        )
      })()}

      {/* Hours by agent */}
      {agentSummaries.length > 0 && (
        <div className="card">
          <h2 className="font-semibold text-gray-900 mb-4">Hours by Agent (billing)</h2>
          <div className="space-y-3">
            {agentSummaries.map(s => (
              <div key={s.agent_id} className="flex items-center gap-4">
                <div className="flex-1">
                  <div className="flex justify-between mb-1">
                    <span className="text-sm font-medium text-gray-900">{s.agent_name}</span>
                    <span className="text-sm text-gray-500">{s.visits} visit{s.visits !== 1 ? 's' : ''} · {formatDuration(s.total_minutes)}</span>
                  </div>
                  <div className="h-2 bg-gray-100 rounded-full">
                    <div
                      className="h-2 bg-blue-500 rounded-full"
                      style={{ width: `${Math.min((s.total_minutes / Math.max(totalMinutes, 1)) * 100, 100)}%` }}
                    />
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Visit history */}
      <div className="card p-0 overflow-hidden">
        <div className="p-6 border-b border-gray-100">
          <h2 className="font-semibold text-gray-900">Visit History</h2>
        </div>
        <table className="w-full">
          <thead className="border-b border-gray-100">
            <tr>
              <th className="table-header">Agent</th>
              <th className="table-header">Clock In</th>
              <th className="table-header">Clock Out</th>
              <th className="table-header">Duration</th>
              <th className="table-header">Status</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-50">
            {entries.map(e => (
              <tr key={e.id} className="hover:bg-gray-50">
                <td className="table-cell font-medium">{(e as any).agent?.full_name}</td>
                <td className="table-cell text-gray-500 text-xs">
                  {new Date(e.clock_in_at).toLocaleString('en-US', { month:'2-digit', day:'2-digit', year:'numeric', hour:'2-digit', minute:'2-digit' })}
                </td>
                <td className="table-cell text-gray-500 text-xs">
                  {e.clock_out_at ? new Date(e.clock_out_at).toLocaleString('en-US', { month:'2-digit', day:'2-digit', year:'numeric', hour:'2-digit', minute:'2-digit' }) : '—'}
                </td>
                <td className="table-cell font-semibold text-blue-600">{formatDuration(e.duration_minutes)}</td>
                <td className="table-cell">
                  <span className={`text-xs px-2 py-1 rounded-full font-semibold ${
                    e.status === 'completed' ? 'bg-green-100 text-green-700' : 'bg-purple-100 text-purple-700'
                  }`}>{e.status}</span>
                </td>
              </tr>
            ))}
            {entries.length === 0 && (
              <tr><td colSpan={5} className="py-8 text-center text-gray-400">No visits</td></tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  )
}
