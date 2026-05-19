import { createClient } from '@/lib/supabase-server'
import Sidebar from '@/components/Sidebar'

export default async function DashboardLayout({ children }: { children: React.ReactNode }) {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()

  let orgName = 'My Home Support'
  if (user) {
    const { data: profile } = await supabase
      .from('profiles')
      .select('organization_id, full_name')
      .eq('id', user.id)
      .single()
    if (profile?.organization_id) {
      const { data: org } = await supabase
        .from('organizations')
        .select('name')
        .eq('id', profile.organization_id)
        .single()
      if (org?.name) orgName = org.name
    }
  }

  return (
    <div className="flex min-h-screen">
      <Sidebar userEmail={user?.email ?? ''} orgName={orgName} />
      <main className="flex-1 overflow-auto">
        {children}
      </main>
    </div>
  )
}
