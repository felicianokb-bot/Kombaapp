import React, { useState } from 'react'
import { Language, AuthUser } from '../types'
import getSupabase from '../services/supabaseClient'

interface BoostsViewProps {
  lang: Language
  user?: AuthUser
  onPaid?: (newBalance: number) => void
}

const BoostsView: React.FC<BoostsViewProps> = ({ lang, user, onPaid }) => {
  const [loading, setLoading] = useState<string>('')
  const [error, setError] = useState<string | null>(null)
  const tiers = [
    { key: 'start', name: 'Start', price: 300, durationPt: '24 horas', durationEn: '24 hours' },
    { key: 'lite', name: 'Lite', price: 500, durationPt: '3 dias', durationEn: '3 days' },
    { key: 'pro', name: 'Pro', price: 1500, durationPt: '7 dias', durationEn: '7 days' },
    { key: 'max', name: 'Max', price: 2500, durationPt: '15 dias', durationEn: '15 days' },
    { key: 'elite', name: 'Elite', price: 4000, durationPt: '30 dias', durationEn: '30 days' },
  ]
  const handleBuy = async (key: string, price: number) => {
    if (!user) return
    if (loading) return
    setLoading(key)
    setError(null)
    try {
      const supabase = getSupabase()
      if (!supabase) { setError('Supabase'); setLoading(''); return }
      const { pay, getBalance } = await import('../services/walletService')
      const r = await pay(user.id, price, `boost:${key}`)
      if (!r.ok) { setError(lang==='pt'?'Saldo insuficiente':'Insufficient funds') } else {
        const nb = await getBalance(user.id)
        if (onPaid) onPaid(nb)
      }
    } catch (e:any) {
      setError(e?.message || 'Erro')
    }
    setLoading('')
  }
  return (
    <div className="h-full bg-gray-50 dark:bg-gray-900 p-6 md:p-8 transition-colors">
      <div className="max-w-3xl mx-auto space-y-4">
        <h2 className="text-xl font-bold text-gray-800 dark:text-white">{lang==='pt'?'Boosts':'Boosts'}</h2>
        <div className="bg-white dark:bg-gray-800 p-6 rounded-2xl border border-gray-100 dark:border-gray-700 space-y-4">
          <div className="text-sm text-gray-600 dark:text-gray-300">
            {lang==='pt' ? 'Aumente a visibilidade do seu serviço com níveis de Boost.' : 'Increase your service visibility with Boost tiers.'}
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="text-left text-gray-500 dark:text-gray-400">
                  <th className="py-2 font-bold">Boost</th>
                  <th className="py-2 font-bold">{lang==='pt'?'Preço':'Price'}</th>
                  <th className="py-2 font-bold">{lang==='pt'?'Tempo':'Duration'}</th>
                  <th className="py-2 font-bold">{lang==='pt'?'Ação':'Action'}</th>
                </tr>
              </thead>
              <tbody className="text-gray-800 dark:text-gray-200">
                {tiers.map(t => (
                  <tr key={t.key} className="border-t border-gray-100 dark:border-gray-700">
                    <td className="py-2 font-bold">{t.name}</td>
                    <td className="py-2">{t.price} kz</td>
                    <td className="py-2">{lang==='pt'?t.durationPt:t.durationEn}</td>
                    <td className="py-2">
                      <button onClick={() => handleBuy(t.key, t.price)} disabled={!!loading && loading===t.key} className="px-3 py-1.5 rounded-lg bg-blue-600 text-white text-xs font-bold hover:bg-blue-700 disabled:opacity-50">{lang==='pt'?'Pagar':'Pay'}</button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          {error && <div className="text-sm text-red-600 dark:text-red-400">{error}</div>}
        </div>
      </div>
    </div>
  )
}

export default BoostsView
