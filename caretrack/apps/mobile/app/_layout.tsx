import { Stack } from 'expo-router'
import { AuthProvider, useAuth } from '../lib/auth-context'
import { View, ActivityIndicator } from 'react-native'

function RootStack() {
  const { ready } = useAuth()

  if (!ready) {
    return (
      <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center', backgroundColor: '#2D6A4F' }}>
        <ActivityIndicator size="large" color="#fff" />
      </View>
    )
  }

  return (
    <Stack screenOptions={{ headerShown: false }}>
      <Stack.Screen name="index" />
      <Stack.Screen name="(auth)" />
      <Stack.Screen name="(app)" />
    </Stack>
  )
}

export default function RootLayout() {
  return (
    <AuthProvider>
      <RootStack />
    </AuthProvider>
  )
}
