import React, { useState } from 'react';
import { useLanguage } from '../services/LanguageContext';

interface PurifierProps {
  userSubscriptionStatus?: string;
  onUpgradeClick?: () => void;
}

const Purifier: React.FC<PurifierProps> = ({ userSubscriptionStatus = 'Gratuito', onUpgradeClick }) => {
  const { language } = useLanguage();

  const labelsMap = {
    pt: {
      badge: 'MÓDULO DE EXTRAÇÃO IA',
      title: 'O Purificador de Odds',
      desc1: 'Copiar e colar dados de canais de tips ou sites desorganizados costumava ser um processo confuso e demorado. Com o Purificador de Odds, a IA resolve isso instantaneamente para ti.',
      desc2: 'Basta introduzir qualquer bloco de texto bruto desestruturado. O nosso processador de linguagem natural identifica de imediato as equipas certas, a liga correspondente, o mercado de aposta sugerido, valida a odd em tempo real contra o mercado e calcula o Valor Esperado (+EV).',
      feat1Title: 'Processamento Instantâneo',
      feat1Desc: 'Transforma texto bruto em dados estruturados legíveis em menos de 1 segundo.',
      feat2Title: 'Cálculo de EV Real',
      feat2Desc: 'Cruza os dados extraídos diretamente com as probabilidades matemáticas de valor.',
      screenshotLab: '[Inserir Screenshot do Extrator/Purificador]',
      sectorTitle: 'SECTOR DE PURIFICAÇÃO',
      active: 'ATIVO',
      parserTitle: 'Parser de Texto Brutal',
      areaLabel: 'Área de Texto Bruto (Escreve ou testa outro):',
      placeholder: 'Cola o texto da tua aposta aqui...',
      purifying: 'A Processar...',
      testMapping: 'Testar Mapeamento',
      structuredTitle: 'Estrutura Extraída por IA',
      teamHome: 'Equipa Principal',
      teamAway: 'Equipa Visitante',
      market: 'Mercado Extraído',
      odd: 'Odd Extraída',
      ev: 'Aproveitamento (+EV)',
      disclaimer: '*A extração automática utiliza o modelo iR-GPT. Valida sempre os dados no teu boletim de apostas oficial.',
      benficaPortoText: 'Benfica vs Porto na sexta à noite. Odd de 1.95 para o Benfica vencer em casa. Valor matemático de entrada sugerido.',
      barcelonaRealText: 'Sporting CP vs SC Braga. Odd de 1.85 para Mais de 2.5 golos.',
      fallbackTeamHome: 'SL Benfica',
      fallbackTeamAway: 'FC Porto',
      fallbackMarket: 'Resultado Final - 1X2 (Vencedor Casa)',
      fallbackLeague: 'Liga Portugal',
      modulElevada: 'Elevada (72%)',
      modulMuitoElevada: 'Muito Elevada (78%)',
      modulModerada: 'Moderada (64%)',
    },
    en: {
      badge: 'AI EXTRACTION MODULE',
      title: 'The Odds Purifier',
      desc1: 'Copying and pasting data from tip channels or disorganized sites used to be a confusing and slow process. With the Odds Purifier, AI resolves this instantly for you.',
      desc2: 'Simply enter any unstructured raw text block. Our natural language processor immediately identifies the correct teams, the matching league, the suggested betting market, validates the odd in real-time, and calculates the Expected Value (+EV).',
      feat1Title: 'Instant Processing',
      feat1Desc: 'Transforms raw text into readable structured data in less than 1 second.',
      feat2Title: 'Real EV Calculation',
      feat2Desc: 'Crosses extracted data directly with mathematical value probabilities.',
      screenshotLab: '[Insert Extractor/Purifier Screenshot]',
      sectorTitle: 'PURIFICATION SECTOR',
      active: 'ACTIVE',
      parserTitle: 'Raw Text Parser',
      areaLabel: 'Raw Text Area (Write or test another):',
      placeholder: 'Paste your bet text here...',
      purifying: 'Processing...',
      testMapping: 'Test Mapping',
      structuredTitle: 'Structure Extracted by AI',
      teamHome: 'Home Team',
      teamAway: 'Away Team',
      market: 'Extracted Market',
      odd: 'Extracted Odd',
      ev: 'Mathematical Edge (+EV)',
      disclaimer: '*Automatic extraction uses the iR-GPT model. Always validate the data on your official betslip.',
      benficaPortoText: 'Benfica vs Porto on Friday night. Odd of 1.95 for Benfica to win at home. Mathematical value entry suggested.',
      barcelonaRealText: 'Sporting CP vs SC Braga. Odd of 1.85 for Over 2.5 goals.',
      fallbackTeamHome: 'SL Benfica',
      fallbackTeamAway: 'FC Porto',
      fallbackMarket: 'Match Odds - 1X2 (Home Win)',
      fallbackLeague: 'Liga Portugal',
      modulElevada: 'High (72%)',
      modulMuitoElevada: 'Very High (78%)',
      modulModerada: 'Moderate (64%)',
    },
    fr: {
      badge: 'MODULE D\'EXTRACTION IA',
      title: 'Le Purificateur de Cotes',
      desc1: 'Copier et coller des données provenant de canaux de pronostics ou de sites désorganisés était un processus fastidieux. Grâce au Purificateur de Cotes, l\'IA résout cela instantanément pour vous.',
      desc2: 'Saisissez simplement n\'importe quel bloc de texte brut. Notre processeur de langage naturel identifie immédiatement les bonnes équipes, la ligue, le marché suggéré, valide la cote en temps réel et calcule la valeur attendue (+EV).',
      feat1Title: 'Traitement Instantané',
      feat1Desc: 'Transforme le texte brut en données structurées et lisibles en moins d\'une seconde.',
      feat2Title: 'Calcul de l\'EV Réel',
      feat2Desc: 'Associe directement les données extraites aux probabilités mathématiques de rentabilité.',
      screenshotLab: '[Capture d\'écran de l\'extracteur / purificateur]',
      sectorTitle: 'SECTEUR DE PURIFICATION',
      active: 'ACTIF',
      parserTitle: 'Analyseur de Texte Brut',
      areaLabel: 'Zone de Texte Brut (Créez ou testez un autre text) :',
      placeholder: 'Collez le texte de votre pari ici...',
      purifying: 'Analyse en cours...',
      testMapping: 'Tester le Mappage',
      structuredTitle: 'Structure Extraite par l\'IA',
      teamHome: 'Équipe Domicile',
      teamAway: 'Équipe Extérieur',
      market: 'Marché Extrait',
      odd: 'Cote Extraite',
      ev: 'Avantage Mathématique (+EV)',
      disclaimer: '*La purification automatique est basée sur le modèle iR-GPT. Validez toujours vos données.',
      benficaPortoText: 'Benfica contre Porto vendredi soir. Cote de 1.95 pour la victoire de Benfica à domicile. Entrée de valeur suggérée.',
      barcelonaRealText: 'Sporting CP contre SC Braga. Cote de 1.85 pour Plus de 2.5 buts.',
      fallbackTeamHome: 'SL Benfica',
      fallbackTeamAway: 'FC Porto',
      fallbackMarket: 'Résultat Final - 1X2 (Victoire Domicile)',
      fallbackLeague: 'Liga Portugal',
      modulElevada: 'Élevée (72%)',
      modulMuitoElevada: 'Très Élevée (78%)',
      modulModerada: 'Modérée (64%)',
    },
    it: {
      badge: 'MODULO DI ESTRAZIONE IA',
      title: 'Il Purificatore di Quote',
      desc1: 'Copiare e incollare i dati da canali di tipsters o siti disorganizzati era un processo confuso e noioso. Con il Purificatore di Quote, l\'IA risolve tutto all\'istante per te.',
      desc2: 'Incolla qualsiasi testo grezzo e non strutturato. Il nostro processore di linguaggio naturale riconosce subito le squadre corrette, la lega corrispondente, il mercato consigliato, verifica la quota in tempo reale e calcola il Valore Atteso (+EV).',
      feat1Title: 'Elaborazione Istantanea',
      feat1Desc: 'Trasforma il testo grezzo in dati strutturati leggibili in meno di 1 secondo.',
      feat2Title: 'Calcolo di EV Reale',
      feat2Desc: 'Incrocia i dati estratti con le reali probabilità matematiche di valore.',
      screenshotLab: '[Screenshot dell\'Estrattore/Purificatore]',
      sectorTitle: 'SETTORE DI PURIFICAZIONE',
      active: 'ATTIVO',
      parserTitle: 'Parser di Testo Grezzo',
      areaLabel: 'Area Testo Grezzo (Scrivi o prova un altro testo):',
      placeholder: 'Incolla il testo del tuo pronostico qui...',
      purifying: 'Elaborazione...',
      testMapping: 'Verifica Mappatura',
      structuredTitle: 'Struttura Estratta dall\'IA',
      teamHome: 'Squadra di Casa',
      teamAway: 'Squadra Ospite',
      market: 'Mercato Estratto',
      odd: 'Quota Estratta',
      ev: 'Margine Statistico (+EV)',
      disclaimer: '*L\'estrazione automatica usa il modello iR-GPT. Verifica sempre i dettagli sul bookmaker.',
      benficaPortoText: 'Benfica vs Porto venerdì sera. Quota 1.95 per la vittoria del Benfica in casa. Valore matematico rilevato.',
      barcelonaRealText: 'Sporting CP vs SC Braga. Quota 1.85 per Over 2.5 gol.',
      fallbackTeamHome: 'SL Benfica',
      fallbackTeamAway: 'FC Porto',
      fallbackMarket: 'Esito Finale - 1X2 (Vittoria Casa)',
      fallbackLeague: 'Liga Portugal',
      modulElevada: 'Elevata (72%)',
      modulMuitoElevada: 'Molto Elevata (78%)',
      modulModerada: 'Moderata (64%)',
    },
    de: {
      badge: 'KI-EXTRAKTIONSMODUL',
      title: 'Der Quoten-Analyser',
      desc1: 'Das Kopieren und Einfügen von Daten aus ungeordneten Tipp-Kanälen oder Foren war bisher zeitaufwändig. Der Quoten-Analyser übernimmt das jetzt in Sekundenschnelle für dich.',
      desc2: 'Füge einfach einen unstrukturierten Text ein. Unsere semantische Textanalyse identifiziert sofort Teams, die passende Liga, den vorgeschlagenen Wettmarkt, validiert die aktuellen Marktquoten und berechnet den Erwartungswert (+EV).',
      feat1Title: 'Echtzeit-Verarbeitung',
      feat1Desc: 'Wandelt unstrukturierten Text in weniger als einer Sekunde in lesbare Tabellen um.',
      feat2Title: 'Mathematische EV-Berechnung',
      feat2Desc: 'Vergleicht extrahierte Werte direkt mit realen statistischen Wahrscheinlichkeiten.',
      screenshotLab: '[Bildschirmfoto des Analysers einfügen]',
      sectorTitle: 'ANALYSE-SEKTOR',
      active: 'AKTIV',
      parserTitle: 'Semantischer Text-Parser',
      areaLabel: 'Eingabebereich für Rohtext (Schreiben oder kopieren):',
      placeholder: 'Füge deinen Wettext hier ein...',
      purifying: 'Wird analysiert...',
      testMapping: 'Kartenabgleich testen',
      structuredTitle: 'Vom System strukturierte Daten',
      teamHome: 'Heimmannschaft',
      teamAway: 'Auswärtsmannschaft',
      market: 'Erkannter Markt',
      odd: 'Marktquote',
      ev: 'Erwartungswert (+EV)',
      disclaimer: '*Die automatische Analyse basiert auf dem iR-GPT Modell. Überprüfe die Werte bei deinem Buchmacher.',
      benficaPortoText: 'Benfica gegen Porto am Freitagabend. Quote von 1.95 für Heimsieg Benfica. Mathematischer Vorteil erkannt.',
      barcelonaRealText: 'Sporting CP gegen SC Braga. Quote 1.85 für Über 2.5 Tore.',
      fallbackTeamHome: 'SL Benfica',
      fallbackTeamAway: 'FC Porto',
      fallbackMarket: 'Endergebnis - 1X2 (Heimsieg)',
      fallbackLeague: 'Liga Portugal',
      modulElevada: 'Hoch (72%)',
      modulMuitoElevada: 'Sehr Hoch (78%)',
      modulModerada: 'Mittel (64%)',
    }
  };
  const labels = labelsMap[language] || labelsMap.pt;

  const [inputText, setInputText] = useState(labels.benficaPortoText);
  const [isPurifying, setIsPurifying] = useState(false);
  const [purifiedResult, setPurifiedResult] = useState({
    teamHome: labels.fallbackTeamHome,
    teamAway: labels.fallbackTeamAway,
    market: labels.fallbackMarket,
    odd: '1.95',
    calculatedValue: '+8.45% EV',
    confidence: labels.modulElevada,
    league: labels.fallbackLeague
  });

  const handlePurifySimulate = () => {
    setIsPurifying(true);
    setTimeout(() => {
      setIsPurifying(false);
      if (inputText.toLowerCase().includes('barcelona') || inputText.toLowerCase().includes('real')) {
        setPurifiedResult({
          teamHome: 'Real Madrid',
          teamAway: 'Barcelona',
          market: language === 'pt' ? 'Resultado Final - 1X2 (Vitória Real)' : language === 'en' ? 'Match Odds - 1X2 (Real Win)' : language === 'fr' ? 'Résultat Final - 1X2 (Victoire Real)' : language === 'it' ? 'Esito Finale - 1X2 (Vittoria Real)' : 'Endergebnis - 1X2 (Sieg Real)',
          odd: '2.20',
          calculatedValue: '+11.20% EV',
          confidence: labels.modulMuitoElevada,
          league: 'La Liga'
        });
      } else if (inputText.toLowerCase().includes('sporting') || inputText.toLowerCase().includes('braga')) {
        setPurifiedResult({
          teamHome: 'Sporting CP',
          teamAway: 'SC Braga',
          market: language === 'pt' ? 'Total de Golos - Mais de 2.5' : language === 'en' ? 'Total Goals - Over 2.5' : language === 'fr' ? 'Total Buts - Plus de 2.5' : language === 'it' ? 'Totale Gol - Over 2.5' : 'Tore Gesamt - Über 2.5',
          odd: '1.85',
          calculatedValue: '+6.12% EV',
          confidence: labels.modulModerada,
          league: labels.fallbackLeague
        });
      } else {
        setPurifiedResult({
          teamHome: labels.fallbackTeamHome,
          teamAway: labels.fallbackTeamAway,
          market: labels.fallbackMarket,
          odd: '1.95',
          calculatedValue: '+8.45% EV',
          confidence: labels.modulElevada,
          league: labels.fallbackLeague
        });
      }
    }, 800);
  };

  return (
    <section id="purificador" className="relative w-full py-24 bg-[#0E0E11] border-b border-white/5 overflow-hidden">
      
      {/* Background radial glow */}
      <div className="absolute top-1/2 left-0 -translate-y-1/2 w-[400px] h-[400px] glow-orb-blue pointer-events-none opacity-40"></div>

      <div className="max-w-7xl mx-auto px-6 grid grid-cols-1 lg:grid-cols-12 gap-16 items-center">
        
        {/* Left: Text explanation */}
        <div className="lg:col-span-6 flex flex-col items-start text-left">
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

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-6 w-full pt-4 border-t border-zinc-900">
            <div className="flex gap-3">
              <div className="w-8 h-8 rounded-lg bg-sky-500/10 border border-sky-500/20 flex items-center justify-center text-sky-400 flex-shrink-0">
                <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor" className="w-4 h-4">
                  <path strokeLinecap="round" strokeLinejoin="round" d="m3.75 13.5 10.5-11.25L12 10.5h8.25L9.75 21.75 12 13.5H3.75Z" />
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
                  <path strokeLinecap="round" strokeLinejoin="round" d="M12 3v18m9-9H3" />
                </svg>
              </div>
              <div>
                <h4 className="text-sm font-semibold text-white mb-1">{labels.feat2Title}</h4>
                <p className="text-xs text-zinc-500">{labels.feat2Desc}</p>
              </div>
            </div>
          </div>
        </div>

        {/* Right: iPhone Frame containing direct visual labels and preview emulator */}
        <div className="lg:col-span-6 flex justify-center items-center w-full relative">
          
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
                    pt: "O Purificador de Odds não está disponível na sua Subscrição Basic (5.99€).",
                    en: "The Odds Purifier is not available in your Basic Subscription (5.99€).",
                    fr: "Le Purificateur de Cotes n'est pas disponible dans votre abonnement Basic (5.99€).",
                    it: "Il Purificatore di Quote non è disponibile nel tuo abbonamento Basic (5.99€).",
                    de: "Der Quoten-Analyser ist im Basis-Abonnement (5,99 €) nicht verfügbar."
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
            <div className="absolute -inset-1 rounded-[42px] bg-sky-500/20 blur-xl group-hover:opacity-100 transition duration-500 pointer-events-none"></div>
            
            {/* iPhone Shell */}
            <div className="relative border-8 border-zinc-800 bg-[#0A0A0C] rounded-[40px] shadow-2xl overflow-hidden aspect-[9/19] w-full flex flex-col text-left select-none">
              
              {/* Dynamic Island Block */}
              <div className="absolute top-2.5 left-1/2 -translate-x-1/2 w-28 h-5.5 bg-black rounded-full z-30 flex items-center justify-between px-2.5">
                <div className="w-1.5 h-1.5 rounded-full bg-orange-500/60"></div>
                <div className="w-1.5 h-1.5 rounded-full bg-zinc-900"></div>
              </div>

              {/* Explicit Label requested by client */}
              <div className="bg-sky-500 text-black text-[9px] font-bold py-1.5 px-3 tracking-widest text-center uppercase relative z-30 mt-8">
                 {labels.screenshotLab}
              </div>

              {/* iPhone screen canvas */}
              <div className="flex-1 bg-[#101014] p-5 flex flex-col justify-between overflow-y-auto no-scrollbar">
                
                {/* Header widget */}
                <div className="border-b border-zinc-800/80 pb-3 mb-4">
                  <div className="flex justify-between items-center text-[9px] text-zinc-500 mb-1">
                    <span>{labels.sectorTitle}</span>
                    <span className="font-mono text-sky-400">{labels.active}</span>
                  </div>
                  <h3 className="text-sm font-bold text-white tracking-tight">{labels.parserTitle}</h3>
                </div>

                {/* Input box emulator inside the iPhone frame */}
                <div className="mb-4">
                  <label className="text-[9px] uppercase tracking-wider font-bold text-zinc-400 block mb-1.5">{labels.areaLabel}</label>
                  <div className="relative">
                    <textarea 
                      value={inputText}
                      onChange={(e) => setInputText(e.target.value)}
                      className="w-full h-24 text-[10px] p-2 bg-zinc-900 border border-zinc-800 focus:border-sky-500 rounded-lg outline-none text-zinc-300 resize-none font-mono leading-normal"
                      placeholder={labels.placeholder}
                    />
                    <button 
                      onClick={handlePurifySimulate}
                      className="absolute right-2 bottom-2 bg-sky-500 hover:bg-sky-400 text-black font-bold text-[8px] uppercase tracking-widest px-2.5 py-1.5 rounded-md transition-colors cursor-pointer"
                    >
                      {isPurifying ? labels.purifying : labels.testMapping}
                    </button>
                  </div>
                </div>

                {/* Output parsed card inside the iPhone frame */}
                <div className="bg-zinc-900/80 border border-zinc-800 rounded-xl p-3 flex-1 flex flex-col justify-between">
                  <div className="flex justify-between items-center border-b border-zinc-800/60 pb-2 mb-2">
                    <span className="text-[9px] text-zinc-500 uppercase tracking-widest font-semibold">{labels.structuredTitle}</span>
                    <span className="text-[8px] px-2 py-0.5 rounded bg-sky-500/10 text-sky-400 font-bold font-mono">{purifiedResult.league}</span>
                  </div>

                  <div className="space-y-2 text-xs">
                    <div className="flex justify-between">
                      <span className="text-zinc-500 text-[10px]">{labels.teamHome}</span>
                      <span className="text-zinc-200 font-semibold">{purifiedResult.teamHome}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-zinc-500 text-[10px]">{labels.teamAway}</span>
                      <span className="text-zinc-200 font-semibold">{purifiedResult.teamAway}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-zinc-500 text-[10px]">{labels.market}</span>
                      <span className="text-zinc-300 font-medium break-all text-right max-w-[130px]">{purifiedResult.market}</span>
                    </div>
                    
                    <div className="border-t border-zinc-800/60 my-2 pt-2 flex justify-between">
                      <span className="text-zinc-500 text-[10px]">{labels.odd}</span>
                      <span className="text-orange-400 font-mono font-bold">{purifiedResult.odd}</span>
                    </div>

                    <div className="flex justify-between items-center">
                      <span className="text-zinc-500 text-[10px]">{labels.ev}</span>
                      <span className="text-emerald-400 font-bold font-mono text-sm bg-emerald-500/10 px-1.5 py-0.5 rounded">{purifiedResult.calculatedValue}</span>
                    </div>
                  </div>
                </div>

                {/* Simulated alert info */}
                <div className="mt-3 text-[8px] text-zinc-500 text-center leading-relaxed">
                  {labels.disclaimer}
                </div>

              </div>
              
              {/* Home Indicator bar */}
              <div className="absolute bottom-1.5 left-1/2 -translate-x-1/2 w-32 h-1 bg-zinc-800 rounded-full z-30"></div>
            </div>

          </div>
        </div>

      </div>
    </section>
  );
};

export default Purifier;
