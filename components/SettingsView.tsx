import React from 'react'
import { Language } from '../types'

interface SettingsViewProps {
  lang: Language
  onToggleLanguage: () => void
  onToggleDark: () => void
}

const SettingsView: React.FC<SettingsViewProps> = ({ lang, onToggleLanguage, onToggleDark }) => {
  return (
    <div className="h-full bg-gray-50 dark:bg-gray-900 p-6 md:p-8 transition-colors">
      <div className="max-w-3xl mx-auto space-y-4">
        <h2 className="text-xl font-bold text-gray-800 dark:text-white">{lang==='pt'?'Definições':'Settings'}</h2>
        <div className="bg-white dark:bg-gray-800 p-6 rounded-2xl border border-gray-100 dark:border-gray-700 space-y-3">
          <button onClick={onToggleLanguage} className="w-full px-4 py-3 rounded-xl bg-gray-100 dark:bg-gray-700 text-gray-800 dark:text-gray-200 font-bold text-sm">{lang==='pt'?'Mudar idioma':'Toggle language'}</button>
          <button onClick={onToggleDark} className="w-full px-4 py-3 rounded-xl bg-gray-100 dark:bg-gray-700 text-gray-800 dark:text-gray-200 font-bold text-sm">{lang==='pt'?'Modo escuro':'Dark mode'}</button>
        </div>
      </div>
    </div>
  )
}

export default SettingsView

