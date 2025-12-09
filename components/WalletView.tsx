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
  const [error, setError] = useState<string | null>(null)

  const loadBalance = async () => {
    setLoading(true)
    setError(null)
    try {
      const supabase = getSupabase()
      if (!supabase) { setError('Supabase'); setLoading(false); return }
      const { data, error } = await supabase.from('wallets').select('balance').eq('user_id', user.id).limit(1)
      if (error) { setError(error.message); setLoading(false); return }
      const b = Array.isArray(data) && data[0] && typeof (data[0] as any).balance === 'number' ? Number((data[0] as any).balance) : 0
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
            <button onClick={loadBalance} disabled={loading} className="px-4 py-2 rounded-lg bg-blue-600 text-white font-bold text-sm hover:bg-blue-700 disabled:opacity-50">{lang==='pt'?'Atualizar':'Refresh'}</button>
          </div>
          {error && <div className="mt-3 text-sm text-red-600 dark:text-red-400">{error}</div>}
        </div>
        <div className="bg-white dark:bg-gray-800 p-6 rounded-2xl shadow-sm border border-gray-100 dark:border-gray-700">
          <div className="font-bold text-gray-700 dark:text-gray-200 mb-3 text-sm">{lang==='pt'?'Ações':'Actions'}</div>
          <div className="grid grid-cols-2 gap-3">
            <button className="px-4 py-3 rounded-xl bg-green-600 text-white font-bold text-sm hover:bg-green-700">{lang==='pt'?'Carregar Conta':'Add Funds'}</button>
            <button className="px-4 py-3 rounded-xl bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-200 font-bold text-sm">{lang==='pt'?'Sacar':'Withdraw'}</button>
          </div>
        </div>
      </div>
    </div>
  )
}

export default WalletView

