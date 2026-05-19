'use server'
import { createClient } from '@/lib/supabase-server'
import { redirect } from 'next/navigation'

export async function loginAction(
  _prevState: { error?: string },
  formData: FormData
): Promise<{ error?: string }> {
  const email = (formData.get('email') as string)?.trim()
  const password = formData.get('password') as string

  if (!email || !password) return { error: 'Champs obligatoires.' }

  const supabase = createClient()
  const { data, error } = await supabase.auth.signInWithPassword({ email, password })

  if (error || !data.user) return { error: 'Email ou mot de passe incorrect.' }

  const role = data.user.user_metadata?.role
  if (role !== 'admin' && role !== 'super_admin') {
    await supabase.auth.signOut()
    return { error: 'Accès réservé aux administrateurs.' }
  }

  redirect('/')
}
