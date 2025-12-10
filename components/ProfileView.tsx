
import React, { useState } from 'react';
import { User, Settings, CreditCard, Shield, LogOut, Crown, ChevronRight, Zap, Moon } from 'lucide-react';
import { Language, AuthUser } from '../types';
import checkTables, { TableCheckResult, clearTrips, clearMyTrips } from '../services/supabaseDebug';

interface ProfileViewProps {
  lang: Language;
  isDarkMode?: boolean;
  toggleTheme?: () => void;
  user: AuthUser;
  onLogout: () => void;
  onNavigate?: (view: 'wallet' | 'history' | 'boosts' | 'plans') => void;
  balance?: number;
}

const ProfileView: React.FC<ProfileViewProps> = ({ lang, isDarkMode, toggleTheme, user, onLogout, onNavigate, balance }) => {
  const [tableInput, setTableInput] = useState('profiles,trips,services,messages')
  const [checking, setChecking] = useState(false)
  const [checkResults, setCheckResults] = useState<TableCheckResult[] | null>(null)

  const runCheck = async () => {
    setChecking(true)
    const names = tableInput.split(',').map(s => s.trim()).filter(Boolean)
    const res = await checkTables(names)
    setCheckResults(res)
    setChecking(false)
  }

  const [clearing, setClearing] = useState(false)
  const [clearMsg, setClearMsg] = useState<string | null>(null)
  const runClearTrips = async () => {
    setClearing(true)
    const res = await clearTrips()
    setClearMsg(res.ok ? (lang === 'pt' ? 'Viagens apagadas.' : 'Trips cleared.') : (res.message || 'Erro'))
    setClearing(false)
  }
  const runClearMyTrips = async () => {
    setClearing(true)
    const res = await clearMyTrips()
    setClearMsg(res.ok ? (lang === 'pt' ? 'Minhas viagens apagadas.' : 'My trips cleared.') : (res.message || 'Erro'))
    setClearing(false)
  }

  return (
    <div className="h-full bg-gray-50 dark:bg-gray-900 md:p-8 overflow-y-auto transition-colors duration-200">
      <div className="max-w-4xl mx-auto space-y-6 pb-20 md:pb-0">
        
        {/* Profile Header */}
        <div className="bg-white dark:bg-gray-800 p-6 rounded-2xl shadow-sm border border-gray-100 dark:border-gray-700 flex flex-col md:flex-row items-center gap-6 transition-colors">
           <div className="relative">
             <div className="w-24 h-24 md:w-28 md:h-28 rounded-full border-4 border-white dark:border-gray-700 shadow-lg overflow-hidden transition-colors">
                <img src={user.avatar} alt={user.name} className="w-full h-full object-cover" />
             </div>
             {user.isPremium && (
               <div className="absolute bottom-0 right-0 bg-yellow-400 text-white p-1.5 rounded-full border-2 border-white dark:border-gray-700 shadow-sm" title="Premium Member">
                 <Crown size={14} fill="currentColor" />
               </div>
             )}
           </div>
           
           <div className="flex-1 text-center md:text-left">
              <h2 className="text-2xl font-bold text-gray-800 dark:text-white">{user.name}</h2>
              <p className="text-gray-500 dark:text-gray-400 text-sm font-medium mb-4">{user.email} • {user.location}</p>
              
              <div className="flex flex-wrap justify-center md:justify-start gap-2">
                 {user.verified && (
                   <span className="px-3 py-1 bg-green-50 dark:bg-green-900/30 text-green-700 dark:text-green-300 text-xs font-bold rounded-lg border border-green-100 dark:border-green-800 flex items-center gap-1">
                     <Shield size={12} /> Verificado
                   </span>
                 )}
                 <span className="px-3 py-1 bg-blue-50 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300 text-xs font-bold rounded-lg border border-blue-100 dark:border-blue-800">
                   Agita Driver
                 </span>
              </div>
           </div>

           <div className="w-full md:w-auto flex flex-col gap-2">
              <button className="w-full md:w-40 bg-gray-900 dark:bg-gray-700 text-white font-bold py-2.5 rounded-xl text-sm shadow-lg shadow-gray-200 dark:shadow-gray-900/50 hover:bg-black dark:hover:bg-gray-600 transition-colors">
                 {lang === 'pt' ? 'Editar Perfil' : 'Edit Profile'}
              </button>
              <button className="w-full md:w-40 bg-white dark:bg-gray-800 text-gray-600 dark:text-gray-300 font-bold py-2.5 rounded-xl text-sm border border-gray-200 dark:border-gray-600 hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors">
                 {lang === 'pt' ? 'Ver Como Público' : 'View as Public'}
              </button>
           </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {/* Wallet Section */}
          <div className="md:col-span-2 bg-white dark:bg-gray-800 rounded-2xl shadow-sm border border-gray-100 dark:border-gray-700 overflow-hidden transition-colors">
            <div className="p-6 border-b border-gray-50 dark:border-gray-700 flex justify-between items-center">
                <div>
                   <span className="text-gray-500 dark:text-gray-400 font-bold text-xs uppercase tracking-wider">{lang === 'pt' ? 'Saldo na Carteira' : 'Wallet Balance'}</span>
                   <div className="text-3xl font-bold text-gray-800 dark:text-white mt-1">Kz {(Number(balance||0)).toLocaleString()}</div>
                </div>
                <div className="w-12 h-12 bg-green-50 dark:bg-green-900/30 rounded-full flex items-center justify-center text-green-600 dark:text-green-400">
                  <CreditCard size={24} />
                </div>
            </div>
          <div className="grid grid-cols-2 divide-x divide-gray-50 dark:divide-gray-700">
                <button onClick={() => onNavigate?.('wallet')} className="p-4 text-sm font-bold text-blue-600 dark:text-blue-400 hover:bg-blue-50 dark:hover:bg-blue-900/20 transition-colors flex items-center justify-center gap-2">
                    <span>+</span> {lang === 'pt' ? 'Carregar Conta' : 'Add Funds'}
                </button>
                <button onClick={() => onNavigate?.('history')} className="p-4 text-sm font-bold text-gray-600 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors">
                    {lang === 'pt' ? 'Histórico' : 'History'}
                </button>
            </div>
          </div>

          {/* Premium Plan Card */}
          <div className="bg-gradient-to-br from-indigo-600 to-blue-600 rounded-2xl shadow-lg p-6 text-white relative overflow-hidden group">
             <div className="relative z-10">
               <div className="flex items-center gap-2 mb-3">
                 <Crown size={20} className="text-yellow-300 fill-yellow-300" />
                 <span className="font-bold tracking-wide">KOMBO ELITE</span>
               </div>
               <p className="text-blue-100 text-sm mb-6 leading-relaxed">
                 {lang === 'pt' ? 'Tenha acesso ilimitado, zero taxas e suporte 24/7.' : 'Get unlimited access, zero fees and 24/7 support.'}
               </p>
               <button onClick={() => onNavigate?.('plans')} className="w-full bg-white text-blue-600 font-bold py-2 rounded-lg shadow-sm hover:bg-blue-50 transition-colors">
                 {lang === 'pt' ? 'Ver Planos' : 'View Plans'}
               </button>
             </div>
             <div className="absolute -right-6 -bottom-6 w-32 h-32 bg-white/10 rounded-full blur-2xl group-hover:bg-white/20 transition-all duration-700"></div>
          </div>
        </div>

        {/* Menu Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
           <div className="space-y-2">
             <h3 className="text-sm font-bold text-gray-400 dark:text-gray-500 uppercase tracking-wide ml-2 mb-2">{lang === 'pt' ? 'Conta' : 'Account'}</h3>
             <MenuItem icon={<User size={20} />} label={lang === 'pt' ? 'Dados Pessoais' : 'Personal Information'} />
             <MenuItem icon={<Shield size={20} />} label={lang === 'pt' ? 'Segurança' : 'Security'} />
             <MenuItem icon={<CreditCard size={20} />} label={lang === 'pt' ? 'Métodos de Pagamento' : 'Payment Methods'} />
           </div>
           
           <div className="space-y-2">
             <h3 className="text-sm font-bold text-gray-400 dark:text-gray-500 uppercase tracking-wide ml-2 mb-2">{lang === 'pt' ? 'Preferências' : 'Preferences'}</h3>
             
             {/* Dark Mode Toggle */}
             <div className="w-full bg-white dark:bg-gray-800 p-4 rounded-xl shadow-sm border border-gray-100 dark:border-gray-700 flex items-center gap-4 hover:bg-gray-50 dark:hover:bg-gray-700/50 transition-all group cursor-pointer" onClick={toggleTheme}>
                 <div className="text-gray-400 dark:text-gray-500 group-hover:text-blue-600 dark:group-hover:text-blue-400 transition-colors">
                    <Moon size={20} />
                 </div>
                 <span className="font-bold text-gray-700 dark:text-gray-200 flex-1 text-left text-sm">
                    {lang === 'pt' ? 'Modo Escuro' : 'Dark Mode'}
                 </span>
                 <div className={`w-11 h-6 rounded-full p-1 transition-colors ${isDarkMode ? 'bg-blue-600' : 'bg-gray-200 dark:bg-gray-600'}`}>
                    <div className={`bg-white w-4 h-4 rounded-full shadow-sm transform transition-transform ${isDarkMode ? 'translate-x-5' : 'translate-x-0'}`}></div>
                 </div>
             </div>

             <MenuItem icon={<Settings size={20} />} label={lang === 'pt' ? 'Definições do App' : 'App Settings'} />
             <button onClick={() => onNavigate?.('boosts')} className="w-full bg-white dark:bg-gray-800 p-4 rounded-2xl shadow-sm border border-gray-100 dark:border-gray-700 flex items-center gap-4 hover:bg-gray-50 dark:hover:bg-gray-700/50 hover:border-gray-200 dark:hover:border-gray-600 transition-all group">
               <div className="text-gray-400 dark:text-gray-500 group-hover:text-blue-600 dark:group-hover:text-blue-400 transition-colors"><Zap size={20} /></div>
               <span className="font-bold text-gray-700 dark:text-gray-200 flex-1 text-left text-sm">{lang === 'pt' ? 'Configurar Boosts' : 'Configure Boosts'}</span>
             </button>
            <div className="w-full bg-white dark:bg-gray-800 p-4 rounded-xl shadow-sm border border-gray-100 dark:border-gray-700 space-y-3">
              <div className="flex items-center gap-3">
                <span className="font-bold text-sm text-gray-700 dark:text-gray-200">{lang === 'pt' ? 'Verificar Tabelas Supabase' : 'Check Supabase Tables'}</span>
              </div>
              <input
                value={tableInput}
                onChange={(e) => setTableInput(e.target.value)}
                className="w-full bg-gray-50 dark:bg-gray-700 text-gray-700 dark:text-gray-200 text-sm px-3 py-2 rounded-lg border border-gray-200 dark:border-gray-600"
              />
              <button
                onClick={runCheck}
                disabled={checking}
                className="w-full bg-blue-600 text-white font-bold py-2 rounded-lg text-sm hover:bg-blue-700 transition-colors disabled:opacity-50"
              >
                {checking ? (lang === 'pt' ? 'Verificando...' : 'Checking...') : (lang === 'pt' ? 'Verificar' : 'Check')}
              </button>
              {checkResults && (
                <div className="space-y-2">
                  {checkResults.map(r => (
                    <div key={r.name} className={`flex items-center justify-between p-2 rounded-lg text-sm border ${r.status === 'ok' ? 'bg-green-50 dark:bg-green-900/20 border-green-200 dark:border-green-800 text-green-700 dark:text-green-300' : r.status === 'missing' ? 'bg-yellow-50 dark:bg-yellow-900/20 border-yellow-200 dark:border-yellow-800 text-yellow-700 dark:text-yellow-300' : 'bg-red-50 dark:bg-red-900/20 border-red-200 dark:border-red-800 text-red-700 dark:text-red-300'}`}>
                      <span>{r.name}</span>
                      <span className="font-bold uppercase">{r.status}</span>
                    </div>
                  ))}
                </div>
              )}
              <div className="flex items-center gap-3 pt-2">
                <button
                  onClick={runClearTrips}
                  disabled={clearing}
                  className="flex-1 bg-red-600 text-white font-bold py-2 rounded-lg text-sm hover:bg-red-700 transition-colors disabled:opacity-50"
                >
                  {clearing ? (lang === 'pt' ? 'A apagar...' : 'Clearing...') : (lang === 'pt' ? 'Apagar todas viagens (teste)' : 'Clear all trips (test)')}
                </button>
                <button
                  onClick={runClearMyTrips}
                  disabled={clearing}
                  className="flex-1 bg-red-50 dark:bg-red-900/10 text-red-700 dark:text-red-400 font-bold py-2 rounded-lg text-sm hover:bg-red-100 dark:hover:bg-red-900/20 transition-colors disabled:opacity-50 border border-red-200 dark:border-red-900/30"
                >
                  {clearing ? (lang === 'pt' ? 'A apagar...' : 'Clearing...') : (lang === 'pt' ? 'Apagar minhas viagens' : 'Clear my trips')}
                </button>
              </div>
              {clearMsg && <div className="text-xs text-gray-500 dark:text-gray-400">{clearMsg}</div>}
            </div>
             
             <button 
                onClick={onLogout}
                className="w-full bg-red-50 dark:bg-red-900/10 p-4 rounded-xl border border-red-100 dark:border-red-900/30 flex items-center gap-4 hover:bg-red-100 dark:hover:bg-red-900/20 transition-colors group"
             >
                <div className="text-red-400 group-hover:text-red-500"><LogOut size={20} /></div>
                <span className="font-bold text-red-600 dark:text-red-400 flex-1 text-left">{lang === 'pt' ? 'Terminar Sessão' : 'Log Out'}</span>
            </button>
           </div>
        </div>

      </div>
    </div>
  );
};

const MenuItem: React.FC<{ icon: React.ReactNode, label: string }> = ({ icon, label }) => (
    <button className="w-full bg-white dark:bg-gray-800 p-4 rounded-xl shadow-sm border border-gray-100 dark:border-gray-700 flex items-center gap-4 hover:bg-gray-50 dark:hover:bg-gray-700/50 hover:border-gray-200 dark:hover:border-gray-600 transition-all group">
        <div className="text-gray-400 dark:text-gray-500 group-hover:text-blue-600 dark:group-hover:text-blue-400 transition-colors">{icon}</div>
        <span className="font-bold text-gray-700 dark:text-gray-200 flex-1 text-left text-sm">{label}</span>
        <span className="text-gray-300 dark:text-gray-600 group-hover:text-gray-400 dark:group-hover:text-gray-400"><ChevronRight size={18} /></span>
    </button>
);

export default ProfileView;
