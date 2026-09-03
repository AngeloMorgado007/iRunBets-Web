import React, { useState } from 'react';
import { useLanguage } from '../services/LanguageContext';

const InterfaceExplore: React.FC = () => {
  const { language } = useLanguage();
  const [activeTab, setActiveTab] = useState<string>('mentor');

  // Interactive Portuguese texts + Multi-language support for internationalization
  const introText = {
    pt: {
      badge: 'EXPLORA AS NOSSAS FERRAMENTAS',
      title: 'O Nosso Ecossistema Por Dentro',
      desc: 'O iRunBets é uma plataforma analítica independente, concebida para dotar o investidor desportivo de inteligência matemática profunda e absoluto domínio emocional. Aqui, a estatística bruta é depurada por Inteligência Artificial para te manter longe da intuição e focado na consistência a longo prazo.',
    },
    en: {
      badge: 'EXPLORE OUR TOOLS',
      title: 'Inside Our Analytical Ecosystem',
      desc: 'iRunBets is an independent analytical platform engineered to equip sport investors with deep mathematical insights and complete emotional dominance. Here, raw statistics are parsed by Artificial Intelligence to keep you away from intuition and entirely focused on long-term consistency.',
    },
    fr: {
      badge: 'EXPLOREZ NOS OUTILS',
      title: 'Notre Écosystème de l\'Intérieur',
      desc: 'iRunBets est une plateforme analytique indépendante conçue pour donner aux investisseurs sportifs une intelligence mathématique profonde et une maîtrise émotionnelle absolue. Ici, les statistiques brutes sont traitées par l\'IA pour vous éloigner de l\'intuition et vous concentrer sur la rentabilité à long terme.',
    },
    it: {
      badge: 'ESPLORA I NOSTRI STRUMENTI',
      title: 'Il Nostro Ecosistema Dall\'Interno',
      desc: 'iRunBets è una piattaforma analitica indipendente progettata per dotare l\'investitore sportivo di una profonda intelligenza matematica e di un controllo emotivo assoluto. Qui, le statistiche grezze vengono elaborate dall\'IA per allontanarti dall\'intuizione e farti concentrare sulla costanza a lungo termine.',
    },
    de: {
      badge: 'UNSERE TOOLS ENTDECKEN',
      title: 'Unser Analytisches Ökosystem Von Innen',
      desc: 'iRunBets ist eine unabhängige Analyseplattform, die Sportinvestoren mit tiefen mathematischen Insights und vollständiger emotionaler Disziplin ausstattet. Hier werden Rohdaten von künstlicher Intelligenz bereichert, um dich vor emotionalen Wetten zu schützen.',
    }
  };

  const tabsInfo = [
    {
      id: 'mentor',
      title: {
        pt: '🧠 Mentor de Disciplina',
        en: '🧠 Discipline Mentor',
        fr: '🧠 Mentor de Discipline',
        it: '🧠 Mentore di Disciplina',
        de: '🧠 Disziplin-Mentor'
      },
      tag: {
        pt: 'MÓDULO DE INTELIGÊNCIA EMOCIONAL',
        en: 'EMOTIONAL INTELLIGENCE MODULE',
        fr: 'INTELIGÊNCIA ÉMOTIONNELLE',
        it: 'INTELLIGENZA EMOTIVA',
        de: 'EMOTIONALE INTELLIGENZ'
      },
      shortDesc: {
        pt: 'Um guardião psicológico baseado no teu real histórico de risco para prevenir o "tilt" e perdas emocionais.',
        en: 'A psychological guardian tracking your real risk parameters to stop emotional "tilted" betting cascades.',
        fr: 'Un gardien psychologique basé sur votre historique réel de risque pour empêcher le "tilt" émotionnel.',
        it: 'Un guardiano psicologico basato sulla tua reale gestione del rischio per prevenire il "tilt" e le scommesse emotive.',
        de: 'Ein psychologischer Wächter, der Verlustmuster tracken kann, um dich vor Tilt-Wetten zu schützen.'
      }
    },
    {
      id: 'standings',
      title: {
        pt: '📊 Tabelas & Ligas',
        en: '📊 Standings & Leagues',
        fr: '📊 Classements & Ligues',
        it: '📊 Classifiche & Campionati',
        de: '📊 Tabellen & Ligen'
      },
      tag: {
        pt: 'MÉTRICAS QUANTITATIVAS',
        en: 'QUANTITATIVE METRICS',
        fr: 'MESURES QUANTITATIVES',
        it: 'METRICHE QUANTITATIVE',
        de: 'QUANTITATIVE METRIKEN'
      },
      shortDesc: {
        pt: 'Classificações avançadas com indicadores automáticos de melhor/pior ataque, consistência defensiva e golos.',
        en: 'Advanced standings with automated indicators for top/worst attack, defense ratios, and total goals.',
        fr: 'Classements avancés intégrant des marqueurs automatiques pour l\'attaque, la défense et les buts.',
        it: 'Classifiche avanzate con indicatori automatici di miglior/peggior attacco, difesa e goal.',
        de: 'Erweiterte Tabellen mit automatischen Metriken für besten/schlechtesten Angriff und Verteidigung.'
      }
    },
    {
      id: 'executive',
      title: {
        pt: '⚙️ Painel Executivo',
        en: '⚙️ Executive Dashboard',
        fr: '⚙️ Panneau Exécutif',
        it: '⚙️ Pannello Esecutivo',
        de: '⚙️ Chef-Dashboard'
      },
      tag: {
        pt: 'CONTROLO ADMINISTRATIVO',
        en: 'ADMINSTRATIVE CONTROL',
        fr: 'CONTRÔLE ADMINISTRATIF',
        it: 'CONTROLLO AMMINISTRATIVO',
        de: 'ADMINISTRATOR-STEUERUNG'
      },
      shortDesc: {
        pt: 'Central integrada de ferramentas: Registo, Inteligência Artificial, Tipsters e Estatísticas agrupadas.',
        en: 'Central terminal linking register banks, artificial intelligence engines, tipster listings, and schedules.',
        fr: 'Terminal central gérant les registres, l\'intelligence artificielle, les réseaux de tipsters et les matchs.',
        it: 'Terminale centrale con tutte le funzionalità: Gestione Cassa, Intelligenza Artificiale e Tipsters.',
        de: 'Zentrale Steuerung für deine Bankroll, KI-Analysen, Tipster-Prognosen und Wettbewerbe.'
      }
    },
    {
      id: 'gemini',
      title: {
        pt: '✨ Mentor IA Gemini',
        en: '✨ Gemini AI Mentor',
        fr: '✨ Mentor IA Gemini',
        it: '✨ Mentore IA Gemini',
        de: '✨ Gemini KI-Mentor'
      },
      tag: {
        pt: 'ALINHAMENTO COGNITIVO',
        en: 'COGNITIVE ALIGNMENT',
        fr: 'ALIGNEMENT COGNITIF',
        it: 'ALLINEAMENTO COGNITIVO',
        de: 'KOGNITIVE AUSRICHTUNG'
      },
      shortDesc: {
        pt: 'Aconselhamento estatístico contínuo e análise matemática direta de padrões de banca com IA de ponta.',
        en: 'Chat terminal powered by Gemini Pro to analyze your real financial health and guide decision structures.',
        fr: 'Chat direct alimenté par Gemini Pro pour étudier votre santé de banque et vous orienter mathématiquement.',
        it: 'Chat integrata con Gemini Pro per analizzare la tua gestione del rischio e darti supporto matematico.',
        de: 'Direktes Feedback von Gemini Pro bezüglich deiner Bankroll-Stabilität und rationaler Spielweise.'
      }
    },
    {
      id: 'records',
      title: {
        pt: '📝 Registro de Entradas',
        en: '📝 Bet Tracker',
        fr: '📝 Enregistrement de Paris',
        it: '📝 Registro di Gioco',
        de: '📝 Wettschein-Tracker'
      },
      tag: {
        pt: 'BANCAS E COBERTURAS',
        en: 'BANKROLL COVERAGE',
        fr: 'GESTION DU CAPITAL',
        it: 'GESTIONE DEL PORTAFOGLIO',
        de: 'BANKROLL-MANAGEMENT'
      },
      shortDesc: {
        pt: 'Tratamento rigoroso de stakes. Registro limpo e rápido de odds e seleções nos estados: pendente, ganha ou perdida.',
        en: 'Meticulous stake management. Track odds and markets with precision, declaring pending, won, or lost units.',
        fr: 'Saisie rigoureuse des mises et des cotes pour les états en attente, gagnés, perdus ou remboursés.',
        it: 'Registrazione e calcolo matematico degli stake, del profitto netto e dello stato delle singole scommesse.',
        de: 'Präzise Erfassung deiner Wetten, Einsätze und Quoten zur automatischen Auswertung deiner Performance.'
      }
    },
  ];

  const tIntro = introText[language as keyof typeof introText] || introText.pt;

  return (
    <section id="interface-explore" className="py-24 bg-[#08080B] border-b border-zinc-900/80 relative">
      <div className="absolute top-1/4 right-[5%] w-[400px] h-[400px] bg-[#EF233C]/5 rounded-full blur-[160px] pointer-events-none"></div>
      <div className="absolute bottom-1/4 left-[5%] w-[400px] h-[400px] bg-[#00f2fe]/5 rounded-full blur-[160px] pointer-events-none"></div>

      <div className="max-w-7xl mx-auto px-6 relative z-10">
        
        {/* Section Header */}
        <div className="text-center max-w-3xl mx-auto mb-16 space-y-4 font-sans">
          <span className="text-[10px] sm:text-xs font-black uppercase tracking-[0.2em] text-[#EF233C] bg-[#EF233C]/5 px-3.5 py-1.5 rounded-md font-mono border border-[#EF233C]/10 inline-block">
            {tIntro.badge}
          </span>
          <h2 className="text-3xl sm:text-4xl lg:text-5xl font-extrabold text-white tracking-tight uppercase font-display leading-tight">
            {tIntro.title}
          </h2>
          <div className="h-1 w-20 bg-gradient-to-r from-[#EF233C] to-[#00f2fe] rounded-full mx-auto"></div>
          <p className="text-sm sm:text-base text-zinc-400 font-light leading-relaxed max-w-2xl mx-auto font-sans">
            {tIntro.desc}
          </p>
        </div>

        {/* Tab switching content layout */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
          
          {/* Tab buttons (Left column) */}
          <div className="lg:col-span-4 flex flex-col gap-3">
            {tabsInfo.map((tab) => {
              const isActive = activeTab === tab.id;
              return (
                <button
                  key={tab.id}
                  type="button"
                  onClick={() => setActiveTab(tab.id)}
                  className={`p-5 rounded-2xl border text-left transition-all duration-300 relative overflow-hidden group cursor-pointer ${
                    isActive
                      ? 'bg-[#121216] border-[#EF233C]/40 text-white shadow-xl shadow-[#EF233C]/2'
                      : 'bg-zinc-950/45 border-zinc-900/60 text-zinc-400 hover:bg-[#121216]/50 hover:border-zinc-800'
                  }`}
                >
                  {/* Highlight bar */}
                  {isActive && (
                    <div className="absolute top-0 bottom-0 left-0 w-1 bg-[#EF233C]"></div>
                  )}

                  <div className="space-y-1 font-sans">
                    <span className={`text-[9px] uppercase font-bold tracking-widest block font-mono ${
                      isActive ? 'text-[#EF233C]' : 'text-zinc-500 group-hover:text-zinc-400'
                    }`}>
                      {tab.tag[language as keyof typeof tab.tag] || tab.tag.pt}
                    </span>
                    <h4 className="text-sm sm:text-base font-extrabold tracking-tight transition-colors">
                      {tab.title[language as keyof typeof tab.title] || tab.title.pt}
                    </h4>
                    <p className="text-xs text-zinc-455 font-light leading-relaxed mt-2 pl-0.5 line-clamp-2">
                      {tab.shortDesc[language as keyof typeof tab.shortDesc] || tab.shortDesc.pt}
                    </p>
                  </div>
                </button>
              );
            })}
          </div>

          {/* Interactive Screen Replica Preview (Right column) */}
          <div className="lg:col-span-8 bg-[#09090C] border border-zinc-850/70 rounded-3xl p-4 sm:p-6 shadow-2xl relative min-h-[480px] overflow-hidden flex flex-col justify-between">
            {/* Window Dots */}
            <div className="flex items-center justify-between border-b border-zinc-900/80 pb-4 mb-6">
              <div className="flex gap-1.5 pl-2">
                <span className="w-2.5 h-2.5 rounded-full bg-red-500/80"></span>
                <span className="w-2.5 h-2.5 rounded-full bg-amber-500/80"></span>
                <span className="w-2.5 h-2.5 rounded-full bg-emerald-500/80"></span>
              </div>
              <div className="bg-zinc-950/85 px-4 py-1 rounded-lg border border-zinc-900/50 text-[10px] font-mono text-zinc-500 select-none">
                {activeTab === 'mentor' && 'irunbets.pt/vip/discipline-mentor'}
                {activeTab === 'standings' && 'irunbets.pt/vip/leagues-standings'}
                {activeTab === 'executive' && 'irunbets.pt/vip/executive-panel'}
                {activeTab === 'gemini' && 'irunbets.pt/vip/gemini-pro-advisor'}
                {activeTab === 'records' && 'irunbets.pt/vip/bankroll-registration'}
              </div>
              <div className="w-10"></div>
            </div>

            {/* Screen Contents depending on selected tab */}
            <div className="flex-1 transition-all duration-300 flex flex-col justify-center">
              
              {/* 1. MENTOR DE DISCIPLINA */}
              {activeTab === 'mentor' && (
                <div className="space-y-6 animate-fade-in font-sans text-left">
                  <div className="border border-zinc-850/60 p-5 rounded-2xl bg-[#0E0E12] shadow-xl flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
                    <div className="space-y-1">
                      <span className="text-[10px] uppercase font-black tracking-widest text-[#EF233C] font-mono">
                        MÓDULO DE INTELIGÊNCIA EMOCIONAL
                      </span>
                      <h3 className="text-base font-black text-white uppercase font-display leading-tight">
                        Mentor de Disciplina & Perfil de Risco
                      </h3>
                    </div>
                    <div className="flex gap-2 flex-wrap text-[11px] font-mono font-bold">
                      <span className="px-2.5 py-1 bg-[#EF233C]/10 border border-[#EF233C]/30 text-[#EF233C] rounded-lg">
                        ● COMPORTAMENTO & RISCO
                      </span>
                      <span className="px-2.5 py-1 bg-zinc-900 border border-zinc-800 text-zinc-500 rounded-lg">
                        ANÁLISE DE JOGOS
                      </span>
                      <span className="px-2.5 py-1 bg-zinc-900 border border-zinc-800 text-zinc-500 rounded-lg">
                        CHAT COM GEMINI
                      </span>
                    </div>
                  </div>

                  {/* Slogan / Sorte Quote Container */}
                  <div className="border-l-4 border-red-500 bg-red-500/5 p-5 rounded-r-2xl border-y border-r border-[#EF233C]/10 relative">
                    <div className="flex gap-4 items-start">
                      <div className="text-3xl text-red-400 select-none">🛡️</div>
                      <div className="space-y-2">
                        <blockquote className="text-xs sm:text-sm text-zinc-350 italic font-medium leading-relaxed">
                          "A sorte não é contínua, mas o azar também não. O objetivo principal desta ferramenta não é fazer ninguém rico, mas sim prevenir-te de ficares mais pobre, alertando-te e ensinando-te a gerir a tua mente desportiva."
                        </blockquote>
                        <div className="text-[9px] uppercase font-bold tracking-widest text-zinc-500 font-mono pl-1">
                          — Slogan iRunBets • Prevenção e Disciplina
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              )}

              {/* 2. STANDINGS / CAMPIONATI */}
              {activeTab === 'standings' && (
                <div className="space-y-5 animate-fade-in font-sans text-left">
                  <div className="flex justify-between items-center bg-[#0E0E12] border border-zinc-850/60 p-4 rounded-xl">
                    <span className="text-xs font-black tracking-widest text-sky-400 font-mono uppercase">
                      📊 TABELAS CLASSIFICATIVAS
                    </span>
                    <span className="text-[10px] font-mono text-zinc-450 bg-zinc-900 border border-zinc-800 px-3 py-1 rounded-lg">
                      PORTUGAL • PRIMEIRA LIGA
                    </span>
                  </div>

                  <div className="bg-zinc-950 border border-zinc-900 rounded-xl overflow-hidden shadow-lg p-2 max-h-[300px] overflow-y-auto font-mono text-[11px] scrollbar-thin">
                    <table className="w-full text-left">
                      <thead>
                        <tr className="border-b border-zinc-900 text-zinc-500 text-[10px]">
                          <th className="py-2 px-3">POS</th>
                          <th className="py-2">EQUIPA</th>
                          <th className="py-2 text-right">PTS</th>
                          <th className="py-2 text-right">J</th>
                          <th className="py-2 text-right">V</th>
                          <th className="py-2 text-right">E</th>
                          <th className="py-2 text-right">D</th>
                          <th className="py-2 text-right">GOLOS</th>
                          <th className="py-2 text-right px-3">DG</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-zinc-950">
                        <tr className="text-white hover:bg-zinc-900/40">
                          <td className="py-2.5 px-3 text-cyan-400 font-black">1</td>
                          <td className="font-sans font-bold flex items-center gap-1.5 py-2.5">
                            <span className="w-1.5 h-1.5 rounded-full bg-cyan-400"></span> FC Porto
                          </td>
                          <td className="text-right font-black text-cyan-400">88</td>
                          <td className="text-right text-zinc-400">34</td>
                          <td className="text-right text-emerald-400">28</td>
                          <td className="text-right text-zinc-500">4</td>
                          <td className="text-right text-red-500">2</td>
                          <td className="text-right text-zinc-450">66:18</td>
                          <td className="text-right text-emerald-400 font-bold px-3">+48</td>
                        </tr>
                        <tr className="text-white hover:bg-zinc-900/40">
                          <td className="py-2.5 px-3 text-cyan-400 font-black">2</td>
                          <td className="font-sans font-bold flex items-center gap-1.5 py-2.5">
                            <span className="w-1.5 h-1.5 rounded-full bg-emerald-400"></span> Sporting CP
                          </td>
                          <td className="text-right font-black">82</td>
                          <td className="text-right text-zinc-400">34</td>
                          <td className="text-right text-emerald-400">25</td>
                          <td className="text-right text-zinc-500">7</td>
                          <td className="text-right text-red-500">2</td>
                          <td className="text-right text-zinc-450">89:24</td>
                          <td className="text-right text-emerald-400 font-bold px-3">+65</td>
                        </tr>
                        <tr className="text-white hover:bg-zinc-900/40">
                          <td className="py-2.5 px-3 text-cyan-400 font-black">3</td>
                          <td className="font-sans font-bold flex items-center gap-1.5 py-2.5">
                            <span className="w-1.5 h-1.5 rounded-full bg-red-400"></span> SL Benfica
                          </td>
                          <td className="text-right font-black">80</td>
                          <td className="text-right text-zinc-400">34</td>
                          <td className="text-right text-emerald-400">23</td>
                          <td className="text-right text-zinc-500">11</td>
                          <td className="text-right text-red-500">0</td>
                          <td className="text-right text-zinc-450">74:25</td>
                          <td className="text-right text-emerald-400 font-bold px-3">+49</td>
                        </tr>
                      </tbody>
                    </table>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 font-sans">
                    <div className="bg-[#0D0D12] border border-zinc-900 p-3.5 rounded-xl space-y-1">
                      <span className="text-[10px] text-zinc-500 uppercase font-mono tracking-wider">⚽ Registos Goleadores (Ataque)</span>
                      <div className="flex justify-between items-center text-xs">
                        <span className="text-zinc-400">Melhor Ataque:</span>
                        <span className="text-emerald-400 font-bold">Sporting CP (89 GM)</span>
                      </div>
                    </div>
                    <div className="bg-[#0D0D12] border border-zinc-900 p-3.5 rounded-xl space-y-1">
                      <span className="text-[10px] text-zinc-500 uppercase font-mono tracking-wider">🛡️ Consistência Defensiva (Sofridos)</span>
                      <div className="flex justify-between items-center text-xs">
                        <span className="text-zinc-400">Melhor Defesa:</span>
                        <span className="text-emerald-400 font-bold">FC Porto (18 GS)</span>
                      </div>
                    </div>
                  </div>
                </div>
              )}

              {/* 3. EXECUTIVE DASHBOARD MENU */}
              {activeTab === 'executive' && (
                <div className="space-y-6 animate-fade-in font-sans text-left">
                  <div className="border border-zinc-850/60 p-5 rounded-2xl bg-[#0E0E12] shadow-xl flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
                    <div className="flex items-center gap-4">
                      <div className="h-10 w-24 bg-zinc-900/80 border border-zinc-800 rounded-lg flex items-center justify-center font-black text-[#EF233C] text-xs">
                        iRun<span className="text-white">Bets</span>
                      </div>
                      <div className="space-y-0.5">
                        <span className="text-[11px] uppercase font-bold text-emerald-400 tracking-wider flex items-center gap-1 font-mono">
                          PAINEL EXECUTIVO ATIVO
                        </span>
                      </div>
                    </div>
                    <span className="text-[10px] text-zinc-500 font-light max-w-[200px] leading-tight text-right">
                      Análise probabilística e registo integrado para controlo absoluto de banca.
                    </span>
                  </div>

                  <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-5 gap-3.5 font-mono text-[11px] font-black uppercase">
                    <div className="bg-zinc-900/50 border border-[#EF233C]/30 text-white rounded-xl p-4 flex flex-col justify-between h-20 shadow-md">
                      <span>📉</span>
                      <span>Banca</span>
                    </div>
                    <div className="bg-zinc-900/50 border border-zinc-850 text-[#00f2fe]/80 rounded-xl p-4 flex flex-col justify-between h-20">
                      <span>✨</span>
                      <span>IA Bets</span>
                    </div>
                    <div className="bg-zinc-900/50 border border-zinc-850 text-amber-500 rounded-xl p-4 flex flex-col justify-between h-20">
                      <span>⭐</span>
                      <span>Ligas</span>
                    </div>
                    <div className="bg-zinc-900/50 border border-zinc-850 text-purple-400 rounded-xl p-4 flex flex-col justify-between h-20">
                      <span>👥</span>
                      <span>Tipsters</span>
                    </div>
                    <div className="bg-zinc-950/20 border border-zinc-900 text-zinc-600 rounded-xl p-4 flex flex-col justify-between h-20 opacity-60">
                      <span>🔒</span>
                      <span>Private</span>
                    </div>
                  </div>
                </div>
              )}

              {/* 4. CHAT COM MENTOR GEMINI PRO */}
              {activeTab === 'gemini' && (
                <div className="space-y-6 animate-fade-in font-sans text-left">
                  <div className="border border-purple-500/10 p-4 rounded-2xl bg-[#0B0B0E] flex items-center justify-between">
                    <div className="space-y-0.5">
                      <span className="text-[9px] uppercase font-black tracking-widest text-[#a855f7] font-mono flex items-center gap-1">
                        ✨ CHAT C/ MENTOR IRUNBETS PRO
                      </span>
                      <p className="text-[9.5px] text-zinc-500">
                        Alinhamento de banca e cognitivo direto alimentado por Google Gemini 1.5 Pro
                      </p>
                    </div>
                    <span className="text-[8px] bg-purple-500/15 border border-purple-500/30 font-bold px-2 py-0.5 rounded-full text-purple-400">
                      GEMINI-3.5-FLASH
                    </span>
                  </div>

                  <div className="space-y-3">
                    <div className="bg-[#121216] border border-zinc-850 p-4 rounded-2xl text-xs text-zinc-300 leading-relaxed max-w-[85%] font-sans flex items-start gap-2.5">
                      <span className="text-base select-none">💬</span>
                      <div>
                        Olá! Sou o seu Mentor Analítico iRunBets Pro alimentado pelo Google Gemini. Analisei a sua banca ativa de controlo e estou pronto para ajudá-lo com prognósticos de futebol, probabilidade pura, controlo de ansiedade ou estratégias de tipsters. O que gostaria de analisar ou discutir hoje?
                      </div>
                    </div>

                    <div className="flex gap-2 flex-wrap pt-2">
                      <button className="px-3 py-1.5 bg-zinc-900/60 border border-zinc-800 text-[10px] text-zinc-400 rounded-xl hover:border-purple-500/40 hover:text-white transition-all font-sans">
                        📊 Como está o meu ROI real?
                      </button>
                      <button className="px-3 py-1.5 bg-zinc-900/60 border border-zinc-800 text-[10px] text-zinc-400 rounded-xl hover:border-purple-500/40 hover:text-white transition-all font-sans">
                        🧠 Controlar pânicos pós-Reds
                      </button>
                      <button className="px-3 py-1.5 bg-zinc-900/60 border border-zinc-800 text-[10px] text-zinc-400 rounded-xl hover:border-purple-500/40 hover:text-white transition-all font-sans">
                        📐 Poisson na prática
                      </button>
                    </div>
                  </div>
                </div>
              )}

              {/* 5. BET REGISTRATION PANEL */}
              {activeTab === 'records' && (
                <div className="space-y-4 animate-fade-in font-sans text-left">
                  <div className="flex justify-between items-center bg-[#0E0E12] border border-zinc-850/60 p-3.5 rounded-xl">
                    <span className="text-xs font-black tracking-widest text-amber-500 font-mono uppercase">
                      📝 REGISTAR ENTRADA REAL
                    </span>
                    <span className="text-[9px] font-mono text-cyan-400 bg-cyan-950/30 border border-cyan-500/20 px-2 py-0.5 rounded font-black uppercase">
                      Múltipla Pop-Up ↗
                    </span>
                  </div>

                  <div className="grid grid-cols-2 gap-3.5 text-xs">
                    <div>
                      <label className="text-[10px] text-zinc-500 uppercase font-bold tracking-wider block mb-1 font-mono">EQUIPA CASA (1)</label>
                      <div className="w-full bg-zinc-900/80 border border-zinc-800 text-zinc-400 p-2.5 rounded-xl font-mono">Ex: Rio Ave</div>
                    </div>
                    <div>
                      <label className="text-[10px] text-zinc-500 uppercase font-bold tracking-wider block mb-1 font-mono">EQUIPA FORA (2)</label>
                      <div className="w-full bg-zinc-900/80 border border-zinc-800 text-zinc-400 p-2.5 rounded-xl font-mono">Ex: Benfica</div>
                    </div>
                    <div>
                      <label className="text-[10px] text-zinc-500 uppercase font-bold tracking-wider block mb-1 font-mono">ODD OFERECIDA</label>
                      <div className="w-full bg-zinc-900/80 border border-zinc-800 text-zinc-400 p-2.5 rounded-xl font-mono">Ex: 1.83</div>
                    </div>
                    <div>
                      <label className="text-[10px] text-zinc-500 uppercase font-bold tracking-wider block mb-1 font-mono">MONTANTE (€)</label>
                      <div className="w-full bg-zinc-900/80 border border-zinc-800 text-zinc-400 p-2.5 rounded-xl font-mono">Ex: 15</div>
                    </div>
                  </div>

                  <div className="flex gap-2 justify-between items-center text-[10px] font-bold font-mono py-1">
                    <span className="px-3 py-1.5 border border-amber-500/45 text-amber-500 rounded bg-amber-500/5">PENDENTES</span>
                    <span className="px-3 py-1.5 border border-zinc-850 text-zinc-650 rounded">GANHAS</span>
                    <span className="px-3 py-1.5 border border-zinc-850 text-zinc-650 rounded">PERDIDAS</span>
                    <span className="px-3 py-1.5 border border-zinc-850 text-zinc-650 rounded">DEVOLVIDAS</span>
                  </div>

                  <button className="w-full py-3.5 bg-gradient-to-r from-amber-500 to-orange-600 font-bold uppercase tracking-wider text-xs rounded-xl shadow-lg border border-orange-400/20 text-white cursor-pointer select-none">
                    REGISTAR ENTRADA DE VALOR 🚀
                  </button>
                </div>
              )}

            </div>

            {/* Inner footer */}
            <div className="border-t border-zinc-900/60 pt-4 mt-6 text-center text-[9px] text-zinc-600 font-mono flex justify-between items-center">
              <span>SECURITY PROTOCOL ENCRYPTED SH-256</span>
              <span className="text-[#EF233C] font-bold animate-pulse">iRUNBETS LIVE SHELL v3</span>
            </div>
          </div>

        </div>
        
      </div>
    </section>
  );
};

export default InterfaceExplore;
