import { useEffect, useState } from 'react'
import { Stack } from 'expo-router'
import { useRouter, useSegments } from 'expo-router'
import { supabase } from '../lib/supabase'
import type { Session } from '@supabase/supabase-js'
import { View, ActivityIndicator } from 'react-native'

function RootLayoutNav({ session }: { session: Session | null }) {
  const segments = useSegments()
  const router = useRouter()

  useEffect(() => {
    const inAuthGroup = segments[0] === '(auth)'
    if (!session && !inAuthGroup) {
      router.replace('/(auth)/login')
    } else if (session && inAuthGroup) {
      router.replace('/(app)/(tabs)/')
    }
  }, [session, segments])

  return (
    <Stack screenOptions={{ headerShown: false }}>
      <Stack.Screen name="(auth)" />
      <Stack.Screen name="(app)" />
    </Stack>
  )
}

export default function RootLayout() {
  const [session, setSession] = useState<Session | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    // Timeout de sécurité absolu — l'app démarre dans tous les cas
    const timer = setTimeout(() => setLoading(false), 3000)

    supabase.auth.getSession()
      .then(({ data }) => {
        clearTimeout(timer)
        setSession(data.session)
        setLoading(false)
      })
      .catch(() => {
        clearTimeout(timer)
        setLoading(false)
      })

    const { data: { subscription } } = supabase.auth.onAuthStateChange((_e, s) => {
      setSession(s)
    })

    return () => {
      clearTimeout(timer)
      subscription.unsubscribe()
    }
  }, [])

  if (loading) {
    return (
      <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center', backgroundColor: '#2D6A4F' }}>
        <ActivityIndicator size="large" color="#fff" />
      </View>
    )
  }

  return <RootLayoutNav session={session} />
}
