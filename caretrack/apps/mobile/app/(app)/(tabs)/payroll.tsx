import { useEffect, useState, useCallback } from 'react'
import {
  View, Text, ScrollView, StyleSheet,
  RefreshControl, ActivityIndicator, TouchableOpacity,
} from 'react-native'
import { Ionicons } from '@expo/vector-icons'
import { supabase } from '../../../lib/supabase'
import { formatDuration, formatCurrency } from '../../../lib/shared'
import type { Profile } from '../../../lib/shared'

interface ClientSummary {
  client_id: string
  client_name: string
  total_minutes: number
  entries_count: number
}

interface PayrollPeriodInfo {
  id: string
  name: string
  period_start: string
  period_end: string
  status: 'draft' | 'finalized' | 'paid'
  total_minutes: number
  gross_pay: number
}

export default function PayrollScreen() {
  const [profile, setProfile] = useState<Profile | null>(null)
  const [totalMinutes, setTotalMinutes] = useState(0)
  const [clientSummaries, setClientSummaries] = useState<ClientSummary[]>([])
  const [officialPeriod, setOfficialPeriod] = useState<PayrollPeriodInfo | null>(null)
  const [loading, setLoading] = useState(true)
  const [refreshing, setRefreshing] = useState(false)
  const [monthOffset, setMonthOffset] = useState(0) // 0 = current, -1 = last month, etc.

  const getMonthRange = (offset: number) => {
    const now = new Date()
    const year = now.getFullYear()
    const month = now.getMonth() + offset
    const start = new Date(year, month, 1)
    const end = new Date(year, month + 1, 0, 23, 59, 59)
    return { start: start.toISOString(), end: end.toISOString(), date: start }
  }

  const fetchPayroll = useCallback(async () => {
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return

    const { start, end } = getMonthRange(monthOffset)

    const [{ data: profileData }, { data: entries }, { data: periods }] = await Promise.all([
      supabase.from('profiles').select('*').eq('id', user.id).single(),
      supabase
        .from('time_entries')
        .select('*, client:clients(id, full_name)')
        .eq('agent_id', user.id)
        .in('status', ['completed', 'corrected'])
        .not('duration_minutes', 'is', null)
        .gte('clock_in_at', start)
        .lte('clock_in_at', end),
      supabase
        .from('payroll_entries')
        .select(`
          total_minutes, gross_pay,
          payroll_period:payroll_periods(id, name, period_start, period_end, status)
        `)
        .eq('agent_id', user.id)
        .gte('created_at', start)
        .lte('created_at', end)
        .limit(1),
    ])

    if (profileData) setProfile(profileData as Profile)

    const allEntries = (entries || []) as any[]
    const total = allEntries.reduce((s: number, e: any) => s + (e.duration_minutes || 0), 0)
    setTotalMinutes(total)

    const byClient: Record<string, ClientSummary> = {}
    for (const e of allEntries) {
      const cid = e.client?.id || 'unknown'
      const cname = e.client?.full_name || 'Unknown'
      if (!byClient[cid]) byClient[cid] = { client_id: cid, client_name: cname, total_minutes: 0, entries_count: 0 }
      byClient[cid].total_minutes += e.duration_minutes || 0
      byClient[cid].entries_count += 1
    }
    setClientSummaries(Object.values(byClient).sort((a, b) => b.total_minutes - a.total_minutes))

    // Official payroll period
    if (periods && periods.length > 0) {
      const p = periods[0] as any
      setOfficialPeriod({
        id: p.payroll_period?.id,
        name: p.payroll_period?.name,
        period_start: p.payroll_period?.period_start,
        period_end: p.payroll_period?.period_end,
        status: p.payroll_period?.status,
        total_minutes: p.total_minutes,
        gross_pay: p.gross_pay,
      })
    } else {
      setOfficialPeriod(null)
    }
  }, [monthOffset])

  const loadData = useCallback(async () => {
    setLoading(true)
    await fetchPayroll()
    setLoading(false)
  }, [fetchPayroll])

  const onRefresh = useCallback(async () => {
    setRefreshing(true)
    await fetchPayroll()
    setRefreshing(false)
  }, [fetchPayroll])

  useEffect(() => { loadData() }, [loadData])

  if (loading) return <View style={s.center}><ActivityIndicator size="large" color="#2D6A4F" /></View>

  const { date } = getMonthRange(monthOffset)
  const monthName = date.toLocaleString('en-US', { month: 'long', year: 'numeric' })
  const grossPay = profile ? (totalMinutes / 60) * (profile.hourly_rate || 0) : 0
  const isCurrentMonth = monthOffset === 0

  const statusColor = {
    draft: { bg: '#FEF3C7', text: '#92400E', label: 'Draft' },
    finalized: { bg: '#DBEAFE', text: '#1E40AF', label: 'Finalized' },
    paid: { bg: '#D1FAE5', text: '#065F46', label: 'Paid ✓' },
  }

  return (
    <ScrollView
      style={s.container}
      contentContainerStyle={s.content}
      refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} colors={['#2D6A4F']} />}
    >
      {/* Month navigator */}
      <View style={s.monthNav}>
        <TouchableOpacity onPress={() => setMonthOffset(o => o - 1)} style={s.navBtn}>
          <Ionicons name="chevron-back" size={20} color="#2D6A4F" />
        </TouchableOpacity>
        <Text style={s.monthLabel}>{monthName}</Text>
        <TouchableOpacity
          onPress={() => setMonthOffset(o => o + 1)}
          style={[s.navBtn, monthOffset >= 0 && s.navBtnDisabled]}
          disabled={monthOffset >= 0}
        >
          <Ionicons name="chevron-forward" size={20} color={monthOffset >= 0 ? '#D1D5DB' : '#2D6A4F'} />
        </TouchableOpacity>
      </View>

      {/* Official payroll period banner */}
      {officialPeriod && (
        <View style={[s.officialBanner, { backgroundColor: statusColor[officialPeriod.status].bg }]}>
          <View style={{ flex: 1 }}>
            <Text style={[s.officialTitle, { color: statusColor[officialPeriod.status].text }]}>
              Official Payroll — {officialPeriod.name}
            </Text>
            <Text style={[s.officialSub, { color: statusColor[officialPeriod.status].text }]}>
              {formatDuration(officialPeriod.total_minutes)} · {formatCurrency(officialPeriod.gross_pay)}
            </Text>
          </View>
          <View style={[s.statusBadge, { backgroundColor: statusColor[officialPeriod.status].text }]}>
            <Text style={s.statusText}>{statusColor[officialPeriod.status].label}</Text>
          </View>
        </View>
      )}

      {/* Summary card */}
      <View style={s.summaryCard}>
        <View style={s.summaryRow}>
          <View style={s.summaryItem}>
            <Ionicons name="time-outline" size={20} color="#2D6A4F" style={{ marginBottom: 4 }} />
            <Text style={s.summaryLabel}>Hours worked</Text>
            <Text style={s.summaryValue}>{formatDuration(totalMinutes)}</Text>
          </View>
          <View style={s.divider} />
          <View style={s.summaryItem}>
            <Ionicons name="cash-outline" size={20} color="#C4724A" style={{ marginBottom: 4 }} />
            <Text style={s.summaryLabel}>Hourly rate</Text>
            <Text style={[s.summaryValue, { color: '#C4724A' }]}>{formatCurrency(profile?.hourly_rate || 0)}/h</Text>
          </View>
        </View>
        <View style={s.grossPaySection}>
          <Text style={s.grossPayLabel}>
            {officialPeriod?.status === 'paid' ? 'Amount paid' : 'Estimated gross pay'}
          </Text>
          <Text style={s.grossPayValue}>
            {officialPeriod?.status === 'paid'
              ? formatCurrency(officialPeriod.gross_pay)
              : formatCurrency(grossPay)}
          </Text>
          <Text style={s.grossPayNote}>
            {officialPeriod?.status === 'paid'
              ? '✓ Confirmed by your administrator'
              : isCurrentMonth
                ? 'Updates automatically after each session'
                : 'Based on validated time entries'}
          </Text>
        </View>
      </View>

      {/* Per-client breakdown */}
      {clientSummaries.length > 0 && (
        <>
          <Text style={s.sectionTitle}>Breakdown by client</Text>
          {clientSummaries.map((summary) => (
            <View key={summary.client_id} style={s.clientCard}>
              <View style={s.clientRow}>
                <View style={{ flex: 1 }}>
                  <Text style={s.clientName}>{summary.client_name}</Text>
                  <Text style={s.clientSessions}>
                    {summary.entries_count} visit{summary.entries_count > 1 ? 's' : ''}
                  </Text>
                </View>
                <View style={s.clientStats}>
                  <Text style={s.clientHours}>{formatDuration(summary.total_minutes)}</Text>
                  {profile?.hourly_rate ? (
                    <Text style={s.clientPay}>
                      {formatCurrency((summary.total_minutes / 60) * profile.hourly_rate)}
                    </Text>
                  ) : null}
                </View>
              </View>
              <View style={s.progressBar}>
                <View style={[s.progressFill, {
                  width: `${Math.min((summary.total_minutes / Math.max(totalMinutes, 1)) * 100, 100)}%`
                }]} />
              </View>
            </View>
          ))}
        </>
      )}

      {clientSummaries.length === 0 && (
        <View style={s.empty}>
          <Ionicons name="wallet-outline" size={48} color="#D1D5DB" />
          <Text style={s.emptyText}>No hours recorded</Text>
          <Text style={s.emptySubtext}>Clock in with a client to start tracking</Text>
        </View>
      )}
    </ScrollView>
  )
}

const s = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#FAFAF8' },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  content: { padding: 16, gap: 12, paddingBottom: 32 },

  monthNav: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    backgroundColor: '#fff', borderRadius: 14, paddingHorizontal: 8, paddingVertical: 10,
    borderWidth: 1, borderColor: '#E8E5DE',
  },
  navBtn: { padding: 8 },
  navBtnDisabled: { opacity: 0.3 },
  monthLabel: { fontSize: 16, fontWeight: '700', color: '#1C1917' },

  officialBanner: {
    flexDirection: 'row', alignItems: 'center',
    borderRadius: 14, padding: 16, gap: 12,
  },
  officialTitle: { fontSize: 14, fontWeight: '700' },
  officialSub: { fontSize: 12, marginTop: 2, opacity: 0.8 },
  statusBadge: { paddingHorizontal: 10, paddingVertical: 4, borderRadius: 20 },
  statusText: { color: '#fff', fontSize: 11, fontWeight: '700' },

  summaryCard: {
    backgroundColor: '#fff', borderRadius: 20, overflow: 'hidden',
    shadowColor: '#000', shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.06, shadowRadius: 12, elevation: 4,
  },
  summaryRow: { flexDirection: 'row', padding: 20, gap: 16 },
  summaryItem: { flex: 1, alignItems: 'center' },
  summaryLabel: { fontSize: 11, color: '#9C9690', marginBottom: 4, fontWeight: '600', textTransform: 'uppercase', letterSpacing: 0.5 },
  summaryValue: { fontSize: 22, fontWeight: '700', color: '#1C1917' },
  divider: { width: 1, backgroundColor: '#E8E5DE' },
  grossPaySection: { backgroundColor: '#2D6A4F', padding: 24, alignItems: 'center', gap: 4 },
  grossPayLabel: { fontSize: 12, color: '#A7D4BC', fontWeight: '600' },
  grossPayValue: { fontSize: 40, fontWeight: '800', color: '#fff' },
  grossPayNote: { fontSize: 11, color: '#A7D4BC', textAlign: 'center', marginTop: 4 },

  sectionTitle: { fontSize: 15, fontWeight: '700', color: '#1C1917', marginTop: 4 },
  clientCard: {
    backgroundColor: '#fff', borderRadius: 14, padding: 16,
    shadowColor: '#000', shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.04, shadowRadius: 4, elevation: 2,
  },
  clientRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 },
  clientName: { fontSize: 15, fontWeight: '600', color: '#1C1917' },
  clientSessions: { fontSize: 12, color: '#9C9690', marginTop: 2 },
  clientStats: { alignItems: 'flex-end' },
  clientHours: { fontSize: 16, fontWeight: '700', color: '#2D6A4F' },
  clientPay: { fontSize: 12, color: '#C4724A', marginTop: 2, fontWeight: '600' },
  progressBar: { height: 5, backgroundColor: '#E8E5DE', borderRadius: 3, overflow: 'hidden' },
  progressFill: { height: '100%', backgroundColor: '#2D6A4F', borderRadius: 3 },

  empty: { alignItems: 'center', paddingVertical: 48, gap: 8 },
  emptyText: { fontSize: 16, color: '#9CA3AF', fontWeight: '600' },
  emptySubtext: { fontSize: 13, color: '#D1D5DB' },
})
