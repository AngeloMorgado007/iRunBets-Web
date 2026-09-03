import React, { useState, useEffect } from 'react';
import { useLanguage } from '../services/LanguageContext';

interface PushAlert {
  id: string;
  title: string;
  message: string;
  sentAt: string;
  status: string;
}

const FloatingPushNotifier: React.FC = () => {
  const { language } = useLanguage();
  const [activeAlert, setActiveAlert] = useState<PushAlert | null>(null);
  const [isMinimized, setIsMinimized] = useState(false);
  const [isVisible, setIsVisible] = useState(false);

  // Translations
  const translations = {
    pt: {
      alertTitle: "🔔 ALERTA DE MERCADO EM REAL-TIME",
      dismiss: "Dispensar",
      open: "Ver Alerta",
      channelsTitle: "iRunBets Live Feed"
    },
    en: {
      alertTitle: "🔔 REAL-TIME MARKET ALERT",
      dismiss: "Dismiss",
      open: "View Alert",
      channelsTitle: "iRunBets Live Feed"
    },
    fr: {
      alertTitle: "🔔 ALERTE DE MARCHÉ EN TEMPS RÉEL",
      dismiss: "Ignorer",
      open: "Consulter l'alerte",
      channelsTitle: "iRunBets Live Feed"
    },
    it: {
      alertTitle: "🔔 AVVISO DI MERCATO IN TEMPO REALE",
      dismiss: "Ignora",
      open: "Vedi avviso",
      channelsTitle: "iRunBets Live Feed"
    },
    de: {
      alertTitle: "🔔 ECHTZEIT-MARKTALARM",
      dismiss: "Ausblenden",
      open: "Alarm ansehen",
      channelsTitle: "iRunBets Live Feed"
    }
  };

  const labels = translations[language as keyof typeof translations] || translations.pt;

  // Show alert logic
  const triggerAlertDisplay = (alert: PushAlert) => {
    setActiveAlert(alert);
    setIsMinimized(false);
    setIsVisible(true);
    // Auto-dismiss after 15 seconds if not minimized
    const timer = setTimeout(() => {
      // Don't auto-dismiss if user interacts or if it's already minimized
    }, 15000);
    return () => clearTimeout(timer);
  };

  useEffect(() => {
    // 1. Initial check: Load the latest alert from localStorage to show as an entry notification!
    try {
      const stored = localStorage.getItem('irunbets_push_alerts');
      if (stored) {
        const parsed = JSON.parse(stored) as PushAlert[];
        if (parsed && parsed.length > 0) {
          // Check if this alert was already dismissed during this session
          const dismissedId = sessionStorage.getItem('irunbets_dismissed_alert_id');
          if (dismissedId !== parsed[0].id) {
            // Show the latest alert after a small delay on load
            const timer = setTimeout(() => {
              triggerAlertDisplay(parsed[0]);
            }, 3000);
            return () => clearTimeout(timer);
          }
        }
      }
    } catch (err) {
      console.error('Error reading push alerts in notifier:', err);
    }
  }, []);

  useEffect(() => {
    // 2. Setup standard listener for real-time events sent from the Backoffice admin page in the same session
    const handleNewPush = (e: Event) => {
      const customEvent = e as CustomEvent<PushAlert>;
      if (customEvent && customEvent.detail) {
        triggerAlertDisplay(customEvent.detail);
      }
    };

    window.addEventListener('irunbets_new_push', handleNewPush);
    return () => {
      window.removeEventListener('irunbets_new_push', handleNewPush);
    };
  }, []);

  const handleDismiss = () => {
    setIsVisible(false);
    if (activeAlert) {
      sessionStorage.setItem('irunbets_dismissed_alert_id', activeAlert.id);
    }
    // Small delay to clear state
    setTimeout(() => {
      setActiveAlert(null);
    }, 400);
  };

  if (!activeAlert || !isVisible) return null;

  return (
    <div className="fixed bottom-6 right-6 z-50 max-w-sm w-full mx-4 sm:mx-0 animate-fade-in-up">
      
      {/* Background shadow & lighting */}
      <div className="absolute -inset-1 rounded-2xl bg-gradient-to-r from-orange-500/30 to-amber-500/30 blur-md pointer-events-none"></div>

      <div className="relative bg-[#121216]/95 border border-orange-500/40 rounded-2xl p-4 shadow-2xl backdrop-blur-xl text-white">
        
        {/* Header/Close button row */}
        <div className="flex items-center justify-between mb-2">
          <div className="flex items-center gap-1.5">
            <span className="w-2 h-2 rounded-full bg-emerald-500 animate-ping"></span>
            <span className="text-[10px] uppercase tracking-widest font-extrabold text-orange-400 font-mono">
              {labels.alertTitle}
            </span>
          </div>
          <button 
            onClick={handleDismiss}
            className="text-zinc-500 hover:text-white transition-colors p-1 rounded-lg hover:bg-white/5 cursor-pointer"
            title={labels.dismiss}
          >
            <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2.5} stroke="currentColor" className="w-4 h-4">
              <path strokeLinecap="round" strokeLinejoin="round" d="M6 18 18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        {/* Content body */}
        <div className="flex gap-3 mt-1">
          {/* Circular alert bell icon */}
          <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-orange-500/20 to-amber-500/10 border border-orange-500/30 flex items-center justify-center text-lg flex-shrink-0 animate-pulse">
            🔔
          </div>

          <div className="flex-1 min-w-0">
            <h4 className="text-xs font-bold text-zinc-100 mb-1 leading-snug">
              {activeAlert.title}
            </h4>
            <p className="text-[11px] text-zinc-300 leading-relaxed font-light break-words">
              {activeAlert.message}
            </p>
            
            {/* Timestamp */}
            <div className="flex items-center justify-between mt-3 text-[9px] text-zinc-500 font-mono">
              <span>{labels.channelsTitle}</span>
              <span>{new Date(activeAlert.sentAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
            </div>
          </div>
        </div>

      </div>
    </div>
  );
};

export default FloatingPushNotifier;
