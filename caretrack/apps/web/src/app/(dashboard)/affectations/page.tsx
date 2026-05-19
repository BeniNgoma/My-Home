'use client'
import { useEffect, useState } from 'react'
import { createClient } from '@/lib/supabase'
import { CalendarDays, Plus, X, Save, Pencil, AlertTriangle, Clock } from 'lucide-react'

const DAYS = [
  { key: 'monday',    label: 'Mon' },
  { key: 'tuesday',   label: 'Tue' },
  { key: 'wednesday', label: 'Wed' },
  { key: 'thursday',  label: 'Thu' },
  { key: 'friday',    label: 'Fri' },
  { key: 'saturday',  label: 'Sat' },
  { key: 'sunday',    label: 'Sun' },
]

const DAY_LABELS: Record<string, string> = {
  monday: 'Monday', tuesday: 'Tuesday', wednesday: 'Wednesday',
  thursday: 'Thursday', friday: 'Friday', saturday: 'Saturday', sunday: 'Sunday',
}

const RECURRENCE_LABELS: Record<string, string> = {
  permanent: 'Permanent', '2_weeks': '2 weeks', '1_month': '1 month', custom: 'Custom',
}

type DaySchedule = { start_time: string; end_time: string }

interface Schedule {
  id: string
  day_of_week: string
  start_time: string
  end_time: string
}

interface Assignment {
  id: string
  agent_id: string
  client_id: string
  start_date: string
  end_date: string | null
  recurrence_type: string
  is_active: boolean
  notes: string | null
  agent: { full_name: string }
  client: { full_name: string }
  schedules: Schedule[]
}

const emptyDaySchedule = (): DaySchedule => ({ start_time: '08:00', end_time: '15:00' })

function hoursFromSchedules(schedules: Schedule[]): number {
  return schedules.reduce((total, s) => {
    const [sh, sm] = s.start_time.split(':').map(Number)
    const [eh, em] = s.end_time.split(':').map(Number)
    return total + (eh * 60 + em - sh * 60 - sm) / 60
  }, 0)
}

function weeklyHours(schedules: Schedule[]): number {
  return hoursFromSchedules(schedules)
}

export default function AffectationsPage() {
  const supabase = createClient()
  const [assignments, setAssignments] = useState<Assignment[]>([])
  const [agents, setAgents] = useState<{ id: string; full_name: string }[]>([])
  const [clients, setClients] = useState<{ id: string; full_name: string }[]>([])
  const [loading, setLoading] = useState(true)
  const [showForm, setShowForm] = useState(false)
  const [editingId, setEditingId] = useState<string | null>(null)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')
  const [conflicts, setConflicts] = useState<string[]>([])

  const [form, setForm] = useState({
    agent_id: '',
    client_id: '',
    recurrence_type: 'permanent',
    start_date: new Date().toISOString().slice(0, 10),
    end_date: '',
    notes: '',
  })
  const [selectedDays, setSelectedDays] = useState<Record<string, boolean>>({})
  const [daySchedules, setDaySchedules] = useState<Record<string, DaySchedule>>({})

  useEffect(() => { loadAll() }, [])

  async function loadAll() {
    setLoading(true)
    const [{ data: assignData }, { data: agentData }, { data: clientData }] = await Promise.all([
      supabase
        .from('agent_client_assignments')
        .select(`id, agent_id, client_id, start_date, end_date, recurrence_type, is_active, notes,
                 agent:profiles!agent_id(full_name),
                 client:clients!client_id(full_name),
                 schedules:assignment_schedules(id, day_of_week, start_time, end_time)`)
        .order('is_active', { ascending: false })
        .order('start_date', { ascending: false }),
      supabase.from('profiles').select('id, full_name').eq('role', 'agent').eq('is_active', true).order('full_name'),
      supabase.from('clients').select('id, full_name').eq('is_active', true).order('full_name'),
    ])
    setAssignments((assignData || []) as unknown as Assignment[])
    setAgents((agentData || []) as any[])
    setClients((clientData || []) as any[])
    setLoading(false)
  }

  function openCreate() {
    setEditingId(null)
    setForm({
      agent_id: '', client_id: '', recurrence_type: 'permanent',
      start_date: new Date().toISOString().slice(0, 10), end_date: '', notes: '',
    })
    setSelectedDays({})
    setDaySchedules({})
    setError('')
    setConflicts([])
    setShowForm(true)
  }

  function openEdit(a: Assignment) {
    setEditingId(a.id)
    const days: Record<string, boolean> = {}
    const times: Record<string, DaySchedule> = {}
    for (const s of a.schedules) {
      days[s.day_of_week] = true
      times[s.day_of_week] = { start_time: s.start_time.slice(0, 5), end_time: s.end_time.slice(0, 5) }
    }
    setForm({
      agent_id: a.agent_id,
      client_id: a.client_id,
      recurrence_type: a.recurrence_type,
      start_date: a.start_date,
      end_date: a.end_date || '',
      notes: a.notes || '',
    })
    setSelectedDays(days)
    setDaySchedules(times)
    setError('')
    setConflicts([])
    setShowForm(true)
  }

  function toggleDay(day: string) {
    const next = { ...selectedDays, [day]: !selectedDays[day] }
    setSelectedDays(next)
    if (next[day] && !daySchedules[day]) {
      setDaySchedules(prev => ({ ...prev, [day]: emptyDaySchedule() }))
    }
  }

  function setEndDateFromRecurrence(type: string, startDate: string) {
    if (type === 'permanent' || type === 'custom') return ''
    const d = new Date(startDate)
    if (type === '2_weeks') d.setDate(d.getDate() + 14)
    if (type === '1_month') d.setMonth(d.getMonth() + 1)
    return d.toISOString().slice(0, 10)
  }

  async function checkConflicts(): Promise<string[]> {
    if (!form.agent_id) return []
    const found: string[] = []
    const activeDays = DAYS.filter(d => selectedDays[d.key])
    for (const { key } of activeDays) {
      const sched = daySchedules[key]
      if (!sched) continue
      const { data } = await supabase.rpc('check_schedule_conflict', {
        p_agent_id: form.agent_id,
        p_day: key,
        p_start: sched.start_time,
        p_end: sched.end_time,
        p_exclude_id: editingId,
      })
      for (const row of data || []) {
        found.push(`${DAY_LABELS[key]} ${sched.start_time}-${sched.end_time}: already assigned to ${row.conflict_client} (${row.conflict_start.slice(0,5)}-${row.conflict_end.slice(0,5)})`)
      }
    }
    return found
  }

  async function handleSave(e: React.FormEvent) {
    e.preventDefault()
    setError('')
    setConflicts([])

    const activeDays = DAYS.filter(d => selectedDays[d.key])
    if (activeDays.length === 0) {
      setError('Please select at least one working day.')
      return
    }
    if (!form.agent_id || !form.client_id) {
      setError('Agent and client are required.')
      return
    }

    const found = await checkConflicts()
    if (found.length > 0) {
      setConflicts(found)
      return
    }

    setSaving(true)
    try {
      let assignmentId = editingId

      if (editingId) {
        await supabase.from('agent_client_assignments').update({
          recurrence_type: form.recurrence_type,
          start_date: form.start_date,
          end_date: form.end_date || null,
          notes: form.notes || null,
        }).eq('id', editingId)
        await supabase.from('assignment_schedules').delete().eq('assignment_id', editingId)
      } else {
        const { data: newAssign, error: insertErr } = await supabase
          .from('agent_client_assignments')
          .insert({
            agent_id: form.agent_id,
            client_id: form.client_id,
            recurrence_type: form.recurrence_type,
            start_date: form.start_date,
            end_date: form.end_date || null,
            notes: form.notes || null,
            is_active: true,
          })
          .select('id')
          .single()
        if (insertErr || !newAssign) throw new Error(insertErr?.message || 'Creation error')
        assignmentId = newAssign.id
      }

      const scheduleRows = activeDays.map(({ key }) => ({
        assignment_id: assignmentId!,
        day_of_week: key,
        start_time: daySchedules[key]?.start_time || '08:00',
        end_time: daySchedules[key]?.end_time || '15:00',
      }))
      await supabase.from('assignment_schedules').insert(scheduleRows)

      setShowForm(false)
      await loadAll()
    } catch (err: any) {
      setError(err.message)
    } finally {
      setSaving(false)
    }
  }

  async function deactivate(id: string) {
    await supabase.from('agent_client_assignments').update({ is_active: false }).eq('id', id)
    await loadAll()
  }

  async function reactivate(id: string) {
    await supabase.from('agent_client_assignments').update({ is_active: true }).eq('id', id)
    await loadAll()
  }

  const activeCount = assignments.filter(a => a.is_active).length

  return (
    <div className="p-8 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Assignments</h1>
          <p className="text-gray-500 text-sm mt-1">{activeCount} active assignment{activeCount !== 1 ? 's' : ''}</p>
        </div>
        <button onClick={openCreate} className="btn-primary flex items-center gap-2">
          <Plus size={18} /> New Assignment
        </button>
      </div>

      {/* Modal form */}
      {showForm && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl w-full max-w-2xl max-h-[90vh] overflow-y-auto">
            <div className="flex justify-between items-center p-6 border-b border-gray-100">
              <h2 className="text-xl font-bold text-gray-900">
                {editingId ? 'Edit Assignment' : 'New Assignment'}
              </h2>
              <button onClick={() => setShowForm(false)}><X size={20} className="text-gray-400" /></button>
            </div>

            <form onSubmit={handleSave} className="p-6 space-y-5">
              {error && (
                <div className="bg-red-50 border border-red-200 text-red-700 rounded-lg px-4 py-3 text-sm">{error}</div>
              )}
              {conflicts.length > 0 && (
                <div className="bg-amber-50 border border-amber-200 rounded-lg px-4 py-3">
                  <p className="text-sm font-semibold text-amber-800 flex items-center gap-2 mb-2">
                    <AlertTriangle size={16} /> Schedule conflicts detected
                  </p>
                  {conflicts.map((c, i) => (
                    <p key={i} className="text-sm text-amber-700 ml-6">• {c}</p>
                  ))}
                </div>
              )}

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="label">Agent *</label>
                  <select
                    className="input"
                    value={form.agent_id}
                    onChange={e => setForm({ ...form, agent_id: e.target.value })}
                    required
                    disabled={!!editingId}
                  >
                    <option value="">Select...</option>
                    {agents.map(a => <option key={a.id} value={a.id}>{a.full_name}</option>)}
                  </select>
                </div>
                <div>
                  <label className="label">Client *</label>
                  <select
                    className="input"
                    value={form.client_id}
                    onChange={e => setForm({ ...form, client_id: e.target.value })}
                    required
                    disabled={!!editingId}
                  >
                    <option value="">Select...</option>
                    {clients.map(c => <option key={c.id} value={c.id}>{c.full_name}</option>)}
                  </select>
                </div>
              </div>

              <div>
                <label className="label">Recurrence Type</label>
                <div className="flex gap-2 flex-wrap">
                  {Object.entries(RECURRENCE_LABELS).map(([val, lbl]) => (
                    <button
                      key={val}
                      type="button"
                      onClick={() => {
                        const end = setEndDateFromRecurrence(val, form.start_date)
                        setForm({ ...form, recurrence_type: val, end_date: end })
                      }}
                      className={`px-3 py-1.5 rounded-full text-sm font-medium border transition-colors ${
                        form.recurrence_type === val
                          ? 'bg-blue-600 text-white border-blue-600'
                          : 'bg-white text-gray-600 border-gray-200 hover:border-blue-400'
                      }`}
                    >
                      {lbl}
                    </button>
                  ))}
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="label">Start Date *</label>
                  <input
                    type="date"
                    className="input"
                    value={form.start_date}
                    onChange={e => {
                      const end = setEndDateFromRecurrence(form.recurrence_type, e.target.value)
                      setForm({ ...form, start_date: e.target.value, end_date: end })
                    }}
                    required
                  />
                </div>
                {form.recurrence_type !== 'permanent' && (
                  <div>
                    <label className="label">End Date</label>
                    <input
                      type="date"
                      className="input"
                      value={form.end_date}
                      onChange={e => setForm({ ...form, end_date: e.target.value })}
                      min={form.start_date}
                    />
                  </div>
                )}
              </div>

              {/* Schedule */}
              <div>
                <label className="label mb-2">Weekly Schedule *</label>
                <div className="space-y-3">
                  {DAYS.map(({ key, label }) => (
                    <div key={key} className="flex items-center gap-3">
                      <button
                        type="button"
                        onClick={() => toggleDay(key)}
                        className={`w-12 h-8 rounded-full text-sm font-semibold flex items-center justify-center border transition-colors ${
                          selectedDays[key]
                            ? 'bg-blue-600 text-white border-blue-600'
                            : 'bg-white text-gray-400 border-gray-200 hover:border-blue-400'
                        }`}
                      >
                        {label}
                      </button>
                      {selectedDays[key] && (
                        <div className="flex items-center gap-2 flex-1">
                          <input
                            type="time"
                            className="input py-1.5 w-32"
                            value={daySchedules[key]?.start_time || '08:00'}
                            onChange={e => setDaySchedules(p => ({ ...p, [key]: { ...p[key], start_time: e.target.value } }))}
                          />
                          <span className="text-gray-400 text-sm">→</span>
                          <input
                            type="time"
                            className="input py-1.5 w-32"
                            value={daySchedules[key]?.end_time || '15:00'}
                            onChange={e => setDaySchedules(p => ({ ...p, [key]: { ...p[key], end_time: e.target.value } }))}
                          />
                          <span className="text-gray-400 text-sm">
                            {(() => {
                              const s = daySchedules[key]
                              if (!s) return ''
                              const [sh, sm] = s.start_time.split(':').map(Number)
                              const [eh, em] = s.end_time.split(':').map(Number)
                              const h = (eh * 60 + em - sh * 60 - sm) / 60
                              return h > 0 ? `${h.toFixed(1)}h` : ''
                            })()}
                          </span>
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              </div>

              <div>
                <label className="label">Notes (optional)</label>
                <textarea
                  className="input resize-none"
                  rows={2}
                  value={form.notes}
                  onChange={e => setForm({ ...form, notes: e.target.value })}
                  placeholder="Special instructions..."
                />
              </div>

              <div className="flex gap-3 pt-2">
                <button type="button" className="btn-secondary flex-1" onClick={() => setShowForm(false)}>Cancel</button>
                <button type="submit" className="btn-primary flex-1 flex items-center justify-center gap-2" disabled={saving}>
                  <Save size={16} /> {saving ? 'Saving...' : 'Save'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* List */}
      {loading ? (
        <div className="py-12 text-center text-gray-400">Loading...</div>
      ) : (
        <div className="space-y-3">
          {assignments.map(a => {
            const wh = weeklyHours(a.schedules)
            const dayList = DAYS.filter(d => a.schedules.some(s => s.day_of_week === d.key))
            return (
              <div
                key={a.id}
                className={`card border ${a.is_active ? 'border-gray-100' : 'border-gray-100 opacity-60'}`}
              >
                <div className="flex items-start justify-between gap-4">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-3 flex-wrap">
                      <div className="flex items-center gap-2">
                        <div className="w-8 h-8 rounded-full bg-blue-100 flex items-center justify-center">
                          <span className="text-blue-600 font-semibold text-sm">{a.agent?.full_name?.[0] ?? '?'}</span>
                        </div>
                        <span className="font-semibold text-gray-900">{a.agent?.full_name}</span>
                      </div>
                      <span className="text-gray-400">→</span>
                      <div className="flex items-center gap-2">
                        <div className="w-8 h-8 rounded-full bg-green-100 flex items-center justify-center">
                          <span className="text-green-600 font-semibold text-sm">{a.client?.full_name?.[0] ?? '?'}</span>
                        </div>
                        <span className="font-medium text-gray-700">{a.client?.full_name}</span>
                      </div>
                      <span className={`text-xs font-semibold px-2.5 py-0.5 rounded-full ${
                        a.recurrence_type === 'permanent' ? 'bg-purple-100 text-purple-700' :
                        a.recurrence_type === '2_weeks'   ? 'bg-blue-100 text-blue-700' :
                        a.recurrence_type === '1_month'   ? 'bg-indigo-100 text-indigo-700' :
                        'bg-gray-100 text-gray-600'
                      }`}>
                        {RECURRENCE_LABELS[a.recurrence_type]}
                      </span>
                      {!a.is_active && (
                        <span className="text-xs font-semibold px-2.5 py-0.5 rounded-full bg-red-100 text-red-600">Inactive</span>
                      )}
                    </div>

                    {/* Days + hours */}
                    <div className="mt-3 flex flex-wrap gap-2">
                      {dayList.map(({ key, label }) => {
                        const s = a.schedules.find(x => x.day_of_week === key)
                        if (!s) return null
                        const [sh, sm] = s.start_time.split(':').map(Number)
                        const [eh, em] = s.end_time.split(':').map(Number)
                        const h = (eh * 60 + em - sh * 60 - sm) / 60
                        return (
                          <span key={key} className="inline-flex items-center gap-1.5 bg-gray-50 border border-gray-100 rounded-lg px-3 py-1 text-xs">
                            <span className="font-semibold text-gray-700">{label}</span>
                            <span className="text-gray-400">{s.start_time.slice(0,5)}–{s.end_time.slice(0,5)}</span>
                            <span className="text-blue-600 font-medium">{h.toFixed(1)}h</span>
                          </span>
                        )
                      })}
                      {dayList.length === 0 && (
                        <span className="text-xs text-gray-400">No schedule defined</span>
                      )}
                    </div>

                    {/* Dates + total */}
                    <div className="mt-2 flex items-center gap-4 text-xs text-gray-400">
                      <span className="flex items-center gap-1">
                        <CalendarDays size={12} />
                        {new Date(a.start_date).toLocaleDateString('en-US')}
                        {a.end_date ? ` → ${new Date(a.end_date).toLocaleDateString('en-US')}` : ' (permanent)'}
                      </span>
                      <span className="flex items-center gap-1 text-blue-600 font-semibold">
                        <Clock size={12} />
                        {wh.toFixed(1)}h / week
                      </span>
                      {a.notes && (
                        <span className="text-amber-600 italic truncate max-w-xs">{a.notes}</span>
                      )}
                    </div>
                  </div>

                  <div className="flex items-center gap-2 shrink-0">
                    {a.is_active && (
                      <button
                        onClick={() => openEdit(a)}
                        className="p-2 text-gray-400 hover:text-blue-600 rounded-lg hover:bg-blue-50 transition-colors"
                        title="Edit"
                      >
                        <Pencil size={16} />
                      </button>
                    )}
                    {a.is_active ? (
                      <button
                        onClick={() => deactivate(a.id)}
                        className="text-xs px-3 py-1.5 rounded-lg border border-red-200 text-red-600 hover:bg-red-50 transition-colors"
                      >
                        Deactivate
                      </button>
                    ) : (
                      <button
                        onClick={() => reactivate(a.id)}
                        className="text-xs px-3 py-1.5 rounded-lg border border-green-200 text-green-600 hover:bg-green-50 transition-colors"
                      >
                        Reactivate
                      </button>
                    )}
                  </div>
                </div>
              </div>
            )
          })}
          {assignments.length === 0 && (
            <div className="py-16 text-center text-gray-400">
              <CalendarDays size={40} className="mx-auto mb-3 opacity-30" />
              <p>No assignments. Create the first one!</p>
            </div>
          )}
        </div>
      )}
    </div>
  )
}
