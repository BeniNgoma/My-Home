const https = require('https')
const PAT = 'sbp_a17fcb6052aa133cb431833d655998bdbccbf368'
const PROJECT_REF = 'fapiaumbdonlskykvmyw'

const sql = `
-- Trigger sur profiles: auto-set organization_id depuis le créateur (via JWT claim)
-- Si organization_id est NULL à l'insert, on cherche via la table profiles de l'appelant

CREATE OR REPLACE FUNCTION profiles_before_insert()
RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  v_org_id UUID;
BEGIN
  -- Si organization_id déjà fourni, on garde
  IF NEW.organization_id IS NOT NULL THEN
    RETURN NEW;
  END IF;

  -- Chercher via auth.uid() (connexion normale)
  SELECT organization_id INTO v_org_id
  FROM profiles
  WHERE id = auth.uid()
  LIMIT 1;

  -- Si toujours NULL, utiliser l'org par défaut (demo)
  IF v_org_id IS NULL THEN
    v_org_id := '00000000-0000-0000-0001-000000000001'::UUID;
  END IF;

  NEW.organization_id := v_org_id;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_profiles_before_insert ON profiles;
CREATE TRIGGER trg_profiles_before_insert
  BEFORE INSERT ON profiles
  FOR EACH ROW EXECUTE FUNCTION profiles_before_insert();

-- Vérification
SELECT 'trigger created' AS status;
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
  console.log('Status:', res.status)
  if (Array.isArray(res.body)) {
    res.body.forEach(row => console.log(JSON.stringify(row)))
  } else {
    console.log(JSON.stringify(res.body).slice(0, 500))
  }
}).catch(e => { console.error(e.message); process.exit(1) })
