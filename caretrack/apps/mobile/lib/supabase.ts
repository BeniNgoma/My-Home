import 'react-native-url-polyfill/auto'
import { createClient } from '@supabase/supabase-js'
import * as SecureStore from 'expo-secure-store'

const supabaseUrl = process.env.EXPO_PUBLIC_SUPABASE_URL!
const supabaseAnonKey = process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY!

// Wrap SecureStore with error handling — on some Android devices
// getItemAsync can throw, which causes getSession() to hang forever.
const ExpoSecureStoreAdapter = {
  getItem: (key: string) =>
    SecureStore.getItemAsync(key).catch(() => null),
  setItem: (key: string, value: string) =>
    SecureStore.setItemAsync(key, value).catch(() => {}),
  removeItem: (key: string) =>
    SecureStore.deleteItemAsync(key).catch(() => {}),
}

export const supabase = createClient(supabaseUrl, supabaseAnonKey, {
  auth: {
    storage: ExpoSecureStoreAdapter,
    autoRefreshToken: true,
    persistSession: true,
    detectSessionInUrl: false,
  },
})
