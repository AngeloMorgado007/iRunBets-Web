/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect, useMemo, useRef } from 'react';
import Navbar from './components/Navbar';
import Sidebar from './components/Sidebar';
import Hero from './components/Hero';
import { TopBannersSlider } from './components/TopBannersSlider';
import PlatformPillars from './components/PlatformPillars';
import InterfaceExplore from './components/InterfaceExplore';
import Purifier from './components/Purifier';
import FavoriteRadar from './components/FavoriteRadar';
import PushSimulator from './components/PushSimulator';
import LatestNews from './components/LatestNews';
import FAQ from './components/FAQ';
import Assistant from './components/Assistant';
import Footer from './components/Footer';
import AuthModal from './components/AuthModal';
import Backoffice from './components/Backoffice';
import DynamicCustomPageView from './components/DynamicCustomPageView';
import FloatingPushNotifier from './components/FloatingPushNotifier';
import { PromotionalPopup } from './components/PromotionalPopup';
import { onAuthStatusChange, getCustomPages, CustomPage, getSubscriber, incrementVisitorCount, pingPresence, getTrafficStats, getTrafficHistory, TrafficStats, DailyTraffic, FeaturedMultiple, getMarketingAnalysesFromFirebase, saveMarketingAnalysesToFirebase } from './services/firebase';
import { useLanguage } from './services/LanguageContext';

function App() {
  const { language } = useLanguage();
  
  // Increment visitor counter on mount (independent of registration status) and establish live presence pings
  useEffect(() => {
    incrementVisitorCount().catch(err => {
      console.warn('Silent visitor counter increment issue:', err);
    });

    const pingInterval = setInterval(() => {
      pingPresence().catch(err => {
        console.warn('Silent presence ping error:', err);
      });
    }, 45 * 1000); // Ping presence database every 45s

    return () => clearInterval(pingInterval);
  }, []);
  // Modal states & view controls
  const [isAuthOpen, setIsAuthOpen] = useState(false);
  const [isBackofficeOpen, setIsBackofficeOpen] = useState(false);
  const [isAdmin, setIsAdmin] = useState(false);
  const [currentUser, setCurrentUser] = useState<any>(null);
  const [simulationAdminMode, setSimulationAdminMode] = useState(false);
  const [newsRefreshTrigger, setNewsRefreshTrigger] = useState(0);
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const [userSubscriptionStatus, setUserSubscriptionStatus] = useState<string>('Gratuito');
  const [marketingAnalyses, setMarketingAnalyses] = useState<any[]>([]);
  const [isMarketingExpanded, setIsMarketingExpanded] = useState(false);
  const [featuredMultiples, setFeaturedMultiples] = useState<FeaturedMultiple[]>([]);
  const [selectedMultipleImage, setSelectedMultipleImage] = useState<FeaturedMultiple | null>(null);

  // Helper algorithm to determine if a multiple bet slip is expired
  const isMultipleExpired = (item: FeaturedMultiple): boolean => {
    if (item.autoExpireEnabled === false) return false; // explicitly configured as permanent

    const now = Date.now();

    // 1. Check explicit ISO/Datetime expiration
    if (item.expiresAt) {
      const expTime = new Date(item.expiresAt).getTime();
      if (!isNaN(expTime)) {
        return expTime <= now;
      }
    }

    // 2. Check customDate string (e.g. "23/06/26", "23/06/2026", "2026-06-23")
    if (item.customDate) {
      const cd = item.customDate.trim();
      let year: number | null = null;
      let month: number | null = null;
      let day: number | null = null;

      if (cd.includes('-')) {
        const parts = cd.split('T')[0].split('-');
        if (parts.length === 3) {
          year = parseInt(parts[0], 10);
          month = parseInt(parts[1], 10) - 1;
          day = parseInt(parts[2], 10);
        }
      } else if (cd.includes('/')) {
        const parts = cd.split('/');
        if (parts.length >= 2) {
          day = parseInt(parts[0], 10);
          month = parseInt(parts[1], 10) - 1;
          if (parts.length >= 3) {
            let yStr = parts[2].trim();
            if (yStr.length === 2) yStr = '20' + yStr;
            year = parseInt(yStr, 10);
          } else {
            year = new Date().getFullYear();
          }
        }
      }

      if (year !== null && month !== null && day !== null && !isNaN(year) && !isNaN(month) && !isNaN(day)) {
        // End of that custom date (23:59:59)
        const endOfDay = new Date(year, month, day, 23, 59, 59, 999).getTime();
        if (endOfDay < now) {
          return true;
        }
      }
    }

    // 3. Fallback to createdAt if older than midnight of its creation day
    if (item.createdAt) {
      const createdTime = new Date(item.createdAt).getTime();
      if (!isNaN(createdTime)) {
        const endOfCreationDay = new Date(createdTime);
        endOfCreationDay.setHours(23, 59, 59, 999);
        if (endOfCreationDay.getTime() < now) {
          return true;
        }
      }
    }

    return false;
  };

  // Auto-cleanup algorithm for public site: filter out expired multiples
  const activeFeaturedMultiples = useMemo(() => {
    return featuredMultiples.filter((item) => !isMultipleExpired(item));
  }, [featuredMultiples]);
  const [deletingAnalysisId, setDeletingAnalysisId] = useState<string | null>(null);
  const [toast, setToast] = useState<{ message: string; type: 'success' | 'info' | 'error' } | null>(null);

  // Helper to trigger safe custom toasts
  const showToast = (message: string, type: 'success' | 'info' | 'error' = 'success') => {
    setToast({ message, type });
    setTimeout(() => {
      setToast(null);
    }, 4000);
  };

  // Dynamic pages state
  const [customPages, setCustomPages] = useState<CustomPage[]>([]);
  const [selectedCustomPage, setSelectedCustomPage] = useState<CustomPage | null>(null);

  // Real-time Traffic and Visits Evolution States
  const [trafficStats, setTrafficStats] = useState<TrafficStats | null>(null);
  const [trafficHistory, setTrafficHistory] = useState<DailyTraffic[]>([]);
  const [isTrafficModalOpen, setIsTrafficModalOpen] = useState(false);
  const [activeHistoryRange, setActiveHistoryRange] = useState<14 | 7>(14);

  // Fetch real-time active users and overview traffic stats (Online Agora)
  useEffect(() => {
    const fetchStats = async () => {
      try {
        const stats = await getTrafficStats();
        setTrafficStats(stats);
      } catch (err) {
        console.warn('Error fetching traffic stats in App.tsx:', err);
      }
    };
    fetchStats();
    
    // Setup 15-second recursive polling for highly responsive real-time active users tracking
    const intervalId = setInterval(fetchStats, 15000);
    return () => clearInterval(intervalId);
  }, []);

  // Fetch complete statistical daily traffic history whenever the modal gets triggered/drawn
  useEffect(() => {
    if (isTrafficModalOpen) {
      const fetchHistory = async () => {
        try {
          const hist = await getTrafficHistory();
          setTrafficHistory(hist);
        } catch (err) {
          console.warn('Error fetching traffic history in App.tsx:', err);
        }
      };
      fetchHistory();
    }
  }, [isTrafficModalOpen]);

  const [homepageTipsters, setHomepageTipsters] = useState<any[]>(() => {
    const stored = localStorage.getItem('irunbets_rede_tipsters');
    if (stored) {
      try {
        const parsed = JSON.parse(stored);
        if (Array.isArray(parsed)) {
          const filtered = parsed.filter(t => t.id !== 'morgado' && t.id !== 'pedro' && t.id !== 'sara');
          if (parsed.length !== filtered.length) {
            localStorage.setItem('irunbets_rede_tipsters', JSON.stringify(filtered));
          }
          return filtered;
        }
      } catch (e) {
        console.error(e);
      }
    }
    return [];
  });

  useEffect(() => {
    const handleTipstersSync = () => {
      const stored = localStorage.getItem('irunbets_rede_tipsters');
      if (stored) {
        try {
          const parsed = JSON.parse(stored);
          if (Array.isArray(parsed)) {
            const filtered = parsed.filter(t => t.id !== 'morgado' && t.id !== 'pedro' && t.id !== 'sara');
            setHomepageTipsters(filtered);
            return;
          }
        } catch (e) {}
      }
      setHomepageTipsters([]);
    };
    window.addEventListener('irunbets_tipsters_updated', handleTipstersSync);
    window.addEventListener('storage', handleTipstersSync);
    return () => {
      window.removeEventListener('irunbets_tipsters_updated', handleTipstersSync);
      window.removeEventListener('storage', handleTipstersSync);
    };
  }, []);

  // Sync / monitor marketing feed state from database + localStorage
  useEffect(() => {
    const fetchMarketingAnalyses = async () => {
      const defaultInitial = [
        {
          id: 'seed_1',
          homeTeam: 'Canadá',
          awayTeam: 'Bósnia e Herzegovina',
          league: 'Amigáveis Internacionais',
          recommendedBet: 'Under 2.5 Golos',
          odd: '1.80',
          homeProb: 35.0,
          drawProb: 30.0,
          awayProb: 35.0,
          under35Prob: 75.0,
          status: 'pending',
          createdAt: new Date().toISOString()
        },
        {
          id: 'seed_2',
          homeTeam: 'Portugal',
          awayTeam: 'Croácia',
          league: 'Liga das Nações',
          recommendedBet: 'Under 3.5 Golos',
          odd: '1.45',
          homeProb: 55.0,
          drawProb: 25.0,
          awayProb: 20.0,
          under35Prob: 82.0,
          status: 'green',
          createdAt: new Date(Date.now() - 86400000).toISOString()
        }
      ];

      const remoteList = await getMarketingAnalysesFromFirebase();
      if (remoteList && remoteList.length > 0) {
        setMarketingAnalyses(remoteList);
        localStorage.setItem('irunbets_marketing_analyses', JSON.stringify(remoteList));
        return;
      }

      const stored = localStorage.getItem('irunbets_marketing_analyses');
      if (stored) {
        try {
          const parsed = JSON.parse(stored);
          if (Array.isArray(parsed) && parsed.length > 0) {
            setMarketingAnalyses(parsed);
            return;
          }
        } catch (e) {}
      }

      saveMarketingAnalysesToFirebase(defaultInitial);
      setMarketingAnalyses(defaultInitial);
    };

    fetchMarketingAnalyses();

    window.addEventListener('irunbets_marketing_analyses_updated', fetchMarketingAnalyses);
    window.addEventListener('storage', fetchMarketingAnalyses);
    return () => {
      window.removeEventListener('irunbets_marketing_analyses_updated', fetchMarketingAnalyses);
      window.removeEventListener('storage', fetchMarketingAnalyses);
    };
  }, []);

  // Sync / monitor featured multiples state
  useEffect(() => {
    const fetchFeaturedMultiples = () => {
      const stored = localStorage.getItem('irunbets_featured_multiples');
      if (stored) {
        setFeaturedMultiples(JSON.parse(stored));
      } else {
        const initial = [
          {
            id: 'seed_f1',
            title: '#1',
            imageUrl: 'https://images.unsplash.com/photo-1508098682722-e99c43a406b2?auto=format&fit=crop&w=800&q=80',
            createdAt: new Date().toISOString()
          }
        ];
        localStorage.setItem('irunbets_featured_multiples', JSON.stringify(initial));
        setFeaturedMultiples(initial);
      }
    };

    fetchFeaturedMultiples();

    window.addEventListener('irunbets_multiples_updated', fetchFeaturedMultiples);
    window.addEventListener('storage', fetchFeaturedMultiples);
    return () => {
      window.removeEventListener('irunbets_multiples_updated', fetchFeaturedMultiples);
      window.removeEventListener('storage', fetchFeaturedMultiples);
    };
  }, []);

  const handleUpdateMarketingStatus = (id: string, nextStatus: 'pending' | 'green' | 'red') => {
    const updated = marketingAnalyses.map(item => {
      if (item.id === id) {
        return { ...item, status: nextStatus };
      }
      return item;
    });
    setMarketingAnalyses(updated);
    saveMarketingAnalysesToFirebase(updated);
    showToast(
      language === 'pt'
        ? `Mural atualizado: ${nextStatus === 'green' ? 'GREEN 🟢' : nextStatus === 'red' ? 'RED 🔴' : 'PENDENTE ⏳'}`
        : `Mural updated: ${nextStatus === 'green' ? 'GREEN 🟢' : nextStatus === 'red' ? 'RED 🔴' : 'PENDING ⏳'}`,
      'success'
    );
  };

  const handleDeleteMarketingAnalysis = (id: string) => {
    if (deletingAnalysisId !== id) {
      setDeletingAnalysisId(id);
      showToast(
        language === 'pt' 
          ? '⚠️ CLIQUE NOVAMENTE para confirmar a eliminação definitiva!' 
          : '⚠️ CLICK AGAIN to confirm permanent deletion!',
        'info'
      );
      // Auto-clear after 5 seconds if not clicked again
      setTimeout(() => {
        setDeletingAnalysisId(prev => prev === id ? null : prev);
      }, 5000);
      return;
    }

    const updated = marketingAnalyses.filter(item => item.id !== id);
    setMarketingAnalyses(updated);
    saveMarketingAnalysesToFirebase(updated);
    setDeletingAnalysisId(null);
    showToast(
      language === 'pt' ? 'Análise removida com sucesso do mural 🗑️' : 'Analysis successfully removed from mural 🗑️',
      'success'
    );
  };

  useEffect(() => {
    // Single system status state tracker
    const unsubscribe = onAuthStatusChange(async (user, checkAdmin) => {
      setCurrentUser(user);
      setIsAdmin(checkAdmin);
      if (checkAdmin) {
        setSimulationAdminMode(true);
      }
      // Admin check
      if (!checkAdmin) {
        setIsBackofficeOpen(false);
      }

      if (user) {
        if (user.email === '1982veramorgado@gmail.com') {
          setUserSubscriptionStatus('Subscrição do Tipster (Anual • 287.04€)');
          localStorage.setItem('irunbets_vip_paid', 'true');
          return;
        }
        try {
          const subscriber = await getSubscriber(user.uid);
          if (subscriber) {
            setUserSubscriptionStatus(subscriber.status || 'Gratuito');
            // If they have any status other than Gratuito, they have paid access
            if (subscriber.status && subscriber.status !== 'Gratuito') {
              localStorage.setItem('irunbets_vip_paid', 'true');
            } else {
              localStorage.removeItem('irunbets_vip_paid');
            }
            return;
          }
        } catch (err) {
          console.error('Error fetching subscriber status info:', err);
        }
      }
      setUserSubscriptionStatus('Gratuito');
      localStorage.removeItem('irunbets_vip_paid');
    });
    return () => unsubscribe();
  }, [newsRefreshTrigger]);

  // Fetch custom pages on mount and newsRefreshTrigger
  useEffect(() => {
    const fetchPages = async () => {
      try {
        const list = await getCustomPages();
        setCustomPages(list);
      } catch (err) {
        console.error('Error loading custom pages:', err);
      }
    };
    fetchPages();

    window.addEventListener('irunbets_custom_pages_updated', fetchPages);
    window.addEventListener('storage', fetchPages);
    return () => {
      window.removeEventListener('irunbets_custom_pages_updated', fetchPages);
      window.removeEventListener('storage', fetchPages);
    };
  }, [newsRefreshTrigger]);

  // Auto-detect view=backoffice parameter to launch admin login or open backoffice instantly
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    if (params.get('view') === 'backoffice' || params.get('admin') === 'true') {
      if (!isAdmin) {
        setIsAuthOpen(true);
        showToast(
          language === 'pt' 
            ? 'Aceda com a sua conta de Administrador para abrir o Painel.' 
            : 'Sign in with your Admin account to access the Control Panel.',
          'info'
        );
      } else {
        setIsBackofficeOpen(true);
      }
    }
  }, [isAdmin, language]);

  const lastProcessedHashRef = useRef<string>('');

  const navigateToCustomPage = (page: CustomPage | null) => {
    setSelectedCustomPage(page);
    setIsBackofficeOpen(false);
    if (!page) {
      lastProcessedHashRef.current = '';
      if (window.location.hash) {
        try {
          window.history.pushState(null, '', window.location.pathname + window.location.search);
        } catch (e) {
          window.location.hash = '';
        }
      }
      window.scrollTo({ top: 0, behavior: 'smooth' });
    } else {
      lastProcessedHashRef.current = page.slug;
      if (window.location.hash.replace('#', '') !== page.slug) {
        try {
          window.location.hash = `#${page.slug}`;
        } catch (e) {}
      }
      window.scrollTo({ top: 0, behavior: 'instant' });
    }
  };

  // Hash navigation handler for custom pages (Purificador & Radar, Notícias, FAQ)
  useEffect(() => {
    const handleHashNav = () => {
      const hash = window.location.hash.replace('#', '');
      if (!hash) {
        if (selectedCustomPage) {
          setSelectedCustomPage(null);
        }
        lastProcessedHashRef.current = '';
        return;
      }

      const matchPage = (slug: string, fallbackTitle: string, fallbackDesc: string) => {
        const found = customPages.find(p => p.slug === slug);
        if (found) return found;
        return {
          id: slug,
          slug: slug,
          title: fallbackTitle,
          description: fallbackDesc,
          createdAt: new Date().toISOString(),
          blocks: []
        };
      };

      if (hash === 'prognosticos-futebol' || hash === 'prognosticos') {
        const page = matchPage('prognosticos-futebol', 'Prognósticos de Futebol', 'Análises de futebol e lista de palpites IA com janela pop-up de previsão');
        setSelectedCustomPage(page);
        setIsBackofficeOpen(false);
        if (lastProcessedHashRef.current !== hash) {
          window.scrollTo({ top: 0, behavior: 'instant' });
        }
        lastProcessedHashRef.current = hash;
      } else if (hash === 'dashboard' || hash === 'vip-dashboard' || hash === 'dashboard-vip' || hash === 'painel') {
        const page = matchPage('vip-dashboard', 'Dashboard', 'Registo de Apostas Desportivas, Gestão de Banca e IA de Análise de Jogos');
        setSelectedCustomPage(page);
        setIsBackofficeOpen(false);
        if (lastProcessedHashRef.current !== hash) {
          window.scrollTo({ top: 0, behavior: 'instant' });
        }
        lastProcessedHashRef.current = hash;
      } else if (hash === 'dashboard-tipster' || hash === 'tipster') {
        const page = matchPage('dashboard-tipster', 'Dashboard Tipster', 'Painel do Tipster para registar canais de redes sociais e selecionar casas de apostas parceiras');
        setSelectedCustomPage(page);
        setIsBackofficeOpen(false);
        if (lastProcessedHashRef.current !== hash) {
          window.scrollTo({ top: 0, behavior: 'instant' });
        }
        lastProcessedHashRef.current = hash;
      } else if (hash === 'mentor') {
        const page = matchPage('vip-dashboard', 'Dashboard', 'Registo de Apostas Desportivas, Gestão de Banca e IA de Análise de Jogos');
        localStorage.setItem('irunbets_vip_active_tab', 'analise-ia');
        localStorage.setItem('irunbets_vip_ia_subtab', 'comportamental');
        setSelectedCustomPage(page);
        setIsBackofficeOpen(false);
        if (lastProcessedHashRef.current !== hash) {
          window.scrollTo({ top: 0, behavior: 'instant' });
        }
        lastProcessedHashRef.current = hash;
      } else if (hash === 'purificador-radar' || hash === 'purificador' || hash === 'radar') {
        const page = matchPage('purificador-radar', 'Purificador & Radar de Favoritas', 'Análise estatística de Odds Purificadas +EV e monitorização ativa do Radar de Seleções Favoritas');
        setSelectedCustomPage(page);
        setIsBackofficeOpen(false);
        if (lastProcessedHashRef.current !== hash) {
          window.scrollTo({ top: 0, behavior: 'instant' });
        }
        lastProcessedHashRef.current = hash;
      } else if (hash === 'noticias') {
        const page = matchPage('noticias', 'Últimas Notícias & Artigos', 'Mural oficial de notícias, novidades do algoritmo e tutoriais de apostas desportivas');
        setSelectedCustomPage(page);
        setIsBackofficeOpen(false);
        if (lastProcessedHashRef.current !== hash) {
          window.scrollTo({ top: 0, behavior: 'instant' });
        }
        lastProcessedHashRef.current = hash;
      } else if (hash === 'faq') {
        const page = matchPage('faq', 'Perguntas Frequentes (FAQ)', 'Centro de Ajuda e Dúvidas Frequentes');
        setSelectedCustomPage(page);
        setIsBackofficeOpen(false);
        if (lastProcessedHashRef.current !== hash) {
          window.scrollTo({ top: 0, behavior: 'instant' });
        }
        lastProcessedHashRef.current = hash;
      } else if (hash.startsWith('p/')) {
        const slug = hash.replace('p/', '');
        const page = customPages.find(p => p.slug === slug);
        if (page) {
          setSelectedCustomPage(page);
          setIsBackofficeOpen(false);
          if (lastProcessedHashRef.current !== hash) {
            window.scrollTo({ top: 0, behavior: 'instant' });
          }
          lastProcessedHashRef.current = hash;
        }
      }
    };

    handleHashNav();
    window.addEventListener('hashchange', handleHashNav);
    return () => window.removeEventListener('hashchange', handleHashNav);
  }, [customPages]);

  // Keep active selected custom page content in sync with real-time updates from Firebase Firestore
  useEffect(() => {
    if (selectedCustomPage && customPages.length > 0) {
      const updated = customPages.find(p => p.slug === selectedCustomPage.slug || p.id === selectedCustomPage.id);
      if (updated && (updated.title !== selectedCustomPage.title || JSON.stringify(updated.blocks) !== JSON.stringify(selectedCustomPage.blocks))) {
        setSelectedCustomPage(updated);
      }
    }
  }, [customPages, selectedCustomPage]);

  const handleNavClick = (e: React.MouseEvent<HTMLAnchorElement>, targetId: string) => {
    e.preventDefault();
    setIsBackofficeOpen(false); // Dismiss backoffice and jump directly to anchor on home
    scrollToSection(targetId);
  };

  const scrollToSection = (targetId: string) => {
    if (!targetId) {
        window.scrollTo({ top: 0, behavior: 'smooth' });
        return;
    }
    
    setTimeout(() => {
      const element = document.getElementById(targetId);
      if (element) {
        const headerOffset = 85;
        const elementPosition = element.getBoundingClientRect().top;
        const offsetPosition = elementPosition + window.scrollY - headerOffset;

        window.scrollTo({
          top: offsetPosition,
          behavior: "smooth"
        });

        try {
          window.history.pushState(null, '', `#${targetId}`);
        } catch (err) {
          // Ignore SecurityError in restricted environments
        }
      }
    }, 100);
  };

  const handleNewsChanged = () => {
    setNewsRefreshTrigger(prev => prev + 1);
  };

  const handleAuthSuccess = () => {
    setNewsRefreshTrigger(prev => prev + 1);
  };

  return (
    <div className="min-h-screen bg-[#0A0A0C] font-sans text-zinc-100 selection:bg-orange-500/20 selection:text-white overflow-x-hidden">
      
      {/* Header / Navbar */}
      <Navbar 
        onNavClick={(e, id) => {
          navigateToCustomPage(null); // Clear custom view if clicking standard links
          handleNavClick(e, id);
        }} 
        onOpenAuth={() => setIsAuthOpen(true)}
        onOpenBackoffice={() => {
          setSelectedCustomPage(null);
          setIsBackofficeOpen(true);
          lastProcessedHashRef.current = '';
          if (window.location.hash) {
            try {
              window.history.pushState(null, '', window.location.pathname + window.location.search);
            } catch (e) {
              window.location.hash = '';
            }
          }
          window.scrollTo({ top: 0, behavior: 'smooth' });
        }}
        showBackofficeBtn={isAdmin}
        customPages={customPages}
        selectedPage={selectedCustomPage}
        onPageSelect={(page) => navigateToCustomPage(page)}
        onToggleSidebar={() => setIsSidebarOpen(true)}
      />

      {/* Slide-out Sidebar Drawer Nav */}
      <Sidebar 
        isOpen={isSidebarOpen}
        onClose={() => setIsSidebarOpen(false)}
        customPages={customPages}
        selectedPage={selectedCustomPage}
        onPageSelect={(page) => navigateToCustomPage(page)}
        onNavClick={handleNavClick}
      />
      
      {/* Dynamic Content Views */}
      {isAdmin && isBackofficeOpen ? (
        <Backoffice 
          onClose={() => setIsBackofficeOpen(false)} 
          onNewsChanged={() => {
            handleNewsChanged();
          }}
        />
      ) : selectedCustomPage ? (
        <DynamicCustomPageView 
          page={selectedCustomPage} 
          onBackToHome={() => navigateToCustomPage(null)} 
          userSubscriptionStatus={userSubscriptionStatus}
          onSubscriptionUpdated={handleAuthSuccess}
        />
      ) : (
        <main>
          {/* Banners em Destaque no Início */}
          <TopBannersSlider 
            isAdmin={isAdmin}
            onActionClick={(actionTab) => {
              if (actionTab === 'analise-jogos' || actionTab === 'clube-vip' || actionTab === 'purificador') {
                const vipPage = customPages.find(p => p.slug === 'vip-dashboard') || {
                  id: 'vip-dashboard',
                  slug: 'vip-dashboard',
                  title: 'Dashboard',
                  description: 'Registo de Apostas Desportivas, Gestão de Banca e IA de Análise de Jogos',
                  createdAt: new Date().toISOString(),
                  blocks: []
                };
                localStorage.setItem('irunbets_vip_active_tab', actionTab === 'analise-jogos' ? 'ia-analise' : actionTab === 'purificador' ? 'purificador' : 'dashboard');
                navigateToCustomPage(vipPage);
              } else if (actionTab === 'radar') {
                const el = document.getElementById('radar-section');
                if (el) el.scrollIntoView({ behavior: 'smooth' });
              }
            }}
          />

          {/* Hero Section */}
          <Hero />
          
          {/* Os Três Pilares iRunBets - Temas Ilustrados */}
          <PlatformPillars />

          {/* Interface / Screenshots Showcase Section */}
          <InterfaceExplore />
          
          {/* Secção Simplificada de Atalho para Purificador & Radar */}
          <section id="purificador-radar-teaser" className="py-16 bg-gradient-to-b from-[#0A0A0E] via-zinc-950/80 to-[#0A0A0E] border-y border-zinc-900/80 relative overflow-hidden">
            <div className="max-w-5xl mx-auto px-6 text-center space-y-6">
              <span className="text-[10px] font-black uppercase tracking-wider text-orange-400 bg-orange-500/10 px-3 py-1 rounded-md font-mono border border-orange-500/20">
                ⚡ FERRAMENTAS ANALÍTICAS DEDICADAS
              </span>
              <h2 className="text-2xl sm:text-4xl font-extrabold text-white uppercase tracking-tight font-display">
                PURIFICADOR DE ODDS & RADAR DE FAVORITAS
              </h2>
              <p className="text-xs sm:text-sm text-zinc-400 font-light max-w-xl mx-auto leading-relaxed">
                As ferramentas de análise estatística de Odds +EV e monitorização de equipas favoritas foram movidas para uma subpágina dedicada acessível a partir da barra lateral.
              </p>
              <div className="pt-2">
                <button
                  type="button"
                  onClick={() => {
                    const page = customPages.find(p => p.slug === 'purificador-radar');
                    if (page) {
                      navigateToCustomPage(page);
                    } else {
                      window.location.hash = '#purificador-radar';
                    }
                  }}
                  className="px-8 py-3.5 bg-gradient-to-r from-orange-500 to-amber-500 hover:from-orange-400 hover:to-amber-400 text-black font-black uppercase text-xs tracking-wider rounded-2xl shadow-xl shadow-orange-500/20 transition-all cursor-pointer inline-flex items-center gap-2"
                >
                  <span>📊 Aceder ao Purificador & Radar</span>
                  <span>→</span>
                </button>
              </div>
            </div>
          </section>
          
          {/* Funcionalidade 3: Notificações Push */}
          <PushSimulator />

          {/* SECÇÃO COMUNIDADE DE TIPSTERS COM RANKING PÚBLICO */}
          <section id="ranking-tipsters" className="py-20 bg-[#0C0C10]/60 relative border-y border-zinc-900">
            <div className="absolute top-0 right-1/4 w-[350px] h-[350px] bg-purple-600/5 rounded-full blur-[140px] pointer-events-none"></div>
            <div className="max-w-7xl mx-auto px-6">
              <div className="text-center max-w-2xl mx-auto mb-14 space-y-4">
                <span className="text-[10px] font-black uppercase tracking-wider text-fuchsia-500 bg-fuchsia-500/10 px-3 py-1 rounded-md font-mono border border-fuchsia-500/10">
                  👥 COMUNIDADE EXCLUSIVA iRUNBETS
                </span>
                <h2 className="text-2xl sm:text-4xl font-extrabold text-white uppercase tracking-tight font-display">
                  {language === 'pt' ? 'RANKING DE TIPSTERS MAIS LUCRATIVOS' : 'TOP LUCRATIVE TIPSTERS LEADERBOARD'}
                </h2>
                <div className="h-1 w-20 bg-fuchsia-500 rounded-full mx-auto"></div>
                <p className="text-xs sm:text-sm text-zinc-400 font-light max-w-xl mx-auto leading-relaxed">
                  {language === 'pt'
                    ? 'A comunidade de prognósticos desportivos número um da Ibéria. Verifique as margens de acerto de cada registo em tempo real, siga os líderes e tenha acesso aos canais vips mais rentáveis.'
                    : 'The most profitable verified sports tipsters across the region. Review historic win averages, follow your favorites and access premium locks.'}
                </p>
              </div>

              {/* Leaderboard Cards */}
              {homepageTipsters.length === 0 ? (
                <div className="py-16 text-center text-xs text-zinc-400 font-bold bg-zinc-950/25 border border-dashed border-zinc-850 rounded-3xl max-w-xl mx-auto uppercase tracking-wider font-mono">
                  {language === 'pt' 
                    ? 'brevemente aqui encontras os teus tipster' 
                    : 'soon you will find your tipsters here'}
                </div>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                  {homepageTipsters.map((tps, idx) => (
                    <div key={tps.id} className="p-6 rounded-3xl bg-zinc-950/40 border border-[#27272a] hover:border-zinc-750 transition-all flex flex-col justify-between relative overflow-hidden group font-sans">
                      <div className="absolute top-3 right-3 text-[10px] font-mono font-black text-fuchsia-400 bg-fuchsia-500/10 px-2 py-0.5 rounded-md border border-fuchsia-500/10 uppercase">
                        🏆 TOP {idx + 1}
                      </div>

                      <div className="space-y-4 text-left">
                        <div className="flex items-center gap-3">
                          <div className="w-12 h-12 rounded-xl bg-zinc-900 border border-zinc-850 flex items-center justify-center text-3xl group-hover:scale-105 transition-all">
                            {tps.avatar || '👤'}
                          </div>
                          <div className="text-left">
                            <h3 className="text-xs font-bold text-white group-hover:text-fuchsia-400 transition-all">{tps.name}</h3>
                            <span className="text-[9px] text-zinc-500 uppercase tracking-widest font-mono block">Tipster Oficial</span>
                          </div>
                        </div>

                        <p className="text-[11px] text-zinc-400 leading-relaxed font-light min-h-[36px] text-left">
                          {tps.email ? `Contacto: ${tps.email}` : 'Especialista em prognósticos desportivos de Poisson na iRunBets.'}
                        </p>

                        <div className="grid grid-cols-2 gap-2 text-center pt-2">
                          <div className="bg-zinc-950 p-2 rounded-xl border border-zinc-900">
                            <span className="text-[7.5px] font-bold text-zinc-550 uppercase tracking-widest font-mono block">Lucro Líquido</span>
                            <strong className="text-xs font-mono text-emerald-400">+{Number(tps.netProfit || 0).toFixed(2)}€</strong>
                          </div>
                          <div className="bg-zinc-950 p-2 rounded-xl border border-zinc-900">
                            <span className="text-[7.5px] font-bold text-zinc-550 uppercase tracking-widest font-mono block">Yield Geral</span>
                            <strong className="text-xs font-mono text-purple-400">+{Number(tps.yieldPercent || 0).toFixed(1)}%</strong>
                          </div>
                        </div>

                        <div className="flex justify-between items-center text-[9px] text-zinc-550 font-mono px-0.5">
                          <span>EFICÁCIA DE ACERTOS:</span>
                          <span className="text-zinc-450">{tps.wins || 0}W - {tps.losses || 0}L</span>
                        </div>
                      </div>

                      <div className="mt-5 pt-3.5 border-t border-zinc-900/40">
                        <button
                          type="button"
                          onClick={() => {
                            localStorage.setItem('irunbets_vip_clube_tab_trigger', 'dashboard');
                            localStorage.setItem('irunbets_vip_active_tab', 'rede-tipsters');
                            localStorage.setItem('irunbets_vip_target_tipster_on_load', tps.id);
                            const vipPage = customPages.find(p => p.slug === 'clube-vip');
                            if (vipPage) {
                              setSelectedCustomPage(vipPage);
                              window.scrollTo({ top: 0, behavior: 'instant' });
                            }
                          }}
                          className="w-full py-2 bg-fuchsia-500/10 hover:bg-fuchsia-500 hover:text-black hover:border-fuchsia-400 border border-fuchsia-500/20 text-[9.5px] text-fuchsia-400 font-black uppercase tracking-wider rounded-xl transition-all cursor-pointer flex items-center justify-center gap-1.5"
                        >
                          📂 Ver Prognósticos & Stats
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </section>
          
          {/* MURAL DE PROGNÓSTICOS DE MARKETING - iRUNBETS FEED DE MULTI-CANAIS */}
          <section id="marketing-mural" className="py-16 bg-[#0B0B0E] relative border-b border-zinc-900">
            <div className="absolute top-0 left-10 w-48 h-48 bg-cyan-500/5 rounded-full blur-[100px] pointer-events-none"></div>
            <div className="absolute bottom-0 right-10 w-48 h-48 bg-emerald-500/5 rounded-full blur-[100px] pointer-events-none"></div>

            <div className="max-w-4xl mx-auto px-6">
              <div className="flex flex-col md:flex-row items-center justify-between gap-4 mb-10">
                <div className="space-y-1 text-center md:text-left">
                  <span className="text-[10px] font-black uppercase tracking-wider text-[#00f2fe] bg-cyan-950/20 px-3 py-1 rounded-md font-mono border border-cyan-900/10">
                    📢 {language === 'pt' ? 'MURAL DE PROGNÓSTICOS IA (FEED DE MARKETING)' : 'PRO IA FORECAST MURAL (MARKETING FEED)'}
                  </span>
                  <h2 className="text-xl sm:text-2xl font-black text-[#00f2fe] [text-shadow:0_0_15px_rgba(0,242,254,0.55)] tracking-tight font-display mt-2">
                    {language === 'pt' ? 'As nossas apostas iRunBets' : 'Our Bets iRunBets'}
                  </h2>
                  <p className="text-[11px] text-zinc-400 font-light">
                    {language === 'pt' 
                      ? 'Demonstração de precisão em tempo real. Prognósticos matemáticos calibrados pelo Purificador e validados.'
                      : 'Live showcase of hybrid mathematical locks, calculated by our predictive engine.'}
                  </p>
                </div>

                <div className="flex items-center gap-2.5 bg-zinc-950/85 p-2 rounded-xl border border-zinc-900">
                  <div className="flex items-center gap-1.5 px-2 py-0.5">
                    <span className="text-[9.5px] font-mono text-zinc-500 uppercase font-bold">{language === 'pt' ? 'DIÁRIO OFICIAL' : 'OFFICIAL JOURNAL'}</span>
                    <span className="text-[10px] uppercase font-black px-2 py-0.5 rounded font-mono bg-[#00f2fe]/10 text-[#00f2fe] border border-[#00f2fe]/15 flex items-center gap-1">
                      <span className="w-1.5 h-1.5 rounded-full bg-[#00f2fe] animate-pulse"></span>
                      <span>{language === 'pt' ? 'VERIFICADO IA' : 'AI VERIFIED'}</span>
                    </span>
                  </div>
                </div>
              </div>

              {marketingAnalyses.length === 0 ? (
                <div className="py-12 text-center text-xs text-zinc-500 italic bg-zinc-950/20 border border-dashed border-zinc-850 rounded-xl">
                  {language === 'pt' ? 'Sem análises enviadas para o mural público neste momento.' : 'No analyses published to the public log yet.'}
                </div>
              ) : (
                <>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-6 w-full">
                    {(isMarketingExpanded ? marketingAnalyses : marketingAnalyses.slice(0, 2)).map((item) => {
                      const isPending = item.status === 'pending';
                      const isGreen = item.status === 'green';
                      const isRed = item.status === 'red';

                      return (
                        <div 
                          key={item.id} 
                          className={`p-5 rounded-2xl border bg-zinc-950/40 transition-all hover:bg-zinc-950/60 relative flex flex-col justify-between ${
                            isGreen 
                              ? 'border-emerald-500/25 shadow-lg shadow-emerald-950/5' 
                              : isRed 
                              ? 'border-red-500/20 shadow-lg shadow-red-950/5' 
                              : 'border-zinc-900'
                          }`}
                        >
                          <div>
                            {/* Upper Badges */}
                            <div className="flex justify-between items-start gap-2 mb-3.5">
                              <span className="text-[10px] text-zinc-400 font-mono tracking-tight font-bold uppercase block bg-zinc-900/60 px-2 py-0.5 rounded border border-zinc-850/30">
                                🏆 {item.league || 'Ligas Gerais'}
                              </span>
                              <span className={`text-[9px] px-2 py-0.5 rounded font-black font-mono uppercase tracking-wider ${
                                isGreen 
                                  ? 'bg-emerald-500/10 border border-emerald-500/30 text-emerald-300'
                                  : isRed 
                                  ? 'bg-red-500/10 border border-red-500/30 text-red-400'
                                  : 'bg-amber-500/5 border border-amber-500/20 text-amber-500 animate-pulse'
                              }`}>
                                {isGreen ? 'GREEN 🟢' : isRed ? 'RED 🔴' : 'PENDENTE ⏳'}
                              </span>
                            </div>

                            {/* Teams */}
                            <div className="space-y-1 mb-4">
                              <h4 className="text-[14px] font-black text-white leading-tight uppercase font-display flex items-center gap-1.5 flex-wrap">
                                <span>{item.homeTeam}</span> 
                                <span className="text-zinc-600 font-light lowercase text-[11px]">vs</span> 
                                <span>{item.awayTeam}</span>
                              </h4>
                              <div className="grid grid-cols-3 gap-1 pt-1.5 mt-2 font-mono text-[9px] text-zinc-500 text-center border-t border-zinc-900/40">
                                <span className="bg-zinc-950/40 p-1 rounded">1: {Number(item.homeProb || 33).toFixed(0)}%</span>
                                <span className="bg-zinc-950/40 p-1 rounded">X: {Number(item.drawProb || 33).toFixed(0)}%</span>
                                <span className="bg-zinc-950/40 p-1 rounded">2: {Number(item.awayProb || 33).toFixed(0)}%</span>
                              </div>
                            </div>

                            {/* Bet & Odd Summary */}
                            <div className="bg-[#050508] border border-zinc-900 rounded-xl p-3 mb-4 space-y-1.5">
                              <div className="flex justify-between items-center text-xs">
                                <span className="text-zinc-500 font-bold">{language === 'pt' ? 'Indicação IA:' : 'IA Presugestion:'}</span>
                                <span className="text-white font-black uppercase tracking-wide text-[11px]">{item.recommendedBet}</span>
                              </div>
                              <div className="flex justify-between items-center text-xs">
                                <span className="text-zinc-500 font-bold">{language === 'pt' ? 'Odd Estimada:' : 'Estimated Odd:'}</span>
                                <span className="text-[#00f2fe] font-mono font-black">@{item.odd}</span>
                              </div>
                              {item.under35Prob !== undefined && (
                                <div className="flex justify-between items-center text-[10px] border-t border-zinc-900/50 pt-1.5 text-zinc-500">
                                  <span>Under 3.5 Probabilidade:</span>
                                  <span className="text-red-400 font-bold font-mono">{Number(item.under35Prob).toFixed(1)}%</span>
                                </div>
                              )}
                            </div>
                          </div>
                        </div>
                      );
                    })}
                  </div>

                  {marketingAnalyses.length > 2 && (
                    <div className="mt-8 flex justify-center">
                      <button
                        type="button"
                        onClick={() => setIsMarketingExpanded(!isMarketingExpanded)}
                        className="px-6 py-2.5 bg-cyan-500/10 hover:bg-cyan-500 hover:text-black border border-cyan-500/20 text-xs font-black uppercase tracking-wider rounded-xl transition-all cursor-pointer flex items-center justify-center gap-2 group text-[#00f2fe] hover:border-cyan-400 font-mono"
                      >
                        <span>
                          {isMarketingExpanded 
                            ? (language === 'pt' ? '📉 Ver Menos' : '📉 See Less') 
                            : (language === 'pt' ? '📈 Ver Mais Apostas' : '📈 Expand Forecasts')}
                        </span>
                        <span className="text-[10px] bg-cyan-950/40 px-1.5 py-0.5 rounded text-[#00f2fe] group-hover:bg-cyan-400 group-hover:text-black font-bold">
                          {marketingAnalyses.length}
                        </span>
                      </button>
                    </div>
                  )}
                </>
              )}
            </div>
          </section>

          {/* MÚLTIPLAS EM DESTAQUE - SEÇÃO DEDICADA INTERATIVA */}
          <section id="featured-multiples" className="py-16 bg-[#09090C] relative border-b border-zinc-900">
            <div className="absolute top-10 right-10 w-48 h-48 bg-amber-500/5 rounded-full blur-[100px] pointer-events-none"></div>
            <div className="absolute bottom-10 left-10 w-48 h-48 bg-yellow-500/5 rounded-full blur-[100px] pointer-events-none"></div>

            <div className="max-w-4xl mx-auto px-6">
              <div className="flex flex-col md:flex-row items-center justify-between gap-4 mb-10">
                <div className="space-y-1 text-center md:text-left">
                  <span className="text-[10px] font-black uppercase tracking-wider text-amber-400 bg-amber-950/20 px-3 py-1 rounded-md font-mono border border-amber-900/10">
                    🔥 COMPONENTES ESPECIAIS
                  </span>
                  <h2 className="text-xl sm:text-2xl font-black text-amber-300 [text-shadow:0_0_15px_rgba(251,191,36,0.55)] tracking-tight font-display mt-2">
                    {language === 'pt' ? 'Múltiplas em Destaque' : 'Featured Multiples'}
                  </h2>
                  <p className="text-[11px] text-zinc-400 font-light">
                    {language === 'pt' 
                      ? 'Consulte as nossas combinações múltiplas premium ativas para hoje com cotações ampliadas.'
                      : 'Browse our premium active multiple combination slips for today with optimized yields.'}
                  </p>
                </div>
              </div>

              {activeFeaturedMultiples.length === 0 ? (
                <div className="py-12 text-center text-xs text-zinc-500 italic bg-zinc-950/20 border border-dashed border-zinc-850 rounded-xl">
                  {language === 'pt' ? 'Sem apostas múltiplas em destaque ativas no momento.' : 'No active featured multiples at the moment.'}
                </div>
              ) : (
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-8 w-full">
                  {activeFeaturedMultiples.map((item) => (
                    <div 
                      key={item.id} 
                      onClick={() => setSelectedMultipleImage(item)}
                      className="group bg-zinc-950/50 hover:bg-zinc-950/80 border border-zinc-900 hover:border-amber-500/30 rounded-3xl p-5 transition-all duration-500 flex flex-col justify-between shadow-2xl relative overflow-hidden cursor-pointer"
                    >
                      {/* Ambient card glow */}
                      <div className="absolute -right-10 -top-10 w-24 h-24 bg-amber-500/5 rounded-full blur-2xl group-hover:bg-amber-500/10 transition-all duration-500"></div>

                      <div className="space-y-4">
                        {/* Upper Details */}
                        <div className="flex justify-between items-center border-b border-zinc-900/60 pb-3">
                          <span className="text-[12px] font-black text-amber-400 font-display tracking-widest uppercase bg-amber-950/10 px-3 py-1 rounded-lg border border-amber-900/20 shadow-sm shadow-amber-500/5">
                            {item.title}
                          </span>
                          {item.status === 'green' ? (
                            <span className="text-[10px] bg-emerald-500/15 text-emerald-400 border border-emerald-500/30 px-2 py-0.5 rounded-full font-bold tracking-wider uppercase font-mono animate-pulse">
                              🟢 GREEN
                            </span>
                          ) : item.status === 'red' ? (
                            <span className="text-[10px] bg-rose-500/15 text-rose-400 border border-rose-500/30 px-2 py-0.5 rounded-full font-bold tracking-wider uppercase font-mono">
                              🔴 RED
                            </span>
                          ) : (
                            <span className="text-[10px] bg-zinc-800/80 text-zinc-400 border border-zinc-700/50 px-2 py-0.5 rounded-full font-bold tracking-wider uppercase font-mono">
                              ⏳ PENDENTE
                            </span>
                          )}
                        </div>

                        {/* Image Frame */}
                        <div className="relative aspect-video rounded-2xl overflow-hidden border border-zinc-900 bg-black shadow-inner flex items-center justify-center">
                          <img
                            src={item.imageUrl}
                            alt={item.title}
                            referrerPolicy="no-referrer"
                            className="w-full h-full object-cover group-hover:scale-105 transition-all duration-700"
                          />
                          {/* Premium Overlay */}
                          <div className="absolute inset-0 bg-gradient-to-t from-black/95 via-black/10 to-transparent flex flex-col justify-end p-4">
                            <span className="text-[9px] text-amber-400/85 font-mono uppercase tracking-widest font-black [text-shadow:0_0_8px_rgba(245,158,11,0.6)]">
                              Múltipla {item.title}
                            </span>
                            <span className="text-[12px] text-white font-black uppercase tracking-wide font-display mt-0.5">
                              {language === 'pt' ? 'CUPÃO PREMIUM' : 'PREMIUM COUPON'}
                            </span>
                          </div>
                        </div>

                        {/* Date strictly shown under the image as requested */}
                        <div className="flex items-center gap-1.5 text-zinc-400 text-[11px] font-mono font-bold mt-2">
                          <span>🗓️</span>
                          <span className="tracking-wide">
                            {item.customDate ? (() => {
                              const parts = item.customDate.split('-');
                              if (parts.length === 3) return `${parts[2]}/${parts[1]}/${parts[0].slice(-2)}`;
                              return item.customDate;
                            })() : (item.createdAt ? new Date(item.createdAt).toLocaleDateString('pt-PT', { day: '2-digit', month: '2-digit', year: '2-digit' }) : '')}
                          </span>
                        </div>
                      </div>

                      {/* Interactive Button */}
                      <div className="mt-4 pt-3 border-t border-zinc-900/60 flex items-center justify-between gap-2">
                        <span className="text-[10px] text-zinc-500 font-light font-mono">
                          iRunBets Purified Odds
                        </span>
                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            setSelectedMultipleImage(item);
                          }}
                          className="text-[10.5px] text-amber-300 font-black tracking-wide font-display hover:text-amber-200 transition-colors cursor-pointer flex items-center gap-1 bg-transparent border-none outline-none"
                        >
                          {language === 'pt' ? 'Análise Detalhada' : 'Detailed Analysis'} ➔
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* POPUP MODAL FOR MULTIPLE IMAGE DETAIL */}
            {selectedMultipleImage && (
              <div 
                className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/95 backdrop-blur-sm transition-all duration-300"
                onClick={() => setSelectedMultipleImage(null)}
              >
                <div 
                  className="relative max-w-2xl w-full bg-[#0a0a0d] border border-zinc-800 rounded-3xl overflow-hidden p-6 shadow-2xl flex flex-col gap-4 transform scale-100 transition-transform duration-300 hover:border-amber-500/25"
                  onClick={(e) => e.stopPropagation()}
                >
                  {/* Header */}
                  <div className="flex items-center justify-between border-b border-zinc-900 pb-3">
                    <div className="flex flex-wrap items-center gap-2.5">
                      <span className="text-[12px] font-black text-amber-400 font-display tracking-widest uppercase bg-amber-950/20 px-3 py-1 rounded-lg border border-amber-900/30">
                        Múltipla {selectedMultipleImage.title}
                      </span>
                      {selectedMultipleImage.status === 'green' ? (
                        <span className="text-[10px] bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 px-2 py-0.5 rounded-full font-bold tracking-wider uppercase font-mono animate-pulse">
                          🟢 GREEN
                        </span>
                      ) : selectedMultipleImage.status === 'red' ? (
                        <span className="text-[10px] bg-rose-500/20 text-rose-400 border border-rose-500/30 px-2 py-0.5 rounded-full font-bold tracking-wider uppercase font-mono">
                          🔴 RED
                        </span>
                      ) : (
                        <span className="text-[10px] bg-zinc-800/80 text-zinc-400 border border-zinc-700/50 px-2 py-0.5 rounded-full font-bold tracking-wider uppercase font-mono">
                          ⏳ PENDENTE
                        </span>
                      )}
                      <span className="text-[11px] text-zinc-405 font-mono font-bold ml-1.5 flex items-center gap-1">
                        🗓️ {selectedMultipleImage.customDate ? (() => {
                          const parts = selectedMultipleImage.customDate.split('-');
                          if (parts.length === 3) return `${parts[2]}/${parts[1]}/${parts[0].slice(-2)}`;
                          return selectedMultipleImage.customDate;
                        })() : (selectedMultipleImage.createdAt ? new Date(selectedMultipleImage.createdAt).toLocaleDateString('pt-PT', { day: '2-digit', month: '2-digit', year: '2-digit' }) : 'Recente')}
                      </span>
                    </div>
                    <button
                      type="button"
                      onClick={() => setSelectedMultipleImage(null)}
                      className="w-7 h-7 flex items-center justify-center rounded-full bg-zinc-900 hover:bg-red-500/10 hover:text-red-500 text-zinc-450 transition-colors cursor-pointer text-xs font-bold"
                    >
                      ✕
                    </button>
                  </div>

                  {/* Subtitle */}
                  <div className="text-center py-1">
                    <h3 className="text-base font-black text-amber-300 uppercase tracking-tight font-display">
                      {language === 'pt' ? 'Cupão de Aposta Comprovada' : 'Proven Bet Slip Coupon'}
                    </h3>
                    <p className="text-[11px] text-zinc-400">
                      {language === 'pt' ? 'Consulte as seleções qualificadas e o cupão original registado.' : 'Browse the qualified selections and the original registered slip.'}
                    </p>
                  </div>

                  {/* Image Area */}
                  <div className="relative rounded-2xl overflow-hidden border border-zinc-900 bg-black flex items-center justify-center max-h-[70vh] shadow-inner">
                    <img
                      src={selectedMultipleImage.imageUrl}
                      alt={selectedMultipleImage.title}
                      referrerPolicy="no-referrer"
                      className="w-full h-auto object-contain max-h-[55vh] rounded-xl"
                    />
                  </div>

                  {/* Footer buttons / actions */}
                  <div className="flex justify-between items-center bg-[#0a0a0d] px-1 pt-2 border-t border-zinc-900/40">
                    <span className="text-[10px] text-zinc-550 font-mono">iRUNBETS PREMIUM LOG</span>
                    <button
                      type="button"
                      onClick={() => setSelectedMultipleImage(null)}
                      className="px-5 py-2 bg-amber-500 hover:bg-amber-400 text-black rounded-xl font-bold uppercase tracking-wider text-[11px] transition-all cursor-pointer shadow-lg shadow-amber-500/10"
                    >
                      {language === 'pt' ? 'Fechar' : 'Close'}
                    </button>
                  </div>
                </div>
              </div>
            )}
          </section>

          {/* Novidade: Últimas Notícias & Relatórios IA + Subscriber Counter Banner */}
          <LatestNews 
            onOpenAuth={() => setIsAuthOpen(true)} 
            refreshCounterTrigger={newsRefreshTrigger}
          />
          
          {/* Secção de FAQ */}
          <FAQ />
        </main>
      )}

      {/* Rodapé - common footer */}
      <Footer onLinkClick={(e, id) => {
        navigateToCustomPage(null);
        handleNavClick(e, id);
      }} />
      
      {/* Interactive AI Specialist Agent Container */}
      <Assistant />

      {/* Real-time Online Agora floating badge - clickable to view independent visits evolution graph popup anywhere! (ONLY when logged in) */}
      {(currentUser || isAdmin) && (
        <div className="fixed bottom-6 left-6 z-[90] flex items-center">
          <button
            onClick={() => setIsTrafficModalOpen(true)}
            className="flex items-center gap-2 px-3 py-2 bg-[#09090b]/90 hover:bg-[#121216]/95 border border-zinc-800/80 hover:border-[#38bdf8]/40 rounded-full shadow-lg backdrop-blur-md transition-all group cursor-pointer text-xs font-mono font-bold"
          >
            <span className="relative flex h-2 w-2">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
              <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-400"></span>
            </span>
            <span className="text-zinc-350 group-hover:text-[#38bdf8] transition-colors">
              {trafficStats ? trafficStats.activeLiveUsers : 1} {language === 'pt' ? 'Online Agora' : 'Online Now'}
            </span>
            <span className="text-[10px] text-zinc-500 font-normal transition-all group-hover:scale-105">
              📈 {language === 'pt' ? 'Evolução' : 'Evolution'}
            </span>
          </button>
        </div>
      )}

      {/* INDEPENDENT VISITS EVOLUTION GRAPH POPUP MODAL */}
      {(currentUser || isAdmin) && isTrafficModalOpen && (
        <div className="fixed inset-0 bg-[#000]/85 backdrop-blur-md z-[125] flex items-center justify-center p-4 animate-fade-in text-left">
          <div className="bg-[#121216]/95 border border-zinc-800 rounded-3xl w-full max-w-4xl p-6 sm:p-8 relative shadow-2xl space-y-6">
            
            {/* Header */}
            <div className="flex items-center justify-between border-b border-zinc-900 pb-4">
              <div>
                <span className="text-[10px] uppercase font-bold font-mono tracking-widest text-[#38bdf8] flex items-center gap-2">
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse"></span> {language === 'pt' ? 'Estatísticas de Tráfego Autónomo' : 'Autonomous Traffic Tracker'}
                </span>
                <h3 className="text-lg font-bold text-white mt-0.5 mt-2">
                  {language === 'pt' ? 'Histórico & Evolução Real das Visitas' : 'Historic & Real Visits Evolution'}
                </h3>
                <p className="text-zinc-500 text-xs font-light">
                  {language === 'pt' ? 'Acompanhamento do site irunbets em tempo real para tomada de decisões comerciais.' : 'Live platform performance tracking for strategic actions and decisions.'}
                </p>
              </div>
              
              <button
                onClick={() => setIsTrafficModalOpen(false)}
                className="p-2 bg-zinc-900 hover:bg-zinc-850 border border-zinc-800 rounded-xl text-zinc-400 hover:text-white transition-colors cursor-pointer text-xs font-bold font-mono"
              >
                {language === 'pt' ? 'FECHAR ✕' : 'CLOSE ✕'}
              </button>
            </div>

            {/* Data controls/stats */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-left">
              <div className="bg-zinc-950 p-4 rounded-xl border border-zinc-900">
                <span className="text-[9px] uppercase font-mono text-zinc-500 block">{language === 'pt' ? 'Alcance Atual' : 'Current Window'}</span>
                <div className="text-xl font-mono font-bold text-white mt-1">
                  {trafficHistory.length} {language === 'pt' ? 'Dias Registados' : 'Days Tracked'}
                </div>
                <span className="text-[10px] text-zinc-500 font-light mt-0.5 block">{language === 'pt' ? 'Monitorização em ciclo ativo diário' : 'Daily active lifecycle monitoring'}</span>
              </div>

              <div className="bg-zinc-950 p-4 rounded-xl border border-zinc-900">
                <span className="text-[9px] uppercase font-mono text-zinc-500 block font-bold">{language === 'pt' ? 'Média de Páginas/Dia' : 'Average Pages/Day'}</span>
                <div className="text-xl font-mono font-bold text-teal-400 mt-1">
                  {trafficHistory.length > 0 
                    ? Math.round(trafficHistory.reduce((acc, h) => acc + h.visits, 0) / trafficHistory.length)
                    : 0}
                </div>
                <span className="text-[10px] text-emerald-400 font-light mt-0.5 block">★ {language === 'pt' ? 'Tração estável' : 'Stable traction'}</span>
              </div>

              <div className="flex items-center justify-end gap-2 bg-zinc-950/40 p-3 rounded-xl border border-zinc-900/50">
                <span className="text-[10px] font-mono text-zinc-450">{language === 'pt' ? 'Período:' : 'Period:'}</span>
                <button
                  onClick={() => setActiveHistoryRange(7)}
                  className={`px-3 py-1.5 rounded-lg text-[10px] font-bold font-mono transition-all ${
                    activeHistoryRange === 7 
                      ? 'bg-gradient-to-r from-teal-500 to-sky-500 text-white shadow'
                      : 'bg-zinc-900 text-zinc-455 hover:text-white border border-zinc-850'
                  }`}
                >
                  7d
                </button>
                <button
                  onClick={() => setActiveHistoryRange(14)}
                  className={`px-3 py-1.5 rounded-lg text-[10px] font-bold font-mono transition-all ${
                    activeHistoryRange === 14 
                      ? 'bg-gradient-to-r from-teal-500 to-sky-500 text-white shadow'
                      : 'bg-zinc-900 text-zinc-455 hover:text-white border border-zinc-850'
                  }`}
                >
                  14d
                </button>
              </div>
            </div>

            {/* Chart implementation using dynamic premium SVG container */}
            <div className="bg-zinc-950/80 border border-zinc-100/10 p-6 rounded-2xl relative">
              {trafficHistory.length === 0 ? (
                <div className="h-64 flex items-center justify-center text-zinc-500 text-xs italic">
                  {language === 'pt' ? 'A ler histórico de tráfego a partir do Firestore...' : 'Reading traffic stats history from Firestore...'}
                </div>
              ) : (
                (() => {
                  // Subset based on selected range
                  const subset = trafficHistory.slice(-activeHistoryRange);
                  const maxValue = Math.max(...subset.map(d => d.visits), 100);
                  const ceiling = Math.ceil(maxValue * 1.15);
                  
                  // Chart SVG dimensions
                  const chartW = 750;
                  const chartH = 220;
                  const paddingL = 40;
                  const paddingR = 20;
                  const paddingT = 20;
                  const paddingB = 30;
                  const drawW = chartW - paddingL - paddingR;
                  const drawH = chartH - paddingT - paddingB;

                  // Compute points for SVG path
                  const pointsVisits = subset.map((day, idx) => {
                    const x = paddingL + (idx / (subset.length - 1)) * drawW;
                    const y = paddingT + drawH - (day.visits / ceiling) * drawH;
                    return { x, y, day };
                  });

                  const pointsUniques = subset.map((day, idx) => {
                    const x = paddingL + (idx / (subset.length - 1)) * drawW;
                    const y = paddingT + drawH - (day.uniques / ceiling) * drawH;
                    return { x, y, day };
                  });

                  // Build path data string
                  const pathVisits = pointsVisits.reduce((acc, p, idx) => {
                    return acc + (idx === 0 ? `M ${p.x} ${p.y}` : ` L ${p.x} ${p.y}`);
                  }, '');

                  const pathUniques = pointsUniques.reduce((acc, p, idx) => {
                    return acc + (idx === 0 ? `M ${p.x} ${p.y}` : ` L ${p.x} ${p.y}`);
                  }, '');

                  const areaVisits = pathVisits + ` L ${pointsVisits[pointsVisits.length-1].x} ${paddingT + drawH} L ${pointsVisits[0].x} ${paddingT + drawH} Z`;
                  const areaUniques = pathUniques + ` L ${pointsUniques[pointsUniques.length-1].x} ${paddingT + drawH} L ${pointsUniques[0].x} ${paddingT + drawH} Z`;

                  return (
                    <div className="w-full">
                      {/* Legend */}
                      <div className="flex items-center gap-6 justify-end text-[10px] font-mono text-zinc-400 mb-4">
                        <div className="flex items-center gap-2">
                          <span className="w-3 h-0.5 bg-[#38bdf8] block"></span>
                          <span>{language === 'pt' ? 'Visitas Globais (Reg + Não Registados)' : 'Global Visits (Total)'}</span>
                        </div>
                        <div className="flex items-center gap-2">
                          <span className="w-3 h-0.5 bg-emerald-450 block"></span>
                          <span>{language === 'pt' ? 'Visitantes Únicos (Browsers)' : 'Unique Visitors (Browsers)'}</span>
                        </div>
                      </div>

                      {/* Interactive SVG Wrapper */}
                      <div className="h-64 relative font-mono">
                        <svg viewBox={`0 0 ${chartW} ${chartH}`} className="w-full h-full overflow-visible">
                          <defs>
                            <linearGradient id="gradientVisits" x1="0" y1="0" x2="0" y2="1">
                              <stop offset="0%" stopColor="#38bdf8" stopOpacity="0.25"/>
                              <stop offset="100%" stopColor="#38bdf8" stopOpacity="0.0"/>
                            </linearGradient>
                            <linearGradient id="gradientUniques" x1="0" y1="0" x2="0" y2="1">
                              <stop offset="0%" stopColor="#10b981" stopOpacity="0.18"/>
                              <stop offset="100%" stopColor="#10b981" stopOpacity="0.0"/>
                            </linearGradient>
                          </defs>

                          {/* Background Horizontal Gridlines */}
                          {[0, 0.25, 0.5, 0.75, 1].map((ratio, i) => {
                            const y = paddingT + ratio * drawH;
                            const labelVal = Math.round(ceiling * (1 - ratio));
                            return (
                              <g key={i} className="opacity-40">
                                <line 
                                  x1={paddingL} 
                                  y1={y} 
                                  x2={chartW - paddingR} 
                                  y2={y} 
                                  stroke="#1e293b" 
                                  strokeWidth={1} 
                                  strokeDasharray="4 4"
                                />
                                <text 
                                  x={paddingL - 8} 
                                  y={y + 3} 
                                  fill="#64748b" 
                                  fontSize={8} 
                                  fontFamily="monospace" 
                                  textAnchor="end"
                                >
                                  {labelVal}
                                </text>
                              </g>
                            );
                          })}

                          {/* Vertical grid lines */}
                          {pointsVisits.map((p, idx) => (
                            <line
                              key={idx}
                              x1={p.x}
                              y1={paddingT}
                              x2={p.x}
                              y2={paddingT + drawH}
                              stroke="#1e293b"
                              strokeWidth={1}
                              className="opacity-20"
                            />
                          ))}

                          {/* Area paths */}
                          <path d={areaVisits} fill="url(#gradientVisits)" />
                          <path d={areaUniques} fill="url(#gradientUniques)" />

                          {/* Line paths */}
                          <path 
                            d={pathVisits} 
                            fill="none" 
                            stroke="#38bdf8" 
                            strokeWidth={2} 
                            strokeLinecap="round" 
                            strokeLinejoin="round"
                          />
                          <path 
                            d={pathUniques} 
                            fill="none" 
                            stroke="#10b981" 
                            strokeWidth={1.8} 
                            strokeLinecap="round" 
                            strokeLinejoin="round"
                          />

                          {/* Interactive tooltip hovering & circles */}
                          {pointsVisits.map((p, idx) => {
                            const uniquePt = pointsUniques[idx];
                            const rawDate = p.day.date;
                            const dayLabel = rawDate.substring(5); // format: MM-DD
                            return (
                              <g key={idx} className="group cursor-pointer">
                                {/* Visits Data node */}
                                <circle 
                                  cx={p.x} 
                                  cy={p.y} 
                                  r={3.5} 
                                  fill="#0f172a" 
                                  stroke="#38bdf8" 
                                  strokeWidth={1.5}
                                  className="transition-all duration-100 group-hover:r-[5] group-hover:stroke-white"
                                />
                                {/* Unique Data node */}
                                <circle 
                                  cx={uniquePt.x} 
                                  cy={uniquePt.y} 
                                  r={3.5} 
                                  fill="#0f172a" 
                                  stroke="#10b981" 
                                  strokeWidth={1.5}
                                  className="transition-all duration-100 group-hover:r-[5] group-hover:stroke-white"
                                />

                                {/* X-axis text anchor */}
                                <text
                                  x={p.x}
                                  y={paddingT + drawH + 15}
                                  fill="#64748b"
                                  fontSize={8}
                                  fontFamily="monospace"
                                  textAnchor="middle"
                                  className="select-none text-[7.5px] font-light"
                                >
                                  {dayLabel}
                                </text>

                                {/* Dynamic floating micro tooltip inside node hover */}
                                <g className="opacity-0 group-hover:opacity-100 transition-opacity duration-150 pointer-events-none">
                                  <rect 
                                    x={p.x - 50} 
                                    y={Math.min(p.y, uniquePt.y) - 52} 
                                    width={100} 
                                    height={42} 
                                    rx={6} 
                                    fill="#09090b" 
                                    stroke="#27272a" 
                                    strokeWidth={1}
                                  />
                                  <text x={p.x} y={Math.min(p.y, uniquePt.y) - 39} fill="#fff" fontSize={7.5} fontFamily="sans-serif" fontWeight="bold" textAnchor="middle">
                                    {p.day.date}
                                  </text>
                                  <text x={p.x} y={Math.min(p.y, uniquePt.y) - 27} fill="#38bdf8" fontSize={7.5} fontFamily="monospace" textAnchor="middle">
                                    Visitas: {p.day.visits}
                                  </text>
                                  <text x={p.x} y={Math.min(p.y, uniquePt.y) - 16} fill="#10b981" fontSize={7.5} fontFamily="monospace" textAnchor="middle">
                                    Únicos: {p.day.uniques}
                                  </text>
                                </g>
                              </g>
                            );
                          })}
                        </svg>
                      </div>
                    </div>
                  );
                })()
              )}
            </div>

            {/* Bottom explanations and advice */}
            <div className="bg-[#0b0b0d] p-4 border border-zinc-850/50 rounded-xl space-y-1 text-left">
              <span className="text-[10px] text-zinc-500 font-mono block uppercase">🔑 {language === 'pt' ? 'MUDANÇA DE MARCA DA PLATAFORMA:' : 'PLATFORM REBRANDING NOTE:'}</span>
              <p className="text-[11px] text-zinc-400 leading-relaxed font-light">
                {language === 'pt' 
                  ? 'Como solicitado sobre a hipótese de vender este projeto/plataforma para adotar outro nome (e.g. "juntos vencemos"):' 
                  : 'Regarding the scenario of rebranding or selling this tool to change name (e.g. "juntos vencemos"):'}
              </p>
              <p className="text-[11px] text-zinc-400 leading-relaxed font-light mt-1">
                {language === 'pt'
                  ? 'Este código foi meticulosamente desenhado para ser 100% modular. Qualquer pessoa pode simplesmente alterar o nome de destaque de "irunbets" para "juntos vencemos" com extrema facilidade.'
                  : 'The codebase is built with 100% modular layouts. Adapting strings from "irunbets" to "juntos vencemos" takes less than a minute.'}
              </p>
              <div className="text-[10.5px] text-emerald-400 font-mono leading-relaxed mt-2 pt-2 border-t border-zinc-900">
                ⚡ {language === 'pt' ? 'Infraestrutura ativa com base de dados Firestore sincronizada com tráfego 100% real.' : 'Fully independent deployment with real-time Firestore database stats connection.'}
              </div>
            </div>

            {/* Close */}
            <button
              onClick={() => setIsTrafficModalOpen(false)}
              className="w-full py-3.5 bg-gradient-to-r from-teal-500 to-sky-500 hover:from-teal-600 hover:to-sky-600 text-white font-bold text-xs uppercase tracking-wider rounded-xl transition-all shadow-lg hover:shadow-sky-500/10 cursor-pointer text-center"
            >
              {language === 'pt' ? 'Voltar ao Site Geral' : 'Back to General Site'}
            </button>
          </div>
        </div>
      )}

      {/* Real-time on-site floating popup notification alert */}
      <FloatingPushNotifier />

      {/* Auth Modal Container Dialog */}
      <AuthModal 
        isOpen={isAuthOpen}
        onClose={() => setIsAuthOpen(false)}
        onSuccess={handleAuthSuccess}
      />

      {/* Safe non-blocking custom Toast feedback notifications */}
      {toast && (
        <div className="fixed bottom-8 right-8 z-[9999] max-w-sm animate-pulse-short" id="custom-toast-notification">
          <div className={`px-4 py-3.5 rounded-xl border backdrop-blur-md shadow-2xl flex items-center gap-3 text-xs font-medium tracking-wide font-sans ${
            toast.type === 'error'
              ? 'bg-red-950/90 border-red-500/35 text-red-200'
              : toast.type === 'info'
              ? 'bg-cyan-950/90 border-[#00f2fe]/35 text-[#00f2fe]'
              : 'bg-emerald-950/90 border-emerald-500/35 text-emerald-200'
          }`}>
            <span className="text-sm">{toast.type === 'error' ? '❌' : toast.type === 'info' ? 'ℹ️' : '✅'}</span>
            <span className="flex-1 text-[11px] leading-relaxed uppercase font-semibold font-mono">{toast.message}</span>
            <button 
              type="button" 
              onClick={() => setToast(null)} 
              className="text-zinc-500 hover:text-white font-black text-[11px] px-1 hover:bg-white/5 rounded focus:outline-none"
            >
              ✕
            </button>
          </div>
        </div>
      )}

      {/* Global Customizable Independent Promotional Popup */}
      <PromotionalPopup language={language} />
      
    </div>
  );
}

export default App;
