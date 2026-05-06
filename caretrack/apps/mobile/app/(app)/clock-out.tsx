import { useState, useRef, useEffect } from 'react'
import {
  View, Text, TouchableOpacity, StyleSheet,
  Alert, ActivityIndicator
} from 'react-native'
import { useLocalSearchParams, useRouter } from 'expo-router'
import { CameraView, useCameraPermissions } from 'expo-camera'
import * as Location from 'expo-location'
import { supabase } from '../../lib/supabase'
import { haversineDistance, formatDuration } from '@caretrack/shared'

const GPS_ALERT_THRESHOLD_METERS = 500

export default function ClockOutScreen() {
  const { entry_id, client_name } = useLocalSearchParams<{ entry_id: string; client_name: string }>()
  const router = useRouter()
  const cameraRef = useRef<CameraView>(null)
  const [permission, requestPermission] = useCameraPermissions()
  const [loading, setLoading] = useState(false)
  const [result, setResult] = useState<{ duration: number } | null>(null)

  useEffect(() => {
    if (!permission?.granted) requestPermission()
  }, [])

  async function takePhotoAndConfirm() {
    if (!cameraRef.current) return
    setLoading(true)

    try {
      const photo = await cameraRef.current.takePictureAsync({ quality: 0.7 })
      if (!photo) throw new Error('Impossible de prendre la photo')

      const { status } = await Location.requestForegroundPermissionsAsync()
      if (status !== 'granted') throw new Error('Permission GPS refusée')

      const loc = await Location.getCurrentPositionAsync({ accuracy: Location.Accuracy.High })
      const [geoResult] = await Location.reverseGeocodeAsync({
        latitude: loc.coords.latitude,
        longitude: loc.coords.longitude,
      })
      const address = geoResult
        ? `${geoResult.streetNumber || ''} ${geoResult.street || ''}, ${geoResult.city || ''}`
        : `${loc.coords.latitude.toFixed(4)}, ${loc.coords.longitude.toFixed(4)}`

      const { data: { user } } = await supabase.auth.getUser()
      if (!user) throw new Error('Non authentifié')

      const { data: entry } = await supabase
        .from('time_entries')
        .select('client_id, clock_in_at, clients(latitude, longitude)')
        .eq('id', entry_id)
        .single()

      let gpsAlert = false
      let gpsDistance: number | null = null
      const clientLatLon = (entry as any)?.clients
      if (clientLatLon?.latitude && clientLatLon?.longitude) {
        gpsDistance = haversineDistance(
          loc.coords.latitude, loc.coords.longitude,
          clientLatLon.latitude, clientLatLon.longitude
        )
        gpsAlert = gpsDistance > GPS_ALERT_THRESHOLD_METERS
      }

      const { data: { user: currentUser } } = await supabase.auth.getUser()
      const filename = `${currentUser!.id}_${Date.now()}_${entry?.client_id}.jpg`
      const response = await fetch(photo.uri)
      const blob = await response.blob()
      const { error: uploadError } = await supabase.storage
        .from('clock-out-photos')
        .upload(filename, blob, { contentType: 'image/jpeg' })
      if (uploadError) throw uploadError

      const { data: { publicUrl } } = supabase.storage
        .from('clock-out-photos')
        .getPublicUrl(filename)

      const clockOutAt = new Date().toISOString()
      const { data: updated, error: updateError } = await supabase
        .from('time_entries')
        .update({
          clock_out_at: clockOutAt,
          clock_out_photo_url: publicUrl,
          clock_out_latitude: loc.coords.latitude,
          clock_out_longitude: loc.coords.longitude,
          clock_out_address: address,
          status: 'completed',
          gps_alert: gpsAlert || (entry as any)?.gps_alert,
          gps_distance_meters: gpsDistance,
        })
        .eq('id', entry_id)
        .select('duration_minutes')
        .single()
      if (updateError) throw updateError

      setResult({ duration: updated?.duration_minutes || 0 })
    } catch (err: any) {
      Alert.alert('Erreur', err.message || 'Une erreur est survenue')
    } finally {
      setLoading(false)
    }
  }

  if (!permission) return <View style={styles.center}><ActivityIndicator color="#DC2626" /></View>

  if (!permission.granted) {
    return (
      <View style={styles.center}>
        <Text style={styles.permissionText}>Accès à la caméra requis</Text>
        <TouchableOpacity style={styles.permBtn} onPress={requestPermission}>
          <Text style={styles.permBtnText}>Autoriser la caméra</Text>
        </TouchableOpacity>
      </View>
    )
  }

  if (result) {
    return (
      <View style={[styles.center, { backgroundColor: '#FFF5F5' }]}>
        <Text style={{ fontSize: 64 }}>👋</Text>
        <Text style={styles.successTitle}>Départ enregistré !</Text>
        <View style={styles.durationCard}>
          <Text style={styles.durationLabel}>Durée de la session</Text>
          <Text style={styles.durationValue}>{formatDuration(result.duration)}</Text>
        </View>
        <Text style={styles.successSub}>Chez {client_name}</Text>
        <TouchableOpacity style={styles.doneBtn} onPress={() => router.back()}>
          <Text style={styles.doneBtnText}>Retour à l'accueil</Text>
        </TouchableOpacity>
      </View>
    )
  }

  return (
    <View style={styles.container}>
      <View style={styles.infoBar}>
        <Text style={styles.infoText}>Départ : {client_name}</Text>
      </View>

      <CameraView ref={cameraRef} style={styles.camera} facing="front">
        <View style={styles.overlay}>
          <View style={styles.frame} />
        </View>
      </CameraView>

      <View style={styles.controls}>
        <Text style={styles.hint}>Positionnez votre visage dans le cadre</Text>
        <TouchableOpacity
          style={[styles.confirmBtn, loading && styles.btnDisabled]}
          onPress={takePhotoAndConfirm}
          disabled={loading}
        >
          {loading
            ? <ActivityIndicator color="#fff" size="large" />
            : <Text style={styles.confirmBtnText}>✓ Confirmer le départ</Text>
          }
        </TouchableOpacity>
      </View>
    </View>
  )
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#000' },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: 24, backgroundColor: '#fff' },
  infoBar: { backgroundColor: '#DC2626', paddingVertical: 12, paddingHorizontal: 20, alignItems: 'center' },
  infoText: { color: '#fff', fontSize: 15, fontWeight: '600' },
  camera: { flex: 1 },
  overlay: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  frame: {
    width: 220, height: 280,
    borderWidth: 3, borderColor: '#fff',
    borderRadius: 12,
    backgroundColor: 'transparent',
  },
  controls: { backgroundColor: '#fff', paddingHorizontal: 24, paddingVertical: 20, gap: 12 },
  hint: { textAlign: 'center', color: '#6B7280', fontSize: 14 },
  confirmBtn: { backgroundColor: '#DC2626', borderRadius: 12, paddingVertical: 18, alignItems: 'center' },
  btnDisabled: { opacity: 0.6 },
  confirmBtnText: { color: '#fff', fontSize: 18, fontWeight: '700' },
  permissionText: { fontSize: 16, color: '#374151', marginBottom: 16, textAlign: 'center' },
  permBtn: { backgroundColor: '#2563EB', borderRadius: 8, paddingVertical: 12, paddingHorizontal: 24 },
  permBtnText: { color: '#fff', fontWeight: '600' },
  successTitle: { fontSize: 24, fontWeight: '700', color: '#DC2626', marginTop: 16, marginBottom: 24 },
  durationCard: {
    backgroundColor: '#FEE2E2', borderRadius: 12,
    paddingHorizontal: 32, paddingVertical: 20, alignItems: 'center', marginBottom: 16,
  },
  durationLabel: { fontSize: 14, color: '#6B7280', marginBottom: 4 },
  durationValue: { fontSize: 32, fontWeight: '700', color: '#DC2626' },
  successSub: { fontSize: 16, color: '#6B7280', marginBottom: 32 },
  doneBtn: { backgroundColor: '#2563EB', borderRadius: 10, paddingVertical: 14, paddingHorizontal: 32 },
  doneBtnText: { color: '#fff', fontWeight: '700', fontSize: 16 },
})
