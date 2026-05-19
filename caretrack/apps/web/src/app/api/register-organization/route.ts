import { createClient as createAdminClient } from '@supabase/supabase-js'
import { NextResponse } from 'next/server'

export async function POST(request: Request) {
  const { company_name, admin_email, admin_password, admin_full_name, plan } = await request.json()

  if (!company_name || !admin_email || !admin_password || !admin_full_name) {
    return NextResponse.json({ error: 'Missing required fields' }, { status: 400 })
  }

  const admin = createAdminClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    { auth: { autoRefreshToken: false, persistSession: false } }
  )

  // Generate slug from company name
  const slug = company_name
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '')
    + '-' + Math.random().toString(36).slice(2, 7)

  // 1. Create organization
  const { data: org, error: orgError } = await admin
    .from('organizations')
    .insert({
      name: company_name,
      slug,
      plan: plan || 'trial',
      trial_ends_at: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString(),
      max_agents: 5,
      is_active: true,
    })
    .select('id')
    .single()

  if (orgError) {
    return NextResponse.json({ error: orgError.message }, { status: 400 })
  }

  // 2. Create auth user
  const { data: authData, error: authError } = await admin.auth.admin.createUser({
    email: admin_email,
    password: admin_password,
    email_confirm: true,
    user_metadata: { full_name: admin_full_name, role: 'admin' },
  })

  if (authError) {
    // Rollback org
    await admin.from('organizations').delete().eq('id', org.id)
    return NextResponse.json({ error: authError.message }, { status: 400 })
  }

  // 3. Create profile with organization_id
  const { error: profileError } = await admin.from('profiles').insert({
    id: authData.user.id,
    organization_id: org.id,
    full_name: admin_full_name,
    email: admin_email,
    role: 'admin',
    is_active: true,
    hourly_rate: 0,
  })

  if (profileError) {
    await admin.auth.admin.deleteUser(authData.user.id)
    await admin.from('organizations').delete().eq('id', org.id)
    return NextResponse.json({ error: profileError.message }, { status: 400 })
  }

  return NextResponse.json({
    success: true,
    organization_id: org.id,
    organization_slug: slug,
  })
}
