'use client'
import { useEffect, useState } from 'react'
import Link from 'next/link'
import { createClient } from '@/lib/supabase'
import type { Client } from '@/lib/types'
import { UserPlus, Search, MapPin, Pencil, X, Save } from 'lucide-react'

type EditForm = {
  full_name: string; address: string; phone: string
  email: string; notes: string; latitude: string; longitude: string
}

export default function ClientsPage() {
  const supabase = createClient()
  const [clients, setClients] = useState<Client[]>([])
  const [search, setSearch] = useState('')
  const [showForm, setShowForm] = useState(false)
  const [loading, setLoading] = useState(true)
  const [form, setForm] = useState<EditForm>({
    full_name: '', address: '', phone: '', email: '', notes: '',
    latitude: '', longitude: '',
  })
  const [saving, setSaving] = useState(false)
  const [editing, setEditing] = useState<Client | null>(null)
  const [editForm, setEditForm] = useState<EditForm>({
    full_name: '', address: '', phone: '', email: '', notes: '',
    latitude: '', longitude: '',
  })
  const [editSaving, setEditSaving] = useState(false)

  useEffect(() => { loadClients() }, [])

  async function loadClients() {
    setLoading(true)
    const { data } = await supabase.from('clients').select('*').order('full_name')
    setClients((data || []) as Client[])
    setLoading(false)
  }

  async function handleCreate(e: React.FormEvent) {
    e.preventDefault()
    setSaving(true)
    const { data: { user } } = await supabase.auth.getUser()
    await supabase.from('clients').insert({
      ...form,
      latitude: form.latitude ? parseFloat(form.latitude) : null,
      longitude: form.longitude ? parseFloat(form.longitude) : null,
      created_by: user?.id,
    })
    setSaving(false)
    setShowForm(false)
    setForm({ full_name: '', address: '', phone: '', email: '', notes: '', latitude: '', longitude: '' })
    await loadClients()
  }

  function openEdit(client: Client) {
    setEditing(client)
    setEditForm({
      full_name: client.full_name || '',
      address: client.address || '',
      phone: client.phone || '',
      email: client.email || '',
      notes: client.notes || '',
      latitude: client.latitude != null ? String(client.latitude) : '',
      longitude: client.longitude != null ? String(client.longitude) : '',
    })
  }

  async function handleEdit(e: React.FormEvent) {
    e.preventDefault()
    if (!editing || !editForm.full_name.trim()) return
    setEditSaving(true)
    await supabase.from('clients').update({
      full_name: editForm.full_name.trim(),
      address: editForm.address.trim() || null,
      phone: editForm.phone.trim() || null,
      email: editForm.email.trim() || null,
      notes: editForm.notes.trim() || null,
      latitude: editForm.latitude ? parseFloat(editForm.latitude) : null,
      longitude: editForm.longitude ? parseFloat(editForm.longitude) : null,
    }).eq('id', editing.id)
    setEditSaving(false)
    setEditing(null)
    await loadClients()
  }

  async function toggleActive(client: Client) {
    await supabase.from('clients').update({ is_active: !client.is_active }).eq('id', client.id)
    await loadClients()
  }

  const filtered = clients.filter(c =>
    c.full_name.toLowerCase().includes(search.toLowerCase()) ||
    (c.address || '').toLowerCase().includes(search.toLowerCase())
  )

  return (
    <div className="p-8 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Clients</h1>
          <p className="text-gray-500 text-sm mt-1">{clients.length} client{clients.length !== 1 ? 's' : ''} registered</p>
        </div>
        <button onClick={() => setShowForm(true)} className="btn-primary flex items-center gap-2">
          <UserPlus size={18} /> New Client
        </button>
      </div>

      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={18} />
        <input className="input pl-10" placeholder="Search for a client..." value={search} onChange={e => setSearch(e.target.value)} />
      </div>

      {/* Create modal */}
      {showForm && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl p-8 w-full max-w-md max-h-screen overflow-y-auto">
            <div className="flex justify-between items-center mb-6">
              <h2 className="text-xl font-bold text-gray-900">New Client</h2>
              <button onClick={() => setShowForm(false)}><X size={20} className="text-gray-400" /></button>
            </div>
            <form onSubmit={handleCreate} className="space-y-4">
              <div>
                <label className="label">Full Name *</label>
                <input className="input" value={form.full_name} onChange={e => setForm({ ...form, full_name: e.target.value })} required />
              </div>
              <div>
                <label className="label">Address</label>
                <input className="input" value={form.address} onChange={e => setForm({ ...form, address: e.target.value })} />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="label">GPS Latitude</label>
                  <input type="number" step="any" className="input" value={form.latitude} onChange={e => setForm({ ...form, latitude: e.target.value })} placeholder="48.8566" />
                </div>
                <div>
                  <label className="label">GPS Longitude</label>
                  <input type="number" step="any" className="input" value={form.longitude} onChange={e => setForm({ ...form, longitude: e.target.value })} placeholder="2.3522" />
                </div>
              </div>
              <div>
                <label className="label">Phone</label>
                <input className="input" value={form.phone} onChange={e => setForm({ ...form, phone: e.target.value })} />
              </div>
              <div>
                <label className="label">Email</label>
                <input type="email" className="input" value={form.email} onChange={e => setForm({ ...form, email: e.target.value })} />
              </div>
              <div>
                <label className="label">Notes</label>
                <textarea className="input resize-none" rows={3} value={form.notes} onChange={e => setForm({ ...form, notes: e.target.value })} />
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

      {/* Edit modal */}
      {editing && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl p-8 w-full max-w-md max-h-screen overflow-y-auto">
            <div className="flex justify-between items-center mb-6">
              <h2 className="text-xl font-bold text-gray-900">Edit Client</h2>
              <button onClick={() => setEditing(null)}><X size={20} className="text-gray-400" /></button>
            </div>
            <form onSubmit={handleEdit} className="space-y-4">
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
                <button type="button" className="btn-secondary flex-1" onClick={() => setEditing(null)}>Cancel</button>
                <button type="submit" className="btn-primary flex-1 flex items-center justify-center gap-1" disabled={editSaving}>
                  <Save size={15} /> {editSaving ? 'Saving...' : 'Save'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      <div className="card p-0 overflow-hidden">
        {loading ? (
          <div className="py-12 text-center text-gray-400">Loading...</div>
        ) : (
          <table className="w-full">
            <thead className="border-b border-gray-100">
              <tr>
                <th className="table-header">Name</th>
                <th className="table-header">Address</th>
                <th className="table-header">Phone</th>
                <th className="table-header">GPS</th>
                <th className="table-header">Status</th>
                <th className="table-header">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50">
              {filtered.map(client => (
                <tr key={client.id} className="hover:bg-gray-50">
                  <td className="table-cell font-medium text-gray-900">{client.full_name}</td>
                  <td className="table-cell text-gray-500 max-w-xs truncate">{client.address || '—'}</td>
                  <td className="table-cell text-gray-500">{client.phone || '—'}</td>
                  <td className="table-cell">
                    {client.latitude && client.longitude ? (
                      <a
                        href={`https://maps.google.com/?q=${client.latitude},${client.longitude}`}
                        target="_blank"
                        className="flex items-center gap-1 text-blue-600 hover:text-blue-800 text-xs"
                      >
                        <MapPin size={14} /> View
                      </a>
                    ) : (
                      <span className="text-gray-300 text-xs">—</span>
                    )}
                  </td>
                  <td className="table-cell">
                    <button
                      onClick={() => toggleActive(client)}
                      className={`text-xs font-semibold px-2.5 py-1 rounded-full cursor-pointer hover:opacity-80 transition-opacity ${
                        client.is_active ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-500'
                      }`}
                      title={client.is_active ? 'Click to deactivate' : 'Click to reactivate'}
                    >
                      {client.is_active ? 'Active' : 'Inactive'}
                    </button>
                  </td>
                  <td className="table-cell">
                    <div className="flex items-center gap-3">
                      <button
                        onClick={() => openEdit(client)}
                        className="text-gray-400 hover:text-blue-600 transition-colors"
                        title="Edit"
                      >
                        <Pencil size={15} />
                      </button>
                      <Link href={`/clients/${client.id}`} className="text-blue-600 hover:text-blue-800 text-sm font-medium">View →</Link>
                    </div>
                  </td>
                </tr>
              ))}
              {filtered.length === 0 && (
                <tr><td colSpan={6} className="text-center py-8 text-gray-400">No clients found</td></tr>
              )}
            </tbody>
          </table>
        )}
      </div>
    </div>
  )
}
