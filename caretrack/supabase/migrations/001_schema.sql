-- ============================================================
-- CareTrack — Schéma complet Supabase
-- Exécuter dans l'ordre dans l'éditeur SQL de Supabase
-- ============================================================

-- Extension pour les UUIDs
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- ============================================================
-- TABLE: profiles
-- ============================================================
CREATE TABLE IF NOT EXISTS profiles (
  id          UUID REFERENCES auth.users(id) ON DELETE CASCADE PRIMARY KEY,
  full_name   TEXT NOT NULL,
  email       TEXT NOT NULL UNIQUE,
  phone       TEXT,
  role        TEXT NOT NULL CHECK (role IN ('admin', 'agent')) DEFAULT 'agent',
  hourly_rate NUMERIC(10, 2) NOT NULL DEFAULT 0,
  is_active   BOOLEAN NOT NULL DEFAULT true,
  avatar_url  TEXT,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ============================================================
-- TABLE: clients
-- ============================================================
CREATE TABLE IF NOT EXISTS clients (
  id         UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  full_name  TEXT NOT NULL,
  address    TEXT,
  phone      TEXT,
  email      TEXT,
  notes      TEXT,
  is_active  BOOLEAN NOT NULL DEFAULT true,
  latitude   NUMERIC(10, 7),
  longitude  NUMERIC(10, 7),
  created_by UUID REFERENCES profiles(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ============================================================
-- TABLE: agent_client_assignments
-- ============================================================
CREATE TABLE IF NOT EXISTS agent_client_assignments (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  agent_id    UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  client_id   UUID NOT NULL REFERENCES clients(id) ON DELETE CASCADE,
  assigned_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  assigned_by UUID REFERENCES profiles(id) ON DELETE SET NULL,
  is_active   BOOLEAN NOT NULL DEFAULT true,
  UNIQUE (agent_id, client_id)
);

-- ============================================================
-- TABLE: time_entries
-- ============================================================
CREATE TABLE IF NOT EXISTS time_entries (
  id                   UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  agent_id             UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  client_id            UUID NOT NULL REFERENCES clients(id) ON DELETE CASCADE,

  clock_in_at          TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  clock_in_photo_url   TEXT,
  clock_in_latitude    NUMERIC(10, 7),
  clock_in_longitude   NUMERIC(10, 7),
  clock_in_address     TEXT,

  clock_out_at         TIMESTAMPTZ,
  clock_out_photo_url  TEXT,
  clock_out_latitude   NUMERIC(10, 7),
  clock_out_longitude  NUMERIC(10, 7),
  clock_out_address    TEXT,

  duration_minutes     NUMERIC GENERATED ALWAYS AS (
    CASE
      WHEN clock_out_at IS NOT NULL
      THEN EXTRACT(EPOCH FROM (clock_out_at - clock_in_at)) / 60.0
      ELSE NULL
    END
  ) STORED,

  status               TEXT NOT NULL CHECK (status IN ('active', 'completed', 'corrected')) DEFAULT 'active',
  gps_alert            BOOLEAN NOT NULL DEFAULT false,
  gps_distance_meters  NUMERIC(10, 2),
  correction_note      TEXT,
  corrected_by         UUID REFERENCES profiles(id) ON DELETE SET NULL,
  created_at           TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ============================================================
-- TABLE: payroll_periods
-- ============================================================
CREATE TABLE IF NOT EXISTS payroll_periods (
  id           UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name         TEXT NOT NULL,
  period_start DATE NOT NULL,
  period_end   DATE NOT NULL,
  status       TEXT NOT NULL CHECK (status IN ('draft', 'finalized', 'paid')) DEFAULT 'draft',
  created_by   UUID REFERENCES profiles(id) ON DELETE SET NULL,
  created_at   TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ============================================================
-- TABLE: payroll_entries
-- ============================================================
CREATE TABLE IF NOT EXISTS payroll_entries (
  id                UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  payroll_period_id UUID NOT NULL REFERENCES payroll_periods(id) ON DELETE CASCADE,
  agent_id          UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  total_minutes     NUMERIC(10, 2) NOT NULL DEFAULT 0,
  hourly_rate       NUMERIC(10, 2) NOT NULL,
  gross_pay         NUMERIC(10, 2) GENERATED ALWAYS AS (
    ROUND((total_minutes / 60.0) * hourly_rate, 2)
  ) STORED,
  notes             TEXT,
  created_at        TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (payroll_period_id, agent_id)
);

-- ============================================================
-- INDEXES
-- ============================================================
CREATE INDEX IF NOT EXISTS idx_time_entries_agent_id   ON time_entries(agent_id);
CREATE INDEX IF NOT EXISTS idx_time_entries_client_id  ON time_entries(client_id);
CREATE INDEX IF NOT EXISTS idx_time_entries_status     ON time_entries(status);
CREATE INDEX IF NOT EXISTS idx_time_entries_clock_in   ON time_entries(clock_in_at);
CREATE INDEX IF NOT EXISTS idx_assignments_agent       ON agent_client_assignments(agent_id, is_active);
CREATE INDEX IF NOT EXISTS idx_assignments_client      ON agent_client_assignments(client_id, is_active);
CREATE INDEX IF NOT EXISTS idx_payroll_entries_period  ON payroll_entries(payroll_period_id);

-- ============================================================
-- TRIGGER: updated_at auto-update
-- ============================================================
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_profiles_updated_at
  BEFORE UPDATE ON profiles
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER trigger_clients_updated_at
  BEFORE UPDATE ON clients
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- ============================================================
-- TRIGGER: auto-create profile after auth.users insert
-- ============================================================
CREATE OR REPLACE FUNCTION handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO profiles (id, full_name, email, role)
  VALUES (
    NEW.id,
    COALESCE(NEW.raw_user_meta_data->>'full_name', split_part(NEW.email, '@', 1)),
    NEW.email,
    COALESCE(NEW.raw_user_meta_data->>'role', 'agent')
  )
  ON CONFLICT (id) DO NOTHING;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE OR REPLACE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION handle_new_user();

-- ============================================================
-- HELPER FUNCTION: is_admin()
-- ============================================================
CREATE OR REPLACE FUNCTION is_admin()
RETURNS BOOLEAN AS $$
  SELECT EXISTS (
    SELECT 1 FROM profiles
    WHERE id = auth.uid() AND role = 'admin' AND is_active = true
  );
$$ LANGUAGE SQL SECURITY DEFINER STABLE;

-- ============================================================
-- ROW LEVEL SECURITY
-- ============================================================
ALTER TABLE profiles                ENABLE ROW LEVEL SECURITY;
ALTER TABLE clients                 ENABLE ROW LEVEL SECURITY;
ALTER TABLE agent_client_assignments ENABLE ROW LEVEL SECURITY;
ALTER TABLE time_entries            ENABLE ROW LEVEL SECURITY;
ALTER TABLE payroll_periods         ENABLE ROW LEVEL SECURITY;
ALTER TABLE payroll_entries         ENABLE ROW LEVEL SECURITY;

-- profiles
CREATE POLICY "profiles_select_own_or_admin" ON profiles
  FOR SELECT USING (id = auth.uid() OR is_admin());

CREATE POLICY "profiles_update_own_or_admin" ON profiles
  FOR UPDATE USING (id = auth.uid() OR is_admin());

CREATE POLICY "profiles_insert_admin" ON profiles
  FOR INSERT WITH CHECK (is_admin() OR id = auth.uid());

CREATE POLICY "profiles_delete_admin" ON profiles
  FOR DELETE USING (is_admin());

-- clients
CREATE POLICY "clients_admin_all" ON clients
  FOR ALL USING (is_admin());

CREATE POLICY "clients_agent_select_assigned" ON clients
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM agent_client_assignments
      WHERE agent_id = auth.uid()
        AND client_id = clients.id
        AND is_active = true
    )
  );

-- agent_client_assignments
CREATE POLICY "assignments_admin_all" ON agent_client_assignments
  FOR ALL USING (is_admin());

CREATE POLICY "assignments_agent_select_own" ON agent_client_assignments
  FOR SELECT USING (agent_id = auth.uid());

-- time_entries
CREATE POLICY "time_entries_admin_all" ON time_entries
  FOR ALL USING (is_admin());

CREATE POLICY "time_entries_agent_select_own" ON time_entries
  FOR SELECT USING (agent_id = auth.uid());

CREATE POLICY "time_entries_agent_insert_own" ON time_entries
  FOR INSERT WITH CHECK (agent_id = auth.uid());

CREATE POLICY "time_entries_agent_update_active" ON time_entries
  FOR UPDATE USING (agent_id = auth.uid() AND status = 'active');

-- payroll_periods
CREATE POLICY "payroll_periods_admin_all" ON payroll_periods
  FOR ALL USING (is_admin());

CREATE POLICY "payroll_periods_agent_select" ON payroll_periods
  FOR SELECT USING (true);

-- payroll_entries
CREATE POLICY "payroll_entries_admin_all" ON payroll_entries
  FOR ALL USING (is_admin());

CREATE POLICY "payroll_entries_agent_select_own" ON payroll_entries
  FOR SELECT USING (agent_id = auth.uid());

-- ============================================================
-- FUNCTION: calculate_payroll(period_id)
-- ============================================================
CREATE OR REPLACE FUNCTION calculate_payroll(p_period_id UUID)
RETURNS TABLE (
  agent_id      UUID,
  agent_name    TEXT,
  total_minutes NUMERIC,
  hourly_rate   NUMERIC,
  gross_pay     NUMERIC
) AS $$
DECLARE
  v_period payroll_periods%ROWTYPE;
BEGIN
  SELECT * INTO v_period FROM payroll_periods WHERE id = p_period_id;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Payroll period not found: %', p_period_id;
  END IF;

  IF v_period.status IN ('finalized', 'paid') THEN
    RAISE EXCEPTION 'Cannot recalculate a % payroll period', v_period.status;
  END IF;

  DELETE FROM payroll_entries WHERE payroll_period_id = p_period_id;

  INSERT INTO payroll_entries (payroll_period_id, agent_id, total_minutes, hourly_rate)
  SELECT
    p_period_id,
    te.agent_id,
    COALESCE(SUM(te.duration_minutes), 0),
    p.hourly_rate
  FROM time_entries te
  JOIN profiles p ON p.id = te.agent_id
  WHERE
    te.clock_in_at >= v_period.period_start::TIMESTAMPTZ
    AND te.clock_in_at < (v_period.period_end + INTERVAL '1 day')::TIMESTAMPTZ
    AND te.status IN ('completed', 'corrected')
    AND te.duration_minutes IS NOT NULL
  GROUP BY te.agent_id, p.hourly_rate;

  RETURN QUERY
  SELECT
    pe.agent_id,
    p.full_name,
    pe.total_minutes,
    pe.hourly_rate,
    pe.gross_pay
  FROM payroll_entries pe
  JOIN profiles p ON p.id = pe.agent_id
  WHERE pe.payroll_period_id = p_period_id
  ORDER BY p.full_name;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ============================================================
-- STORAGE BUCKETS (exécuter séparément si nécessaire)
-- ============================================================
-- INSERT INTO storage.buckets (id, name, public) VALUES ('clock-in-photos', 'clock-in-photos', true) ON CONFLICT DO NOTHING;
-- INSERT INTO storage.buckets (id, name, public) VALUES ('clock-out-photos', 'clock-out-photos', true) ON CONFLICT DO NOTHING;

-- Storage RLS pour clock-in-photos
-- CREATE POLICY "agents_upload_clock_in" ON storage.objects FOR INSERT
--   WITH CHECK (bucket_id = 'clock-in-photos' AND auth.role() = 'authenticated');
-- CREATE POLICY "public_read_clock_in" ON storage.objects FOR SELECT
--   USING (bucket_id = 'clock-in-photos');

-- Storage RLS pour clock-out-photos
-- CREATE POLICY "agents_upload_clock_out" ON storage.objects FOR INSERT
--   WITH CHECK (bucket_id = 'clock-out-photos' AND auth.role() = 'authenticated');
-- CREATE POLICY "public_read_clock_out" ON storage.objects FOR SELECT
--   USING (bucket_id = 'clock-out-photos');
