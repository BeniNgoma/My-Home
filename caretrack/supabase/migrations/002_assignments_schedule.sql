-- ============================================================
-- Migration 002 — Schedules pour les affectations
-- À exécuter dans Supabase > SQL Editor
-- ============================================================

-- 1. Nouvelles colonnes sur agent_client_assignments
ALTER TABLE agent_client_assignments
  ADD COLUMN IF NOT EXISTS start_date      DATE NOT NULL DEFAULT CURRENT_DATE,
  ADD COLUMN IF NOT EXISTS end_date        DATE,
  ADD COLUMN IF NOT EXISTS recurrence_type TEXT NOT NULL DEFAULT 'permanent'
    CHECK (recurrence_type IN ('permanent', '2_weeks', '1_month', 'custom')),
  ADD COLUMN IF NOT EXISTS notes           TEXT;

-- 2. Supprimer la contrainte UNIQUE (agent_id, client_id)
--    pour permettre plusieurs affectations successives au même duo
ALTER TABLE agent_client_assignments
  DROP CONSTRAINT IF EXISTS agent_client_assignments_agent_id_client_id_key;

-- 3. Table des créneaux horaires d'une affectation
CREATE TABLE IF NOT EXISTS assignment_schedules (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  assignment_id UUID NOT NULL REFERENCES agent_client_assignments(id) ON DELETE CASCADE,
  day_of_week   TEXT NOT NULL
    CHECK (day_of_week IN ('monday','tuesday','wednesday','thursday','friday','saturday','sunday')),
  start_time    TIME NOT NULL,
  end_time      TIME NOT NULL,
  CONSTRAINT valid_time_range CHECK (end_time > start_time),
  created_at    TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_schedules_assignment ON assignment_schedules(assignment_id);
CREATE INDEX IF NOT EXISTS idx_schedules_day        ON assignment_schedules(day_of_week);

-- 4. RLS
ALTER TABLE assignment_schedules ENABLE ROW LEVEL SECURITY;

CREATE POLICY "schedules_admin_all" ON assignment_schedules
  FOR ALL USING (is_admin());

CREATE POLICY "schedules_agent_select_own" ON assignment_schedules
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM agent_client_assignments aca
      WHERE aca.id = assignment_schedules.assignment_id
        AND aca.agent_id = auth.uid()
    )
  );

-- 5. Fonction utilitaire : heures prévues/semaine par agent
CREATE OR REPLACE FUNCTION planned_hours_per_week(p_agent_id UUID)
RETURNS NUMERIC AS $$
  SELECT COALESCE(
    SUM(EXTRACT(EPOCH FROM (s.end_time - s.start_time)) / 3600.0),
    0
  )
  FROM assignment_schedules s
  JOIN agent_client_assignments a ON a.id = s.assignment_id
  WHERE a.agent_id  = p_agent_id
    AND a.is_active = true
    AND (a.end_date IS NULL OR a.end_date >= CURRENT_DATE);
$$ LANGUAGE SQL SECURITY DEFINER STABLE;

-- 6. Fonction : détection de conflits d'horaires pour un agent
--    Retourne les chevauchements existants
CREATE OR REPLACE FUNCTION check_schedule_conflict(
  p_agent_id     UUID,
  p_day          TEXT,
  p_start        TIME,
  p_end          TIME,
  p_exclude_id   UUID DEFAULT NULL   -- assignment_id à exclure (pour édition)
)
RETURNS TABLE (
  conflict_assignment_id UUID,
  conflict_client        TEXT,
  conflict_start         TIME,
  conflict_end           TIME
) AS $$
  SELECT
    a.id,
    c.full_name,
    s.start_time,
    s.end_time
  FROM assignment_schedules s
  JOIN agent_client_assignments a ON a.id = s.assignment_id
  JOIN clients c ON c.id = a.client_id
  WHERE a.agent_id    = p_agent_id
    AND a.is_active   = true
    AND s.day_of_week = p_day
    AND s.start_time  < p_end
    AND s.end_time    > p_start
    AND (p_exclude_id IS NULL OR a.id <> p_exclude_id);
$$ LANGUAGE SQL SECURITY DEFINER STABLE;
