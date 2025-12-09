import { createClient, SupabaseClient } from '@supabase/supabase-js'

let cached: SupabaseClient | null = null
const LOG_KEY = 'kombo_logs'
const LOG_MAX = 200

export const getSupabase = (): SupabaseClient | null => {
  if (cached) return cached
  const env = (import.meta as any)?.env || {}
  const url = (env?.VITE_SUPABASE_URL as string)
    || (process.env.VITE_SUPABASE_URL as string)
    || (process.env.SUPABASE_URL as string)
  const key = (env?.VITE_SUPABASE_ANON_KEY as string)
    || (process.env.VITE_SUPABASE_ANON_KEY as string)
    || (process.env.SUPABASE_ANON_KEY as string)
  if (!url || !key) {
    console.warn('[kombo] Supabase env missing', { hasUrl: !!url, hasKey: !!key })
    return null
  }
  cached = createClient(url, key, {
    auth: {
      persistSession: true,
      autoRefreshToken: true,
      flowType: 'pkce'
    }
  })
  return cached
}

export const logEvent = (tag: string, payload?: any) => {
  try {
    const now = new Date().toISOString()
    const entry = { ts: now, tag, payload }
    const raw = localStorage.getItem(LOG_KEY)
    const arr = raw ? JSON.parse(raw) : []
    arr.push(entry)
    if (arr.length > LOG_MAX) arr.splice(0, arr.length - LOG_MAX)
    localStorage.setItem(LOG_KEY, JSON.stringify(arr))
  } catch (_e) {}
}

export const getLogs = (): Array<{ ts: string; tag: string; payload?: any }> => {
  try {
    const raw = localStorage.getItem(LOG_KEY)
    return raw ? JSON.parse(raw) : []
  } catch (_e) {
    return []
  }
}

export default getSupabase
