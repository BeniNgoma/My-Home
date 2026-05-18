const https = require('https')
const PAT = process.env.SUPABASE_PAT || ''
const PROJECT_REF = 'fapiaumbdonlskykvmyw'

const ADMIN = 'a0d441e0-d48a-426e-9c2f-31c03d6f0baf'
const MARIE = 'eca435d0-c74d-4f48-9591-9a1ceee9855a'
const JEAN  = 'd8c918b9-9b34-4f91-a5a7-e0fdb2962c49'
const FATOU = '93662738-779d-4da3-9f1f-c042a555c673'

const C1 = '00000000-0000-0000-0000-000000000011'
const C2 = '00000000-0000-0000-0000-000000000012'
const C3 = '00000000-0000-0000-0000-000000000013'
const C4 = '00000000-0000-0000-0000-000000000014'
const PP = '00000000-0000-0000-0000-000000000021'

const sql = `
SET session_replication_role = replica;

UPDATE profiles SET phone = '+1-555-000-0001', hourly_rate = 0  WHERE email = 'admin@caretrack.com';
UPDATE profiles SET phone = '+1-555-000-0002', hourly_rate = 15 WHERE email = 'marie.dupont@caretrack.com';
UPDATE profiles SET phone = '+1-555-000-0003', hourly_rate = 17 WHERE email = 'jean.martin@caretrack.com';
UPDATE profiles SET phone = '+1-555-000-0004', hourly_rate = 20 WHERE email = 'fatou.diallo@caretrack.com';

INSERT INTO clients (id, full_name, address, phone, email, notes, is_active, latitude, longitude, created_by) VALUES
  ('${C1}','Margaret Thompson','742 Evergreen Terrace, Springfield, IL 62701','+1-555-100-0001','margaret.thompson@email.com','Diabetique, medicaments 8h et 20h. Allergie aux noix.',true,39.7817,-89.6501,'${ADMIN}'),
  ('${C2}','Robert Johnson','1600 Pennsylvania Avenue, Washington, DC 20500','+1-555-100-0002','robert.j@email.com','Mobilite reduite. Fauteuil roulant. Kine mardi/jeudi.',true,38.8977,-77.0365,'${ADMIN}'),
  ('${C3}','Eleanor Garcia','350 Fifth Avenue, New York, NY 10118','+1-555-100-0003','eleanor.garcia@email.com','Alzheimer leger. Activites de stimulation cognitive.',true,40.7484,-73.9967,'${ADMIN}'),
  ('${C4}','William Chen','1 Infinite Loop, Cupertino, CA 95014','+1-555-100-0004','william.chen@email.com','Post-operatoire. Verifier pansements quotidiennement.',true,37.3318,-122.0312,'${ADMIN}')
ON CONFLICT (id) DO NOTHING;

INSERT INTO agent_client_assignments (agent_id, client_id, assigned_by, is_active) VALUES
  ('${MARIE}','${C1}','${ADMIN}',true),
  ('${MARIE}','${C2}','${ADMIN}',true),
  ('${JEAN}', '${C3}','${ADMIN}',true),
  ('${JEAN}', '${C4}','${ADMIN}',true),
  ('${FATOU}','${C1}','${ADMIN}',true),
  ('${FATOU}','${C3}','${ADMIN}',true)
ON CONFLICT (agent_id, client_id) DO NOTHING;

INSERT INTO time_entries (agent_id, client_id, clock_in_at, clock_in_latitude, clock_in_longitude, clock_in_address, clock_out_at, clock_out_latitude, clock_out_longitude, clock_out_address, status, gps_alert, gps_distance_meters) VALUES
('${MARIE}','${C1}','2026-04-01 08:00:00+00',39.7817,-89.6501,'742 Evergreen Terrace, Springfield, IL','2026-04-01 12:30:00+00',39.7817,-89.6501,'742 Evergreen Terrace, Springfield, IL','completed',false,0),
('${MARIE}','${C1}','2026-04-03 08:00:00+00',39.7817,-89.6501,'742 Evergreen Terrace, Springfield, IL','2026-04-03 12:00:00+00',39.7817,-89.6501,'742 Evergreen Terrace, Springfield, IL','completed',false,0),
('${MARIE}','${C2}','2026-04-02 14:00:00+00',38.8977,-77.0365,'1600 Pennsylvania Avenue, Washington DC','2026-04-02 18:00:00+00',38.8977,-77.0365,'1600 Pennsylvania Avenue, Washington DC','completed',false,0),
('${MARIE}','${C2}','2026-04-07 14:00:00+00',38.8977,-77.0365,'1600 Pennsylvania Avenue, Washington DC','2026-04-07 17:30:00+00',38.8977,-77.0365,'1600 Pennsylvania Avenue, Washington DC','completed',false,0),
('${MARIE}','${C2}','2026-04-09 08:30:00+00',38.9100,-77.0400,'A 1.5km du client (alerte GPS)','2026-04-09 12:00:00+00',38.8977,-77.0365,'1600 Pennsylvania Avenue, Washington DC','completed',true,1520),
('${JEAN}', '${C3}','2026-04-01 09:00:00+00',40.7484,-73.9967,'350 Fifth Avenue, New York, NY','2026-04-01 13:00:00+00',40.7484,-73.9967,'350 Fifth Avenue, New York, NY','completed',false,0),
('${JEAN}', '${C3}','2026-04-04 09:00:00+00',40.7484,-73.9967,'350 Fifth Avenue, New York, NY','2026-04-04 14:00:00+00',40.7484,-73.9967,'350 Fifth Avenue, New York, NY','completed',false,0),
('${JEAN}', '${C3}','2026-04-08 09:00:00+00',40.7484,-73.9967,'350 Fifth Avenue, New York, NY','2026-04-08 12:30:00+00',40.7484,-73.9967,'350 Fifth Avenue, New York, NY','completed',false,0),
('${JEAN}', '${C4}','2026-04-02 10:00:00+00',37.3318,-122.0312,'1 Infinite Loop, Cupertino, CA','2026-04-02 14:30:00+00',37.3318,-122.0312,'1 Infinite Loop, Cupertino, CA','completed',false,0),
('${JEAN}', '${C4}','2026-04-05 10:00:00+00',37.3318,-122.0312,'1 Infinite Loop, Cupertino, CA','2026-04-05 13:00:00+00',37.3318,-122.0312,'1 Infinite Loop, Cupertino, CA','completed',false,0),
('${JEAN}', '${C4}','2026-04-10 10:00:00+00',37.3318,-122.0312,'1 Infinite Loop, Cupertino, CA','2026-04-10 15:00:00+00',37.3318,-122.0312,'1 Infinite Loop, Cupertino, CA','corrected',false,0),
('${FATOU}','${C1}','2026-04-02 08:00:00+00',39.7817,-89.6501,'742 Evergreen Terrace, Springfield, IL','2026-04-02 13:00:00+00',39.7817,-89.6501,'742 Evergreen Terrace, Springfield, IL','completed',false,0),
('${FATOU}','${C1}','2026-04-06 08:00:00+00',39.7817,-89.6501,'742 Evergreen Terrace, Springfield, IL','2026-04-06 12:00:00+00',39.7817,-89.6501,'742 Evergreen Terrace, Springfield, IL','completed',false,0),
('${FATOU}','${C1}','2026-04-09 08:00:00+00',39.7817,-89.6501,'742 Evergreen Terrace, Springfield, IL','2026-04-09 12:30:00+00',39.7817,-89.6501,'742 Evergreen Terrace, Springfield, IL','completed',false,0),
('${FATOU}','${C3}','2026-04-03 13:00:00+00',40.7484,-73.9967,'350 Fifth Avenue, New York, NY','2026-04-03 17:00:00+00',40.7484,-73.9967,'350 Fifth Avenue, New York, NY','completed',false,0),
('${FATOU}','${C3}','2026-04-07 13:00:00+00',40.7484,-73.9967,'350 Fifth Avenue, New York, NY','2026-04-07 18:00:00+00',40.7484,-73.9967,'350 Fifth Avenue, New York, NY','completed',false,0),
('${FATOU}','${C3}','2026-04-11 13:00:00+00',40.7484,-73.9967,'350 Fifth Avenue, New York, NY','2026-04-11 16:30:00+00',40.7484,-73.9967,'350 Fifth Avenue, New York, NY','completed',false,0),
('${MARIE}','${C1}',NOW() - INTERVAL '2 hours',39.7817,-89.6501,'742 Evergreen Terrace, Springfield, IL',NULL,NULL,NULL,NULL,'active',false,NULL),
('${JEAN}', '${C4}',NOW() - INTERVAL '14 hours',37.3318,-122.0312,'1 Infinite Loop, Cupertino, CA',NULL,NULL,NULL,NULL,'active',false,NULL),
('${FATOU}','${C1}','2026-04-04 08:00:00+00',39.7817,-89.6501,'742 Evergreen Terrace, Springfield, IL','2026-04-04 12:00:00+00',39.7817,-89.6501,'742 Evergreen Terrace, Springfield, IL','corrected',false,0);

UPDATE time_entries
SET correction_note = 'Heure de depart ajustee : Fatou a oublie de faire clock out.', corrected_by = '${ADMIN}'
WHERE agent_id = '${FATOU}' AND status = 'corrected' AND clock_in_at = '2026-04-04 08:00:00+00';

INSERT INTO payroll_periods (id, name, period_start, period_end, status, created_by)
VALUES ('${PP}','Paie Avril 2026','2026-04-01','2026-04-30','draft','${ADMIN}')
ON CONFLICT (id) DO NOTHING;

SET session_replication_role = DEFAULT;

SELECT 'profiles' AS t, COUNT(*)::text AS n FROM profiles
UNION ALL SELECT 'clients', COUNT(*)::text FROM clients
UNION ALL SELECT 'assignments', COUNT(*)::text FROM agent_client_assignments
UNION ALL SELECT 'time_entries', COUNT(*)::text FROM time_entries
UNION ALL SELECT 'payroll_periods', COUNT(*)::text FROM payroll_periods;
`

function query(sql) {
  return new Promise((resolve, reject) => {
    const data = JSON.stringify({ query: sql })
    const options = {
      hostname: 'api.supabase.com',
      path: `/v1/projects/${PROJECT_REF}/database/query`,
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${PAT}`,
        'Content-Type': 'application/json',
        'Content-Length': Buffer.byteLength(data),
      },
    }
    const req = https.request(options, res => {
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
  console.log('Status:', res.status)
  if (Array.isArray(res.body)) {
    res.body.forEach(row => console.log(' ', row.t, ':', row.n))
  } else {
    console.log(JSON.stringify(res.body).slice(0, 500))
  }
}).catch(e => console.error(e.message))
