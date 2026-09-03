import React, { useState } from 'react';
import { useLanguage } from '../services/LanguageContext';

interface TeamData {
  rank: number;
  name: string;
  points: number;
  form: ('V' | 'E' | 'D')[];
  aiConfidence: number;
  unbeatenStreak: number;
}

interface FavoriteRadarProps {
  userSubscriptionStatus?: string;
  onUpgradeClick?: () => void;
}

const FavoriteRadar: React.FC<FavoriteRadarProps> = ({ userSubscriptionStatus = 'Gratuito', onUpgradeClick }) => {
  const { language } = useLanguage();
  const [selectedLeague, setSelectedLeague] = useState<'PT' | 'ES' | 'UK'>('PT');

  const labelsMap = {
    pt: {
      badge: 'MÓDULO DE RADAR SOCIAL',
      title: 'Radar de Equipas Favoritas',
      desc1: 'Nem todos os jogos merecem a tua atenção ou saldo. O Radar de Equipas Favoritas permite-te filtrar o ruído e monitorizar a dinâmica das ligas de futebol mais competitivas do mundo.',
      desc2: 'Analisamos a consistência das equipas secundárias, o desgaste físico por acumulação de jogos europeus, e as alterações nas tabelas classificativas em tempo real. Quando um desvio estatístico de valor ocorre entre a probabilidade real de vitória e a odd facultada pelas casas de apostas, o Radar acende de imediato.',
      feat1Title: 'Mapeamento de Tendência',
      feat1Desc: 'Mapeamos as sequências consecutivas invictas e consistência de golos das equipas.',
      feat2Title: 'Sinal Verde de Entrada',
      feat2Desc: 'Recebe alertas imediatos quando o favoritismo estatístico é subestimado pelas casas.',
      screenshotLab: '[Inserir Screenshot das Favoritas]',
      sectorTitle: 'SECTOR MONITOR',
      active: 'EM DIRETO',
      widgetTitle: 'Tabelas & Confiança IA',
      leagueLabel: 'Alternar Liga para Análise:',
      leagueLead: 'LIDERANÇA ATIVA',
      unbeaten: 'Invicto: {0} jogos',
      winFactor: 'Fator de Win',
      alertTitle: 'ALERTA DE DESPREZO DE ODDS',
      alertDesc: 'O adversário do {0} está sem vitórias fora de casa. Odd justa calculada de 1.42, o mercado apresenta 1.70. Margem crítica ideal de entrada!',
    },
    en: {
      badge: 'SOCIAL RADAR MODULE',
      title: 'Favorites Radar',
      desc1: 'Not all games deserve your attention or bankroll. The Favorites Radar allows you to filter the noise and monitor the dynamics of the most competitive leagues.',
      desc2: 'We analyze the consistency of secondary teams, physical fatigue from cumulative European matches, and league table changes in real-time. When a mathematical value deviation occurs between the real probability of victory and the odd provided by bookies, the Radar ignites.',
      feat1Title: 'Trend Mapping',
      feat1Desc: 'We map the consecutive unbeaten streaks and goal consistency of teams.',
      feat2Title: 'Green Signal for Entry',
      feat2Desc: 'Get immediate alerts when statistical favoritism is underestimated by bookmakers.',
      screenshotLab: '[Insert Favorites Screenshot]',
      sectorTitle: 'MONITOR SECTOR',
      active: 'LIVE FEED',
      widgetTitle: 'Standings & AI Confidence',
      leagueLabel: 'Toggle League for Analysis:',
      leagueLead: 'ACTIVE LEADERBOARD',
      unbeaten: 'Unbeaten: {0} matches',
      winFactor: 'Win Factor',
      alertTitle: 'ODDS BIAS ALERT',
      alertDesc: 'The opponent of {0} has no away wins. Statistically fair odd of 1.42, market offers 1.70. Ideal margin for entry!',
    },
    fr: {
      badge: 'MODULE RADAR SOCIAL',
      title: 'Radar de Favorites',
      desc1: 'Tous les matches ne méritent pas votre attention. Le Radar d\'Équipes Favorites vous permet de filtrer le bruit et de suivre la dynamique des ligues les plus disputées.',
      desc2: 'Nous analysons la régularité des équipes secondaires, l\'accumulation des matches européens et les changements de classements en temps réel. Dès qu\'un écart de cote intéressant est détecté, le Radar s\'illumine.',
      feat1Title: 'Suivi des Tendances',
      feat1Desc: 'Nous suivons les séries d\'invincibilité et la régularité offensive des clubs.',
      feat2Title: 'Signal d\'Entrée Vert',
      feat2Desc: 'Recevez des alertes immédiates lorsque les cotes des bookmakers sous-estiment les probabilités réelles.',
      screenshotLab: '[Capture d\'écran du radar de favorites]',
      sectorTitle: 'MONITEUR DU SECTEUR',
      active: 'EN DIRECT',
      widgetTitle: 'Classement & Confiance IA',
      leagueLabel: 'Sélectionner la Ligue :',
      leagueLead: 'LEADER ACTIF',
      unbeaten: 'Invaincu : {0} matches',
      winFactor: 'Facteur de Gain',
      alertTitle: 'ALERTE DE SOUS-ÉVALUATION',
      alertDesc: 'L\'adversaire de {0} ne gagne pas à l\'extérieur. Cote juste à 1.42 contre 1.70 chez le bookmaker. Écart optimal repéré !',
    },
    it: {
      badge: 'MODULO RADAR SOCIAL',
      title: 'Radar dei Preferiti',
      desc1: 'Non tutti i match meritano i tuoi fondi. Il Radar dei Preferiti ti aiuta a eliminare il rumore e seguire la forma dei top club mondiali.',
      desc2: 'Monitoriamo la consistenza delle squadre minori, la fatica accumulata nei match europei e i mutamenti di classifica in tempo real-time. Se si verifica una discrepanza tra la probabilità statistica e le quote dei bookmaker, il radar si attiva.',
      feat1Title: 'Mappatura dei Trend',
      feat1Desc: 'Mappiamo i match senza sconfitte e la costanza realizzativa dei team.',
      feat2Title: 'Segnale Verde di Entrata',
      feat2Desc: 'Ricevi allarmi istantanei quando le quote proposte sottostimano la squadra favorita.',
      screenshotLab: '[Screenshot del Radar Preferiti]',
      sectorTitle: 'MONITORAGGIO SETTORE',
      active: 'IN CORSO',
      widgetTitle: 'Classifica & Fiducia IA',
      leagueLabel: 'Modifica Campionato:',
      leagueLead: 'CAPOLISTA ATTUALI',
      unbeaten: 'Imbattuto da: {0} gare',
      winFactor: 'Fattore Win',
      alertTitle: 'ALLERTA DISCREPANZA QUOTE',
      alertDesc: 'L\'avversario del {0} non ha mai vinto fuori casa. Quota equa a 1.42, offerta a 1.70. Ottimo margine di ingresso!',
    },
    de: {
      badge: 'SOZIAL-RADAR-MODUL',
      title: 'Favoriten Radar',
      desc1: 'Nicht jedes Spiel ist dein Geld wert. Das Favoriten-Radar filtert das Rauschen der Märkte und überwacht die dynamischen Entwicklungen der weltbesten Ligen.',
      desc2: 'Dabei analysieren wir die Beständigkeit von Außenseitern, die Ermüdung aus europäischen Wettbewerben sowie jede Tabellenänderung in Echtzeit. Registrieren wir Marktabweichungen, springt das Radar an.',
      feat1Title: 'Trendüberwachung',
      feat1Desc: 'Wir dokumentieren ungeschlagene Serien und Torstatistiken von Teams.',
      feat2Title: 'Grünes Einstiegssignal',
      feat2Desc: 'Erhalte sofort Benachrichtigungen, wenn Buchmacher das statistische Übergewicht unterschätzen.',
      screenshotLab: '[Bildschirmfoto des Radars einfügen]',
      sectorTitle: 'MONITOR-BEREICH',
      active: 'LIVE-FEED',
      widgetTitle: 'Tabellen & KI-Erfolgsrate',
      leagueLabel: 'Liga für Analyse wählen:',
      leagueLead: 'AKTIVE TABELLENFÜHRUNG',
      unbeaten: 'Seit {0} Partien ungeschlagen',
      winFactor: 'Fator de Win',
      alertTitle: 'QUOTEN-ABWEICHUNGSALARM',
      alertDesc: 'Der Gegner von {0} hat auswärts noch nicht gewonnen. Faire Quote liegt bei 1.42, der Buchmacher bietet 1.70. Perfektes Einstiegsszenario!',
    }
  };
  const labels = labelsMap[language] || labelsMap.pt;

  const leagueData: Record<'PT' | 'ES' | 'UK', TeamData[]> = {
    PT: [
      { rank: 1, name: 'Sporting CP', points: 81, form: ['V', 'V', 'V', 'E', 'V'], aiConfidence: 91, unbeatenStreak: 12 },
      { rank: 2, name: 'SL Benfica', points: 76, form: ['V', 'E', 'V', 'V', 'D'], aiConfidence: 84, unbeatenStreak: 4 },
      { rank: 3, name: 'FC Porto', points: 69, form: ['E', 'V', 'V', 'E', 'V'], aiConfidence: 78, unbeatenStreak: 6 },
    ],
    ES: [
      { rank: 1, name: 'Real Madrid', points: 87, form: ['V', 'V', 'V', 'V', 'E'], aiConfidence: 95, unbeatenStreak: 21 },
      { rank: 2, name: 'FC Barcelona', points: 79, form: ['V', 'D', 'V', 'V', 'V'], aiConfidence: 82, unbeatenStreak: 3 },
      { rank: 3, name: 'Atlético Madrid', points: 73, form: ['V', 'V', 'E', 'D', 'V'], aiConfidence: 75, unbeatenStreak: 2 },
    ],
    UK: [
      { rank: 1, name: 'Arsenal FC', points: 84, form: ['V', 'V', 'V', 'V', 'V'], aiConfidence: 93, unbeatenStreak: 8 },
      { rank: 2, name: 'Manchester City', points: 83, form: ['V', 'E', 'V', 'V', 'V'], aiConfidence: 92, unbeatenStreak: 15 },
      { rank: 3, name: 'Liverpool FC', points: 78, form: ['D', 'E', 'V', 'V', 'E'], aiConfidence: 80, unbeatenStreak: 3 },
    ]
  };

  const getLeagueName = () => {
    if (selectedLeague === 'PT') return 'Liga Portugal Betclic';
    if (selectedLeague === 'ES') return 'La Liga EA Sports';
    return 'Premier League';
  };

  return (
    <section id="radar" className="relative w-full py-24 bg-[#0A0A0C] border-b border-white/5 overflow-hidden">
      
      {/* Background radial glow */}
      <div className="absolute top-1/2 right-0 -translate-y-1/2 w-[400px] h-[400px] glow-orb-orange pointer-events-none opacity-30"></div>

      <div className="max-w-7xl mx-auto px-6 grid grid-cols-1 lg:grid-cols-12 gap-16 items-center">
        
        {/* Left: iPhone Mockup (Column Order Reversed) */}
        <div className="lg:col-span-6 flex justify-center items-center w-full order-2 lg:order-1 relative">
          
          {userSubscriptionStatus === 'Subscrição Basic (5.99€)' && (
            <div className="absolute inset-0 z-40 flex flex-col items-center justify-center p-6 text-center bg-black/75 backdrop-blur-md rounded-[42px] border border-orange-500/20 shadow-2xl animate-fade-in">
              <div className="w-14 h-14 rounded-full bg-gradient-to-tr from-orange-500 to-amber-400 flex items-center justify-center text-black font-extrabold text-xl shadow-lg mb-4 animate-bounce">
                🔒
              </div>
              <h3 className="text-lg font-bold text-white uppercase tracking-wider mb-2 font-display">
                {(() => {
                  const translations = {
                    pt: "🔒 MÓDULO BLOQUEADO",
                    en: "🔒 MODULE LOCKED",
                    fr: "🔒 MODULE BLOQUÉ",
                    it: "🔒 MODULO BLOCCATO",
                    de: "🔒 MODUL GESPERRT"
                  };
                  return translations[language as keyof typeof translations] || translations.pt;
                })()}
              </h3>
              <p className="text-zinc-300 font-light text-xs leading-relaxed max-w-xs mb-6">
                {(() => {
                  const translations = {
                    pt: "O Radar de Equipas Favoritas não está disponível na sua Subscrição Basic (5.99€).",
                    en: "The Favorites Radar is not available in your Basic Subscription (5.99€).",
                    fr: "Le Radar des Favoris n'est pas disponible dans votre abonnement Basic (5.99€).",
                    it: "Il Radar delle Favorite non è disponibile nel tuo abbonamento Basic (5.99€).",
                    de: "Das Favoriten-Radar ist im Basis-Abonnement (5,99 €) nicht verfügbar."
                  };
                  return translations[language as keyof typeof translations] || translations.pt;
                })()}
              </p>
              <button
                onClick={onUpgradeClick}
                className="px-5 py-3 rounded-xl bg-gradient-to-r from-orange-500 to-amber-500 hover:from-orange-600 hover:to-amber-600 text-black font-bold text-xs uppercase tracking-widest shadow-xl transition-all transform hover:scale-105 pointer-events-auto cursor-pointer"
              >
                {(() => {
                  const translations = {
                    pt: "Fazer Upgrade de Plano 🚀",
                    en: "Upgrade Your Plan 🚀",
                    fr: "Mettre à niveau 🚀",
                    it: "Aggiorna Piano 🚀",
                    de: "Plan upgraden 🚀"
                  };
                  return translations[language as keyof typeof translations] || translations.pt;
                })()}
              </button>
            </div>
          )}

          <div className={`w-full max-w-sm relative group ${userSubscriptionStatus === 'Subscrição Basic (5.99€)' ? 'pointer-events-none select-none filter blur-md opacity-30' : ''}`}>
            
            {/* Ambient lighting element */}
            <div className="absolute -inset-1 rounded-[42px] bg-orange-500/15 blur-xl group-hover:opacity-100 transition duration-500 pointer-events-none"></div>
            
            {/* iPhone Shell */}
            <div className="relative border-8 border-zinc-800 bg-[#0A0A0C] rounded-[40px] shadow-2xl overflow-hidden aspect-[9/19] w-full flex flex-col text-left select-none">
              
              {/* Dynamic Island Block */}
              <div className="absolute top-2.5 left-1/2 -translate-x-1/2 w-28 h-5.5 bg-black rounded-full z-30 flex items-center justify-between px-2.5">
                <div className="w-1.5 h-1.5 rounded-full bg-blue-500/60"></div>
                <div className="w-1.5 h-1.5 rounded-full bg-zinc-900"></div>
              </div>

              {/* Explicit Label requested by client */}
              <div className="bg-orange-500 text-black text-[9px] font-bold py-1.5 px-3 tracking-widest text-center uppercase relative z-30 mt-8">
                 {labels.screenshotLab}
              </div>

              {/* iPhone screen canvas */}
              <div className="flex-1 bg-[#101014] p-5 flex flex-col justify-between overflow-y-auto no-scrollbar">
                
                {/* Header widget */}
                <div className="border-b border-zinc-800/80 pb-3 mb-4">
                  <div className="flex justify-between items-center text-[9px] text-zinc-500 mb-1">
                    <span>{labels.sectorTitle}</span>
                    <span className="font-mono text-orange-400">{labels.active}</span>
                  </div>
                  <h3 className="text-sm font-bold text-white tracking-tight">{labels.widgetTitle}</h3>
                </div>

                {/* League Selector inside phone */}
                <div className="mb-4">
                  <span className="text-[9px] uppercase tracking-wider font-bold text-zinc-400 block mb-2">{labels.leagueLabel}</span>
                  <div className="grid grid-cols-3 gap-1.5 bg-zinc-900/60 p-1 rounded-lg border border-zinc-800">
                    <button 
                      onClick={() => setSelectedLeague('PT')}
                      className={`text-[9px] font-bold py-1.5 px-1 rounded-md text-center transition-colors cursor-pointer ${selectedLeague === 'PT' ? 'bg-sky-500 text-black' : 'text-zinc-400 hover:text-white'}`}
                    >
                      LIGA PT
                    </button>
                    <button 
                      onClick={() => setSelectedLeague('ES')}
                      className={`text-[9px] font-bold py-1.5 px-1 rounded-md text-center transition-colors cursor-pointer ${selectedLeague === 'ES' ? 'bg-sky-500 text-black' : 'text-zinc-400 hover:text-white'}`}
                    >
                      LA LIGA
                    </button>
                    <button 
                      onClick={() => setSelectedLeague('UK')}
                      className={`text-[9px] font-bold py-1.5 px-1 rounded-md text-center transition-colors cursor-pointer ${selectedLeague === 'UK' ? 'bg-sky-500 text-black' : 'text-zinc-400 hover:text-white'}`}
                    >
                      PREMIER
                    </button>
                  </div>
                </div>

                {/* Simulated Table Data widget inside the iPhone frame */}
                <div className="bg-zinc-900/40 border border-zinc-800/80 rounded-xl p-3 flex-1 flex flex-col justify-between mb-4">
                  <div className="flex justify-between items-center border-b border-zinc-800/60 pb-2 mb-3">
                    <span className="text-[10px] text-zinc-300 font-bold tracking-wide">{getLeagueName()}</span>
                    <span className="text-[8px] text-emerald-400 font-bold">{labels.leagueLead}</span>
                  </div>

                  {/* Team Rows */}
                  <div className="space-y-3.5">
                    {leagueData[selectedLeague].map((team) => (
                      <div key={team.name} className="flex items-center justify-between border-b border-zinc-900/60 pb-2 last:border-0 last:pb-0">
                        <div className="flex items-center gap-2">
                          <span className="text-[10px] font-mono font-bold text-zinc-600 w-3">{team.rank}</span>
                          <div className="flex flex-col">
                            <span className="text-xs font-semibold text-zinc-200">{team.name}</span>
                            <span className="text-[8px] text-zinc-500 font-mono mt-0.5">{labels.unbeaten.replace('{0}', String(team.unbeatenStreak))}</span>
                          </div>
                        </div>
                        
                        <div className="flex items-center gap-3">
                          {/* Form dots */}
                          <div className="flex gap-0.5">
                            {team.form.map((f, i) => (
                              <span 
                                key={i} 
                                className={`w-3.5 h-3.5 rounded-sm flex items-center justify-center text-[7px] font-bold text-black ${
                                  f === 'V' ? 'bg-emerald-400' : f === 'E' ? 'bg-amber-400' : 'bg-rose-400'
                                }`}
                              >
                                {f}
                              </span>
                            ))}
                          </div>
                          
                          {/* Confidence */}
                          <div className="text-right">
                            <span className="text-[8px] text-zinc-500 block">{labels.winFactor}</span>
                            <span className="text-[10px] font-extrabold text-[#38bdf8] font-mono">{team.aiConfidence}%</span>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Sub-widget: Radar Trend Alert inside phone */}
                <div className="bg-[#1C1613] border border-orange-500/20 rounded-xl p-3">
                  <div className="flex justify-between items-center text-[10px] text-orange-400 font-bold mb-1">
                    <span>{labels.alertTitle}</span>
                    <span className="animate-pulse">●</span>
                  </div>
                  <p className="text-[9px] text-zinc-300 leading-normal">
                    {labels.alertDesc.replace('{0}', leagueData[selectedLeague][0].name)}
                  </p>
                </div>

              </div>
              
              {/* Home Indicator bar */}
              <div className="absolute bottom-1.5 left-1/2 -translate-x-1/2 w-32 h-1 bg-zinc-800 rounded-full z-30"></div>
            </div>

          </div>
        </div>

        {/* Right: Text explanation (Column Order Reversed, on right on Desktop) */}
        <div className="lg:col-span-6 flex flex-col items-start text-left order-1 lg:order-2">
          <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-orange-500/10 border border-orange-500/20 text-[10px] font-bold text-orange-400 uppercase tracking-widest mb-4">
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

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-6 w-full pt-4 border-t border-zinc-900">
            <div className="flex gap-3">
              <div className="w-8 h-8 rounded-lg bg-sky-500/10 border border-sky-500/20 flex items-center justify-center text-sky-400 flex-shrink-0">
                <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor" className="w-4 h-4">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M7.5 14.25v2.25m3-4.5v4.5m3-6.75v6.75m3-9v9M6 20.25h12A2.25 2.25 0 0 0 20.25 18V6A2.25 2.25 0 0 0 18 3.75H6A2.25 2.25 0 0 0 3.75 6v12A2.25 2.25 0 0 0 6 20.25Z" />
                </svg>
              </div>
              <div>
                <h4 className="text-sm font-semibold text-white mb-1">{labels.feat1Title}</h4>
                <p className="text-xs text-zinc-500">{labels.feat1Desc}</p>
              </div>
            </div>

            <div className="flex gap-3">
              <div className="w-8 h-8 rounded-lg bg-orange-500/10 border border-orange-500/20 flex items-center justify-center text-orange-400 flex-shrink-0">
                <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor" className="w-4 h-4">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M14.828 14.828a4 4 0 0 1-5.656 0M9 10h.01M15 10h.01M21 12a9 9 0 1 1-18 0 9 9 0 0 1 18 0Z" />
                </svg>
              </div>
              <div>
                <h4 className="text-sm font-semibold text-white mb-1">{labels.feat2Title}</h4>
                <p className="text-xs text-zinc-500">{labels.feat2Desc}</p>
              </div>
            </div>
          </div>
        </div>

      </div>
    </section>
  );
};

export default FavoriteRadar;
