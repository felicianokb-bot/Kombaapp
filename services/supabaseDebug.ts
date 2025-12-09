import getSupabase from './supabaseClient'

export type TableCheckResult = { name: string; status: 'ok' | 'missing' | 'error'; message?: string }

export const checkTables = async (tables: string[]): Promise<TableCheckResult[]> => {
  const supabase = getSupabase()
  if (!supabase) return tables.map((name) => ({ name, status: 'error', message: 'Supabase não configurado' }))
  const results: TableCheckResult[] = []
  for (const name of tables) {
    try {
      const { count, error } = await supabase.from(name).select('*', { count: 'exact' }).limit(0)
      if (error) {
        const msg = (error as any)?.message || 'Erro ao consultar'
        const status: 'missing' | 'error' = msg.includes('relation') || msg.includes('not exist') ? 'missing' : 'error'
        results.push({ name, status, message: msg })
      } else {
        results.push({ name, status: 'ok' })
      }
    } catch (e: any) {
      results.push({ name, status: 'error', message: e?.message || 'Erro desconhecido' })
    }
  }
  return results
}

export default checkTables

export const clearTrips = async (): Promise<{ ok: boolean; message?: string }> => {
  const supabase = getSupabase()
  if (!supabase) return { ok: false, message: 'Supabase não configurado' }
  const { error } = await supabase.from('trips').delete().not('id', 'is', null)
  if (error) return { ok: false, message: (error as any)?.message || 'Erro ao apagar' }
  return { ok: true }
}

export const clearMyTrips = async (): Promise<{ ok: boolean; message?: string }> => {
  const supabase = getSupabase()
  if (!supabase) return { ok: false, message: 'Supabase não configurado' }
  const { data } = await supabase.auth.getUser()
  const user = data?.user
  if (!user) return { ok: false, message: 'Sem utilizador autenticado' }
  const { error } = await supabase.from('trips').delete().eq('host_id', user.id)
  if (error) return { ok: false, message: (error as any)?.message || 'Erro ao apagar' }
  return { ok: true }
}

export const clearRLSTests = async (userId?: string): Promise<{ ok: boolean; message?: string }> => {
  const supabase = getSupabase()
  if (!supabase) return { ok: false, message: 'Supabase não configurado' }
  try {
    let q = supabase.from('transactions').delete().eq('reference', 'rls_test')
    if (userId) q = q.eq('user_id', userId)
    const { error } = await q
    if (error) return { ok: false, message: (error as any)?.message || 'Erro ao apagar' }
  } catch (e: any) {
    return { ok: false, message: e?.message || 'Erro ao apagar' }
  }
  return { ok: true }
}

export type RLSTestResult = { op: string; ok: boolean; message?: string }

export const testRLS = async (userId: string): Promise<RLSTestResult[]> => {
  const supabase = getSupabase()
  if (!supabase) return [{ op: 'env', ok: false, message: 'Supabase não configurado' }]
  const out: RLSTestResult[] = []
  try {
    const { error } = await supabase.from('profiles').select('*', { count: 'exact' }).eq('user_id', userId).limit(0)
    out.push({ op: 'profiles.select.own', ok: !error, message: (error as any)?.message })
  } catch (e: any) {
    out.push({ op: 'profiles.select.own', ok: false, message: e?.message || String(e) })
  }
  try {
    const { error } = await supabase.from('profiles').upsert({ user_id: userId, name: 'RLS Test' })
    out.push({ op: 'profiles.upsert.own', ok: !error, message: (error as any)?.message })
  } catch (e: any) {
    out.push({ op: 'profiles.upsert.own', ok: false, message: e?.message || String(e) })
  }
  try {
    const { error } = await supabase.from('profiles').update({ name: 'RLS Test 2' }).eq('user_id', userId)
    out.push({ op: 'profiles.update.own', ok: !error, message: (error as any)?.message })
  } catch (e: any) {
    out.push({ op: 'profiles.update.own', ok: false, message: e?.message || String(e) })
  }
  try {
    const { error } = await supabase.from('wallets').select('*', { count: 'exact' }).eq('user_id', userId).limit(0)
    out.push({ op: 'wallets.select.own', ok: !error, message: (error as any)?.message })
  } catch (e: any) {
    out.push({ op: 'wallets.select.own', ok: false, message: e?.message || String(e) })
  }
  try {
    const { error } = await supabase.from('wallets').upsert({ user_id: userId, balance: 0 })
    out.push({ op: 'wallets.upsert.own', ok: !error, message: (error as any)?.message })
  } catch (e: any) {
    out.push({ op: 'wallets.upsert.own', ok: false, message: e?.message || String(e) })
  }
  try {
    const { error } = await supabase.from('transactions').insert({ user_id: userId, amount: 1, type: 'deposit', status: 'pending', date: new Date().toISOString(), reference: 'rls_test' })
    out.push({ op: 'transactions.insert.own', ok: !error, message: (error as any)?.message })
    try { await supabase.from('transactions').delete().eq('user_id', userId).eq('reference', 'rls_test') } catch (_e) {}
  } catch (e: any) {
    out.push({ op: 'transactions.insert.own', ok: false, message: e?.message || String(e) })
  }
  const other = '00000000-0000-0000-0000-000000000001'
  try {
    const { error } = await supabase.from('transactions').insert({ user_id: other, amount: 1, type: 'deposit', status: 'pending', date: new Date().toISOString(), reference: 'rls_test_other' })
    out.push({ op: 'transactions.insert.other', ok: !error, message: (error as any)?.message })
    try { await supabase.from('transactions').delete().eq('user_id', other).eq('reference', 'rls_test_other') } catch (_e) {}
  } catch (e: any) {
    out.push({ op: 'transactions.insert.other', ok: false, message: e?.message || String(e) })
  }
  try {
    const { error } = await supabase.from('wallets').insert({ user_id: other, balance: 0 })
    out.push({ op: 'wallets.insert.other', ok: !error, message: (error as any)?.message })
  } catch (e: any) {
    out.push({ op: 'wallets.insert.other', ok: false, message: e?.message || String(e) })
  }
  try {
    const { data, error } = await supabase
      .from('wallets')
      .update({ balance: 0 })
      .eq('user_id', other)
      .select('user_id')
    const changed = Array.isArray(data) ? data.length > 0 : !!data
    out.push({ op: 'wallets.update.other', ok: !error && changed, message: (error as any)?.message })
  } catch (e: any) {
    out.push({ op: 'wallets.update.other', ok: false, message: e?.message || String(e) })
  }
  try {
    const { error } = await supabase.from('trips').select('*', { count: 'exact' }).limit(0)
    out.push({ op: 'trips.select.global', ok: !error, message: (error as any)?.message })
  } catch (e: any) {
    out.push({ op: 'trips.select.global', ok: false, message: e?.message || String(e) })
  }
  try {
    const { error } = await supabase.from('services').select('*', { count: 'exact' }).limit(0)
    out.push({ op: 'services.select.global', ok: !error, message: (error as any)?.message })
  } catch (e: any) {
    out.push({ op: 'services.select.global', ok: false, message: e?.message || String(e) })
  }
  return out
}
