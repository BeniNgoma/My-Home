'use server'
import { createClient } from '@/lib/supabase-server'
import { redirect } from 'next/navigation'

export async function loginAction(formData: FormData): Promise<{ error: string } | never> {
  const email = (formData.get('email') as string)?.trim()
  const password = formData.get('password') as string

  if (!email || !password) return { error: 'Champs obligatoires.' }

  const supabase = createClient()
  const { data, error } = await supabase.auth.signInWithPassword({ email, password })

  if (error || !data.user) return { error: 'Email ou mot de passe incorrect.' }

  if (data.user.user_metadata?.role !== 'admin') {
    await supabase.auth.signOut()
    return { error: 'Accès réservé aux administrateurs.' }
  }

  redirect('/')
}
