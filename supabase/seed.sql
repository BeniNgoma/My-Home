-- ============================================================
-- CareTrack — Données de test (seed.sql)
-- IMPORTANT: Créer d'abord les comptes auth via Supabase Auth
-- puis exécuter ce script dans l'éditeur SQL
--
-- Comptes à créer manuellement dans Authentication > Users:
--   admin@caretrack.com / password123
--   marie.dupont@caretrack.com / password123
--   jean.martin@caretrack.com / password123
--   fatou.diallo@caretrack.com / password123
-- ============================================================

-- Désactiver temporairement RLS pour le seed
SET session_replication_role = replica;

-- ============================================================
-- PROFILES (les UUIDs doivent correspondre aux auth.users créés)
-- Remplacer les UUIDs par les vrais UUIDs de vos utilisateurs auth
-- ============================================================

-- Admin
INSERT INTO profiles (id, full_name, email, phone, role, hourly_rate, is_active)
VALUES
  ('00000000-0000-0000-0000-000000000001', 'Admin CareTrack', 'admin@caretrack.com', '+1-555-000-0001', 'admin', 0, true)
ON CONFLICT (id) DO UPDATE SET role = 'admin', full_name = EXCLUDED.full_name;

-- Agents
INSERT INTO profiles (id, full_name, email, phone, role, hourly_rate, is_active)
VALUES
  ('00000000-0000-0000-0000-000000000002', 'Marie Dupont',  'marie.dupont@caretrack.com',  '+1-555-000-0002', 'agent', 15.00, true),
  ('00000000-0000-0000-0000-000000000003', 'Jean Martin',   'jean.martin@caretrack.com',   '+1-555-000-0003', 'agent', 17.00, true),
  ('00000000-0000-0000-0000-000000000004', 'Fatou Diallo',  'fatou.diallo@caretrack.com',  '+1-555-000-0004', 'agent', 20.00, true)
ON CONFLICT (id) DO UPDATE SET
  full_name   = EXCLUDED.full_name,
  hourly_rate = EXCLUDED.hourly_rate;

-- ============================================================
-- CLIENTS (4 clients avec adresses réelles)
-- ============================================================
INSERT INTO clients (id, full_name, address, phone, email, notes, is_active, latitude, longitude, created_by)
VALUES
  (
    '00000000-0000-0000-0000-000000000011',
    'Margaret Thompson',
    '742 Evergreen Terrace, Springfield, IL 62701',
    '+1-555-100-0001',
    'margaret.thompson@email.com',
    'Diabétique, prendre les médicaments à 8h et 20h. Allergie aux noix.',
    true, 39.7817, -89.6501,
    '00000000-0000-0000-0000-000000000001'
  ),
  (
    '00000000-0000-0000-0000-000000000012',
    'Robert Johnson',
    '1600 Pennsylvania Avenue, Washington, DC 20500',
    '+1-555-100-0002',
    'robert.j@email.com',
    'Mobilité réduite. Utilise un fauteuil roulant. Kiné le mardi et jeudi.',
    true, 38.8977, -77.0365,
    '00000000-0000-0000-0000-000000000001'
  ),
  (
    '00000000-0000-0000-0000-000000000013',
    'Eleanor Garcia',
    '350 Fifth Avenue, New York, NY 10118',
    '+1-555-100-0003',
    'eleanor.garcia@email.com',
    'Alzheimer léger. Prévoir des activités de stimulation cognitive.',
    true, 40.7484, -73.9967,
    '00000000-0000-0000-0000-000000000001'
  ),
  (
    '00000000-0000-0000-0000-000000000014',
    'William Chen',
    '1 Infinite Loop, Cupertino, CA 95014',
    '+1-555-100-0004',
    'william.chen@email.com',
    'Post-opératoire. Vérifier les pansements quotidiennement.',
    true, 37.3318, -122.0312,
    '00000000-0000-0000-0000-000000000001'
  )
ON CONFLICT (id) DO NOTHING;

-- ============================================================
-- ASSIGNATIONS agent-client
-- ============================================================
INSERT INTO agent_client_assignments (agent_id, client_id, assigned_by, is_active)
VALUES
  -- Marie → Margaret et Robert
  ('00000000-0000-0000-0000-000000000002', '00000000-0000-0000-0000-000000000011', '00000000-0000-0000-0000-000000000001', true),
  ('00000000-0000-0000-0000-000000000002', '00000000-0000-0000-0000-000000000012', '00000000-0000-0000-0000-000000000001', true),
  -- Jean → Eleanor et William
  ('00000000-0000-0000-0000-000000000003', '00000000-0000-0000-0000-000000000013', '00000000-0000-0000-0000-000000000001', true),
  ('00000000-0000-0000-0000-000000000003', '00000000-0000-0000-0000-000000000014', '00000000-0000-0000-0000-000000000001', true),
  -- Fatou → Margaret et Eleanor
  ('00000000-0000-0000-0000-000000000004', '00000000-0000-0000-0000-000000000011', '00000000-0000-0000-0000-000000000001', true),
  ('00000000-0000-0000-0000-000000000004', '00000000-0000-0000-0000-000000000013', '00000000-0000-0000-0000-000000000001', true)
ON CONFLICT (agent_id, client_id) DO NOTHING;

-- ============================================================
-- TIME ENTRIES — 20 entrées sur le mois en cours (Avril 2026)
-- ============================================================
INSERT INTO time_entries (
  agent_id, client_id,
  clock_in_at, clock_in_latitude, clock_in_longitude, clock_in_address,
  clock_out_at, clock_out_latitude, clock_out_longitude, clock_out_address,
  status, gps_alert, gps_distance_meters
) VALUES
-- Marie - Margaret (semaine 1)
('00000000-0000-0000-0000-000000000002','00000000-0000-0000-0000-000000000011',
 '2026-04-01 08:00:00+00', 39.7817, -89.6501, '742 Evergreen Terrace, Springfield, IL',
 '2026-04-01 12:30:00+00', 39.7817, -89.6501, '742 Evergreen Terrace, Springfield, IL',
 'completed', false, 0),

('00000000-0000-0000-0000-000000000002','00000000-0000-0000-0000-000000000011',
 '2026-04-03 08:00:00+00', 39.7817, -89.6501, '742 Evergreen Terrace, Springfield, IL',
 '2026-04-03 12:00:00+00', 39.7817, -89.6501, '742 Evergreen Terrace, Springfield, IL',
 'completed', false, 0),

-- Marie - Robert
('00000000-0000-0000-0000-000000000002','00000000-0000-0000-0000-000000000012',
 '2026-04-02 14:00:00+00', 38.8977, -77.0365, '1600 Pennsylvania Avenue, Washington DC',
 '2026-04-02 18:00:00+00', 38.8977, -77.0365, '1600 Pennsylvania Avenue, Washington DC',
 'completed', false, 0),

('00000000-0000-0000-0000-000000000002','00000000-0000-0000-0000-000000000012',
 '2026-04-07 14:00:00+00', 38.8977, -77.0365, '1600 Pennsylvania Avenue, Washington DC',
 '2026-04-07 17:30:00+00', 38.8977, -77.0365, '1600 Pennsylvania Avenue, Washington DC',
 'completed', false, 0),

('00000000-0000-0000-0000-000000000002','00000000-0000-0000-0000-000000000012',
 '2026-04-09 08:30:00+00', 38.9100, -77.0400, 'À 1.5km du client (alerte GPS)',
 '2026-04-09 12:00:00+00', 38.8977, -77.0365, '1600 Pennsylvania Avenue, Washington DC',
 'completed', true, 1520.00),

-- Jean - Eleanor
('00000000-0000-0000-0000-000000000003','00000000-0000-0000-0000-000000000013',
 '2026-04-01 09:00:00+00', 40.7484, -73.9967, '350 Fifth Avenue, New York, NY',
 '2026-04-01 13:00:00+00', 40.7484, -73.9967, '350 Fifth Avenue, New York, NY',
 'completed', false, 0),

('00000000-0000-0000-0000-000000000003','00000000-0000-0000-0000-000000000013',
 '2026-04-04 09:00:00+00', 40.7484, -73.9967, '350 Fifth Avenue, New York, NY',
 '2026-04-04 14:00:00+00', 40.7484, -73.9967, '350 Fifth Avenue, New York, NY',
 'completed', false, 0),

('00000000-0000-0000-0000-000000000003','00000000-0000-0000-0000-000000000013',
 '2026-04-08 09:00:00+00', 40.7484, -73.9967, '350 Fifth Avenue, New York, NY',
 '2026-04-08 12:30:00+00', 40.7484, -73.9967, '350 Fifth Avenue, New York, NY',
 'completed', false, 0),

-- Jean - William
('00000000-0000-0000-0000-000000000003','00000000-0000-0000-0000-000000000014',
 '2026-04-02 10:00:00+00', 37.3318, -122.0312, '1 Infinite Loop, Cupertino, CA',
 '2026-04-02 14:30:00+00', 37.3318, -122.0312, '1 Infinite Loop, Cupertino, CA',
 'completed', false, 0),

('00000000-0000-0000-0000-000000000003','00000000-0000-0000-0000-000000000014',
 '2026-04-05 10:00:00+00', 37.3318, -122.0312, '1 Infinite Loop, Cupertino, CA',
 '2026-04-05 13:00:00+00', 37.3318, -122.0312, '1 Infinite Loop, Cupertino, CA',
 'completed', false, 0),

('00000000-0000-0000-0000-000000000003','00000000-0000-0000-0000-000000000014',
 '2026-04-10 10:00:00+00', 37.3318, -122.0312, '1 Infinite Loop, Cupertino, CA',
 '2026-04-10 15:00:00+00', 37.3318, -122.0312, '1 Infinite Loop, Cupertino, CA',
 'corrected', false, 0),

-- Fatou - Margaret
('00000000-0000-0000-0000-000000000004','00000000-0000-0000-0000-000000000011',
 '2026-04-02 08:00:00+00', 39.7817, -89.6501, '742 Evergreen Terrace, Springfield, IL',
 '2026-04-02 13:00:00+00', 39.7817, -89.6501, '742 Evergreen Terrace, Springfield, IL',
 'completed', false, 0),

('00000000-0000-0000-0000-000000000004','00000000-0000-0000-0000-000000000011',
 '2026-04-06 08:00:00+00', 39.7817, -89.6501, '742 Evergreen Terrace, Springfield, IL',
 '2026-04-06 12:00:00+00', 39.7817, -89.6501, '742 Evergreen Terrace, Springfield, IL',
 'completed', false, 0),

('00000000-0000-0000-0000-000000000004','00000000-0000-0000-0000-000000000011',
 '2026-04-09 08:00:00+00', 39.7817, -89.6501, '742 Evergreen Terrace, Springfield, IL',
 '2026-04-09 12:30:00+00', 39.7817, -89.6501, '742 Evergreen Terrace, Springfield, IL',
 'completed', false, 0),

-- Fatou - Eleanor
('00000000-0000-0000-0000-000000000004','00000000-0000-0000-0000-000000000013',
 '2026-04-03 13:00:00+00', 40.7484, -73.9967, '350 Fifth Avenue, New York, NY',
 '2026-04-03 17:00:00+00', 40.7484, -73.9967, '350 Fifth Avenue, New York, NY',
 'completed', false, 0),

('00000000-0000-0000-0000-000000000004','00000000-0000-0000-0000-000000000013',
 '2026-04-07 13:00:00+00', 40.7484, -73.9967, '350 Fifth Avenue, New York, NY',
 '2026-04-07 18:00:00+00', 40.7484, -73.9967, '350 Fifth Avenue, New York, NY',
 'completed', false, 0),

('00000000-0000-0000-0000-000000000004','00000000-0000-0000-0000-000000000013',
 '2026-04-11 13:00:00+00', 40.7484, -73.9967, '350 Fifth Avenue, New York, NY',
 '2026-04-11 16:30:00+00', 40.7484, -73.9967, '350 Fifth Avenue, New York, NY',
 'completed', false, 0),

-- Session active pour Marie (pour tester le dashboard temps réel)
('00000000-0000-0000-0000-000000000002','00000000-0000-0000-0000-000000000011',
 NOW() - INTERVAL '2 hours', 39.7817, -89.6501, '742 Evergreen Terrace, Springfield, IL',
 NULL, NULL, NULL, NULL,
 'active', false, NULL),

-- Session active depuis plus de 12h pour tester l'alerte
('00000000-0000-0000-0000-000000000003','00000000-0000-0000-0000-000000000014',
 NOW() - INTERVAL '14 hours', 37.3318, -122.0312, '1 Infinite Loop, Cupertino, CA',
 NULL, NULL, NULL, NULL,
 'active', false, NULL),

-- Une entrée corrigée manuellement par l'admin
('00000000-0000-0000-0000-000000000004','00000000-0000-0000-0000-000000000011',
 '2026-04-04 08:00:00+00', 39.7817, -89.6501, '742 Evergreen Terrace, Springfield, IL',
 '2026-04-04 12:00:00+00', 39.7817, -89.6501, '742 Evergreen Terrace, Springfield, IL',
 'corrected', false, 0);

-- Mettre à jour la correction_note sur la dernière entrée
UPDATE time_entries
SET
  correction_note = 'Heure de départ ajustée : Fatou a oublié de faire clock out.',
  corrected_by = '00000000-0000-0000-0000-000000000001'
WHERE agent_id = '00000000-0000-0000-0000-000000000004'
  AND status = 'corrected'
  AND clock_in_at = '2026-04-04 08:00:00+00';

-- ============================================================
-- PÉRIODE DE PAIE — Avril 2026 (draft)
-- ============================================================
INSERT INTO payroll_periods (id, name, period_start, period_end, status, created_by)
VALUES (
  '00000000-0000-0000-0000-000000000021',
  'Paie Avril 2026',
  '2026-04-01',
  '2026-04-30',
  'draft',
  '00000000-0000-0000-0000-000000000001'
) ON CONFLICT (id) DO NOTHING;

-- Réactiver RLS
SET session_replication_role = DEFAULT;

-- ============================================================
-- VÉRIFICATION
-- ============================================================
SELECT 'profiles'                 AS table_name, COUNT(*) FROM profiles
UNION ALL SELECT 'clients',                       COUNT(*) FROM clients
UNION ALL SELECT 'agent_client_assignments',       COUNT(*) FROM agent_client_assignments
UNION ALL SELECT 'time_entries',                   COUNT(*) FROM time_entries
UNION ALL SELECT 'payroll_periods',                COUNT(*) FROM payroll_periods;
