import React, { useState, useEffect } from 'react';
import { useLanguage } from '../services/LanguageContext';

interface NotificationItem {
  id: string;
  type: 'goal' | 'value_tip' | 'stats_alert';
  time: string;
  match: string;
  title: string;
  message: string;
  longMessage?: string;
  odd?: string;
  ev?: string;
  isNew?: boolean;
  templateKey?: string;
}

const INITIAL_NOTIFICATIONS: NotificationItem[] = [
  {
    id: 'n1',
    templateKey: 'n1',
    type: 'goal',
    time: 'Agora',
    match: 'Sporting CP vs Braga',
    title: '⚽ LIVE GOLO ALERT (78\' Min)',
    message: 'Golo de Sporting CP! Sporting 2-1 SC Braga. O golo reduz a probabilidade de empate para apenas 11.2%.',
    odd: '1.45',
    ev: '+6.2%'
  },
  {
    id: 'n2',
    templateKey: 'n2',
    type: 'value_tip',
    time: 'Há 2 min',
    match: 'Arsenal vs Everton',
    title: '🔔 TIP DE VALOR BRUTO (+EV)',
    message: 'Os algoritmos detetaram um desvio no mercado de Cantos Mais de 9.5. Projeção IA indica 11.4 cantos na partida.',
    odd: '2.05',
    ev: '+14.8%'
  },
  {
    id: 'n3',
    templateKey: 'n3',
    type: 'stats_alert',
    time: 'Há 10 min',
    match: 'Inter de Milão vs Juventus',
    title: '📊 REDUÇÃO DE RITMO DETETADA',
    message: 'Estatísticas de remates enquadrados caíram 45% nos últimos 15 min. Valor matemático indicado para Menos de 2.5 Golos.',
    odd: '1.80',
    ev: '+9.3%'
  }
];

const POOLS_OF_MOCK_NOTIFICATIONS: Partial<NotificationItem>[] = [
  {
    type: 'goal',
    templateKey: 'p1',
    match: 'Real Madrid vs Atl. Madrid',
    title: '⚽ LIVE GOLO ALERT (89\' Min)',
    message: 'Golo de Real Madrid! Real Madrid 1-0 Atl. Madrid. Pressão cumulativa resolve a partida de acordo com o modelo.',
    odd: '1.22',
    ev: '+4.1%'
  },
  {
    type: 'value_tip',
    templateKey: 'p2',
    match: 'PSG vs Lyon',
    title: '🔔 TIP DE VALOR BRUTO (+EV)',
    message: 'Desvio de mercado encontrado para Vitória do Lyon ou Empate (Dupla Possibilidade). Valor matemático +EV no limite.',
    odd: '2.62',
    ev: '+18.1%'
  },
  {
    type: 'goal',
    templateKey: 'p3',
    match: 'Chelsea vs Aston Villa',
    title: '⚽ LIVE GOLO ALERT (44\' Min)',
    message: 'Golo de Aston Villa! Chelsea 0-1 Aston Villa. Contra-ataque veloz desconstrói a odd implícita das casas.',
    odd: '2.10',
    ev: '+12.4%'
  },
  {
    type: 'stats_alert',
    templateKey: 'p4',
    match: 'FC Porto vs Boavista',
    title: '📊 PRESSÃO OFENSIVA EXTREMA',
    message: 'FC Porto registou 7 remates a balizar em 10 min. Entrada recomendada no mercado "Próxima Equipa a Marcar".',
    odd: '1.65',
    ev: '+15.2%'
  }
];

const NOTIFS_BY_LANG: Record<string, Record<string, string>> = {
  pt: {
    n1_title: "⚽ LIVE GOLO ALERT (78' Min)",
    n1_msg: "Golo de Sporting CP! Sporting 2-1 SC Braga. O golo reduz a probabilidade de empate para apenas 11.2%.",
    n2_title: "🔔 TIP DE VALOR BRUTO (+EV)",
    n2_msg: "Os algoritmos detetaram um desvio no mercado de Cantos Mais de 9.5. Projeção IA indica 11.4 cantos na partida.",
    n3_title: "📊 REDUÇÃO DE RITMO DETETADA",
    n3_msg: "Estatísticas de remates enquadrados caíram 45% nos últimos 15 min. Valor matemático indicado para Menos de 2.5 Golos.",
    p1_title: "⚽ LIVE GOLO ALERT (89' Min)",
    p1_msg: "Golo de Real Madrid! Real Madrid 1-0 Atl. Madrid. Pressão cumulativa resolve a partida de acordo com o modelo.",
    p2_title: "🔔 TIP DE VALOR BRUTO (+EV)",
    p2_msg: "Desvio de mercado encontrado para Vitória do Lyon ou Empate (Dupla Possibilidade). Valor matemático +EV no limite.",
    p3_title: "⚽ LIVE GOLO ALERT (44' Min)",
    p3_msg: "Golo de Aston Villa! Chelsea 0-1 Aston Villa. Contra-ataque veloz desconstrói a odd implícita das casas.",
    p4_title: "📊 PRESSÃO OFENSIVA EXTREMA",
    p4_msg: "FC Porto registou 7 remates a balizar em 10 min. Entrada recomendada no mercado 'Próxima Equipa a Marcar'.",
  },
  en: {
    n1_title: "⚽ LIVE GOAL ALERT (78' Min)",
    n1_msg: "Goal for Sporting CP! Sporting 2-1 SC Braga. This goal drops the draw probability to only 11.2%.",
    n2_title: "🔔 VALUE TIP EXTRA EV (+EV)",
    n2_msg: "Algorithms detected market bias on Corners Over 9.5. AI projection indicates 11.4 corners in this match.",
    n3_title: "📊 PACE REDUCTION DETECTED",
    n3_msg: "Shots on target dropped by 45% in the last 15 min. Mathematical value indicated for Under 2.5 Goals.",
    p1_title: "⚽ LIVE GOAL ALERT (89' Min)",
    p1_msg: "Goal for Real Madrid! Real Madrid 1-0 Atl. Madrid. Accumulative pressure secures victory according to the model.",
    p2_title: "🔔 VALUE TIP EXTRA EV (+EV)",
    p2_msg: "Market bias spotted for Lyon Win or Draw (Double Chance). Mathematical edge +EV on premium limit.",
    p3_title: "⚽ LIVE GOAL ALERT (44' Min)",
    p3_msg: "Goal for Aston Villa! Chelsea 0-1 Aston Villa. Fast counter-attack deconstructs the implicit odds.",
    p4_title: "📊 EXTREME ATTACK PRESSURE",
    p4_msg: "FC Porto registered 7 shots on target in 10 mins. Recommended entry on 'Next Team to Score' market.",
  },
  fr: {
    n1_title: "⚽ LIVE ALERTE BUT (78' Min)",
    n1_msg: "But de Sporting CP ! Sporting 2-1 SC Braga. Le but réduit la probabilité de match nul à seulement 11.2%.",
    n2_title: "🔔 TIP DE VALEUR BRUTE (+EV)",
    n2_msg: "Les algorithmes ont détecté un écart sur le marché des Corners Plus de 9.5. Projection IA à 11.4 corners.",
    n3_title: "📊 BAISSE DE RYTHME IN-GAME",
    n3_msg: "Les tirs cadrés ont diminué de 45% depuis 15 min. Valeur mathématique pour Moins de 2.5 Buts.",
    p1_title: "⚽ LIVE ALERTE BUT (89' Min)",
    p1_msg: "But de Real Madrid ! Real Madrid 1-0 Atl. Madrid. La pression cumulative l'emporte selon le modèle.",
    p2_title: "🔔 TIP DE VALEUR BRUTE (+EV)",
    p2_msg: "Écart identifié sur Victoire Lyon ou Nul. Valeur mathématique +EV très avantageuse.",
    p3_title: "⚽ LIVE ALERTE BUT (44' Min)",
    p3_msg: "But de Aston Villa ! Chelsea 0-1 Aston Villa. Une contre-attaque rapide déjoue les cotes du bookmaker.",
    p4_title: "📊 PRESSION OFFENSIVE INTENSE",
    p4_msg: "Porto a enregistré 7 tirs cadrés en 10 min. Option Value recommandée : 'Prochaine Équipe à Marquer'.",
  },
  it: {
    n1_title: "⚽ REALE ALLERTA GOL (78' Min)",
    n1_msg: "Gol del Sporting CP! Sporting 2-1 SC Braga. Il gol riduce la probabilità di pareggio all'11.2%.",
    n2_title: "🔔 PRONOSTICO DI VALORE (+EV)",
    n2_msg: "I nostri algoritmi segnalano sottomercato Angoli Over 9.5. Proiezione IA indica 11.4 corner.",
    n3_title: "📊 RITMO DI GIOCO IN CALO",
    n3_msg: "Tiri in porta scesi del 45% negli ultimi 15 minuti. Quota di valore indicata per Under 2.5 Gol.",
    p1_title: "⚽ REALE ALLERTA GOL (89' Min)",
    p1_msg: "Gol del Real Madrid! Real Madrid 1-0 Atl. Madrid. Schema tattico perfetto secondo il modello.",
    p2_title: "🔔 PRONOSTICO DI VALORE (+EV)",
    p2_msg: "Quota vantaggiosa per Doppia Chance 1X (Lione o Pareggio). Valore EV elevato.",
    p3_title: "⚽ REALE ALLERTA GOL (44' Min)",
    p3_msg: "Gol dell'Aston Villa! Chelsea 0-1 Aston Villa. Contropiede rapido sconvolge le quote stimate.",
    p4_title: "📊 PRESSIONE ACCELERATA IA",
    p4_msg: "Il Porto registra 7 tiri in 10 minuti. Segnale ottimale per: 'Prossimo Gol (Porto)'.",
  },
  de: {
    n1_title: "⚽ LIVE-TORALARM (78' Min.)",
    n1_msg: "Tor für Sporting CP! Sporting 2-1 SC Braga. Die Unentschieden-Quote fällt auf nur noch 11.2%.",
    n2_title: "🔔 MATHEMATISCHER-TIPP (+EV)",
    n2_msg: "Quoten-Abweichung bei Ecken Über 9.5 erkannt. Die Prognose kündigt mindestens 11.4 Ecken an.",
    n3_title: "📊 SPIELDYNAMIK VERLANGSAMT",
    n3_msg: "Torschüsse sanken in den letzten 15 Min. um 45%. Starker Erwartungswert für Unter 2.5 Tore.",
    p1_title: "⚽ LIVE-TORALARM (89' Min.)",
    p1_msg: "Tor für Real Madrid! Real Madrid 2-1 Atl. Madrid. Später Treffer bestätigt die mathematische Überlegenheit.",
    p2_title: "🔔 MATHEMATISCHER-TIPP (+EV)",
    p2_msg: "Einstiegsempfehlung für Doppelte Chance (Lyon oder Unentschieden). Quotenbias am Höchstwert.",
    p3_title: "⚽ LIVE-TORALARM (44' Min.)",
    p3_msg: "Tor für Aston Villa! Chelsea 0-1 Aston Villa. Schneller Konter knackt die Wettquote des Buchmachers.",
    p4_title: "📊 EXTREMER DRUCK AM SEKTOR",
    p4_msg: "FC Porto mit 7 Torschüssen in nur 10 Minuten. Tippempfehlung: 'Nächstes Tor (FC Porto)'.",
  }
};

const PushSimulator: React.FC = () => {
  const { language } = useLanguage();
  const [notifications, setNotifications] = useState<NotificationItem[]>([]);
  const [expandedIds, setExpandedIds] = useState<Record<string, boolean>>({});
  const [currentTime, setCurrentTime] = useState<string>('');
  const [currentDateState, setCurrentDateState] = useState<string>('');

  useEffect(() => {
    const updateTime = () => {
      const now = new Date();
      const timeString = now.toLocaleTimeString('pt-PT', {
        hour: '2-digit',
        minute: '2-digit',
        hour12: false,
      });
      setCurrentTime(timeString);

      const localeMap = {
        pt: 'pt-PT',
        en: 'en-US',
        fr: 'fr-FR',
        it: 'it-IT',
        de: 'de-DE'
      };
      const currentLocale = localeMap[language as keyof typeof localeMap] || 'pt-PT';
      
      const options: Intl.DateTimeFormatOptions = { weekday: 'long', day: 'numeric', month: 'long' };
      let formattedDate = now.toLocaleDateString(currentLocale, options);
      if (formattedDate) {
        // Remove trailing period some locales add to weekdays/months or capitalize correctly
        formattedDate = formattedDate.charAt(0).toUpperCase() + formattedDate.slice(1);
      }
      setCurrentDateState(formattedDate);
    };

    updateTime();
    const timer = setInterval(updateTime, 1000);
    return () => clearInterval(timer);
  }, [language]);

  const labelsMap = {
    pt: {
      badge: 'FLASHSCORE REINVENTADO',
      title: 'Notificações Push Inteligentes',
      desc1: 'Sente a pulsação do futebol em direto com alertas de precisão cirúrgica enviados diretamente para o ecrã bloqueado do teu telemóvel.',
      desc2: 'Não enviamos palpites aleatórios ou sem base científica. Simulando o ecossistema Flashscore de velocidade máxima, a iRunBets avisa-te do segundo exato de golos cruciais, quedas repentinas de volume de mercado e oportunidades de apostas com odd de alto valor bruto (+EV) justificadas por probabilidade pura.',
      simulateBtn: 'Simular Nova Notificação',
      resetBtn: 'Limpar Simulador',
      liveFeed: 'irunbets_live_feed',
      statsLabel: 'Apostas Ativas: 42 • Sinais Hoje: 12',
      lockScreenTime: '21:34',
      lockScreenDate: 'Quarta-feira, 27 de Maio',
      oddLabel: 'Odd:',
      edgeLabel: 'Vantagem:',
      noNotifs: 'Nenhuma notificação enviada nas últimas 48 horas. Dispare novos alertas a partir do Painel de Admin para simulá-los aqui!',
    },
    en: {
      badge: 'FLASHSCORE REINVENTED',
      title: 'Smart Push Notifications',
      desc1: 'Feel the heartbeat of live football with surgical precision alerts sent straight to your phone\'s lock screen.',
      desc2: 'We do not send random or unscientific tips. Simulating the high-speed Flashscore ecosystem, iRunBets alerts you the exact second of crucial goals, sudden market volume drops, and high expected value (+EV) betting opportunities backed by pure probability.',
      simulateBtn: 'Simulate New Notification',
      resetBtn: 'Clear Simulator',
      liveFeed: 'irunbets_live_feed',
      statsLabel: 'Active Bets: 42 • Signals Today: 12',
      lockScreenTime: '21:34',
      lockScreenDate: 'Wednesday, May 27th',
      oddLabel: 'Odd:',
      edgeLabel: 'Edge:',
      noNotifs: 'No notifications sent in the last 48 hours. Dispatch new alerts from the Admin panel to simulate them here!',
    },
    fr: {
      badge: 'FLASHSCORE RÉINVENTÉ',
      title: 'Notifications Push Intelligentes',
      desc1: 'Ressentez la pulsation du football en direct grâce à des alertes d\'une précision chirurgicale envoyées directement sur l\'écran verrouillé de votre téléphone.',
      desc2: 'Nous n\'envoyons pas de pronostics aléatoires ou sans fondement scientifique. En simulant l\'écosystème Flashscore ultra-rapide, iRunBets vous prévient à la seconde près de buts cruciaux, de chutes soudaines de cotes et d\'opportunités (+EV) mathématiquement justifiées.',
      simulateBtn: 'Simuler une Notification',
      resetBtn: 'Effacer le simulateur',
      liveFeed: 'irunbets_live_feed',
      statsLabel: 'Paris Actifs : 42 • Signaux : 12',
      lockScreenTime: '21:34',
      lockScreenDate: 'Mercredi 27 Mai',
      oddLabel: 'Cote :',
      edgeLabel: 'Avantage :',
      noNotifs: 'Aucune notification envoyée au cours des dernières 48 heures. Lancez de nouvelles alertes depuis le panneau d\'administration !',
    },
    it: {
      badge: 'FLASHSCORE REINVENTATO',
      title: 'Notifiche Push Intelligenti',
      desc1: 'Senti il battito del calcio live con avvisi di precisione chirurgica inviati istantaneamente sul blocco schermo del tuo smartphone.',
      desc2: 'Non inviamo pronostici casuali o privi di fondamento scientifico. Emulatori dell\'ecosistema Flashscore per massima rapidità, iRunBets ti avvisa in tempo reale di gol determinanti, cali di quota improvvisi e imperdibili mercati con valore atteso (+EV).',
      simulateBtn: 'Simula Nuova Notifica',
      resetBtn: 'Azzera simulatore',
      liveFeed: 'irunbets_live_feed',
      statsLabel: 'Scommesse Attive: 42 • Segnali Oggi: 12',
      lockScreenTime: '21:34',
      lockScreenDate: 'Mercoledì 27 Maggio',
      oddLabel: 'Quota:',
      edgeLabel: 'Margine:',
      noNotifs: 'Nessuna notifica inviata nelle ultime 48 ore. Invia nuovi avvisi dal pannello di amministrazione per simularli qui!',
    },
    de: {
      badge: 'FLASHSCORE NEU ERFUNDEN',
      title: 'Smarte Push-Benachrichtigungen',
      desc1: 'Spüre das Pulsieren des Live-Fußballs mit mathematisch präzisen Quoten-Alarmen direkt auf dem Sperrbildschirm deines Smartphones.',
      desc2: 'Wir senden dir keine unzuverlässigen Spielprognosen. Inspiriert durch die Geschwindigkeit des Flashscore-Feeds meldet dir iRunBets Tore, plötzliche Marktvolumen-Veränderungen und hochattraktive Value-Wetten (+EV).',
      simulateBtn: 'Benachrichtigung simulieren',
      resetBtn: 'Simulator leeren',
      liveFeed: 'irunbets_live_feed',
      statsLabel: 'Aktive Wetten: 42 • Signale Heute: 12',
      lockScreenTime: '21:34',
      lockScreenDate: 'Mittwoch, 27. Mai',
      oddLabel: 'Quote:',
      edgeLabel: 'Vorteil:',
      noNotifs: 'Keine Benachrichtigungen in den letzten 48 Stunden gesendet. Senden Sie neue Alarme aus dem Admin-Bereich!',
    }
  };
  const labels = labelsMap[language as keyof typeof labelsMap] || labelsMap.pt;

  // Dynamic relative time formatting helper
  const formatRelativeTime = (sentAt: string, lang: string): string => {
    const diffMs = Date.now() - new Date(sentAt).getTime();
    const diffMins = Math.floor(diffMs / 60000);
    const diffHours = Math.floor(diffMins / 60);

    const t = {
      pt: {
        now: 'Agora',
        min: 'Há 1 min',
        mins: 'Há {0} min',
        hour: 'Há 1 hora',
        hours: 'Há {0} horas',
      },
      en: {
        now: 'Now',
        min: '1 min ago',
        mins: '{0} mins ago',
        hour: '1 hour ago',
        hours: '{0} hours ago',
      },
      fr: {
        now: "À l'instant",
        min: 'Il y a 1 min',
        mins: 'Il y a {0} min',
        hour: 'Il y a 1 heure',
        hours: 'Il y a {0} heures',
      },
      it: {
        now: 'Adesso',
        min: '1 min fa',
        mins: '{0} min fa',
        hour: '1 ora fa',
        hours: '{0} ore fa',
      },
      de: {
        now: 'Gerade eben',
        min: 'Vor 1 Min.',
        mins: 'Vor {0} Min.',
        hour: 'Vor 1 Std.',
        hours: 'Vor {0} Std.',
      }
    }[lang as 'pt' | 'en' | 'fr' | 'it' | 'de'] || {
      now: 'Agora',
      min: 'Há 1 min',
      mins: 'Há {0} min',
      hour: 'Há 1 hora',
      hours: 'Há {0} horas',
    };

    if (diffMins < 1) return t.now;
    if (diffMins === 1) return t.min;
    if (diffMins < 60) return t.mins.replace('{0}', String(diffMins));
    if (diffHours === 1) return t.hour;
    if (diffHours < 24) return t.hours.replace('{0}', String(diffHours));
    
    // Diff in days
    const diffDays = Math.floor(diffHours / 24);
    if (lang === 'pt') return `Há ${diffDays} dia${diffDays > 1 ? 's' : ''}`;
    if (lang === 'en') return `${diffDays} day${diffDays > 1 ? 's' : ''} ago`;
    if (lang === 'fr') return `Il y a ${diffDays} jour${diffDays > 1 ? 's' : ''}`;
    if (lang === 'it') return `${diffDays} giorn${diffDays > 1 ? 'o' : 'i'} fa`;
    if (lang === 'de') return `Vor ${diffDays} Tag${diffDays > 1 ? 'en' : ''}`;
    
    return 'Agora';
  };

  // Main loader and dynamic 48-hour auto-exclusion agent routine
  const loadAndFilterPushAlerts = () => {
    try {
      const raw = localStorage.getItem('irunbets_push_alerts');
      if (!raw) {
        setNotifications([]);
        return;
      }
      
      const parsed = JSON.parse(raw) as any[];
      const fortyEightHoursAgo = Date.now() - 2 * 24 * 60 * 60 * 1000; // 2 days limit
      
      // Filter out: 1) Expired alerts (> 48 hours), 2) Empty IDs, 3) Demo placeholder IDs
      const activeAlerts = parsed.filter(alert => {
        if (!alert || !alert.id) return false;
        
        // Exclude specific default demo IDs
        const isDemo = alert.id === 'push_1' || alert.id === 'push_2' || alert.id === 'n1' || alert.id === 'n2' || alert.id === 'n3';
        if (isDemo) return false;
        
        const timestamp = alert.sentAt ? new Date(alert.sentAt).getTime() : Date.now();
        const isExpired = timestamp < fortyEightHoursAgo;
        return !isExpired;
      });

      // Write back immediately to the localStorage to execute auto-exclusion permanently!
      if (activeAlerts.length !== parsed.length) {
        localStorage.setItem('irunbets_push_alerts', JSON.stringify(activeAlerts));
      }

      // Map dynamic UI relative time properties
      const mappedList: NotificationItem[] = activeAlerts.map(alert => {
        let type: 'goal' | 'value_tip' | 'stats_alert' = 'stats_alert';
        const searchChain = (alert.title + " " + alert.message).toLowerCase();
        
        if (searchChain.includes('golo') || searchChain.includes('goal') || searchChain.includes('marcar')) {
          type = 'goal';
        } else if (searchChain.includes('tip') || searchChain.includes('odd') || searchChain.includes('valor') || searchChain.includes('aposta') || searchChain.includes('ev')) {
          type = 'value_tip';
        }

        // Parse custom features (odds, edge) if present in user message or let it map naturally
        let oddValue: string | undefined = undefined;
        let evValue: string | undefined = undefined;

        // Smart regex parser to extract odds and advantages for realistic rendering inside simulated cards!
        const oddMatch = alert.message.match(/odd[s]?\s*[:de]?\s*([0-9]+\.[0-9]+)/i);
        if (oddMatch && oddMatch[1]) {
          oddValue = oddMatch[1];
        }
        const evMatch = alert.message.match(/(\+[0-9]+(\.[0-9]+)?%)/);
        if (evMatch && evMatch[1]) {
          evValue = evMatch[1];
        }

        return {
          id: alert.id,
          type: type,
          time: formatRelativeTime(alert.sentAt || new Date().toISOString(), language),
          match: '📡 LIVE ALERTA',
          title: alert.title,
          message: alert.message,
          longMessage: alert.longMessage,
          odd: oddValue,
          ev: evValue,
          isNew: alert._justCreated || false
        };
      });

      // Show top 4 notifications
      setNotifications(mappedList.slice(0, 4));
    } catch (e) {
      console.error("Error reading/filtering custom push alerts:", e);
    }
  };

  // Load and filter on mount and also setup dynamic timer to update relative time offsets
  useEffect(() => {
    loadAndFilterPushAlerts();

    // Refresh times every 30 seconds
    const interval = setInterval(() => {
      loadAndFilterPushAlerts();
    }, 30000);

    return () => clearInterval(interval);
  }, [language]);

  // Handle dynamic push notifications dispatched in the active browser session
  useEffect(() => {
    const handleNewPushEvent = (e: Event) => {
      const customEvent = e as CustomEvent;
      if (customEvent && customEvent.detail) {
        // Tag to trigger the smooth entrance scale animation
        customEvent.detail._justCreated = true;
        loadAndFilterPushAlerts();
      }
    };

    window.addEventListener('irunbets_new_push', handleNewPushEvent);
    return () => {
      window.removeEventListener('irunbets_new_push', handleNewPushEvent);
    };
  }, [language]);

  const handleDeleteNotification = (id: string) => {
    try {
      const raw = localStorage.getItem('irunbets_push_alerts');
      if (!raw) return;
      const parsed = JSON.parse(raw) as any[];
      const updated = parsed.filter(alert => alert && alert.id !== id);
      localStorage.setItem('irunbets_push_alerts', JSON.stringify(updated));
      
      // Also update local component state
      setNotifications(prev => prev.filter(n => n.id !== id));
      
      // Dispatch event to make sure other elements sync
      window.dispatchEvent(new Event('irunbets_new_push'));
    } catch (e) {
      console.error("Error deleting individual notification:", e);
    }
  };

  // Clean-up and start over
  const handleClearHistory = () => {
    localStorage.removeItem('irunbets_push_alerts');
    setNotifications([]);
  };

  // Interactive local simulation button
  const triggerNewNotification = () => {
    const sportAlertPools = [
      {
        title: "⚽ GOLO ALERT (Boavista 0-[1] Porto)",
        message: "Golo de Porto! Porto abre o marcador. Modelo indica descida imediata de odd para 1.34."
      },
      {
        title: "🔔 TIP DE VALOR BRUTO (+EV)",
        message: "Desvio detectado para Cantos Mais de 8.5 com odd de 1.85. Projeção IA robusta com vantagem de +11.4%."
      },
      {
        title: "📊 REDUÇÃO DE RITMO DETETADA",
        message: "Estatísticas em direto mostram queda brusca de perigo em Lyon vs Reims. Recomendado Menos de 3.5 golos com odd de 1.62."
      },
      {
        title: "🔥 PRESSÃO OFENSIVA EXTREMA: Braga",
        message: "Braga registou 5 remates nos últimos 6 minutos. Entrada recomendada para Golo Próximo com vantagem de +15.2%."
      }
    ];

    const randomTemplate = sportAlertPools[Math.floor(Math.random() * sportAlertPools.length)];
    const simulatedAlert = {
      id: `push_gen_${Date.now()}`,
      title: randomTemplate.title,
      message: randomTemplate.message,
      sentAt: new Date().toISOString(),
      status: 'Simulado via Simulador'
    };

    try {
      const raw = localStorage.getItem('irunbets_push_alerts') || '[]';
      const parsed = JSON.parse(raw);
      const updated = [simulatedAlert, ...parsed];
      localStorage.setItem('irunbets_push_alerts', JSON.stringify(updated));

      // Trigger standard session wide events
      const customEvent = new CustomEvent('irunbets_new_push', { detail: simulatedAlert });
      window.dispatchEvent(customEvent);
    } catch (e) {
      console.error("Error creating interactive simulation:", e);
    }
  };

  const getCardIcon = (type: string) => {
    switch (type) {
      case 'goal':
        return '⚽';
      case 'value_tip':
        return '🔔';
      default:
        return '📊';
    }
  };

  return (
    <section id="notificacoes" className="relative w-full py-24 bg-[#0E0E11] border-b border-white/5 overflow-hidden">
      
      {/* Background visual highlights */}
      <div className="absolute top-1/2 left-1/4 -translate-y-1/2 w-[500px] h-[500px] glow-orb-blue pointer-events-none opacity-20"></div>

      <div className="max-w-7xl mx-auto px-6 grid grid-cols-1 lg:grid-cols-12 gap-16 items-center">
        
        {/* Left: Interactive Section Title and Controls */}
        <div className="lg:col-span-12 xl:col-span-5 flex flex-col items-start text-left">
          <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-sky-500/10 border border-sky-500/20 text-[10px] font-bold text-sky-400 uppercase tracking-widest mb-4">
            {labels.badge}
          </div>
          <h2 className="text-3xl md:text-5xl font-bold tracking-tight text-white font-display mb-6">
            {labels.title}
          </h2>
          <p className="text-zinc-400 font-light text-base md:text-lg leading-relaxed mb-6">
            {labels.desc1}
          </p>
          <p className="text-zinc-400 font-light text-base md:text-lg leading-relaxed mb-8">
            {labels.desc2}
          </p>

          {/* WEB-SITE COMPACT BANNER: BETANO & BETCLIC REGISTRATION PARTNERS */}
          <div className="w-full p-5 rounded-2xl bg-zinc-950 border border-zinc-800 relative overflow-hidden mb-8 md:mb-0 shadow-2xl">
            <div className="absolute top-0 left-0 w-2 h-full bg-gradient-to-b from-orange-500 via-red-500 to-purple-500"></div>
            
            <span className="text-[9px] font-black uppercase tracking-widest text-[#00f2fe] bg-cyan-950/20 px-2.5 py-1 rounded border border-cyan-900/20 font-mono">
              🎁 {language === 'pt' ? 'DIREITO A BÓNUS EXCLUSIVO' : 'EXCLUSIVE BONUS TRIGGER'}
            </span>
            
            <h3 className="text-lg font-black text-white uppercase tracking-tight font-display mt-3.5 mb-1.5">
              {language === 'pt' ? 'RECOMENDAÇÃO OFICIAL iRUNBETS' : 'iRUNBETS OFFICIAL ALLIANCE'}
            </h3>
            
            <p className="text-[11px] text-zinc-400 font-light leading-relaxed mb-5">
              {language === 'pt' 
                ? 'Garanta as melhores odds ponderadas e os maiores benefícios de boas-vindas registando-se através dos canais verificados oficiais:' 
                : 'Insure highest expected payouts (+EV) and take advantage of direct partner registration offers:'}
            </p>

            <div className="space-y-4">
              {/* Betano Item */}
              <div className="p-3.5 rounded-xl bg-[#121216]/80 border border-zinc-900 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
                <div className="space-y-1">
                  <div className="flex items-center gap-1.5">
                    <span className="text-xs font-black tracking-wider text-orange-500 font-display">BETANO</span>
                    <span className="text-[7.5px] bg-orange-500/10 text-orange-400 px-1.5 py-0.5 rounded font-mono font-bold">PT</span>
                  </div>
                  <p className="text-[10px] text-zinc-400 leading-normal max-w-sm font-light">
                    {language === 'pt' 
                      ? 'Ativação direta de bónus de depósito exclusivo e odds calibradas de alto nível.' 
                      : 'Direct activation of premium bonus matches and industry peak football markets.'}
                  </p>
                </div>
                <a 
                  href="https://www.betano.pt/myaccount/bf/lO9ILtmSEQtxfcQc7UmQ" 
                  target="_blank" 
                  rel="noopener noreferrer"
                  className="px-4 py-2 bg-gradient-to-r from-orange-500 to-orange-600 hover:brightness-110 active:scale-98 text-[10px] font-bold uppercase tracking-wider text-white rounded-lg transition-all shadow-md shadow-orange-500/10 w-full sm:w-auto text-center"
                >
                  {language === 'pt' ? 'Registar Betano' : 'Register Betano'}
                </a>
              </div>

              {/* Betclic Item */}
              <div className="p-3.5 rounded-xl bg-[#121216]/80 border border-zinc-900 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
                <div className="space-y-1">
                  <div className="flex items-center gap-1.5">
                    <span className="text-xs font-black tracking-wider text-red-500 font-display">BETCLIC</span>
                    <span className="text-[7.5px] bg-[#bf5af2]/10 text-[#bf5af2] px-1.5 py-0.5 rounded font-mono font-bold">🎁 15€ GRÁTIS</span>
                  </div>
                  <p className="text-[10px] text-zinc-400 leading-normal max-w-sm font-light">
                    {language === 'pt' 
                      ? 'Garante um bónus de 15€ totalmente grátis no registo! Código Obrigatório: MLRGB2PB' 
                      : 'Claim a €15 completely free registration bonus! Required Promo Code: MLRGB2PB'}
                  </p>
                </div>
                <a 
                  href="https://go.onelink.me/w4we/bc997527?af_sub5=MLRGB2PB" 
                  target="_blank" 
                  rel="noopener noreferrer"
                  className="px-4 py-2 bg-gradient-to-r from-red-600 to-red-700 hover:brightness-110 active:scale-98 text-[10px] font-bold uppercase tracking-wider text-white rounded-lg transition-all shadow-md shadow-red-600/10 w-full sm:w-auto text-center"
                >
                  {language === 'pt' ? 'Ganhar 15€ Grátis' : 'Claim €15 Bonus'}
                </a>
              </div>
            </div>
          </div>

          {/* Control buttons removed to keep homepage clean, now managed in Backoffice control panel */}
        </div>

        {/* Right: iOS Simulated Lockscreen Notification Overlay */}
        <div className="lg:col-span-12 xl:col-span-7 flex justify-center items-center w-full">
          
          <div className="w-full max-w-lg relative">
            <div className="absolute top-0 right-0 w-36 h-36 bg-orange-500/10 rounded-full blur-3xl pointer-events-none"></div>
            
            {/* iOS Styled Simulated Lockscreen Panel */}
            <div className="w-full bg-[#121216]/60 rounded-3xl p-6 border border-white/5 relative backdrop-blur-xl">
              
              {/* Device UI details */}
              <div className="flex justify-between items-center mb-6 text-xs text-zinc-500">
                <div className="flex items-center gap-1.5 font-semibold">
                  <span>{labels.liveFeed}</span>
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-ping"></span>
                </div>
                <div>{labels.statsLabel}</div>
              </div>

              {/* iOS Block Time Indicator */}
              <div className="text-center mb-6">
                <div className="text-5xl font-extralight tracking-tight text-zinc-100 font-display">{currentTime || labels.lockScreenTime}</div>
                <div className="text-[10px] text-zinc-400 tracking-widest uppercase font-semibold mt-1">{currentDateState || labels.lockScreenDate}</div>
              </div>

              {/* HIGH FIDELITY WIDGETS: BETCLIC AND BETANO PARTNERSHIPS */}
              <div className="mb-6 p-4.5 rounded-2xl bg-zinc-950/90 border border-zinc-800/80 shadow-2xl relative overflow-hidden backdrop-blur-md">
                <div className="absolute top-0 left-0 w-1 h-full bg-gradient-to-b from-orange-500 to-red-600"></div>
                
                <h4 className="text-[10px] font-black uppercase tracking-wider text-orange-400 mb-3 flex items-center justify-between">
                  <span>🎁 {language === 'pt' ? 'BÓNUS DE PARCEIROS RECOMENDADOS' : 'RECOMMENDED PARTNER BONUSES'}</span>
                  <span className="text-[8px] bg-orange-500/10 text-orange-400 px-2 py-0.5 rounded-full font-mono border border-orange-500/10">Official EV+</span>
                </h4>
                
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
                  {/* Betano Slot */}
                  <a 
                    href="https://www.betano.pt/myaccount/bf/lO9ILtmSEQtxfcQc7UmQ" 
                    target="_blank" 
                    rel="noopener noreferrer"
                    className="flex flex-col justify-between p-3.5 rounded-xl bg-zinc-900/50 border border-zinc-800 hover:border-orange-500/40 hover:bg-zinc-900/80 transition-all duration-300 group cursor-pointer"
                  >
                    <div>
                      <div className="flex items-center gap-1.5 mb-1.5">
                        <span className="text-xs font-black tracking-wider text-orange-500 font-display group-hover:translate-x-0.5 transition-transform">BETANO</span>
                        <span className="text-[7.5px] bg-orange-500/10 text-orange-400 px-1.5 py-0.5 rounded font-mono font-bold">PT</span>
                      </div>
                      <p className="text-[10px] text-zinc-400 leading-snug mb-3 font-light">
                        {language === 'pt' 
                          ? 'Aproveita odds competitivas e os melhores mercados calibrados por IA.' 
                          : 'Claim maximum betting value and premium odds on Portugal\'s leading site.'}
                      </p>
                    </div>
                    <span className="block w-full text-center py-1.5 rounded-lg bg-orange-500 hover:bg-orange-600 text-[10px] font-bold text-white transition-colors cursor-pointer">
                      {language === 'pt' ? 'Ativar Bónus Betano' : 'Activate Betano Bonus'}
                    </span>
                  </a>

                  {/* Betclic Slot */}
                  <a 
                    href="https://go.onelink.me/w4we/bc997527?af_sub5=MLRGB2PB" 
                    target="_blank" 
                    rel="noopener noreferrer"
                    className="flex flex-col justify-between p-3.5 rounded-xl bg-zinc-900/50 border border-zinc-800 hover:border-red-500/40 hover:bg-zinc-900/80 transition-all duration-300 group cursor-pointer"
                  >
                    <div>
                      <div className="flex items-center gap-1.5 mb-1.5">
                        <span className="text-xs font-black tracking-wider text-red-500 font-display group-hover:translate-x-0.5 transition-transform">BETCLIC</span>
                        <span className="text-[7.5px] bg-red-500/15 text-red-400 px-1.5 py-0.5 rounded font-mono font-bold">🎁 15€ GRÁTIS</span>
                      </div>
                      <p className="text-[10px] text-zinc-400 leading-snug mb-3 font-light">
                        {language === 'pt' 
                          ? 'Junta-te à Betclic e aproveita o bónus de 15€! Código: MLRGB2PB' 
                          : 'Get a €15 completely free bonus on registration! Use Code: MLRGB2PB'}
                      </p>
                    </div>
                    <span className="block w-full text-center py-1.5 rounded-lg bg-red-650 hover:bg-red-700 text-[10px] font-bold text-white transition-colors cursor-pointer">
                      {language === 'pt' ? 'Ganhar 15€ Grátis' : 'Claim €15 Bonus'}
                    </span>
                  </a>
                </div>
              </div>

              {/* Dynamic Notification Stack */}
              <div className="space-y-3.5 relative min-h-[380px] flex flex-col justify-start">
                {notifications.map((notif) => {
                  const key = notif.templateKey || notif.id;
                  const finalTitle = NOTIFS_BY_LANG[language]?.[`${key}_title`] || notif.title;
                  const finalMsg = NOTIFS_BY_LANG[language]?.[`${key}_msg`] || notif.message;
                  return (
                    <div 
                      key={notif.id}
                      className={`bg-zinc-900/80 border border-zinc-800/80 p-4 rounded-2xl flex items-start gap-3.5 shadow-xl transition-all duration-500 transform ${
                        notif.isNew ? 'animate-[fade-in-up_0.5s_cubic-bezier(0.16,1,0.3,1)_forwards] border-orange-500/30' : 'opacity-90'
                      }`}
                    >
                      {/* App Circular Icon */}
                      <div className="w-10 h-10 rounded-xl bg-zinc-950 flex items-center justify-center text-lg shadow-inner flex-shrink-0">
                        {getCardIcon(notif.type)}
                      </div>

                      {/* Notification content */}
                      <div className="flex-1 text-left min-w-0">
                        <div className="flex justify-between items-center mb-1">
                          <span className="text-[10px] text-[#38bdf8] uppercase tracking-wider font-extrabold">{notif.match}</span>
                          <span className="text-[9px] text-zinc-500 font-medium font-mono">{notif.time}</span>
                        </div>
                        <h4 className="text-xs font-bold text-zinc-200 mb-1">{finalTitle}</h4>
                        <p className="text-[11px] text-zinc-400 leading-normal font-light">{finalMsg}</p>
                        
                        {/* Interactive pill markers inside notification badge */}
                        {(notif.odd || notif.ev) && (
                          <div className="flex items-center gap-2.5 mt-2.5">
                            {notif.odd && (
                              <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-zinc-850 border border-zinc-800 text-[10px] text-zinc-400">
                                {labels.oddLabel} <strong className="text-orange-400 font-mono">{notif.odd}</strong>
                              </span>
                            )}
                            {notif.ev && (
                              <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-emerald-500/10 border border-emerald-500/20 text-[10px] text-emerald-400 font-bold font-mono">
                                {labels.edgeLabel} {notif.ev}
                              </span>
                            )}
                          </div>
                        )}

                        {/* Extra Detailed News / Long Message display with transition */}
                        {expandedIds[notif.id] && notif.longMessage && (
                          <div className="mt-3.5 pt-3.5 border-t border-zinc-800/80 text-[11px] text-zinc-300 leading-relaxed font-light whitespace-pre-wrap bg-zinc-950/50 p-3 rounded-xl border border-zinc-900/60 animate-[fade-in_0.3s_ease-out]">
                            {notif.longMessage}
                          </div>
                        )}
                      </div>

                      {/* Expand / Collapse toggle - only display if longMessage is set */}
                      {notif.longMessage ? (
                        <button 
                          onClick={() => {
                            setExpandedIds(prev => ({
                              ...prev,
                              [notif.id]: !prev[notif.id]
                            }));
                          }}
                          className="text-zinc-600 hover:text-orange-400 p-1.5 rounded-lg transition-all duration-350 flex-shrink-0 self-center hover:bg-zinc-800/60 cursor-pointer"
                          title={language === 'pt' ? 'Ver Tudo / Expandir' : 'Expand / Read More'}
                        >
                          <svg 
                            xmlns="http://www.w3.org/2000/svg" 
                            fill="none" 
                            viewBox="0 0 24 24" 
                            strokeWidth={2.3} 
                            stroke="currentColor" 
                            className={`w-4 h-4 transition-transform duration-300 ${expandedIds[notif.id] ? 'rotate-90 text-orange-400' : ''}`}
                          >
                            <path strokeLinecap="round" strokeLinejoin="round" d="m8.25 4.5 7.5 7.5-7.5 7.5" />
                          </svg>
                        </button>
                      ) : (
                        <div className="w-7 h-7 flex-shrink-0 opacity-0 pointer-events-none" />
                      )}
                    </div>
                  );
                })}

                {/* If empty for some reason */}
                {notifications.length === 0 && (
                  <div className="text-center py-12 text-zinc-500 text-xs font-light">
                    {labels.noNotifs}
                  </div>
                )}
              </div>

            </div>
          </div>

        </div>

      </div>
    </section>
  );
};

export default PushSimulator;
