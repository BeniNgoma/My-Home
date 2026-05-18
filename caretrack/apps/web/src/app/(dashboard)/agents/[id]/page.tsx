'use client'
import { useEffect, useState } from 'react'
import { useParams, useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase'
import { formatDuration } from '@caretrack/shared'
import type { Profile, Client, TimeEntryWithRelations } from '@caretrack/shared'
import { ArrowLeft, Save, Pencil, X, CalendarDays, Clock, Users, TrendingUp } from 'lucide-react'

const DAY_ORDER = ['monday','tuesday','wednesday','thursday','friday','saturday','sunday']
const DAY_LABELS: Record<string,string> = {
  monday:'Lundi', tuesday:'Mardi', wednesday:'Mercredi', thursday:'Jeudi',
  friday:'Vendredi', saturday:'Samedi', sunday:'Dimanche',
}

interface AssignmentWithSchedule {
  id: string
  client_id: string
  start_date: string
  end_date: string | null
  recurrence_type: string
  is_active: boolean
  client: { full_name: string }
  schedules: { day_of_week: string; start_time: string; end_time: string }[]
}

export default function AgentDetailPage() {
  const { id } = useParams<{ id: string }>()
  const router = useRouter()
  const supabase = createClient()

  const [agent, setAgent] = useState<Profile | null>(null)
  const [assignedClients, setAssignedClients] = useState<Client[]>([])
  const [allClients, setAllClients] = useState<Client[]>([])
  const [entries, setEntries] = useState<TimeEntryWithRelations[]>([])
  const [assignments, setAssignments] = useState<AssignmentWithSchedule[]>([])
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [hourlyRate, setHourlyRate] = useState('')
  const [showAddClient, setShowAddClient] = useState(false)
  const [showEditForm, setShowEditForm] = useState(false)
  const [editForm, setEditForm] = useState({ full_name: '', phone: '' })
  const [editSaving, setEditSaving] = useState(false)

  useEffect(() => { loadAll() }, [id])

  async function loadAll() {
    setLoading(true)
    const [{ data: agentData }, { data: assignData }, { data: clientsData }, { data: entriesData }, { data: assignWithSched }] = await Promise.all([
      supabase.from('profiles').select('*').eq('id', id).single(),
      supabase.from('agent_client_assignments').select('client_id, clients(*)').eq('agent_id', id).eq('is_active', true),
      supabase.from('clients').select('*').eq('is_active', true).order('full_name'),
      supabase.from('time_entries').select('*, client:clients(id,full_name)').eq('agent_id', id).order('clock_in_at', { ascending: false }).limit(50),
      supabase.from('agent_client_assignments')
        .select('id, client_id, start_date, end_date, recurrence_type, is_active, client:clients!client_id(full_name), schedules:assignment_schedules(day_of_week, start_time, end_time)')
        .eq('agent_id', id)
        .eq('is_active', true),
    ])
    setAgent(agentData as Profile)
    setHourlyRate(String((agentData as any)?.hourly_rate || 0))
    setEditForm({
      full_name: (agentData as any)?.full_name || '',
      phone: (agentData as any)?.phone || '',
    })
    setAssignedClients(((assignData || []) as any[]).map((a) => a.clients))
    setAllClients((clientsData || []) as Client[])
    setEntries((entriesData || []) as TimeEntryWithRelations[])
    setAssignments((assignWithSched || []) as unknown as AssignmentWithSchedule[])
    setLoading(false)
  }

  async function saveHourlyRate() {
    setSaving(true)
    await supabase.from('profiles').update({ hourly_rate: parseFloat(hourlyRate) }).eq('id', id)
    setSaving(false)
    await loadAll()
  }

  async function handleEditAgent(e: React.FormEvent) {
    e.preventDefault()
    if (!editForm.full_name.trim()) return
    setEditSaving(true)
    await supabase.from('profiles').update({
      full_name: editForm.full_name.trim(),
      phone: editForm.phone.trim() || null,
    }).eq('id', id)
    setEditSaving(false)
    setShowEditForm(false)
    await loadAll()
  }

  async function toggleActive() {
    if (!agent) return
    await supabase.from('profiles').update({ is_active: !agent.is_active }).eq('id', id)
    await loadAll()
  }

  async function removeClient(clientId: string) {
    await supabase.from('agent_client_assignments').update({ is_active: false }).eq('agent_id', id).eq('client_id', clientId)
    await loadAll()
  }

  async function addClient(clientId: string) {
    const { data: existing } = await supabase
      .from('agent_client_assignments')
      .select('id, is_active')
      .eq('agent_id', id)
      .eq('client_id', clientId)
      .single()

    if (existing) {
      await supabase.from('agent_client_assignments').update({ is_active: true }).eq('id', existing.id)
    } else {
      await supabase.from('agent_client_assignments').insert({ agent_id: id, client_id: clientId })
    }
    setShowAddClient(false)
    await loadAll()
  }

  if (loading) return <div className="p-8 text-gray-400">Chargement...</div>
  if (!agent) return <div className="p-8 text-gray-400">Agent introuvable</div>

  const assignedIds = new Set(assignedClients.map(c => c.id))
  const unassignedClients = allClients.filter(c => !assignedIds.has(c.id))

  const weeklyHours = assignments.reduce((total, a) =>
    total + a.schedules.reduce((s, sch) => {
      const [sh, sm] = sch.start_time.split(':').map(Number)
      const [eh, em] = sch.end_time.split(':').map(Number)
      return s + (eh * 60 + em - sh * 60 - sm) / 60
    }, 0), 0)
  const biWeeklyHours = weeklyHours * 2
  const monthlyHours = weeklyHours * 52 / 12

  return (
    <div className="p-8 space-y-6">
      <button onClick={() => router.back()} className="flex items-center gap-2 text-gray-500 hover:text-gray-900 text-sm">
        <ArrowLeft size={16} /> Retour aux agents
      </button>

      <div className="flex items-start justify-between">
        <div className="flex items-center gap-4">
          <div className="w-16 h-16 rounded-full bg-blue-100 flex items-center justify-center">
            <span className="text-blue-600 font-bold text-2xl">{agent.full_name?.[0] ?? '?'}</span>
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-2xl font-bold text-gray-900">{agent.full_name}</h1>
              <button
                onClick={() => setShowEditForm(true)}
                className="text-gray-400 hover:text-blue-600 transition-colors"
                title="Modifier"
              >
                <Pencil size={16} />
              </button>
            </div>
            <p className="text-gray-500">{agent.email}</p>
          </div>
        </div>
        <button
          onClick={toggleActive}
          className={agent.is_active ? 'btn-danger' : 'btn-primary'}
        >
          {agent.is_active ? 'Désactiver le compte' : 'Réactiver le compte'}
        </button>
      </div>

      {/* Edit modal */}
      {showEditForm && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl p-8 w-full max-w-md">
            <div className="flex justify-between items-center mb-6">
              <h2 className="text-xl font-bold text-gray-900">Modifier l'agent</h2>
              <button onClick={() => setShowEditForm(false)}><X size={20} className="text-gray-400" /></button>
            </div>
            <form onSubmit={handleEditAgent} className="space-y-4">
              <div>
                <label className="label">Nom complet</label>
                <input
                  className="input"
                  value={editForm.full_name}
                  onChange={e => setEditForm({ ...editForm, full_name: e.target.value })}
                  required
                />
              </div>
              <div>
                <label className="label">Téléphone</label>
                <input
                  className="input"
                  value={editForm.phone}
                  onChange={e => setEditForm({ ...editForm, phone: e.target.value })}
                  placeholder="Optionnel"
                />
              </div>
              <p className="text-xs text-gray-400">L'email ne peut pas être modifié ici.</p>
              <div className="flex gap-3 pt-2">
                <button type="button" className="btn-secondary flex-1" onClick={() => setShowEditForm(false)}>Annuler</button>
                <button type="submit" className="btn-primary flex-1 flex items-center justify-center gap-1" disabled={editSaving}>
                  <Save size={15} /> {editSaving ? 'Enregistrement...' : 'Enregistrer'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="card md:col-span-1">
          <h2 className="font-semibold text-gray-900 mb-4">Taux horaire</h2>
          <div className="flex items-center gap-3">
            <div className="relative flex-1">
              <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500">$</span>
              <input
                type="number" step="0.01" min="0"
                className="input pl-8"
                value={hourlyRate}
                onChange={e => setHourlyRate(e.target.value)}
              />
            </div>
            <button onClick={saveHourlyRate} disabled={saving} className="btn-primary flex items-center gap-1">
              <Save size={16} /> Enregistrer
            </button>
          </div>
        </div>

        <div className="card">
          <p className="text-sm text-gray-500">Téléphone</p>
          <p className="font-semibold text-gray-900 mt-1">{agent.phone || '—'}</p>
        </div>

        <div className="card">
          <p className="text-sm text-gray-500">Statut</p>
          <span className={`inline-flex items-center gap-1 mt-1 text-sm font-semibold px-2.5 py-1 rounded-full ${
            agent.is_active ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-500'
          }`}>
            {agent.is_active ? '● Actif' : '● Inactif'}
          </span>
        </div>
      </div>

      {/* Hours stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <div className="card flex items-center gap-3">
          <div className="p-2.5 bg-blue-100 rounded-lg"><Users className="text-blue-600" size={20} /></div>
          <div>
            <p className="text-xs text-gray-500">Clients assignés</p>
            <p className="text-xl font-bold text-gray-900">{assignments.length}</p>
          </div>
        </div>
        <div className="card flex items-center gap-3">
          <div className="p-2.5 bg-green-100 rounded-lg"><Clock className="text-green-600" size={20} /></div>
          <div>
            <p className="text-xs text-gray-500">Heures / semaine</p>
            <p className="text-xl font-bold text-gray-900">{weeklyHours.toFixed(1)}h</p>
          </div>
        </div>
        <div className="card flex items-center gap-3">
          <div className="p-2.5 bg-purple-100 rounded-lg"><CalendarDays className="text-purple-600" size={20} /></div>
          <div>
            <p className="text-xs text-gray-500">Heures / 2 semaines</p>
            <p className="text-xl font-bold text-gray-900">{biWeeklyHours.toFixed(1)}h</p>
          </div>
        </div>
        <div className="card flex items-center gap-3">
          <div className="p-2.5 bg-orange-100 rounded-lg"><TrendingUp className="text-orange-600" size={20} /></div>
          <div>
            <p className="text-xs text-gray-500">Heures / mois</p>
            <p className="text-xl font-bold text-gray-900">{monthlyHours.toFixed(1)}h</p>
          </div>
        </div>
      </div>

      {/* Assigned Clients */}
      <div className="card">
        <div className="flex justify-between items-center mb-4">
          <h2 className="font-semibold text-gray-900">Clients assignés ({assignedClients.length})</h2>
          {unassignedClients.length > 0 && (
            <button className="btn-secondary text-sm" onClick={() => setShowAddClient(!showAddClient)}>
              + Ajouter un client
            </button>
          )}
        </div>

        {showAddClient && (
          <div className="mb-4 p-4 bg-gray-50 rounded-xl border border-gray-200">
            <p className="text-sm font-medium text-gray-700 mb-2">Sélectionner un client :</p>
            <div className="space-y-2">
              {unassignedClients.map(c => (
                <div key={c.id} className="flex justify-between items-center bg-white px-4 py-2 rounded-lg border border-gray-100">
                  <span className="text-sm text-gray-900">{c.full_name}</span>
                  <button onClick={() => addClient(c.id)} className="text-xs btn-primary py-1 px-3">Assigner</button>
                </div>
              ))}
            </div>
          </div>
        )}

        <div className="space-y-2">
          {assignedClients.map(c => (
            <div key={c.id} className="flex justify-between items-center px-4 py-3 bg-gray-50 rounded-lg">
              <span className="font-medium text-gray-900">{c.full_name}</span>
              <button onClick={() => removeClient(c.id)} className="text-xs text-red-600 hover:text-red-800">Retirer</button>
            </div>
          ))}
          {assignedClients.length === 0 && (
            <p className="text-gray-400 text-sm py-2 text-center">Aucun client assigné</p>
          )}
        </div>
      </div>

      {/* Planning section */}
      {assignments.length > 0 && (() => {
        // Build per-day breakdown across all active assignments
        const byDay: Record<string, { clientName: string; start: string; end: string; hours: number }[]> = {}
        let weeklyTotal = 0
        for (const a of assignments) {
          for (const s of a.schedules) {
            const [sh, sm] = s.start_time.split(':').map(Number)
            const [eh, em] = s.end_time.split(':').map(Number)
            const h = (eh * 60 + em - sh * 60 - sm) / 60
            weeklyTotal += h
            if (!byDay[s.day_of_week]) byDay[s.day_of_week] = []
            byDay[s.day_of_week].push({ clientName: a.client.full_name, start: s.start_time.slice(0,5), end: s.end_time.slice(0,5), hours: h })
          }
        }
        const now = new Date()
        const startOfWeek = new Date(now); startOfWeek.setDate(now.getDate() - ((now.getDay() + 6) % 7)); startOfWeek.setHours(0,0,0,0)
        const endOfWeek = new Date(startOfWeek); endOfWeek.setDate(startOfWeek.getDate() + 6)
        return (
          <div className="card">
            <div className="flex items-center justify-between mb-4">
              <h2 className="font-semibold text-gray-900 flex items-center gap-2">
                <CalendarDays size={18} className="text-blue-600" /> Planning hebdomadaire
              </h2>
              <div className="flex items-center gap-1 text-blue-600 font-semibold">
                <Clock size={16} />
                <span>{weeklyTotal.toFixed(1)}h / semaine</span>
              </div>
            </div>
            <div className="space-y-2">
              {DAY_ORDER.map(day => {
                const slots = byDay[day]
                if (!slots) return (
                  <div key={day} className="flex items-center gap-3 py-2 border-b border-gray-50 last:border-0">
                    <span className="w-24 text-sm text-gray-300 font-medium">{DAY_LABELS[day]}</span>
                    <span className="text-xs text-gray-200">—</span>
                  </div>
                )
                const dayTotal = slots.reduce((s, x) => s + x.hours, 0)
                return (
                  <div key={day} className="flex items-start gap-3 py-2 border-b border-gray-50 last:border-0">
                    <span className="w-24 text-sm font-semibold text-gray-700 pt-0.5">{DAY_LABELS[day]}</span>
                    <div className="flex flex-wrap gap-2 flex-1">
                      {slots.map((sl, i) => (
                        <span key={i} className="inline-flex items-center gap-1.5 bg-blue-50 text-blue-700 rounded-lg px-3 py-1 text-xs font-medium">
                          {sl.clientName} · {sl.start}–{sl.end}
                          <span className="text-blue-400 font-normal">{sl.hours.toFixed(1)}h</span>
                        </span>
                      ))}
                    </div>
                    <span className="text-sm font-semibold text-gray-500 shrink-0">{dayTotal.toFixed(1)}h</span>
                  </div>
                )
              })}
            </div>
          </div>
        )
      })()}

      {/* Time entries */}
      <div className="card p-0 overflow-hidden">
        <div className="p-6 border-b border-gray-100">
          <h2 className="font-semibold text-gray-900">Historique des pointages</h2>
        </div>
        <table className="w-full">
          <thead className="border-b border-gray-100">
            <tr>
              <th className="table-header">Client</th>
              <th className="table-header">Arrivée</th>
              <th className="table-header">Départ</th>
              <th className="table-header">Durée</th>
              <th className="table-header">Statut</th>
              <th className="table-header">Photos</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-50">
            {entries.map(e => (
              <tr key={e.id} className="hover:bg-gray-50">
                <td className="table-cell font-medium">{(e as any).client?.full_name}</td>
                <td className="table-cell text-gray-500 text-xs">
                  {new Date(e.clock_in_at).toLocaleString('fr-FR', { day:'2-digit',month:'2-digit',hour:'2-digit',minute:'2-digit'})}
                </td>
                <td className="table-cell text-gray-500 text-xs">
                  {e.clock_out_at ? new Date(e.clock_out_at).toLocaleString('fr-FR', { day:'2-digit',month:'2-digit',hour:'2-digit',minute:'2-digit'}) : '—'}
                </td>
                <td className="table-cell font-semibold text-blue-600">{formatDuration(e.duration_minutes)}</td>
                <td className="table-cell">
                  <span className={`text-xs px-2 py-1 rounded-full font-semibold ${
                    e.status === 'active' ? 'bg-amber-100 text-amber-700' :
                    e.status === 'completed' ? 'bg-green-100 text-green-700' :
                    'bg-purple-100 text-purple-700'
                  }`}>{e.status}</span>
                </td>
                <td className="table-cell">
                  {e.clock_in_photo_url && (
                    <a href={e.clock_in_photo_url} target="_blank" className="text-xs text-blue-600 hover:underline mr-2">IN</a>
                  )}
                  {e.clock_out_photo_url && (
                    <a href={e.clock_out_photo_url} target="_blank" className="text-xs text-blue-600 hover:underline">OUT</a>
                  )}
                </td>
              </tr>
            ))}
            {entries.length === 0 && (
              <tr><td colSpan={6} className="py-8 text-center text-gray-400">Aucun pointage</td></tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  )
}
