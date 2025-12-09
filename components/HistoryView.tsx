import React, { useEffect, useState } from 'react'
import { Language, AuthUser, Transaction } from '../types'
import getSupabase from '../services/supabaseClient'

interface HistoryViewProps {
  lang: Language
  user: AuthUser
}

const HistoryView: React.FC<HistoryViewProps> = ({ lang, user }) => {
  const [items, setItems] = useState<Transaction[]>([])
  const [loading, setLoading] = useState<boolean>(false)

  useEffect(() => {
    ;(async () => {
      setLoading(true)
      try {
        const supabase = getSupabase()
        if (!supabase) { setLoading(false); return }
        const { data, error } = await supabase.from('transactions').select('*').eq('user_id', user.id).order('date', { ascending: false }).limit(50)
        if (!error && Array.isArray(data)) {
          const mapped: Transaction[] = (data as any[]).map(r => ({
            id: String(r.id),
            userId: String(r.user_id),
            amount: Number(r.amount||0),
            type: (r.type||'deposit') as Transaction['type'],
            status: (r.status||'pending') as Transaction['status'],
            date: String(r.date||new Date().toISOString()),
            reference: String(r.reference||'')
          }))
          setItems(mapped)
        } else {
          setItems([])
        }
      } catch {
        setItems([])
      }
      setLoading(false)
    })()
  }, [user?.id])

  return (
    <div className="h-full bg-gray-50 dark:bg-gray-900 p-6 md:p-8 transition-colors">
      <div className="max-w-3xl mx-auto">
        <h2 className="text-xl font-bold text-gray-800 dark:text-white mb-4">{lang==='pt'?'Histórico':'History'}</h2>
        <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-sm border border-gray-100 dark:border-gray-700 overflow-hidden">
          <table className="w-full text-sm">
            <thead className="bg-gray-50 dark:bg-gray-700 text-gray-500 dark:text-gray-300">
              <tr>
                <th className="p-3 text-left">{lang==='pt'?'Data':'Date'}</th>
                <th className="p-3 text-left">{lang==='pt'?'Tipo':'Type'}</th>
                <th className="p-3 text-left">{lang==='pt'?'Estado':'Status'}</th>
                <th className="p-3 text-right">Kz</th>
              </tr>
            </thead>
            <tbody>
              {items.map(i => (
                <tr key={i.id} className="border-t border-gray-100 dark:border-gray-700">
                  <td className="p-3 text-gray-700 dark:text-gray-200">{new Date(i.date).toLocaleString()}</td>
                  <td className="p-3 font-bold text-gray-800 dark:text-white">{i.type}</td>
                  <td className="p-3 text-xs font-bold">
                    <span className={i.status==='completed'?'text-green-600 dark:text-green-400':i.status==='failed'?'text-red-600 dark:text-red-400':'text-gray-500 dark:text-gray-300'}>{i.status}</span>
                  </td>
                  <td className="p-3 text-right font-bold text-gray-800 dark:text-white">{i.amount.toLocaleString()}</td>
                </tr>
              ))}
              {items.length===0 && !loading && (
                <tr>
                  <td className="p-6 text-center text-gray-500 dark:text-gray-400" colSpan={4}>{lang==='pt'?'Sem movimentos':'No records'}</td>
                </tr>
              )}
              {loading && (
                <tr>
                  <td className="p-6 text-center text-gray-500 dark:text-gray-400" colSpan={4}>{lang==='pt'?'A carregar...':'Loading...'}</td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  )
}

export default HistoryView

