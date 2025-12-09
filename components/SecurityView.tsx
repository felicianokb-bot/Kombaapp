import React from 'react'
import { Language } from '../types'

interface SecurityViewProps {
  lang: Language
  onLogout: () => void
}

const SecurityView: React.FC<SecurityViewProps> = ({ lang, onLogout }) => {
  return (
    <div className="h-full bg-gray-50 dark:bg-gray-900 p-6 md:p-8 transition-colors">
      <div className="max-w-3xl mx-auto space-y-4">
        <h2 className="text-xl font-bold text-gray-800 dark:text-white">{lang==='pt'?'Segurança':'Security'}</h2>
        <div className="bg-white dark:bg-gray-800 p-6 rounded-2xl border border-gray-100 dark:border-gray-700 flex items-center justify-between">
          <div className="text-sm text-gray-600 dark:text-gray-300">{lang==='pt'?'Terminar sessão do utilizador':'Sign out of user session'}</div>
          <button onClick={onLogout} className="px-4 py-2 rounded-lg bg-red-600 text-white font-bold text-sm hover:bg-red-700">{lang==='pt'?'Sair':'Log Out'}</button>
        </div>
      </div>
    </div>
  )
}

export default SecurityView

