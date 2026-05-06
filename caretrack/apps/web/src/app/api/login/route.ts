import { createClient } from '@supabase/supabase-js'
import { NextRequest, NextResponse } from 'next/server'

export async function POST(request: NextRequest) {
  const { email, password } = await request.json()

  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
  const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!

  // Call auth REST API directly so we control the raw session tokens
  const authRes = await fetch(`${supabaseUrl}/auth/v1/token?grant_type=password`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', apikey: anonKey },
    body: JSON.stringify({ email, password }),
  })

  if (!authRes.ok) {
    const body = await authRes.json().catch(() => ({}))
    return NextResponse.json(
      { error: body.error_description || body.msg || 'Identifiants invalides' },
      { status: 401 }
    )
  }

  const session = await authRes.json()
  // session: { access_token, token_type, expires_in, expires_at, refresh_token, user }

  // Check admin role via service role (bypasses RLS)
  const admin = createClient(supabaseUrl, process.env.SUPABASE_SERVICE_ROLE_KEY!)
  const { data: profile } = await admin
    .from('profiles')
    .select('role')
    .eq('id', session.user.id)
    .single()

  if (profile?.role !== 'admin') {
    return NextResponse.json({ error: 'Accès réservé aux administrateurs.' }, { status: 403 })
  }

  // Build the cookie that @supabase/ssr's createServerClient expects
  const projectRef = supabaseUrl.replace('https://', '').split('.')[0]
  const cookieName = `sb-${projectRef}-auth-token`

  const sessionValue = JSON.stringify({
    access_token: session.access_token,
    token_type: session.token_type,
    expires_in: session.expires_in,
    expires_at: session.expires_at,
    refresh_token: session.refresh_token,
    user: session.user,
  })

  const cookieOptions = {
    path: '/',
    httpOnly: true,
    sameSite: 'lax' as const,
    secure: process.env.NODE_ENV === 'production',
    maxAge: session.expires_in,
  }

  const response = NextResponse.json({ ok: true })

  // Chunk if the value exceeds cookie size limits (~3600 chars)
  const CHUNK_SIZE = 3600
  if (sessionValue.length > CHUNK_SIZE) {
    for (let i = 0; i * CHUNK_SIZE < sessionValue.length; i++) {
      response.cookies.set(
        `${cookieName}.${i}`,
        sessionValue.slice(i * CHUNK_SIZE, (i + 1) * CHUNK_SIZE),
        cookieOptions
      )
    }
  } else {
    response.cookies.set(cookieName, sessionValue, cookieOptions)
  }

  return response
}
