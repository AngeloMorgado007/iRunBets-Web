import React, { useState, useEffect } from 'react';
import { useLanguage } from '../services/LanguageContext';
import { getSubscribersConfig, onAuthStatusChange, saveSubscribersConfig } from '../services/firebase';
import { Edit, X } from 'lucide-react';

const COLOR_PRESETS = [
  { id: 'original', name: 'Original (Céu/Laranja)', value: 'bg-gradient-to-r from-sky-400 via-orange-400 to-amber-500' },
  { id: 'cyan_blue', name: 'Ciano & Azul', value: 'bg-gradient-to-r from-cyan-400 via-sky-400 to-blue-500' },
  { id: 'sunset', name: 'Sunset Ouro', value: 'bg-gradient-to-r from-rose-500 via-orange-400 to-yellow-400' },
  { id: 'purple_fuchsia', name: 'Roxo Cósmico', value: 'bg-gradient-to-r from-violet-400 via-fuchsia-500 to-pink-500' },
  { id: 'matrix_green', name: 'Verde Matrix', value: 'bg-gradient-to-r from-emerald-400 via-green-400 to-lime-400' },
  { id: 'fire_flame', name: 'Fogo Quente', value: 'bg-gradient-to-r from-orange-500 via-pink-500 to-purple-600' },
  { id: 'gold_rush', name: 'Ouro Real', value: 'bg-gradient-to-r from-yellow-300 via-amber-450 to-amber-600' }
];

const Hero: React.FC = () => {
  const { language, t } = useLanguage();

  const [config, setConfig] = useState(() => getSubscribersConfig());
  const [isAdmin, setIsAdmin] = useState(false);
  const [isEditingSlogans, setIsEditingSlogans] = useState(false);

  // Form states for slogan editing
  const [formTitlePt, setFormTitlePt] = useState('');
  const [formTitleEn, setFormTitleEn] = useState('');
  const [formDescPt, setFormDescPt] = useState('');
  const [formDescEn, setFormDescEn] = useState('');
  const [formHighlightStyle, setFormHighlightStyle] = useState('bg-gradient-to-r from-sky-400 via-orange-400 to-amber-500');
  const [isSaving, setIsSaving] = useState(false);

  const renderTextWithHighlight = (text: string, highlightStyle: string) => {
    if (!text) return null;
    
    // Check if the text actually contains brackets []
    if (text.includes('[') && text.includes(']')) {
      const bracketRegex = /\[(.*?)\]/g;
      const parts = [];
      let lastIndex = 0;
      let match;
      
      while ((match = bracketRegex.exec(text)) !== null) {
        const matchIndex = match.index;
        if (matchIndex > lastIndex) {
          parts.push(text.substring(lastIndex, matchIndex));
        }
        parts.push(
          <span key={matchIndex} className={`bg-clip-text text-transparent ${highlightStyle || 'bg-gradient-to-r from-sky-400 via-orange-400 to-amber-500'}`}>
            {match[1]}
          </span>
        );
        lastIndex = bracketRegex.lastIndex;
      }
      
      if (lastIndex < text.length) {
        parts.push(text.substring(lastIndex));
      }
      
      return <>{parts}</>;
    }
    
    // Fallback logic for default phrases if brackets are not used
    const defaultPhrases = [
      "gestão de banca inteligente",
      "smart bankroll management",
      "gestion de bankroll intelligente",
      "gestione del bankroll inteligente",
      "intelligentes Bankroll-Management",
      "vantagem matemática"
    ];
    
    for (const phrase of defaultPhrases) {
      const idx = text.toLowerCase().indexOf(phrase.toLowerCase());
      if (idx !== -1) {
        const part1 = text.substring(0, idx);
        const partSelected = text.substring(idx, idx + phrase.length);
        const part3 = text.substring(idx + phrase.length);
        return (
          <>
            {part1}
            <span className={`bg-clip-text text-transparent ${highlightStyle || 'bg-gradient-to-r from-sky-400 via-orange-400 to-amber-500'}`}>
              {partSelected}
            </span>
            {part3}
          </>
        );
      }
    }
    
    return text;
  };

  useEffect(() => {
    const handleStorage = () => {
      setConfig(getSubscribersConfig());
    };
    window.addEventListener('storage', handleStorage);
    window.addEventListener('irunbets_subscribers_config_updated', handleStorage);
    const interval = setInterval(handleStorage, 2000);

    // Subscribe to auth status to detect admin
    const unsubscribeAuth = onAuthStatusChange((user, checkAdmin) => {
      setIsAdmin(checkAdmin);
    });

    return () => {
      window.removeEventListener('storage', handleStorage);
      window.removeEventListener('irunbets_subscribers_config_updated', handleStorage);
      clearInterval(interval);
      unsubscribeAuth();
    };
  }, []);

  // Inline custom translations for rich visual mockup texts
  const badgeMap = {
    pt: 'Modelo de Predição IA 3.5 Ativo',
    en: 'AI Prediction Model 3.5 Active',
    fr: 'Modèle de Prédiction IA 3.5 Actif',
    it: 'Modello di Predizione IA 3.5 Attivo',
    de: 'KI-Vorhersagemodell 3.5 Aktiv',
  };

  const iosAppAlert = {
    pt: 'iRunBets iOS App em fase final de testes na App Store. Estará disponível em breve!',
    en: 'iRunBets iOS App is in final testing on the App Store. It will be available soon!',
    fr: "L'application iOS iRunBets est en phase finale d'essais sur l'App Store. Elle sera bientôt disponible !",
    it: "L'applicazione iOS iRunBets è nella fase finale di test sull'App Store. Sarà disponibile a breve!",
    de: 'Die iRunBets-iOS-App befindet sich in der abschließenden Testphase im App Store. Sie wird in Kürze verfügbar sein!',
  };

  const androidAppAlert = {
    pt: 'iRunBets Android App em fase final de aprovação na Play Store. Estará disponível em breve!',
    en: 'iRunBets Android App is in final approval phase on the Play Store. It will be available soon!',
    fr: "L'application Android iRunBets est en phase finale d'approbation sur le Play Store. Elle sera bientôt disponible !",
    it: "L'applicazione Android iRunBets è nella fase finale di approvazione sul Play Store. Sarà disponibile a breve!",
    de: 'Die iRunBets-Android-App befindet sich in der abschließenden Genehmigungsphase im Play Store. Sie wird in Kürze verfügbar sein!',
  };

  const macAppAlert = {
    pt: 'iRunBets macOS App em fase final de testes para Mac. Estará disponível em breve na Mac App Store!',
    en: 'iRunBets macOS App is in final testing phase for Mac. It will be available soon on the Mac App Store!',
    fr: "L'application macOS iRunBets est en phase finale d'essais pour Mac. Elle sera bientôt disponible sur le Mac App Store !",
    it: "L'applicazione macOS iRunBets è nella fase finale di test per Mac. Sarà disponibile a breve su Mac App Store!",
    de: 'Die iRunBets-macOS-App befindet sich in der abschließenden Testphase für Mac. Sie wird in Kürze im Mac App Store verfügbar sein!',
  };

  const soonBadge = {
    pt: 'Brevemente',
    en: 'Coming Soon',
    fr: 'Bientôt',
    it: 'A breve',
    de: 'In Kürze',
  };

  const downloadOnText = {
    pt: 'Descarregar na',
    en: 'Download on the',
    fr: 'Télécharger sur la',
    it: 'Scarica su',
    de: 'Laden im',
  };

  const getItOnText = {
    pt: 'Disponível no',
    en: 'Get it on',
    fr: 'Disponible sur',
    it: 'Disponibile su',
    de: 'Jetzt bei',
  };

  const mockupTitle = {
    pt: 'Cálculo de Probabilidade',
    en: 'Probability Calculation',
    fr: 'Calcul de Probabilité',
    it: 'Calcolo delle Probabilità',
    de: 'Wahrscheinlichkeitsberechnung',
  };

  const mockupMarketLabel = {
    pt: 'Mercado Sugerido',
    en: 'Suggested Market',
    fr: 'Marché Suggéré',
    it: 'Mercato Consigliato',
    de: 'Empfohlener Markt',
  };

  const mockupMarketValue = {
    pt: 'Total +2.5 Golos',
    en: 'Total +2.5 Goals',
    fr: 'Total +2.5 Buts',
    it: 'Totale +2.5 Gol',
    de: 'Gesamt +2.5 Tore',
  };

  const mockupOddLabel = {
    pt: 'Odd Calculada',
    en: 'Calculated Odd',
    fr: 'Cote Calculée',
    it: 'Quota Calcolata',
    de: 'Berechnete Quote',
  };

  const mockupEvLabel = {
    pt: 'Vantagem Matemática (+EV)',
    en: 'Mathematical Edge (+EV)',
    fr: 'Avantage Mathématique (+EV)',
    it: 'Vantaggio Matematico (+EV)',
    de: 'Mathematischer Vorteil (+EV)',
  };

  const mockupRawLabel = {
    pt: 'Valor Bruto',
    en: 'Raw Value',
    fr: 'Valeur Brute',
    it: 'Valore Lordo',
    de: 'Bruttowert',
  };

  const graphStart = {
    pt: 'Início',
    en: 'Start',
    fr: 'Début',
    it: 'Inizio',
    de: 'Start',
  };

  const graphMid = {
    pt: 'Intervalo',
    en: 'Half-time',
    fr: 'Mi-temps',
    it: 'Intervallo',
    de: 'Halbzeit',
  };

  const graphEnd = {
    pt: '75\' Automação',
    en: "75' Automation",
    fr: "75' Automatisation",
    it: "75' Automazione",
    de: "75' Automatisierung",
  };

  const mockupDemoBtn = {
    pt: 'Testar Modelo IA (Demo)',
    en: 'Test AI Model (Demo)',
    fr: 'Tester le Modèle IA (Démo)',
    it: 'Testa Modello IA (Demo)',
    de: 'KI-Modell Testen (Demo)',
  };

  const mockupDemoAlert = {
    pt: 'Simulação iRunBets: A IA filtrou 14.850 partidas de futebol esta semana e identificou 42 oportunidades matemáticas com EV > 8%.',
    en: 'iRunBets Simulation: The AI filtered 14,850 football matches this week and identified 42 mathematical opportunities with EV > 8%.',
    fr: 'Simulation iRunBets : L\'IA a filtré 14 850 matchs de football cette semaine et a identifié 42 opportunités mathématiques avec un EV > 8%.',
    it: 'Simulazione iRunBets: L\'IA ha filtrato 14.850 partite di calcio questa settimana e ha identificato 42 opportunità matematiche con EV > 8%.',
    de: 'iRunBets-Simulation: Die KI hat diese Woche 14.850 Fußballspiele gefiltert und 42 mathematische Gelegenheiten mit einem EV > 8 % identifiziert.',
  };

  return (
    <section id="hero" className="relative w-full pt-4 sm:pt-6 pb-12 overflow-hidden bg-[#0A0A0C] flex flex-col items-center justify-center tech-grid">
      
      {/* Glow Orbs in background */}
      <div className="absolute top-1/4 left-1/4 w-[500px] h-[500px] glow-orb-blue pointer-events-none"></div>
      <div className="absolute bottom-1/4 right-1/4 w-[550px] h-[550px] glow-orb-orange pointer-events-none"></div>

      <div className="max-w-7xl mx-auto px-6 w-full relative z-10 text-center flex flex-col items-center">

        {/* Slogans Edit Modal */}
        {isEditingSlogans && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/85 backdrop-blur-sm animate-in fade-in duration-200">
            <div className="relative w-full max-w-2xl bg-[#0F0F13] border border-zinc-800 rounded-2xl shadow-2xl p-6 md:p-8 animate-in zoom-in-95 duration-150 overflow-y-auto max-h-[90vh]">
              
              {/* Modal Header */}
              <div className="flex items-center justify-between border-b border-zinc-800 pb-4 mb-6 text-left">
                <div className="flex items-center gap-3">
                  <div className="p-2 rounded-lg bg-amber-500/10 text-amber-400">
                    <Edit className="w-5 h-5" />
                  </div>
                  <div>
                    <h3 className="text-sm font-bold text-white uppercase tracking-wider font-mono">
                      Editar Slogans Principais (Modo Admin)
                    </h3>
                    <p className="text-[10px] text-zinc-500 font-light mt-0.5">
                      Estes slogans são exibidos para todos os visitantes na página de entrada.
                    </p>
                  </div>
                </div>
                <button
                  onClick={() => setIsEditingSlogans(false)}
                  className="p-1.5 text-zinc-400 hover:text-white hover:bg-zinc-800 rounded-lg transition-colors cursor-pointer"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              <div className="space-y-5 text-left">
                {/* Title Inputs */}
                <div>
                  <label className="text-[10px] uppercase font-mono tracking-wider text-amber-400 font-bold block mb-2">
                    1. Slogan de Boas-Vindas / Título Principal
                  </label>
                  <div className="space-y-3">
                    <div>
                      <span className="text-[8.5px] uppercase font-mono tracking-wider text-zinc-500 block mb-1">Português (PT)</span>
                      <input
                        type="text"
                        value={formTitlePt}
                        onChange={(e) => setFormTitlePt(e.target.value)}
                        className="w-full bg-zinc-900 border border-zinc-800 text-xs px-3.5 py-2.5 rounded-lg focus:border-amber-500 outline-none text-white font-medium"
                        placeholder="Ex: iRunBets: A tua vantagem matemática e gestão de banca..."
                      />
                    </div>
                    <div>
                      <span className="text-[8.5px] uppercase font-mono tracking-wider text-zinc-500 block mb-1">Inglês (EN) / Outros</span>
                      <input
                        type="text"
                        value={formTitleEn}
                        onChange={(e) => setFormTitleEn(e.target.value)}
                        className="w-full bg-zinc-900 border border-zinc-800 text-xs px-3.5 py-2.5 rounded-lg focus:border-amber-500 outline-none text-white font-medium"
                        placeholder="Ex: iRunBets: Your mathematical edge..."
                      />
                    </div>
                  </div>
                </div>

                {/* Color Palettes Picker */}
                <div className="bg-zinc-950 p-4 rounded-xl border border-zinc-850">
                  <span className="text-[10px] uppercase font-mono tracking-wider text-sky-400 font-bold block mb-1">
                    🎨 Estilo & Cores das Palavras Destacadas
                  </span>
                  <p className="text-[10.5px] text-zinc-400 leading-normal mb-3">
                    Envolve as palavras que queres colorir com <strong>parênteses retos [como isto]</strong> no título acima (ex: <code className="text-amber-400 font-mono text-[9.5px] bg-[#121217] px-1 py-0.5 rounded">[gestão de banca inteligente]</code>). Se não usares parênteses retos, as palavras originais serão coloridas automaticamente.
                  </p>
                  
                  <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                    {COLOR_PRESETS.map((preset) => (
                      <button
                        key={preset.id}
                        type="button"
                        onClick={() => setFormHighlightStyle(preset.value)}
                        className={`flex items-center gap-2 p-2 rounded-lg border text-left transition-all text-[10px] font-mono cursor-pointer ${
                          formHighlightStyle === preset.value
                            ? 'bg-zinc-90 w-full border-amber-500 text-white shadow-md'
                            : 'bg-[#121217] border-zinc-900 text-zinc-400 hover:border-zinc-800 hover:text-zinc-300'
                        }`}
                      >
                        <span className={`w-3 h-3 rounded-full shrink-0 ${preset.value}`} />
                        <span className="truncate">{preset.name}</span>
                      </button>
                    ))}
                  </div>
                </div>

                {/* Desc/Subtitle Inputs */}
                <div>
                  <label className="text-[10px] uppercase font-mono tracking-wider text-orange-400 font-bold block mb-2">
                    2. Segundo Slogan / Descrição Geral
                  </label>
                  <div className="space-y-3">
                    <div>
                      <span className="text-[8.5px] uppercase font-mono tracking-wider text-zinc-500 block mb-1">Português (PT)</span>
                      <textarea
                        rows={3}
                        value={formDescPt}
                        onChange={(e) => setFormDescPt(e.target.value)}
                        className="w-full bg-zinc-900 border border-zinc-800 text-xs px-3.5 py-2.5 rounded-lg focus:border-amber-500 outline-none text-white font-normal leading-relaxed"
                        placeholder="Ex: A primeira plataforma integrada que purifica centenas..."
                      />
                    </div>
                    <div>
                      <span className="text-[8.5px] uppercase font-mono tracking-wider text-zinc-500 block mb-1">Inglês (EN) / Outros</span>
                      <textarea
                        rows={3}
                        value={formDescEn}
                        onChange={(e) => setFormDescEn(e.target.value)}
                        className="w-full bg-zinc-900 border border-zinc-800 text-xs px-3.5 py-2.5 rounded-lg focus:border-amber-500 outline-none text-white font-normal leading-relaxed"
                        placeholder="Ex: The first integrated platform that purifies..."
                      />
                    </div>
                  </div>
                </div>

                {/* Actions */}
                <div className="flex items-center gap-3 pt-4 border-t border-zinc-800">
                  <button
                    type="button"
                    onClick={() => setIsEditingSlogans(false)}
                    className="flex-1 py-3 bg-zinc-900 hover:bg-zinc-850 text-zinc-400 hover:text-white font-bold text-xs uppercase tracking-wider rounded-xl transition-all border border-zinc-800 cursor-pointer text-center"
                  >
                    Cancelar
                  </button>
                  <button
                    type="button"
                    disabled={isSaving}
                    onClick={async () => {
                      setIsSaving(true);
                      try {
                        const updatedConfig = {
                          ...config,
                          heroTitlePt: formTitlePt.trim(),
                          heroTitleEn: formTitleEn.trim(),
                          heroDescPt: formDescPt.trim(),
                          heroDescEn: formDescEn.trim(),
                          heroHighlightStyle: formHighlightStyle
                        };
                        await saveSubscribersConfig(updatedConfig);
                        setConfig(updatedConfig);
                        setIsEditingSlogans(false);
                        window.dispatchEvent(new Event('storage'));
                      } catch (err: any) {
                        alert('Erro ao guardar alterações: ' + err?.message);
                      } finally {
                        setIsSaving(false);
                      }
                    }}
                    className="flex-1 py-3 bg-gradient-to-r from-sky-500 via-orange-500 to-amber-500 hover:opacity-90 active:scale-95 text-white font-black text-xs uppercase tracking-wider rounded-xl transition-all cursor-pointer shadow-lg block text-center"
                  >
                    {isSaving ? 'A guardar...' : '💾 Publicar Slogans'}
                  </button>
                </div>

              </div>
            </div>
          </div>
        )}

        {/* App Store / Google Play Mimic Buttons */}
        <div className="flex flex-wrap justify-center items-center gap-4 mt-2 mb-12 animate-fade-in-up">
          {/* App Store button */}
          <button
            onClick={() => {
              if (config.isAppStoreAvailable && config.appStoreUrl) {
                window.open(config.appStoreUrl, '_blank', 'noopener,noreferrer');
              } else {
                alert(iosAppAlert[language]);
              }
            }}
            className="relative flex items-center gap-3 bg-zinc-900 hover:bg-zinc-800 text-white rounded-xl px-5 py-2.5 border border-zinc-700/60 hover:border-sky-500/50 transition-all duration-300 group cursor-pointer"
          >
            {!config.isAppStoreAvailable && (
              <span className="absolute -top-2.5 -right-2 px-2.5 py-0.5 text-[8.5px] font-bold text-black bg-amber-400 rounded-full border border-amber-300 shadow-md uppercase tracking-wider animate-pulse whitespace-nowrap">
                {soonBadge[language]}
              </span>
            )}
            <svg viewBox="0 0 384 512" className="w-6 h-6 fill-current text-white group-hover:text-sky-400 transition-colors">
              <path d="M318.7 268.7c-.2-36.7 16.4-64.4 50-84.8-18.8-26.9-47.2-41.7-84.7-44.6-35.5-2.8-74.3 20.7-88.5 20.7-15 0-48.7-22.9-84.5-22.1-47.3 .9-90.2 28-114.8 70.7-49.5 86.2-12.7 215.1 35.7 284.6 23.7 34.1 52.1 71.8 89 70.4 35.7-1.4 49-23 89.4-23 40.4 0 52.4 23 89.4 22.2 38.4-.7 63.4-33.8 86.9-68.2 27.8-40.4 39.2-79.5 39.7-81.5-.9-.4-76.8-29.4-77-115.1zM260.3 84.4c19.5-23.5 32.4-55.9 28.5-88.4-27.6 1.1-61.9 18.8-81.3 41.5-16.1 18.5-30.1 51.5-26.3 83.4 30.7 2.4 63-14.9 79.1-36.5z"/>
            </svg>
            <div className="text-left leading-none">
              <span className="text-[10px] text-zinc-400 block uppercase tracking-wider font-semibold">{downloadOnText[language]}</span>
              <span className="text-sm font-semibold text-white tracking-wide block">App Store</span>
            </div>
          </button>

          {/* Google Play button */}
          <button
            onClick={() => {
              if (config.isGooglePlayAvailable && config.googlePlayUrl) {
                window.open(config.googlePlayUrl, '_blank', 'noopener,noreferrer');
              } else {
                alert(androidAppAlert[language]);
              }
            }}
            className="relative flex items-center gap-3 bg-zinc-900 hover:bg-zinc-800 text-white rounded-xl px-5 py-2.5 border border-zinc-700/60 hover:border-orange-500/50 transition-all duration-300 group cursor-pointer"
          >
            {!config.isGooglePlayAvailable && (
              <span className="absolute -top-2.5 -right-2 px-2.5 py-0.5 text-[8.5px] font-bold text-black bg-amber-400 rounded-full border border-amber-300 shadow-md uppercase tracking-wider animate-pulse whitespace-nowrap">
                {soonBadge[language]}
              </span>
            )}
            <svg viewBox="0 0 512 512" className="w-5 h-5 fill-current text-white group-hover:text-orange-400 transition-colors">
              <path d="M325.3 234.3L104.6 13l280.8 161.2-60.1 60.1zM47 0C34 6.8 25.3 19.2 25.3 35.3v441.3c0 16.1 8.7 28.5 21.7 35.3l256.6-256L47 0zm425.2 225.6l-58 33.3-60.1-60.1L4.3 32.7l320.7 183.9c14.2 8.1 23.1 23.1 23.1 40s-8.9 31.9-23.1 40L104.6 499l280.8-161.2 58.4 33.5c15.6 9 34.6 9 50.2 0 16.1-9.3 26-26.2 26-44.8V270.4c0-18.6-9.9-35.6-26-44.8zM325.3 277.7L385.4 337.8 104.6 499l220.7-221.3z"/>
            </svg>
            <div className="text-left leading-none">
              <span className="text-[10px] text-zinc-400 block uppercase tracking-wider font-semibold">{getItOnText[language]}</span>
              <span className="text-sm font-semibold text-white tracking-wide block">Google Play</span>
            </div>
          </button>

          {/* macOS App Store button */}
          <button
            onClick={() => {
              if (config.isMacAppAvailable && config.macAppUrl) {
                window.open(config.macAppUrl, '_blank', 'noopener,noreferrer');
              } else {
                alert(macAppAlert[language]);
              }
            }}
            className="relative flex items-center gap-3 bg-zinc-900 hover:bg-zinc-800 text-white rounded-xl px-5 py-2.5 border border-zinc-700/60 hover:border-purple-500/50 transition-all duration-300 group cursor-pointer"
          >
            {!config.isMacAppAvailable && (
              <span className="absolute -top-2.5 -right-2 px-2.5 py-0.5 text-[8.5px] font-bold text-black bg-amber-400 rounded-full border border-amber-300 shadow-md uppercase tracking-wider animate-pulse whitespace-nowrap">
                {soonBadge[language]}
              </span>
            )}
            <svg viewBox="0 0 384 512" className="w-6 h-6 fill-current text-white group-hover:text-purple-400 transition-colors">
              <path d="M318.7 268.7c-.2-36.7 16.4-64.4 50-84.8-18.8-26.9-47.2-41.7-84.7-44.6-35.5-2.8-74.3 20.7-88.5 20.7-15 0-48.7-22.9-84.5-22.1-47.3 .9-90.2 28-114.8 70.7-49.5 86.2-12.7 215.1 35.7 284.6 23.7 34.1 52.1 71.8 89 70.4 35.7-1.4 49-23 89.4-23 40.4 0 52.4 23 89.4 22.2 38.4-.7 63.4-33.8 86.9-68.2 27.8-40.4 39.2-79.5 39.7-81.5-.9-.4-76.8-29.4-77-115.1zM260.3 84.4c19.5-23.5 32.4-55.9 28.5-88.4-27.6 1.1-61.9 18.8-81.3 41.5-16.1 18.5-30.1 51.5-26.3 83.4 30.7 2.4 63-14.9 79.1-36.5z"/>
            </svg>
            <div className="text-left leading-none">
              <span className="text-[10px] text-zinc-400 block uppercase tracking-wider font-semibold">{downloadOnText[language]}</span>
              <span className="text-sm font-semibold text-white tracking-wide block">macOS App</span>
            </div>
          </button>
        </div>

        {/* Custom Image / Mockup Display */}
        <div className="w-full flex flex-col items-center justify-center gap-8 mt-4">
          {config.homepageCustomImageUrl && (
            <div className="w-full max-w-2xl relative group animate-fade-in-up mt-4">
              {/* Glow backing */}
              <div className="absolute -inset-1 rounded-2xl bg-gradient-to-tr from-sky-500/30 to-orange-500/30 opacity-30 blur-lg group-hover:opacity-40 transition-opacity duration-500"></div>
              
              <div className="relative border border-zinc-800 bg-zinc-950/80 p-2.5 rounded-2xl shadow-xl overflow-hidden">
                <img
                  src={config.homepageCustomImageUrl}
                  alt="Feature Preview"
                  className="w-full h-auto rounded-xl object-cover max-h-[460px] select-none"
                  referrerPolicy="no-referrer"
                />
              </div>
            </div>
          )}
        </div>

      </div>
    </section>
  );
};

export default Hero;
