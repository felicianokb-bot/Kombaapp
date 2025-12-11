import { createClient } from '@supabase/supabase-js'
import fs from 'node:fs/promises'

const url = process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL
const key = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_ANON_KEY || process.env.VITE_SUPABASE_ANON_KEY

if (!url || !key) {
  console.error('[export] Missing Supabase env. Set SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY (preferred) or SUPABASE_ANON_KEY.')
  process.exit(1)
}

const supabase = createClient(url, key)

const TABLES = [
  'profiles',
  'wallets',
  'transactions',
  'trips',
  'services',
  'provider_presence',
  'locations',
  'messages',
  'jobs'
]

async function fetchAll(table, pageSize = 1000) {
  let offset = 0
  const out = []
  for (;;) {
    const { data, error } = await supabase
      .from(table)
      .select('*')
      .range(offset, offset + pageSize - 1)
    if (error) {
      console.error(`[export] Error fetching ${table}:`, error.message)
      break
    }
    if (!data || data.length === 0) break
    out.push(...data)
    if (data.length < pageSize) break
    offset += pageSize
  }
  return out
}

async function main() {
  const result = {}
  for (const t of TABLES) {
    try {
      const rows = await fetchAll(t)
      result[t] = rows
      console.log(`[export] ${t}: ${rows.length} rows`)
    } catch (e) {
      console.error(`[export] Failed ${t}:`, e?.message || e)
      result[t] = []
    }
  }
  const file = 'supabase-export.json'
  await fs.writeFile(file, JSON.stringify(result, null, 2), 'utf8')
  console.log(`[export] Written ${file}`)
}

main().catch((e) => { console.error('[export] Fatal:', e); process.exit(1) })

