import { createClient } from '@supabase/supabase-js'
import fs from 'fs'
import path from 'path'

const envPath = path.resolve(process.cwd(), '.env.local')
let SUPABASE_URL = process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL
let SUPABASE_ANON_KEY = process.env.SUPABASE_ANON_KEY || process.env.VITE_SUPABASE_ANON_KEY

if ((!SUPABASE_URL || !SUPABASE_ANON_KEY) && fs.existsSync(envPath)) {
  const content = fs.readFileSync(envPath, 'utf8')
  for (const line of content.split(/\r?\n/)) {
    const m = line.match(/^([A-Z0-9_]+)=(.*)$/)
    if (m) {
      const [, k, v] = m
      if (k === 'SUPABASE_URL' || k === 'VITE_SUPABASE_URL') SUPABASE_URL = v.trim()
      if (k === 'SUPABASE_ANON_KEY' || k === 'VITE_SUPABASE_ANON_KEY') SUPABASE_ANON_KEY = v.trim()
    }
  }
}

if (!SUPABASE_URL || !SUPABASE_ANON_KEY) {
  console.error('[erro] Variáveis SUPABASE_URL/SUPABASE_ANON_KEY não encontradas')
  process.exit(1)
}

const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY)

const tables = ['services', 'trips', 'profiles', 'messages', 'transactions', 'wallets']

const check = async (name) => {
  console.log(`[info] Checking table: ${name}`)
  try {
    const { error } = await supabase.from(name).select('*', { count: 'exact', head: true })
    if (error) {
      const msg = error.message || String(error)
      const missing = /relation .* does not exist|not exist|missing/i.test(msg)
      console.log(`[${missing ? 'missing' : 'error'}] ${name} -> ${msg}`)
    } else {
      console.log(`[ok] ${name}`)
    }
  } catch (e) {
    console.log(`[error] ${name} -> ${e?.message || e}`)
  }
}

const sample = async (name) => {
  try {
    const { data, error } = await supabase.from(name).select('*').limit(5)
    if (error) {
      console.log(`[sample-error] ${name} -> ${error.message || String(error)}`)
      return
    }
    if (!data || !data.length) {
      console.log(`[sample-empty] ${name}`)
      return
    }
    const keys = Object.keys(data[0] || {})
    console.log(`[sample-keys] ${name} -> ${keys.join(', ')}`)
    console.log(`[sample-first] ${name} -> ${JSON.stringify(data[0])}`)
  } catch (e) {
    console.log(`[sample-error] ${name} -> ${e?.message || e}`)
  }
}

;(async () => {
  console.log('[info] Verificando conexão ao Supabase...')
  try {
    const { data, error } = await supabase.auth.getUser()
    if (error) console.log(`[info] Sem sessão: ${error.message}`)
    else console.log(`[info] Sessão atual: ${data?.user?.id || 'nenhuma'}`)
  } catch (e) {
    console.log(`[info] Erro ao obter sessão: ${e?.message || e}`)
  }
  for (const t of tables) await check(t)
  for (const t of tables) await sample(t)
  console.log('[info] Fim da verificação')
})()
