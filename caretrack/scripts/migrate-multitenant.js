const https = require('https')
const PAT = process.env.SUPABASE_PAT || ''
const PROJECT_REF = 'fapiaumbdonlskykvmyw'

const sql = `
SET session_replication_role = replica;

-- ── 1. Table organizations ──────────────────────────────────────
CREATE TABLE IF NOT EXISTS organizations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  slug TEXT UNIQUE NOT NULL,
  plan TEXT NOT NULL DEFAULT 'trial' CHECK (plan IN ('trial','starter','pro','enterprise')),
  trial_ends_at TIMESTAMPTZ DEFAULT (now() + INTERVAL '30 days'),
  is_active BOOLEAN NOT NULL DEFAULT true,
  stripe_customer_id TEXT,
  stripe_subscription_id TEXT,
  max_agents INTEGER DEFAULT 5,
  logo_url TEXT,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

ALTER TABLE organizations ENABLE ROW LEVEL SECURITY;

-- ── 2. Ajouter organization_id aux tables ──────────────────────
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS organization_id UUID REFERENCES organizations(id) ON DELETE CASCADE;
ALTER TABLE clients ADD COLUMN IF NOT EXISTS organization_id UUID REFERENCES organizations(id) ON DELETE CASCADE;
ALTER TABLE agent_client_assignments ADD COLUMN IF NOT EXISTS organization_id UUID REFERENCES organizations(id) ON DELETE CASCADE;
ALTER TABLE time_entries ADD COLUMN IF NOT EXISTS organization_id UUID REFERENCES organizations(id) ON DELETE CASCADE;
ALTER TABLE payroll_periods ADD COLUMN IF NOT EXISTS organization_id UUID REFERENCES organizations(id) ON DELETE CASCADE;
ALTER TABLE payroll_entries ADD COLUMN IF NOT EXISTS organization_id UUID REFERENCES organizations(id) ON DELETE CASCADE;

-- ── 3. Organisation par défaut + migration données ──────────────
DO $$
DECLARE
  org_id UUID := '00000000-0000-0000-0001-000000000001';
BEGIN
  INSERT INTO organizations (id, name, slug, plan, trial_ends_at, max_agents)
  VALUES (org_id, 'My Home Support Demo', 'mhs-demo', 'pro', now() + INTERVAL '10 years', 100)
  ON CONFLICT (id) DO NOTHING;

  UPDATE profiles SET organization_id = org_id WHERE organization_id IS NULL;
  UPDATE clients SET organization_id = org_id WHERE organization_id IS NULL;
  UPDATE agent_client_assignments SET organization_id = org_id WHERE organization_id IS NULL;
  UPDATE time_entries SET organization_id = org_id WHERE organization_id IS NULL;
  UPDATE payroll_periods SET organization_id = org_id WHERE organization_id IS NULL;
  UPDATE payroll_entries SET organization_id = org_id WHERE organization_id IS NULL;
END $$;

-- ── 4. NOT NULL après migration ────────────────────────────────
ALTER TABLE profiles ALTER COLUMN organization_id SET NOT NULL;
ALTER TABLE clients ALTER COLUMN organization_id SET NOT NULL;
ALTER TABLE agent_client_assignments ALTER COLUMN organization_id SET NOT NULL;
ALTER TABLE time_entries ALTER COLUMN organization_id SET NOT NULL;
ALTER TABLE payroll_periods ALTER COLUMN organization_id SET NOT NULL;
ALTER TABLE payroll_entries ALTER COLUMN organization_id SET NOT NULL;

-- ── 5. Super admin role ────────────────────────────────────────
DO $$
BEGIN
  BEGIN
    ALTER TYPE user_role ADD VALUE IF NOT EXISTS 'super_admin';
  EXCEPTION WHEN undefined_object THEN NULL;
  END;
END $$;

-- ── 6. Fonctions helper ────────────────────────────────────────
CREATE OR REPLACE FUNCTION get_my_organization_id()
RETURNS UUID LANGUAGE sql SECURITY DEFINER STABLE SET search_path = public AS $$
  SELECT organization_id FROM profiles WHERE id = auth.uid() LIMIT 1;
$$;

CREATE OR REPLACE FUNCTION is_super_admin()
RETURNS BOOLEAN LANGUAGE sql SECURITY DEFINER STABLE SET search_path = public AS $$
  SELECT EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'super_admin' AND is_active = true);
$$;

CREATE OR REPLACE FUNCTION is_admin()
RETURNS BOOLEAN LANGUAGE sql SECURITY DEFINER STABLE SET search_path = public AS $$
  SELECT EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role IN ('admin','super_admin') AND is_active = true);
$$;

-- ── 7. Trigger auto organization_id ───────────────────────────
CREATE OR REPLACE FUNCTION auto_set_organization_id()
RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER AS $$
BEGIN
  IF NEW.organization_id IS NULL THEN
    NEW.organization_id := get_my_organization_id();
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS set_org_id_clients ON clients;
CREATE TRIGGER set_org_id_clients BEFORE INSERT ON clients FOR EACH ROW EXECUTE FUNCTION auto_set_organization_id();

DROP TRIGGER IF EXISTS set_org_id_assignments ON agent_client_assignments;
CREATE TRIGGER set_org_id_assignments BEFORE INSERT ON agent_client_assignments FOR EACH ROW EXECUTE FUNCTION auto_set_organization_id();

DROP TRIGGER IF EXISTS set_org_id_time_entries ON time_entries;
CREATE TRIGGER set_org_id_time_entries BEFORE INSERT ON time_entries FOR EACH ROW EXECUTE FUNCTION auto_set_organization_id();

DROP TRIGGER IF EXISTS set_org_id_payroll_periods ON payroll_periods;
CREATE TRIGGER set_org_id_payroll_periods BEFORE INSERT ON payroll_periods FOR EACH ROW EXECUTE FUNCTION auto_set_organization_id();

DROP TRIGGER IF EXISTS set_org_id_payroll_entries ON payroll_entries;
CREATE TRIGGER set_org_id_payroll_entries BEFORE INSERT ON payroll_entries FOR EACH ROW EXECUTE FUNCTION auto_set_organization_id();

-- ── 8. RLS Policies ────────────────────────────────────────────

-- Organizations
DROP POLICY IF EXISTS "org_read" ON organizations;
CREATE POLICY "org_read" ON organizations FOR SELECT USING (id = get_my_organization_id() OR is_super_admin());

DROP POLICY IF EXISTS "org_update" ON organizations;
CREATE POLICY "org_update" ON organizations FOR UPDATE USING ((id = get_my_organization_id() AND is_admin()) OR is_super_admin());

DROP POLICY IF EXISTS "org_insert" ON organizations;
CREATE POLICY "org_insert" ON organizations FOR INSERT WITH CHECK (true);

-- Profiles
DROP POLICY IF EXISTS "profiles_read" ON profiles;
DROP POLICY IF EXISTS "profiles_write" ON profiles;
DROP POLICY IF EXISTS "Profiles are viewable by authenticated users" ON profiles;
DROP POLICY IF EXISTS "profiles_admin_all" ON profiles;
DROP POLICY IF EXISTS "profiles_own_read" ON profiles;
DROP POLICY IF EXISTS "Users can view their own profile" ON profiles;
DROP POLICY IF EXISTS "Admins can manage profiles" ON profiles;

CREATE POLICY "profiles_read" ON profiles FOR SELECT USING (
  (organization_id = get_my_organization_id() AND is_admin())
  OR id = auth.uid()
  OR is_super_admin()
);
CREATE POLICY "profiles_write" ON profiles FOR ALL USING (
  (is_admin() AND organization_id = get_my_organization_id())
  OR is_super_admin()
);

-- Clients
DROP POLICY IF EXISTS "clients_admin_all" ON clients;
DROP POLICY IF EXISTS "Clients viewable by admin" ON clients;
DROP POLICY IF EXISTS "Admins can manage clients" ON clients;

CREATE POLICY "clients_org_all" ON clients FOR ALL USING (
  organization_id = get_my_organization_id() OR is_super_admin()
);

-- Assignments
DROP POLICY IF EXISTS "assignments_admin_all" ON agent_client_assignments;
DROP POLICY IF EXISTS "Assignments viewable by admin" ON agent_client_assignments;
DROP POLICY IF EXISTS "Admins can manage assignments" ON agent_client_assignments;

CREATE POLICY "assignments_org_all" ON agent_client_assignments FOR ALL USING (
  organization_id = get_my_organization_id() OR is_super_admin()
);

-- Schedules (via parent join)
DROP POLICY IF EXISTS "schedules_admin_all" ON assignment_schedules;
DROP POLICY IF EXISTS "Schedules viewable by admin" ON assignment_schedules;
DROP POLICY IF EXISTS "Admins can manage schedules" ON assignment_schedules;

CREATE POLICY "schedules_org_all" ON assignment_schedules FOR ALL USING (
  EXISTS (
    SELECT 1 FROM agent_client_assignments a
    WHERE a.id = assignment_id
    AND (a.organization_id = get_my_organization_id() OR is_super_admin())
  )
);

-- Time entries
DROP POLICY IF EXISTS "time_entries_admin_all" ON time_entries;
DROP POLICY IF EXISTS "Time entries viewable by admin" ON time_entries;
DROP POLICY IF EXISTS "Admins can manage time entries" ON time_entries;
DROP POLICY IF EXISTS "Agents can manage own time entries" ON time_entries;

CREATE POLICY "time_entries_org_all" ON time_entries FOR ALL USING (
  organization_id = get_my_organization_id() OR is_super_admin()
);

-- Payroll periods
DROP POLICY IF EXISTS "payroll_periods_admin_all" ON payroll_periods;
DROP POLICY IF EXISTS "Admins can manage payroll periods" ON payroll_periods;

CREATE POLICY "payroll_periods_org_all" ON payroll_periods FOR ALL USING (
  organization_id = get_my_organization_id() OR is_super_admin()
);

-- Payroll entries
DROP POLICY IF EXISTS "payroll_entries_admin_all" ON payroll_entries;
DROP POLICY IF EXISTS "Admins can manage payroll entries" ON payroll_entries;

CREATE POLICY "payroll_entries_org_all" ON payroll_entries FOR ALL USING (
  EXISTS (
    SELECT 1 FROM payroll_periods p
    WHERE p.id = payroll_period_id
    AND (p.organization_id = get_my_organization_id() OR is_super_admin())
  )
  OR is_super_admin()
);

-- ── 9. Index performance ───────────────────────────────────────
CREATE INDEX IF NOT EXISTS idx_profiles_org_id ON profiles(organization_id);
CREATE INDEX IF NOT EXISTS idx_clients_org_id ON clients(organization_id);
CREATE INDEX IF NOT EXISTS idx_assignments_org_id ON agent_client_assignments(organization_id);
CREATE INDEX IF NOT EXISTS idx_time_entries_org_id ON time_entries(organization_id);
CREATE INDEX IF NOT EXISTS idx_payroll_periods_org_id ON payroll_periods(organization_id);

SET session_replication_role = DEFAULT;

-- ── Vérification ───────────────────────────────────────────────
SELECT 'organizations' AS t, COUNT(*)::text AS n FROM organizations
UNION ALL SELECT 'profiles_with_org', COUNT(*)::text FROM profiles WHERE organization_id IS NOT NULL
UNION ALL SELECT 'clients_with_org', COUNT(*)::text FROM clients WHERE organization_id IS NOT NULL
UNION ALL SELECT 'time_entries_with_org', COUNT(*)::text FROM time_entries WHERE organization_id IS NOT NULL;
`

function query(sql) {
  return new Promise((resolve, reject) => {
    const data = JSON.stringify({ query: sql })
    const req = https.request({
      hostname: 'api.supabase.com',
      path: `/v1/projects/${PROJECT_REF}/database/query`,
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${PAT}`,
        'Content-Type': 'application/json',
        'Content-Length': Buffer.byteLength(data),
      },
    }, res => {
      let raw = ''
      res.on('data', d => raw += d)
      res.on('end', () => {
        try { resolve({ status: res.statusCode, body: JSON.parse(raw) }) }
        catch { resolve({ status: res.statusCode, body: raw }) }
      })
    })
    req.on('error', reject)
    req.write(data)
    req.end()
  })
}

query(sql).then(res => {
  if (res.status !== 200) {
    console.error('HTTP', res.status, JSON.stringify(res.body).slice(0, 1000))
    process.exit(1)
  }
  if (Array.isArray(res.body)) {
    console.log('\n✓ Migration terminée:\n')
    res.body.forEach(row => console.log(' ', (row.t + ':').padEnd(25), row.n))
  } else {
    console.log(JSON.stringify(res.body).slice(0, 800))
  }
}).catch(e => { console.error(e.message); process.exit(1) })
