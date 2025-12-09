import getSupabase from './supabaseClient'

export const getBalance = async (userId: string): Promise<number> => {
  const supabase = getSupabase()
  if (!supabase || !userId) return 0
  try {
    const { data, error } = await supabase.from('wallets').select('balance').eq('user_id', userId).limit(1)
    if (error) return 0
    const b = Array.isArray(data) && data[0] && typeof (data[0] as any).balance === 'number' ? Number((data[0] as any).balance) : 0
    return b
  } catch {
    return 0
  }
}

export default { getBalance }

