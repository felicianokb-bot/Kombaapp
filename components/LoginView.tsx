
import React, { useState, useEffect } from 'react';
import { AuthUser, Language } from '../types';
import { Globe, Moon, Check } from 'lucide-react';
import getSupabase, { logEvent } from '../services/supabaseClient';

interface LoginViewProps {
  onLogin: (user: AuthUser) => void;
  lang: Language;
  toggleLanguage: () => void;
  isDarkMode: boolean;
}

const LoginView: React.FC<LoginViewProps> = ({ onLogin, lang, toggleLanguage, isDarkMode }) => {
  const [feedback, setFeedback] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  
  useEffect(() => {
    try {
      const url = new URL(window.location.href)
      const err = url.searchParams.get('auth_error')
      if (err) setFeedback(err)
    } catch {}
  }, [])

  const handleGoogleLogin = async () => {
    setIsLoading(true);
    const supabase = getSupabase();
    if (!supabase) {
      setFeedback(lang === 'pt' ? 'Supabase não configurado.' : 'Supabase not configured.');
      try { logEvent('auth_login_error', { reason: 'supabase_not_configured' }) } catch (_e) {}
      setIsLoading(false);
      return;
    }
    const env = (import.meta as any)?.env || {}
    const edgeEnv = env?.VITE_EDGE_AUTH_CALLBACK_URL as string | undefined
    const supaUrl = (env?.VITE_SUPABASE_URL as string)
      || (process.env.VITE_SUPABASE_URL as string)
      || (process.env.SUPABASE_URL as string)
      || ''
    let edgeUrl = edgeEnv || (supaUrl ? `${supaUrl.replace(/\/$/, '')}/functions/v1/auth-callback` : '')
    const appOrigin = window.location.origin
    if (edgeUrl) {
      try {
        const u = new URL(edgeUrl)
        u.searchParams.set('redirect_to', appOrigin)
        edgeUrl = u.toString()
      } catch {
        edgeUrl = `${edgeUrl}?redirect_to=${encodeURIComponent(appOrigin)}`
      }
    }
    const useEdge = ((env?.VITE_USE_EDGE_AUTH as string) === 'true') || !!edgeEnv
    const redirectTo = useEdge && edgeUrl ? edgeUrl : appOrigin

    try { logEvent('auth_login_start', { redirectTo }) } catch (_e) {}
    const { error } = await supabase.auth.signInWithOAuth({
      provider: 'google',
      options: { redirectTo }
    });
    if (error) {
      setFeedback(error.message || (lang === 'pt' ? 'Falha ao iniciar OAuth com Google.' : 'Failed to start Google OAuth.'))
      try { logEvent('auth_login_error', { message: error.message }) } catch (_e) {}
    } else {
      try { logEvent('auth_login_redirected', { redirectTo }) } catch (_e) {}
    }
    setIsLoading(false);
  };

  

  const texts = {
    pt: {
      welcome: 'Bem-vindo ao KOMBO',
      subtitle: 'O Super App que conecta Angola.',
      googleBtn: 'Continuar com Google',
      phoneBtn: 'Usar número de telefone',
      terms: 'Ao continuar, você aceita os Termos de Serviço e Política de Privacidade.',
      feature1: 'Viaje e envie encomendas',
      feature2: 'Encontre serviços locais',
      feature3: 'Pagamentos seguros'
    },
    en: {
      welcome: 'Welcome to KOMBO',
      subtitle: 'The Super App connecting Angola.',
      googleBtn: 'Continue with Google',
      phoneBtn: 'Use phone number',
      terms: 'By continuing, you agree to our Terms of Service and Privacy Policy.',
      feature1: 'Travel and ship packages',
      feature2: 'Find local services',
      feature3: 'Secure payments'
    }
  };

  const t = texts[lang];

  return (
    <div className="min-h-screen flex flex-col md:flex-row bg-white dark:bg-gray-900 transition-colors duration-300">
      
      {/* Left Side - Visual / Branding */}
      <div className="hidden md:flex flex-1 bg-gradient-to-br from-blue-600 to-indigo-800 relative overflow-hidden items-center justify-center p-12">
        <div className="absolute inset-0 opacity-20" style={{ backgroundImage: 'radial-gradient(circle at 2px 2px, white 1px, transparent 0)', backgroundSize: '40px 40px' }}></div>
        
        <div className="relative z-10 text-white max-w-lg">
          <div className="w-20 h-20 bg-white rounded-2xl flex items-center justify-center mb-8 shadow-2xl">
             <span className="text-4xl font-bold text-blue-700">K</span>
          </div>
          <h1 className="text-5xl font-bold mb-6 tracking-tight">KOMBO</h1>
          <p className="text-xl text-blue-100 mb-10 leading-relaxed">
            {lang === 'pt' ? 'Simplificando a mobilidade e serviços em Angola e nos PALOPs.' : 'Simplifying mobility and services in Angola and PALOPs.'}
          </p>
          
          <div className="space-y-4">
            <FeatureItem text={t.feature1} />
            <FeatureItem text={t.feature2} />
            <FeatureItem text={t.feature3} />
          </div>
        </div>
        
        {/* Decorative Circle */}
        <div className="absolute -bottom-40 -right-40 w-96 h-96 bg-orange-500 rounded-full blur-3xl opacity-30"></div>
      </div>

      {/* Right Side - Login Form */}
      <div className="flex-1 flex flex-col justify-center items-center p-6 md:p-12 relative">
        <div className="absolute top-6 right-6 flex gap-4">
           <button onClick={toggleLanguage} className="flex items-center gap-2 text-sm text-gray-500 hover:text-gray-800 dark:text-gray-400 dark:hover:text-white transition-colors">
              <Globe size={16} /> {lang.toUpperCase()}
            </button>
          </div>

        <div className="w-full max-w-md space-y-8">
          <div className="text-center md:text-left">
             <div className="md:hidden w-16 h-16 bg-gradient-to-br from-blue-600 to-indigo-600 rounded-xl flex items-center justify-center mx-auto mb-6 shadow-lg">
                <span className="text-3xl font-bold text-white">K</span>
             </div>
             <h2 className="text-3xl font-bold text-gray-900 dark:text-white">{t.welcome}</h2>
             <p className="mt-2 text-gray-500 dark:text-gray-400">{t.subtitle}</p>
          </div>

          <div className="space-y-4 pt-4">
            <button 
              onClick={handleGoogleLogin}
              disabled={isLoading}
              className="w-full flex items-center justify-center gap-3 bg-white dark:bg-gray-800 text-gray-700 dark:text-white font-semibold py-4 px-6 border border-gray-300 dark:border-gray-600 rounded-xl hover:bg-gray-50 dark:hover:bg-gray-700 transition-all shadow-sm active:scale-[0.98] disabled:opacity-70 disabled:cursor-not-allowed"
            >
              {isLoading ? (
                <div className="w-6 h-6 border-2 border-gray-400 border-t-transparent rounded-full animate-spin"></div>
              ) : (
                <>
                  <svg className="w-5 h-5" viewBox="0 0 24 24">
                    <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#4285F4" />
                    <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853" />
                    <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" fill="#FBBC05" />
                    <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335" />
                  </svg>
                  {t.googleBtn}
                </>
              )}
            </button>
            <button disabled className="w-full bg-gray-100 dark:bg-gray-800 text-gray-400 dark:text-gray-500 font-semibold py-4 px-6 rounded-xl cursor-not-allowed">
              {t.phoneBtn}
            </button>
            {feedback && (
              <p className="text-xs text-center text-red-600 dark:text-red-400">{feedback}</p>
            )}
          </div>

          
          <p className="text-xs text-center text-gray-400 dark:text-gray-500 max-w-xs mx-auto leading-relaxed">
            {t.terms}
          </p>
        </div>

        <div className="absolute bottom-6 text-xs text-gray-300 dark:text-gray-600">
           © 2024 KOMBO Technologies AO.
        </div>
      </div>
    </div>
  );
};

const FeatureItem: React.FC<{ text: string }> = ({ text }) => (
  <div className="flex items-center gap-3 bg-white/10 backdrop-blur-sm p-3 rounded-xl border border-white/10">
    <div className="w-6 h-6 bg-green-400 rounded-full flex items-center justify-center text-blue-900">
      <Check size={14} strokeWidth={4} />
    </div>
    <span className="font-semibold text-lg">{text}</span>
  </div>
);

export default LoginView;
