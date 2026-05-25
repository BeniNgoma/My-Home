import { createContext, useContext, useEffect, useState, ReactNode } from 'react'
import { supabase } from './supabase'
import type { Session } from '@supabase/supabase-js'

type AuthContextType = {
  session: Session | null
  ready: boolean
}

const AuthContext = createContext<AuthContextType>({ session: null, ready: false })

export function AuthProvider({ children }: { children: ReactNode }) {
  const [session, setSession] = useState<Session | null>(null)
  const [ready, setReady] = useState(false)

  useEffect(() => {
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_e, s) => {
      setSession(s)
      setReady(true)
    })
    // Fallback si onAuthStateChange ne répond pas
    const timer = setTimeout(() => setReady(true), 5000)
    return () => { clearTimeout(timer); subscription.unsubscribe() }
  }, [])

  return (
    <AuthContext.Provider value={{ session, ready }}>
      {children}
    </AuthContext.Provider>
  )
}

export const useAuth = () => useContext(AuthContext)
