'use client'
import { useEffect, useState } from 'react'
import { createClient } from '@/lib/supabase'
import { formatDuration } from '@/lib/types'
import type { TimeEntryWithRelations, Profile, Client } from '@/lib/types'
import { Download, MapPin, X, AlertTriangle, Plus, Clock, LogIn, LogOut } from 'lucide-react'
import * as XLSX from 'xlsx'

interface EntryWithAll extends TimeEntryWithRelations {
  agent: Pick<Profile, 'id' | 'full_name' | 'email'>
  client: Pick<Client, 'id' | 'full_name' | 'address'>
}

const toLocalInput = (iso: string) => {
  const d = new Date(iso)
  return new Date(d.getTime() - d.getTimezoneOffset() * 60000).toISOString().slice(0, 16)
}

export default function PointagesPage() {
  const supabase = createClient()
  const [entries, setEntries] = useState<EntryWithAll[]>([])
  const [agents, setAgents] = useState<Profile[]>([])
  const [clients, setClients] = useState<Client[]>([])
  const [loading, setLoading] = useState(true)
  const [selected, setSelected] = useState<EntryWithAll | null>(null)
  const [correcting, setCorrecting] = useState<EntryWithAll | null>(null)
  const [corrNote, setCorrNote] = useState('')
  const [corrClockIn, setCorrClockIn] = useState('')
  const [corrClockOut, setCorrClockOut] = useState('')
  const [corrSaving, setCorrSaving] = useState(false)

  // New entry form
  const [showNew, setShowNew] = useState(false)
  const [newForm, setNewForm] = useState({
    agent_id: '', client_id: '',
    clock_in: toLocalInput(new Date().toISOString()),
    clock_out: '',
  })
  const [newSaving, setNewSaving] = useState(false)
  const [newError, setNewError] = useState('')

  // Clock-out form for active entry
  const [clockingOut, setClockingOut] = useState<EntryWithAll | null>(null)
  const [clockOutTime, setClockOutTime] = useState('')
  const [clockOutSaving, setClockOutSaving] = useState(false)

  const [filterAgent, setFilterAgent] = useState('')
  const [filterClient, setFilterClient] = useState('')
  const [filterFrom, setFilterFrom] = useState('')
  const [filterTo, setFilterTo] = useState('')
  const [filterStatus, setFilterStatus] = useState('')

  useEffect(() => { loadAll() }, [])

  async function loadAll() {
    setLoading(true)
    const [{ data: entriesData }, { data: agentsData }, { data: clientsData }] = await Promise.all([
      supabase
        .from('time_entries')
        .select('*, agent:profiles!agent_id(id,full_name,email), client:clients!client_id(id,full_name,address)')
        .order('clock_in_at', { ascending: false })
        .limit(500),
      supabase.from('profiles').select('*').eq('role', 'agent').eq('is_active', true).order('full_name'),
      supabase.from('clients').select('*').eq('is_active', true).order('full_name'),
    ])
    setEntries((entriesData || []) as EntryWithAll[])
    setAgents((agentsData || []) as Profile[])
    setClients((clientsData || []) as Client[])
    setLoading(false)
  }

  async function handleNewEntry(e: React.FormEvent) {
    e.preventDefault()
    setNewError('')
    if (!newForm.agent_id || !newForm.client_id || !newForm.clock_in) {
      setNewError('Agent, client and clock-in time are required.')
      return
    }
    const clockIn = new Date(newForm.clock_in).toISOString()
    const clockOut = newForm.clock_out ? new Date(newForm.clock_out).toISOString() : null

    if (clockOut && new Date(clockOut) <= new Date(clockIn)) {
      setNewError('Clock-out must be after clock-in.')
      return
    }
    const duration = clockOut
      ? Math.round((new Date(clockOut).getTime() - new Date(clockIn).getTime()) / 60000)
      : null

    setNewSaving(true)
    const { error } = await supabase.from('time_entries').insert({
      agent_id: newForm.agent_id,
      client_id: newForm.client_id,
      clock_in_at: clockIn,
      clock_out_at: clockOut,
      duration_minutes: duration,
      status: clockOut ? 'completed' : 'active',
    })
    setNewSaving(false)
    if (error) { setNewError(error.message); return }
    setShowNew(false)
    setNewForm({ agent_id: '', client_id: '', clock_in: toLocalInput(new Date().toISOString()), clock_out: '' })
    await loadAll()
  }

  async function handleClockOut(e: React.FormEvent) {
    e.preventDefault()
    if (!clockingOut || !clockOutTime) return
    setClockOutSaving(true)
    const clockOut = new Date(clockOutTime).toISOString()
    const duration = Math.round(
      (new Date(clockOut).getTime() - new Date(clockingOut.clock_in_at).getTime()) / 60000
    )
    await supabase.from('time_entries').update({
      clock_out_at: clockOut,
      duration_minutes: duration,
      status: 'completed',
    }).eq('id', clockingOut.id)
    setClockOutSaving(false)
    setClockingOut(null)
    setClockOutTime('')
    await loadAll()
  }

  async function handleForceClockOut(entry: EntryWithAll) {
    const now = new Date().toISOString()
    const duration = Math.round(
      (new Date(now).getTime() - new Date(entry.clock_in_at).getTime()) / 60000
    )
    const { data: { user } } = await supabase.auth.getUser()
    await supabase.from('time_entries').update({
      clock_out_at: now,
      duration_minutes: duration,
      status: 'corrected',
      correction_note: 'Clock-out forced by administrator',
      corrected_by: user?.id,
    }).eq('id', entry.id)
    await loadAll()
  }

  async function handleCorrect(e: React.FormEvent) {
    e.preventDefault()
    if (!correcting || !corrNote.trim()) return
    setCorrSaving(true)
    const { data: { user } } = await supabase.auth.getUser()
    const ci = corrClockIn || correcting.clock_in_at
    const co = corrClockOut || correcting.clock_out_at
    const duration = co ? Math.round((new Date(co).getTime() - new Date(ci).getTime()) / 60000) : null
    await supabase.from('time_entries').update({
      clock_in_at: ci,
      clock_out_at: co,
      duration_minutes: duration,
      status: 'corrected',
      correction_note: corrNote,
      corrected_by: user?.id,
    }).eq('id', correcting.id)
    setCorrSaving(false)
    setCorrecting(null)
    setCorrNote('')
    await loadAll()
  }

  function filtered() {
    return entries.filter(e => {
      if (filterAgent && e.agent?.id !== filterAgent) return false
      if (filterClient && e.client?.id !== filterClient) return false
      if (filterStatus && e.status !== filterStatus) return false
      if (filterFrom && new Date(e.clock_in_at) < new Date(filterFrom)) return false
      if (filterTo && new Date(e.clock_in_at) > new Date(filterTo + 'T23:59:59')) return false
      return true
    })
  }

  function exportExcel() {
    const rows = filtered().map(e => ({
      Agent: e.agent?.full_name || '',
      Client: e.client?.full_name || '',
      'Clock In': e.clock_in_at ? new Date(e.clock_in_at).toLocaleString('en-US') : '',
      'Clock Out': e.clock_out_at ? new Date(e.clock_out_at).toLocaleString('en-US') : '',
      'Duration (min)': e.duration_minutes || '',
      'Duration (h)': e.duration_minutes ? (e.duration_minutes / 60).toFixed(2) : '',
      Status: e.status,
      'GPS Alert': e.gps_alert ? 'Yes' : 'No',
    }))
    const ws = XLSX.utils.json_to_sheet(rows)
    const wb = XLSX.utils.book_new()
    XLSX.utils.book_append_sheet(wb, ws, 'Time Entries')
    XLSX.writeFile(wb, `time_entries_${new Date().toISOString().slice(0, 10)}.xlsx`)
  }

  const data = filtered()
  const activeCount = entries.filter(e => e.status === 'active').length
  const totalHours = entries.reduce((s, e) => s + (e.duration_minutes || 0), 0) / 60

  return (
    <div className="p-8 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="font-serif text-3xl font-bold text-warm-900">Time Entries</h1>
          <p className="text-warm-500 text-sm mt-1">{data.length} entries · {totalHours.toFixed(1)}h total</p>
        </div>
        <div className="flex gap-3">
          <button onClick={exportExcel} className="btn-secondary flex items-center gap-2">
            <Download size={16} /> Export
          </button>
          <button onClick={() => setShowNew(true)} className="btn-primary flex items-center gap-2">
            <Plus size={16} /> New Entry
          </button>
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-3 gap-4">
        <div className="card flex items-center gap-4">
          <div className="w-10 h-10 bg-amber-100 rounded-xl flex items-center justify-center">
            <Clock size={18} className="text-amber-600" />
          </div>
          <div>
            <p className="text-2xl font-bold text-warm-900">{activeCount}</p>
            <p className="text-warm-500 text-xs font-medium">Active sessions</p>
          </div>
        </div>
        <div className="card flex items-center gap-4">
          <div className="w-10 h-10 bg-sage-100 rounded-xl flex items-center justify-center">
            <LogIn size={18} className="text-sage-600" />
          </div>
          <div>
            <p className="text-2xl font-bold text-warm-900">{entries.filter(e => e.status === 'completed').length}</p>
            <p className="text-warm-500 text-xs font-medium">Completed today</p>
          </div>
        </div>
        <div className="card flex items-center gap-4">
          <div className="w-10 h-10 bg-terra-100 rounded-xl flex items-center justify-center">
            <LogOut size={18} className="text-terra-600" />
          </div>
          <div>
            <p className="text-2xl font-bold text-warm-900">{totalHours.toFixed(1)}h</p>
            <p className="text-warm-500 text-xs font-medium">Total hours</p>
          </div>
        </div>
      </div>

      {/* Filters */}
      <div className="card grid grid-cols-2 md:grid-cols-5 gap-3">
        <select className="input" value={filterAgent} onChange={e => setFilterAgent(e.target.value)}>
          <option value="">All agents</option>
          {agents.map(a => <option key={a.id} value={a.id}>{a.full_name}</option>)}
        </select>
        <select className="input" value={filterClient} onChange={e => setFilterClient(e.target.value)}>
          <option value="">All clients</option>
          {clients.map(c => <option key={c.id} value={c.id}>{c.full_name}</option>)}
        </select>
        <select className="input" value={filterStatus} onChange={e => setFilterStatus(e.target.value)}>
          <option value="">All statuses</option>
          <option value="active">Active</option>
          <option value="completed">Completed</option>
          <option value="corrected">Corrected</option>
        </select>
        <input type="date" className="input" value={filterFrom} onChange={e => setFilterFrom(e.target.value)} placeholder="From" />
        <input type="date" className="input" value={filterTo} onChange={e => setFilterTo(e.target.value)} placeholder="To" />
      </div>

      {/* Table */}
      <div className="card p-0 overflow-hidden">
        {loading ? (
          <div className="py-12 text-center text-warm-400">Loading...</div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr>
                  <th className="table-header">Agent</th>
                  <th className="table-header">Client</th>
                  <th className="table-header">Clock In</th>
                  <th className="table-header">Clock Out</th>
                  <th className="table-header">Duration</th>
                  <th className="table-header">Status</th>
                  <th className="table-header">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-warm-50">
                {data.map(e => (
                  <tr
                    key={e.id}
                    className={`hover:bg-warm-50 cursor-pointer ${e.gps_alert ? 'bg-amber-50/40' : ''}`}
                    onClick={() => setSelected(e)}
                  >
                    <td className="table-cell font-semibold text-warm-900">{e.agent?.full_name}</td>
                    <td className="table-cell text-warm-600">{e.client?.full_name}</td>
                    <td className="table-cell text-warm-500 text-xs">
                      {new Date(e.clock_in_at).toLocaleString('en-US', { month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit' })}
                    </td>
                    <td className="table-cell text-warm-500 text-xs">
                      {e.clock_out_at
                        ? new Date(e.clock_out_at).toLocaleString('en-US', { month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit' })
                        : <span className="text-amber-500 font-semibold">In progress…</span>}
                    </td>
                    <td className="table-cell font-bold text-sage-600">{formatDuration(e.duration_minutes)}</td>
                    <td className="table-cell" onClick={ev => ev.stopPropagation()}>
                      <div className="flex items-center gap-1">
                        <span className={`text-xs px-2 py-1 rounded-full font-semibold ${
                          e.status === 'active' ? 'bg-amber-100 text-amber-700' :
                          e.status === 'completed' ? 'bg-sage-100 text-sage-700' :
                          'bg-warm-200 text-warm-600'
                        }`}>{e.status}</span>
                        {e.gps_alert && <AlertTriangle size={13} className="text-amber-500" />}
                      </div>
                    </td>
                    <td className="table-cell" onClick={ev => ev.stopPropagation()}>
                      <div className="flex gap-2 flex-wrap">
                        {e.status === 'active' && (
                          <button
                            onClick={() => {
                              setClockingOut(e)
                              setClockOutTime(toLocalInput(new Date().toISOString()))
                            }}
                            className="text-xs bg-sage-600 hover:bg-sage-700 text-white px-2 py-1 rounded-lg font-semibold"
                          >
                            Clock Out
                          </button>
                        )}
                        {e.status === 'active' && (
                          <button onClick={() => handleForceClockOut(e)} className="text-xs text-red-500 hover:text-red-700 font-medium">
                            Force
                          </button>
                        )}
                        <button
                          onClick={() => {
                            setCorrecting(e)
                            setCorrClockIn(toLocalInput(e.clock_in_at))
                            setCorrClockOut(e.clock_out_at ? toLocalInput(e.clock_out_at) : '')
                            setCorrNote('')
                          }}
                          className="text-xs text-warm-400 hover:text-warm-700 font-medium"
                        >
                          Edit
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
                {data.length === 0 && (
                  <tr><td colSpan={7} className="py-12 text-center text-warm-400">No time entries found</td></tr>
                )}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* ── New Entry Modal ── */}
      {showNew && (
        <div className="fixed inset-0 bg-black/40 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl p-6 w-full max-w-md shadow-strong" onClick={e => e.stopPropagation()}>
            <div className="flex justify-between items-center mb-5">
              <div>
                <h2 className="font-serif text-xl font-bold text-warm-900">New Time Entry</h2>
                <p className="text-warm-500 text-sm">Manually record a clock-in / clock-out</p>
              </div>
              <button onClick={() => setShowNew(false)}><X size={20} className="text-warm-400" /></button>
            </div>
            <form onSubmit={handleNewEntry} className="space-y-4">
              <div>
                <label className="label">Agent <span className="text-red-400">*</span></label>
                <select className="input" value={newForm.agent_id} onChange={e => setNewForm(f => ({ ...f, agent_id: e.target.value }))} required>
                  <option value="">Select an agent…</option>
                  {agents.map(a => <option key={a.id} value={a.id}>{a.full_name}</option>)}
                </select>
              </div>
              <div>
                <label className="label">Client <span className="text-red-400">*</span></label>
                <select className="input" value={newForm.client_id} onChange={e => setNewForm(f => ({ ...f, client_id: e.target.value }))} required>
                  <option value="">Select a client…</option>
                  {clients.map(c => <option key={c.id} value={c.id}>{c.full_name}</option>)}
                </select>
              </div>
              <div>
                <label className="label">Clock-In <span className="text-red-400">*</span></label>
                <input type="datetime-local" className="input" value={newForm.clock_in}
                  onChange={e => setNewForm(f => ({ ...f, clock_in: e.target.value }))} required />
              </div>
              <div>
                <label className="label">Clock-Out <span className="text-warm-400 text-xs font-normal">(optional — leave empty for active session)</span></label>
                <input type="datetime-local" className="input" value={newForm.clock_out}
                  onChange={e => setNewForm(f => ({ ...f, clock_out: e.target.value }))} />
              </div>

              {newForm.clock_in && newForm.clock_out && (
                <div className="bg-sage-50 border border-sage-200 rounded-xl px-4 py-3 text-sm">
                  <span className="text-sage-600 font-semibold">Duration: </span>
                  <span className="text-sage-700 font-bold">
                    {formatDuration(Math.round((new Date(newForm.clock_out).getTime() - new Date(newForm.clock_in).getTime()) / 60000))}
                  </span>
                </div>
              )}

              {newError && (
                <div className="bg-red-50 border border-red-200 text-red-700 text-sm rounded-xl px-4 py-3">{newError}</div>
              )}
              <div className="flex gap-3 pt-2">
                <button type="button" onClick={() => setShowNew(false)} className="btn-secondary flex-1">Cancel</button>
                <button type="submit" disabled={newSaving} className="btn-primary flex-1 disabled:opacity-50">
                  {newSaving ? 'Saving…' : 'Save Entry'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ── Clock-Out Modal ── */}
      {clockingOut && (
        <div className="fixed inset-0 bg-black/40 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl p-6 w-full max-w-sm shadow-strong">
            <div className="flex justify-between items-center mb-5">
              <h2 className="font-serif text-xl font-bold text-warm-900">Clock Out</h2>
              <button onClick={() => setClockingOut(null)}><X size={20} className="text-warm-400" /></button>
            </div>
            <p className="text-warm-600 text-sm mb-4">
              <strong>{clockingOut.agent?.full_name}</strong> → {clockingOut.client?.full_name}
            </p>
            <p className="text-warm-500 text-xs mb-4">
              Clocked in: {new Date(clockingOut.clock_in_at).toLocaleString('en-US', { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' })}
            </p>
            <form onSubmit={handleClockOut} className="space-y-4">
              <div>
                <label className="label">Clock-Out Time</label>
                <input type="datetime-local" className="input" value={clockOutTime}
                  onChange={e => setClockOutTime(e.target.value)} required />
              </div>
              {clockOutTime && (
                <div className="bg-sage-50 border border-sage-200 rounded-xl px-4 py-3 text-sm">
                  <span className="text-sage-600 font-semibold">Duration: </span>
                  <span className="text-sage-700 font-bold">
                    {formatDuration(Math.round((new Date(clockOutTime).getTime() - new Date(clockingOut.clock_in_at).getTime()) / 60000))}
                  </span>
                </div>
              )}
              <div className="flex gap-3">
                <button type="button" onClick={() => setClockingOut(null)} className="btn-secondary flex-1">Cancel</button>
                <button type="submit" disabled={clockOutSaving} className="btn-primary flex-1 disabled:opacity-50">
                  {clockOutSaving ? 'Saving…' : 'Confirm Clock-Out'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ── Detail Modal ── */}
      {selected && (
        <div className="fixed inset-0 bg-black/40 z-50 flex items-center justify-center p-4" onClick={() => setSelected(null)}>
          <div className="bg-white rounded-2xl p-6 w-full max-w-lg" onClick={e => e.stopPropagation()}>
            <div className="flex justify-between items-start mb-5">
              <h2 className="font-serif text-xl font-bold text-warm-900">Entry Details</h2>
              <button onClick={() => setSelected(null)}><X size={20} className="text-warm-400" /></button>
            </div>
            <div className="space-y-3">
              <div className="grid grid-cols-2 gap-3">
                <div className="bg-warm-50 rounded-xl p-4">
                  <p className="text-xs text-warm-400 mb-1">Agent</p>
                  <p className="font-semibold text-warm-900">{selected.agent?.full_name}</p>
                </div>
                <div className="bg-warm-50 rounded-xl p-4">
                  <p className="text-xs text-warm-400 mb-1">Client</p>
                  <p className="font-semibold text-warm-900">{selected.client?.full_name}</p>
                </div>
                <div className="bg-warm-50 rounded-xl p-4">
                  <p className="text-xs text-warm-400 mb-1">Clock In</p>
                  <p className="font-semibold text-warm-900 text-sm">{new Date(selected.clock_in_at).toLocaleString('en-US')}</p>
                </div>
                <div className="bg-warm-50 rounded-xl p-4">
                  <p className="text-xs text-warm-400 mb-1">Clock Out</p>
                  <p className="font-semibold text-warm-900 text-sm">{selected.clock_out_at ? new Date(selected.clock_out_at).toLocaleString('en-US') : '—'}</p>
                </div>
              </div>
              <div className="bg-sage-50 rounded-xl p-4 text-center">
                <p className="text-xs text-sage-500 mb-1">Total Duration</p>
                <p className="text-2xl font-bold text-sage-700">{formatDuration(selected.duration_minutes)}</p>
              </div>
              {selected.clock_in_latitude && selected.clock_in_longitude && (
                <a href={`https://maps.google.com/?q=${selected.clock_in_latitude},${selected.clock_in_longitude}`}
                  target="_blank" className="flex items-center gap-2 text-sage-600 hover:text-sage-800 text-sm">
                  <MapPin size={16} /> View clock-in location
                </a>
              )}
              {selected.gps_alert && (
                <div className="bg-amber-50 border border-amber-200 rounded-xl px-4 py-3 flex items-center gap-2">
                  <AlertTriangle size={16} className="text-amber-600" />
                  <p className="text-sm text-amber-800">GPS Alert — {selected.gps_distance_meters?.toFixed(0)}m from client</p>
                </div>
              )}
              {selected.correction_note && (
                <div className="bg-warm-100 rounded-xl px-4 py-3">
                  <p className="text-xs text-warm-500 font-semibold mb-1">Correction Note</p>
                  <p className="text-sm text-warm-800">{selected.correction_note}</p>
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* ── Correction Modal ── */}
      {correcting && (
        <div className="fixed inset-0 bg-black/40 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl p-6 w-full max-w-md">
            <h2 className="font-serif text-xl font-bold text-warm-900 mb-1">Edit Time Entry</h2>
            <p className="text-warm-500 text-sm mb-5">{correcting.agent?.full_name} → {correcting.client?.full_name}</p>
            <form onSubmit={handleCorrect} className="space-y-4">
              <div>
                <label className="label">Clock-in Time</label>
                <input type="datetime-local" className="input" value={corrClockIn} onChange={e => setCorrClockIn(e.target.value)} required />
              </div>
              <div>
                <label className="label">Clock-out Time</label>
                <input type="datetime-local" className="input" value={corrClockOut} onChange={e => setCorrClockOut(e.target.value)} />
              </div>
              {corrClockIn && corrClockOut && (
                <div className="bg-sage-50 rounded-xl px-4 py-3 text-sm">
                  <span className="text-sage-600 font-semibold">Duration: </span>
                  <span className="text-sage-700 font-bold">
                    {formatDuration(Math.round((new Date(corrClockOut).getTime() - new Date(corrClockIn).getTime()) / 60000))}
                  </span>
                </div>
              )}
              <div>
                <label className="label">Reason <span className="text-red-400">*</span></label>
                <textarea className="input resize-none" rows={3} placeholder="Explain the correction…"
                  value={corrNote} onChange={e => setCorrNote(e.target.value)} required />
              </div>
              <div className="flex gap-3">
                <button type="button" onClick={() => setCorrecting(null)} className="btn-secondary flex-1">Cancel</button>
                <button type="submit" disabled={corrSaving} className="btn-primary flex-1 disabled:opacity-50">
                  {corrSaving ? 'Saving…' : 'Save Correction'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  )
}
