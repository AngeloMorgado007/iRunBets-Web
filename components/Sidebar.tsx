import React, { useState, useEffect } from 'react';
import { CustomPage, onAuthStatusChange, getSubscribersConfig } from '../services/firebase';
import { useLanguage } from '../services/LanguageContext';

interface SidebarProps {
  isOpen: boolean;
  onClose: () => void;
  customPages: CustomPage[];
  selectedPage: CustomPage | null;
  onPageSelect: (page: CustomPage | null) => void;
  onNavClick: (e: React.MouseEvent<HTMLAnchorElement>, targetId: string) => void;
}

const Sidebar: React.FC<SidebarProps> = ({
  isOpen,
  onClose,
  customPages,
  selectedPage,
  onPageSelect,
  onNavClick
}) => {
  const { language, t } = useLanguage();

  const translatePageTitle = (title: string, slug: string, lang: string): string => {
    if (lang === 'pt') return title;
    const slugLower = slug.toLowerCase();
    if (slugLower === 'clube-vip') {
      if (lang === 'fr') return 'Club VIP iRunBets';
      if (lang === 'it') return 'Club VIP iRunBets';
      if (lang === 'de') return 'iRunBets VIP-Club';
      return 'iRunBets VIP Club';
    }
    if (slugLower === 'vip-dashboard') {
      if (lang === 'fr') return 'Tableau de Bord';
      if (lang === 'it') return 'Pannello di Controllo';
      if (lang === 'de') return 'Dashboard';
      return 'Dashboard';
    }
    
    const titleUpper = title.toUpperCase();
    if (titleUpper.includes('REGISTO DE APOSTAS') || titleUpper.includes('REGISTO') || slugLower.includes('registo')) {
      if (lang === 'fr') return 'REGISTRE DE PARIS';
      if (lang === 'it') return 'REGISTRO DI SCOMMESSE';
      if (lang === 'de') return 'WETTSCHEINE';
      return 'BET LOG';
    }
    
    return title;
  };

  const [purifierExpanded, setPurifierExpanded] = useState(false);
  const [currentUser, setCurrentUser] = useState<any>(null);
  const [isAdmin, setIsAdmin] = useState(false);
  const [isPaid, setIsPaid] = useState(false);
  const [isMundialActive, setIsMundialActive] = useState<boolean>(false);
  const [activeVipTab, setActiveVipTab] = useState<string>('');
  const [activeVipSubTab, setActiveVipSubTab] = useState<string>('');

  useEffect(() => {
    const checkVipState = () => {
      setActiveVipTab(localStorage.getItem('irunbets_vip_active_tab') || '');
      setActiveVipSubTab(localStorage.getItem('irunbets_vip_ia_subtab') || '');
    };
    checkVipState();
    window.addEventListener('storage', checkVipState);
    const interval = setInterval(checkVipState, 1000);
    return () => {
      window.removeEventListener('storage', checkVipState);
      clearInterval(interval);
    };
  }, []);

  useEffect(() => {
    const checkMundialCampaign = () => {
      try {
        const config = getSubscribersConfig();
        setIsMundialActive(!!config.isMundialActive);
      } catch (err) {
        console.warn('Erro ao carregar Campanha do Mundial no Sidebar:', err);
      }
    };
    checkMundialCampaign();
    const intervalId = setInterval(checkMundialCampaign, 2000);
    return () => clearInterval(intervalId);
  }, []);

  useEffect(() => {
    const unsubscribe = onAuthStatusChange((user, checkAdmin) => {
      setCurrentUser(user);
      setIsAdmin(checkAdmin);
    });

    const checkPaidStatus = () => {
      const paid = localStorage.getItem('irunbets_vip_paid') === 'true' || currentUser?.email === '1982veramorgado@gmail.com';
      setIsPaid(paid);
    };

    checkPaidStatus();
    window.addEventListener('storage', checkPaidStatus);
    const interval = setInterval(checkPaidStatus, 1000);

    return () => {
      unsubscribe();
      window.removeEventListener('storage', checkPaidStatus);
      clearInterval(interval);
    };
  }, []);

  // Auto-expand if the current URL hash is #purificador or #radar
  useEffect(() => {
    const handleHashCheck = () => {
      const hash = window.location.hash;
      if (hash === '#purificador' || hash === '#radar') {
        setPurifierExpanded(true);
      }
    };
    handleHashCheck();
    window.addEventListener('hashchange', handleHashCheck);
    return () => window.removeEventListener('hashchange', handleHashCheck);
  }, []);

  const handleLinkClick = (e: React.MouseEvent<HTMLAnchorElement>, targetId: string) => {
    onPageSelect(null); // Return to home page for anchors
    onNavClick(e, targetId);
    onClose(); // Close sidebar on mobile/desktop
  };

  const handlePageClick = (page: CustomPage) => {
    onPageSelect(page);
    onClose();
  };

  const handleCustomSlugClick = (e: React.MouseEvent, slug: string) => {
    e.preventDefault();
    const page = customPages.find(p => p.slug === slug);
    if (page) {
      onPageSelect(page);
    } else {
      onPageSelect({
        id: slug,
        slug: slug,
        title: slug === 'purificador-radar' 
          ? 'Purificador & Radar' 
          : slug === 'noticias' 
            ? 'Últimas Notícias' 
            : 'Perguntas Frequentes (FAQ)',
        description: 'Página personalizada',
        createdAt: new Date().toISOString(),
        blocks: []
      });
    }
    window.scrollTo({ top: 0, behavior: 'instant' });
    onClose();
  };

  const handleDirectToolClick = (e: React.MouseEvent<HTMLAnchorElement>, toolType: 'mentor' | 'purificador' | 'radar') => {
    e.preventDefault();

    const hasAccess = !!currentUser && (isAdmin || isPaid || isMundialActive);
    const vipDashboardPage = customPages.find(p => p.slug === 'vip-dashboard');

    if (hasAccess && vipDashboardPage) {
      let targetTab: 'analise-ia' | 'favoritos' = 'analise-ia';
      let targetSubTab: 'comportamental' | 'estimativas' = 'comportamental';

      if (toolType === 'mentor') {
        targetTab = 'analise-ia';
        targetSubTab = 'comportamental';
      } else if (toolType === 'purificador') {
        targetTab = 'analise-ia';
        targetSubTab = 'estimativas';
      } else if (toolType === 'radar') {
        targetTab = 'favoritos';
      }

      localStorage.setItem('irunbets_vip_active_tab', targetTab);
      if (toolType === 'mentor' || toolType === 'purificador') {
        localStorage.setItem('irunbets_vip_ia_subtab', targetSubTab);
      }

      onPageSelect(vipDashboardPage);
      window.scrollTo({ top: 0, behavior: 'instant' });

      // Dispatch a custom event to notify VipDashboard in case it's already mounted!
      const event = new CustomEvent('vip_tab_change', {
        detail: { tab: targetTab, subTab: targetSubTab }
      });
      window.dispatchEvent(event);

      onClose();
    } else {
      // No access / Not logged in -> Go to home page sections
      if (toolType === 'purificador') {
        onPageSelect(null);
        onNavClick(e, 'purificador');
      } else if (toolType === 'radar') {
        onPageSelect(null);
        onNavClick(e, 'radar');
      } else {
        // Mentor discipline -> open dashboard mentor tab directly
        localStorage.setItem('irunbets_vip_active_tab', 'analise-ia');
        localStorage.setItem('irunbets_vip_ia_subtab', 'comportamental');
        const dashPage = customPages.find(p => p.slug === 'vip-dashboard') || {
          id: 'vip-dashboard',
          slug: 'vip-dashboard',
          title: 'Dashboard',
          description: 'Registo de Apostas Desportivas, Gestão de Banca e IA de Análise de Jogos',
          createdAt: new Date().toISOString(),
          blocks: []
        };
        onPageSelect(dashPage);
        window.location.hash = '#mentor';
        window.scrollTo({ top: 0, behavior: 'instant' });
      }
      onClose();
    }
  };

  return (
    <>
      {/* Backdrop blur overlay */}
      <div 
        onClick={onClose}
        className={`fixed inset-0 bg-[#060608]/80 backdrop-blur-sm z-50 transition-opacity duration-300 ${
          isOpen ? 'opacity-100 pointer-events-auto' : 'opacity-0 pointer-events-none'
        }`}
      />

      {/* Sidebar Panel - Slightly transparent with backdrop blur */}
      <aside
        className={`fixed top-0 left-0 bottom-0 w-80 bg-[#0A0A0E]/85 backdrop-blur-md border-r border-zinc-800/60 z-50 flex flex-col p-6 shadow-2xl shadow-black/80 transition-transform duration-300 ease-out font-sans ${
          isOpen ? 'translate-x-0' : '-translate-x-full'
        }`}
      >
        {/* Sidebar Header */}
        <div className="flex items-center justify-between border-b border-zinc-850 pb-5 mb-6">
          <div className="flex items-center gap-2">
            <div className="w-7 h-7 rounded-lg bg-gradient-to-tr from-[#38bdf8] to-[#f97316] p-[1.5px]">
              <div className="w-full h-full bg-[#0A0A0C] rounded-md flex items-center justify-center">
                <span className="text-white font-bold text-[10px]">iR</span>
              </div>
            </div>
            <span className="text-lg font-black text-white uppercase tracking-tight font-display">
              iRun<span className="bg-clip-text text-transparent bg-gradient-to-r from-orange-500 to-amber-500 font-extrabold">Bets</span>
            </span>
          </div>

          <button
            onClick={onClose}
            className="p-1 px-2.5 rounded-lg border border-zinc-850 hover:border-zinc-800 bg-zinc-900/60 text-zinc-400 hover:text-white transition-all text-xs"
            aria-label={
              language === 'pt' ? 'Fechar Menu' :
              language === 'fr' ? 'Fermer le menu' :
              language === 'it' ? 'Chiudi menu' :
              language === 'de' ? 'Menü schließen' :
              'Close Menu'
            }
          >
            ✕
          </button>
        </div>

        {/* Scrollable Navigation Sections */}
        <div className="flex-1 overflow-y-auto space-y-7 pr-1 scrollbar-thin">
          
          {/* Main Directory */}
          <div className="space-y-2.5">
            <span className="text-[10px] uppercase font-bold tracking-widest text-zinc-500 font-mono block pl-2 mb-1">
              {language === 'pt' ? 'Painel Principal' :
               language === 'fr' ? 'Tableau de Bord' :
               language === 'it' ? 'Pannello Principale' :
               language === 'de' ? 'Hauptübersicht' :
               'Main Dashboard'}
            </span>
            
            <a
              href="#hero"
              onClick={(e) => handleLinkClick(e, '')}
              className={`flex items-center gap-2 px-3 py-2.5 rounded-xl text-xs font-semibold tracking-wide transition-all ${
                !selectedPage && !window.location.hash ? 'bg-zinc-900 text-white font-bold border-l-2 border-orange-500' : 'text-zinc-400 hover:text-white hover:bg-zinc-950/40'
              }`}
            >
              <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.8} stroke="currentColor" className="w-4 h-4">
                <path strokeLinecap="round" strokeLinejoin="round" d="m2.25 12 8.954-8.955c.44-.439 1.152-.439 1.591 0L21.75 12M4.5 9.75v10.125c0 .621.504 1.125 1.125 1.125H9.75v-4.875c0-.621.504-1.125 1.125-1.125h2.25c.621 0 1.125.504 1.125 1.125V21h4.125c.621 0 1.125-.504 1.125-1.125V9.75M8.25 21h8.25" />
              </svg>
              <span>
                {language === 'pt' ? 'Início da App' :
                 language === 'fr' ? "Accueil de l'App" :
                 language === 'it' ? "Home dell'Applicazione" :
                 language === 'de' ? 'Startseite' :
                 'App Home'}
              </span>
            </a>
          </div>

          {/* Tools with Subpage Nesting Action */}
          <div className="space-y-2.5">
            <span className="text-[10px] uppercase font-bold tracking-widest text-zinc-500 font-mono block pl-2 mb-1">
              {language === 'pt' ? 'Ferramentas de Análise' :
               language === 'fr' ? 'Outils d\'Analyse' :
               language === 'it' ? 'Strumenti di Analisi' :
               language === 'de' ? 'Analyse-Tools' :
               'Analytical Tools'}
            </span>

            <div className="space-y-1">
              {/* Prognósticos de Futebol */}
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
                  window.scrollTo({ top: 0, behavior: 'instant' });
                  onClose();
                }}
                className={`flex items-center gap-2 px-3 py-2.5 rounded-xl text-xs font-semibold tracking-wide transition-all ${
                  (selectedPage?.slug === 'prognosticos-futebol' || selectedPage?.slug === 'prognosticos') && !window.location.hash.includes('apostas-do-dia')
                    ? 'bg-orange-500/15 text-orange-400 font-bold border-l-2 border-orange-500' 
                    : 'text-zinc-400 hover:text-white hover:bg-zinc-950/40'
                }`}
              >
                <span className="text-sm select-none">⚽</span>
                <span>Prognósticos de Futebol</span>
              </a>

              {/* Apostas do Dia Subpage */}
              <a
                href="#apostas-do-dia"
                onClick={(e) => {
                  e.preventDefault();
                  const existingPage = customPages.find(p => p.slug === 'prognosticos-futebol' || p.slug === 'prognosticos');
                  const progPage = existingPage || {
                    id: 'prognosticos-futebol',
                    slug: 'prognosticos-futebol',
                    title: 'Apostas do Dia',
                    description: 'Tickets de Apostas de Elite (#1 a #5) e Simulador IA',
                    createdAt: new Date().toISOString(),
                    blocks: []
                  };
                  onPageSelect(progPage);
                  window.location.hash = '#apostas-do-dia';
                  window.scrollTo({ top: 0, behavior: 'instant' });
                  onClose();
                }}
                className={`flex items-center gap-2 px-3 py-2.5 rounded-xl text-xs font-semibold tracking-wide transition-all ${
                  window.location.hash.includes('apostas-do-dia')
                    ? 'bg-gradient-to-r from-orange-500/20 to-amber-500/20 text-orange-300 font-bold border-l-2 border-orange-500' 
                    : 'text-zinc-400 hover:text-white hover:bg-zinc-950/40'
                }`}
              >
                <span className="text-sm select-none">🎯</span>
                <span className="flex-1">Apostas do Dia</span>
                <span className="text-[9px] font-mono px-1.5 py-0.5 rounded bg-orange-500/20 text-orange-400 border border-orange-500/30 font-black">
                  3 Quadros
                </span>
              </a>

              {/* Dashboard VIP Link */}
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
                  onClose();
                }}
                className={`flex items-center gap-2 px-3 py-2.5 rounded-xl text-xs font-semibold tracking-wide transition-all ${
                  selectedPage?.slug === 'vip-dashboard' || selectedPage?.slug === 'dashboard'
                    ? 'bg-[#00f2fe]/15 text-[#00f2fe] font-bold border-l-2 border-[#00f2fe]' 
                    : 'text-zinc-400 hover:text-white hover:bg-zinc-950/40'
                }`}
              >
                <span className="text-sm select-none">📊</span>
                <span className="flex-1">
                  {language === 'pt' ? 'Dashboard & Gestão de Banca' :
                   language === 'fr' ? 'Tableau de Bord & Bankroll' :
                   language === 'it' ? 'Dashboard & Gestione Cassa' :
                    language === 'de' ? 'Dashboard & Bankroll-Plan' :
                    'Dashboard & Bankroll'}
                </span>
                {!currentUser && !isAdmin && (
                  <span className="text-[10px] text-amber-400 font-mono" title="Exclusivo para utilizadores registados">🔒</span>
                )}
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
                  onClose();
                }}
                className={`flex items-center gap-2 px-3 py-2.5 rounded-xl text-xs font-semibold tracking-wide transition-all ${
                  selectedPage?.slug === 'dados-estatisticos'
                    ? 'bg-emerald-500/15 text-emerald-400 font-bold border-l-2 border-emerald-400' 
                    : 'text-zinc-400 hover:text-white hover:bg-zinc-950/40'
                }`}
              >
                <span className="text-sm select-none">📑</span>
                <span>Dados Estatísticos (Excel & API)</span>
              </a>

              {/* Mentor de Disciplina Link */}
              <a
                href="#mentor"
                onClick={(e) => handleDirectToolClick(e, 'mentor')}
                className={`flex items-center gap-2 px-3 py-2.5 rounded-xl text-xs font-semibold tracking-wide transition-all ${
                  selectedPage?.slug === 'vip-dashboard' && activeVipTab === 'analise-ia' && activeVipSubTab === 'comportamental'
                    ? 'bg-rose-500/10 text-rose-400 font-bold border-l-2 border-rose-500' 
                    : 'text-zinc-400 hover:text-white hover:bg-zinc-950/40'
                }`}
              >
                <span className="text-sm select-none">🧠</span>
                <span>
                  {language === 'pt' ? 'Mentor de Disciplina' :
                   language === 'fr' ? 'Mentor de Discipline' :
                   language === 'it' ? 'Mentore di Disciplina' :
                   language === 'de' ? 'Disziplin-Mentor' :
                   'Discipline Mentor'}
                </span>
              </a>

              {/* Purificador de Odds & Radar de Favoritas Link */}
              <a
                href="#purificador-radar"
                onClick={(e) => handleCustomSlugClick(e, 'purificador-radar')}
                className={`flex items-center gap-2 px-3 py-2.5 rounded-xl text-xs font-semibold tracking-wide transition-all ${
                  selectedPage?.slug === 'purificador-radar'
                    ? 'bg-gradient-to-r from-orange-500/20 to-amber-500/20 text-orange-400 font-bold border-l-2 border-orange-500' 
                    : 'text-zinc-400 hover:text-white hover:bg-zinc-950/40'
                }`}
              >
                <span className="text-sm select-none">📈</span>
                <span>
                  {language === 'pt' ? 'Purificador & Radar' :
                   language === 'fr' ? 'Purificateur & Radar' :
                   language === 'it' ? 'Purificatore & Radar' :
                   language === 'de' ? 'Purifier & Radar' :
                   'Purifier & Radar'}
                </span>
              </a>
            </div>
          </div>

          {/* Custom VIP Channels Section (Subpages Sidebar) */}
          <div className="space-y-2.5">
            <span className="text-[10px] uppercase font-bold tracking-widest text-[#00f2fe] font-mono block pl-2 mb-1">
              {language === 'pt' ? 'Canais & Páginas VIP' :
               language === 'fr' ? 'Canaux & Pages VIP' :
               language === 'it' ? 'Canali & Pagine VIP' :
               language === 'de' ? 'VIP-Kanäle & Seiten' :
               'VIP Channels & Pages'}
            </span>

            {customPages.filter((page) => !page.isSubpage && !page.hidden).length === 0 ? (
              <div className="text-[11px] text-zinc-650 font-mono pl-3 py-1 italic block select-none">
                {language === 'pt' ? 'Nenhum canal ativo para já.' :
                 language === 'fr' ? 'Aucun canal actif pour le moment.' :
                 language === 'it' ? 'Nessun canale attivo per ora.' :
                 language === 'de' ? 'Derzeit keine aktiven Kanäle.' :
                 'No active channels for now.'}
              </div>
            ) : (
              <div className="space-y-1">
                {customPages
                  .filter((p) => !p.isSubpage && !p.hidden && !['purificador-radar', 'noticias', 'faq', 'clube-vip', 'dashboard-tipster', 'vip-dashboard'].includes(p.slug))
                  .map((page) => {
                    // Check if this page has child subpages
                    const childSubpages = customPages.filter(p => {
                      if (p.isSubpage && p.parentSlug === page.slug && !p.hidden) {
                        return true;
                      }
                      return false;
                    });
                    
                    return (
                      <div key={page.slug} className="space-y-1">
                        <button
                          onClick={() => handlePageClick(page)}
                          className={`w-full text-left flex items-center gap-2.5 px-3 py-2.5 rounded-xl text-xs font-semibold tracking-wide transition-all ${
                            selectedPage?.slug === page.slug
                              ? 'bg-[#00f2fe]/10 text-[#00f2fe] border-l-2 border-[#00f2fe]'
                              : 'text-zinc-400 hover:text-white hover:bg-zinc-950/40'
                          }`}
                        >
                          <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.8} stroke="currentColor" className="w-4 h-4 text-sky-400 opacity-80">
                            <path strokeLinecap="round" strokeLinejoin="round" d="M11.48 3.499c-.105-.21-.327-.34-.56-.34H8.75c-.328 0-.616.197-.733.504l-2.25 5.86c-.156.406-.113.864.113 1.233L7.75 13.5h3.04l-.81 3.522a.5.5 0 0 0 .848.455l6.5-6.502a.5.5 0 0 0-.353-.853L13.5 10.12h3.02l-2.43-5.32a.499.499 0 0 0-.85-.1z" />
                          </svg>
                          <span className="truncate">{translatePageTitle(page.title, page.slug, language)}</span>
                        </button>

                        {/* If it has child pages, print those cleanly with indentation */}
                        {childSubpages.length > 0 && (
                          <div className="pl-6 space-y-1 border-l border-zinc-850/60 ml-4 mb-2">
                            {childSubpages.map(child => (
                              <button
                                key={child.slug}
                                onClick={() => handlePageClick(child)}
                                className={`w-full text-left flex items-center gap-2 px-3 py-1.5 rounded-lg text-[11px] font-medium transition-all ${
                                  selectedPage?.slug === child.slug
                                    ? 'text-[#00f2fe] bg-[#00f2fe]/5 font-bold'
                                    : 'text-zinc-500 hover:text-zinc-350'
                                }`}
                              >
                                <span className="text-[#00f2fe]/60 text-[10px]">↳</span>
                                <span className="truncate">{translatePageTitle(child.title, child.slug, language)}</span>
                              </button>
                            ))}
                          </div>
                        )}
                      </div>
                    );
                  })}
              </div>
            )}
          </div>

          {/* Extras / Support */}
          <div className="space-y-2.5">
            <span className="text-[10px] uppercase font-bold tracking-widest text-zinc-500 font-mono block pl-2 mb-1">
              {language === 'pt' ? 'Informação & Artigos' :
               language === 'fr' ? 'Informations & Articles' :
               language === 'it' ? 'Informazioni & Articoli' :
               language === 'de' ? 'Infos & Artikel' :
               'Info & Articles'}
            </span>

            <div className="space-y-1">
              <a
                href="#noticias"
                onClick={(e) => handleCustomSlugClick(e, 'noticias')}
                className={`flex items-center gap-2 px-3 py-2.5 rounded-xl text-xs font-semibold tracking-wide transition-all ${
                  selectedPage?.slug === 'noticias' ? 'bg-[#00f2fe]/10 text-[#00f2fe] font-bold border-l-2 border-[#00f2fe]' : 'text-zinc-400 hover:text-white hover:bg-zinc-950/40'
                }`}
              >
                <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.8} stroke="currentColor" className="w-4 h-4">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M12 7.5h1.5m-1.5 3h1.5m-7.5 3h7.5m-7.5 3h7.5m3-9h3.375c.621 0 1.125.504 1.125 1.125V18a2.25 2.25 0 0 1-2.25 a2.25h-15a2.25 2.25 0 0 1-2.25-2.25V6.75m19.5 0A2.25 2.25 0 0 0 19.5 4.5h-15a2.25 2.25 0 0 0-2.25 2.25m19.5 0v.243a2.25 2.25 0 0 1-1.07 1.916l-7.5 4.615a2.25 2.25 0 0 1-2.36 0L3.32 8.91a2.25 2.25 0 0 1-1.07-1.916V6.75" />
                </svg>
                <span>
                  {language === 'pt' ? 'Últimas Notícias' :
                   language === 'fr' ? 'Dernières Actualités' :
                   language === 'it' ? 'Ultime Notizie' :
                   language === 'de' ? 'Aktuelle News' :
                   'Latest News'}
                </span>
              </a>

              <a
                href="#faq"
                onClick={(e) => handleCustomSlugClick(e, 'faq')}
                className={`flex items-center gap-2 px-3 py-2.5 rounded-xl text-xs font-semibold tracking-wide transition-all ${
                  selectedPage?.slug === 'faq' ? 'bg-[#00f2fe]/10 text-[#00f2fe] font-bold border-l-2 border-[#00f2fe]' : 'text-zinc-400 hover:text-white hover:bg-zinc-950/40'
                }`}
              >
                <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.8} stroke="currentColor" className="w-4 h-4">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M18 10.5h.008v.008H18V10.5Zm-3 0h.008v.008H15V10.5Zm-3 0h.008v.008H12V10.5Zm-3 0h.008v.008H9V10.5Zm-3 0h.008v.008H6V10.5Zm-3 0h.008v.008H3V10.5ZM12 3v18m0-18h.008v.008H12V3Zm0 18h.008v.008H12V21ZM3 12h18m-18 0h.008v.008H3v-.008Zm18 0h.008v.008H21v-.008Z" />
                </svg>
                <span>
                  {language === 'pt' ? 'Perguntas Frequentes' :
                   language === 'fr' ? 'Questions Fréquentes (FAQ)' :
                   language === 'it' ? 'Domande Frequenti (FAQ)' :
                   language === 'de' ? 'Häufige Fragen (FAQ)' :
                   'Frequently Asked Questions'}
                </span>
              </a>
            </div>
          </div>

        </div>

        {/* Sidebar Footer Support Contact */}
        <div className="border-t border-zinc-850 pt-5 mt-4 space-y-3.5">
          <a
            href="mailto:suporte@irunbets.pt"
            className="flex items-center justify-center gap-2 py-3 rounded-xl border border-zinc-850 bg-zinc-900/40 hover:bg-zinc-900 text-xs font-semibold text-zinc-400 hover:text-orange-500 transition-all font-mono"
          >
            <span>
              {language === 'pt' ? '✉ Apoio ao Cliente' :
               language === 'fr' ? '✉ Service Clientèle' :
               language === 'it' ? '✉ Assistenza Clienti' :
               language === 'de' ? '✉ Kundenservice' :
               '✉ Customer Support'}
            </span>
          </a>
          <p className="text-center text-[9px] text-zinc-650 font-mono tracking-tight select-none">
            © 2026 iRunBets.pt • {language === 'pt' ? 'Algoritmo Geral' :
                                   language === 'fr' ? 'Algorithme Général' :
                                   language === 'it' ? 'Algoritmo Generale' :
                                   language === 'de' ? 'Allgemeiner Algorithmus' :
                                   'General Algorithm'}
          </p>
        </div>
      </aside>
    </>
  );
};

export default Sidebar;
