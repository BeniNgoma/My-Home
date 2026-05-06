'use client'
import { useEffect, useState } from 'react'
import Link from 'next/link'
import { createClient } from '@/lib/supabase'
import type { PayrollPeriod } from '@caretrack/shared'
import { Plus, Calendar } from 'lucide-react'

const STATUS_STYLES = {
  draft:      'bg-gray-100 text-gray-600',
  finalized:  'bg-blue-100 text-blue-700',
  paid:       'bg-green-100 text-green-700',
}
const STATUS_LABELS = {
  draft: 'Brouillon',
  finalized: 'Finalisé',
  paid: 'Payé',
}

export default function PaiePage() {
  const supabase = createClient()
  const [periods, setPeriods] = useState<PayrollPeriod[]>([])
  const [showForm, setShowForm] = useState(false)
  const [loading, setLoading] = useState(true)
  const [form, setForm] = useState({ name: '', period_start: '', period_end: '' })
  const [saving, setSaving] = useState(false)

  useEffect(() => { loadPeriods() }, [])

  async function loadPeriods() {
    setLoading(true)
    const { data } = await supabase.from('payroll_periods').select('*').order('period_start', { ascending: false })
    setPeriods((data || []) as PayrollPeriod[])
    setLoading(false)
  }

  async function handleCreate(e: React.FormEvent) {
    e.preventDefault()
    setSaving(true)
    const { data: { user } } = await supabase.auth.getUser()
    await supabase.from('payroll_periods').insert({ ...form, created_by: user?.id })
    setSaving(false)
    setShowForm(false)
    setForm({ name: '', period_start: '', period_end: '' })
    await loadPeriods()
  }

  return (
    <div className="p-8 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Paie</h1>
          <p className="text-gray-500 text-sm mt-1">Gestion des périodes de paie</p>
        </div>
        <button onClick={() => setShowForm(true)} className="btn-primary flex items-center gap-2">
          <Plus size={18} /> Nouvelle Période
        </button>
      </div>

      {showForm && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl p-8 w-full max-w-md">
            <h2 className="text-xl font-bold text-gray-900 mb-6">Nouvelle période de paie</h2>
            <form onSubmit={handleCreate} className="space-y-4">
              <div>
                <label className="label">Nom de la période</label>
                <input className="input" placeholder="Paie Mai 2026" value={form.name} onChange={e => setForm({ ...form, name: e.target.value })} required />
              </div>
              <div>
                <label className="label">Date de début</label>
                <input type="date" className="input" value={form.period_start} onChange={e => setForm({ ...form, period_start: e.target.value })} required />
              </div>
              <div>
                <label className="label">Date de fin</label>
                <input type="date" className="input" value={form.period_end} onChange={e => setForm({ ...form, period_end: e.target.value })} required />
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

      <div className="space-y-3">
        {loading ? (
          <div className="card py-12 text-center text-gray-400">Chargement...</div>
        ) : periods.length === 0 ? (
          <div className="card py-12 text-center text-gray-400">
            <Calendar size={40} className="mx-auto mb-3 text-gray-300" />
            <p>Aucune période de paie</p>
            <p className="text-sm mt-1">Créez votre première période en cliquant sur "Nouvelle Période"</p>
          </div>
        ) : (
          periods.map(p => (
            <Link key={p.id} href={`/paie/${p.id}`} className="card flex items-center justify-between hover:shadow-md transition-shadow">
              <div className="flex items-center gap-4">
                <div className="p-3 bg-blue-50 rounded-xl">
                  <Calendar size={22} className="text-blue-600" />
                </div>
                <div>
                  <h3 className="font-semibold text-gray-900">{p.name}</h3>
                  <p className="text-sm text-gray-500 mt-0.5">
                    {new Date(p.period_start).toLocaleDateString('fr-FR')} — {new Date(p.period_end).toLocaleDateString('fr-FR')}
                  </p>
                </div>
              </div>
              <div className="flex items-center gap-4">
                <span className={`text-xs font-semibold px-3 py-1.5 rounded-full ${STATUS_STYLES[p.status]}`}>
                  {STATUS_LABELS[p.status]}
                </span>
                <span className="text-gray-400">→</span>
              </div>
            </Link>
          ))
        )}
      </div>
    </div>
  )
}
