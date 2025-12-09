import React from 'react'
import { Language } from '../types'

interface PaymentMethodsViewProps {
  lang: Language
}

const PaymentMethodsView: React.FC<PaymentMethodsViewProps> = ({ lang }) => {
  return (
    <div className="h-full bg-gray-50 dark:bg-gray-900 p-6 md:p-8 transition-colors">
      <div className="max-w-3xl mx-auto space-y-4">
        <h2 className="text-xl font-bold text-gray-800 dark:text-white">{lang==='pt'?'Métodos de Pagamento':'Payment Methods'}</h2>
        <div className="bg-white dark:bg-gray-800 p-6 rounded-2xl border border-gray-100 dark:border-gray-700">
          <div className="text-sm text-gray-600 dark:text-gray-300">{lang==='pt'?'Configure os métodos de pagamento.':'Configure payment methods.'}</div>
        </div>
      </div>
    </div>
  )
}

export default PaymentMethodsView

