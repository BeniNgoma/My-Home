import { Redirect, Stack } from 'expo-router'
import { useAuth } from '../../lib/auth-context'

export default function AppLayout() {
  const { session } = useAuth()
  if (!session) return <Redirect href="/(auth)/login" />

  return (
    <Stack>
      <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
      <Stack.Screen
        name="clock-in"
        options={{
          title: 'Pointage Arrivée',
          headerStyle: { backgroundColor: '#16A34A' },
          headerTintColor: '#fff',
          headerTitleStyle: { fontWeight: '700' },
          presentation: 'modal',
        }}
      />
      <Stack.Screen
        name="clock-out"
        options={{
          title: 'Pointage Départ',
          headerStyle: { backgroundColor: '#DC2626' },
          headerTintColor: '#fff',
          headerTitleStyle: { fontWeight: '700' },
          presentation: 'modal',
        }}
      />
    </Stack>
  )
}
