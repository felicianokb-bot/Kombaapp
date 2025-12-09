import fs from 'fs'
import path from 'path'

const envPath = path.resolve(process.cwd(), '.env.local')
const tokenPath = path.resolve(process.cwd(), 'CLI Kombo.txt')
const funcPath = path.resolve(process.cwd(), 'supabase/functions/auth-callback/index.ts')

if (!fs.existsSync(envPath)) { console.error('[erro] .env.local não encontrado'); process.exit(1) }
if (!fs.existsSync(tokenPath)) { console.error('[erro] Token não encontrado em "CLI Kombo.txt"'); process.exit(1) }
if (!fs.existsSync(funcPath)) { console.error('[erro] Função não encontrada em supabase/functions/auth-callback/index.ts'); process.exit(1) }

const envContent = fs.readFileSync(envPath, 'utf8')
const supaUrl = (envContent.match(/^VITE_SUPABASE_URL=(.*)$/m) || [])[1]?.trim()
const anonKey = (envContent.match(/^VITE_SUPABASE_ANON_KEY=(.*)$/m) || [])[1]?.trim()
if (!supaUrl || !anonKey) { console.error('[erro] Variáveis VITE_SUPABASE_URL/VITE_SUPABASE_ANON_KEY não definidas'); process.exit(1) }
const m = supaUrl.match(/^https?:\/\/([^.]+)\.supabase\.co/i)
const ref = m?.[1]
if (!ref) { console.error('[erro] Não foi possível extrair project ref do VITE_SUPABASE_URL'); process.exit(1) }

const token = fs.readFileSync(tokenPath, 'utf8').trim()
if (!token) { console.error('[erro] Token vazio em CLI Kombo.txt'); process.exit(1) }

const code = fs.readFileSync(funcPath, 'utf8')

const run = async () => {
  const fd = new FormData()
  const metadata = { entrypoint_path: 'index.ts', name: 'auth-callback' }
  fd.append('metadata', new Blob([JSON.stringify(metadata)], { type: 'application/json' }), 'metadata.json')
  fd.append('file', new Blob([code], { type: 'text/plain' }), 'index.ts')

  const url = `https://api.supabase.com/v1/projects/${ref}/functions/deploy?slug=auth-callback`
  const res = await fetch(url, { method: 'POST', headers: { Authorization: `Bearer ${token}` }, body: fd })
  const text = await res.text()
  console.log('[deploy-status]', res.status)
  console.log(text)
  if (!res.ok) process.exit(1)

  const invokeUrl = `${supaUrl.replace(/\/$/, '')}/functions/v1/auth-callback?redirect_to=${encodeURIComponent('http://localhost:3000/')}`
  const ping = await fetch(invokeUrl, { method: 'GET', headers: { Authorization: `Bearer ${anonKey}` } , redirect: 'manual' })
  console.log('[invoke-status]', ping.status)
  const loc = ping.headers.get('location')
  if (loc) console.log('[invoke-location]', loc)
}

run().catch(e => { console.error('[erro] Falha ao deploy/invocar função:', e?.message || e); process.exit(1) })

