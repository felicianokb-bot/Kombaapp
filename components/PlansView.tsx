import React from 'react'
import { Language } from '../types'

interface PlansViewProps {
  lang: Language
}

const PlansView: React.FC<PlansViewProps> = ({ lang }) => {
  return (
    <div className="h-full bg-gray-50 dark:bg-gray-900 p-6 md:p-8 transition-colors">
      <div className="max-w-3xl mx-auto space-y-4">
        <h2 className="text-xl font-bold text-gray-800 dark:text-white">{lang==='pt'?'Planos':'Plans'}</h2>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="bg-white dark:bg-gray-800 p-6 rounded-2xl border border-gray-100 dark:border-gray-700">
            <div className="font-bold">LITE</div>
            <div className="text-sm text-gray-600 dark:text-gray-300">{lang==='pt'?'Básico':'Basic'}</div>
          </div>
          <div className="bg-white dark:bg-gray-800 p-6 rounded-2xl border border-gray-100 dark:border-gray-700">
            <div className="font-bold">PRO</div>
            <div className="text-sm text-gray-600 dark:text-gray-300">{lang==='pt'?'Intermediário':'Intermediate'}</div>
          </div>
          <div className="bg-white dark:bg-gray-800 p-6 rounded-2xl border border-gray-100 dark:border-gray-700">
            <div className="font-bold">ELITE</div>
            <div className="text-sm text-gray-600 dark:text-gray-300">{lang==='pt'?'Premium':'Premium'}</div>
          </div>
        </div>
      </div>
    </div>
  )
}

export default PlansView

