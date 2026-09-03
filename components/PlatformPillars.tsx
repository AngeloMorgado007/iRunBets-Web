import React, { useState, useEffect } from 'react';
import { useLanguage } from '../services/LanguageContext';

export interface PillarItem {
  id: string;
  images: string;
  title: {
    pt: string;
    en: string;
    fr: string;
    it: string;
    de: string;
  };
  desc: {
    pt: string;
    en: string;
    fr: string;
    it: string;
    de: string;
  };
  details: {
    pt: string;
    en: string;
    fr: string;
    it: string;
    de: string;
  };
  borderGlow?: string;
}

export const DEFAULT_PILLARS: PillarItem[] = [
  {
    id: 'engine',
    images: 'https://images.unsplash.com/photo-1551288049-bebda4e38f71?auto=format&fit=crop&q=80&w=800',
    title: {
      pt: '📊 iR-Engine Pro',
      en: '📊 iR-Engine Pro',
      fr: '📊 iR-Engine Pro',
      it: '📊 iR-Engine Pro',
      de: '📊 iR-Engine Pro',
    },
    desc: {
      pt: 'O cérebro analítico. Modelo de regressão Poisson que processa cerca de 150 métricas de equipe para projetar a probabilidade estatística justa e identificar odds desreguladas (+EV).',
      en: 'The analytical brain. A Poisson regression model scaling 150+ team metrics to instantly project fair statistical probabilities and reveal out-of-line value odds (+EV).',
      fr: 'Le cerveau analytique. Un modèle mathématique de Poisson traitant plus de 150 variables pour évaluer la probabilité juste et détecter les values (+EV).',
      it: 'Il cervello analitico. Un modelo di regressione Poisson che calcola oltre 150 metriche di squadra per individuare quote disallineate di valore (+EV).',
      de: 'Das analytische Gehirn. Ein Poisson-Regressionsmodell, das über 150 Mannschaftskennzahlen berechnet, um faire Wahrscheinlichkeiten und profitable Quoten (+EV) zu finden.',
    },
    details: {
      pt: 'O cérebro da nossa plataforma assenta num modelo estatístico avançado de regressão de Poisson cruzado com simulações de Monte Carlo. O sistema analisa mais de 150 variáveis ao segundo, incluindo xG (Expected Goals) histórico e recente, fadiga estrutural do plantel, eficácia ofensiva e defensiva sob condições climáticas específicas e comportamento tático fora de portas. Com isto, calcula as probabilidades matemáticas reais (odds justas) de centenas de mercados diários e compara-as instantaneamente com as cotações oferecidas pelas casas de apostas. Quando a diferença é superior a um desvio estatístico aceitável, a odd é classificada como +EV (Valor Esperado Positivo), garantindo uma vantagem matemática a longo prazo para o investidor.',
      en: 'The core of our platform relies on an architectural Poisson regression model powered by Monte Carlo simulations. The system parses 150+ variables per second to define true mathematical values (fair odds) for matches, exposing discrepancies in bookmakers\' prices for positive expected value (+EV). This structural advantage allows users to execute trades on mispriced outcomes with historical probability tilted firmly in their favor.',
      fr: 'Le cœur de notre plateforme repose sur un modèle statistique de Poisson croisé avec des simulations de Monte Carlo. Le système évalue instantanément plus de 150 variables pour chaque match (xG, fatigue, dynamique tactique) afin de dégager la probabilité réelle de chaque événement. Notre algorithme répertorie alors les écarts de cotes les plus rentables (+EV).',
      it: 'Il fulcro della piattaforma iRunBets è rappresentato dal modello di regressione Poisson abbinato a simulazioni di tipo Monte Carlo. Elaboriamo oltre 150 metriche di precisione dinamiche per scovare discrepanze di valore (+EV) e massimizzare il rendimento statistico.',
      de: 'Die technologische Basis von iRunBets stützt sich auf ein präzises Poisson-Regressionsmodell und umfassende Monte-Carlo-Simulationen. Über 150 spielrelevante Faktoren werden in Echtzeit berechnet, um Quotenfehler direkt und gewinnbringend aufzudecken (+EV).',
    },
    borderGlow: 'hover:border-sky-500/40 shadow-sky-500/5',
  },
  {
    id: 'radar',
    images: 'https://images.unsplash.com/photo-1508098682722-e99c43a406b2?auto=format&fit=crop&q=80&w=800',
    title: {
      pt: '📡 Radar de Tendências',
      en: '📡 Trend Radar',
      fr: '📡 Radar de Tendances',
      it: '📡 Radar di Tendenze',
      de: '📡 Trend-Radar',
    },
    desc: {
      pt: 'Monitorização contínua. Um varredor em tempo real das ligas europeias e sul-americanas que monitoriza o histórico de cantos, favoritismo absoluto e quebras bruscas de odds.',
      en: 'Continuous market scanner. Dynamic tracking of professional European and South American leagues, keeping real-time tabs on pressure waves, corner tallies, and sharp drop movements.',
      fr: 'Scanner permanent. Suivi dynamique des ligues majeures en temps réel, évaluant le niveau de pression des équipes favorites et les variations brutales des marchés.',
      it: 'Scanner di mercato. Monitoraggio continuo dei campionati professionistici per catturare cali improvvisi di quote e record di calci d\'angolo sotto pressione.',
      de: 'Kontinuierlicher Marktscanner. Ein Echtzeit-Überwachungssystem für weltweite Fußball-Ligen, das Quotenknicks und Live-Eckballstatistiken erfasst.',
    },
    details: {
      pt: 'Um varredor de dados desportivos de alta velocidade que opera em formato 24/7 sobre mais de 60 ligas globais de futebol. Este radar monitoriza flutuações rápidas e anomalias de mercado físico e comportamental, detetando oscilações abruptas de odds (dropping odds) provocadas por apostas de grande volume ou informações exclusivas de última hora (como lesões de estrelas ou alterações táticas extremas). Além disso, extrai relatórios em tempo real de pressão ofensiva, acumulados de cantos (corners) e padrões de cartões, permitindo detetar cenários lucrativos antes que as operadoras ajustem as suas margens.',
      en: 'A comprehensive real-time live scanner that tracks momentum and game state indicators on over 60 global football divisions automatically. Keeping constant watch over sudden dropping odds, heavy volume inflows, live corner spikes, and attacking pressure metrics, it guarantees that users intercept major live opportunities before bookies update their dynamic lines.',
      fr: 'Un radar de données haute performance disponible 24h/24 et 7j/7 sur les compétitions majeures. Il repère instantanément les chutes de cotes brutales (dropping odds), les volumes inhabituels et la pression de jeu en direct pour une réactivité absolue.',
      it: "Un monitoraggio quantitativo in tempo real-time attivo su oltre 60 campionati globali. Rileva crolli improvvisi di quota, anomali volumi di puntata e picchi di attacchi pericolosi per intercettare l'attimo perfeito.",
      de: 'Ein hocheffizienter Tracker, der über 60 Ligen weltweit live scannt. Erfasst Quotenstürze, hohe Wettvolumina und extreme Druckphasen im Spielaufbau direkt, sodass Sie reagieren können, bevor die Wettanbieter ihre Limits anpassen.',
    },
    borderGlow: 'hover:border-orange-500/40 shadow-orange-500/5',
  },
  {
    id: 'community',
    images: 'https://images.unsplash.com/photo-1542751371-adc38448a05e?auto=format&fit=crop&q=80&w=800',
    title: {
      pt: '👑 Redes de Tipsters & VIP',
      en: '👑 Tipster & VIP Network',
      fr: '👑 Réseau VIP & Tipsters',
      it: '👑 Network Tipster & VIP',
      de: '👑 Tipster- & VIP-Netzwerk',
    },
    desc: {
      pt: 'Auditado e transparente. Ligação premium às salas privadas de analistas profissionais desportivos. Todas as apostas e yield total de acertos são publicados de forma histórica e limpa.',
      en: 'Audited and transparent. Immediate connection to fully tracked sports investors and professional guilds. All historic win ratios and ROIs are recorded immutably.',
      fr: 'Audité et transparent. Connexion privilégiée aux salons de pronostiqueurs certifiés. Tous les historiques de bilan, yield et ROIs individuels restent vérifiables à 100%.',
      it: 'Verificato e trasparente. Canale esclusivo per scommettere a fianco dei melhores analistas. Tutti i dati di vincita, yield e ROI complessivo sono registrati in modo chiaro.',
      de: 'Zertifiziert & Transparent. Direkte Anbindung an professionelle Tipprunden. Sämtliche Erfolgsquoten, Yield-Bilanzen und Gewinne werden manipulationssicher dokumentiert.',
    },
    details: {
      pt: 'A rede VIP iRunBets não se limita a fornecer palpites; nós integramos uma comunidade de analistas e tipsters profissionais de elite, cada um focado numa especialidade específica (como ligas sul-americanas, mercados de cantos, ou handicaps asiáticos). Todos os registros de apostas e prognósticos são auditados de forma justa, calculando automaticamente as taxas de Yield, Retorno sobre o Investimento (ROI) e taxa de acerto de cada perfil no painel principal. Sem falsos resultados: a nossa transparência é absoluta e os utilizadores VIP têm acesso à sala de comando para acompanhar o desempenho real, eliminando totalmente a intuição e operando estritamente sobre dados validados com registro profissional desportivo e financeiro.',
      en: 'Our VIP network works closely with certified sports experts and quantitative traders. Each consultant stands audited under strict transparent guidelines, showing precise Yield%, return graphs, and hit metrics. This cuts out common guesswork so you invest in validated football specialists.',
      fr: "Une plateforme exclusive réunissant des pronostiqueurs professionnels audités avec rigueur. Chaque profil dispose d'un bilan transparent calculé automatiquement avec yield, ROI et taux de réussite en temps réel.",
      it: "Un circolo d'élite con esperti di scommesse sportive certificati. Ogni tipster ha statistiche pubbliche calcolate all'istante con profitti, ROI e resa matematica per una scelta consapevole.",
      de: 'Ein erstklassiges Netzwerk aus verifizierten Tipp-Experten. Alle Bilanzen, ROI-Werte und Trefferquoten sind jederzeit transparent einsehbar, sodass Sie fundierte Entscheidungen treffen können.',
    },
    borderGlow: 'hover:border-fuchsia-500/40 shadow-fuchsia-500/5',
  },
  {
    id: 'multiplas',
    images: 'https://images.unsplash.com/photo-1471295263379-6ca29104041a?auto=format&fit=crop&q=80&w=800',
    title: {
      pt: '🎫 Tipo de Apostas Múltiplas',
      en: '🎫 Single vs. Multiple Bets',
      fr: '🎫 Type de Paris Multiples',
      it: '🎫 Tipo di Scommesse Multiple',
      de: '🎫 Einzel- und Kombiwetten',
    },
    desc: {
      pt: 'Simples e Multiplas. Compreenda a diferença matemática entre focar num único prognóstico de valor (+EV) ou acumular eventos em bilhetes múltiplos.',
      en: 'Singles and Multiples. Master the mathematical variance between a highly curated single value (+EV) wager and complex parlay ticket combinations.',
      fr: 'Simples et multiples. Saisissez la différence mathématique fondamentale entre un pari simple à valeur positive (+EV) et l\'accumulation de risques en combinés.',
      it: 'Singles e Multiples. Scopri la diferença matematica tra un singolo pronostico a valore atteso positivo (+EV) e la varianza di schedine multiple.',
      de: 'Einzel- und Kombiwetten. Verstehen Sie die mathematische Varianz zwischen einer sorgfältig ausgewählten Value-Wette (+EV) und komplexen Kombischeinen.',
    },
    details: {
      pt: 'Muitos investidores desportivos caem na tentação de construir bilhetes de apostas múltiplas (parlays) intermináveis, atraídos pelas odds astronómicas. Na iRunBets, explicamos a matemática por trás destas opções: enquanto uma aposta simples permite focar toda a margem de segurança e o valor esperado (+EV) num único prognóstico bem estudado com menor variância, as apostas múltiplas multiplicam as vantagens das casas de apostas devido à comissão acumulada (overround). No entanto, quando utilizadas estrategicamente em formato de "sistema" ou com cobertura, podem servir para cobertura de portfólio. Promovemos a educação financeira para que aposte de forma consciente, profissional e ponderada.',
      en: 'Many sports investors fall for the high-yield trap of long accumulators or parlays due to spectacular odds payout displays. At iRunBets we teach you the hard math: while single bets let you focus all your safety margin on a single high-value (+EV) pick with low variance, parlays compound the bookmakers\' profit commissions (overround). Still, when used intelligently under hedging or system betting models, they serve strategic purposes. We promote deep financial discipline so you stay professional.',
      fr: 'De nombreux parieurs cèdent au mirage des gains astronomiques des paris combinés (accumulateurs). Chez iRunBets, nous expliquons les mathématiques sous-jacentes : alors qu\'un pari simple permet de cibler toute la marge et la valeur attendue (+EV) sur un seul choix, les combinés cumulent la marge bénéficiaire de l\'opérateur (overround). Cependant, utilisés de façon systémique, ils peuvent couvrir des risques.',
      it: 'Molti scommettitori si fanno tentare dalle quote astronomiche delle giocate multiple (accumulatori). Noi di iRunBets insegniamo la dura realtà: mentre la singola focalizza il valore atteso positivo (+EV) su una partita riducendo la varianza, la multipla moltiplica l\'overround del bookmaker.',
      de: 'Viele Sportwetten-Investoren verfallen dem Reiz riesiger Quoten bei Kombiwetten. Bei iRunBets erklären wir die Mathematik dahinter: Während Einzelwetten es Ihnen ermöglichen, Ihren gesamten Value (+EV) auf ein einziges, gut analysiertes Ereignis zu konzentrieren, addieren Kombiwetten die Buchmacher-Marge (Overround). Richtig eingesetzt, können sie dennoch strategischen Zwecken dienen.',
    },
    borderGlow: 'hover:border-emerald-500/40 shadow-emerald-500/5',
  },
];

export const mergePillarsWithDefaults = (currentList: PillarItem[]): { merged: PillarItem[]; changed: boolean } => {
  const merged = [...currentList];
  let changed = false;
  for (const defPillar of DEFAULT_PILLARS) {
    if (!merged.some(p => p.id === defPillar.id)) {
      merged.push(defPillar);
      changed = true;
    }
  }
  return { merged, changed };
};

const PlatformPillars: React.FC = () => {
  const { language } = useLanguage();
  const [selectedPillar, setSelectedPillar] = useState<PillarItem | null>(null);

  // Dynamic pillars list loaded from localStorage or using defaults
  const [pillarsList, setPillarsList] = useState<PillarItem[]>(() => {
    const saved = localStorage.getItem('irunbets_platform_pillars');
    if (saved) {
      try {
        const parsed = JSON.parse(saved) as PillarItem[];
        const { merged, changed } = mergePillarsWithDefaults(parsed);
        if (changed) {
          localStorage.setItem('irunbets_platform_pillars', JSON.stringify(merged));
        }
        return merged;
      } catch (e) {
        console.error(e);
      }
    }
    // Seed initial database defaults
    localStorage.setItem('irunbets_platform_pillars', JSON.stringify(DEFAULT_PILLARS));
    return DEFAULT_PILLARS;
  });

  // Keep synced across components/Admin updates
  useEffect(() => {
    const syncPillars = () => {
      const saved = localStorage.getItem('irunbets_platform_pillars');
      if (saved) {
        try {
          const parsed = JSON.parse(saved) as PillarItem[];
          const { merged, changed } = mergePillarsWithDefaults(parsed);
          if (changed) {
            localStorage.setItem('irunbets_platform_pillars', JSON.stringify(merged));
          }
          setPillarsList(merged);
        } catch (e) {}
      } else {
        setPillarsList(DEFAULT_PILLARS);
      }
    };
    syncPillars();
    window.addEventListener('irunbets_pillars_updated', syncPillars);
    window.addEventListener('storage', syncPillars);
    return () => {
      window.removeEventListener('irunbets_pillars_updated', syncPillars);
      window.removeEventListener('storage', syncPillars);
    };
  }, []);

  const headings = {
    pt: {
      badge: 'BIOMETRIA DE MERCADO',
      title: 'Tecnologia Aplicada aos Prognósticos',
      desc: 'Os nossos sistemas analisam desvios de mercado estruturais e margens de acerto através de inteligência matemática profunda.',
      readMore: 'Saber Mais',
    },
    en: {
      badge: 'MARKET BIOMETRICS',
      title: 'Technology Applied to Predictions',
      desc: 'Our mathematical systems continuously scan structural market deviations and hit rates through deep analysis.',
      readMore: 'Learn More',
    },
    fr: {
      badge: 'BIOMÉTRIE DE MARCHÉ',
      title: 'Technologie Appliquée aux Prévisions',
      desc: 'Nos systèmes mathématiques analysent en continu les déviations structurelles pour dégager de la value.',
      readMore: 'Savoir Plus',
    },
    it: {
      badge: 'BIOMETRIA DI MERCATO',
      title: 'Tecnologia Applicata alle Predizioni',
      desc: 'I nostri moduli analizzano deviazioni di quota continue e tassi di efficacia con matematica avanzata.',
      readMore: 'Scopri Di Più',
    },
    de: {
      badge: 'MARKT-BIOMETRIE',
      title: 'Technologie & Wettvorhersagen',
      desc: 'Unsere mathematischen Systeme analysieren kontinuierlich strukturelle Quotenabweichungen und Trefferquoten.',
      readMore: 'Mehr Erfahren',
    },
  };

  const tHead = headings[language] || headings.pt;

  return (
    <section id="pilares-tecnologicos" className="py-24 bg-[#0A0A0C] border-y border-zinc-900 relative">
      {/* Background glow dots */}
      <div className="absolute top-1/2 left-10 w-[250px] h-[250px] bg-orange-500/5 rounded-full blur-[100px] pointer-events-none"></div>
      <div className="absolute bottom-10 right-10 w-[250px] h-[250px] bg-sky-500/5 rounded-full blur-[100px] pointer-events-none"></div>

      <div className="max-w-7xl mx-auto px-6 relative z-10">
        
        {/* Header content */}
        <div className="text-center max-w-3xl mx-auto mb-16 space-y-4">
          <span className="text-[10px] sm:text-xs font-black uppercase tracking-[0.2em] text-[#38bdf8] bg-sky-500/10 px-3.5 py-1.5 rounded-md font-mono border border-sky-500/10 inline-block">
            {tHead.badge}
          </span>
          <h2 className="text-3xl sm:text-4xl lg:text-5xl font-extrabold text-white tracking-tight uppercase font-display leading-tight">
            {tHead.title}
          </h2>
          <div className="h-1 w-20 bg-gradient-to-r from-sky-400 to-orange-500 rounded-full mx-auto"></div>
          <p className="text-sm sm:text-base text-zinc-400 font-light leading-relaxed max-w-2xl mx-auto">
            {tHead.desc}
          </p>
        </div>

        {/* 3-Column Bento Grid representing the categories */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
          {pillarsList.map((item) => {
            const displayTitle = item.title[language] || item.title.pt || '';
            const displayDesc = item.desc[language] || item.desc.pt || '';
            return (
              <div 
                key={item.id} 
                className={`bg-[#121216]/50 border border-[#27272a] rounded-[24px] overflow-hidden flex flex-col justify-between hover:-translate-y-1 transition-all duration-350 shadow-lg group ${item.borderGlow || 'hover:border-amber-500/30'}`}
              >
                {/* Photo component Container */}
                <div className="h-56 relative overflow-hidden bg-zinc-900">
                  <div className="absolute inset-0 bg-gradient-to-t from-zinc-950 via-zinc-950/20 to-transparent z-10 opacity-70"></div>
                  <img 
                    src={item.images} 
                    alt={displayTitle} 
                    referrerPolicy="no-referrer"
                    className="w-full h-full object-cover transition-transform duration-[2.5s] ease-out group-hover:scale-108 brightness-[0.85] group-hover:brightness-100"
                  />
                  
                  {/* Visual Corner Tag */}
                  <div className="absolute bottom-3 left-4 z-20 flex items-center gap-1.5 bg-[#0D0D11]/90 border border-zinc-800/80 px-2.5 py-1 rounded-lg">
                    <span className={`w-1.5 h-1.5 rounded-full ${item.id === 'engine' ? 'bg-sky-400' : item.id === 'radar' ? 'bg-orange-400' : 'bg-fuchsia-400'} animate-pulse`}></span>
                    <span className="text-[8px] font-bold text-zinc-400 uppercase tracking-widest font-mono">iR-Security v3</span>
                  </div>
                </div>

                {/* Text / Body Content */}
                <div className="p-6 flex-1 flex flex-col justify-between text-left space-y-4 animate-fade-in">
                  <div className="space-y-3">
                    <h3 className="text-lg font-bold text-white uppercase group-hover:text-amber-400 transition-colors tracking-wide font-display">
                      {displayTitle}
                    </h3>
                    <p className="text-xs text-zinc-400 leading-relaxed font-light min-h-[72px]">
                      {displayDesc}
                    </p>
                  </div>

                  <div className="pt-3 border-t border-zinc-900/40">
                    <button
                      type="button"
                      onClick={() => setSelectedPillar(item)}
                      className="inline-flex items-center gap-1.5 text-[10px] font-black uppercase tracking-widest text-[#00f2fe] group-hover:text-amber-400 transition-colors cursor-pointer outline-none hover:underline"
                    >
                      <span>{tHead.readMore}</span>
                      <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2.5} stroke="currentColor" className="w-3" style={{ height: '12px' }}>
                        <path strokeLinecap="round" strokeLinejoin="round" d="M13.5 4.5 21 12m0 0-7.5 7.5M21 12H3" />
                      </svg>
                    </button>
                  </div>
                </div>

              </div>
            );
          })}
        </div>

      </div>

      {/* RICH TEXT MODAL PREVIEW ON SABER MAIS CLICK */}
      {selectedPillar && (() => {
        const title = selectedPillar.title[language] || selectedPillar.title.pt;
        const detailsText = selectedPillar.details ? (selectedPillar.details[language] || selectedPillar.details.pt) : (selectedPillar.desc[language] || selectedPillar.desc.pt);
        return (
          <div className="fixed inset-0 bg-black/92 backdrop-blur-md z-[999999] flex items-center justify-center p-4 sm:p-6 animate-fade-in font-sans">
            <div className="bg-[#0E0E12] border border-zinc-800 rounded-3xl max-w-4xl w-full overflow-hidden shadow-[0_0_60px_rgba(0,242,254,0.15)] relative flex flex-col max-h-[92vh]">
              
              {/* Cover Image */}
              <div className="h-64 sm:h-80 md:h-96 relative overflow-hidden bg-zinc-950">
                <div className="absolute inset-0 bg-gradient-to-t from-[#0E0E12] via-[#0E0E12]/35 to-transparent z-10"></div>
                <img 
                  src={selectedPillar.images} 
                  alt={title}
                  referrerPolicy="no-referrer"
                  className="w-full h-full object-cover brightness-[0.7]"
                />
                
                {/* Close Button top-right */}
                <button
                  type="button"
                  onClick={() => setSelectedPillar(null)}
                  className="absolute top-5 right-5 z-50 p-2.5 bg-black/70 hover:bg-black/90 border border-zinc-800 rounded-full text-zinc-400 hover:text-white transition-all active:scale-90 cursor-pointer shadow-lg"
                >
                  <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
 
                {/* Badge & Title */}
                <div className="absolute bottom-6 left-6 sm:left-8 z-20 space-y-2 text-left max-w-[85%]">
                  <span className="text-[10px] font-black uppercase tracking-widest text-[#00f2fe] bg-sky-500/10 px-3 py-1 rounded-md font-mono border border-sky-500/15 inline-block">
                    {language === 'pt' ? 'MÓDULO DE INTELIGÊNCIA' : 'INTELLIGENCE COMPONENT'}
                  </span>
                  <h4 className="text-2xl sm:text-3xl md:text-4xl font-extrabold text-white uppercase tracking-normal font-display leading-tight mb-1">
                    {title}
                  </h4>
                </div>
              </div>
 
              {/* Content text */}
              <div className="p-6 sm:p-8 md:p-10 space-y-6 text-left overflow-y-auto max-h-[50vh] text-zinc-300 leading-relaxed text-sm sm:text-base antialiased font-light">
                <div className="p-5 sm:p-6 bg-[#14141A] rounded-2xl border border-zinc-900/80 text-zinc-200 italic font-medium leading-relaxed quote-element text-sm sm:text-base">
                  " {selectedPillar.desc[language] || selectedPillar.desc.pt} "
                </div>
 
                <div className="space-y-4">
                  <span className="text-[11px] font-black font-mono text-[#00f2fe] tracking-widest uppercase block border-b border-zinc-900 pb-2">
                    {language === 'pt' ? 'ANÁLISE E OPERAÇÕES DA IA' : 'AI BLUEPRINT & OPERATIONS'}
                  </span>
                  <p className="whitespace-pre-line text-xs sm:text-sm text-zinc-400 leading-relaxed font-light">
                    {detailsText}
                  </p>
                </div>
              </div>
 
              {/* Footer Actions */}
              <div className="p-6 border-t border-zinc-900/60 bg-[#0A0A0D] flex justify-end">
                <button
                  type="button"
                  onClick={() => setSelectedPillar(null)}
                  className="py-3 px-8 w-full sm:w-auto bg-zinc-900 hover:bg-zinc-800 border border-zinc-800 text-zinc-300 hover:text-white rounded-xl text-xs sm:text-sm font-black uppercase tracking-wider transition-all duration-200 active:scale-95 cursor-pointer text-center"
                >
                  {language === 'pt' ? 'Fechar Visualização' : 'Dismiss Insight'}
                </button>
              </div>
 
            </div>
          </div>
        );
      })()}
    </section>
  );
};

export default PlatformPillars;
