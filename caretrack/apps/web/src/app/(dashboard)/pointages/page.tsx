'use client'
import { useEffect, useState } from 'react'
import { createClient } from '@/lib/supabase'
import { formatDuration } from '@/lib/types'
import type { TimeEntryWithRelations, Profile, Client } from '@/lib/types'
import { Download, MapPin, X, AlertTriangle } from 'lucide-react'
import * as XLSX from 'xlsx'

interface EntryWithAll extends TimeEntryWithRelations {
  agent: Pick<Profile, 'id' | 'full_name' | 'email'>
  client: Pick<Client, 'id' | 'full_name' | 'address'>
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
      supabase.from('profiles').select('*').eq('role', 'agent').order('full_name'),
      supabase.from('clients').select('*').order('full_name'),
    ])
    setEntries((entriesData || []) as EntryWithAll[])
    setAgents((agentsData || []) as Profile[])
    setClients((clientsData || []) as Client[])
    setLoading(false)
  }

  async function handleForceClockOut(entry: EntryWithAll) {
    const { data: { user } } = await supabase.auth.getUser()
    await supabase.from('time_entries').update({
      clock_out_at: new Date().toISOString(),
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
    await supabase.from('time_entries').update({
      clock_in_at: corrClockIn || correcting.clock_in_at,
      clock_out_at: corrClockOut || correcting.clock_out_at,
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
      Status: e.status,
      'GPS Alert': e.gps_alert ? 'Yes' : 'No',
      'Correction Note': e.correction_note || '',
    }))
    const ws = XLSX.utils.json_to_sheet(rows)
    const wb = XLSX.utils.book_new()
    XLSX.utils.book_append_sheet(wb, ws, 'Time Entries')
    XLSX.writeFile(wb, `time_entries_${new Date().toISOString().slice(0, 10)}.xlsx`)
  }

  const data = filtered()

  return (
    <div className="p-8 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Time Entries</h1>
          <p className="text-gray-500 text-sm mt-1">{data.length} entries displayed</p>
        </div>
        <button onClick={exportExcel} className="btn-secondary flex items-center gap-2">
          <Download size={18} /> Export Excel
        </button>
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
        <input type="date" className="input" value={filterFrom} onChange={e => setFilterFrom(e.target.value)} />
        <input type="date" className="input" value={filterTo} onChange={e => setFilterTo(e.target.value)} />
      </div>

      {/* Table */}
      <div className="card p-0 overflow-hidden">
        {loading ? (
          <div className="py-12 text-center text-gray-400">Loading...</div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="border-b border-gray-100">
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
              <tbody className="divide-y divide-gray-50">
                {data.map(e => (
                  <tr
                    key={e.id}
                    className={`hover:bg-gray-50 cursor-pointer ${e.gps_alert ? 'bg-amber-50' : ''}`}
                    onClick={() => setSelected(e)}
                  >
                    <td className="table-cell font-medium">{e.agent?.full_name}</td>
                    <td className="table-cell text-gray-600">{e.client?.full_name}</td>
                    <td className="table-cell text-gray-500 text-xs">
                      {new Date(e.clock_in_at).toLocaleString('en-US', { month:'2-digit', day:'2-digit', hour:'2-digit', minute:'2-digit' })}
                    </td>
                    <td className="table-cell text-gray-500 text-xs">
                      {e.clock_out_at ? new Date(e.clock_out_at).toLocaleString('en-US', { month:'2-digit', day:'2-digit', hour:'2-digit', minute:'2-digit' }) : '—'}
                    </td>
                    <td className="table-cell font-semibold text-blue-600">{formatDuration(e.duration_minutes)}</td>
                    <td className="table-cell" onClick={ev => ev.stopPropagation()}>
                      <div className="flex items-center gap-1">
                        <span className={`text-xs px-2 py-1 rounded-full font-semibold ${
                          e.status === 'active' ? 'bg-amber-100 text-amber-700' :
                          e.status === 'completed' ? 'bg-green-100 text-green-700' :
                          'bg-purple-100 text-purple-700'
                        }`}>{e.status}</span>
                        {e.gps_alert && <AlertTriangle size={14} className="text-amber-500" />}
                      </div>
                    </td>
                    <td className="table-cell" onClick={ev => ev.stopPropagation()}>
                      <div className="flex gap-2">
                        {e.status === 'active' && (
                          <button
                            onClick={() => handleForceClockOut(e)}
                            className="text-xs text-red-600 hover:text-red-800 font-medium"
                          >
                            Force Clock-Out
                          </button>
                        )}
                        <button
                          onClick={() => {
                            setCorrecting(e)
                            setCorrClockIn(e.clock_in_at.slice(0, 16))
                            setCorrClockOut(e.clock_out_at?.slice(0, 16) || '')
                            setCorrNote('')
                          }}
                          className="text-xs text-blue-600 hover:text-blue-800 font-medium"
                        >
                          Correct
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
                {data.length === 0 && (
                  <tr><td colSpan={7} className="py-8 text-center text-gray-400">No time entries</td></tr>
                )}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Detail modal */}
      {selected && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4" onClick={() => setSelected(null)}>
          <div className="bg-white rounded-2xl p-6 w-full max-w-lg" onClick={e => e.stopPropagation()}>
            <div className="flex justify-between items-start mb-6">
              <h2 className="text-xl font-bold text-gray-900">Time Entry Details</h2>
              <button onClick={() => setSelected(null)}><X size={20} className="text-gray-400" /></button>
            </div>
            <div className="space-y-3">
              <div className="grid grid-cols-2 gap-3">
                <div className="bg-gray-50 rounded-xl p-4">
                  <p className="text-xs text-gray-400 mb-1">Agent</p>
                  <p className="font-semibold">{selected.agent?.full_name}</p>
                </div>
                <div className="bg-gray-50 rounded-xl p-4">
                  <p className="text-xs text-gray-400 mb-1">Client</p>
                  <p className="font-semibold">{selected.client?.full_name}</p>
                </div>
              </div>
              <div className="grid grid-cols-2 gap-3">
                {selected.clock_in_photo_url && (
                  <div>
                    <p className="text-xs text-gray-400 mb-2">Clock-in photo</p>
                    <img src={selected.clock_in_photo_url} alt="Clock In" className="rounded-xl w-full object-cover h-32" />
                  </div>
                )}
                {selected.clock_out_photo_url && (
                  <div>
                    <p className="text-xs text-gray-400 mb-2">Clock-out photo</p>
                    <img src={selected.clock_out_photo_url} alt="Clock Out" className="rounded-xl w-full object-cover h-32" />
                  </div>
                )}
              </div>
              {selected.clock_in_latitude && selected.clock_in_longitude && (
                <a
                  href={`https://maps.google.com/?q=${selected.clock_in_latitude},${selected.clock_in_longitude}`}
                  target="_blank"
                  className="flex items-center gap-2 text-blue-600 hover:text-blue-800 text-sm"
                >
                  <MapPin size={16} /> View clock-in location on Google Maps
                </a>
              )}
              {selected.gps_alert && (
                <div className="bg-amber-50 border border-amber-200 rounded-xl px-4 py-3 flex items-center gap-2">
                  <AlertTriangle size={16} className="text-amber-600" />
                  <p className="text-sm text-amber-800">
                    GPS Alert — Distance: {selected.gps_distance_meters?.toFixed(0)}m from client's home
                  </p>
                </div>
              )}
              {selected.correction_note && (
                <div className="bg-purple-50 rounded-xl px-4 py-3">
                  <p className="text-xs text-purple-600 font-semibold mb-1">Correction Note</p>
                  <p className="text-sm text-purple-900">{selected.correction_note}</p>
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Correction modal */}
      {correcting && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl p-6 w-full max-w-md">
            <h2 className="text-xl font-bold text-gray-900 mb-1">Correct a Time Entry</h2>
            <p className="text-sm text-gray-500 mb-6">
              {correcting.agent?.full_name} → {correcting.client?.full_name}
            </p>
            <form onSubmit={handleCorrect} className="space-y-4">
              <div>
                <label className="label">Clock-in Time</label>
                <input type="datetime-local" className="input" value={corrClockIn} onChange={e => setCorrClockIn(e.target.value)} required />
              </div>
              <div>
                <label className="label">Clock-out Time</label>
                <input type="datetime-local" className="input" value={corrClockOut} onChange={e => setCorrClockOut(e.target.value)} />
              </div>
              <div>
                <label className="label">Correction Note <span className="text-red-500">*</span></label>
                <textarea
                  className="input resize-none"
                  rows={3}
                  placeholder="Explain the reason for this correction..."
                  value={corrNote}
                  onChange={e => setCorrNote(e.target.value)}
                  required
                />
              </div>
              <div className="flex gap-3">
                <button type="button" className="btn-secondary flex-1" onClick={() => setCorrecting(null)}>Cancel</button>
                <button type="submit" className="btn-primary flex-1" disabled={corrSaving}>
                  {corrSaving ? 'Saving...' : 'Correct'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  )
}
