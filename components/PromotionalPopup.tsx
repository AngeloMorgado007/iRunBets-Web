import React, { useState, useEffect } from 'react';
import { X, Sparkles, AlertCircle, ArrowRight, ShieldAlert, BadgePercent, CheckCircle, Trophy, PartyPopper, Megaphone } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { getPopupConfigFromFirebase, PopupConfig } from '../services/firebase';

interface PromotionalPopupProps {
  language: string;
}

export const PromotionalPopup: React.FC<PromotionalPopupProps> = ({ language }) => {
  const [config, setConfig] = useState<PopupConfig | null>(null);
  const [isOpen, setIsOpen] = useState(false);
  const [dontShowAgain, setDontShowAgain] = useState(false);

  const loadConfig = async () => {
    try {
      const popupConfig = await getPopupConfigFromFirebase();
      if (!popupConfig || !popupConfig.isActive) {
        setIsOpen(false);
        setConfig(null);
        return;
      }

      setConfig(popupConfig);

      // Check local storage dismissal state
      const dismissedKey = 'irunbets_popup_dismissed_time';
      const dismissedVersionKey = 'irunbets_popup_dismissed_version';
      const lastDismissedTime = localStorage.getItem(dismissedKey);
      const lastDismissedVersion = localStorage.getItem(dismissedVersionKey);
      
      const currentVersion = popupConfig.updatedAt || 'v1';

      if (lastDismissedTime) {
        const parsedTime = parseInt(lastDismissedTime, 10);
        const now = Date.now();
        const oneDay = 24 * 60 * 60 * 1000; // 24 hours in milliseconds
        
        const isWithin24Hours = (now - parsedTime) < oneDay;
        const isSameVersion = lastDismissedVersion === currentVersion;

        // If the user dismissed this specific version within 24 hours, RESPECT THEIR CHOICE!
        if (isWithin24Hours && isSameVersion) {
          setIsOpen(false);
          return;
        }

        // If forceShowAll is enabled AND content version was changed after dismissal:
        if (popupConfig.forceShowAll && !isSameVersion) {
          setIsOpen(true);
          return;
        }

        // If 24 hours have passed or version is new
        if (!isWithin24Hours || !isSameVersion) {
          setIsOpen(true);
        } else {
          setIsOpen(false);
        }
      } else {
        // No previous dismissal, show it
        setIsOpen(true);
      }
    } catch (err) {
      console.error('Error loading promotional popup config:', err);
    }
  };

  useEffect(() => {
    // Initial config load
    loadConfig();

    const handleConfigUpdate = () => {
      loadConfig();
    };

    window.addEventListener('irunbets_popup_config_updated', handleConfigUpdate);

    return () => {
      window.removeEventListener('irunbets_popup_config_updated', handleConfigUpdate);
    };
  }, []);

  const handleToggleDontShowAgain = (checked: boolean) => {
    setDontShowAgain(checked);
    if (config) {
      const currentVersion = config.updatedAt || 'v1';
      if (checked) {
        localStorage.setItem('irunbets_popup_dismissed_time', Date.now().toString());
        localStorage.setItem('irunbets_popup_dismissed_version', currentVersion);
      } else {
        localStorage.removeItem('irunbets_popup_dismissed_time');
        localStorage.removeItem('irunbets_popup_dismissed_version');
      }
    }
  };

  const handleClose = () => {
    setIsOpen(false);
    
    // Save state in localStorage if "dontShowAgain" is selected or by default
    if (config) {
      if (dontShowAgain) {
        const currentVersion = config.updatedAt || 'v1';
        localStorage.setItem('irunbets_popup_dismissed_time', Date.now().toString());
        localStorage.setItem('irunbets_popup_dismissed_version', currentVersion);
      }
    }
  };

  const handleAction = () => {
    if (!config) return;
    
    // Mark as dismissed for 24h
    const currentVersion = config.updatedAt || 'v1';
    localStorage.setItem('irunbets_popup_dismissed_time', Date.now().toString());
    localStorage.setItem('irunbets_popup_dismissed_version', currentVersion);
    
    setIsOpen(false);

    // Dynamic routing / linking
    const link = config.buttonLink || '#pricing';
    if (link.startsWith('#')) {
      const elementId = link.substring(1);
      const element = document.getElementById(elementId);
      if (element) {
        element.scrollIntoView({ behavior: 'smooth' });
      } else {
        window.location.hash = link;
      }
    } else {
      window.open(link, '_blank', 'noopener,noreferrer');
    }
  };

  if (!config || !isOpen) return null;

  // Defaults for new fields
  const popupType = config.type || 'promotion';
  const hasActionButton = config.hasButton !== false; // Default to true

  // Theme styling dictionaries
  const themes = {
    amber: {
      gradient: 'from-amber-500/20 via-[#0F0E0B] to-[#0A0907]',
      border: 'border-amber-500/30',
      badge: 'bg-amber-500/15 text-amber-400 border-amber-500/20',
      button: 'bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-600 hover:to-amber-700 text-black shadow-amber-500/10 focus:ring-amber-500/30',
      textAccent: 'text-amber-400',
      bulletIcon: 'text-amber-500'
    },
    emerald: {
      gradient: 'from-emerald-500/20 via-[#0A0F0D] to-[#070A08]',
      border: 'border-emerald-500/30',
      badge: 'bg-emerald-500/15 text-emerald-400 border-emerald-500/20',
      button: 'bg-gradient-to-r from-emerald-500 to-emerald-600 hover:from-emerald-600 hover:to-emerald-700 text-black shadow-emerald-500/10 focus:ring-emerald-500/30',
      textAccent: 'text-emerald-400',
      bulletIcon: 'text-emerald-500'
    },
    cyan: {
      gradient: 'from-cyan-500/20 via-[#0A0E12] to-[#070A0E]',
      border: 'border-cyan-500/30',
      badge: 'bg-cyan-500/15 text-cyan-400 border-cyan-500/20',
      button: 'bg-gradient-to-r from-cyan-500 to-cyan-600 hover:from-cyan-600 hover:to-cyan-700 text-black shadow-cyan-500/10 focus:ring-cyan-500/30',
      textAccent: 'text-cyan-400',
      bulletIcon: 'text-cyan-500'
    },
    red: {
      gradient: 'from-rose-500/20 via-[#120A0B] to-[#0E0708]',
      border: 'border-[#F43F5E]/30',
      badge: 'bg-[#F43F5E]/15 text-[#FB7185] border-[#F43F5E]/20',
      button: 'bg-gradient-to-r from-rose-500 to-rose-600 hover:from-rose-600 hover:to-rose-700 text-white shadow-rose-500/10 focus:ring-rose-500/30',
      textAccent: 'text-rose-450',
      bulletIcon: 'text-rose-500'
    },
    purple: {
      gradient: 'from-purple-500/20 via-[#100A14] to-[#0B070E]',
      border: 'border-purple-500/30',
      badge: 'bg-purple-500/15 text-purple-400 border-purple-500/20',
      button: 'bg-gradient-to-r from-purple-500 to-purple-600 hover:from-purple-600 hover:to-purple-700 text-white shadow-purple-500/10 focus:ring-purple-500/30',
      textAccent: 'text-purple-400',
      bulletIcon: 'text-purple-500'
    },
    dark: {
      gradient: 'from-zinc-850 via-[#0A0A0C] to-[#020203]',
      border: 'border-zinc-800',
      badge: 'bg-zinc-800 text-zinc-300 border-zinc-700',
      button: 'bg-gradient-to-r from-zinc-100 to-zinc-300 hover:from-white hover:to-zinc-200 text-black shadow-white/5 focus:ring-white/20',
      textAccent: 'text-white',
      bulletIcon: 'text-zinc-400'
    }
  };

  const currentTheme = themes[config.theme] || themes.amber;

  // Parse content paragraphs
  const contentParagraphs = config.content.split('\n');

  return (
    <AnimatePresence>
      <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
        
        {/* Backdrop overlay */}
        <motion.div
          id="promotional_backdrop"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          onClick={handleClose}
          className="absolute inset-0 bg-black/85 backdrop-blur-md cursor-pointer"
        />

        {/* Modal body container */}
        <motion.div
          id="promotional_modal_body"
          initial={{ opacity: 0, scale: 0.95, y: 20 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.95, y: 20 }}
          transition={{ type: 'spring', duration: 0.5 }}
          className={`relative w-full max-w-5xl overflow-hidden rounded-3xl border ${currentTheme.border} bg-gradient-to-b ${currentTheme.gradient} shadow-2xl shadow-black/95 flex flex-col`}
        >
          {/* Header Banner Image / Vector Graphic */}
          {config.imageUrl ? (
            <div className="relative w-full h-52 sm:h-64 md:h-80 overflow-hidden shrink-0 border-b border-zinc-900/60">
              <img 
                src={config.imageUrl} 
                alt="Promotion" 
                className="w-full h-full object-cover object-center filter brightness-95 saturate-[1.15]" 
                referrerPolicy="no-referrer"
              />
              <div className="absolute inset-0 bg-gradient-to-t from-black via-black/30 to-transparent" />
            </div>
          ) : (
            // Custom Visual Representation based on Popup Type
            <div className="relative w-full h-44 sm:h-52 md:h-60 shrink-0 flex flex-col items-center justify-center overflow-hidden border-b border-zinc-900/50">
              {/* Abstract decorative glowing lights */}
              <div className="absolute inset-0 bg-gradient-to-r from-amber-500/10 via-purple-500/5 to-cyan-500/10 filter blur-xl opacity-80" />
              <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_center,rgba(255,255,255,0.02),transparent)]" />
              
              {popupType === 'celebration' ? (
                <div className="relative flex flex-col items-center scale-110 sm:scale-125">
                  {/* Decorative confetti particles */}
                  <div className="absolute -top-6 -left-16 text-amber-450 animate-bounce text-xl">🎉</div>
                  <div className="absolute -top-8 -right-14 text-cyan-400 animate-pulse text-xl">✨</div>
                  <div className="absolute top-10 -left-12 text-pink-500 text-base">✦</div>
                  <div className="absolute top-12 -right-14 text-emerald-400 text-base">★</div>
                  
                  {/* Glowing central ring */}
                  <div className="relative p-5 rounded-full bg-amber-500/10 border border-amber-500/20 shadow-lg shadow-amber-500/5 flex items-center justify-center">
                    <Trophy className="w-14 h-14 text-amber-450 animate-pulse" strokeWidth={1.5} />
                  </div>
                </div>
              ) : popupType === 'announcement' ? (
                <div className="relative flex flex-col items-center scale-110 sm:scale-125">
                  <div className="relative p-5 rounded-full bg-cyan-500/10 border border-cyan-500/20 flex items-center justify-center">
                    <Megaphone className="w-12 h-12 text-cyan-400" strokeWidth={1.5} />
                  </div>
                </div>
              ) : (
                <div className="relative flex flex-col items-center scale-110 sm:scale-125">
                  <div className="relative p-5 rounded-full bg-amber-500/10 border border-amber-500/20 flex items-center justify-center">
                    <Sparkles className="w-12 h-12 text-amber-400 animate-pulse" strokeWidth={1.5} />
                  </div>
                </div>
              )}
            </div>
          )}

          {/* Close Action Trigger */}
          <button
            type="button"
            id="btn_close_promo"
            onClick={handleClose}
            className="absolute top-4 right-4 z-10 p-2 text-zinc-400 hover:text-white rounded-full bg-black/60 hover:bg-zinc-900 border border-zinc-800 backdrop-blur-md transition-all active:scale-95 cursor-pointer"
          >
            <X size={18} />
          </button>

          {/* Modal Main Content Workspace */}
          <div className="px-6 sm:px-10 pb-8 pt-6 text-left space-y-5">
            
            {/* Badge & Sub-title */}
            <div className="flex flex-col gap-2.5 items-start">
              {config.badgeText && (
                <span className={`text-[10px] font-black uppercase tracking-widest font-mono px-3 py-1.5 rounded-md border ${currentTheme.badge}`}>
                  {config.badgeText}
                </span>
              )}
              
              <h3 className="text-2xl sm:text-3xl md:text-4xl font-black text-white uppercase tracking-tight font-display leading-tight">
                {config.title}
              </h3>
              
              {config.subtitle && (
                <p className="text-xs sm:text-sm text-zinc-400 font-medium">
                  {config.subtitle}
                </p>
              )}
            </div>

            {/* Content paragraph lists parsed on the fly */}
            <div className="space-y-3 bg-zinc-950/40 border border-zinc-900/60 rounded-2xl p-5 max-h-72 sm:max-h-80 overflow-y-auto custom-scrollbar leading-relaxed">
              {contentParagraphs.map((para, idx) => {
                const isBullet = para.startsWith('✅') || para.startsWith('-') || para.startsWith('*');
                let cleanText = para;
                if (isBullet) {
                  cleanText = para.replace(/^[✅\-*]\s*/, '');
                }

                if (!para.trim()) return <div key={idx} className="h-2" />;

                return (
                  <div key={idx} className="flex items-start gap-2.5 text-xs sm:text-sm text-zinc-350 font-sans">
                    {isBullet ? (
                      <span className={`shrink-0 text-sm sm:text-base ${currentTheme.bulletIcon}`}>
                        {para.startsWith('✅') ? '✅' : '✦'}
                      </span>
                    ) : null}
                    <p className={`flex-1 font-light ${!isBullet ? 'text-zinc-300' : 'text-white font-medium'}`}>
                      {cleanText}
                    </p>
                  </div>
                );
              })}
            </div>

            {/* Action Area & Opt Out Checkbox */}
            <div className="space-y-5 pt-2">
              
              {/* Optional Call To Action Button */}
              {hasActionButton ? (
                <button
                  type="button"
                  id="btn_promo_cta"
                  onClick={handleAction}
                  className={`w-full py-4 px-6 font-mono text-xs sm:text-sm font-black uppercase tracking-widest rounded-2xl transition-all shadow-lg focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-offset-black hover:scale-[1.01] active:scale-98 flex items-center justify-center gap-2 cursor-pointer ${currentTheme.button}`}
                >
                  <span>{config.buttonText || (language === 'pt' ? 'Ver Oferta' : 'View Offer')}</span>
                  <ArrowRight size={16} />
                </button>
              ) : (
                // Simply a large "Close/Confirm" button if it's an announcement without action link
                <button
                  type="button"
                  id="btn_promo_dismiss"
                  onClick={handleClose}
                  className="w-full py-4 px-6 font-mono text-xs sm:text-sm font-black uppercase tracking-widest rounded-2xl transition-all bg-zinc-850 hover:bg-zinc-800 text-white hover:scale-[1.01] active:scale-98 flex items-center justify-center cursor-pointer border border-zinc-800"
                >
                  <span>{language === 'pt' ? 'Entendido / Fechar' : 'Understood / Close'}</span>
                </button>
              )}

              {/* "Don't show again" Checkbox Option */}
              <div className="flex items-center justify-center gap-2 select-none pt-1">
                <label className="flex items-center gap-2.5 cursor-pointer group py-1.5 px-4 rounded-xl bg-black/40 border border-zinc-800/80 hover:border-amber-500/40 transition-all">
                  <div className="relative flex items-center justify-center">
                    <input
                      type="checkbox"
                      id="chk_dont_show_again"
                      checked={dontShowAgain}
                      onChange={(e) => handleToggleDontShowAgain(e.target.checked)}
                      className="sr-only"
                    />
                    <div className={`w-5 h-5 rounded-md border-2 transition-all flex items-center justify-center ${
                      dontShowAgain 
                        ? 'bg-amber-500 border-amber-400 text-black shadow-md shadow-amber-500/20' 
                        : 'bg-zinc-950 border-zinc-700 group-hover:border-zinc-500'
                    }`}>
                      {dontShowAgain && (
                        <svg className="w-3.5 h-3.5 stroke-current stroke-[3.5] fill-none" viewBox="0 0 24 24">
                          <polyline points="20 6 9 17 4 12" />
                        </svg>
                      )}
                    </div>
                  </div>
                  <span className={`text-xs font-mono font-bold transition-colors ${
                    dontShowAgain ? 'text-amber-400' : 'text-zinc-400 group-hover:text-zinc-200'
                  }`}>
                    {config.dontShowAgainText || (language === 'pt' ? 'Não mostrar este anúncio hoje' : "Don't show this ad again today")}
                  </span>
                </label>
              </div>

            </div>

          </div>
        </motion.div>
      </div>
    </AnimatePresence>
  );
};
