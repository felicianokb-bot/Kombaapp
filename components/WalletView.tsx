import React, { useEffect, useState } from 'react'
import { Language, AuthUser } from '../types'
import getSupabase from '../services/supabaseClient'

interface WalletViewProps {
  lang: Language
  user: AuthUser
  onBalanceChanged?: (balance: number) => void
}

const WalletView: React.FC<WalletViewProps> = ({ lang, user, onBalanceChanged }) => {
  const [balance, setBalance] = useState<number>(0)
  const [loading, setLoading] = useState<boolean>(false)
  const [amount, setAmount] = useState<string>('')
  const [error, setError] = useState<string | null>(null)

  const loadBalance = async () => {
    setLoading(true)
    setError(null)
    try {
      const supabase = getSupabase()
      if (!supabase) { setError('Supabase'); setLoading(false); return }
      const { data, error } = await supabase.from('wallets').select('balance').eq('user_id', user.id).limit(1)
      if (error) { setError(error.message); setLoading(false); return }
      const raw = Array.isArray(data) ? (data[0] as any)?.balance : null
      const b = raw !== null && raw !== undefined ? Number(raw) : 0
      setBalance(b)
      if (onBalanceChanged) onBalanceChanged(b)
    } catch (e: any) {
      setError(e?.message || 'Erro')
    }
    setLoading(false)
  }

  useEffect(() => { loadBalance() }, [user?.id])

  return (
    <div className="h-full bg-gray-50 dark:bg-gray-900 p-6 md:p-8 transition-colors">
      <div className="max-w-3xl mx-auto space-y-6">
        <div className="bg-white dark:bg-gray-800 p-6 rounded-2xl shadow-sm border border-gray-100 dark:border-gray-700">
          <div className="flex items-center justify-between">
            <div>
              <div className="text-xs font-bold uppercase text-gray-500 dark:text-gray-400">{lang==='pt'?'Saldo':'Balance'}</div>
              <div className="text-3xl md:text-4xl font-bold text-gray-800 dark:text-white">Kz {balance.toLocaleString()}</div>
            </div>
          </div>
          {error && <div className="mt-3 text-sm text-red-600 dark:text-red-400">{error}</div>}
        </div>
        <div className="bg-white dark:bg-gray-800 p-6 rounded-2xl shadow-sm border border-gray-100 dark:border-gray-700">
          <div className="font-bold text-gray-700 dark:text-gray-200 mb-3 text-sm">{lang==='pt'?'Ações':'Actions'}</div>
          <div className="flex items-center gap-3 mb-4">
            <input value={amount} onChange={(e) => setAmount(e.target.value)} type="number" placeholder={lang==='pt'?'Valor (Kz)':'Amount (Kz)'} className="flex-1 px-3 py-2 rounded-lg border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900 text-sm" />
            <button onClick={async () => { if (loading) return; setLoading(true); setError(null); const v = Number(amount); if (!v || v <= 0) { setError(lang==='pt'?'Valor inválido':'Invalid amount'); setLoading(false); return } try { const supabase = getSupabase(); if (!supabase) { setError('Supabase'); setLoading(false); return } const { addFunds } = await import('../services/walletService'); const next = await addFunds(user.id, v); setBalance(next); if (onBalanceChanged) onBalanceChanged(next); setAmount(''); } catch (e:any) { setError(e?.message||'Erro') } setLoading(false) }} disabled={loading} className="px-4 py-2 rounded-lg bg-green-600 text-white font-bold text-sm hover:bg-green-700 disabled:opacity-50">{lang==='pt'?'Carregar':'Add'}</button>
            <button onClick={async () => { if (loading) return; setLoading(true); setError(null); const v = Number(amount); if (!v || v <= 0) { setError(lang==='pt'?'Valor inválido':'Invalid amount'); setLoading(false); return } try { const supabase = getSupabase(); if (!supabase) { setError('Supabase'); setLoading(false); return } const { withdrawFunds } = await import('../services/walletService'); const r = await withdrawFunds(user.id, v); if (!r.ok) { setError(lang==='pt'?'Saldo insuficiente':'Insufficient funds'); } else { setBalance(r.balance); if (onBalanceChanged) onBalanceChanged(r.balance); setAmount(''); } } catch (e:any) { setError(e?.message||'Erro') } setLoading(false) }} disabled={loading} className="px-4 py-2 rounded-lg bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-200 font-bold text-sm disabled:opacity-50">{lang==='pt'?'Sacar':'Withdraw'}</button>
          </div>
        </div>
      </div>
    </div>
  )
}

export default WalletView

