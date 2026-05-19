import { createClient as createAdminClient } from '@supabase/supabase-js'
import { createClient } from '@/lib/supabase-server'
import { NextResponse } from 'next/server'

export async function POST(request: Request) {
  // Verify the caller is an authenticated admin
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) {
    return NextResponse.json({ error: 'Non authentifié' }, { status: 401 })
  }

  const { data: profile } = await supabase
    .from('profiles')
    .select('role, organization_id')
    .eq('id', user.id)
    .single()

  if (!profile?.role || !['admin', 'super_admin'].includes(profile.role)) {
    return NextResponse.json({ error: 'Accès réservé aux administrateurs' }, { status: 403 })
  }

  // Fallback: fetch org_id via service role if RLS blocked it
  let orgId = profile.organization_id
  if (!orgId) {
    const adminClient = createAdminClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!,
      { auth: { autoRefreshToken: false, persistSession: false } }
    )
    const { data: p } = await adminClient.from('profiles').select('organization_id').eq('id', user.id).single()
    orgId = p?.organization_id
  }

  if (!orgId) {
    return NextResponse.json({ error: 'Organization not found for this admin' }, { status: 400 })
  }

  const { full_name, email, phone, hourly_rate, password } = await request.json()

  if (!full_name || !email || !password) {
    return NextResponse.json({ error: 'Champs obligatoires manquants' }, { status: 400 })
  }

  const admin = createAdminClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    { auth: { autoRefreshToken: false, persistSession: false } }
  )

  const { data: authData, error: authError } = await admin.auth.admin.createUser({
    email,
    password,
    email_confirm: true,
    user_metadata: { full_name, role: 'agent' },
  })

  if (authError) {
    return NextResponse.json({ error: authError.message }, { status: 400 })
  }

  const { error: profileError } = await admin.from('profiles').insert({
    id: authData.user.id,
    organization_id: orgId,
    full_name,
    email,
    phone: phone || null,
    hourly_rate: parseFloat(hourly_rate) || 0,
    role: 'agent',
    is_active: true,
  })

  if (profileError) {
    return NextResponse.json({ error: profileError.message }, { status: 400 })
  }

  return NextResponse.json({ success: true, agent_id: authData.user.id })
}
