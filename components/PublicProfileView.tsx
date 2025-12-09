import React from 'react'
import { Language, AuthUser } from '../types'

interface PublicProfileViewProps {
  lang: Language
  user: AuthUser
}

const PublicProfileView: React.FC<PublicProfileViewProps> = ({ lang, user }) => {
  return (
    <div className="h-full bg-gray-50 dark:bg-gray-900 p-6 md:p-8 transition-colors">
      <div className="max-w-3xl mx-auto space-y-6">
        <div className="bg-white dark:bg-gray-800 p-6 rounded-2xl shadow-sm border border-gray-100 dark:border-gray-700">
          <div className="flex items-center gap-4">
            <img src={user.avatar} alt={user.name} className="w-16 h-16 rounded-full" />
            <div>
              <div className="text-xl font-bold text-gray-800 dark:text-white">{user.name}</div>
              <div className="text-sm text-gray-500 dark:text-gray-400">{user.location}</div>
            </div>
          </div>
        </div>
        <div className="bg-white dark:bg-gray-800 p-6 rounded-2xl border border-gray-100 dark:border-gray-700">
          <div className="font-bold text-gray-700 dark:text-gray-200 mb-2 text-sm">{lang==='pt'?'Serviços e viagens':'Services and trips'}</div>
          <div className="text-gray-500 dark:text-gray-400 text-sm">{lang==='pt'?'Conteúdo público do perfil.':'Public profile content.'}</div>
        </div>
      </div>
    </div>
  )
}

export default PublicProfileView

