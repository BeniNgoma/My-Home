import { useEffect, useRef, useState } from 'react'
import { Stack, useRouter, useSegments } from 'expo-router'
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
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  useEffect(() => {
    // Safety timeout — if getSession hangs for any reason, unblock after 4s
    timerRef.current = setTimeout(() => {
      setLoading(false)
    }, 4000)

    supabase.auth
      .getSession()
      .then(({ data: { session } }) => {
        if (timerRef.current) clearTimeout(timerRef.current)
        setSession(session)
        setLoading(false)
      })
      .catch(() => {
        if (timerRef.current) clearTimeout(timerRef.current)
        setLoading(false)
      })

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, session) => {
      setSession(session)
    })

    return () => {
      subscription.unsubscribe()
      if (timerRef.current) clearTimeout(timerRef.current)
    }
  }, [])

  if (loading) {
    return (
      <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center', backgroundColor: '#2D6A4F' }}>
        <ActivityIndicator size="large" color="#ffffff" />
      </View>
    )
  }

  return <RootLayoutNav session={session} />
}
