import { createClient as createAdminClient } from '@supabase/supabase-js'
import { createClient } from '@/lib/supabase-server'
import { sendMissedClockOutAlert, sendDailySummary } from '@/lib/email'
import { NextResponse } from 'next/server'

// Called by a cron job or manually from the dashboard
// POST /api/send-alerts?type=missed_clockout | daily_summary
export async function POST(request: Request) {
  const { searchParams } = new URL(request.url)
  const type = searchParams.get('type') ?? 'missed_clockout'

  // Auth check — must be admin or cron secret
  const cronSecret = request.headers.get('x-cron-secret')
  const isValidCron = cronSecret === process.env.CRON_SECRET

  if (!isValidCron) {
    const supabase = createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const { data: profile } = await supabase
      .from('profiles')
      .select('role, organization_id')
      .eq('id', user.id)
      .single()

    if (!['admin', 'super_admin'].includes(profile?.role ?? '')) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }
  }

  const admin = createAdminClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    { auth: { autoRefreshToken: false, persistSession: false } }
  )

  if (type === 'missed_clockout') {
    // Find all active time entries older than 10 hours
    const threshold = new Date(Date.now() - 10 * 60 * 60 * 1000).toISOString()

    const { data: entries } = await admin
      .from('time_entries')
      .select(`
        id, clock_in_at, agent_id, client_id, organization_id,
        agent:profiles!agent_id(full_name, email),
        client:clients!client_id(full_name)
      `)
      .eq('status', 'active')
      .lt('clock_in_at', threshold)

    if (!entries?.length) {
      return NextResponse.json({ sent: 0 })
    }

    let sent = 0
    for (const entry of entries) {
      // Get admin email for this org
      const { data: admins } = await admin
        .from('profiles')
        .select('full_name, email')
        .eq('organization_id', entry.organization_id)
        .in('role', ['admin', 'super_admin'])
        .eq('is_active', true)
        .limit(1)

      const adminProfile = admins?.[0]
      if (!adminProfile?.email) continue

      const hoursElapsed = Math.floor(
        (Date.now() - new Date(entry.clock_in_at).getTime()) / 3600000
      )

      await sendMissedClockOutAlert({
        to: adminProfile.email,
        adminName: adminProfile.full_name,
        agentName: (entry.agent as any)?.full_name ?? 'Unknown agent',
        clientName: (entry.client as any)?.full_name ?? 'Unknown client',
        clockInAt: new Date(entry.clock_in_at).toLocaleString('en-US', {
          month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit',
        }),
        hoursElapsed,
      })
      sent++
    }

    return NextResponse.json({ sent })
  }

  if (type === 'daily_summary') {
    const today = new Date()
    const startOfDay = new Date(today.setHours(0, 0, 0, 0)).toISOString()
    const endOfDay = new Date(today.setHours(23, 59, 59, 999)).toISOString()
    const dateLabel = new Date().toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric' })

    // Get all orgs
    const { data: orgs } = await admin.from('organizations').select('id, name').eq('is_active', true)
    let sent = 0

    for (const org of orgs ?? []) {
      const [{ count: totalVisits }, { data: timeData }, { count: activeAgents }, { count: missedClockOuts }] =
        await Promise.all([
          admin.from('time_entries').select('id', { count: 'exact', head: true })
            .eq('organization_id', org.id).gte('clock_in_at', startOfDay).lte('clock_in_at', endOfDay),
          admin.from('time_entries').select('duration_minutes')
            .eq('organization_id', org.id).gte('clock_in_at', startOfDay).lte('clock_in_at', endOfDay).eq('status', 'completed'),
          admin.from('profiles').select('id', { count: 'exact', head: true })
            .eq('organization_id', org.id).eq('role', 'agent').eq('is_active', true),
          admin.from('time_entries').select('id', { count: 'exact', head: true })
            .eq('organization_id', org.id).eq('status', 'active').lt('clock_in_at', new Date(Date.now() - 10 * 3600000).toISOString()),
        ])

      const totalMinutes = (timeData ?? []).reduce((s, e) => s + (e.duration_minutes ?? 0), 0)

      const { data: admins } = await admin
        .from('profiles')
        .select('full_name, email')
        .eq('organization_id', org.id)
        .in('role', ['admin', 'super_admin'])
        .eq('is_active', true)

      for (const adminProfile of admins ?? []) {
        await sendDailySummary({
          to: adminProfile.email,
          adminName: adminProfile.full_name,
          orgName: org.name,
          date: dateLabel,
          stats: {
            totalVisits: totalVisits ?? 0,
            totalHours: Math.round(totalMinutes / 60),
            activeAgents: activeAgents ?? 0,
            missedClockOuts: missedClockOuts ?? 0,
          },
        })
        sent++
      }
    }

    return NextResponse.json({ sent })
  }

  return NextResponse.json({ error: 'Unknown type' }, { status: 400 })
}
