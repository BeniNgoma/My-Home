import { useState, useRef, useEffect } from 'react'
import {
  View, Text, TouchableOpacity, StyleSheet,
  Alert, ActivityIndicator, Image
} from 'react-native'
import { useLocalSearchParams, useRouter } from 'expo-router'
import { CameraView, useCameraPermissions } from 'expo-camera'
import * as Location from 'expo-location'
import * as FileSystem from 'expo-file-system'
import { supabase } from '../../lib/supabase'
import { haversineDistance } from '../../lib/shared'

const GPS_ALERT_THRESHOLD_METERS = 500

function base64ToUint8Array(base64: string): Uint8Array {
  const binary = atob(base64)
  const bytes = new Uint8Array(binary.length)
  for (let i = 0; i < binary.length; i++) bytes[i] = binary.charCodeAt(i)
  return bytes
}

export default function ClockInScreen() {
  const { client_id, client_name } = useLocalSearchParams<{ client_id: string; client_name: string }>()
  const router = useRouter()
  const cameraRef = useRef<CameraView>(null)
  const [permission, requestPermission] = useCameraPermissions()
  const [photoUri, setPhotoUri] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)
  const [success, setSuccess] = useState(false)

  useEffect(() => {
    if (!permission?.granted) requestPermission()
  }, [])

  async function takePhotoAndConfirm() {
    if (!cameraRef.current) return
    setLoading(true)

    try {
      // Guard: block if there is already an active session
      const { data: { session } } = await supabase.auth.getSession()
      const user = session?.user
      if (!user) throw new Error('Non authentifié')

      const { data: existing } = await supabase
        .from('time_entries')
        .select('id, client_id')
        .eq('agent_id', user.id)
        .eq('status', 'active')
        .limit(1)

      if (existing && existing.length > 0) {
        throw new Error('Vous avez déjà une session active. Terminez-la avant d\'en démarrer une nouvelle.')
      }

      const photo = await cameraRef.current.takePictureAsync({ quality: 0.7, base64: false })
      if (!photo) throw new Error('Impossible de prendre la photo')
      setPhotoUri(photo.uri)

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

      const { data: clientData } = await supabase
        .from('clients')
        .select('latitude, longitude')
        .eq('id', client_id)
        .single()

      let gpsAlert = false
      let gpsDistance: number | null = null
      if (clientData?.latitude && clientData?.longitude) {
        gpsDistance = haversineDistance(
          loc.coords.latitude, loc.coords.longitude,
          clientData.latitude, clientData.longitude
        )
        gpsAlert = gpsDistance > GPS_ALERT_THRESHOLD_METERS
      }

      // Read photo as base64 via expo-file-system (avoids fetch on local file:// URI)
      const base64 = await FileSystem.readAsStringAsync(photo.uri, {
        encoding: FileSystem.EncodingType.Base64,
      })
      const bytes = base64ToUint8Array(base64)

      const filename = `${user.id}_${Date.now()}_${client_id}.jpg`
      const { error: uploadError } = await supabase.storage
        .from('clock-in-photos')
        .upload(filename, bytes, { contentType: 'image/jpeg' })
      if (uploadError) throw uploadError

      const { data: { publicUrl } } = supabase.storage
        .from('clock-in-photos')
        .getPublicUrl(filename)

      const { error: insertError } = await supabase.from('time_entries').insert({
        agent_id: user.id,
        client_id,
        clock_in_photo_url: publicUrl,
        clock_in_latitude: loc.coords.latitude,
        clock_in_longitude: loc.coords.longitude,
        clock_in_address: address,
        status: 'active',
        gps_alert: gpsAlert,
        gps_distance_meters: gpsDistance,
      })
      if (insertError) throw insertError

      setSuccess(true)
      setTimeout(() => router.back(), 2000)
    } catch (err: any) {
      Alert.alert('Erreur', err.message || 'Une erreur est survenue')
    } finally {
      setLoading(false)
    }
  }

  if (!permission) return <View style={styles.center}><ActivityIndicator color="#16A34A" /></View>

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

  if (success) {
    return (
      <View style={[styles.center, { backgroundColor: '#F0FDF4' }]}>
        <Text style={{ fontSize: 64 }}>✅</Text>
        <Text style={styles.successTitle}>Arrivée enregistrée !</Text>
        <Text style={styles.successSub}>Bonne intervention chez {client_name}</Text>
      </View>
    )
  }

  return (
    <View style={styles.container}>
      <View style={styles.infoBar}>
        <Text style={styles.infoText}>Client : {client_name}</Text>
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
            : <Text style={styles.confirmBtnText}>✓ Confirmer l'arrivée</Text>
          }
        </TouchableOpacity>
      </View>
    </View>
  )
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#000' },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: 24, backgroundColor: '#fff' },
  infoBar: { backgroundColor: '#16A34A', paddingVertical: 12, paddingHorizontal: 20, alignItems: 'center' },
  infoText: { color: '#fff', fontSize: 15, fontWeight: '600' },
  camera: { flex: 1 },
  overlay: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  frame: {
    width: 220, height: 280,
    borderWidth: 3, borderColor: '#fff',
    borderRadius: 12,
    backgroundColor: 'transparent',
  },
  controls: {
    backgroundColor: '#fff',
    paddingHorizontal: 24, paddingVertical: 20,
    gap: 12,
  },
  hint: { textAlign: 'center', color: '#6B7280', fontSize: 14 },
  confirmBtn: {
    backgroundColor: '#16A34A',
    borderRadius: 12,
    paddingVertical: 18,
    alignItems: 'center',
  },
  btnDisabled: { opacity: 0.6 },
  confirmBtnText: { color: '#fff', fontSize: 18, fontWeight: '700' },
  permissionText: { fontSize: 16, color: '#374151', marginBottom: 16, textAlign: 'center' },
  permBtn: { backgroundColor: '#2563EB', borderRadius: 8, paddingVertical: 12, paddingHorizontal: 24 },
  permBtnText: { color: '#fff', fontWeight: '600' },
  successTitle: { fontSize: 24, fontWeight: '700', color: '#16A34A', marginTop: 16 },
  successSub: { fontSize: 16, color: '#6B7280', marginTop: 8, textAlign: 'center' },
})
