import { useEffect, useState, useCallback } from 'react'
import {
  View, Text, FlatList, StyleSheet,
  RefreshControl, ActivityIndicator
} from 'react-native'
import { Ionicons } from '@expo/vector-icons'
import { supabase } from '../../../lib/supabase'
import { formatDuration } from '@/lib/shared'
import type { TimeEntryWithRelations } from '@/lib/shared'

const STATUS_COLORS = {
  active: '#F59E0B',
  completed: '#16A34A',
  corrected: '#8B5CF6',
}

const STATUS_LABELS = {
  active: 'En cours',
  completed: 'Terminé',
  corrected: 'Corrigé',
}

function formatDateTime(iso: string): string {
  return new Date(iso).toLocaleString('fr-FR', {
    day: '2-digit', month: '2-digit', year: 'numeric',
    hour: '2-digit', minute: '2-digit',
  })
}

export default function HistoryScreen() {
  const [entries, setEntries] = useState<TimeEntryWithRelations[]>([])
  const [loading, setLoading] = useState(true)
  const [refreshing, setRefreshing] = useState(false)

  const fetchHistory = useCallback(async () => {
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return

    const { data } = await supabase
      .from('time_entries')
      .select('*, client:clients(id, full_name, address)')
      .eq('agent_id', user.id)
      .order('clock_in_at', { ascending: false })
      .limit(100)

    setEntries((data || []) as TimeEntryWithRelations[])
  }, [])

  const loadData = useCallback(async () => {
    setLoading(true)
    await fetchHistory()
    setLoading(false)
  }, [fetchHistory])

  const onRefresh = useCallback(async () => {
    setRefreshing(true)
    await fetchHistory()
    setRefreshing(false)
  }, [fetchHistory])

  useEffect(() => { loadData() }, [loadData])

  if (loading) {
    return <View style={styles.center}><ActivityIndicator size="large" color="#2563EB" /></View>
  }

  return (
    <FlatList
      data={entries}
      keyExtractor={(item) => item.id}
      style={styles.container}
      contentContainerStyle={styles.list}
      refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} colors={['#2563EB']} />}
      ListEmptyComponent={
        <View style={styles.empty}>
          <Ionicons name="time-outline" size={48} color="#D1D5DB" />
          <Text style={styles.emptyText}>Aucun pointage enregistré</Text>
        </View>
      }
      renderItem={({ item }) => (
        <View style={styles.card}>
          <View style={styles.cardTop}>
            <Text style={styles.clientName}>{item.client?.full_name || 'Client inconnu'}</Text>
            <View style={[styles.badge, { backgroundColor: STATUS_COLORS[item.status] + '20' }]}>
              <Text style={[styles.badgeText, { color: STATUS_COLORS[item.status] }]}>
                {STATUS_LABELS[item.status]}
              </Text>
            </View>
          </View>

          <View style={styles.row}>
            <Ionicons name="log-in-outline" size={16} color="#16A34A" />
            <Text style={styles.time}>Arrivée : {formatDateTime(item.clock_in_at)}</Text>
          </View>

          {item.clock_out_at && (
            <View style={styles.row}>
              <Ionicons name="log-out-outline" size={16} color="#DC2626" />
              <Text style={styles.time}>Départ : {formatDateTime(item.clock_out_at)}</Text>
            </View>
          )}

          <View style={styles.footer}>
            <View style={styles.row}>
              <Ionicons name="timer-outline" size={16} color="#6B7280" />
              <Text style={styles.duration}>{formatDuration(item.duration_minutes)}</Text>
            </View>
            {item.gps_alert && (
              <View style={styles.gpsAlert}>
                <Ionicons name="warning-outline" size={14} color="#F59E0B" />
                <Text style={styles.gpsAlertText}>Alerte GPS</Text>
              </View>
            )}
          </View>

          {item.correction_note && (
            <View style={styles.correctionBox}>
              <Text style={styles.correctionText}>📝 {item.correction_note}</Text>
            </View>
          )}
        </View>
      )}
    />
  )
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#F3F4F6' },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  list: { padding: 16, gap: 10 },
  card: {
    backgroundColor: '#fff', borderRadius: 12, padding: 16,
    shadowColor: '#000', shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.06, shadowRadius: 8, elevation: 3, gap: 6,
  },
  cardTop: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 4 },
  clientName: { fontSize: 15, fontWeight: '600', color: '#111827', flex: 1 },
  badge: { paddingHorizontal: 8, paddingVertical: 3, borderRadius: 20 },
  badgeText: { fontSize: 12, fontWeight: '600' },
  row: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  time: { fontSize: 13, color: '#374151' },
  footer: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginTop: 4 },
  duration: { fontSize: 14, fontWeight: '700', color: '#2563EB' },
  gpsAlert: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  gpsAlertText: { fontSize: 12, color: '#F59E0B', fontWeight: '500' },
  correctionBox: { backgroundColor: '#F5F3FF', borderRadius: 8, padding: 8, marginTop: 4 },
  correctionText: { fontSize: 12, color: '#7C3AED' },
  empty: { alignItems: 'center', paddingVertical: 48, gap: 12 },
  emptyText: { fontSize: 16, color: '#9CA3AF' },
})
