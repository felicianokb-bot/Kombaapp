import React from 'react'
import { Language } from '../types'

interface BoostsViewProps {
  lang: Language
}

const BoostsView: React.FC<BoostsViewProps> = ({ lang }) => {
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
                </tr>
              </thead>
              <tbody className="text-gray-800 dark:text-gray-200">
                <tr className="border-t border-gray-100 dark:border-gray-700">
                  <td className="py-2 font-bold">Start</td>
                  <td className="py-2">300 kz</td>
                  <td className="py-2">{lang==='pt'?'24 horas':'24 hours'}</td>
                </tr>
                <tr className="border-t border-gray-100 dark:border-gray-700">
                  <td className="py-2 font-bold">Lite</td>
                  <td className="py-2">500 kz</td>
                  <td className="py-2">{lang==='pt'?'3 dias':'3 days'}</td>
                </tr>
                <tr className="border-t border-gray-100 dark:border-gray-700">
                  <td className="py-2 font-bold">Pro</td>
                  <td className="py-2">1500 kz</td>
                  <td className="py-2">{lang==='pt'?'7 dias':'7 days'}</td>
                </tr>
                <tr className="border-t border-gray-100 dark:border-gray-700">
                  <td className="py-2 font-bold">Max</td>
                  <td className="py-2">2500 kz</td>
                  <td className="py-2">{lang==='pt'?'15 dias':'15 days'}</td>
                </tr>
                <tr className="border-t border-gray-100 dark:border-gray-700">
                  <td className="py-2 font-bold">Elite</td>
                  <td className="py-2">4000 kz</td>
                  <td className="py-2">{lang==='pt'?'30 dias':'30 days'}</td>
                </tr>
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  )
}

export default BoostsView
