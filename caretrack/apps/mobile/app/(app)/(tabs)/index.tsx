import { useEffect, useState, useCallback } from 'react'
import {
  View, Text, FlatList, TouchableOpacity, StyleSheet,
  RefreshControl, Alert, ActivityIndicator
} from 'react-native'
import { useRouter } from 'expo-router'
import { Ionicons } from '@expo/vector-icons'
import { supabase } from '../../../lib/supabase'
import type { Client, TimeEntry } from '@/lib/shared'

interface ClientWithSession extends Client {
  active_entry?: TimeEntry
}

export default function HomeScreen() {
  const router = useRouter()
  const [clients, setClients] = useState<ClientWithSession[]>([])
  const [loading, setLoading] = useState(true)
  const [refreshing, setRefreshing] = useState(false)
  const [agentName, setAgentName] = useState('')
  const [activeSessions, setActiveSessions] = useState(0)

  const fetchData = useCallback(async () => {
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return

    const { data: profile } = await supabase
      .from('profiles')
      .select('full_name')
      .eq('id', user.id)
      .single()
    if (profile) setAgentName(profile.full_name)

    const { data: assignments } = await supabase
      .from('agent_client_assignments')
      .select('client_id, clients(*)')
      .eq('agent_id', user.id)
      .eq('is_active', true)

    const { data: activeEntries } = await supabase
      .from('time_entries')
      .select('*')
      .eq('agent_id', user.id)
      .eq('status', 'active')

    const clientList: ClientWithSession[] = (assignments || []).map((a: any) => ({
      ...a.clients,
      active_entry: (activeEntries || []).find((e: TimeEntry) => e.client_id === a.clients.id),
    }))

    setClients(clientList)
    setActiveSessions((activeEntries || []).length)
  }, [])

  const loadData = useCallback(async () => {
    setLoading(true)
    await fetchData()
    setLoading(false)
  }, [fetchData])

  const onRefresh = useCallback(async () => {
    setRefreshing(true)
    await fetchData()
    setRefreshing(false)
  }, [fetchData])

  useEffect(() => { loadData() }, [loadData])

  function handleClockIn(client: ClientWithSession) {
    router.push({ pathname: '/(app)/clock-in', params: { client_id: client.id, client_name: client.full_name } })
  }

  function handleClockOut(client: ClientWithSession) {
    if (!client.active_entry) return
    router.push({
      pathname: '/(app)/clock-out',
      params: { entry_id: client.active_entry.id, client_name: client.full_name },
    })
  }

  async function handleLogout() {
    Alert.alert('Déconnexion', 'Voulez-vous vous déconnecter ?', [
      { text: 'Annuler', style: 'cancel' },
      { text: 'Déconnexion', style: 'destructive', onPress: () => supabase.auth.signOut() },
    ])
  }

  if (loading) {
    return (
      <View style={styles.center}>
        <ActivityIndicator size="large" color="#2563EB" />
      </View>
    )
  }

  return (
    <View style={styles.container}>
      {activeSessions > 0 && (
        <View style={styles.banner}>
          <Ionicons name="time-outline" size={18} color="#fff" />
          <Text style={styles.bannerText}>
            {activeSessions} session{activeSessions > 1 ? 's' : ''} en cours
          </Text>
        </View>
      )}

      <FlatList
        data={clients}
        keyExtractor={(item) => item.id}
        contentContainerStyle={styles.list}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} colors={['#2563EB']} />}
        ListHeaderComponent={
          <View style={styles.header}>
            <View>
              <Text style={styles.greeting}>Bonjour,</Text>
              <Text style={styles.agentName}>{agentName}</Text>
            </View>
            <TouchableOpacity onPress={handleLogout} style={styles.logoutBtn}>
              <Ionicons name="log-out-outline" size={22} color="#6B7280" />
            </TouchableOpacity>
          </View>
        }
        ListEmptyComponent={
          <View style={styles.empty}>
            <Ionicons name="people-outline" size={48} color="#D1D5DB" />
            <Text style={styles.emptyText}>Aucun client assigné</Text>
          </View>
        }
        renderItem={({ item }) => (
          <View style={styles.card}>
            <View style={styles.cardHeader}>
              <View style={styles.avatar}>
                <Text style={styles.avatarText}>{item.full_name[0].toUpperCase()}</Text>
              </View>
              <View style={styles.cardInfo}>
                <Text style={styles.clientName}>{item.full_name}</Text>
                <Text style={styles.clientAddress} numberOfLines={1}>
                  {item.address || 'Adresse non renseignée'}
                </Text>
                {item.active_entry && (
                  <View style={styles.sessionBadge}>
                    <Ionicons name="ellipse" size={8} color="#16A34A" />
                    <Text style={styles.sessionText}>Session en cours</Text>
                  </View>
                )}
              </View>
            </View>

            {item.active_entry ? (
              <TouchableOpacity style={styles.clockOutBtn} onPress={() => handleClockOut(item)}>
                <Ionicons name="stop-circle" size={20} color="#fff" />
                <Text style={styles.btnText}>Clock Out</Text>
              </TouchableOpacity>
            ) : (
              <TouchableOpacity style={styles.clockInBtn} onPress={() => handleClockIn(item)}>
                <Ionicons name="play-circle" size={20} color="#fff" />
                <Text style={styles.btnText}>Clock In</Text>
              </TouchableOpacity>
            )}
          </View>
        )}
      />
    </View>
  )
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#F3F4F6' },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  banner: {
    backgroundColor: '#F59E0B',
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingHorizontal: 16,
    paddingVertical: 10,
  },
  bannerText: { color: '#fff', fontWeight: '600', fontSize: 14 },
  list: { padding: 16, gap: 12 },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
    paddingVertical: 4,
  },
  greeting: { fontSize: 14, color: '#6B7280' },
  agentName: { fontSize: 20, fontWeight: '700', color: '#111827' },
  logoutBtn: { padding: 8 },
  card: {
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.06,
    shadowRadius: 8,
    elevation: 3,
  },
  cardHeader: { flexDirection: 'row', alignItems: 'center', gap: 12, marginBottom: 12 },
  avatar: {
    width: 48, height: 48,
    borderRadius: 24,
    backgroundColor: '#DBEAFE',
    alignItems: 'center', justifyContent: 'center',
  },
  avatarText: { fontSize: 20, fontWeight: '700', color: '#2563EB' },
  cardInfo: { flex: 1 },
  clientName: { fontSize: 16, fontWeight: '600', color: '#111827' },
  clientAddress: { fontSize: 13, color: '#6B7280', marginTop: 2 },
  sessionBadge: { flexDirection: 'row', alignItems: 'center', gap: 4, marginTop: 4 },
  sessionText: { fontSize: 12, color: '#16A34A', fontWeight: '500' },
  clockInBtn: {
    backgroundColor: '#16A34A',
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center',
    gap: 8, borderRadius: 8, paddingVertical: 12,
  },
  clockOutBtn: {
    backgroundColor: '#DC2626',
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center',
    gap: 8, borderRadius: 8, paddingVertical: 12,
  },
  btnText: { color: '#fff', fontSize: 16, fontWeight: '700' },
  empty: { alignItems: 'center', paddingVertical: 48, gap: 12 },
  emptyText: { fontSize: 16, color: '#9CA3AF' },
})
