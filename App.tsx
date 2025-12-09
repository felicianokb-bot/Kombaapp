
import React, { useState, useEffect } from 'react';
import { 
  Home, 
  Map as MapIcon, 
  MessageSquare, 
  User, 
  Package, 
  Bell, 
  Plus,
  Truck,
  Scissors,
  Wrench,
  Zap,
  Globe,
  Search,
  TrendingUp,
  ShieldCheck
} from 'lucide-react';
import { ViewState, Language, Trip, AuthUser } from './types';
import { TEXT } from './constants';
import AgitaView from './components/AgitaView';
import ServiceMarketplace from './components/ServiceMarketplace';
import MapView from './components/MapView';
import ChatView from './components/ChatView';
import ProfileView from './components/ProfileView';
import LoginView from './components/LoginView';
import getSupabase, { logEvent } from './services/supabaseClient';
import tripsService from './services/tripsService';
import WalletView from './components/WalletView';
import HistoryView from './components/HistoryView';
import BoostsView from './components/BoostsView';
import PlansView from './components/PlansView';
import walletService from './services/walletService';
import EditProfileView from './components/EditProfileView';
import PublicProfileView from './components/PublicProfileView';
import PaymentMethodsView from './components/PaymentMethodsView';
import SecurityView from './components/SecurityView';
import SettingsView from './components/SettingsView';

const App: React.FC = () => {
  // --- Global State ---
  const [user, setUser] = useState<AuthUser | null>(null);
  const [loadingAuth, setLoadingAuth] = useState(true);
  
  const [currentView, setCurrentView] = useState<ViewState>('home');
  const [language, setLanguage] = useState<Language>('pt');
  const [showNotification, setShowNotification] = useState(false);
  const [isMobile, setIsMobile] = useState(window.innerWidth < 768);
  const [isDarkMode, setIsDarkMode] = useState(false);

  // Data State (Simulating Database)
  const [trips, setTrips] = useState<Trip[]>([]);
  
  // Chat Context State (to open chat from other views)
  const [chatContext, setChatContext] = useState<{ id: string, name: string, initialMessage?: string } | null>(null);
  const [balance, setBalance] = useState<number>(0);

  const t = TEXT[language];

  // --- Effects ---

  // Check for persisted session on mount
  useEffect(() => {
    const savedTheme = localStorage.getItem('kombo_theme');
    if (savedTheme === 'dark') {
      setIsDarkMode(true);
    }
    
    const supabase = getSupabase();
    const sub = supabase?.auth.onAuthStateChange(async (event, session) => {
      logEvent('auth_state_change', { event, hasSession: !!session })

      // If there's no session, clear user data and stop loading.
      if (!session) {
        setUser(null);
        setTrips([]);
        setBalance(0);
        logEvent('auth_no_session', {})
        setLoadingAuth(false);
        return;
      }

      // When a session is detected (either initial or after login)
      if (event === 'SIGNED_IN' || event === 'INITIAL_SESSION') {
        const u = session.user;
        const meta = u.user_metadata as any;
        const authUser: AuthUser = {
          id: u.id,
          name: meta?.name || u.email || 'Usuário',
          email: u.email || '',
          avatar: meta?.avatar_url || meta?.picture || 'https://picsum.photos/seed/kombo/200/200',
          rating: 4.9,
          verified: true,
          location: 'Luanda, AO',
          joinedDate: u.created_at || new Date().toISOString(),
          isPremium: false,
          token: session.access_token
        };
        
        setUser(authUser);

        try {
          // Upsert profile and fetch related data
          await supabase.from('profiles').upsert({ user_id: u.id, name: authUser.name, location: authUser.location, avatar_url: authUser.avatar, email: authUser.email });
          
          const list = await tripsService.getTrips();
          setTrips(list);
          
          const b = await walletService.getBalance(u.id);
          setBalance(b);
          logEvent('wallet_balance_loaded', { userId: u.id, balance: b });
          
          setCurrentView('home');
        } catch (e) {
            console.error('Error fetching user data after sign in:', e);
            // Set to a clean state if data fetching fails
            setUser(null);
            setTrips([]);
            setBalance(0);
        } finally {
            setLoadingAuth(false);
        }
        return;
      }

      // When the token is refreshed, update it in the user state
      if (event === 'TOKEN_REFRESHED') {
        setUser(prev => prev && prev.id === session.user.id ? { ...prev, token: session.access_token } : prev);
        logEvent('auth_token_refreshed', { userId: session.user.id });
        return;
      }

      // When user metadata is updated
      if (event === 'USER_UPDATED') {
        const u = session.user;
        setUser(prev => prev && prev.id === u.id ? { ...prev, name: (u.user_metadata as any)?.name || prev.name, avatar: (u.user_metadata as any)?.avatar_url || (u.user_metadata as any)?.picture || prev.avatar } : prev);
        logEvent('auth_user_updated', { userId: u.id });
        return;
      }
    });

    return () => {
      sub?.data.subscription.unsubscribe();
    };
  }, []);

  useEffect(() => {
    const watchdog = setTimeout(() => {
      if (loadingAuth) setLoadingAuth(false);
    }, 8000);
    return () => clearTimeout(watchdog);
  }, [loadingAuth]);

  // Handle Resize
  useEffect(() => {
    const handleResize = () => setIsMobile(window.innerWidth < 768);
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  // Handle Notifications Simulation
  useEffect(() => {
    if (!user) return;
    const timer = setTimeout(() => {
      setShowNotification(true);
    }, 8000);
    return () => clearTimeout(timer);
  }, [user]);

  // Apply Dark Mode
  useEffect(() => {
    if (isDarkMode) {
      document.documentElement.classList.add('dark');
      localStorage.setItem('kombo_theme', 'dark');
    } else {
      document.documentElement.classList.remove('dark');
      localStorage.setItem('kombo_theme', 'light');
    }
  }, [isDarkMode]);

  // --- Handlers ---

  const handleLogin = (userData: AuthUser) => {
    setUser(userData);
    setCurrentView('home');
  };

  const handleLogout = async () => {
    const supabase = getSupabase();
    try {
      await supabase?.auth.signOut({ scope: 'global' });
    } catch (_e) {
    }
    try {
      const keys: string[] = [];
      for (let i = 0; i < localStorage.length; i++) {
        const k = localStorage.key(i) as string;
        if (!k) continue;
        if (k.startsWith('sb-') || k.includes('supabase') || k.startsWith('kombo_')) keys.push(k);
      }
      keys.forEach((k) => localStorage.removeItem(k));
    } catch (_e) {
    }
    setUser(null);
    setTrips([]);
    setCurrentView('home');
    setLoadingAuth(false);
  };

  const handleAddTrip = async (newTrip: Trip) => {
    if (!user) return;
    const created = await tripsService.addTrip({
      origin: newTrip.origin,
      destination: newTrip.destination,
      date: newTrip.date,
      time: newTrip.time,
      transportType: newTrip.transportType,
      capacity: newTrip.capacity,
      capacityUnit: newTrip.capacityUnit,
      pricePerUnit: newTrip.pricePerUnit,
      currency: newTrip.currency,
      description: newTrip.description,
      status: newTrip.status
    }, user);
    const list = await tripsService.getTrips();
    setTrips(list);
    setCurrentView('home');
    if (created) setTimeout(() => setShowNotification(true), 500);
  };

  const handleStartChat = (contactId: string, contactName: string, message?: string) => {
    setChatContext({ id: contactId, name: contactName, initialMessage: message });
    setCurrentView('chat');
  };

  const toggleLanguage = () => {
    setLanguage(prev => prev === 'pt' ? 'en' : 'pt');
  };

  const toggleDarkMode = () => {
    setIsDarkMode(prev => !prev);
  };

  // --- Render Logic ---

  if (loadingAuth) {
    return <div className="flex items-center justify-center h-screen bg-gray-50 dark:bg-gray-900"><div className="w-8 h-8 border-4 border-blue-600 border-t-transparent rounded-full animate-spin"></div></div>;
  }

  if (!user) {
    return <LoginView onLogin={handleLogin} lang={language} toggleLanguage={toggleLanguage} isDarkMode={isDarkMode} />;
  }

  const renderContent = () => {
    switch (currentView) {
      case 'home':
        return (
          <HomeView 
            onNavigate={setCurrentView} 
            t={t} 
            lang={language} 
            trips={trips} 
            user={user}
            balance={balance}
          />
        );
      case 'agita':
        return (
          <AgitaView 
            lang={language} 
            trips={trips} 
            onAddTrip={handleAddTrip} 
            onChat={handleStartChat}
            user={user}
            onStartSearch={() => setCurrentView('map')}
          />
        );
      case 'services':
        return (
          <ServiceMarketplace 
            lang={language} 
            onChat={handleStartChat}
          />
        );
      case 'map':
        return <MapView lang={language} />;
      case 'chat':
        return (
          <ChatView 
            lang={language} 
            initialContext={chatContext} 
            key={chatContext?.id || 'default'} // Force remount if context changes
          />
        );
      case 'profile':
        return (
          <ProfileView 
            lang={language} 
            isDarkMode={isDarkMode} 
            toggleTheme={toggleDarkMode} 
            user={user}
            onLogout={handleLogout}
            onNavigate={(v) => setCurrentView(v)}
            balance={balance}
          />
        );
      case 'edit_profile':
        return <EditProfileView lang={language} user={user} onSaved={(u) => setUser(u)} />;
      case 'public_profile':
        return <PublicProfileView lang={language} user={user} />;
      case 'payment_methods':
        return <PaymentMethodsView lang={language} />;
      case 'security':
        return <SecurityView lang={language} onLogout={handleLogout} />;
      case 'settings':
        return <SettingsView lang={language} onToggleLanguage={toggleLanguage} onToggleDark={toggleDarkMode} />;
      case 'wallet':
        return <WalletView lang={language} user={user} onBalanceChanged={(b) => setBalance(b)} />;
      case 'history':
        return <HistoryView lang={language} user={user} />;
      case 'boosts':
        return <BoostsView lang={language} />;
      case 'plans':
        return <PlansView lang={language} />;
      default:
        return <HomeView onNavigate={setCurrentView} t={t} lang={language} trips={trips} user={user} balance={balance} />;
    }
  };

  return (
    <div className="flex h-screen w-full bg-gray-50 dark:bg-gray-900 text-gray-800 dark:text-gray-100 font-inter overflow-hidden transition-colors duration-200">
      
      {/* Desktop Sidebar */}
      {!isMobile && (
        <aside className="w-64 bg-white dark:bg-gray-800 border-r border-gray-200 dark:border-gray-700 flex flex-col z-20 shadow-sm transition-colors duration-200">
          <div className="p-6 flex items-center gap-3 cursor-pointer" onClick={() => setCurrentView('home')}>
            <div className="w-10 h-10 bg-gradient-to-br from-orange-500 to-blue-600 rounded-xl flex items-center justify-center text-white font-bold text-xl shadow-lg">
              K
            </div>
            <div>
              <span className="text-2xl font-bold text-gray-800 dark:text-white tracking-tight block leading-none">KOMBO</span>
              <span className="text-[10px] text-gray-400 font-medium tracking-widest uppercase">Super App</span>
            </div>
          </div>

          <nav className="flex-1 px-4 py-4 space-y-1">
            <SidebarItem icon={<Home size={20} />} label={t.home} active={currentView === 'home'} onClick={() => setCurrentView('home')} />
            <SidebarItem icon={<Package size={20} />} label={t.agita} active={currentView === 'agita'} onClick={() => setCurrentView('agita')} />
            <SidebarItem icon={<Truck size={20} />} label={t.servicesNearby} active={currentView === 'services'} onClick={() => setCurrentView('services')} />
            <SidebarItem icon={<MapIcon size={20} />} label={t.map} active={currentView === 'map'} onClick={() => setCurrentView('map')} />
            <SidebarItem icon={<MessageSquare size={20} />} label={t.chat} active={currentView === 'chat'} onClick={() => setCurrentView('chat')} />
            <div className="my-4 border-t border-gray-100 dark:border-gray-700"></div>
            <SidebarItem icon={<User size={20} />} label={t.profile} active={currentView === 'profile'} onClick={() => setCurrentView('profile')} />
          </nav>

          <div className="p-4 border-t border-gray-100 dark:border-gray-700">
            <div className="bg-gradient-to-r from-blue-50 to-indigo-50 dark:from-blue-900/20 dark:to-indigo-900/20 p-4 rounded-xl border border-blue-100 dark:border-blue-800/50">
              <div className="flex items-center gap-2 mb-2">
                <ShieldCheck size={16} className="text-blue-600 dark:text-blue-400" />
                <span className="text-xs font-bold text-blue-700 dark:text-blue-300">KOMBO PRO</span>
              </div>
              <p className="text-xs text-blue-600/80 dark:text-blue-300/80 mb-3 leading-snug">
                {language === 'pt' ? 'Ganhe mais visibilidade e pague menos taxas.' : 'Get more visibility and pay lower fees.'}
              </p>
              <button className="w-full bg-blue-600 text-white text-xs font-bold py-2 rounded-lg hover:bg-blue-700 transition-colors">
                {language === 'pt' ? 'Fazer Upgrade' : 'Upgrade Now'}
              </button>
            </div>
          </div>
        </aside>
      )}

      <div className="flex-1 flex flex-col h-full overflow-hidden relative">
        {/* Desktop Header */}
        {!isMobile && (
          <header className="h-16 bg-white dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700 flex items-center justify-between px-8 z-10 transition-colors duration-200">
            <h2 className="text-lg font-bold text-gray-800 dark:text-white capitalize">
              {currentView === 'agita' ? (language === 'pt' ? 'Agita - Viagens' : 'Agita - Trips')
                : currentView === 'services' ? 'Marketplace'
                : currentView === 'wallet' ? (language === 'pt' ? 'Carteira' : 'Wallet')
                : currentView === 'history' ? (language === 'pt' ? 'Histórico' : 'History')
                : currentView === 'boosts' ? 'Boosts'
                : currentView === 'plans' ? (language === 'pt' ? 'Planos' : 'Plans')
                : currentView === 'edit_profile' ? (language === 'pt' ? 'Editar Perfil' : 'Edit Profile')
                : currentView === 'public_profile' ? (language === 'pt' ? 'Perfil Público' : 'Public Profile')
                : currentView === 'payment_methods' ? (language === 'pt' ? 'Pagamentos' : 'Payments')
                : currentView === 'security' ? (language === 'pt' ? 'Segurança' : 'Security')
                : currentView === 'settings' ? (language === 'pt' ? 'Definições' : 'Settings')
                : t[currentView]}
            </h2>
            <div className="flex items-center gap-4">
              <button 
                onClick={toggleLanguage}
                className="flex items-center gap-2 text-sm font-semibold px-3 py-1.5 bg-gray-50 dark:bg-gray-700 rounded-lg text-gray-600 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-600 border border-gray-200 dark:border-gray-600 transition-all"
              >
                <Globe size={14} />
                {language === 'pt' ? 'Português' : 'English'}
              </button>
              <div className="relative cursor-pointer hover:bg-gray-50 dark:hover:bg-gray-700 p-2 rounded-full transition-colors">
                <Bell size={20} className="text-gray-500 dark:text-gray-400" />
                {showNotification && (
                  <span className="absolute top-1.5 right-1.5 w-2.5 h-2.5 bg-orange-500 rounded-full border-2 border-white dark:border-gray-800 animate-pulse"></span>
                )}
              </div>
            </div>
          </header>
        )}

        {/* Mobile Header */}
        {isMobile && (
          <header className="bg-white dark:bg-gray-800 px-4 py-3 flex items-center justify-between shadow-sm z-20 shrink-0 border-b border-gray-200 dark:border-gray-700 transition-colors duration-200">
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 bg-gradient-to-br from-orange-500 to-blue-600 rounded-lg flex items-center justify-center text-white font-bold text-lg shadow-lg">
                K
              </div>
              <span className="text-xl font-bold text-gray-800 dark:text-white tracking-tight">KOMBO</span>
            </div>
            <div className="flex items-center gap-3">
              <button 
                onClick={toggleLanguage}
                className="flex items-center gap-1 text-xs font-bold px-2 py-1 bg-gray-100 dark:bg-gray-700 rounded-md text-gray-600 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-600"
              >
                <Globe size={12} />
                {language.toUpperCase()}
              </button>
              <button className="relative text-gray-500 dark:text-gray-400">
                <Bell size={24} />
                {showNotification && (
                  <span className="absolute top-0 right-0 w-2.5 h-2.5 bg-orange-500 rounded-full border-2 border-white dark:border-gray-800"></span>
                )}
              </button>
              <div className="w-8 h-8 rounded-full bg-gray-200 dark:bg-gray-700 overflow-hidden border border-gray-100 dark:border-gray-600" onClick={() => setCurrentView('profile')}>
                <img src={user.avatar} alt="Profile" className="w-full h-full object-cover" />
              </div>
            </div>
          </header>
        )}

        {/* Main Content Area */}
        <main className={`flex-1 overflow-y-auto scroll-smooth bg-gray-50/50 dark:bg-gray-900 ${isMobile ? 'pb-20' : 'p-0'} transition-colors duration-200`}>
          <div className={`${!isMobile && currentView !== 'map' ? 'max-w-7xl mx-auto h-full' : 'h-full'}`}>
             {renderContent()}
          </div>
        </main>

        {/* Mobile Bottom Navigation */}
        {isMobile && (
          <nav className="absolute bottom-0 w-full bg-white dark:bg-gray-800 border-t border-gray-200 dark:border-gray-700 px-6 py-3 flex justify-between items-center z-30 pb-safe transition-colors duration-200">
            <NavButton 
              icon={<Home size={24} />} 
              label={t.home} 
              active={currentView === 'home'} 
              onClick={() => setCurrentView('home')} 
            />
            <NavButton 
              icon={<Package size={24} />} 
              label={t.agita} 
              active={currentView === 'agita'} 
              onClick={() => setCurrentView('agita')} 
            />
            <div className="relative -top-6">
              <button 
                onClick={() => setCurrentView('agita')}
                className="w-14 h-14 bg-gradient-to-tr from-blue-600 to-blue-500 rounded-full flex items-center justify-center text-white shadow-lg shadow-blue-600/40 hover:bg-blue-700 transition-transform hover:scale-105 active:scale-95 border-4 border-gray-50 dark:border-gray-900"
              >
                <Plus size={28} />
              </button>
            </div>
            <NavButton 
              icon={<MapIcon size={24} />} 
              label={t.map} 
              active={currentView === 'map'} 
              onClick={() => setCurrentView('map')} 
            />
            <NavButton 
              icon={<MessageSquare size={24} />} 
              label={t.chat} 
              active={currentView === 'chat'} 
              onClick={() => setCurrentView('chat')} 
            />
          </nav>
        )}

        {/* Notification Toast */}
        {showNotification && (
          <div className="absolute top-20 right-4 md:right-8 bg-gray-900/95 dark:bg-white/95 text-white dark:text-gray-900 p-4 rounded-xl shadow-2xl flex items-start gap-3 animate-in fade-in slide-in-from-top-4 z-50 backdrop-blur-sm border-l-4 border-orange-500 max-w-sm cursor-pointer" onClick={() => { setCurrentView('agita'); setShowNotification(false); }}>
            <div className="bg-orange-500/20 p-2 rounded-full shrink-0 text-orange-400 dark:text-orange-600">
              <Package size={16} />
            </div>
            <div className="flex-1">
              <h4 className="font-semibold text-sm">{t.notificationTitle}</h4>
              <p className="text-xs text-gray-300 dark:text-gray-600 mt-1">{t.notificationBody}</p>
            </div>
            <button onClick={(e) => { e.stopPropagation(); setShowNotification(false); }} className="text-gray-400 hover:text-white dark:hover:text-gray-900">✕</button>
          </div>
        )}
      </div>
    </div>
  );
};

const NavButton: React.FC<{ 
  icon: React.ReactNode; 
  label: string; 
  active: boolean; 
  onClick: () => void;
}> = ({ icon, label, active, onClick }) => (
  <button 
    onClick={onClick}
    className={`flex flex-col items-center gap-1 transition-colors ${active ? 'text-blue-600 dark:text-blue-400' : 'text-gray-400 hover:text-gray-600 dark:hover:text-gray-300'}`}
  >
    {icon}
    <span className="text-[10px] font-medium">{label}</span>
  </button>
);

const SidebarItem: React.FC<{ 
  icon: React.ReactNode; 
  label: string; 
  active: boolean; 
  onClick: () => void;
}> = ({ icon, label, active, onClick }) => (
  <button 
    onClick={onClick}
    className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-lg transition-all text-sm font-medium ${
      active 
        ? 'bg-blue-50 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300' 
        : 'text-gray-600 dark:text-gray-400 hover:bg-gray-50 dark:hover:bg-gray-700 hover:text-gray-900 dark:hover:text-gray-200'
    }`}
  >
    <span className={active ? 'text-blue-600 dark:text-blue-400' : 'text-gray-400 dark:text-gray-500 group-hover:text-gray-600'}>{icon}</span>
    {label}
  </button>
);

const HomeView: React.FC<{ onNavigate: (view: ViewState) => void, t: any, lang: Language, trips: Trip[], user: AuthUser, balance: number }> = ({ onNavigate, t, lang, trips, user, balance }) => {
  return (
    <div className="p-4 md:p-8 space-y-6 md:space-y-8">
      {/* Desktop Dashboard Grid */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        
        {/* Hero Banner - Spans 2 cols on Desktop */}
        <div className="md:col-span-2 bg-gradient-to-r from-blue-600 to-indigo-700 rounded-2xl p-6 md:p-10 text-white shadow-xl relative overflow-hidden group">
          <div className="relative z-10 max-w-lg">
            <h2 className="text-2xl md:text-4xl font-bold mb-4">{lang === 'pt' ? `Olá, ${user.name.split(' ')[0]}!` : `Hello, ${user.name.split(' ')[0]}!`} <br/>{t.heroTitle}</h2>
            <p className="text-blue-100 text-sm md:text-lg mb-8">{t.heroSubtitle}</p>
            <div className="flex gap-3">
              <button 
                onClick={() => onNavigate('agita')}
                className="bg-orange-500 hover:bg-orange-600 text-white px-6 py-3 rounded-xl text-sm font-bold shadow-lg shadow-orange-600/20 transition-all active:scale-95 border border-orange-400 flex items-center gap-2"
              >
                <Package size={18} />
                {t.getStarted}
              </button>
              <button 
                onClick={() => onNavigate('services')}
                className="bg-white/10 hover:bg-white/20 backdrop-blur-sm text-white px-6 py-3 rounded-xl text-sm font-bold transition-all border border-white/20"
              >
                {lang === 'pt' ? 'Ver Serviços' : 'Browse Services'}
              </button>
            </div>
          </div>
          <div className="absolute right-[-20px] bottom-[-30px] opacity-20 rotate-12 transition-transform duration-700 group-hover:scale-110 group-hover:rotate-6">
            <Truck size={200} />
          </div>
        </div>

        {/* Stats / Wallet Card (Desktop Only) */}
        <div className="hidden md:flex flex-col gap-4">
           <div className="bg-white dark:bg-gray-800 p-6 rounded-2xl shadow-sm border border-gray-100 dark:border-gray-700 flex-1 flex flex-col justify-center transition-colors">
              <div className="flex items-center justify-between mb-4">
                 <h3 className="font-bold text-gray-500 dark:text-gray-400 text-sm uppercase tracking-wide">{lang === 'pt' ? 'Carteira' : 'Wallet'}</h3>
                 <span className="bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-300 text-xs px-2 py-1 rounded-md font-bold">+12%</span>
              </div>
              <div className="text-3xl font-bold text-gray-800 dark:text-white mb-1">Kz {balance.toLocaleString()}</div>
              <p className="text-gray-400 dark:text-gray-500 text-xs mb-4">{lang === 'pt' ? 'Disponível para saque' : 'Available for withdrawal'}</p>
              <button onClick={() => onNavigate('profile')} className="w-full py-2 bg-gray-50 dark:bg-gray-700 text-gray-700 dark:text-gray-200 font-semibold rounded-lg text-sm hover:bg-gray-100 dark:hover:bg-gray-600 border border-gray-200 dark:border-gray-600 transition-colors">
                {lang === 'pt' ? 'Gerir Carteira' : 'Manage Wallet'}
              </button>
           </div>
           
           <div className="bg-gradient-to-br from-gray-900 to-gray-800 dark:from-black dark:to-gray-900 p-6 rounded-2xl shadow-lg text-white flex-1 flex flex-col justify-center relative overflow-hidden">
              <div className="relative z-10">
                <div className="flex items-center gap-2 mb-2 text-orange-400">
                  <TrendingUp size={18} />
                  <span className="font-bold text-sm">Boost</span>
                </div>
                <p className="text-sm text-gray-300 mb-3 leading-snug">
                  {lang === 'pt' ? 'Destaque seus serviços para 500+ pessoas hoje.' : 'Boost your services to 500+ people today.'}
                </p>
                <button onClick={() => onNavigate('boosts')} className="text-xs font-bold underline hover:text-orange-400 decoration-orange-500 underline-offset-4">
                   {lang === 'pt' ? 'Saiba Mais' : 'Learn More'}
                </button>
              </div>
              <Zap size={80} className="absolute -right-4 -bottom-4 text-white/5 rotate-12" />
           </div>
        </div>
      </div>

      {/* Quick Actions */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 md:gap-6">
        <ActionCard 
          icon={<Package size={28} />} 
          title={t.sendPackage} 
          color="blue" 
          onClick={() => onNavigate('agita')} 
        />
        <ActionCard 
          icon={<Truck size={28} />} 
          title={t.imTraveling} 
          color="orange" 
          onClick={() => onNavigate('agita')} 
        />
        <ActionCard 
          icon={<Wrench size={28} />} 
          title={lang === 'pt' ? "Contratar Técnico" : "Hire Tech"} 
          color="emerald" 
          onClick={() => onNavigate('services')} 
        />
         <ActionCard 
          icon={<Plus size={28} />} 
          title={lang === 'pt' ? "Criar Anúncio" : "Create Ad"} 
          color="purple" 
          onClick={() => onNavigate('profile')} 
        />
      </div>

      {/* Categories & Recent Activity Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        <div className="lg:col-span-2 space-y-4">
           <div className="flex justify-between items-center">
            <h3 className="text-lg md:text-xl font-bold text-gray-800 dark:text-white">{t.servicesNearby}</h3>
            <button onClick={() => onNavigate('services')} className="text-blue-600 dark:text-blue-400 text-sm font-bold hover:underline">{t.viewAll}</button>
          </div>
          <div className="grid grid-cols-4 gap-4 md:flex md:gap-6 overflow-x-auto pb-2 scrollbar-hide">
            <CategoryCard icon={<Truck />} label={lang === 'pt' ? "Kupapata" : "Moto-Taxi"} color="bg-indigo-50 text-indigo-600 dark:bg-indigo-900/30 dark:text-indigo-400" onClick={() => onNavigate('services')} />
            <CategoryCard icon={<Scissors />} label={lang === 'pt' ? "Barbeiro" : "Barber"} color="bg-purple-50 text-purple-600 dark:bg-purple-900/30 dark:text-purple-400" onClick={() => onNavigate('services')} />
            <CategoryCard icon={<Wrench />} label={lang === 'pt' ? "Técnico" : "Tech"} color="bg-emerald-50 text-emerald-600 dark:bg-emerald-900/30 dark:text-emerald-400" onClick={() => onNavigate('services')} />
            <CategoryCard icon={<Zap />} label={lang === 'pt' ? "Elétrico" : "Electric"} color="bg-yellow-50 text-yellow-600 dark:bg-yellow-900/30 dark:text-yellow-400" onClick={() => onNavigate('services')} />
            <CategoryCard icon={<Globe />} label={lang === 'pt' ? "Aulas" : "Classes"} color="bg-pink-50 text-pink-600 dark:bg-pink-900/30 dark:text-pink-400" onClick={() => onNavigate('services')} />
          </div>
        </div>

        <div className="space-y-4">
          <h3 className="text-lg md:text-xl font-bold text-gray-800 dark:text-white">{t.recentTrips}</h3>
          <div className="space-y-3">
            {trips.slice(0, 3).map((trip) => (
              <div key={trip.id} onClick={() => onNavigate('agita')} className="bg-white dark:bg-gray-800 p-4 rounded-xl border border-gray-100 dark:border-gray-700 shadow-sm hover:shadow-md transition-all flex items-center justify-between cursor-pointer group">
                <div className="flex items-center gap-3">
                  <div className="relative">
                     <img src={trip.host?.avatar || 'https://picsum.photos/seed/kombo-user/100/100'} alt={trip.host?.name || 'User'} className="w-10 h-10 rounded-full object-cover group-hover:ring-2 ring-blue-500 transition-all" />
                  </div>
                  <div>
                    <h4 className="font-bold text-gray-800 dark:text-gray-200 text-sm truncate max-w-[120px]">{trip.origin} ➝ {trip.destination}</h4>
                    <p className="text-xs text-gray-500 dark:text-gray-400">{trip.date}</p>
                  </div>
                </div>
                <div className="text-right">
                  <span className="text-blue-600 dark:text-blue-400 font-bold text-sm block">Kz {trip.pricePerUnit.toLocaleString()}</span>
                  <span className="text-[10px] text-gray-400 bg-gray-100 dark:bg-gray-700 px-1.5 py-0.5 rounded">Agita</span>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
};

const ActionCard: React.FC<{ icon: React.ReactNode, title: string, color: 'blue' | 'orange' | 'emerald' | 'purple', onClick: () => void }> = ({ icon, title, color, onClick }) => {
  const colors = {
    blue: 'bg-blue-50 text-blue-600 hover:border-blue-200 dark:bg-blue-900/20 dark:text-blue-400 dark:hover:border-blue-700',
    orange: 'bg-orange-50 text-orange-600 hover:border-orange-200 dark:bg-orange-900/20 dark:text-orange-400 dark:hover:border-orange-700',
    emerald: 'bg-emerald-50 text-emerald-600 hover:border-emerald-200 dark:bg-emerald-900/20 dark:text-emerald-400 dark:hover:border-emerald-700',
    purple: 'bg-purple-50 text-purple-600 hover:border-purple-200 dark:bg-purple-900/20 dark:text-purple-400 dark:hover:border-purple-700',
  };

  return (
    <div 
      onClick={onClick}
      className={`p-6 rounded-2xl shadow-sm border border-transparent ${colors[color]} flex flex-col items-center justify-center gap-3 active:scale-95 transition-all cursor-pointer h-36 md:h-40 group`}
    >
      <div className="p-3 bg-white dark:bg-gray-800 rounded-full shadow-sm group-hover:scale-110 transition-transform duration-300">
        {icon}
      </div>
      <span className="font-bold text-center text-sm md:text-base leading-tight">{title}</span>
    </div>
  );
}

const CategoryCard: React.FC<{ icon: React.ReactNode, label: string, color: string, onClick: () => void }> = ({ icon, label, color, onClick }) => (
  <div onClick={onClick} className="flex flex-col items-center gap-3 min-w-[80px] cursor-pointer group">
    <div className={`w-16 h-16 md:w-20 md:h-20 rounded-2xl flex items-center justify-center text-2xl shadow-sm group-hover:shadow-md transition-all ${color}`}>
      {React.cloneElement(icon as React.ReactElement<any>, { size: 28 })}
    </div>
    <span className="text-xs md:text-sm font-semibold text-gray-600 dark:text-gray-400 group-hover:text-gray-900 dark:group-hover:text-white">{label}</span>
  </div>
);

export default App;
