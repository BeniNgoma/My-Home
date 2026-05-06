import { useEffect, useState, useCallback } from 'react'
import {
  View, Text, ScrollView, StyleSheet,
  RefreshControl, ActivityIndicator
} from 'react-native'
import { Ionicons } from '@expo/vector-icons'
import { supabase } from '../../../lib/supabase'
import { formatDuration, formatCurrency } from '@/lib/shared'
import type { TimeEntryWithRelations, Profile } from '@/lib/shared'

interface ClientSummary {
  client_id: string
  client_name: string
  total_minutes: number
  entries_count: number
}

export default function PayrollScreen() {
  const [profile, setProfile] = useState<Profile | null>(null)
  const [totalMinutes, setTotalMinutes] = useState(0)
  const [clientSummaries, setClientSummaries] = useState<ClientSummary[]>([])
  const [loading, setLoading] = useState(true)
  const [refreshing, setRefreshing] = useState(false)

  const fetchPayroll = useCallback(async () => {
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return

    const { data: profileData } = await supabase
      .from('profiles')
      .select('*')
      .eq('id', user.id)
      .single()
    if (profileData) setProfile(profileData as Profile)

    const now = new Date()
    const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1).toISOString()
    const endOfMonth = new Date(now.getFullYear(), now.getMonth() + 1, 0, 23, 59, 59).toISOString()

    const { data: entries } = await supabase
      .from('time_entries')
      .select('*, client:clients(id, full_name)')
      .eq('agent_id', user.id)
      .in('status', ['completed', 'corrected'])
      .not('duration_minutes', 'is', null)
      .gte('clock_in_at', startOfMonth)
      .lte('clock_in_at', endOfMonth)

    if (!entries) return

    const total = entries.reduce((sum: number, e: any) => sum + (e.duration_minutes || 0), 0)
    setTotalMinutes(total)

    const byClient: Record<string, ClientSummary> = {}
    for (const e of entries as any[]) {
      const cid = e.client?.id || 'unknown'
      const cname = e.client?.full_name || 'Inconnu'
      if (!byClient[cid]) byClient[cid] = { client_id: cid, client_name: cname, total_minutes: 0, entries_count: 0 }
      byClient[cid].total_minutes += e.duration_minutes || 0
      byClient[cid].entries_count += 1
    }
    setClientSummaries(Object.values(byClient).sort((a, b) => b.total_minutes - a.total_minutes))
  }, [])

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

  if (loading) return <View style={styles.center}><ActivityIndicator size="large" color="#2563EB" /></View>

  const grossPay = profile ? (totalMinutes / 60) * (profile.hourly_rate || 0) : 0
  const monthName = new Date().toLocaleString('fr-FR', { month: 'long', year: 'numeric' })

  return (
    <ScrollView
      style={styles.container}
      contentContainerStyle={styles.content}
      refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} colors={['#2563EB']} />}
    >
      <View style={styles.periodBadge}>
        <Ionicons name="calendar-outline" size={16} color="#2563EB" />
        <Text style={styles.periodText}>{monthName}</Text>
      </View>

      <View style={styles.summaryCard}>
        <View style={styles.summaryRow}>
          <View style={styles.summaryItem}>
            <Text style={styles.summaryLabel}>Heures travaillées</Text>
            <Text style={styles.summaryValue}>{formatDuration(totalMinutes)}</Text>
          </View>
          <View style={styles.divider} />
          <View style={styles.summaryItem}>
            <Text style={styles.summaryLabel}>Taux horaire</Text>
            <Text style={styles.summaryValue}>{formatCurrency(profile?.hourly_rate || 0)}/h</Text>
          </View>
        </View>
        <View style={styles.grossPaySection}>
          <Text style={styles.grossPayLabel}>Salaire brut estimé</Text>
          <Text style={styles.grossPayValue}>{formatCurrency(grossPay)}</Text>
          <Text style={styles.grossPayNote}>Estimation basée sur les pointages validés</Text>
        </View>
      </View>

      <Text style={styles.sectionTitle}>Détail par client</Text>

      {clientSummaries.length === 0 ? (
        <View style={styles.empty}>
          <Ionicons name="wallet-outline" size={40} color="#D1D5DB" />
          <Text style={styles.emptyText}>Aucune heure ce mois-ci</Text>
        </View>
      ) : (
        clientSummaries.map((summary) => (
          <View key={summary.client_id} style={styles.clientCard}>
            <View style={styles.clientRow}>
              <View>
                <Text style={styles.clientName}>{summary.client_name}</Text>
                <Text style={styles.clientSessions}>{summary.entries_count} visite{summary.entries_count > 1 ? 's' : ''}</Text>
              </View>
              <View style={styles.clientStats}>
                <Text style={styles.clientHours}>{formatDuration(summary.total_minutes)}</Text>
                {profile?.hourly_rate && (
                  <Text style={styles.clientPay}>
                    {formatCurrency((summary.total_minutes / 60) * profile.hourly_rate)}
                  </Text>
                )}
              </View>
            </View>
            <View style={styles.progressBar}>
              <View
                style={[
                  styles.progressFill,
                  { width: `${Math.min((summary.total_minutes / Math.max(totalMinutes, 1)) * 100, 100)}%` }
                ]}
              />
            </View>
          </View>
        ))
      )}
    </ScrollView>
  )
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#F3F4F6' },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  content: { padding: 16, gap: 12 },
  periodBadge: {
    flexDirection: 'row', alignItems: 'center', gap: 8,
    backgroundColor: '#DBEAFE', alignSelf: 'flex-start',
    paddingHorizontal: 12, paddingVertical: 6, borderRadius: 20,
  },
  periodText: { color: '#2563EB', fontWeight: '600', fontSize: 14, textTransform: 'capitalize' },
  summaryCard: {
    backgroundColor: '#fff', borderRadius: 16, overflow: 'hidden',
    shadowColor: '#000', shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.06, shadowRadius: 8, elevation: 3,
  },
  summaryRow: { flexDirection: 'row', padding: 20, gap: 16 },
  summaryItem: { flex: 1, alignItems: 'center' },
  summaryLabel: { fontSize: 12, color: '#6B7280', marginBottom: 4 },
  summaryValue: { fontSize: 20, fontWeight: '700', color: '#111827' },
  divider: { width: 1, backgroundColor: '#E5E7EB' },
  grossPaySection: {
    backgroundColor: '#2563EB', padding: 20, alignItems: 'center', gap: 4,
  },
  grossPayLabel: { fontSize: 13, color: '#BFDBFE' },
  grossPayValue: { fontSize: 36, fontWeight: '700', color: '#fff' },
  grossPayNote: { fontSize: 11, color: '#93C5FD', textAlign: 'center' },
  sectionTitle: { fontSize: 16, fontWeight: '700', color: '#111827', marginTop: 8 },
  clientCard: {
    backgroundColor: '#fff', borderRadius: 12, padding: 16,
    shadowColor: '#000', shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.04, shadowRadius: 4, elevation: 2,
  },
  clientRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10 },
  clientName: { fontSize: 15, fontWeight: '600', color: '#111827' },
  clientSessions: { fontSize: 12, color: '#6B7280', marginTop: 2 },
  clientStats: { alignItems: 'flex-end' },
  clientHours: { fontSize: 16, fontWeight: '700', color: '#2563EB' },
  clientPay: { fontSize: 12, color: '#6B7280', marginTop: 2 },
  progressBar: { height: 6, backgroundColor: '#E5E7EB', borderRadius: 3, overflow: 'hidden' },
  progressFill: { height: '100%', backgroundColor: '#2563EB', borderRadius: 3 },
  empty: { alignItems: 'center', paddingVertical: 32, gap: 8 },
  emptyText: { fontSize: 15, color: '#9CA3AF' },
})
