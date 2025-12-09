import React, { useState } from 'react'
import { Language, AuthUser } from '../types'
import getSupabase from '../services/supabaseClient'

const EditProfileView: React.FC<{ lang: Language; user: AuthUser; onSaved: (u: AuthUser) => void }> = ({ lang, user, onSaved }) => {
  const [name, setName] = useState(user.name)
  const [location, setLocation] = useState(user.location)
  const [avatar, setAvatar] = useState(user.avatar)
  const [saving, setSaving] = useState(false)

  const save = async () => {
    setSaving(true)
    const supabase = getSupabase()
    await supabase?.from('profiles').upsert({ user_id: user.id, name, location, avatar_url: avatar, email: user.email })
    onSaved({ ...user, name, location, avatar })
    setSaving(false)
  }

  return (
    <div className="p-6 md:p-8 space-y-4 bg-gray-50 dark:bg-gray-900 h-full">
      <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-sm border border-gray-100 dark:border-gray-700 p-6">
        <div className="grid md:grid-cols-2 gap-3">
          <input value={name} onChange={e => setName(e.target.value)} className="px-3 py-2 bg-gray-50 dark:bg-gray-700 border border-gray-200 dark:border-gray-600 rounded-lg text-sm" placeholder={lang === 'pt' ? 'Nome' : 'Name'} />
          <input value={location} onChange={e => setLocation(e.target.value)} className="px-3 py-2 bg-gray-50 dark:bg-gray-700 border border-gray-200 dark:border-gray-600 rounded-lg text-sm" placeholder={lang === 'pt' ? 'Localização' : 'Location'} />
          <input value={avatar} onChange={e => setAvatar(e.target.value)} className="px-3 py-2 bg-gray-50 dark:bg-gray-700 border border-gray-200 dark:border-gray-600 rounded-lg text-sm md:col-span-2" placeholder={lang === 'pt' ? 'Avatar URL' : 'Avatar URL'} />
        </div>
        <button onClick={save} disabled={saving} className="mt-4 bg-blue-600 text-white font-bold px-4 py-2 rounded-xl">{saving ? (lang === 'pt' ? 'A guardar...' : 'Saving...') : (lang === 'pt' ? 'Guardar' : 'Save')}</button>
      </div>
    </div>
  )
}

export default EditProfileView
