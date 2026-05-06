'use client'
import { useEffect, useState } from 'react'
import Link from 'next/link'
import { createClient } from '@/lib/supabase'
import type { Profile } from '@caretrack/shared'
import { UserPlus, Search } from 'lucide-react'

export default function AgentsPage() {
  const supabase = createClient()
  const [agents, setAgents] = useState<Profile[]>([])
  const [search, setSearch] = useState('')
  const [showForm, setShowForm] = useState(false)
  const [loading, setLoading] = useState(true)
  const [form, setForm] = useState({
    full_name: '', email: '', phone: '', hourly_rate: '15', password: '',
  })
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')

  useEffect(() => { loadAgents() }, [])

  async function loadAgents() {
    setLoading(true)
    const { data } = await supabase
      .from('profiles')
      .select('*')
      .eq('role', 'agent')
      .order('full_name')
    setAgents((data || []) as Profile[])
    setLoading(false)
  }

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
      if (!res.ok) throw new Error(json.error || 'Erreur')
      setShowForm(false)
      setForm({ full_name: '', email: '', phone: '', hourly_rate: '15', password: '' })
      await loadAgents()
    } catch (err: any) {
      setError(err.message)
    } finally {
      setSaving(false)
    }
  }

  const filtered = agents.filter(a =>
    a.full_name.toLowerCase().includes(search.toLowerCase()) ||
    a.email.toLowerCase().includes(search.toLowerCase())
  )

  return (
    <div className="p-8 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Agents</h1>
          <p className="text-gray-500 text-sm mt-1">{agents.length} agents enregistrés</p>
        </div>
        <button onClick={() => setShowForm(true)} className="btn-primary flex items-center gap-2">
          <UserPlus size={18} /> Nouvel Agent
        </button>
      </div>

      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={18} />
        <input
          className="input pl-10"
          placeholder="Rechercher un agent..."
          value={search}
          onChange={e => setSearch(e.target.value)}
        />
      </div>

      {showForm && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl p-8 w-full max-w-md">
            <h2 className="text-xl font-bold text-gray-900 mb-6">Nouvel Agent</h2>
            <form onSubmit={handleCreate} className="space-y-4">
              {error && <p className="text-sm text-red-600 bg-red-50 px-4 py-3 rounded-lg">{error}</p>}
              <div>
                <label className="label">Nom complet</label>
                <input className="input" value={form.full_name} onChange={e => setForm({ ...form, full_name: e.target.value })} required />
              </div>
              <div>
                <label className="label">Email</label>
                <input type="email" className="input" value={form.email} onChange={e => setForm({ ...form, email: e.target.value })} required />
              </div>
              <div>
                <label className="label">Téléphone</label>
                <input className="input" value={form.phone} onChange={e => setForm({ ...form, phone: e.target.value })} />
              </div>
              <div>
                <label className="label">Taux horaire ($/h)</label>
                <input type="number" step="0.01" min="0" className="input" value={form.hourly_rate} onChange={e => setForm({ ...form, hourly_rate: e.target.value })} required />
              </div>
              <div>
                <label className="label">Mot de passe temporaire</label>
                <input type="password" className="input" value={form.password} onChange={e => setForm({ ...form, password: e.target.value })} required minLength={6} />
              </div>
              <div className="flex gap-3 pt-2">
                <button type="button" className="btn-secondary flex-1" onClick={() => setShowForm(false)}>Annuler</button>
                <button type="submit" className="btn-primary flex-1" disabled={saving}>
                  {saving ? 'Création...' : 'Créer'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      <div className="card p-0 overflow-hidden">
        {loading ? (
          <div className="py-12 text-center text-gray-400">Chargement...</div>
        ) : (
          <table className="w-full">
            <thead className="border-b border-gray-100">
              <tr>
                <th className="table-header">Nom</th>
                <th className="table-header">Email</th>
                <th className="table-header">Téléphone</th>
                <th className="table-header">Taux horaire</th>
                <th className="table-header">Statut</th>
                <th className="table-header"></th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50">
              {filtered.map(agent => (
                <tr key={agent.id} className="hover:bg-gray-50">
                  <td className="table-cell">
                    <div className="flex items-center gap-3">
                      <div className="w-8 h-8 rounded-full bg-blue-100 flex items-center justify-center">
                        <span className="text-blue-600 font-semibold text-sm">{agent.full_name[0]}</span>
                      </div>
                      <span className="font-medium text-gray-900">{agent.full_name}</span>
                    </div>
                  </td>
                  <td className="table-cell text-gray-500">{agent.email}</td>
                  <td className="table-cell text-gray-500">{agent.phone || '—'}</td>
                  <td className="table-cell font-semibold">${agent.hourly_rate}/h</td>
                  <td className="table-cell">
                    <span className={`inline-flex items-center gap-1 text-xs font-semibold px-2.5 py-1 rounded-full ${
                      agent.is_active ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-500'
                    }`}>
                      <span className={`w-1.5 h-1.5 rounded-full ${agent.is_active ? 'bg-green-500' : 'bg-gray-400'}`} />
                      {agent.is_active ? 'Actif' : 'Inactif'}
                    </span>
                  </td>
                  <td className="table-cell">
                    <Link href={`/agents/${agent.id}`} className="text-blue-600 hover:text-blue-800 text-sm font-medium">
                      Voir →
                    </Link>
                  </td>
                </tr>
              ))}
              {filtered.length === 0 && (
                <tr><td colSpan={6} className="text-center py-8 text-gray-400">Aucun agent trouvé</td></tr>
              )}
            </tbody>
          </table>
        )}
      </div>
    </div>
  )
}
