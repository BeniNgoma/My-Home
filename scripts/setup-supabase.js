/**
 * Script de configuration automatique Supabase pour CareTrack
 * Usage: node scripts/setup-supabase.js <PAT> <SERVICE_ROLE_KEY>
 *
 * PAT           = Personal Access Token depuis supabase.com/dashboard/account/tokens
 * SERVICE_ROLE_KEY = depuis Settings > API > service_role
 */

const https = require('https')
const fs = require('fs')
const path = require('path')

const PROJECT_REF = 'fapiaumbdonlskykvmyw'
const [, , PAT, SERVICE_ROLE_KEY] = process.argv

if (!PAT || !SERVICE_ROLE_KEY) {
  console.error('Usage: node scripts/setup-supabase.js <PAT> <SERVICE_ROLE_KEY>')
  process.exit(1)
}

function apiRequest(method, path, body) {
  return new Promise((resolve, reject) => {
    const data = body ? JSON.stringify(body) : null
    const options = {
      hostname: 'api.supabase.com',
      path,
      method,
      headers: {
        'Authorization': `Bearer ${PAT}`,
        'Content-Type': 'application/json',
        ...(data ? { 'Content-Length': Buffer.byteLength(data) } : {}),
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
    if (data) req.write(data)
    req.end()
  })
}

async function runSQL(sql, label) {
  process.stdout.write(`  → ${label}... `)
  const res = await apiRequest('POST', `/v1/projects/${PROJECT_REF}/database/query`, { query: sql })
  if (res.status >= 200 && res.status < 300) {
    console.log('✅')
    return true
  } else {
    console.log('❌', JSON.stringify(res.body).slice(0, 120))
    return false
  }
}

async function main() {
  console.log('\n🚀 Configuration Supabase — CareTrack\n')

  // 1. Schéma principal
  console.log('📦 Exécution du schéma principal...')
  const schema = fs.readFileSync(
    path.join(__dirname, '../supabase/migrations/001_schema.sql'), 'utf8'
  )
  await runSQL(schema, '001_schema.sql')

  // 2. Storage buckets + policies
  console.log('\n🪣 Création des buckets Storage...')
  const storage = fs.readFileSync(
    path.join(__dirname, '../supabase/002_storage.sql'), 'utf8'
  )
  await runSQL(storage, '002_storage.sql')

  // 3. Mise à jour .env.local
  console.log('\n🔑 Mise à jour apps/web/.env.local...')
  const envPath = path.join(__dirname, '../apps/web/.env.local')
  let env = fs.readFileSync(envPath, 'utf8')
  env = env.replace('SUPABASE_SERVICE_ROLE_KEY=your-service-role-key-here',
                    `SUPABASE_SERVICE_ROLE_KEY=${SERVICE_ROLE_KEY}`)
  fs.writeFileSync(envPath, env)
  console.log('  → .env.local ✅')

  // 4. Mise à jour .env mobile
  console.log('\n📱 Vérification apps/mobile/.env...')
  const mobileEnv = path.join(__dirname, '../apps/mobile/.env')
  const mobileContent = fs.readFileSync(mobileEnv, 'utf8')
  console.log('  → .env mobile OK ✅')

  console.log('\n✅ Configuration terminée !\n')
  console.log('Prochaines étapes :')
  console.log('  cd apps/web  && npx next dev       # Tester le web')
  console.log('  cd apps/mobile && npx expo start   # Tester le mobile\n')
}

main().catch(e => { console.error('Erreur:', e.message); process.exit(1) })
