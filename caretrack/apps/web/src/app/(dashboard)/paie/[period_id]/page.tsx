'use client'
import { useEffect, useState } from 'react'
import { useParams, useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase'
import { formatDuration, formatCurrency } from '@caretrack/shared'
import type { PayrollPeriod, PayrollEntryWithRelations } from '@caretrack/shared'
import { ArrowLeft, Calculator, FileText, Download, CheckCircle } from 'lucide-react'
import jsPDF from 'jspdf'
import autoTable from 'jspdf-autotable'

const STATUS_FLOW: Record<string, string> = {
  draft: 'finalized',
  finalized: 'paid',
}
const STATUS_BTN: Record<string, string> = {
  draft: 'Finaliser',
  finalized: 'Marquer comme Payé',
}
const STATUS_LABELS: Record<string, string> = {
  draft: 'Brouillon',
  finalized: 'Finalisé',
  paid: 'Payé',
}

export default function PayrollPeriodPage() {
  const { period_id } = useParams<{ period_id: string }>()
  const router = useRouter()
  const supabase = createClient()

  const [period, setPeriod] = useState<PayrollPeriod | null>(null)
  const [entries, setEntries] = useState<PayrollEntryWithRelations[]>([])
  const [loading, setLoading] = useState(true)
  const [calculating, setCalculating] = useState(false)
  const [statusUpdating, setStatusUpdating] = useState(false)

  useEffect(() => { loadData() }, [period_id])

  async function loadData() {
    setLoading(true)
    const [{ data: periodData }, { data: entriesData }] = await Promise.all([
      supabase.from('payroll_periods').select('*').eq('id', period_id).single(),
      supabase.from('payroll_entries').select('*, agent:profiles!agent_id(id,full_name,email,hourly_rate)').eq('payroll_period_id', period_id).order('agent(full_name)'),
    ])
    setPeriod(periodData as PayrollPeriod)
    setEntries((entriesData || []) as PayrollEntryWithRelations[])
    setLoading(false)
  }

  async function handleCalculate() {
    setCalculating(true)
    const { error } = await supabase.rpc('calculate_payroll', { p_period_id: period_id })
    if (error) alert('Erreur lors du calcul : ' + error.message)
    setCalculating(false)
    await loadData()
  }

  async function handleStatusChange() {
    if (!period || !STATUS_FLOW[period.status]) return
    const newStatus = STATUS_FLOW[period.status]
    setStatusUpdating(true)
    await supabase.from('payroll_periods').update({ status: newStatus }).eq('id', period_id)
    setStatusUpdating(false)
    await loadData()
  }

  function generatePDF(agentEntries?: PayrollEntryWithRelations[]) {
    if (!period) return
    const doc = new jsPDF()
    const target = agentEntries || entries

    doc.setFontSize(20)
    doc.setTextColor(30, 58, 95)
    doc.text('CareTrack — Fiche de Paie', 14, 20)

    doc.setFontSize(12)
    doc.setTextColor(100)
    doc.text(`Période : ${period.name}`, 14, 32)
    doc.text(
      `${new Date(period.period_start).toLocaleDateString('fr-FR')} — ${new Date(period.period_end).toLocaleDateString('fr-FR')}`,
      14, 40
    )
    doc.text(`Statut : ${STATUS_LABELS[period.status]}`, 14, 48)

    autoTable(doc, {
      startY: 58,
      head: [['Agent', 'Email', 'Heures', 'Taux/h', 'Salaire Brut']],
      body: target.map(e => [
        (e as any).agent?.full_name || '',
        (e as any).agent?.email || '',
        formatDuration(e.total_minutes),
        formatCurrency(e.hourly_rate),
        formatCurrency(e.gross_pay),
      ]),
      foot: [['TOTAL', '', formatDuration(target.reduce((s, e) => s + e.total_minutes, 0)), '', formatCurrency(target.reduce((s, e) => s + e.gross_pay, 0))]],
      headStyles: { fillColor: [37, 99, 235] },
      footStyles: { fillColor: [243, 244, 246], textColor: [17, 24, 39], fontStyle: 'bold' },
    })

    doc.save(`caretrack_paie_${period.name.replace(/\s/g, '_')}.pdf`)
  }

  if (loading) return <div className="p-8 text-gray-400">Chargement...</div>
  if (!period) return <div className="p-8 text-gray-400">Période introuvable</div>

  const totalMinutes = entries.reduce((s, e) => s + e.total_minutes, 0)
  const totalGross = entries.reduce((s, e) => s + e.gross_pay, 0)
  const canCalculate = period.status === 'draft'
  const canChangeStatus = STATUS_FLOW[period.status]

  return (
    <div className="p-8 space-y-6">
      <button onClick={() => router.back()} className="flex items-center gap-2 text-gray-500 hover:text-gray-900 text-sm">
        <ArrowLeft size={16} /> Retour aux périodes
      </button>

      <div className="flex items-start justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">{period.name}</h1>
          <p className="text-gray-500 mt-1 text-sm">
            {new Date(period.period_start).toLocaleDateString('fr-FR')} — {new Date(period.period_end).toLocaleDateString('fr-FR')}
          </p>
        </div>
        <span className={`text-sm font-semibold px-3 py-1.5 rounded-full ${
          period.status === 'draft' ? 'bg-gray-100 text-gray-600' :
          period.status === 'finalized' ? 'bg-blue-100 text-blue-700' :
          'bg-green-100 text-green-700'
        }`}>
          {period.status === 'paid' && <CheckCircle size={14} className="inline mr-1" />}
          {STATUS_LABELS[period.status]}
        </span>
      </div>

      {/* Action buttons */}
      <div className="flex flex-wrap gap-3">
        {canCalculate && (
          <button
            onClick={handleCalculate}
            disabled={calculating}
            className="btn-primary flex items-center gap-2"
          >
            <Calculator size={18} />
            {calculating ? 'Calcul en cours...' : 'Calculer la paie'}
          </button>
        )}
        {entries.length > 0 && (
          <>
            <button onClick={() => generatePDF()} className="btn-secondary flex items-center gap-2">
              <FileText size={18} /> Exporter tout en PDF
            </button>
          </>
        )}
        {canChangeStatus && (
          <button
            onClick={handleStatusChange}
            disabled={statusUpdating || entries.length === 0}
            className={`flex items-center gap-2 font-semibold px-4 py-2 rounded-lg transition-colors ${
              period.status === 'draft'
                ? 'bg-blue-600 hover:bg-blue-700 text-white'
                : 'bg-green-600 hover:bg-green-700 text-white'
            } disabled:opacity-50`}
          >
            {STATUS_BTN[period.status]}
          </button>
        )}
      </div>

      {/* Summary */}
      {entries.length > 0 && (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="card text-center">
            <p className="text-sm text-gray-500 mb-1">Agents payés</p>
            <p className="text-3xl font-bold text-gray-900">{entries.length}</p>
          </div>
          <div className="card text-center">
            <p className="text-sm text-gray-500 mb-1">Total heures</p>
            <p className="text-3xl font-bold text-blue-600">{formatDuration(totalMinutes)}</p>
          </div>
          <div className="card text-center">
            <p className="text-sm text-gray-500 mb-1">Total masse salariale</p>
            <p className="text-3xl font-bold text-green-600">{formatCurrency(totalGross)}</p>
          </div>
        </div>
      )}

      {/* Entries table */}
      <div className="card p-0 overflow-hidden">
        <div className="p-6 border-b border-gray-100 flex justify-between items-center">
          <h2 className="font-semibold text-gray-900">Détail par agent</h2>
          {entries.length === 0 && period.status === 'draft' && (
            <p className="text-sm text-gray-400">Cliquez sur "Calculer la paie" pour générer les fiches</p>
          )}
        </div>
        <table className="w-full">
          <thead className="border-b border-gray-100">
            <tr>
              <th className="table-header">Agent</th>
              <th className="table-header">Total heures</th>
              <th className="table-header">Taux horaire</th>
              <th className="table-header">Salaire brut</th>
              <th className="table-header">PDF individuel</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-50">
            {entries.map(e => (
              <tr key={e.id} className="hover:bg-gray-50">
                <td className="table-cell">
                  <div>
                    <p className="font-medium text-gray-900">{(e as any).agent?.full_name}</p>
                    <p className="text-xs text-gray-400">{(e as any).agent?.email}</p>
                  </div>
                </td>
                <td className="table-cell font-semibold text-blue-600">{formatDuration(e.total_minutes)}</td>
                <td className="table-cell">{formatCurrency(e.hourly_rate)}/h</td>
                <td className="table-cell font-bold text-green-600 text-base">{formatCurrency(e.gross_pay)}</td>
                <td className="table-cell">
                  <button
                    onClick={() => generatePDF([e])}
                    className="flex items-center gap-1 text-sm text-blue-600 hover:text-blue-800"
                  >
                    <Download size={14} /> Fiche PDF
                  </button>
                </td>
              </tr>
            ))}
            {entries.length === 0 && (
              <tr>
                <td colSpan={5} className="py-12 text-center text-gray-400">
                  Aucune donnée — lancez le calcul pour générer les fiches de paie
                </td>
              </tr>
            )}
          </tbody>
          {entries.length > 0 && (
            <tfoot>
              <tr className="bg-gray-50 font-bold">
                <td className="table-cell text-gray-900">Total</td>
                <td className="table-cell text-blue-600">{formatDuration(totalMinutes)}</td>
                <td className="table-cell text-gray-400">—</td>
                <td className="table-cell text-green-600 text-base">{formatCurrency(totalGross)}</td>
                <td className="table-cell"></td>
              </tr>
            </tfoot>
          )}
        </table>
      </div>
    </div>
  )
}
