import React, { useState, useEffect, useRef } from 'react';
import { useLanguage } from '../services/LanguageContext';
import { onAuthStatusChange, getTopBannersFromFirebase, saveTopBannersToFirebase } from '../services/firebase';
import { ChevronLeft, ChevronRight, Sparkles, Plus, Trash2, Edit3, Image as ImageIcon, Upload, Check, ExternalLink, X } from 'lucide-react';

export interface TopBannerItem {
  id: string;
  badgePt: string;
  badgeEn: string;
  titlePt: string;
  titleEn: string;
  descPt: string;
  descEn: string;
  btnTextPt: string;
  btnTextEn: string;
  actionTab: string; // e.g. 'analise-jogos', 'purificador', 'clube-vip', 'radar', 'external'
  externalUrl?: string;
  imageUrl?: string; // Custom uploaded base64 image or URL
  theme: 'cyan' | 'purple' | 'amber' | 'emerald' | 'rose';
  active: boolean;
}

const DEFAULT_BANNERS: TopBannerItem[] = [
  {
    id: 'banner-testing-phase-2026',
    badgePt: 'OLÁ ;-) COMO ESTÃO HOJE?',
    badgeEn: 'HELLO ;-) HOW ARE YOU TODAY?',
    titlePt: 'O nosso site ainda está em fase de testes ;-)',
    titleEn: 'Our website is still in testing phase ;-)',
    descPt: 'A nossa IA além de analise estatistica, PRECISA DE Ti. Nenhuma IA no mundo advinha dados a ultima da hora...',
    descEn: 'Our AI needs you besides statistical analysis. No AI in the world guesses last-minute data...',
    btnTextPt: '⚽ Explorar Banners',
    btnTextEn: '⚽ Explore Banners',
    actionTab: 'analise-jogos',
    theme: 'cyan',
    active: true
  },
  {
    id: 'banner-purifier-2026',
    badgePt: '⚡ PURIFICADOR DE ODDS',
    badgeEn: '⚡ ODDS PURIFIER',
    titlePt: 'Elimina a Comissao da Casa de Apostas em Tempo Real',
    titleEn: 'Remove Bookmaker Commission in Real Time',
    descPt: 'Descobre o verdadeiro valor justo de qualquer odd sem margens ocultas e identifica desvios de valor na hora.',
    descEn: 'Discover the fair value of any market without hidden vigorish and identify value deviations instantly.',
    btnTextPt: '🧪 Purificar Odds Agora',
    btnTextEn: '🧪 Purify Odds Now',
    actionTab: 'purificador',
    theme: 'amber',
    active: true
  },
  {
    id: 'banner-vip-2026',
    badgePt: '💎 COMUNIDADE VIP',
    badgeEn: '💎 VIP COMMUNITY',
    titlePt: 'Gestão de Banca Inteligente & Sinais com Vantagem',
    titleEn: 'Smart Bankroll Management & Value Signals',
    descPt: 'Histórico transparente, cálculo de stakes otimizado por Kelly Criterion e acompanhamento dos melhores especialistas.',
    descEn: 'Transparent history, Kelly Criterion stake calculator and verified tracking of top tipsters.',
    btnTextPt: '🚀 Entrar no Clube VIP',
    btnTextEn: '🚀 Join VIP Club',
    actionTab: 'clube-vip',
    theme: 'purple',
    active: true
  },
  {
    id: 'banner-mobile-2026',
    badgePt: '📲 APP & ALERTAS',
    badgeEn: '📲 APP & ALERTS',
    titlePt: 'Sinais Instantâneos e Notificações Push no Telemóvel',
    titleEn: 'Instant Signals & Push Notifications on Mobile',
    descPt: 'Sintoniza alertas de valor relativo e variações de odds em tempo real para antecipar os movimentos do mercado.',
    descEn: 'Set up custom value alerts and live odd line movements directly on your phone.',
    btnTextPt: '🔔 Ver Recursos & Alertas',
    btnTextEn: '🔔 Explore Features',
    actionTab: 'radar',
    theme: 'emerald',
    active: true
  }
];

const THEME_STYLES = {
  cyan: {
    bgGradient: 'from-cyan-950/80 via-[#07131B] to-[#04080D]',
    border: 'border-cyan-500/30 hover:border-cyan-400/50',
    badge: 'bg-cyan-500/15 text-cyan-400 border-cyan-500/30',
    title: 'text-cyan-300 [text-shadow:0_0_15px_rgba(6,182,212,0.4)]',
    btn: 'bg-gradient-to-r from-cyan-500 to-blue-600 hover:from-cyan-400 hover:to-blue-500 text-black shadow-cyan-500/20'
  },
  purple: {
    bgGradient: 'from-purple-950/80 via-[#10091D] to-[#08040F]',
    border: 'border-purple-500/30 hover:border-purple-400/50',
    badge: 'bg-purple-500/15 text-purple-300 border-purple-500/30',
    title: 'text-purple-300 [text-shadow:0_0_15px_rgba(168,85,247,0.4)]',
    btn: 'bg-gradient-to-r from-purple-500 to-fuchsia-600 hover:from-purple-400 hover:to-fuchsia-500 text-white shadow-purple-500/20'
  },
  amber: {
    bgGradient: 'from-amber-950/80 via-[#1A1208] to-[#0B0803]',
    border: 'border-amber-500/30 hover:border-amber-400/50',
    badge: 'bg-amber-500/15 text-amber-400 border-amber-500/30',
    title: 'text-amber-300 [text-shadow:0_0_15px_rgba(245,158,11,0.4)]',
    btn: 'bg-gradient-to-r from-amber-500 to-orange-500 hover:from-amber-400 hover:to-orange-400 text-black shadow-amber-500/20'
  },
  emerald: {
    bgGradient: 'from-emerald-950/80 via-[#06140E] to-[#030B07]',
    border: 'border-emerald-500/30 hover:border-emerald-400/50',
    badge: 'bg-emerald-500/15 text-emerald-400 border-emerald-500/30',
    title: 'text-emerald-300 [text-shadow:0_0_15px_rgba(16,185,129,0.4)]',
    btn: 'bg-gradient-to-r from-emerald-500 to-teal-600 hover:from-emerald-400 hover:to-teal-500 text-black shadow-emerald-500/20'
  },
  rose: {
    bgGradient: 'from-rose-950/80 via-[#18080C] to-[#0B0305]',
    border: 'border-rose-500/30 hover:border-rose-400/50',
    badge: 'bg-rose-500/15 text-rose-400 border-rose-500/30',
    title: 'text-rose-300 [text-shadow:0_0_15px_rgba(244,63,94,0.4)]',
    btn: 'bg-gradient-to-r from-rose-500 to-pink-600 hover:from-rose-400 hover:to-pink-500 text-white shadow-rose-500/20'
  }
};

interface TopBannersSliderProps {
  onActionClick?: (actionTab: string, externalUrl?: string) => void;
  isAdmin?: boolean;
}

export const TopBannersSlider: React.FC<TopBannersSliderProps> = ({ onActionClick, isAdmin = false }) => {
  const { language } = useLanguage();
  const [isStrictAdmin, setIsStrictAdmin] = useState<boolean>(false);

  useEffect(() => {
    const unsub = onAuthStatusChange((user, checkAdmin) => {
      const isMorgado = user?.email?.toLowerCase() === 'morgado.aam@gmail.com';
      setIsStrictAdmin(isMorgado);
    });
    return () => unsub();
  }, []);

  const [banners, setBanners] = useState<TopBannerItem[]>(() => {
    try {
      const saved = localStorage.getItem('irunbets_top_banners_config');
      if (saved) {
        const parsed = JSON.parse(saved);
        if (Array.isArray(parsed) && parsed.length > 0) {
          return parsed;
        }
      }
    } catch (e) {
      console.error('Failed to parse top banners config', e);
    }
    return DEFAULT_BANNERS;
  });

  // Sync with Firebase and listen to real-time banner updates across all devices
  useEffect(() => {
    const loadFromFirebase = async () => {
      const remoteBanners = await getTopBannersFromFirebase();
      if (Array.isArray(remoteBanners)) {
        if (remoteBanners.length > 0) {
          let needsUpdate = false;
          const updated = remoteBanners.map(b => {
            if (b.id === 'banner-testing-phase-2026' && b.badgePt === 'OLÁ') {
              needsUpdate = true;
              return { ...b, badgePt: 'OLÁ ;-) COMO ESTÃO HOJE?', badgeEn: 'HELLO ;-) HOW ARE YOU TODAY?' };
            }
            return b;
          });
          if (needsUpdate) {
            saveTopBannersToFirebase(updated);
          }
          setBanners(updated);
          localStorage.setItem('irunbets_top_banners_config', JSON.stringify(updated));
        } else {
          setBanners([]);
          localStorage.setItem('irunbets_top_banners_config', JSON.stringify([]));
        }
      }
    };
    loadFromFirebase();

    const handleSync = () => {
      try {
        const saved = localStorage.getItem('irunbets_top_banners_config');
        if (saved) {
          const parsed = JSON.parse(saved);
          if (Array.isArray(parsed) && parsed.length > 0) {
            setBanners(parsed);
          }
        }
      } catch (e) {
        console.error('Error syncing top banners from localStorage', e);
      }
    };

    window.addEventListener('irunbets_top_banners_updated', handleSync);
    window.addEventListener('storage', handleSync);
    return () => {
      window.removeEventListener('irunbets_top_banners_updated', handleSync);
      window.removeEventListener('storage', handleSync);
    };
  }, []);

  const [currentIndex, setCurrentIndex] = useState(0);
  const [isPaused, setIsPaused] = useState(false);
  const [isManageModalOpen, setIsManageModalOpen] = useState(false);
  const [editingBanner, setEditingBanner] = useState<TopBannerItem | null>(null);

  const activeBanners = banners.filter(b => b.active);
  const timerRef = useRef<NodeJS.Timeout | null>(null);

  // Auto-play interval
  useEffect(() => {
    if (isPaused || activeBanners.length <= 1) return;

    timerRef.current = setInterval(() => {
      setCurrentIndex((prev) => (prev + 1) % activeBanners.length);
    }, 6000);

    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, [isPaused, activeBanners.length]);

  const handleNext = () => {
    if (activeBanners.length === 0) return;
    setCurrentIndex((prev) => (prev + 1) % activeBanners.length);
  };

  const handlePrev = () => {
    if (activeBanners.length === 0) return;
    setCurrentIndex((prev) => (prev - 1 + activeBanners.length) % activeBanners.length);
  };

  const saveBannersToStorage = (newBanners: TopBannerItem[]) => {
    setBanners(newBanners);
    saveTopBannersToFirebase(newBanners);
  };

  const handleBannerAction = (banner: TopBannerItem) => {
    if (banner.actionTab === 'external' && banner.externalUrl) {
      window.open(banner.externalUrl, '_blank', 'noopener,noreferrer');
    } else if (onActionClick) {
      onActionClick(banner.actionTab, banner.externalUrl);
    }
  };

  // Image File upload handler (directly from PC)
  const handleImageFileUpload = (e: React.ChangeEvent<HTMLInputElement>, targetBanner: TopBannerItem) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (event) => {
      const result = event.target?.result as string;
      if (result) {
        const updated = { ...targetBanner, imageUrl: result };
        setEditingBanner(updated);
      }
    };
    reader.readAsDataURL(file);
  };

  if (activeBanners.length === 0) return null;

  const currentBanner = activeBanners[currentIndex % activeBanners.length] || activeBanners[0];
  const theme = THEME_STYLES[currentBanner.theme] || THEME_STYLES.cyan;

  return (
    <div className="w-full pt-28 sm:pt-32 pb-0">
      {/* Container Banner Card - 100% Full Width */}
      <div 
        onMouseEnter={() => setIsPaused(true)}
        onMouseLeave={() => setIsPaused(false)}
        className={`relative w-full border-y ${theme.border} bg-gradient-to-r ${theme.bgGradient} py-10 sm:py-16 lg:py-20 shadow-2xl transition-all duration-500 overflow-hidden font-sans group`}
      >
        {/* Glow ambient effects */}
        <div className="absolute top-0 right-0 -mt-12 -mr-12 w-96 h-96 bg-cyan-500/10 rounded-full blur-3xl pointer-events-none"></div>
        <div className="absolute bottom-0 left-0 -mb-12 -ml-12 w-96 h-96 bg-amber-500/10 rounded-full blur-3xl pointer-events-none"></div>

        {/* Inner Content Centered */}
        <div className="w-full max-w-[1550px] mx-auto px-4 sm:px-8 lg:px-12">

        {/* Top Header Row with Badge & Slide Navigation */}
        <div className="flex items-center justify-between gap-3 mb-8 relative z-10">
          <div className="flex items-center gap-2">
            <span className={`text-xs sm:text-sm font-black uppercase tracking-wider px-4 py-2 rounded-xl border ${theme.badge} font-mono flex items-center gap-2 shadow-sm`}>
              <Sparkles className="w-4 h-4 animate-pulse" />
              <span>{language === 'pt' ? currentBanner.badgePt : currentBanner.badgeEn}</span>
            </span>
          </div>

          <div className="flex items-center gap-2.5">
            {/* Quick Edit button accessible only to strict admin morgado.aam@gmail.com */}
            {isStrictAdmin && (
              <>
                <button
                  type="button"
                  onClick={() => {
                    setEditingBanner(currentBanner);
                    setIsManageModalOpen(true);
                  }}
                  className="px-3.5 py-2 bg-zinc-900/90 hover:bg-zinc-800 text-amber-400 hover:text-amber-300 border border-amber-500/30 hover:border-amber-400 rounded-xl text-xs font-mono font-bold uppercase transition-all flex items-center gap-1.5 cursor-pointer shadow-md"
                  title="Editar este Banner e Imagem (Admin)"
                >
                  <Edit3 className="w-4 h-4 text-amber-400" />
                  <span>✏️ Editar Texto / Imagem</span>
                </button>

                <button
                  type="button"
                  onClick={() => setIsManageModalOpen(true)}
                  className="px-3.5 py-2 bg-zinc-900/90 hover:bg-zinc-800 text-zinc-300 hover:text-white border border-zinc-800 rounded-xl text-xs font-mono font-bold uppercase transition-all flex items-center gap-1.5 cursor-pointer"
                  title="Gerir Todos os Banners de Início"
                >
                  <span className="hidden sm:inline">Todos os Banners</span>
                </button>
              </>
            )}

            {activeBanners.length > 1 && (
              <div className="flex items-center gap-1 bg-zinc-950/70 p-1 rounded-xl border border-zinc-800/80">
                <button
                  type="button"
                  onClick={handlePrev}
                  className="p-1.5 sm:p-2 rounded-lg text-zinc-400 hover:text-white hover:bg-zinc-850 transition-colors cursor-pointer"
                  aria-label="Anterior"
                >
                  <ChevronLeft className="w-4 h-4" />
                </button>
                <span className="text-xs font-mono font-bold text-zinc-300 px-2">
                  {currentIndex + 1} / {activeBanners.length}
                </span>
                <button
                  type="button"
                  onClick={handleNext}
                  className="p-1.5 sm:p-2 rounded-lg text-zinc-400 hover:text-white hover:bg-zinc-850 transition-colors cursor-pointer"
                  aria-label="Seguinte"
                >
                  <ChevronRight className="w-4 h-4" />
                </button>
              </div>
            )}
          </div>
        </div>

        {/* Content Body Row */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-10 items-center relative z-10">
          <div className={`${currentBanner.imageUrl ? 'lg:col-span-7' : 'lg:col-span-12'} space-y-5 text-left`}>
            <h2 className={`text-2xl sm:text-4xl lg:text-5xl font-extrabold tracking-tight font-display leading-tight ${theme.title}`}>
              {language === 'pt' ? currentBanner.titlePt : currentBanner.titleEn}
            </h2>
            <p className="text-base sm:text-lg text-zinc-200 leading-relaxed max-w-4xl font-light">
              {language === 'pt' ? currentBanner.descPt : currentBanner.descEn}
            </p>

            <div className="pt-4 flex flex-wrap items-center gap-4">
              <button
                type="button"
                onClick={() => handleBannerAction(currentBanner)}
                className={`px-7 py-3.5 rounded-xl text-xs sm:text-sm font-black uppercase tracking-wider transition-all duration-300 transform active:scale-95 cursor-pointer shadow-xl flex items-center gap-2.5 ${theme.btn}`}
              >
                <span>{language === 'pt' ? currentBanner.btnTextPt : currentBanner.btnTextEn}</span>
                {currentBanner.actionTab === 'external' ? (
                  <ExternalLink className="w-5 h-5" />
                ) : (
                  <ChevronRight className="w-5 h-5" />
                )}
              </button>
            </div>
          </div>

          {/* Optional Image Preview Column if image was uploaded */}
          {currentBanner.imageUrl && (
            <div className="lg:col-span-5 flex justify-center items-center">
              <div className="relative rounded-2xl overflow-hidden border border-zinc-700/80 shadow-2xl bg-zinc-950/90 max-h-[320px] sm:max-h-[380px] w-full group/img">
                <img
                  src={currentBanner.imageUrl}
                  alt={currentBanner.titlePt}
                  referrerPolicy="no-referrer"
                  className="w-full h-full object-cover max-h-[320px] sm:max-h-[380px] rounded-2xl transition-transform duration-500 group-hover/img:scale-105"
                />
              </div>
            </div>
          )}
        </div>

        {/* Slide Dots Indicator */}
        {activeBanners.length > 1 && (
          <div className="flex justify-center items-center gap-2 mt-8 relative z-10">
            {activeBanners.map((_, idx) => (
              <button
                key={idx}
                type="button"
                onClick={() => setCurrentIndex(idx)}
                className={`h-2 rounded-full transition-all duration-300 cursor-pointer ${
                  idx === currentIndex ? 'w-8 bg-cyan-400 shadow-glow' : 'w-2 bg-zinc-700 hover:bg-zinc-500'
                }`}
                aria-label={`Slide ${idx + 1}`}
              />
            ))}
          </div>
        )}
        </div>
      </div>

      {/* ADMIN BANNERS MANAGEMENT MODAL */}
      {isManageModalOpen && (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-md z-[200] flex items-center justify-center p-4 animate-fade-in text-left">
          <div className="bg-[#0E0E12] border border-zinc-800 rounded-3xl w-full max-w-3xl p-6 relative shadow-2xl space-y-5 max-h-[90vh] overflow-y-auto font-sans">
            <div className="flex justify-between items-center border-b border-zinc-850 pb-4">
              <div className="flex items-center gap-2">
                <Sparkles className="w-5 h-5 text-cyan-400" />
                <h3 className="text-base font-black text-white uppercase tracking-wider font-display">
                  Gestão dos Banners de Início
                </h3>
              </div>
              <button
                onClick={() => {
                  setIsManageModalOpen(false);
                  setEditingBanner(null);
                }}
                className="p-2 rounded-xl text-zinc-400 hover:text-white hover:bg-zinc-800 transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Editing active banner form */}
            {editingBanner ? (
              <div className="space-y-4 bg-zinc-950/60 p-4 rounded-2xl border border-zinc-800">
                <div className="flex justify-between items-center">
                  <h4 className="text-xs font-bold text-cyan-400 uppercase tracking-wider font-mono">
                    Editar / Novo Banner
                  </h4>
                  <button
                    onClick={() => setEditingBanner(null)}
                    className="text-xs text-zinc-400 hover:text-white"
                  >
                    Voltar à lista
                  </button>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label className="text-[10px] text-zinc-400 uppercase font-mono block mb-1">Badge (PT)</label>
                    <input
                      type="text"
                      value={editingBanner.badgePt}
                      onChange={(e) => setEditingBanner({ ...editingBanner, badgePt: e.target.value })}
                      className="w-full bg-zinc-900 border border-zinc-800 rounded-lg px-3 py-1.5 text-xs text-white outline-none focus:border-cyan-500"
                    />
                  </div>
                  <div>
                    <label className="text-[10px] text-zinc-400 uppercase font-mono block mb-1">Badge (EN)</label>
                    <input
                      type="text"
                      value={editingBanner.badgeEn}
                      onChange={(e) => setEditingBanner({ ...editingBanner, badgeEn: e.target.value })}
                      className="w-full bg-zinc-900 border border-zinc-800 rounded-lg px-3 py-1.5 text-xs text-white outline-none focus:border-cyan-500"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label className="text-[10px] text-zinc-400 uppercase font-mono block mb-1">Título (PT)</label>
                    <input
                      type="text"
                      value={editingBanner.titlePt}
                      onChange={(e) => setEditingBanner({ ...editingBanner, titlePt: e.target.value })}
                      className="w-full bg-zinc-900 border border-zinc-800 rounded-lg px-3 py-1.5 text-xs text-white outline-none focus:border-cyan-500"
                    />
                  </div>
                  <div>
                    <label className="text-[10px] text-zinc-400 uppercase font-mono block mb-1">Título (EN)</label>
                    <input
                      type="text"
                      value={editingBanner.titleEn}
                      onChange={(e) => setEditingBanner({ ...editingBanner, titleEn: e.target.value })}
                      className="w-full bg-zinc-900 border border-zinc-800 rounded-lg px-3 py-1.5 text-xs text-white outline-none focus:border-cyan-500"
                    />
                  </div>
                </div>

                <div>
                  <label className="text-[10px] text-zinc-400 uppercase font-mono block mb-1">Descrição (PT)</label>
                  <textarea
                    rows={2}
                    value={editingBanner.descPt}
                    onChange={(e) => setEditingBanner({ ...editingBanner, descPt: e.target.value })}
                    className="w-full bg-zinc-900 border border-zinc-800 rounded-lg px-3 py-1.5 text-xs text-white outline-none focus:border-cyan-500 resize-none"
                  />
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                  <div>
                    <label className="text-[10px] text-zinc-400 uppercase font-mono block mb-1">Texto Botão (PT)</label>
                    <input
                      type="text"
                      value={editingBanner.btnTextPt}
                      onChange={(e) => setEditingBanner({ ...editingBanner, btnTextPt: e.target.value })}
                      className="w-full bg-zinc-900 border border-zinc-800 rounded-lg px-3 py-1.5 text-xs text-white outline-none focus:border-cyan-500"
                    />
                  </div>
                  <div>
                    <label className="text-[10px] text-zinc-400 uppercase font-mono block mb-1">Ação / Destino</label>
                    <select
                      value={editingBanner.actionTab}
                      onChange={(e) => setEditingBanner({ ...editingBanner, actionTab: e.target.value })}
                      className="w-full bg-zinc-900 border border-zinc-800 rounded-lg px-3 py-1.5 text-xs text-white outline-none focus:border-cyan-500"
                    >
                      <option value="analise-jogos">Análise de Jogos IA</option>
                      <option value="purificador">Purificador de Odds</option>
                      <option value="clube-vip">Clube VIP</option>
                      <option value="radar">Radar / Alertas</option>
                      <option value="external">Link Externo (URL)</option>
                    </select>
                  </div>
                  <div>
                    <label className="text-[10px] text-zinc-400 uppercase font-mono block mb-1">Tema Visual</label>
                    <select
                      value={editingBanner.theme}
                      onChange={(e) => setEditingBanner({ ...editingBanner, theme: e.target.value as any })}
                      className="w-full bg-zinc-900 border border-zinc-800 rounded-lg px-3 py-1.5 text-xs text-white outline-none focus:border-cyan-500"
                    >
                      <option value="cyan">Ciano Elétrico</option>
                      <option value="purple">Roxo VIP</option>
                      <option value="amber">Âmbar Dourado</option>
                      <option value="emerald">Verde Esmeralda</option>
                      <option value="rose">Rosa / Fogo</option>
                    </select>
                  </div>
                </div>

                {/* Import Image from PC or URL */}
                <div className="p-3 bg-zinc-900/80 rounded-xl border border-zinc-800 space-y-2">
                  <label className="text-[10px] text-cyan-400 uppercase font-bold font-mono flex items-center gap-1.5">
                    <ImageIcon className="w-3.5 h-3.5" />
                    <span>Imagem do Banner (Importar do PC ou URL)</span>
                  </label>
                  
                  <div className="flex flex-col sm:flex-row items-center gap-3">
                    <label className="w-full sm:w-auto px-4 py-2 bg-cyan-500/10 hover:bg-cyan-500/20 text-cyan-400 border border-cyan-500/30 rounded-xl text-xs font-bold uppercase tracking-wider cursor-pointer transition-all flex items-center justify-center gap-1.5">
                      <Upload className="w-4 h-4" />
                      <span>Carregar do PC</span>
                      <input
                        type="file"
                        accept="image/*"
                        onChange={(e) => handleImageFileUpload(e, editingBanner)}
                        className="hidden"
                      />
                    </label>

                    <input
                      type="text"
                      placeholder="Ou cola aqui URL da imagem..."
                      value={editingBanner.imageUrl || ''}
                      onChange={(e) => setEditingBanner({ ...editingBanner, imageUrl: e.target.value })}
                      className="flex-1 w-full bg-zinc-950 border border-zinc-800 rounded-xl px-3 py-1.5 text-xs text-white outline-none focus:border-cyan-500 font-mono"
                    />

                    {editingBanner.imageUrl && (
                      <button
                        type="button"
                        onClick={() => setEditingBanner({ ...editingBanner, imageUrl: undefined })}
                        className="px-2.5 py-1.5 bg-rose-500/10 hover:bg-rose-500/20 text-rose-400 border border-rose-500/20 rounded-xl text-xs font-bold"
                      >
                        Remover
                      </button>
                    )}
                  </div>

                  {editingBanner.imageUrl && (
                    <div className="mt-2 rounded-xl overflow-hidden border border-zinc-800 max-h-28 max-w-xs">
                      <img src={editingBanner.imageUrl} alt="Preview" className="w-full h-auto object-cover max-h-28" />
                    </div>
                  )}
                </div>

                <div className="flex justify-end gap-2 pt-2">
                  <button
                    type="button"
                    onClick={() => {
                      const updatedBanners = banners.map(b => b.id === editingBanner.id ? editingBanner : b);
                      if (!banners.some(b => b.id === editingBanner.id)) {
                        updatedBanners.push(editingBanner);
                      }
                      saveBannersToStorage(updatedBanners);
                      setEditingBanner(null);
                    }}
                    className="px-5 py-2 bg-cyan-500 hover:bg-cyan-400 text-black rounded-xl text-xs font-bold uppercase tracking-wider shadow-lg transition-all"
                  >
                    Guardar Banner
                  </button>
                </div>
              </div>
            ) : (
              <div className="space-y-4">
                <div className="flex justify-between items-center">
                  <span className="text-xs text-zinc-400 font-mono">
                    Lista de Banners Ativos ({banners.length})
                  </span>
                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      onClick={() => {
                        if (window.confirm('Deseja restaurar os Banners Oficiais predefinidos no site e na Firebase?')) {
                          saveBannersToStorage(DEFAULT_BANNERS);
                        }
                      }}
                      className="px-3 py-1.5 bg-amber-500/10 hover:bg-amber-500/20 text-amber-400 border border-amber-500/30 rounded-xl text-xs font-bold uppercase tracking-wider flex items-center gap-1 cursor-pointer transition-all"
                      title="Restaurar Banners Oficiais (Análise de Jogos, Purificador, VIP, App)"
                    >
                      <Sparkles className="w-3.5 h-3.5" />
                      <span>Restaurar Oficiais</span>
                    </button>
                    <button
                      type="button"
                      onClick={() => setEditingBanner({
                        id: `banner-${Date.now()}`,
                        badgePt: '📢 ANÚNCIO',
                        badgeEn: '📢 ANNOUNCEMENT',
                        titlePt: 'Novo Banner iRunBets',
                        titleEn: 'New iRunBets Banner',
                        descPt: 'Descrição do novo anúncio ou funcionalidade.',
                        descEn: 'Description of the new feature or offer.',
                        btnTextPt: 'Ver Mais',
                        btnTextEn: 'Learn More',
                        actionTab: 'analise-jogos',
                        theme: 'cyan',
                        active: true
                      })}
                      className="px-3 py-1.5 bg-cyan-500/10 hover:bg-cyan-500/20 text-cyan-400 border border-cyan-500/30 rounded-xl text-xs font-bold uppercase tracking-wider flex items-center gap-1 cursor-pointer transition-all"
                    >
                      <Plus className="w-3.5 h-3.5" />
                      <span>Adicionar Banner</span>
                    </button>
                  </div>
                </div>

                <div className="space-y-2">
                  {banners.map((b) => (
                    <div
                      key={b.id}
                      className="p-3 bg-zinc-900/60 border border-zinc-800 rounded-xl flex items-center justify-between gap-3 text-left"
                    >
                      <div className="flex items-center gap-3">
                        <button
                          type="button"
                          onClick={() => {
                            const updated = banners.map(item => item.id === b.id ? { ...item, active: !item.active } : item);
                            saveBannersToStorage(updated);
                          }}
                          className={`w-5 h-5 rounded flex items-center justify-center border text-xs cursor-pointer ${
                            b.active ? 'bg-emerald-500/20 border-emerald-500/40 text-emerald-400' : 'bg-zinc-800 border-zinc-700 text-zinc-500'
                          }`}
                          title={b.active ? 'Ativo' : 'Inativo'}
                        >
                          {b.active && <Check className="w-3 h-3" />}
                        </button>
                        <div>
                          <h5 className="text-xs font-bold text-white font-display">{b.titlePt}</h5>
                          <span className="text-[10px] text-zinc-500 font-mono">{b.badgePt} • {b.actionTab}</span>
                        </div>
                      </div>

                      <div className="flex items-center gap-1.5">
                        <button
                          type="button"
                          onClick={() => setEditingBanner(b)}
                          className="p-1.5 rounded-lg bg-zinc-800 hover:bg-zinc-700 text-zinc-300 transition-colors cursor-pointer"
                        >
                          <Edit3 className="w-3.5 h-3.5" />
                        </button>
                        <button
                          type="button"
                          onClick={() => {
                            const updated = banners.filter(item => item.id !== b.id);
                            saveBannersToStorage(updated);
                          }}
                          className="p-1.5 rounded-lg bg-rose-500/10 hover:bg-rose-500/20 text-rose-400 transition-colors cursor-pointer"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </div>
                  ))}
                </div>

                <div className="pt-2 flex justify-end">
                  <button
                    type="button"
                    onClick={() => {
                      saveBannersToStorage(DEFAULT_BANNERS);
                    }}
                    className="text-xs text-zinc-500 hover:text-zinc-300 font-mono underline cursor-pointer"
                  >
                    Restaurar Banners Padrão
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
};
