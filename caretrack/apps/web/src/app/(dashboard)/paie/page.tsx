'use client'
import { useEffect, useState } from 'react'
import Link from 'next/link'
import { createClient } from '@/lib/supabase'
import type { PayrollPeriod } from '@/lib/types'
import { Plus, Calendar } from 'lucide-react'

const STATUS_STYLES = {
  draft:      'bg-gray-100 text-gray-600',
  finalized:  'bg-blue-100 text-blue-700',
  paid:       'bg-green-100 text-green-700',
}
const STATUS_LABELS = {
  draft:     'Draft',
  finalized: 'Finalized',
  paid:      'Paid',
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
          <h1 className="text-2xl font-bold text-gray-900">Payroll</h1>
          <p className="text-gray-500 text-sm mt-1">Payroll period management</p>
        </div>
        <button onClick={() => setShowForm(true)} className="btn-primary flex items-center gap-2">
          <Plus size={18} /> New Period
        </button>
      </div>

      {showForm && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl p-8 w-full max-w-md">
            <h2 className="text-xl font-bold text-gray-900 mb-6">New Payroll Period</h2>
            <form onSubmit={handleCreate} className="space-y-4">
              <div>
                <label className="label">Period Name</label>
                <input className="input" placeholder="Payroll May 2026" value={form.name} onChange={e => setForm({ ...form, name: e.target.value })} required />
              </div>
              <div>
                <label className="label">Start Date</label>
                <input type="date" className="input" value={form.period_start} onChange={e => setForm({ ...form, period_start: e.target.value })} required />
              </div>
              <div>
                <label className="label">End Date</label>
                <input type="date" className="input" value={form.period_end} onChange={e => setForm({ ...form, period_end: e.target.value })} required />
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

      <div className="space-y-3">
        {loading ? (
          <div className="card py-12 text-center text-gray-400">Loading...</div>
        ) : periods.length === 0 ? (
          <div className="card py-12 text-center text-gray-400">
            <Calendar size={40} className="mx-auto mb-3 text-gray-300" />
            <p>No payroll periods</p>
            <p className="text-sm mt-1">Create your first period by clicking "New Period"</p>
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
                    {new Date(p.period_start).toLocaleDateString('en-US')} — {new Date(p.period_end).toLocaleDateString('en-US')}
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
