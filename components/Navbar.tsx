import React, { useState, useEffect } from 'react';
import { onAuthStatusChange, logoutUser, CustomPage, subscribeUtilizadorDoc } from '../services/firebase';
import { useLanguage, Language } from '../services/LanguageContext';

interface NavbarProps {
  onNavClick: (e: React.MouseEvent<HTMLAnchorElement>, targetId: string) => void;
  onOpenAuth: () => void;
  onOpenBackoffice: () => void;
  showBackofficeBtn: boolean;
  customPages: CustomPage[];
  selectedPage: CustomPage | null;
  onPageSelect: (page: CustomPage | null) => void;
  onToggleSidebar: () => void;
}

const Navbar: React.FC<NavbarProps> = ({ 
  onNavClick, 
  onOpenAuth, 
  onOpenBackoffice, 
  showBackofficeBtn,
  customPages,
  selectedPage,
  onPageSelect,
  onToggleSidebar
}) => {
  const [scrolled, setScrolled] = useState(false);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [purifierExpanded, setPurifierExpanded] = useState(false);
  
  const { language, setLanguage, t } = useLanguage();
  const [langDropdownOpen, setLangDropdownOpen] = useState(false);
  
  // Auth State
  const [currentUser, setCurrentUser] = useState<any>(null);
  const [isAdmin, setIsAdmin] = useState(false);
  const [userPlan, setUserPlan] = useState<'gratuito' | 'basic' | 'pro'>('gratuito');

  useEffect(() => {
    const handleScroll = () => {
      setScrolled(window.scrollY > 30);
    };
    window.addEventListener('scroll', handleScroll);
    
    let unsubUtilizador: (() => void) | null = null;
    
    // Auth Status listener
    const unsubscribe = onAuthStatusChange((user, checkAdmin) => {
      setCurrentUser(user);
      setIsAdmin(checkAdmin);
      
      if (user) {
        if (user.email === 'morgado.aam@gmail.com') {
          setUserPlan('pro');
        } else {
          // Subscribe to plan in real-time
          unsubUtilizador = subscribeUtilizadorDoc(user.uid, (profileData) => {
            if (profileData) {
              let matchedPlan: 'gratuito' | 'basic' | 'pro' | null = null;
              const planKeys = [
                'plano', 'plan', 'subscription', 'subscricao', 'subscriptiontype', 'subscription_type',
                'tipoconta', 'tipo_conta'
              ];
              for (const k of Object.keys(profileData)) {
                if (planKeys.includes(k.toLowerCase())) {
                  const val = String(profileData[k] || '').trim().toLowerCase();
                  if (val.includes('pro') || val.includes('cloud') || val.includes('anual') || val.includes('mensal') || val === 'gold') {
                    matchedPlan = 'pro';
                  } else if (val.includes('basic') || val.includes('básico') || val.includes('basico') || val.includes('local') || val.includes('offline')) {
                    matchedPlan = 'basic';
                  }
                }
              }
              if (!matchedPlan) {
                const remainsPremium = profileData.premium || profileData.isPremium;
                if (remainsPremium) {
                  const isCloud = profileData.cloudActive || profileData.cloud_active || profileData.syncCloud;
                  matchedPlan = isCloud ? 'pro' : 'basic';
                } else {
                  matchedPlan = 'gratuito';
                }
              }
              setUserPlan(matchedPlan);
            }
          });
        }
      } else {
        setUserPlan('gratuito');
      }
    });

    return () => {
      window.removeEventListener('scroll', handleScroll);
      unsubscribe();
      if (unsubUtilizador) unsubUtilizador();
    };
  }, []);

  const handleLinkClick = (e: React.MouseEvent<HTMLAnchorElement>, targetId: string) => {
    setMobileMenuOpen(false);
    onNavClick(e, targetId);
  };

  const handleLogout = async () => {
    await logoutUser();
    setMobileMenuOpen(false);
  };

  return (
    <>
      <nav 
        className={`fixed top-0 left-0 right-0 z-50 transition-all duration-500 ease-in-out ${
          scrolled || mobileMenuOpen ? 'bg-[#0E0E11]/90 backdrop-blur-lg py-4 border-b border-white/5' : 'bg-transparent py-6'
        }`}
      >
        <div className="max-w-7xl mx-auto px-6 flex items-center justify-between">
          {/* Left: Logo & 3-lines Hamburger Menu button */}
          <div className="flex items-center gap-4 z-50 relative animate-fade-in">
            {/* Logo */}
            <a 
              href="#" 
              onClick={(e) => {
                  e.preventDefault();
                  onPageSelect(null);
                  window.scrollTo({ top: 0, behavior: 'smooth' });
              }}
              className="flex items-center gap-2.5 group"
            >
              <div className="relative flex items-center justify-center w-8.5 h-8.5 rounded-lg bg-gradient-to-tr from-[#EF233C] to-white p-[1.5px] transition-transform duration-300 group-hover:scale-105 shadow-md">
                <div className="w-full h-full bg-[#0A0A0C] rounded-md flex items-center justify-center">
                  <span className="text-white font-bold text-xs tracking-tighter italic">iR</span>
                </div>
              </div>
              <div className="flex flex-col items-start leading-none -space-y-0.5">
                <span className="text-lg sm:text-xl font-black italic tracking-tight text-white font-display">
                  <span className="text-[#EF233C]">iRun</span>Bets
                </span>
                {userPlan === 'pro' ? (
                  <span className="text-[7.5px] font-black uppercase text-[#bf5af2] tracking-widest pl-0.5 mt-0.5 drop-shadow-[0_0_5px_#bf5af2] animate-pulse">
                    Plan Pro
                  </span>
                ) : userPlan === 'basic' ? (
                  <span className="text-[7.5px] font-black uppercase text-amber-500 tracking-widest pl-0.5 mt-0.5">
                    Plan Básico
                  </span>
                ) : (
                  <span className="text-[7.5px] font-black uppercase text-zinc-650 tracking-widest pl-0.5 mt-0.5 font-mono">
                    Visitante
                  </span>
                )}
              </div>
            </a>

            {/* 3 Traços (3 horizontal lines) Sidebar Menu Button */}
            <button
              type="button"
              onClick={onToggleSidebar}
              className="flex items-center gap-2 px-3 py-1.5 rounded-xl bg-zinc-900/90 hover:bg-[#00f2fe]/10 border border-zinc-800 hover:border-[#00f2fe]/40 text-zinc-300 hover:text-[#00f2fe] transition-all duration-300 shadow-md cursor-pointer group"
              title="Abrir Menu de Navegação / Sidebar"
            >
              {/* 3 Traços */}
              <div className="flex flex-col gap-1 w-4">
                <span className="h-0.5 w-full bg-[#00f2fe] group-hover:bg-white rounded-full transition-colors"></span>
                <span className="h-0.5 w-full bg-[#00f2fe] group-hover:bg-white rounded-full transition-colors"></span>
                <span className="h-0.5 w-full bg-[#00f2fe] group-hover:bg-white rounded-full transition-colors"></span>
              </div>
              <span className="text-[11px] font-extrabold uppercase tracking-widest font-mono">MENU</span>
            </button>
          </div>
          
          {/* Center Links - Clean & Minimalist Navigation Links */}
          <div className="hidden md:flex items-center gap-6 text-xs lg:text-sm font-medium tracking-wide text-zinc-400 font-sans">
            <a 
              href="#hero" 
              onClick={(e) => {
                e.preventDefault();
                onPageSelect(null);
                handleLinkClick(e, '');
              }} 
              className={`transition-colors flex items-center gap-1.5 font-bold ${!selectedPage ? 'text-[#00f2fe] border-b-2 border-[#00f2fe] pb-0.5' : 'hover:text-white'}`}
            >
              <span>{t('nav.home')}</span>
            </a>

            {/* Prognósticos de Futebol Link */}
            <a 
              href="#prognosticos-futebol" 
              onClick={(e) => {
                e.preventDefault();
                const existingPage = customPages.find(p => p.slug === 'prognosticos-futebol' || p.slug === 'prognosticos');
                const progPage = existingPage || {
                  id: 'prognosticos-futebol',
                  slug: 'prognosticos-futebol',
                  title: 'Prognósticos de Futebol',
                  description: 'Análises de futebol e lista de palpites IA com janela pop-up de previsão',
                  createdAt: new Date().toISOString(),
                  blocks: []
                };
                onPageSelect(progPage);
                window.location.hash = '#prognosticos-futebol';
                window.dispatchEvent(new CustomEvent('irunbets_switch_prognosticos_tab', { detail: 'tabela' }));
                window.scrollTo({ top: 0, behavior: 'instant' });
              }} 
              className={`transition-colors flex items-center gap-1.5 font-bold px-3 py-1.5 rounded-xl border transition-all ${
                (selectedPage?.slug === 'prognosticos-futebol' || selectedPage?.slug === 'prognosticos') && !window.location.hash.includes('apostas-do-dia')
                  ? 'bg-orange-500/15 border-orange-500/40 text-orange-400 shadow-lg shadow-orange-500/10'
                  : 'bg-zinc-900/60 border-zinc-800/80 hover:border-orange-500/30 text-zinc-300 hover:text-white'
              }`}
            >
              <span className="text-base">⚽</span>
              <span className="uppercase text-xs tracking-wider font-display">Prognósticos de futebol</span>
            </a>

            {/* Apostas do Dia Subpage Direct Link */}
            <a 
              href="#apostas-do-dia" 
              onClick={(e) => {
                e.preventDefault();
                const existingPage = customPages.find(p => p.slug === 'prognosticos-futebol' || p.slug === 'prognosticos');
                const progPage = existingPage || {
                  id: 'prognosticos-futebol',
                  slug: 'prognosticos-futebol',
                  title: 'Apostas do Dia',
                  description: 'Tickets de Apostas de Elite (#1 a #6) e Simulador IA',
                  createdAt: new Date().toISOString(),
                  blocks: []
                };
                onPageSelect(progPage);
                window.location.hash = '#apostas-do-dia';
                window.dispatchEvent(new CustomEvent('irunbets_switch_prognosticos_tab', { detail: 'apostas-do-dia' }));
                window.scrollTo({ top: 0, behavior: 'instant' });
              }} 
              className={`transition-colors flex items-center gap-1.5 font-bold px-3 py-1.5 rounded-xl border transition-all ${
                window.location.hash.includes('apostas-do-dia')
                  ? 'bg-gradient-to-r from-orange-500/20 to-amber-500/20 border-orange-500/50 text-orange-300 shadow-lg shadow-orange-500/10'
                  : 'bg-zinc-900/60 border-zinc-800/80 hover:border-amber-500/30 text-zinc-300 hover:text-white'
              }`}
            >
              <span className="text-base">🎯</span>
              <span className="uppercase text-xs tracking-wider font-display">Apostas do dia</span>
              <span className="text-[9px] font-mono px-1.5 py-0.2 rounded bg-orange-500 text-black font-black">
                3 QUADROS
              </span>
            </a>

            {/* VIP Dashboard Link */}
            <a 
              href="#vip-dashboard" 
              onClick={(e) => {
                e.preventDefault();
                const existingPage = customPages.find(p => p.slug === 'vip-dashboard' || p.slug === 'dashboard');
                const dashPage = existingPage || {
                  id: 'vip-dashboard',
                  slug: 'vip-dashboard',
                  title: 'Dashboard',
                  description: 'Registo de Apostas Desportivas, Gestão de Banca e IA de Análise de Jogos',
                  createdAt: new Date().toISOString(),
                  blocks: []
                };
                onPageSelect(dashPage);
                window.location.hash = '#vip-dashboard';
                window.scrollTo({ top: 0, behavior: 'instant' });
              }} 
              className={`transition-colors flex items-center gap-1.5 font-bold px-3 py-1.5 rounded-xl border transition-all ${
                selectedPage?.slug === 'vip-dashboard' || selectedPage?.slug === 'dashboard'
                  ? 'bg-[#00f2fe]/15 border-[#00f2fe]/40 text-[#00f2fe] shadow-lg shadow-[#00f2fe]/10'
                  : 'bg-zinc-900/60 border-zinc-800/80 hover:border-[#00f2fe]/30 text-zinc-300 hover:text-white'
              }`}
            >
              <span className="text-base">📊</span>
              <span className="uppercase text-xs tracking-wider font-display">Dashboard</span>
            </a>

            {/* Dados Estatísticos Link */}
            <a 
              href="#dados-estatisticos" 
              onClick={(e) => {
                e.preventDefault();
                const existingPage = customPages.find(p => p.slug === 'dados-estatisticos');
                const statsPage = existingPage || {
                  id: 'dados-estatisticos',
                  slug: 'dados-estatisticos',
                  title: 'Dados Estatísticos',
                  description: 'Modelos de Poisson, Exportação Excel e Feeds de API',
                  createdAt: new Date().toISOString(),
                  blocks: []
                };
                onPageSelect(statsPage);
                window.location.hash = '#dados-estatisticos';
                window.scrollTo({ top: 0, behavior: 'instant' });
              }} 
              className={`transition-colors flex items-center gap-1.5 font-bold px-3 py-1.5 rounded-xl border transition-all ${
                selectedPage?.slug === 'dados-estatisticos'
                  ? 'bg-emerald-500/15 border-emerald-500/40 text-emerald-400 shadow-lg shadow-emerald-500/10'
                  : 'bg-zinc-900/60 border-zinc-800/80 hover:border-emerald-500/30 text-zinc-300 hover:text-white'
              }`}
            >
              <span className="text-base">📑</span>
              <span className="uppercase text-xs tracking-wider font-display">Dados Estatísticos</span>
            </a>
          </div>

          {/* Right Actions */}
          <div className="flex items-center gap-3 lg:gap-4 z-50 relative">
            
            {/* Language Dropdown Selector */}
            <div className="relative">
              <button
                type="button"
                onClick={() => setLangDropdownOpen(!langDropdownOpen)}
                className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-zinc-400 hover:text-white border border-zinc-900 rounded-full bg-zinc-950/40 hover:bg-zinc-900 transition-all duration-300 cursor-pointer font-mono leading-none"
              >
                <span>{language === 'pt' ? '🇵🇹 PT' : language === 'en' ? '🇬🇧 EN' : language === 'fr' ? '🇫🇷 FR' : language === 'it' ? '🇮🇹 IT' : '🇩🇪 DE'}</span>
                <span className="text-[7px] opacity-60">▼</span>
              </button>

              {langDropdownOpen && (
                <div className="absolute right-0 mt-2 z-50 bg-[#0E0E11] border border-zinc-800 p-1 rounded-xl shadow-2xl min-w-[125px] flex flex-col gap-0.5 animate-fade-in">
                  <button
                    onClick={() => { setLanguage('pt'); setLangDropdownOpen(false); }}
                    className={`flex items-center gap-2 text-left w-full text-xs px-2.5 py-1.5 rounded-lg transition-colors font-mono cursor-pointer ${language === 'pt' ? 'text-orange-500 bg-orange-500/10 font-bold' : 'text-zinc-400 hover:text-white hover:bg-zinc-900'}`}
                  >
                    <span>🇵🇹</span> <span>Português</span>
                  </button>
                  <button
                    onClick={() => { setLanguage('en'); setLangDropdownOpen(false); }}
                    className={`flex items-center gap-2 text-left w-full text-xs px-2.5 py-1.5 rounded-lg transition-colors font-mono cursor-pointer ${language === 'en' ? 'text-orange-500 bg-orange-500/10 font-bold' : 'text-zinc-400 hover:text-white hover:bg-zinc-900'}`}
                  >
                    <span>🇬🇧</span> <span>English</span>
                  </button>
                  <button
                    onClick={() => { setLanguage('fr'); setLangDropdownOpen(false); }}
                    className={`flex items-center gap-2 text-left w-full text-xs px-2.5 py-1.5 rounded-lg transition-colors font-mono cursor-pointer ${language === 'fr' ? 'text-orange-500 bg-orange-500/10 font-bold' : 'text-zinc-400 hover:text-white hover:bg-zinc-900'}`}
                  >
                    <span>🇫🇷</span> <span>Français</span>
                  </button>
                  <button
                    onClick={() => { setLanguage('it'); setLangDropdownOpen(false); }}
                    className={`flex items-center gap-2 text-left w-full text-xs px-2.5 py-1.5 rounded-lg transition-colors font-mono cursor-pointer ${language === 'it' ? 'text-orange-500 bg-orange-500/10 font-bold' : 'text-zinc-400 hover:text-white hover:bg-zinc-900'}`}
                  >
                    <span>🇮🇹</span> <span>Italiano</span>
                  </button>
                  <button
                    onClick={() => { setLanguage('de'); setLangDropdownOpen(false); }}
                    className={`flex items-center gap-2 text-left w-full text-xs px-2.5 py-1.5 rounded-lg transition-colors font-mono cursor-pointer ${language === 'de' ? 'text-orange-500 bg-orange-500/10 font-bold' : 'text-zinc-400 hover:text-white hover:bg-zinc-900'}`}
                  >
                    <span>🇩🇪</span> <span>Deutsch</span>
                  </button>
                </div>
              )}
            </div>

            {/* Admin backoffice toggle button */}
            {isAdmin && showBackofficeBtn && (
              <button
                onClick={onOpenBackoffice}
                className="px-4 py-2 text-xs font-bold uppercase tracking-wider text-rose-400 border border-rose-500/30 rounded-xl bg-rose-500/10 hover:bg-rose-500/25 transition-all duration-300 flex items-center gap-1.5 animate-pulse"
              >
                <span>{t('nav.admin_panel')}</span>
                <span className="w-1.5 h-1.5 rounded-full bg-rose-400"></span>
              </button>
            )}

            {/* Standard User State */}
            {currentUser ? (
              <div className="hidden sm:flex items-center gap-3">
                <span className="text-xs font-medium text-zinc-300 font-mono">
                  {t('nav.hello')} {
                    (isAdmin || currentUser.email?.toLowerCase().includes('morgado') || currentUser.displayName?.toLowerCase().includes('morgado') || currentUser.displayName?.toLowerCase().includes('angelo'))
                      ? 'Admin'
                      : (currentUser.displayName || currentUser.email.split('@')[0])
                  }
                </span>
                
                <button
                  onClick={handleLogout}
                  className="px-3 py-1.5 text-[10px] font-bold uppercase tracking-wider text-zinc-400 hover:text-white border border-zinc-800 rounded-lg hover:bg-zinc-900 transition-colors"
                >
                  {t('nav.logout')}
                </button>
              </div>
            ) : (
              <button
                onClick={onOpenAuth}
                className="px-4 py-2 text-xs font-bold uppercase tracking-widest text-[#38bdf8] hover:text-white border border-[#38bdf8]/30 hover:border-orange-500 rounded-full bg-[#38bdf8]/5 hover:bg-orange-500/10 transition-all duration-300 flex items-center gap-1.5 cursor-pointer"
              >
                <span>{t('nav.sign_in')}</span>
                <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor" className="w-3.5 h-3.5">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M15.75 6a3.75 3.75 0 1 1-7.5 0 3.75 3.75 0 0 1 7.5 0ZM4.501 20.118a7.5 7.5 0 0 1 14.998 0A17.933 17.933 0 0 1 12 21.75c-2.676 0-5.216-.584-7.499-1.632Z" />
                </svg>
              </button>
            )}

            {/* Contact Support Direct link */}
            <a 
              href="mailto:suporte@irunbets.pt"
              className="px-4 py-2 text-xs font-semibold uppercase tracking-widest text-zinc-400 hover:text-orange-400 border border-zinc-900 rounded-full hover:bg-zinc-900 transition-all duration-300 hidden sm:inline-flex items-center gap-1.5 font-mono"
            >
              <span>{t('nav.support')}</span>
            </a>
            
            {/* Mobile Menu Toggle */}
            <button 
              className="block md:hidden focus:outline-none text-zinc-400 hover:text-white transition-colors"
              onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
              aria-label="Toggle Menu"
            >
               {mobileMenuOpen ? (
                 <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-6 h-6">
                   <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                 </svg>
               ) : (
                 <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-6 h-6">
                   <path strokeLinecap="round" strokeLinejoin="round" d="M3.75 6.75h16.5M3.75 12h16.5m-16.5 5.25h16.5" />
                 </svg>
               )}
            </button>
          </div>
        </div>
      </nav>

      {/* Mobile Menu Overlay */}
      <div className={`fixed inset-0 bg-[#0A0A0C]/98 z-40 flex flex-col justify-center items-center transition-all duration-500 ease-in-out ${
          mobileMenuOpen ? 'opacity-100 translate-y-0 pointer-events-auto' : 'opacity-0 -translate-y-10 pointer-events-none'
      }`}>
          <div className="flex flex-col items-center space-y-5 text-base font-semibold tracking-wider text-zinc-300">
            <a 
              href="#hero" 
              onClick={(e) => {
                e.preventDefault();
                onPageSelect(null);
                handleLinkClick(e, '');
              }} 
              className={`transition-colors ${!selectedPage ? 'text-white' : 'hover:text-white'}`}
            >
              {t('nav.home')}
            </a>

            {/* Mobile Prognósticos de Futebol Link */}
            <a 
              href="#prognosticos-futebol" 
              onClick={(e) => {
                e.preventDefault();
                const existingPage = customPages.find(p => p.slug === 'prognosticos-futebol' || p.slug === 'prognosticos');
                const progPage = existingPage || {
                  id: 'prognosticos-futebol',
                  slug: 'prognosticos-futebol',
                  title: 'Prognósticos de Futebol',
                  description: 'Análises de futebol e lista de palpites IA com janela pop-up de previsão',
                  createdAt: new Date().toISOString(),
                  blocks: []
                };
                onPageSelect(progPage);
                setMobileMenuOpen(false);
                window.location.hash = '#prognosticos-futebol';
                window.dispatchEvent(new CustomEvent('irunbets_switch_prognosticos_tab', { detail: 'tabela' }));
                window.scrollTo({ top: 0, behavior: 'instant' });
              }} 
              className="text-orange-400 hover:text-white font-bold flex items-center gap-1.5"
            >
              <span>⚽ Prognósticos de futebol (Tabela)</span>
            </a>

            {/* Mobile Apostas do Dia Link */}
            <a 
              href="#apostas-do-dia" 
              onClick={(e) => {
                e.preventDefault();
                const existingPage = customPages.find(p => p.slug === 'prognosticos-futebol' || p.slug === 'prognosticos');
                const progPage = existingPage || {
                  id: 'prognosticos-futebol',
                  slug: 'prognosticos-futebol',
                  title: 'Apostas do Dia',
                  description: 'Tickets de Apostas de Elite (#1 a #6) e Simulador IA',
                  createdAt: new Date().toISOString(),
                  blocks: []
                };
                onPageSelect(progPage);
                setMobileMenuOpen(false);
                window.location.hash = '#apostas-do-dia';
                window.dispatchEvent(new CustomEvent('irunbets_switch_prognosticos_tab', { detail: 'apostas-do-dia' }));
                window.scrollTo({ top: 0, behavior: 'instant' });
              }} 
              className="text-amber-400 hover:text-white font-bold flex items-center gap-1.5"
            >
              <span>🎯 Apostas do Dia (Tickets #1 a #6)</span>
            </a>

            {/* Mobile Dashboard Link */}
            <a 
              href="#vip-dashboard" 
              onClick={(e) => {
                e.preventDefault();
                const existingPage = customPages.find(p => p.slug === 'vip-dashboard' || p.slug === 'dashboard');
                const dashPage = existingPage || {
                  id: 'vip-dashboard',
                  slug: 'vip-dashboard',
                  title: 'Dashboard',
                  description: 'Registo de Apostas Desportivas, Gestão de Banca e IA de Análise de Jogos',
                  createdAt: new Date().toISOString(),
                  blocks: []
                };
                onPageSelect(dashPage);
                setMobileMenuOpen(false);
                window.location.hash = '#vip-dashboard';
                window.scrollTo({ top: 0, behavior: 'instant' });
              }} 
              className="text-[#00f2fe] hover:text-white font-bold flex items-center gap-1.5"
            >
              <span>📊 Dashboard VIP</span>
            </a>

            {/* Mobile Dados Estatísticos Link */}
            <a 
              href="#dados-estatisticos" 
              onClick={(e) => {
                e.preventDefault();
                const existingPage = customPages.find(p => p.slug === 'dados-estatisticos');
                const statsPage = existingPage || {
                  id: 'dados-estatisticos',
                  slug: 'dados-estatisticos',
                  title: 'Dados Estatísticos',
                  description: 'Modelos de Poisson, Exportação Excel e Feeds de API',
                  createdAt: new Date().toISOString(),
                  blocks: []
                };
                onPageSelect(statsPage);
                setMobileMenuOpen(false);
                window.location.hash = '#dados-estatisticos';
                window.scrollTo({ top: 0, behavior: 'instant' });
              }} 
              className="text-emerald-400 hover:text-white font-bold flex items-center gap-1.5"
            >
              <span>📑 Dados Estatísticos</span>
            </a>

            {/* Mobile custom navigation grouped into our Sidebar drawer trigger */}
            <button
              onClick={() => {
                setMobileMenuOpen(false);
                onToggleSidebar();
              }}
              className="flex items-center gap-2 text-[#00f2fe] font-bold py-2 px-6 rounded-full bg-[#00f2fe]/5 border border-[#00f2fe]/10 hover:bg-[#00f2fe]/10 transition-all font-sans text-sm animate-pulse cursor-pointer"
            >
              <span className="relative flex h-2.5 w-2.5">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-[#00f2fe] opacity-75"></span>
                <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-[#00f2fe]"></span>
              </span>
              <span>Canais & Páginas Extra</span>
            </button>

            {/* Mobile Purificador & Radar grouping */}
            <div className="flex flex-col items-center space-y-2">
              <button 
                onClick={() => setPurifierExpanded(!purifierExpanded)}
                className="text-zinc-300 hover:text-white font-medium transition-colors flex items-center gap-1.5 cursor-pointer"
              >
                <span>{t('nav.purificador')}</span>
                <span className={`text-[10px] transition-transform duration-300 ${purifierExpanded ? 'rotate-180 text-orange-500' : 'opacity-65'}`}>▼</span>
              </button>
              {purifierExpanded && (
                <div className="flex flex-col items-center space-y-2">
                  <a 
                    href="#radar" 
                    onClick={(e) => {
                      e.preventDefault();
                      onPageSelect(null);
                      setMobileMenuOpen(false);
                      handleLinkClick(e, 'radar');
                    }} 
                    className="text-orange-500 hover:text-orange-400 text-xs font-semibold px-4 py-1.5 transition-colors animate-fade-in block"
                  >
                    ↳ {t('nav.radar')}
                  </a>
                  {customPages
                    .filter((p) => p.isSubpage && p.parentSlug === 'purificador' && !p.hidden)
                    .map((page) => (
                      <a 
                        key={page.slug}
                        href={`#p/${page.slug}`}
                        onClick={(e) => {
                          e.preventDefault();
                          onPageSelect(page);
                          setMobileMenuOpen(false);
                        }} 
                        className="text-orange-400 hover:text-orange-350 text-xs font-semibold px-4 py-1 transition-colors animate-fade-in block text-center"
                      >
                        ↳ {page.title}
                      </a>
                    ))}
                </div>
              )}
            </div>

            <a 
              href="#noticias" 
              onClick={(e) => {
                e.preventDefault();
                onPageSelect(null);
                handleLinkClick(e, 'noticias');
              }} 
              className="hover:text-white transition-colors"
            >
              {t('nav.news')}
            </a>
            <a 
              href="#faq" 
              onClick={(e) => {
                e.preventDefault();
                onPageSelect(null);
                handleLinkClick(e, 'faq');
              }} 
              className="hover:text-white transition-colors"
            >
              {t('nav.faq')}
            </a>
            
            {isAdmin && showBackofficeBtn ? (
              <button
                onClick={() => {
                  setMobileMenuOpen(false);
                  onOpenBackoffice();
                }}
                className="px-6 py-2 bg-rose-500/10 border border-rose-500/30 text-rose-400 font-bold uppercase rounded-xl tracking-wider cursor-pointer"
              >
                {t('nav.admin_panel')}
              </button>
            ) : currentUser ? (
              <div className="flex flex-col items-center gap-2">
                <span className="text-xs text-zinc-500 font-mono">Ligado como: {currentUser.email}</span>
                <button
                  onClick={handleLogout}
                  className="px-5 py-2 text-xs font-semibold uppercase tracking-wider text-white border border-zinc-800 rounded-full bg-zinc-900 cursor-pointer"
                >
                  {t('nav.logout')}
                </button>
              </div>
            ) : (
              <button
                onClick={() => {
                  setMobileMenuOpen(false);
                  onOpenAuth();
                }}
                className="px-6 py-2.5 bg-gradient-to-r from-[#38bdf8] to-[#f97316] text-white font-bold tracking-widest uppercase rounded-full cursor-pointer"
              >
                {t('nav.sign_in')}
              </button>
            )}

            <a 
              href="mailto:suporte@irunbets.pt"
              className="px-6 py-2.5 text-xs font-semibold uppercase tracking-widest text-[#00f2fe] border border-cyan-500/30 rounded-full bg-cyan-500/5 hover:bg-cyan-500/10 transition-all duration-300 flex items-center gap-1.5 mt-2 font-mono"
            >
              <span>{t('nav.support')} ({language.toUpperCase()})</span>
            </a>

            {/* Mobile Language Selector switcher list */}
            <div className="flex items-center gap-1.5 bg-zinc-950/50 p-1.5 rounded-xl border border-zinc-900/60 mt-4">
              {(['pt', 'en', 'fr', 'it', 'de'] as Language[]).map((lang) => (
                <button
                  key={lang}
                  onClick={() => {
                    setLanguage(lang);
                  }}
                  className={`px-2.5 py-1.5 text-xs rounded-lg font-mono font-bold cursor-pointer transition-all ${language === lang ? 'bg-orange-500/20 text-orange-400 border border-orange-500/30' : 'text-zinc-500 hover:text-zinc-300'}`}
                >
                  {lang === 'pt' ? 'PT' : lang === 'en' ? 'EN' : lang === 'fr' ? 'FR' : lang === 'it' ? 'IT' : 'DE'}
                </button>
              ))}
            </div>
          </div>
      </div>
    </>
  );
};

export default Navbar;
