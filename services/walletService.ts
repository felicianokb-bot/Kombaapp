import getSupabase from './supabaseClient'

export const getBalance = async (userId: string): Promise<number> => {
  const supabase = getSupabase()
  if (!supabase || !userId) return 0
  try {
    const { data } = await supabase.from('wallets').select('balance').eq('user_id', userId).limit(1)
    const raw = Array.isArray(data) ? (data[0] as any)?.balance : null
    const b = raw !== null && raw !== undefined ? Number(raw) : 0
    return b
  } catch {
    return 0
  }
}

export const ensureWallet = async (userId: string): Promise<void> => {
  const supabase = getSupabase()
  if (!supabase || !userId) return
  await supabase.from('wallets').upsert({ user_id: userId, balance: 0 })
}

export const addFunds = async (userId: string, amount: number): Promise<number> => {
  const supabase = getSupabase()
  if (!supabase || !userId || !amount || amount <= 0) return 0
  await ensureWallet(userId)
  const current = await getBalance(userId)
  const next = current + amount
  await supabase.from('wallets').update({ balance: next }).eq('user_id', userId)
  await supabase.from('transactions').insert({ user_id: userId, amount, type: 'deposit', status: 'completed', reference: 'manual' })
  return next
}

export const withdrawFunds = async (userId: string, amount: number): Promise<{ ok: boolean; balance: number; error?: string }> => {
  const supabase = getSupabase()
  if (!supabase || !userId || !amount || amount <= 0) return { ok: false, balance: 0, error: 'invalid' }
  await ensureWallet(userId)
  const current = await getBalance(userId)
  if (amount > current) return { ok: false, balance: current, error: 'insufficient' }
  const next = current - amount
  await supabase.from('wallets').update({ balance: next }).eq('user_id', userId)
  await supabase.from('transactions').insert({ user_id: userId, amount, type: 'withdrawal', status: 'completed', reference: 'manual' })
  return { ok: true, balance: next }
}

export const pay = async (userId: string, amount: number, reference: string): Promise<{ ok: boolean; balance: number; error?: string }> => {
  const supabase = getSupabase()
  if (!supabase || !userId || !amount || amount <= 0) return { ok: false, balance: 0, error: 'invalid' }
  await ensureWallet(userId)
  const current = await getBalance(userId)
  if (amount > current) return { ok: false, balance: current, error: 'insufficient' }
  const next = current - amount
  await supabase.from('wallets').update({ balance: next }).eq('user_id', userId)
  await supabase.from('transactions').insert({ user_id: userId, amount, type: 'payment', status: 'completed', reference })
  return { ok: true, balance: next }
}

export default { getBalance, ensureWallet, addFunds, withdrawFunds, pay }

