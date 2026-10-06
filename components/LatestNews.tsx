import React, { useEffect, useState } from 'react';
import { getLatestNews, getPublicSubscribersCount, NewsArticle, onAuthStatusChange } from '../services/firebase';
import { useLanguage } from '../services/LanguageContext';

interface LatestNewsProps {
  onOpenAuth: () => void;
  // Trigger refresh reference counter from outside if needed
  refreshCounterTrigger?: number;
}

const LatestNews: React.FC<LatestNewsProps> = ({ onOpenAuth, refreshCounterTrigger = 0 }) => {
  const { language } = useLanguage();
  const [articles, setArticles] = useState<NewsArticle[]>([]);
  const [subscribersCount, setSubscribersCount] = useState<number>(1423);
  const [isLoading, setIsLoading] = useState(true);
  const [expandedArticleId, setExpandedArticleId] = useState<string | null>(null);
  const [userLoggedIn, setUserLoggedIn] = useState(false);

  const labelsMap = {
    pt: {
      badgeTitle: 'CONHECIMENTO É PODER',
      title: 'Últimas Notícias & Relatórios IA',
      desc: 'Fica a par das evoluções do nosso algoritmo de cálculo +EV, desvios de mercado estruturais detetados e tutoriais de inteligência matemática.',
      bannerBadge: 'Monitor de Adesão Ativo',
      bannerTitle: 'Membros Registados com Vantagem em {0}',
      bannerDesc: 'Junta-te à comunidade exclusiva. Configura e simula sinais analíticos diretamente no telemóvel para antecipar as odds oficiais.',
      bannerBtn: 'Inscrever-me Gratuitamente',
      bannerActive: '✓ A tua subscrição está ativa! Tens acesso total às ferramentas da iRunBets.',
      loadingNews: 'A obter artigos...',
      noNews: 'Sem notícias publicadas no momento. Inicie sessão como Admin (morgado.aam@gmail.com) para escrever o primeiro artigo!',
      hideDetails: 'Esconder Detalhes',
      readFull: 'Ler Artigo Completo',
      available: 'Disponível',
    },
    en: {
      badgeTitle: 'KNOWLEDGE IS POWER',
      title: 'Latest News & AI Reports',
      desc: 'Stay informed about the evolution of our +EV calculation algorithm, identified market margins, and mathematical sports tutorials.',
      bannerBadge: 'Subscription Monitor Active',
      bannerTitle: 'Members Registered with an Edge at {0}',
      bannerDesc: 'Join our exclusive community. Configure and simulate analytical signals directly on your phone to beat the bookmakers.',
      bannerBtn: 'Sign Up for Free',
      bannerActive: '✓ Your subscription is active! You have full access to iRunBets metrics.',
      loadingNews: 'Retrieving news articles...',
      noNews: 'No news published yet. Sign in as Admin (morgado.aam@gmail.com) to create the first one!',
      hideDetails: 'Hide Details',
      readFull: 'Read Full Article',
      available: 'Available',
    },
    fr: {
      badgeTitle: 'SAVOIR C\'EST POUVOIR',
      title: 'Dernières Nouvelles & Rapports IA',
      desc: 'Restez informé de l\'évolution de notre algorithme de cotes +EV, des opportunités de value dénichées et des tutoriels de paris mathématiques.',
      bannerBadge: 'Compteur d\'Adhésion Actif',
      bannerTitle: 'Membres Inscrits avec un Avantage sur {0}',
      bannerDesc: 'Rejoignez la communauté exclusive. Configurez et simulez des alertes analytiques directement sur votre smartphone.',
      bannerBtn: 'M\'inscrire Gratuitement',
      bannerActive: '✓ Votre abonnement est actif ! Accès complet déverrouillé aux outils iRunBets.',
      loadingNews: 'Chargement des articles...',
      noNews: 'Aucune actualité pour le moment. Connectez-vous comme Admin (morgado.aam@gmail.com) pour ajouter un article !',
      hideDetails: 'Masquer les détails',
      readFull: 'Lire l\'article complet',
      available: 'Disponible',
    },
    it: {
      badgeTitle: 'LA CONOSCENZA È POTERE',
      title: 'Ultime Notizie & Analisi IA',
      desc: 'Segui gli aggiornamenti del nostro algoritmo di quota +EV, i margini individuati sulle scommesse e le lezioni di finanza sportiva.',
      bannerBadge: 'Monitor Membri Attivo',
      bannerTitle: 'Membri Registrati con un Vantaggio su {0}',
      bannerDesc: 'Entra nell\'accademia esclusiva. Configura e ricevi notifiche intelligenti per battere sul tempo i bookmaker.',
      bannerBtn: 'Registrati Gratuitamente',
      bannerActive: '✓ Il tuo abbonamento è attivo! Accesso globale consentito a tutti i pannelli iRunBets.',
      loadingNews: 'Download notizie in corso...',
      noNews: 'Nessun articolo disponibile al momento. Accedi come Admin (morgado.aam@gmail.com) per pubblicare il primo !',
      hideDetails: 'Chiudi Dettagli',
      readFull: 'Leggi Articolo',
      available: 'Disponibile',
    },
    de: {
      badgeTitle: 'WISSEN IST MACHT',
      title: 'Aktuelle News & KI-Spielberichte',
      desc: 'Verfolge die Neuerungen unseres Algorithmus zur Feststellung von +EV-Werten sowie Tabellentrends und KI-Wettanleitungen.',
      bannerBadge: 'Registrierungsmeldung Aktiv',
      bannerTitle: 'Eingetragene Mitglieder mit mathematischem Vorteil bei {0}',
      bannerDesc: 'Tritt unserer exklusiven Community bei. Erhalte spielentscheidende Systemvorschläge in Echtzeit auf dein Mobiltelefon.',
      bannerBtn: 'Kostenlos Registrieren',
      bannerActive: '✓ Deine Premiummitgliedschaft ist aktiv! Du besitzt Vollzugriff auf alle Analysetools.',
      loadingNews: 'Beiträge werden geladen...',
      noNews: 'Derzeit keine Neuigkeiten hinterlegt. Bitte als Admin (morgado.aam@gmail.com) anmelden, um den ersten Post zu verfassen!',
      hideDetails: 'Details einklappen',
      readFull: 'Vollständigen Text lesen',
      available: 'Verfügbar',
    }
  };
  const labels = labelsMap[language] || labelsMap.pt;

  useEffect(() => {
    const loadNewsAndCount = async () => {
      try {
        const news = await getLatestNews();
        setArticles(news);
        const count = await getPublicSubscribersCount();
        setSubscribersCount(count);
      } catch (err) {
        console.error('Error loading news/counts:', err);
      } finally {
        setIsLoading(false);
      }
    };
    
    loadNewsAndCount();

    const handleNewsUpdate = () => {
      loadNewsAndCount();
    };

    window.addEventListener('irunbets_news_updated', handleNewsUpdate);
    window.addEventListener('storage', handleNewsUpdate);

    const unsubscribe = onAuthStatusChange((user) => {
      setUserLoggedIn(!!user);
    });

    return () => {
      unsubscribe();
      window.removeEventListener('irunbets_news_updated', handleNewsUpdate);
      window.removeEventListener('storage', handleNewsUpdate);
    };
  }, [refreshCounterTrigger]);

  const formatDate = (isoString: string | number) => {
    try {
      const date = new Date(isoString);
      const locales: Record<string, string> = { pt: 'pt-PT', en: 'en-US', fr: 'fr-FR', it: 'it-IT', de: 'de-DE' };
      return date.toLocaleDateString(locales[language] || 'pt-PT', {
        day: '2-digit',
        month: 'long',
        year: 'numeric'
      });
    } catch {
      return labels.available;
    }
  };

  return (
    <section id="noticias" className="relative w-full py-24 bg-[#0A0A0C] border-b border-white/5 overflow-hidden">
      
      {/* Background Orbs */}
      <div className="absolute top-1/4 right-1/4 w-[350px] h-[350px] glow-orb-blue pointer-events-none opacity-20"></div>

      <div className="max-w-7xl mx-auto px-6 relative z-10">
        
        {/* Dynamic Counter Banner Card */}
        <div className="w-full max-w-4xl mx-auto bg-gradient-to-r from-sky-950/40 via-zinc-900/60 to-orange-950/40 border border-zinc-800/80 rounded-3xl p-8 sm:p-12 mb-20 text-center relative overflow-hidden shadow-2xl">
          <div className="absolute -top-12 -left-12 w-32 h-32 bg-sky-500/10 rounded-full blur-2xl pointer-events-none"></div>
          <div className="absolute -bottom-12 -right-12 w-32 h-32 bg-orange-500/10 rounded-full blur-2xl pointer-events-none"></div>

          <div className="relative z-10 flex flex-col items-center">
            
            {/* Live pulsating widget */}
            <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-emerald-500/10 border border-emerald-500/30 text-[10px] font-bold text-emerald-400 tracking-wider uppercase mb-5 backdrop-blur-sm">
              <span className="w-2 h-2 rounded-full bg-emerald-400 animate-ping"></span>
              <span>{labels.bannerBadge}</span>
            </div>

            <div className="text-4xl sm:text-6xl font-extrabold tracking-tight text-white mb-4 font-display font-mono">
              <span className="bg-clip-text text-transparent bg-gradient-to-r from-sky-400 via-zinc-100 to-orange-400">
                {subscribersCount.toLocaleString()}
              </span>
            </div>

            <h3 className="text-lg sm:text-2xl font-semibold text-zinc-100 tracking-tight max-w-2xl mb-3">
              {labels.bannerTitle.replace('{0}', 'www.irunbets.pt')}
            </h3>

            <p className="text-zinc-400 font-light text-sm sm:text-base max-w-xl leading-relaxed mb-8">
              {labels.bannerDesc}
            </p>

            {!userLoggedIn ? (
              <button
                onClick={onOpenAuth}
                className="px-8 py-3.5 bg-gradient-to-r from-sky-500 to-orange-500 text-white font-bold text-xs tracking-widest uppercase rounded-full hover:opacity-90 transition-transform duration-300 transform active:scale-95 shadow-xl shadow-sky-500/10 inline-flex items-center gap-2 cursor-pointer"
              >
                <span>{labels.bannerBtn}</span>
                <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2.5} stroke="currentColor" className="w-3.5 h-3.5">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M18 7.5v3m0 0v3m0-3h3m-3 0h-3m-2.25-4.125a3.375 3.375 0 1 1-6.75 0 3.375 3.375 0 0 1 6.75 0ZM3 19.235v-.11a6.375 6.375 0 0 1 12.75 0v.109A12.318 12.318 0 0 1 9.374 21c-2.331 0-4.512-.647-6.374-1.766Z" />
                </svg>
              </button>
            ) : (
              <div className="py-2.5 px-6 rounded-full bg-sky-500/10 border border-sky-500/20 text-sky-400 font-semibold text-xs tracking-wide">
                {labels.bannerActive}
              </div>
            )}
          </div>
        </div>

        {/* Section header */}
        <div className="flex flex-col items-center text-center max-w-2xl mx-auto mb-16">
          <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-sky-500/10 border border-sky-500/20 text-[10px] font-bold text-sky-400 uppercase tracking-widest mb-4">
            {labels.badgeTitle}
          </div>
          <h2 className="text-3xl md:text-5xl font-bold tracking-tight text-white font-display mb-6">
            {labels.title}
          </h2>
          <p className="text-zinc-400 font-light text-sm sm:text-base leading-relaxed">
            {labels.desc}
          </p>
        </div>

        {/* Articles list */}
        {isLoading ? (
          <div className="flex flex-col items-center justify-center py-20">
            <div className="w-8 h-8 rounded-full border-2 border-orange-500 border-t-transparent animate-spin mb-4"></div>
            <span className="text-xs text-zinc-500 tracking-widest uppercase">{labels.loadingNews}</span>
          </div>
        ) : articles.length === 0 ? (
          <div className="text-center py-16 bg-zinc-900/20 rounded-2xl border border-zinc-800/60 font-light text-zinc-500 text-sm">
            {labels.noNews}
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-8 max-w-5xl mx-auto">
            {articles.map((art) => {
              const isExpanded = expandedArticleId === art.id;
              return (
                <div 
                  key={art.id}
                  className="bg-[#121216]/55 border border-zinc-800/80 rounded-2xl p-6 sm:p-8 flex flex-col justify-between hover:border-zinc-700/60 transition-all duration-300 group shadow-lg"
                >
                  <div>
                    <div className="flex justify-between items-center text-[10px] text-zinc-500 mb-4">
                      <span className="font-mono text-zinc-400">{formatDate(art.publishedAt)}</span>
                      <span className="font-semibold text-sky-400 uppercase tracking-wider">{art.author.replace(/@.*/, '')}</span>
                    </div>

                    {art.imageUrl && (
                      <div className="mb-4 rounded-xl overflow-hidden border border-zinc-800/80 bg-zinc-950 max-h-52">
                        <img 
                          src={art.imageUrl} 
                          alt={art.title} 
                          className="w-full h-auto object-cover max-h-52"
                          referrerPolicy="no-referrer"
                        />
                      </div>
                    )}

                    <h3 className="text-lg sm:text-xl font-bold text-white group-hover:text-amber-500 transition-colors tracking-tight mb-4">
                      {art.title}
                    </h3>

                    <p className={`text-zinc-400 font-light text-sm leading-relaxed mb-6 ${isExpanded ? '' : 'line-clamp-3'}`}>
                      {isExpanded 
                        ? (art.translations?.[language]?.content || art.content) 
                        : (art.translations?.[language]?.summary || art.summary)}
                    </p>
                  </div>

                  <div>
                    <button
                      onClick={() => setExpandedArticleId(isExpanded ? null : art.id)}
                      className="text-xs font-semibold text-sky-400 hover:text-white transition-colors uppercase tracking-wider inline-flex items-center gap-1 focus:outline-none cursor-pointer"
                    >
                      <span>{isExpanded ? labels.hideDetails : labels.readFull}</span>
                      <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2.5} stroke="currentColor" className={`w-3.5 h-3.5 transition-transform duration-300 ${isExpanded ? 'rotate-180' : ''}`}>
                        <path strokeLinecap="round" strokeLinejoin="round" d="m19.5 8.25-7.5 7.5-7.5-7.5" />
                      </svg>
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        )}

      </div>
    </section>
  );
};

export default LatestNews;
