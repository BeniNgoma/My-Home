import { Redirect } from 'expo-router'
import { View, ActivityIndicator } from 'react-native'
import { useAuth } from '../lib/auth-context'

export default function Index() {
  const { session, ready } = useAuth()

  if (!ready) {
    return (
      <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center', backgroundColor: '#2D6A4F' }}>
        <ActivityIndicator size="large" color="#fff" />
      </View>
    )
  }

  if (session) return <Redirect href="/(app)/(tabs)/" />
  return <Redirect href="/(auth)/login" />
}
