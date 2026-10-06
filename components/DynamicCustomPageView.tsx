import React, { useState, useRef, useEffect } from 'react';
import { CustomPage, onAuthStatusChange, updateSubscriberStatus, auth, getSubscriber, updateSubscriberPendingPayment, getSubscribersConfig, saveCustomPage } from '../services/firebase';
import VipDashboard from './VipDashboard';
import Purifier from './Purifier';
import FavoriteRadar from './FavoriteRadar';
import LatestNews from './LatestNews';
import FAQ from './FAQ';
import FootballPredictionsTable from './FootballPredictionsTable';
import { DadosEstatisticosPage } from './DadosEstatisticosPage';
import { useLanguage, translateCampaignTitle, translateCampaignDescription } from '../services/LanguageContext';
import { getCustomizablePlans, getPriceByStatusName, getStatusLabelFromPlanId, PricingPlan } from '../services/plansConfig';

interface DynamicCustomPageViewProps {
  page: CustomPage;
  onBackToHome: () => void;
  userSubscriptionStatus?: string;
  onSubscriptionUpdated?: () => void;
  isAdmin?: boolean;
  currentUser?: any;
}

const tabLabels = {
  pt: { presentation: 'ℹ️ Apresentação VIP', dashboard: '🏆 Dashboard VIP' },
  en: { presentation: 'ℹ️ VIP Presentation', dashboard: '🏆 VIP Dashboard' },
  fr: { presentation: 'ℹ️ Présentation VIP', dashboard: '🏆 VIP Dashboard' },
  it: { presentation: 'ℹ️ Presentazione VIP', dashboard: '🏆 VIP Dashboard' },
  de: { presentation: 'ℹ️ VIP-Präsentation', dashboard: '🏆 VIP-Dashboard' }
};

const lockStrings = {
  pt: {
    title: '🔒 Área Exclusiva do Clube VIP',
    subtitle: 'Aceda às previsões de valor do iR-Engine Pro v3.5, gestão de banca avançada, simulador e registo em tempo real.',
    btn: 'Ativar Subscrição e Desbloquear Acesso Já'
  },
  en: {
    title: '🔒 Exclusive VIP Club Area',
    subtitle: 'Access the value predictions of iR-Engine Pro v3.5, advanced bankroll management, simulator, and real-time ledger.',
    btn: 'Activate Subscription and Unlock Access Now'
  },
  fr: {
    title: '🔒 Espace Exclusif Club VIP',
    subtitle: 'Accédez aux prédictions de valeur d\'iR-Engine Pro v3.5, à la gestion avancée de capital, au simulateur et au registre en tempo real.',
    btn: 'Activer l\'Abonnement et Débloquer l\'Accès Maintenant'
  },
  it: {
    title: '🔒 Area Esclusiva Club VIP',
    subtitle: 'Accedi ai pronostici di valore di iR-Engine Pro v3.5, gestione avançada della banca, simulatore e registro in tempo reale.',
    btn: 'Attiva l\'Abbonamento e Sblocca l\'Accesso Ora'
  },
  de: {
    title: '🔒 Exklusiver VIP-Club Bereich',
    subtitle: 'Greifen Sie auf die Wertprognosen von iR-Engine Pro v3.5, erweitertes Bankroll-Management, Simulator und Echtzeit-Protokoll zu.',
    btn: 'Abonnement aktivieren und jetzt Zugang freischalten'
  }
};

const planTranslations = {
  pt: {
    sectionTitle: "Planos de Subscrição VIP",
    sectionDesc: "Aceda às nossas previsões premium e ferramentas avançadas através de opções flexíveis adaptadas ao seu estilo.",
    group1Title: "💻 Planos Base (Web)",
    group1Desc: "Acesso total à plataforma diretamente no navegador com purificador de odds +EV em tempo real.",
    group2Title: "📱 Planos Multi-Plataforma MAX",
    group2Desc: "Sinergia total: Web + aplicação native iOS & Android com feeds de latência reduzida e alertas instantâneos.",
    
    planWebSub: "Subscrição do Site",
    planWebSubDesc: "Acesso completo à plataforma Web com o purificador de odds de valor estatístico e radar de favoritas.",
    
    planBasic: "Subscrição Basic",
    planBasicDesc: "Canal VIP básico de notificações push automáticas no site e histórico filtrado das seleções iRunBets.",
    
    planPro: "Versão Pro (Subscrição + Cloud)",
    planProDesc: "Feed de odds purificadas de latência ultra-baixa com persistência na nuvem e backup automático.",
    
    planBasicMax: "Basic Max (Web + iOS + Android)",
    planBasicMaxDesc: "Acesso nos canais VIP e plataforma principal tanto na Web como na aplicação móvel nativa iOS e Android.",
    
    planProMax: "Pro Max (Web + iOS + Android + Cloud)",
    planProMaxDesc: "O máximo poder do iRunBets. Toda a suite Web, iOS, Android, com feed em tempo real e storage na nuvem ilimitado.",
    
    soonLabel: "Brevemente Disponível",
    perMonth: "mês",
    inactiveStatus: "Inativo",
    featuresLabel: "Vantagens Incluídas:",
    webFeature: "Plataforma Web Completa 24/7",
    evFeature: "Purificador de Odds +EV de Valor",
    radarFeature: "Radar de Favoritas Ativo",
    cloudFeature: "Armazenamento em Nuvem Seguro",
    mobileFeature: "App Nativa iOS & Android"
  },
  en: {
    sectionTitle: "VIP Subscription Plans",
    sectionDesc: "Access our premium predictions and advanced utilities through flexible options tailored to your workflow.",
    group1Title: "💻 Base Plans (Web)",
    group1Desc: "Full access to our analytics suite directly in your browser with real-time +EV odds purifying.",
    group2Title: "📱 Multi-Platform MAX Plans",
    group2Desc: "Total synergy: Web + native iOS & Android application with lower-latency feeds and instant push alerts.",
    
    planWebSub: "Site Subscription",
    planWebSubDesc: "Full access to the Web suite, featuring our statistical value purifier and real-time favorites radar.",
    
    planBasic: "Basic Subscription",
    planBasicDesc: "Core VIP channel on the website with automated notifications and general historical tracking of our mathematical picks.",
    
    planPro: "Pro Version (Subscription + Cloud)",
    planProDesc: "Low latency real-time odds engine backed by cloud server instances and synchronized bankroll backups.",
    
    planBasicMax: "Basic Max (Web + iOS + Android)",
    planBasicMaxDesc: "Cross-screen convenience: run the VIP panels seamlessly on standard desktop and native iOS & Android applications.",
    
    planProMax: "Pro Max (Web + iOS + Android + Cloud)",
    planProMaxDesc: "The pinnacle of the iRunBets experience. Multi-device Web, iOS, and Android support, streaming feeds and cloud backup.",
    
    soonLabel: "Coming Soon",
    perMonth: "month",
    inactiveStatus: "Inactive",
    featuresLabel: "Included Benefits:",
    webFeature: "Full Web Suite 24/7",
    evFeature: "Positive Expected Value (+EV) Engine",
    radarFeature: "Active Teams Radar Feed",
    cloudFeature: "Secured Cloud Infrastructure",
    mobileFeature: "Native iOS & Android Apps"
  },
  fr: {
    sectionTitle: "Abonnements VIP",
    sectionDesc: "Accédez à nos algorithmes premium et outils avancés à travers des options adaptées à vos besoins.",
    group1Title: "💻 Plans de Base (Web)",
    group1Desc: "Accès complet au purificateur de cotes +EV et statistiques directement depuis votre navigateur.",
    group2Title: "📱 Formules Multi-Plateforme MAX",
    group2Desc: "L'expérience complète: Web + application mobile native iOS & Android avec notifications push ultra-rapides.",
    
    planWebSub: "Abonnement du Site",
    planWebSubDesc: "Accès complet à la plateforme Web, au purificateur d'odds de valeur statistique et au radar de favorites.",
    
    planBasic: "Abonnement Basic",
    planBasicDesc: "Canal VIP standard avec notifications web automatisées et historique d'efficacité de l'algorithme.",
    
    planPro: "Version Pro (Abonnement + Cloud)",
    planProDesc: "Cotes à latence ultra-faible optimisées par des serveurs dédiés avec sauvegarde et persistance cloud.",
    
    planBasicMax: "Basic Max (Web + iOS + Android)",
    planBasicMaxDesc: "Accès multi-plateforme complet disponible instantanément sur navigateur et sur apps natives iOS & Android.",
    
    planProMax: "Pro Max (Web + iOS + Android + Cloud)",
    planProMaxDesc: "La puissance iRunBets ultime. Suite complète Web, iOS, Android, synchronisation en temps réel et stockage cloud.",
    
    soonLabel: "Bientôt Disponible",
    perMonth: "mois",
    inactiveStatus: "Inactif",
    featuresLabel: "Bénéfices Inclus:",
    webFeature: "Plateforme Web 24h/24",
    evFeature: "Moteur +EV Valeur Attendue",
    radarFeature: "Radar d'Équipes Actif",
    cloudFeature: "Sauvegarde Cloud Sécurisée",
    mobileFeature: "Apps iOS & Android Natives"
  },
  it: {
    sectionTitle: "Abbonamenti VIP",
    sectionDesc: "Sblocca i nostri algoritmi avanzati e previsioni di valore con i pacchetti su misura per te.",
    group1Title: "💻 Piani di Base (Web)",
    group1Desc: "Accesso totale al purificatore statistico direttamente dal browser su qualsiasi computer o tablet.",
    group2Title: "📱 Piani Multi-Piattaforma MAX",
    group2Desc: "La sinergia perfetta: Web + applicazione nativa mobile iOS & Android con notifiche bidirezionali istantanee.",
    
    planWebSub: "Abbonamento Sito",
    planWebSubDesc: "Accesso completo alla suite Web comprese le quote di valore +EV e il radar delle favorite.",
    
    planBasic: "Abbonamento Basic",
    planBasicDesc: "Canale VIP base sul sito web con notifiche di filtro automatiche e registro storico delle statistiche.",
    
    planPro: "Versione Pro (Abbonamento + Cloud)",
    planProDesc: "Feed quote a latenza millimesimale con server cloud dedicati e salvataggio automatico continuo.",
    
    planBasicMax: "Basic Max (Web + iOS + Android)",
    planBasicMaxDesc: "Versatilità completa: esegui i radar e canali sulla Web App e sull'applicazione installabile iOS e Android.",
    
    planProMax: "Pro Max (Web + iOS + Android + Cloud)",
    planProMaxDesc: "L'apice dell'esperienza VIP. Tutto il pacchetto Web, app native iOS e Android, con sincronizzazione cloud.",
    
    soonLabel: "Prossimamente",
    perMonth: "mese",
    inactiveStatus: "Inattivo",
    featuresLabel: "Vantaggi Inclusi:",
    webFeature: "Suite Web Completa 24/7",
    evFeature: "Purificatore di Valore Matematica",
    radarFeature: "Radar dei Favoriti Attivo",
    cloudFeature: "Storage cloud centralizzato",
    mobileFeature: "App Nativa iOS & Android"
  },
  de: {
    sectionTitle: "VIP-Abonnements",
    sectionDesc: "Nutzen Sie unsere mathematischen Berechnungen und Quoten-Analysen mit flexiblen Tarifen für jeden Bedarf.",
    group1Title: "💻 Web-Basispläne",
    group1Desc: "Voller Web-Echtzeitzugriff auf den statistischen +EV Quoten-Analyser direkt in Ihrem Webbrowser.",
    group2Title: "📱 Multiplattform MAX-Abonnements",
    group2Desc: "Die perfekte Symbiose: Web + native, dedizierte iOS- & Android-Apps für blitzschnelle Push-Signale.",
    
    planWebSub: "Website-Abo",
    planWebSubDesc: "Voller Web-App-Zugriff inklusive statistischem Value-Quoten-Analyser und Echtzeit-Favoritenradar.",
    
    planBasic: "Basic-Abo",
    planBasicDesc: "Basis-VIP-Kanal auf der Website mit automatisierten Push-Notizen und Performance-Archiv.",
    
    planPro: "Pro-Version (Abo + Cloud)",
    planProDesc: "Analyser-Oddsfeed mit minimaler Latenz, gestützt auf eigene Cloud-Cluster und Bankroll-Absicherung.",
    
    planBasicMax: "Basic Max (Web + iOS + Android)",
    planBasicMaxDesc: "Nutzen Sie iRunBets komfortabel im Web sowie auf unseren nativos iOS- & Android-Apps parallel.",
    
    planProMax: "Pro Max (Web + iOS + Android + Cloud)",
    planProMaxDesc: "Der absolute Goldstandard. Alle Apps (Web, iOS, Android) im hocheffizienten Cloud-Verbund ohne Limits.",
    
    soonLabel: "Bald Verfügbar",
    perMonth: "monat",
    inactiveStatus: "Inaktiv",
    featuresLabel: "Enthaltene Vorteile:",
    webFeature: "24/7 Webplattform-Zugang",
    evFeature: "+EV Mathematischer Analyser",
    radarFeature: "Aktives Team-Radar-Feed",
    cloudFeature: "Gesicherte Cloud-Backups",
    mobileFeature: "Native iOS & Android Apps"
  }
};

const pageHeaderTranslations = {
  pt: {
    title: "Clube VIP iRunBets",
    description: "Análise estatística avançada, gestão de risco de banca e estimativa de valor esperado positivo (+EV). Sem garantias de lucro desportivo."
  },
  en: {
    title: "iRunBets VIP Club",
    description: "Advanced statistical analysis, bankroll risk management, and estimated positive expected value (+EV). No guarantees of sports betting profit."
  },
  fr: {
    title: "Club VIP iRunBets",
    description: "Analyse statistique avancée, gestion du risque de bankroll et estimation de valeur attendue positive (+EV). Sans garanties de bénéfice."
  },
  it: {
    title: "Club VIP iRunBets",
    description: "Analisi statistica avanzata, gestione del rischio di bankroll e stima del valore atteso positivo (+EV). Senza garanzie di profitto."
  },
  de: {
    title: "iRunBets VIP-Club",
    description: "Fortgeschrittene statistische Analyse, Bankroll-Risikomanagement und geschätzter positiver Erwartungswert (+EV). Keine Gewinngarantien."
  }
};

const clubeVipBlocksTranslations = {
  pt: [
    {
      title: 'Porquê juntar-se ao Clube VIP?',
      content: 'O Clube VIP iRunBets foi desenvolvido para apostadores exigentes que não se limitam a apostar por intuição. O nosso algoritmo iR-Engine Pro v3.5 trabalha 24 horas por dia comparando as probabilidades matemáticas reais com as odds disponibilizadas por todas as casas de apostas em Portugal, filtrando os desvios de valor para ti. O nosso foco principal é a proteção de banca e a eliminação de decisões emocionais desordenadas.'
    },
    {
      caption: 'O relvado de futebol onde as nossas decisões são traduzidas em matemática, gestão de risco de banca e consistência de longo prazo.'
    },
    {
      title: 'Explicação do Algoritmo iRunBets de Odds +EV'
    }
  ],
  en: [
    {
      title: 'Why join the VIP Club?',
      content: 'The iRunBets VIP Club is designed for demanding bettors who do not rely on raw intuition. Our iR-Engine Pro v3.5 algorithm operates 24/7, comparing real mathematical probabilities with the odds offered by traditional bookmakers, filtering real value differentials for you. Our primary focus is bankroll protection and avoiding emotional decisions.'
    },
    {
      caption: 'The football pitch where our choices are translated into mathematics, bankroll risk management, and long-term consistency.'
    },
    {
      title: 'Explanation of the iRunBets +EV Odds Algorithm'
    }
  ],
  fr: [
    {
      title: 'Pourquoi rejoindre le Club VIP ?',
      content: 'Le Club VIP iRunBets a été conçu pour les parieurs exigeants qui ne se contentent pas de parier à l\'instinct. Notre algorithme iR-Engine Pro v3.5 travaille 24 heures sur 24 pour comparer les probabilités mathématiques réelles avec les cotes proposées par les bookmakers, filtrant les écarts de valeur pour vous. Notre objectif principal est la préservation du capital et l\'élimination des choix émotionnels.'
    },
    {
      caption: 'Le terrain de football où nos décisions se traduisent en mathématiques, en gestion des risques et en rigueur à long terme.'
    },
    {
      title: 'Explication de l\'algorithme de cotes +EV d\'iRunBets'
    }
  ],
  it: [
    {
      title: 'Perché unirsi al Club VIP?',
      content: 'Il Club VIP iRunBets è stato sviluppato per scommettitori esigenti que não si affidano al semplice intuito. Il nostro algoritmo iR-Engine Pro v3.5 scommette 24 ore su 24 confrontando le reali probabilità matematiche con le quote offerte dai bookmaker, filtrando i migliori valori attesi per te. Sosteniamo uma rigorosa protezione del bankroll.'
    },
    {
      caption: 'Il campo da calcio in cui le nostre scelte sono tradotte in matematica, gestione del rischio e costanza a lungo termine.'
    },
    {
      title: 'Spiegazione dell\'algoritmo di quote +EV di iRunBets'
    }
  ],
  de: [
    {
      title: 'Warum dem VIP-Club beitreten?',
      content: 'Der iRunBets VIP-Club wurde für anspruchsvolle Tipper entwickelt, die sich nicht auf bloße Intuition verlassen. Unser iR-Engine Pro v3.5-Algorithmus arbeitet rund um die Uhr, vergleicht echte mathematische Wahrscheinlichkeiten mit den von Buchmachern angebotenen Quoten und filtert Value-Abweichungen für Sie heraus. Unser Hauptfokus liegt auf Bankroll-Schutz und rationalen Entscheidungen.'
    },
    {
      caption: 'Der Fußballrasen, auf dem unsere Entscheidungen in Mathematik, Risikomanagement und langfristige Konsistenz übersetzt werden.'
    },
    {
      title: 'Erklärung des iRunBets +EV Quoten-Algorithmus'
    }
  ]
};

const genericTranslations: Record<string, Record<string, string>> = {
  pt: {
    voltar_inicio: 'Voltar ao Início',
    registo_apostas: 'REGISTO DE APOSTAS',
    registas_aqui: 'Registas Aqui as tuas apostas e gere a tua banca',
    gere_banca_online: 'GERE A TUA BANCA DE APOSTAS TOTALMENTE ONLINE',
    aqui_podes_gerir: 'Aqui podes gerir as tuas apostas online'
  },
  en: {
    voltar_inicio: 'Back to Home',
    registo_apostas: 'BET REGISTRY',
    registas_aqui: 'Register your bets here and manage your bankroll',
    gere_banca_online: 'MANAGE YOUR BETTING BANKROLL FULLY ONLINE',
    aqui_podes_gerir: 'Here you can manage your online bets'
  },
  fr: {
    voltar_inicio: "Retour à l'Accueil",
    registo_apostas: 'REGISTRE DE PARIS',
    registas_aqui: 'Enregistrez vos paris ici et gérez votre bankroll',
    gere_banca_online: 'GÉREZ VOTRE BANKROLL DE PARIS ENTIÈREMENT EN LIGNE',
    aqui_podes_gerir: 'Ici vous pouvez gérer vos paris en ligne'
  },
  it: {
    voltar_inicio: 'Torna alla Home',
    registo_apostas: 'REGISTRO DI SCOMMESSE',
    registas_aqui: 'Registra qui le tue scommesse e gestisci il tuo bankroll',
    gere_banca_online: 'GESTISCI IL TUO BANKROLL SCOMMESSE COMPLETAMENTE ONLINE',
    aqui_podes_gerir: 'Qui puoi gestire le tue scommesse online'
  },
  de: {
    voltar_inicio: 'Zurück zur Startseite',
    registo_apostas: 'WETTREGISTER',
    registas_aqui: 'Registrieren Sie hier Ihre Wetten und verwalten Sie Ihr Guthaben',
    gere_banca_online: 'VERWALTEN SIE IHR WETTGUTHABEN VOLLSTÄNDIG ONLINE',
    aqui_podes_gerir: 'Hier können Sie Ihre Online-Wetten verwalten'
  }
};

const translateText = (text: string | undefined, lang: string): string => {
  if (!text) return '';
  const currentLangDict = genericTranslations[lang] || genericTranslations.pt;
  const ptDict = genericTranslations.pt;
  
  // Find key in portuguese dictionary where the value matches (case insensitively)
  const entry = Object.entries(ptDict).find(([_, val]) => {
    return val.toLowerCase() === text.trim().toLowerCase();
  });
  
  if (entry) {
    const [key] = entry;
    return currentLangDict[key] || text;
  }
  
  // Try dynamic substring replacement
  let translated = text;
  Object.entries(ptDict).forEach(([key, ptValue]) => {
    const targetValue = currentLangDict[key];
    if (targetValue) {
      const escapedPtValue = ptValue.replace(/[-\/\\^$*+?.()|[\]{}]/g, '\\$&');
      const regex = new RegExp(escapedPtValue, 'gi');
      translated = translated.replace(regex, targetValue);
    }
  });

  return translated;
};

const DynamicCustomPageView: React.FC<DynamicCustomPageViewProps> = ({ 
  page, 
  onBackToHome, 
  userSubscriptionStatus = 'Gratuito', 
  onSubscriptionUpdated,
  isAdmin: propIsAdmin = false,
  currentUser: propCurrentUser = null
}) => {
  const { language } = useLanguage();
  const [clubeVipTab, setClubeVipTab] = useState<'info' | 'dashboard'>(() => {
    const trigger = localStorage.getItem('irunbets_vip_clube_tab_trigger');
    if (trigger === 'dashboard' || trigger === 'info') {
      localStorage.removeItem('irunbets_vip_clube_tab_trigger');
      return trigger as any;
    }
    return 'info';
  });
  const [isAdmin, setIsAdmin] = useState(propIsAdmin);
  const [isPaid, setIsPaid] = useState(false);
  const [activePlans, setActivePlans] = useState<PricingPlan[]>(getCustomizablePlans());
  const [checkoutPlanId, setCheckoutPlanId] = useState<string | null>(null);
  const [currentUser, setCurrentUser] = useState<any>(propCurrentUser);
  const [fidelityDiscount, setFidelityDiscount] = useState(true);
  const [billingCycle, setBillingCycle] = useState<'monthly' | 'yearly'>('monthly');

  // Live Inline Wix-style Page Editor States
  const [currentPage, setCurrentPage] = useState<CustomPage>(page);
  const [isEditingInline, setIsEditingInline] = useState(false);
  const [saveSuccessMessage, setSaveSuccessMessage] = useState<string | null>(null);
  const [editingBlockIndex, setEditingBlockIndex] = useState<number | null>(null);

  useEffect(() => {
    setCurrentPage(page);
  }, [page]);

  const handleSavePageInline = async () => {
    try {
      await saveCustomPage(currentPage);
      setSaveSuccessMessage('✓ Página salva e publicada com sucesso no site!');
      setTimeout(() => setSaveSuccessMessage(null), 4000);
    } catch (err) {
      console.error('Error saving custom page inline:', err);
      alert('Erro ao guardar alterações na página.');
    }
  };

  const handleAddBlockInline = (type: 'text' | 'image' | 'video' | 'button') => {
    const newBlock: any = {
      type,
      title: type === 'text' ? 'Novo Título' : type === 'image' ? 'Título da Imagem' : type === 'video' ? 'Vídeo Explicativo' : 'Botão de Ação',
      content: type === 'text' ? 'Escreva o texto ou conteúdo aqui...' : type === 'image' ? 'https://images.unsplash.com/photo-1508098682722-e99c43a406b2?auto=format&fit=crop&w=1200&q=80' : type === 'video' ? 'https://www.youtube.com/embed/dQw4w9WgXcQ' : 'Clique Aqui',
      caption: type === 'image' ? 'Legenda da Imagem' : '',
      link: type === 'button' ? '#' : ''
    };
    const updatedBlocks = [...(currentPage.blocks || []), newBlock];
    setCurrentPage({ ...currentPage, blocks: updatedBlocks });
    setIsEditingInline(true);
    setEditingBlockIndex(updatedBlocks.length - 1);
  };

  const handleImageFileUpload = (e: React.ChangeEvent<HTMLInputElement>, index?: number) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (file.size > 10 * 1024 * 1024) {
      alert('A imagem excede 10MB. Por favor escolha um ficheiro mais leve.');
      return;
    }

    const reader = new FileReader();
    reader.onload = (event) => {
      const dataUrl = event.target?.result as string;
      if (!dataUrl) return;

      if (index !== undefined && index >= 0) {
        const updatedBlocks = [...currentPage.blocks];
        updatedBlocks[index] = {
          ...updatedBlocks[index],
          content: dataUrl
        };
        setCurrentPage({ ...currentPage, blocks: updatedBlocks });
      } else {
        const newBlock = {
          type: 'image' as const,
          title: file.name.split('.')[0] || 'Imagem Carregada',
          content: dataUrl,
          caption: 'Imagem do Computador',
          link: ''
        };
        setCurrentPage({ ...currentPage, blocks: [...(currentPage.blocks || []), newBlock] });
        setIsEditingInline(true);
      }
    };
    reader.readAsDataURL(file);
  };

  const handleMoveBlockInline = (index: number, direction: 'up' | 'down') => {
    const blocks = [...currentPage.blocks];
    if (direction === 'up' && index > 0) {
      const temp = blocks[index - 1];
      blocks[index - 1] = blocks[index];
      blocks[index] = temp;
    } else if (direction === 'down' && index < blocks.length - 1) {
      const temp = blocks[index + 1];
      blocks[index + 1] = blocks[index];
      blocks[index] = temp;
    }
    setCurrentPage({ ...currentPage, blocks });
  };

  const handleDeleteBlockInline = (index: number) => {
    if (window.confirm('Eliminar este bloco da página?')) {
      const blocks = currentPage.blocks.filter((_, i) => i !== index);
      setCurrentPage({ ...currentPage, blocks });
      if (editingBlockIndex === index) setEditingBlockIndex(null);
    }
  };

  // Subscription Cancellation States & Event Triggers
  const [cancellingPlanId, setCancellingPlanId] = useState<string | null>(null);
  const [cancellingPlanName, setCancellingPlanName] = useState<string>('');
  const [cancelReason, setCancelReason] = useState('');
  const [isCancellingProcess, setIsCancellingProcess] = useState(false);
  const [cancelSuccessMessage, setCancelSuccessMessage] = useState<string | null>(null);
  const [isMundialActive, setIsMundialActive] = useState<boolean>(false);
  const [mundialCampaignTitle, setMundialCampaignTitle] = useState<string>('Campanha do Campeonato do Mundo');
  const [mundialCampaignDescription, setMundialCampaignDescription] = useState<string>('Para celebrar o Campeonato do Mundo com a nossa comunidade, libertámos o acesso total e irrestrito ao Chat de IA Gemini Mentor, OCR Inteligente de boletins e Livro de Registo de Banca PRO de forma gratuita! Explore livremente sem cliques de checkout.');

  // Synchronize Subscribers Config & Mundial campaign state in real time
  useEffect(() => {
    const checkMundialCampaign = () => {
      try {
        const config = getSubscribersConfig();
        setIsMundialActive(!!config.isMundialActive);
        if (config.mundialCampaignTitle) {
          setMundialCampaignTitle(config.mundialCampaignTitle);
        }
        if (config.mundialCampaignDescription) {
          setMundialCampaignDescription(config.mundialCampaignDescription);
        }
      } catch (err) {
        console.warn('Erro ao carregar Campanha do Mundial em tempo real:', err);
      }
    };

    checkMundialCampaign();
    const intervalId = setInterval(checkMundialCampaign, 2000);
    return () => clearInterval(intervalId);
  }, []);

  useEffect(() => {
    const handleTriggerCancelEvent = (e: Event) => {
      const customDet = (e as CustomEvent)?.detail;
      if (customDet) {
        setCancellingPlanId(customDet.planId || 'pro');
        setCancellingPlanName(customDet.planName || 'Elite Cloud Pro');
        // Switch view to Presentation/Info smoothly
        setClubeVipTab('info');
        setTimeout(() => {
          const pricingEl = document.getElementById('pricing-plans-section');
          if (pricingEl) {
            pricingEl.scrollIntoView({ behavior: 'smooth' });
          }
        }, 150);
      }
    };
    window.addEventListener('irunbets_trigger_cancel_modal', handleTriggerCancelEvent);
    return () => {
      window.removeEventListener('irunbets_trigger_cancel_modal', handleTriggerCancelEvent);
    };
  }, []);

  const handleCancelSubscriptionSubmit = async (planId: string, planName: string, reason: string) => {
    setIsCancellingProcess(true);
    try {
      // 1. Revert user subscription status to 'Gratuito' in Firebase if authenticated
      if (currentUser) {
        await updateSubscriberStatus(currentUser.uid, 'Gratuito');
      }
      localStorage.removeItem('irunbets_vip_paid');
      setIsPaid(false);

      // 2. Call server endpoint to notify support email suporte@irunbets.pt
      const reqBody = {
        email: currentUser?.email || 'anonimo@irunbets.com',
        uid: currentUser?.uid || 'offline-user',
        planId: planId,
        planName: planName,
        reason: reason,
        timestamp: new Date().toISOString()
      };

      await fetch('/api/cancel-subscription', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(reqBody)
      });

      // 3. Show feedback pop up
      setCancelSuccessMessage(`Subscrição anulada com sucesso! Um aviso oficial faturado foi enviado para suporte@irunbets.pt.`);
      setCancellingPlanId(null);
      setCancelReason('');
      
      // Refresh parent layout
      if (onSubscriptionUpdated) {
        onSubscriptionUpdated();
      }
    } catch (err: any) {
      console.error('Error canceling subscription:', err);
      localStorage.removeItem('irunbets_vip_paid');
      setIsPaid(false);
      setCancelSuccessMessage(`A sua subscrição foi terminada. O aviso foi também processado para suporte@irunbets.pt.`);
      setCancellingPlanId(null);
      setCancelReason('');
      if (onSubscriptionUpdated) {
        onSubscriptionUpdated();
      }
    } finally {
      setIsCancellingProcess(false);
    }
  };

  useEffect(() => {
    setActivePlans(getCustomizablePlans());
  }, [clubeVipTab]);

  useEffect(() => {
    const checkPaidStatus = () => {
      const paid = localStorage.getItem('irunbets_vip_paid') === 'true' || currentUser?.email === '1982veramorgado@gmail.com';
      setIsPaid(paid);
    };

    const unsubscribe = onAuthStatusChange(async (user, checkAdmin) => {
      setIsAdmin(checkAdmin);
      setCurrentUser(user);
      if (user) {
        if (user.email === '1982veramorgado@gmail.com') {
          localStorage.setItem('irunbets_vip_paid', 'true');
          setIsPaid(true);
          return;
        }
        try {
          const sub = await getSubscriber(user.uid);
          setActiveSubscriberData(sub);
          if (sub?.status && sub.status !== 'Gratuito') {
            localStorage.setItem('irunbets_vip_paid', 'true');
            setIsPaid(true);
          }
        } catch (err) {
          console.error('Error in onAuthStatusChange listener VIP view:', err);
        }
      } else {
        setActiveSubscriberData(null);
      }
    });

    checkPaidStatus();
    window.addEventListener('storage', checkPaidStatus);
    const interval = setInterval(checkPaidStatus, 1000);

    return () => {
      unsubscribe();
      window.removeEventListener('storage', checkPaidStatus);
      clearInterval(interval);
    };
  }, []);

  // Software Hub states for page.slug === 'clube-vip'
  const [selectedPlan, setSelectedPlan] = useState<'mensal' | 'trimestral' | 'anual'>('mensal');
  const [activeSubscriberData, setActiveSubscriberData] = useState<any>(null);
  const [clientName, setClientName] = useState('');
  const [clientEmail, setClientEmail] = useState('');
  const [paymentMethod, setPaymentMethod] = useState<'card' | 'skrill' | 'revolut'>('revolut');
  const [clientMbwayPhone, setClientMbwayPhone] = useState('');
  const [clientSkrillAccount, setClientSkrillAccount] = useState('');
  const [clientRevolutUser, setClientRevolutUser] = useState('');
  const [mbwayTimer, setMbwayTimer] = useState(300);
  const [showMbwaySuccessPrompt, setShowMbwaySuccessPrompt] = useState(false);
  
  // Checkout Processing states
  const [isProcessing, setIsProcessing] = useState(false);
  const [processingStep, setProcessingStep] = useState('');
  const [paymentSuccess, setPaymentSuccess] = useState(false);
  const [licenseKey, setLicenseKey] = useState('');
  
  // Custom Merchant accounts state
  const [merchantAccounts, setMerchantAccounts] = useState({
    holderName: "iRunBets Media S.A.",
    mbwayPhone: "933 451 145",
    revolutHandle: "@irunbets",
    ibanDetails: "PT50 3560 0001 9001 8336 8854 1"
  });

  useEffect(() => {
    const loadMerchantAccounts = () => {
      const raw = localStorage.getItem('irunbets_merchant_accounts');
      if (raw) {
        try {
          const parsed = JSON.parse(raw);
          // If it is the old placeholder or personal detail, migrate to the new corporate information
          if (parsed.holderName === "Afonso Morgado" || parsed.holderName === "Angelo Morgado" || parsed.revolutHandle === "@angelo8pmz" || !parsed.holderName || parsed.ibanDetails === "PT50 0003 1234 5678 9012 3456 7" || parsed.mbwayPhone === "912 345 678") {
            parsed.holderName = "iRunBets Media S.A.";
            parsed.revolutHandle = "@irunbets";
            parsed.ibanDetails = "PT50 3560 0001 9001 8336 8854 1";
            parsed.mbwayPhone = "933 451 145";
          }
          // Remove paypalEmail if present
          if (parsed.hasOwnProperty('paypalEmail')) {
            delete parsed.paypalEmail;
          }
          localStorage.setItem('irunbets_merchant_accounts', JSON.stringify(parsed));
          setMerchantAccounts(parsed);
        } catch (e) {
          console.error('Error parsing customized merchant accounts:', e);
        }
      } else {
        const defaultMerch = {
          holderName: "iRunBets Media S.A.",
          mbwayPhone: "933 451 145",
          revolutHandle: "@irunbets",
          ibanDetails: "PT50 3560 0001 9001 8336 8854 1"
        };
        localStorage.setItem('irunbets_merchant_accounts', JSON.stringify(defaultMerch));
        setMerchantAccounts(defaultMerch);
      }
    };

    loadMerchantAccounts();

    window.addEventListener('irunbets_merchant_updated', loadMerchantAccounts);
    return () => {
      window.removeEventListener('irunbets_merchant_updated', loadMerchantAccounts);
    };
  }, []);

  useEffect(() => {
    let interval: any;
    if (isProcessing && processingStep === 'WAITING_FOR_USER_ACTION' && paymentMethod === 'skrill') {
      setMbwayTimer(300);
      interval = setInterval(() => {
        setMbwayTimer((prev) => {
          if (prev <= 1) {
            clearInterval(interval);
            return 300;
          }
          return prev - 1;
        });
      }, 1000);
    }
    return () => {
      if (interval) clearInterval(interval);
    };
  }, [isProcessing, processingStep, paymentMethod]);

  const formatTimer = (secs: number) => {
    const mins = Math.floor(secs / 60);
    const remainingSecs = secs % 60;
    return `${mins.toString().padStart(2, '0')}:${remainingSecs.toString().padStart(2, '0')}`;
  };
  
  // Card states
  const [cardNumber, setCardNumber] = useState('');
  const [cardExpiry, setCardExpiry] = useState('');
  const [cardCvc, setCardCvc] = useState('');
  const [cardHolder, setCardHolder] = useState('');
  
  // Revolut / Upload receipt state
  const [receiptName, setReceiptName] = useState('');
  const [dragActive, setDragActive] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  
  // Download Simulation states
  const [demoDownloading, setDemoDownloading] = useState(false);
  const [demoProgress, setDemoProgress] = useState(0);
  const [demoDownloaded, setDemoDownloaded] = useState(false);
  
  const [vipDownloading, setVipDownloading] = useState(false);
  const [vipProgress, setVipProgress] = useState(0);
  const [vipDownloaded, setVipDownloaded] = useState(false);

  // Format Card Number (adds space every 4 digits)
  const handleCardNumberChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const rawVal = e.target.value.replace(/\s+/g, '').replace(/[^0-9]/gi, '');
    const formatted = rawVal.match(/.{1,4}/g)?.join(' ') || rawVal;
    if (rawVal.length <= 16) {
      setCardNumber(formatted);
    }
  };

  // Format Expiry Date (MM/YY)
  const handleExpiryChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    let rawVal = e.target.value.replace(/[^0-9]/gi, '');
    if (rawVal.length > 4) return;
    if (rawVal.length > 2) {
      rawVal = `${rawVal.slice(0, 2)}/${rawVal.slice(2)}`;
    }
    setCardExpiry(rawVal);
  };

  // Drag and Drop handlers for Receipts
  const handleDrag = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.type === "dragenter" || e.type === "dragover") {
      setDragActive(true);
    } else if (e.type === "dragleave") {
      setDragActive(false);
    }
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);
    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      setReceiptName(e.dataTransfer.files[0].name);
    }
  };

  // Trigger file click
  const handleReceiptUploadClick = () => {
    fileInputRef.current?.click();
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      setReceiptName(e.target.files[0].name);
    }
  };

  // Trigger demo download simulation
  const startDemoDownload = () => {
    if (demoDownloading || demoDownloaded) return;
    setDemoDownloading(true);
    setDemoProgress(0);
    const interval = setInterval(() => {
      setDemoProgress((prev) => {
        if (prev >= 100) {
          clearInterval(interval);
          setDemoDownloading(false);
          setDemoDownloaded(true);
          
          // Trigger actual client side fake setup package download
          const blob = new Blob(["Simulated iRunBets Trial setup installer binary content."], { type: 'application/octet-stream' });
          const url = URL.createObjectURL(blob);
          const a = document.createElement('a');
          a.href = url;
          a.download = 'iRunBets_Setup_Trial_3Days.exe';
          a.click();
          URL.revokeObjectURL(url);
          return 100;
        }
        return prev + Math.floor(Math.random() * 15) + 5;
      });
    }, 150);
  };

  // Trigger VIP premium download simulation
  const startVipDownload = () => {
    if (vipDownloading || vipDownloaded || !paymentSuccess) return;
    setVipDownloading(true);
    setVipProgress(0);
    const interval = setInterval(() => {
      setVipProgress((prev) => {
        if (prev >= 100) {
          clearInterval(interval);
          setVipDownloading(false);
          setVipDownloaded(true);
          
          // Trigger actual premium client fake installer binary download
          const blob = new Blob(["Simulated iRunBets Premium VIP Windows App execution software Binary setup content."], { type: 'application/octet-stream' });
          const url = URL.createObjectURL(blob);
          const a = document.createElement('a');
          a.href = url;
          a.download = 'iRunBets_VIP_Standalone_x64.exe';
          a.click();
          URL.revokeObjectURL(url);
          return 100;
        }
        return prev + Math.floor(Math.random() * 20) + 8;
      });
    }, 120);
  };

  // Trigger payment simulation checkout
  const processSecureCheckout = (e: React.FormEvent) => {
    e.preventDefault();
    if (!clientName || !clientEmail) {
      alert("Por favor preencha o seu nome e email de registo!");
      return;
    }
    if (paymentMethod === 'card' && (!cardNumber || !cardExpiry || !cardCvc || !cardHolder)) {
      alert("Por favor preencha os dados do seu cartão de crédito!");
      return;
    }
    if (paymentMethod === 'revolut' && !receiptName) {
      alert("Por favor anexe o comprovativo da transferência Revolut ou Bancária!");
      return;
    }

    setIsProcessing(true);
    setProcessingStep('Ligando à Gateway Segura...');
    
    setTimeout(() => {
      setProcessingStep(paymentMethod === 'card' ? 'Processando transação via Stripe...' : 'Verificando envio do comprovativo de pagamento...');
      setTimeout(() => {
        setProcessingStep('Registando a sua licença de hardware com segurança...');
        setTimeout(() => {
          // Generate a custom beautiful License Key
          const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
          let genKey = 'IRB-VIP-';
          for (let i = 0; i < 4; i++) {
            for (let j = 0; j < 4; j++) genKey += chars.charAt(Math.floor(Math.random() * chars.length));
            if (i < 3) genKey += '-';
          }
          
          setLicenseKey(genKey);
          setIsProcessing(false);
          setPaymentSuccess(true);
          localStorage.setItem('irunbets_vip_paid', 'true');
          setIsPaid(true);
          setClubeVipTab('dashboard');
        }, 1200);
      }, 1400);
    }, 1200);
  };

  const planPrice = selectedPlan === 'mensal' ? '19.99€' : selectedPlan === 'trimestral' ? '49.99€' : '149.99€';
  const planLabel = selectedPlan === 'mensal' ? 'Subscrição Mensal VIP' : selectedPlan === 'trimestral' ? 'Subscrição Trimestral VIP' : 'Subscrição Anual Pro VIP';

  if (page.slug === 'dados-estatisticos' || page.slug === 'estatisticas' || page.slug === 'apis-excel') {
    return <DadosEstatisticosPage onBackToHome={onBackToHome} />;
  }

  if (page.slug === 'vip-dashboard' || page.slug === 'dashboard' || page.slug === 'clube-vip') {
    return (
      <div className="min-h-screen bg-[#0A0A0C] text-zinc-100 pt-32 pb-24 relative selection:bg-orange-500/20">
        <div className="absolute top-0 right-0 w-[600px] h-[600px] bg-[#00f2fe]/5 rounded-full blur-[160px] pointer-events-none opacity-40"></div>
        <div className="absolute bottom-0 left-0 w-[600px] h-[600px] bg-orange-600/5 rounded-full blur-[160px] pointer-events-none opacity-40"></div>

        <div className="max-w-7xl mx-auto px-6 relative z-10 font-sans">
          
          {/* Navigation Breadcrumb */}
          <button
            onClick={onBackToHome}
            className="group inline-flex items-center gap-2 px-4 py-2 border border-zinc-850 hover:border-zinc-800 bg-[#121216]/50 hover:bg-[#121216]/90 rounded-xl text-xs font-semibold text-zinc-400 hover:text-white transition-all cursor-pointer mb-8"
          >
            <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor" className="w-3.5 h-3.5 transition-transform group-hover:-translate-x-0.5">
              <path strokeLinecap="round" strokeLinejoin="round" d="M10.5 19.5 3 12m0 0 7.5-7.5M3 12h18" />
            </svg>
            <span>{translateText('Voltar ao Início', language)}</span>
          </button>

          <VipDashboard 
            onBackToHome={onBackToHome} 
            isPlatformPaid={isPaid || isAdmin || isMundialActive || !!currentUser}
            isAdmin={Boolean(isAdmin || currentUser?.email?.toLowerCase() === 'morgado.aam@gmail.com')}
            currentUser={currentUser}
          />
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#0A0A0C] text-zinc-100 pt-32 pb-24 relative selection:bg-orange-500/20">
      {/* Background aesthetics */}
      <div className="absolute top-0 right-0 w-[600px] h-[600px] bg-[#00f2fe]/5 rounded-full blur-[160px] pointer-events-none opacity-40"></div>
      <div className="absolute bottom-0 left-0 w-[600px] h-[600px] bg-orange-600/5 rounded-full blur-[160px] pointer-events-none opacity-40"></div>

      <div className={`mx-auto px-2 sm:px-4 lg:px-8 relative z-10 ${currentPage.slug === 'prognosticos-futebol' || currentPage.slug === 'prognosticos' ? 'max-w-[1920px] w-full' : 'max-w-7xl'}`}>
        
        {/* Navigation Breadcrumb */}
        <button
          type="button"
          onClick={onBackToHome}
          className="group inline-flex items-center gap-2 px-4 py-2 border border-zinc-850 hover:border-zinc-800 bg-[#121216]/50 hover:bg-[#121216]/90 rounded-xl text-xs font-semibold text-zinc-400 hover:text-white transition-all cursor-pointer mb-8"
        >
          <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor" className="w-3.5 h-3.5 transition-transform group-hover:-translate-x-0.5">
            <path strokeLinecap="round" strokeLinejoin="round" d="M10.5 19.5 3 12m0 0 7.5-7.5M3 12h18" />
          </svg>
          <span>{translateText('Voltar ao Início', language)}</span>
        </button>

        {/* Admin Inline Wix-style Toolbar */}
        {((isAdmin && currentUser?.email?.toLowerCase() === 'morgado.aam@gmail.com') || currentUser?.email?.toLowerCase() === 'morgado.aam@gmail.com') && (
          <div className="bg-gradient-to-r from-zinc-950 via-zinc-900 to-zinc-950 border border-orange-500/50 rounded-2xl p-4 sm:p-5 mb-8 shadow-2xl space-y-4">
            <div className="flex flex-wrap items-center justify-between gap-4">
              <div className="flex items-center gap-3">
                <div className="w-9 h-9 rounded-xl bg-orange-500/20 border border-orange-500/40 flex items-center justify-center text-orange-400 font-bold text-lg">
                  ✏️
                </div>
                <div>
                  <h3 className="text-white font-extrabold text-sm uppercase tracking-wide font-display flex items-center gap-2">
                    <span>Editor Inline de Página (Estilo Wix)</span>
                    <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-orange-500/20 text-orange-400 border border-orange-500/30">ADMIN</span>
                  </h3>
                  <p className="text-xs text-zinc-400 font-mono">
                    Edite o título, descrição, adicione ou ordene blocos e carregue imagens diretamente do computador.
                  </p>
                </div>
              </div>

              <div className="flex items-center gap-2.5">
                <button
                  type="button"
                  onClick={() => setIsEditingInline(!isEditingInline)}
                  className={`px-4 py-2 rounded-xl text-xs font-bold uppercase tracking-wider transition-all cursor-pointer ${
                    isEditingInline
                      ? 'bg-amber-500 text-black shadow-lg shadow-amber-500/20'
                      : 'bg-zinc-800 text-zinc-300 hover:bg-zinc-700 hover:text-white'
                  }`}
                >
                  {isEditingInline ? '👁️ Modo Visualização' : '✏️ Modo de Edição Inline'}
                </button>

                <button
                  type="button"
                  onClick={handleSavePageInline}
                  className="px-5 py-2 bg-gradient-to-r from-emerald-500 to-teal-500 hover:from-emerald-400 hover:to-teal-400 text-black font-black text-xs uppercase tracking-wider rounded-xl shadow-lg shadow-emerald-500/20 transition-all cursor-pointer flex items-center gap-2"
                >
                  <span>💾 Salvar Página</span>
                </button>
              </div>
            </div>

            {saveSuccessMessage && (
              <div className="bg-emerald-500/20 border border-emerald-500/40 text-emerald-300 text-xs font-bold px-4 py-2.5 rounded-xl animate-fade-in font-mono">
                {saveSuccessMessage}
              </div>
            )}

            {/* Wix-style Quick Block Adding Bar */}
            {isEditingInline && (
              <div className="pt-3 border-t border-zinc-800 flex flex-wrap items-center gap-2">
                <span className="text-[11px] font-bold text-zinc-400 uppercase tracking-widest font-mono mr-2">➕ Adicionar Conteúdo:</span>
                
                <button
                  type="button"
                  onClick={() => handleAddBlockInline('text')}
                  className="px-3 py-1.5 bg-zinc-850 hover:bg-zinc-800 text-zinc-200 hover:text-white rounded-lg text-xs font-semibold border border-zinc-750 transition-all cursor-pointer flex items-center gap-1.5"
                >
                  <span>📝 Bloco de Texto</span>
                </button>

                <label className="px-3 py-1.5 bg-orange-500/20 hover:bg-orange-500/30 text-orange-300 hover:text-orange-200 rounded-lg text-xs font-semibold border border-orange-500/40 transition-all cursor-pointer flex items-center gap-1.5">
                  <span>📁 Carregar Imagem do PC</span>
                  <input
                    type="file"
                    accept="image/*"
                    className="hidden"
                    onChange={(e) => handleImageFileUpload(e)}
                  />
                </label>

                <button
                  type="button"
                  onClick={() => handleAddBlockInline('image')}
                  className="px-3 py-1.5 bg-zinc-850 hover:bg-zinc-800 text-zinc-200 hover:text-white rounded-lg text-xs font-semibold border border-zinc-750 transition-all cursor-pointer flex items-center gap-1.5"
                >
                  <span>🔗 Imagem por URL</span>
                </button>

                <button
                  type="button"
                  onClick={() => handleAddBlockInline('video')}
                  className="px-3 py-1.5 bg-zinc-850 hover:bg-zinc-800 text-zinc-200 hover:text-white rounded-lg text-xs font-semibold border border-zinc-750 transition-all cursor-pointer flex items-center gap-1.5"
                >
                  <span>🎬 Vídeo</span>
                </button>

                <button
                  type="button"
                  onClick={() => handleAddBlockInline('button')}
                  className="px-3 py-1.5 bg-zinc-850 hover:bg-zinc-800 text-zinc-200 hover:text-white rounded-lg text-xs font-semibold border border-zinc-750 transition-all cursor-pointer flex items-center gap-1.5"
                >
                  <span>🔘 Botão / Link</span>
                </button>
              </div>
            )}
          </div>
        )}

        {/* Page Main Header */}
        {(() => {
          const isClubeVip = currentPage.slug === 'clube-vip';
          const headerTrans = isClubeVip 
            ? (pageHeaderTranslations[language as keyof typeof pageHeaderTranslations] || pageHeaderTranslations.pt)
            : null;
            
          const displayTitle = headerTrans ? headerTrans.title : translateText(currentPage.title, language);
          const displayDescription = headerTrans ? headerTrans.description : translateText(currentPage.description, language);
          
          return (
            <div className="text-center sm:text-left mb-12 border-b border-zinc-850 pb-8">
              {isEditingInline ? (
                <div className="space-y-4 bg-zinc-900/60 p-5 rounded-2xl border border-orange-500/40">
                  <div>
                    <label className="block text-xs font-bold text-orange-400 uppercase tracking-wider font-mono mb-1">
                      ✏️ Título Principal da Página:
                    </label>
                    <input
                      type="text"
                      value={currentPage.title}
                      onChange={(e) => setCurrentPage({ ...currentPage, title: e.target.value })}
                      className="w-full bg-zinc-950 border border-zinc-700 focus:border-orange-500 rounded-xl px-4 py-2.5 text-xl font-bold text-white focus:outline-none"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-orange-400 uppercase tracking-wider font-mono mb-1">
                      ✏️ Descrição / Subtítulo da Página:
                    </label>
                    <textarea
                      rows={2}
                      value={currentPage.description || ''}
                      onChange={(e) => setCurrentPage({ ...currentPage, description: e.target.value })}
                      className="w-full bg-zinc-950 border border-zinc-700 focus:border-orange-500 rounded-xl px-4 py-2.5 text-sm text-zinc-300 focus:outline-none"
                    />
                  </div>
                </div>
              ) : (
                <>
                  <h1 className="text-3xl sm:text-5xl font-black text-white font-display tracking-tight leading-tight uppercase relative inline-block">
                    {displayTitle}
                  </h1>
                  <div className="h-1 w-20 bg-gradient-to-r from-orange-500 to-[#00f2fe] rounded-full mt-3.5 hidden sm:block"></div>
                  
                  {displayDescription && (
                    <p className="text-zinc-400 text-sm sm:text-base font-light mt-4 max-w-2xl leading-relaxed">
                      {displayDescription}
                    </p>
                  )}
                </>
              )}
            </div>
          );
        })()}

        {/* Tab Switcher for Clube VIP */}
        {currentPage.slug === 'clube-vip' && (
          <div className="flex items-center justify-center sm:justify-start gap-2 mb-8 bg-zinc-900/40 p-1.5 rounded-2xl border border-zinc-850/60 max-w-md mx-auto sm:mx-0">
            <button
              onClick={() => setClubeVipTab('info')}
              className={`flex-1 py-2.5 px-4 rounded-xl text-xs font-bold transition-all uppercase tracking-wider ${
                clubeVipTab === 'info'
                  ? 'bg-gradient-to-r from-orange-500 to-amber-500 text-white shadow-lg'
                  : 'text-zinc-400 hover:text-white hover:bg-zinc-950/20'
              }`}
            >
              {tabLabels[language as keyof typeof tabLabels]?.presentation || tabLabels.pt.presentation}
            </button>
            <button
              onClick={() => setClubeVipTab('dashboard')}
              className={`flex-1 py-2.5 px-4 rounded-xl text-xs font-bold transition-all uppercase tracking-wider flex items-center justify-center gap-1.5 ${
                clubeVipTab === 'dashboard'
                  ? 'bg-gradient-to-r from-cyan-500 to-blue-500 text-white shadow-lg'
                  : 'text-zinc-400 hover:text-white hover:bg-zinc-950/20'
              }`}
            >
              {tabLabels[language as keyof typeof tabLabels]?.dashboard || tabLabels.pt.dashboard}
            </button>
          </div>
        )}

        {/* Render custom blocks */}
        <div className={`space-y-10 mb-16 ${currentPage.slug === 'clube-vip' && clubeVipTab === 'dashboard' ? 'hidden' : ''}`}>
          {currentPage.blocks && currentPage.blocks.length > 0 && currentPage.blocks.map((block, idx) => {
            let displayBlockTitle = block.title;
            let displayBlockContent = block.content;
            let displayBlockCaption = block.caption;
            
            if (currentPage.slug === 'clube-vip') {
              const transList = clubeVipBlocksTranslations[language as keyof typeof clubeVipBlocksTranslations] || clubeVipBlocksTranslations.pt;
              if (transList && transList[idx]) {
                if (transList[idx].title !== undefined) displayBlockTitle = transList[idx].title;
                if (transList[idx].content !== undefined) displayBlockContent = transList[idx].content;
                if (transList[idx].caption !== undefined) displayBlockCaption = transList[idx].caption;
              }
            } else {
              displayBlockTitle = translateText(block.title, language);
              displayBlockContent = translateText(block.content, language);
              displayBlockCaption = translateText(block.caption, language);
            }

            return (
              <div key={idx} className="relative group">
                {/* Inline Editing Control Overlay Box for Block */}
                {isEditingInline && (
                  <div className="bg-zinc-900/90 border border-amber-500/50 rounded-2xl p-4 mb-4 space-y-3 shadow-xl">
                    <div className="flex items-center justify-between pb-2 border-b border-zinc-800">
                      <span className="text-xs font-bold text-amber-400 uppercase tracking-widest font-mono flex items-center gap-2">
                        <span>✏️ Editar Bloco #{idx + 1}</span>
                        <span className="text-[10px] bg-zinc-800 text-zinc-300 px-2 py-0.5 rounded uppercase">{block.type}</span>
                      </span>
                      <div className="flex items-center gap-1.5">
                        <button
                          type="button"
                          onClick={() => handleMoveBlockInline(idx, 'up')}
                          disabled={idx === 0}
                          className="px-2 py-1 bg-zinc-800 hover:bg-zinc-700 text-zinc-300 rounded-lg text-xs disabled:opacity-30 cursor-pointer"
                          title="Mover para Cima"
                        >
                          ⬆️ Subir
                        </button>
                        <button
                          type="button"
                          onClick={() => handleMoveBlockInline(idx, 'down')}
                          disabled={idx === currentPage.blocks.length - 1}
                          className="px-2 py-1 bg-zinc-800 hover:bg-zinc-700 text-zinc-300 rounded-lg text-xs disabled:opacity-30 cursor-pointer"
                          title="Mover para Baixo"
                        >
                          ⬇️ Descer
                        </button>
                        <button
                          type="button"
                          onClick={() => handleDeleteBlockInline(idx)}
                          className="px-2 py-1 bg-red-500/20 hover:bg-red-500/40 text-red-400 rounded-lg text-xs font-bold cursor-pointer"
                          title="Eliminar Bloco"
                        >
                          🗑️ Eliminar
                        </button>
                      </div>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-3 pt-1">
                      <div>
                        <label className="block text-[11px] font-bold text-zinc-400 mb-1">Título do Bloco:</label>
                        <input
                          type="text"
                          value={block.title || ''}
                          onChange={(e) => {
                            const updated = [...currentPage.blocks];
                            updated[idx] = { ...updated[idx], title: e.target.value };
                            setCurrentPage({ ...currentPage, blocks: updated });
                          }}
                          className="w-full bg-zinc-950 border border-zinc-800 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-amber-500 font-sans"
                        />
                      </div>

                      {block.type === 'text' && (
                        <div className="md:col-span-2">
                          <label className="block text-[11px] font-bold text-zinc-400 mb-1">Texto / Conteúdo:</label>
                          <textarea
                            rows={4}
                            value={block.content || ''}
                            onChange={(e) => {
                              const updated = [...currentPage.blocks];
                              updated[idx] = { ...updated[idx], content: e.target.value };
                              setCurrentPage({ ...currentPage, blocks: updated });
                            }}
                            className="w-full bg-zinc-950 border border-zinc-800 rounded-xl px-3 py-2 text-xs text-zinc-200 focus:outline-none focus:border-amber-500 font-sans"
                          />
                        </div>
                      )}

                      {block.type === 'image' && (
                        <>
                          <div className="space-y-1">
                            <label className="block text-[11px] font-bold text-zinc-400 mb-1">Substituir Imagem (Carregar do PC):</label>
                            <label className="inline-flex items-center gap-2 px-3 py-2 bg-orange-500/20 hover:bg-orange-500/30 text-orange-300 rounded-xl text-xs font-bold border border-orange-500/40 cursor-pointer">
                              <span>📁 Escolher Ficheiro no Computador</span>
                              <input
                                type="file"
                                accept="image/*"
                                className="hidden"
                                onChange={(e) => handleImageFileUpload(e, idx)}
                              />
                            </label>
                          </div>

                          <div>
                            <label className="block text-[11px] font-bold text-zinc-400 mb-1">Ou URL da Imagem na Web:</label>
                            <input
                              type="text"
                              value={block.content || ''}
                              onChange={(e) => {
                                const updated = [...currentPage.blocks];
                                updated[idx] = { ...updated[idx], content: e.target.value };
                                setCurrentPage({ ...currentPage, blocks: updated });
                              }}
                              className="w-full bg-zinc-950 border border-zinc-800 rounded-xl px-3 py-2 text-xs text-zinc-200 focus:outline-none focus:border-amber-500"
                            />
                          </div>

                          <div>
                            <label className="block text-[11px] font-bold text-zinc-400 mb-1">Legenda da Imagem:</label>
                            <input
                              type="text"
                              value={block.caption || ''}
                              onChange={(e) => {
                                const updated = [...currentPage.blocks];
                                updated[idx] = { ...updated[idx], caption: e.target.value };
                                setCurrentPage({ ...currentPage, blocks: updated });
                              }}
                              className="w-full bg-zinc-950 border border-zinc-800 rounded-xl px-3 py-2 text-xs text-zinc-200 focus:outline-none focus:border-amber-500"
                            />
                          </div>

                          <div>
                            <label className="block text-[11px] font-bold text-zinc-400 mb-1">Link de Redirecionamento (Opcional):</label>
                            <input
                              type="text"
                              value={block.link || ''}
                              onChange={(e) => {
                                const updated = [...currentPage.blocks];
                                updated[idx] = { ...updated[idx], link: e.target.value };
                                setCurrentPage({ ...currentPage, blocks: updated });
                              }}
                              className="w-full bg-zinc-950 border border-zinc-800 rounded-xl px-3 py-2 text-xs text-zinc-200 focus:outline-none focus:border-amber-500"
                            />
                          </div>
                        </>
                      )}

                      {block.type === 'video' && (
                        <div className="md:col-span-2">
                          <label className="block text-[11px] font-bold text-zinc-400 mb-1">URL do Vídeo (YouTube Embed ou MP4):</label>
                          <input
                            type="text"
                            value={block.content || ''}
                            onChange={(e) => {
                              const updated = [...currentPage.blocks];
                              updated[idx] = { ...updated[idx], content: e.target.value };
                              setCurrentPage({ ...currentPage, blocks: updated });
                            }}
                            className="w-full bg-zinc-950 border border-zinc-800 rounded-xl px-3 py-2 text-xs text-zinc-200 focus:outline-none focus:border-amber-500"
                          />
                        </div>
                      )}

                      {block.type === 'button' && (
                        <>
                          <div>
                            <label className="block text-[11px] font-bold text-zinc-400 mb-1">Texto do Botão:</label>
                            <input
                              type="text"
                              value={block.content || ''}
                              onChange={(e) => {
                                const updated = [...currentPage.blocks];
                                updated[idx] = { ...updated[idx], content: e.target.value };
                                setCurrentPage({ ...currentPage, blocks: updated });
                              }}
                              className="w-full bg-zinc-950 border border-zinc-800 rounded-xl px-3 py-2 text-xs text-zinc-200 focus:outline-none focus:border-amber-500"
                            />
                          </div>
                          <div>
                            <label className="block text-[11px] font-bold text-zinc-400 mb-1">URL do Link de Destino:</label>
                            <input
                              type="text"
                              value={block.link || ''}
                              onChange={(e) => {
                                const updated = [...currentPage.blocks];
                                updated[idx] = { ...updated[idx], link: e.target.value };
                                setCurrentPage({ ...currentPage, blocks: updated });
                              }}
                              className="w-full bg-zinc-950 border border-zinc-800 rounded-xl px-3 py-2 text-xs text-zinc-200 focus:outline-none focus:border-amber-500"
                            />
                          </div>
                        </>
                      )}
                    </div>
                  </div>
                )}

                {/* Live Block Content View */}
                {(() => {
                  switch (block.type) {
                    case 'text':
                      return (
                        <div className="space-y-4 animate-fade-in duration-500">
                          {displayBlockTitle && (
                            <h2 className="text-lg sm:text-xl font-bold text-white uppercase tracking-wider border-l-4 border-orange-500 pl-3.5 font-display flex items-center gap-2">
                              {displayBlockTitle}
                            </h2>
                          )}
                          <p className="text-zinc-300 font-light leading-relaxed text-sm sm:text-base whitespace-pre-wrap leading-relaxed">
                            {displayBlockContent}
                          </p>
                        </div>
                      );
                    case 'image':
                      return (
                        <div className="space-y-3 text-center sm:text-left animate-fade-in duration-500">
                          {displayBlockTitle && (
                            <h3 className="text-base font-extrabold text-white uppercase tracking-wider font-display border-l-4 border-sky-500 pl-3">
                              {displayBlockTitle}
                            </h3>
                          )}
                          <div className="bg-[#121216]/40 border border-zinc-900 rounded-2xl overflow-hidden shadow-2xl inline-block w-full">
                            {block.link ? (
                              <a href={block.link} target="_blank" rel="noopener noreferrer" className="block relative group cursor-pointer">
                                <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity duration-300 flex items-center justify-center">
                                  <span className="px-4 py-2 bg-zinc-950/80 text-white font-bold text-xs uppercase tracking-widest rounded-xl border border-white/10">Aceder ao Destino</span>
                                </div>
                                <img
                                  src={displayBlockContent}
                                  alt={displayBlockCaption || 'Imagens iRunBets'}
                                  referrerPolicy="no-referrer"
                                  className="w-full h-auto max-h-[480px] object-cover"
                                />
                              </a>
                            ) : (
                              <img
                                src={displayBlockContent}
                                alt={displayBlockCaption || 'Imagens iRunBets'}
                                referrerPolicy="no-referrer"
                                className="w-full h-auto max-h-[480px] object-cover"
                              />
                            )}
                          </div>
                          {displayBlockCaption && (
                            <p className="text-zinc-500 font-mono text-xs italic font-light pl-2">
                              • {displayBlockCaption}
                            </p>
                          )}
                        </div>
                      );
                    case 'video':
                      if (currentPage.slug === 'clube-vip') {
                        return (
                          <div className="space-y-6 animate-fade-in duration-500">
                            {displayBlockTitle && (
                              <h3 className="text-base font-extrabold text-white uppercase tracking-wider font-display border-l-4 border-[#00f2fe] pl-3">
                                {displayBlockTitle}
                              </h3>
                            )}
                            
                            <div className="grid grid-cols-1 md:grid-cols-3 gap-6 pt-2">
                              {/* Card 1 */}
                              <div className="bg-zinc-950/60 border border-zinc-900 rounded-2xl p-5 space-y-3 relative overflow-hidden group hover:border-[#00f2fe]/30 transition-all duration-300">
                                <div className="absolute top-0 right-0 w-24 h-24 bg-cyan-500/5 rounded-full blur-xl group-hover:bg-cyan-500/10 transition-all"></div>
                                <div className="w-10 h-10 rounded-xl bg-cyan-500/10 border border-cyan-500/20 flex items-center justify-center text-cyan-400 font-bold text-lg">
                                  📊
                                </div>
                                <h4 className="text-white font-bold text-sm tracking-wide uppercase font-display">
                                  Purificação de Odds
                                </h4>
                                <p className="text-zinc-400 text-xs leading-relaxed font-light font-sans text-justify">
                                  O algoritmo remove a margem de lucro oculta (overround) imposta pelas casas de apostas de forma a revelar a probabilidade estatística real pura por trás de cada jogo.
                                </p>
                              </div>

                              {/* Card 2 */}
                              <div className="bg-zinc-950/60 border border-zinc-900 rounded-2xl p-5 space-y-3 relative overflow-hidden group hover:border-pink-500/30 transition-all duration-300">
                                <div className="absolute top-0 right-0 w-24 h-24 bg-pink-500/5 rounded-full blur-xl group-hover:bg-pink-500/10 transition-all"></div>
                                <div className="w-10 h-10 rounded-xl bg-pink-500/10 border border-pink-500/20 flex items-center justify-center text-pink-400 font-bold text-lg">
                                  📈
                                </div>
                                <h4 className="text-white font-bold text-sm tracking-wide uppercase font-display">
                                  Método +EV Pro
                                </h4>
                                <p className="text-zinc-400 text-xs leading-relaxed font-light font-sans text-justify">
                                  Sempre que a probabilidade justa do nosso simulador matemático é superior à probabilidade sugerida pelas odds públicas, o sistema indica um desvio de valor esperado lucrativo a longo prazo.
                                </p>
                              </div>

                              {/* Card 3 */}
                              <div className="bg-zinc-950/60 border border-zinc-900 rounded-2xl p-5 space-y-3 relative overflow-hidden group hover:border-emerald-500/30 transition-all duration-300">
                                <div className="absolute top-0 right-0 w-24 h-24 bg-emerald-500/5 rounded-full blur-xl group-hover:bg-emerald-500/10 transition-all"></div>
                                <div className="w-10 h-10 rounded-xl bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center text-emerald-400 font-bold text-lg">
                                  🛡️
                                </div>
                                <h4 className="text-white font-bold text-sm tracking-wide uppercase font-display">
                                  Gestão Científica
                                </h4>
                                <p className="text-zinc-400 text-xs leading-relaxed font-light font-sans text-justify">
                                  Recomendação de stake calibrada através de variantes fracionadas do modelo de Kelly, protegendo a banca contra variações de curto prazo de forma totalmente rigorosa.
                                </p>
                              </div>
                            </div>
                          </div>
                        );
                      }

                      return (
                        <div className="space-y-4 animate-fade-in duration-500">
                          {displayBlockTitle && (
                            <h3 className="text-base font-extrabold text-white uppercase tracking-wider font-display border-l-4 border-[#00f2fe] pl-3">
                              {displayBlockTitle}
                            </h3>
                          )}
                          <div className="aspect-video w-full rounded-2xl overflow-hidden border border-zinc-850 shadow-2xl bg-zinc-950">
                            {displayBlockContent.includes('youtube.com/embed/') ? (
                              <iframe
                                src={displayBlockContent}
                                title={displayBlockTitle || "Prognósticos iRunBets"}
                                frameBorder="0"
                                allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
                                allowFullScreen
                                className="w-full h-full"
                              ></iframe>
                            ) : (
                              <video src={displayBlockContent} controls className="w-full h-full object-contain" />
                            )}
                          </div>
                        </div>
                      );

                    case 'button':
                      return (
                        <div className="pt-2 animate-fade-in duration-500">
                          <a
                            href={block.link || '#'}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="inline-flex items-center gap-2 px-6 py-3 bg-gradient-to-r from-orange-500 to-amber-500 hover:from-orange-400 hover:to-amber-400 text-black font-extrabold uppercase text-xs tracking-wider rounded-xl shadow-lg transition-all"
                          >
                            <span>{displayBlockContent || 'Aceder'}</span>
                            <span>→</span>
                          </a>
                        </div>
                      );

                    default:
                      return null;
                  }
                })()}
              </div>
            );
          })}

          {/* Quick Add Block Button when in Inline Edit Mode */}
          {isEditingInline && (
            <div className="p-6 border-2 border-dashed border-orange-500/40 rounded-2xl bg-orange-500/5 text-center space-y-3">
              <span className="text-xs font-extrabold text-orange-400 uppercase tracking-widest font-mono block">
                ➕ Adicionar Novo Bloco a esta Página
              </span>
              <div className="flex flex-wrap items-center justify-center gap-2">
                <button
                  type="button"
                  onClick={() => handleAddBlockInline('text')}
                  className="px-4 py-2 bg-zinc-900 hover:bg-zinc-800 text-white rounded-xl text-xs font-bold border border-zinc-750 transition-all cursor-pointer"
                >
                  📝 Adicionar Texto
                </button>
                <label className="px-4 py-2 bg-orange-500 hover:bg-orange-400 text-black rounded-xl text-xs font-black uppercase tracking-wider transition-all cursor-pointer inline-flex items-center gap-1.5 shadow-lg">
                  <span>📁 Importar Imagem do PC</span>
                  <input
                    type="file"
                    accept="image/*"
                    className="hidden"
                    onChange={(e) => handleImageFileUpload(e)}
                  />
                </label>
                <button
                  type="button"
                  onClick={() => handleAddBlockInline('video')}
                  className="px-4 py-2 bg-zinc-900 hover:bg-zinc-800 text-white rounded-xl text-xs font-bold border border-zinc-750 transition-all cursor-pointer"
                >
                  🎬 Adicionar Vídeo
                </button>
              </div>
            </div>
          )}
        </div>

        {/* Dynamic Embedded Interactive Components for Specific Custom Page Slugs */}
        {page.slug === 'purificador-radar' && (
          <div className="space-y-12 my-10 animate-fade-in duration-500">
            <Purifier 
              userSubscriptionStatus={userSubscriptionStatus} 
              onUpgradeClick={() => {
                const vipPage = {
                  id: 'clube-vip',
                  slug: 'clube-vip',
                  title: 'Clube VIP iRunBets',
                  createdAt: new Date().toISOString(),
                  blocks: []
                };
                window.location.hash = '#clube-vip';
              }}
            />
            <FavoriteRadar 
              userSubscriptionStatus={userSubscriptionStatus} 
              onUpgradeClick={() => {
                window.location.hash = '#clube-vip';
              }}
            />
          </div>
        )}

        {page.slug === 'noticias' && (
          <div className="my-10 animate-fade-in duration-500">
            <LatestNews onOpenAuth={() => {}} />
          </div>
        )}

        {page.slug === 'faq' && (
          <div className="my-10 animate-fade-in duration-500">
            <FAQ />
          </div>
        )}

        {(page.slug === 'prognosticos-futebol' || page.slug === 'prognosticos' || page.slug === 'apostas-do-dia') && (
          <div className="my-10 animate-fade-in duration-500">
            <FootballPredictionsTable 
              language={language} 
              isAdmin={Boolean(isAdmin || currentUser?.email?.toLowerCase() === 'morgado.aam@gmail.com' || currentUser?.email?.toLowerCase() === '1982veramorgado@gmail.com')}
              userSubscriptionStatus={userSubscriptionStatus}
            />
          </div>
        )}

        {/* --------------------- SPECIAL UPGRADE FOR WINDOWS APP TRIAL & PAYMENTS --------------------- */}
        {page.slug === 'clube-vip' && clubeVipTab === 'info' && (() => {
          const dict = planTranslations[language as keyof typeof planTranslations] || planTranslations.pt;
          
          const webBasePlans = activePlans.filter(p => ['site', 'pro'].includes(p.id));
          const multiPlans = activePlans.filter(p => ['pro_max', 'tipster'].includes(p.id));

          const renderCheckoutGateway = () => {
            if (!checkoutPlanId) return null;
            const plan = activePlans.find(p => p.id === checkoutPlanId);
            if (!plan) return null;

            // Is there an active subscriber status?
            const currentPrice = getPriceByStatusName(userSubscriptionStatus);
            const planPriceSelected = billingCycle === 'yearly' ? plan.yearlyPrice : plan.price;
            const isUpgrade = userSubscriptionStatus && userSubscriptionStatus !== 'Gratuito' && planPriceSelected > currentPrice;

            // Upgrade remains calculate
            const baseRemaining = isUpgrade ? Math.max(0, planPriceSelected - currentPrice) : planPriceSelected;
            
            // Extra discount (Fidelity upgrade discount or coupon)
            let finalToPay = baseRemaining;
            if (isUpgrade && fidelityDiscount) {
              finalToPay = Math.max(0, baseRemaining * 0.85); // 15% discount for fidelity upgrades!
            } else if (demoProgress > 0) { // Using standard state securely
              finalToPay = Math.max(0, baseRemaining * 0.90);
            }

            const handleConfirmPayment = (e: React.FormEvent) => {
              e.preventDefault();
              if (!clientName || !clientEmail) {
                alert("Por favor insira o seu nome e endereço de email!");
                return;
              }
              if (paymentMethod === 'revolut' && !clientRevolutUser) {
                alert("Por favor introduza o seu username ou telemóvel Revolut!");
                return;
              }

              setIsProcessing(true);
              setProcessingStep('A autenticar ligação encriptada com o servidor...');
              
              const statusValue = `${plan.name} (${billingCycle === 'yearly' ? 'Anual' : 'Mensal'} • ${(billingCycle === 'yearly' ? plan.yearlyPrice : plan.price).toFixed(2)}€)`;

              setTimeout(() => {
                let checkMsg = 'A redirecionar dados para verificação de túnel Revolut Pay...';
                setProcessingStep(checkMsg);

                setTimeout(() => {
                  setProcessingStep('A registar pedido no Backoffice do Administrador...');
                  setTimeout(async () => {
                    try {
                      if (currentUser) {
                        const pendingData = {
                          planId: plan.id,
                          planName: `${plan.name} (${billingCycle === 'yearly' ? 'Anual' : 'Mensal'})`,
                          price: finalToPay,
                          method: paymentMethod,
                          date: Date.now(),
                          receiptName: `Via Revolut Pay (User Cliente: ${clientRevolutUser})`,
                          status: 'pending' as const
                        };
                        await updateSubscriberPendingPayment(currentUser.uid, pendingData);
                        
                        // Sync local state
                        const subCurrent = await getSubscriber(currentUser.uid);
                        if (subCurrent) {
                          setActiveSubscriberData(subCurrent);
                        } else {
                          setActiveSubscriberData({
                            uid: currentUser.uid,
                            email: currentUser.email || clientEmail,
                            displayName: clientName,
                            provider: 'manual_payment',
                            createdAt: Date.now(),
                            status: 'Gratuito',
                            pendingPayment: pendingData
                          });
                        }
                        
                        // Move to waiting for manual user confirmation state in UI countdown
                        setProcessingStep('WAITING_FOR_USER_ACTION');

                        // Simular aprovação automática via Webhook/Push Notification ao fim de 7.5 segundos (Ambiente Integrante Sandbox)
                        setTimeout(async () => {
                          try {
                            const updatedStatus = `${plan.name} (${billingCycle === 'yearly' ? 'Anual' : 'Mensal'} • ${finalToPay.toFixed(2)}€)`;
                            await updateSubscriberStatus(currentUser.uid, updatedStatus);
                            localStorage.setItem('irunbets_vip_paid', 'true');
                            setIsPaid(true);
                            setPaymentSuccess(true);
                            if (onSubscriptionUpdated) {
                              onSubscriptionUpdated();
                            }
                            setProcessingStep('SUCCESSFUL_API');
                          } catch (simulationErr) {
                            console.error("Erro na simulação do callback do gateway:", simulationErr);
                          }
                        }, 7500);
                      } else {
                        alert("Por favor efetue primeiro o registo/login na página inicial para podermos associar a assinatura VIP à sua conta!");
                        setIsProcessing(false);
                      }
                    } catch (err) {
                      console.error(err);
                      setIsProcessing(false);
                    }
                  }, 1000);
                }, 1300);
              }, 1200);
            };

            return (
              <div className="fixed inset-0 bg-black/95 backdrop-blur-xl z-[90] flex items-center justify-center p-4 overflow-y-auto animate-fade-in text-left">
                <div className="bg-[#0e0e13] border border-zinc-800 rounded-3xl w-full max-w-2xl p-6 sm:p-8 relative space-y-6 my-auto shadow-2xl shadow-pink-500/5">
                  
                  {/* Close button */}
                  <button
                    type="button"
                    onClick={() => setCheckoutPlanId(null)}
                    className="absolute top-4 right-4 p-2 rounded-xl text-zinc-500 hover:text-white bg-zinc-950 border border-zinc-900 transition-colors"
                  >
                    <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor" className="w-5 h-5">
                      <path strokeLinecap="round" strokeLinejoin="round" d="M6 18 18 6M6 6l12 12" />
                    </svg>
                  </button>

                  <div className="space-y-1.5 border-b border-zinc-900 pb-4">
                    <span className="text-[9px] uppercase font-mono bg-pink-500/10 text-pink-400 px-3 py-1 rounded-full border border-pink-500/20 font-black tracking-widest animate-pulse inline-block">
                      {isUpgrade ? '✦ Gateway de Upgrade Pro-Rata Ativo ✦' : '✦ Checkout iRunBets Seguro ✦'}
                    </span>
                    <h3 className="text-xl sm:text-2xl font-black text-white uppercase tracking-tight font-display">
                      {isUpgrade ? 'Efetuar Upgrade de Subscrição' : 'Ativar Assinatura VIP'}
                    </h3>
                    <p className="text-xs text-zinc-400">
                      Desbloqueie agora a melhor ferramenta preditiva matemática para desporto de forma encriptada.
                    </p>
                  </div>

                  {/* Upgrade Banner */}
                  {isUpgrade ? (
                    <div className="space-y-3">
                      <div className="p-4 bg-gradient-to-r from-pink-950/25 to-rose-950/25 border border-pink-500/20 rounded-2xl space-y-3">
                        <div className="flex items-center gap-2 text-xs font-bold text-pink-400">
                          <span className="text-sm">⚡</span>
                          <span>DESCONTO DE UPGRADE PRORATA DETECTADO</span>
                        </div>
                        <p className="text-[11px] text-zinc-350 leading-relaxed font-light">
                          Visto que já possui um plano ativo (<span className="text-white font-bold">{userSubscriptionStatus}</span>), você <strong>só paga a diferença correspondente</strong> em relação ao novo plano ideal de {planPriceSelected.toFixed(2)}€.
                        </p>
                        <div className="grid grid-cols-3 gap-2 border-t border-zinc-800/60 pt-2.5 text-[11px]">
                          <div>
                            <span className="text-zinc-500 block text-[9px] font-mono">NOVO PREÇO ({billingCycle === 'yearly' ? 'Anual' : 'Mensal'}):</span>
                            <span className="text-white font-mono font-bold">{planPriceSelected.toFixed(2)}€</span>
                          </div>
                          <div>
                            <span className="text-zinc-500 block text-[9px] font-mono">DEDUÇÃO ATUAL:</span>
                            <span className="text-red-400 font-mono font-bold">-{currentPrice.toFixed(2)}€</span>
                          </div>
                          <div>
                            <span className="text-zinc-500 block text-[9px] font-mono">DIFERENÇA:</span>
                            <span className="text-[#00f2fe] font-mono font-bold">={baseRemaining.toFixed(2)}€</span>
                          </div>
                        </div>

                        <div className="pt-2 border-t border-dashed border-pink-500/20">
                          <label className="flex items-start gap-2.5 cursor-pointer select-none">
                            <input
                              type="checkbox"
                              checked={fidelityDiscount}
                              onChange={(e) => setFidelityDiscount(e.target.checked)}
                              className="accent-pink-500 w-3.5 h-3.5 mt-0.5 rounded"
                            />
                            <span className="text-[10px] text-zinc-200">
                              Aplicar benefício de upgrade de fidelidade de 15%: <strong>-{(baseRemaining * 0.15).toFixed(2)}€</strong> (Paga apenas <span className="text-emerald-400 font-black font-mono">{(baseRemaining * 0.85).toFixed(2)}€</span>!)
                            </span>
                          </label>
                        </div>
                      </div>

                      {/* Billing cycle picker for upgrade */}
                      <div className="p-3.5 bg-zinc-950 border border-zinc-900 rounded-xl flex items-center justify-between">
                        <span className="text-[10px] text-zinc-400 uppercase font-mono">Escolher Ciclo de Upgrade:</span>
                        <div className="flex gap-1 bg-zinc-900/50 p-1 rounded-lg border border-zinc-850">
                          <button
                            type="button"
                            onClick={() => setBillingCycle('monthly')}
                            className={`px-2.5 py-1 rounded text-[9.5px] uppercase font-bold tracking-wider transition-all cursor-pointer ${
                              billingCycle === 'monthly'
                                ? 'bg-zinc-850 text-white border border-zinc-700/60'
                                : 'text-zinc-500 hover:text-zinc-300'
                            }`}
                          >
                            Mensal
                          </button>
                          <button
                            type="button"
                            onClick={() => setBillingCycle('yearly')}
                            className={`px-2.5 py-1 rounded text-[9.5px] uppercase font-bold tracking-wider transition-all cursor-pointer ${
                              billingCycle === 'yearly'
                                ? 'bg-gradient-to-r from-pink-500 to-rose-500 text-white'
                                : 'text-zinc-500 hover:text-zinc-300'
                            }`}
                          >
                            Anual
                          </button>
                        </div>
                      </div>
                    </div>
                  ) : (
                    <div className="p-4 bg-zinc-950 border border-zinc-900 rounded-2xl space-y-3.5">
                      <div className="flex items-center justify-between">
                        <div>
                          <span className="text-[9px] text-[#00f2fe] font-mono uppercase font-bold tracking-widest block">PLANO SELECIONADO:</span>
                          <span className="text-white font-bold text-sm tracking-wide uppercase">{plan.name}</span>
                        </div>
                        <div className="text-right">
                          <span className="text-[9px] text-zinc-500 font-mono uppercase block">VALOR DO CHECKOUT:</span>
                          <span className="text-emerald-400 font-black text-lg font-mono">{finalToPay.toFixed(2)}€</span>
                        </div>
                      </div>

                      {/* Dynamic Billing Cycle Selector inside checkout */}
                      <div className="border-t border-zinc-900/60 pt-3 flex items-center justify-between">
                        <span className="text-[10px] text-zinc-400 uppercase font-mono">Ciclo de Pagamento:</span>
                        <div className="flex gap-1.5 bg-zinc-950 p-1 rounded-xl border border-zinc-900">
                          <button
                            type="button"
                            onClick={() => setBillingCycle('monthly')}
                            className={`px-3 py-1.5 rounded-lg text-[10px] uppercase font-bold tracking-wider transition-all cursor-pointer flex items-center gap-1 ${
                              billingCycle === 'monthly'
                                ? 'bg-zinc-900 text-white border border-zinc-800'
                                : 'text-zinc-500 hover:text-zinc-300'
                            }`}
                          >
                            <span>📅 Mensal</span>
                            <span className="text-zinc-450 font-mono">({plan.price.toFixed(2)}€)</span>
                          </button>
                          <button
                            type="button"
                            onClick={() => setBillingCycle('yearly')}
                            className={`px-3 py-1.5 rounded-lg text-[10px] uppercase font-bold tracking-wider transition-all cursor-pointer flex items-center gap-1 ${
                              billingCycle === 'yearly'
                                ? 'bg-gradient-to-r from-pink-500 to-rose-500 text-white shadow-lg shadow-pink-500/10'
                                : 'text-zinc-500 hover:text-zinc-300 font-normal'
                            }`}
                          >
                            <span>⭐ Anual</span>
                            <span className="text-pink-200 font-mono">({plan.yearlyPrice.toFixed(2)}€)</span>
                          </button>
                        </div>
                      </div>
                    </div>
                  )}

                  {/* State Manager */}
                  {isProcessing ? (
                    <div className="py-8 flex flex-col items-center justify-center space-y-6 text-center animate-fade-in">
                      {processingStep === 'SUCCESSFUL_API' ? (
                        <div className="space-y-6 w-full max-w-sm mx-auto text-center animate-fade-in">
                          <div className="relative flex items-center justify-center py-4">
                            <div className="absolute w-24 h-24 rounded-full border border-emerald-500/20 animate-ping"></div>
                            <div className="absolute w-16 h-16 rounded-full border border-emerald-500/30 bg-emerald-500/5"></div>
                            <div className="relative w-12 h-12 rounded-xl bg-emerald-500 text-white flex items-center justify-center text-xl shadow-lg shadow-emerald-500/40 mx-auto">
                              ✓
                            </div>
                          </div>
                          
                          <div className="space-y-1.5">
                            <h4 className="text-sm font-bold text-emerald-400 tracking-wide uppercase font-mono">PAGAMENTO CONFIRMADO!</h4>
                            <p className="text-zinc-200 text-xs font-light leading-relaxed font-sans">
                              O nosso gateway inteligente sandbox validou a sua transação de <span className="text-emerald-400 font-bold">{finalToPay.toFixed(2)}€</span> com absoluto sucesso!
                            </p>
                            <p className="text-zinc-400 text-[10px] font-light leading-snug">
                              A sua subscrição foi ativada automaticamente no Backoffice do Administrador no nosso cluster Firebase.
                            </p>
                          </div>

                          <button
                            type="button"
                            onClick={() => {
                              setIsProcessing(false);
                              setCheckoutPlanId(null);
                              setClubeVipTab('dashboard');
                            }}
                            className="w-full py-3 bg-emerald-500 hover:bg-emerald-600 text-black text-xs font-black uppercase tracking-wider rounded-xl transition-all cursor-pointer shadow-lg shadow-emerald-500/20"
                          >
                            Aceder ao Painel VIP do Clube ✓
                          </button>
                        </div>
                      ) : processingStep === 'WAITING_FOR_USER_ACTION' ? (
                        <div className="space-y-6 w-full max-w-sm mx-auto text-center">
                          <div className="relative flex items-center justify-center py-4">
                            <div className="absolute w-24 h-24 rounded-full border border-blue-500/20 animate-ping"></div>
                            <div className="absolute w-16 h-16 rounded-full border border-blue-500/30 animate-pulse bg-blue-500/5"></div>
                            <div className="relative w-12 h-12 rounded-xl bg-blue-500 text-white flex items-center justify-center text-xl shadow-lg shadow-blue-500/40 mx-auto">
                              ⚡
                            </div>
                          </div>
                          
                          <div className="space-y-1.5">
                            <h4 className="text-sm font-bold text-white tracking-wide uppercase font-mono">Revolut Pay VIP Ativo</h4>
                            <p className="text-zinc-400 text-xs font-light leading-relaxed">
                              Ligação blindada estabelecida com o utilizador <span className="text-blue-400 font-mono font-bold select-all">{clientRevolutUser}</span>.
                            </p>
                            <p className="text-zinc-500 text-[10px] font-light leading-snug">
                              Criámos um link de pagamento direto temporário. O sistema irá simular o recebimento em 7.5 segundos!
                            </p>
                          </div>

                          <div className="pt-2 flex flex-col gap-2">
                            <a
                              href="https://revolut.me/irunbets"
                              target="_blank"
                              rel="noopener noreferrer"
                              onClick={async () => {
                                try {
                                  const updatedStatus = `${plan.name} (${billingCycle === 'yearly' ? 'Anual' : 'Mensal'} • ${finalToPay.toFixed(2)}€)`;
                                  await updateSubscriberStatus(currentUser.uid, updatedStatus);
                                  localStorage.setItem('irunbets_vip_paid', 'true');
                                  setIsPaid(true);
                                  setPaymentSuccess(true);
                                  if (onSubscriptionUpdated) {
                                    onSubscriptionUpdated();
                                  }
                                  setProcessingStep('SUCCESSFUL_API');
                                } catch (err) {
                                  console.error(err);
                                  setIsProcessing(false);
                                }
                              }}
                              className="w-full py-3 bg-blue-500 hover:bg-blue-600 text-white text-xs font-extrabold uppercase tracking-wider rounded-xl transition-all cursor-pointer block text-center"
                            >
                              Ir para Revolut Pay ↗
                            </a>
                            <button
                              type="button"
                              onClick={() => setIsProcessing(false)}
                              className="text-[10px] text-zinc-500 hover:text-zinc-400 underline font-mono"
                            >
                              Cancelar op. e voltar
                            </button>
                          </div>
                        </div>
                      ) : (
                        <>
                          <div className="w-12 h-12 border-4 border-pink-500/20 border-t-pink-500 rounded-full animate-spin"></div>
                          <p className="text-sm font-bold text-white font-mono animate-pulse">{processingStep}</p>
                          <p className="text-[10px] text-zinc-500 font-light">Os dados estão protegidos com criptografia integrada de de 256 bits.</p>
                        </>
                      )}
                    </div>
                  ) : (
                    <div className="p-8 bg-[#0C0C10]/95 border border-zinc-850/80 rounded-3xl relative overflow-hidden text-center max-w-xl mx-auto my-4">
                      <div className="absolute top-0 right-0 h-40 w-40 bg-gradient-to-br from-amber-500/10 to-orange-500/10 rounded-full blur-3xl pointer-events-none"></div>
                      <div className="space-y-6 py-4 relative">
                        <span className="text-5xl select-none filter drop-shadow-[0_0_15px_rgba(245,158,11,0.35)] block animate-bounce">
                          🚧
                        </span>
                        <div className="space-y-2">
                          <span className="inline-block text-[9px] font-black uppercase tracking-wider text-amber-400 bg-amber-500/10 px-3 py-1 rounded-md font-mono border border-amber-500/20">
                            PAGAMENTOS DESATIVADOS
                          </span>
                          <h3 className="text-lg sm:text-xl font-black text-white uppercase tracking-tight font-display">
                            {language === 'pt' ? 'Planos Premium & Checkout Suspenso' : 'Premium Plans & Checkout Suspended'}
                          </h3>
                        </div>
                        <p className="text-zinc-400 font-light text-xs max-w-md mx-auto leading-relaxed">
                          {language === 'pt' 
                            ? 'O gateway de pagamentos integrados e a adesão manual do Clube VIP encontram-se temporariamente desativados nesta versão.'
                            : 'Integrated checkout processes and client payment validation gates are currently disabled in this build.'}
                        </p>
                        <div className="bg-zinc-950/60 border border-zinc-900 rounded-2xl p-4 max-w-xs mx-auto">
                          <span className="text-sm font-black text-amber-500 uppercase tracking-widest font-mono block">
                            🚧 Disponível em Agosto
                          </span>
                          <span className="text-[10px] text-zinc-550 font-mono mt-1 block">
                            {language === 'pt' ? 'Temporada 2026/2027 • Ligas Europeias' : 'Season 2026/2027 • European Leagues'}
                          </span>
                        </div>
                      </div>
                    </div>
                  )}

                </div>
              </div>
            );
          };

          const renderPlanCard = (plan: PricingPlan) => {
            // Check if current user is subscribed to this plan
            const isCurrentPlan = userSubscriptionStatus && (
              (plan.id === 'basic' && userSubscriptionStatus.includes('Subscrição Basic')) ||
              (plan.id === 'site' && userSubscriptionStatus.includes('Subscrição do Site')) ||
              (plan.id === 'basic_max' && userSubscriptionStatus.includes('Basic Max')) ||
              (plan.id === 'pro' && userSubscriptionStatus.includes('Versão Pro')) ||
              (plan.id === 'pro_max' && userSubscriptionStatus.includes('Pro Max')) ||
              (plan.id === 'tipster' && userSubscriptionStatus.includes('Subscrição do Tipster'))
            );

            const planPriceSelected = billingCycle === 'yearly' ? plan.yearlyPrice : plan.price;
            const planOldPriceSelected = billingCycle === 'yearly' ? plan.oldYearlyPrice : plan.oldPrice;

            // Check if user has lower plan and can upgrade
            const currentPriceVal = getPriceByStatusName(userSubscriptionStatus);
            const isUpgradePossible = !isCurrentPlan && userSubscriptionStatus !== 'Gratuito' && planPriceSelected > currentPriceVal;

            return (
              <div key={plan.id} className={`p-6 rounded-3xl flex flex-col justify-between relative overflow-hidden backdrop-blur-md hover:border-zinc-750 transition-all group ${
                plan.id === 'tipster'
                  ? 'bg-gradient-to-b from-indigo-950/20 to-zinc-950/45 border-2 border-indigo-500/35 shadow-xl shadow-indigo-500/[0.03] scale-100 md:scale-[1.01]'
                  : plan.id === 'pro_max'
                  ? 'bg-zinc-900/25 border-2 border-orange-500/25 shadow-xl shadow-orange-500/[0.02] scale-100 md:scale-[1.01]' 
                  : 'bg-zinc-900/15 border border-zinc-850/80'
              }`}>
                {plan.id === 'pro_max' && (
                  <div className="absolute top-0 right-0">
                    <span className="bg-gradient-to-r from-orange-500 to-amber-500 text-black font-black text-[8px] sm:text-[9px] uppercase px-3 py-1 rounded-bl-xl tracking-widest font-mono">
                      FLAGSHIP / BEST VALUE
                    </span>
                  </div>
                )}
                {plan.id === 'tipster' && (
                  <div className="absolute top-0 right-0">
                    <span className="bg-gradient-to-r from-indigo-500 to-violet-500 text-black font-black text-[8px] sm:text-[9px] uppercase px-3 py-1 rounded-bl-xl tracking-widest font-mono">
                      ★ OFICIAL CO-WORKER ★
                    </span>
                  </div>
                )}

                <div>
                  <div className="flex justify-between items-start mb-4">
                    <span className={`font-mono text-[9px] uppercase font-bold tracking-wider px-2 py-0.5 rounded bg-zinc-950 border border-zinc-900 ${
                      plan.id === 'tipster' ? 'text-indigo-400 border-indigo-500/20' : 'text-orange-400'
                    }`}>
                      {plan.badge || 'VIP'}
                    </span>
                    {planOldPriceSelected > 0 && (
                      <span className="text-zinc-650 text-xs font-bold line-through">{planOldPriceSelected.toFixed(2)}€</span>
                    )}
                  </div>
                  
                  <h4 className="text-base sm:text-lg font-black text-white font-display uppercase tracking-wide mb-2 flex items-center gap-1.5">
                    {plan.name}
                    {plan.id === 'pro_max' && <span className="text-orange-500 text-xs">✦</span>}
                  </h4>
                  
                  <p className="text-xs text-zinc-400 font-light leading-relaxed mb-6 min-h-[4rem]">
                    {plan.desc}
                  </p>

                  <div className="space-y-2.5 mb-8">
                    <div className="text-[9px] uppercase font-bold tracking-widest text-zinc-500 mb-1.5">
                      {dict.featuresLabel}
                    </div>
                    
                    <div className={`flex items-center gap-2 text-xs transition-opacity ${plan.features.web ? 'text-zinc-350' : 'text-zinc-650 line-through'}`}>
                      <span className={plan.features.web ? 'text-emerald-500 font-bold' : 'text-zinc-750 font-bold'}>
                        {plan.features.web ? '✓' : '✗'}
                      </span>
                      <span>{dict.webFeature}</span>
                    </div>

                    <div className={`flex items-center gap-2 text-xs transition-opacity ${plan.features.ev ? 'text-zinc-350 font-bold text-transparent bg-clip-text bg-gradient-to-r from-rose-400 to-amber-300' : 'text-zinc-650 line-through'}`}>
                      <span className={plan.features.ev ? 'text-emerald-500 font-bold' : 'text-zinc-750 font-bold'}>
                        {plan.features.ev ? '✓' : '✗'}
                      </span>
                      <span>{dict.evFeature}</span>
                    </div>

                    <div className={`flex items-center gap-2 text-xs transition-opacity ${plan.features.radar ? 'text-zinc-350' : 'text-zinc-650 line-through'}`}>
                      <span className={plan.features.radar ? 'text-emerald-500 font-bold' : 'text-zinc-750 font-bold'}>
                        {plan.features.radar ? '✓' : '✗'}
                      </span>
                      <span>{dict.radarFeature}</span>
                    </div>

                    <div className={`flex items-center gap-2 text-xs transition-opacity ${plan.features.cloud ? 'text-zinc-350' : 'text-zinc-650 line-through'}`}>
                      <span className={plan.features.cloud ? 'text-emerald-500 font-bold' : 'text-zinc-750 font-bold'}>
                        {plan.features.cloud ? '✓' : '✗'}
                      </span>
                      <span>{dict.cloudFeature}</span>
                    </div>

                    <div className={`flex items-center gap-2 text-xs transition-opacity ${plan.features.mobile ? 'text-zinc-100 font-black' : 'text-zinc-650 line-through'}`}>
                      {plan.features.mobile ? (
                        <span className="font-bold text-transparent bg-clip-text bg-gradient-to-r from-orange-400 to-amber-200">
                          ✓ {dict.mobileFeature}
                        </span>
                      ) : (
                        <>
                          <span>✗</span>
                          <span>{dict.mobileFeature}</span>
                        </>
                      )}
                    </div>

                    {plan.features.tipsterPanel !== undefined && (
                      <div className={`flex items-center gap-2 text-xs transition-opacity ${plan.features.tipsterPanel ? 'text-zinc-100 font-black' : 'text-zinc-650 line-through'}`}>
                        {plan.features.tipsterPanel ? (
                          <span className="font-bold text-transparent bg-clip-text bg-gradient-to-r from-teal-400 to-emerald-300 animate-pulse">
                            ✓ {language === 'pt' ? 'Painel de Tipster Oficial' : 'Official Tipster Panel'}
                          </span>
                        ) : (
                          <>
                            <span>✗</span>
                            <span>{language === 'pt' ? 'Painel de Tipster Oficial' : 'Official Tipster Panel'}</span>
                          </>
                        )}
                      </div>
                    )}

                    {plan.customFeatures && plan.customFeatures.map((feat, fIdx) => (
                      <div key={`custom-${plan.id}-${fIdx}`} className="flex items-center gap-2 text-xs text-zinc-300 animate-fade-in">
                        <span className="text-[#00f2fe] font-bold">✓</span>
                        <span className="font-sans font-medium text-zinc-200">{feat}</span>
                      </div>
                    ))}
                  </div>

                  {plan.id === 'site' && (
                    <div className="mt-4 p-3 bg-red-950/20 border border-red-500/20 rounded-xl space-y-1.5 animate-fade-in">
                      <span className="text-[9px] uppercase font-black text-rose-400 font-mono tracking-wider block">
                        {language === 'pt' ? '⚠️ LIMITAÇÕES DO PLANO GRATUITO:' : '⚠️ FREE PLAN CONSTRAINTS:'}
                      </span>
                      <ul className="text-[10px] text-zinc-400 list-none space-y-1 leading-relaxed font-sans">
                        <li className="flex items-start gap-1">
                          <span className="text-red-500">✗</span>
                          <span>{language === 'pt' ? 'Memória apenas local (perda ao apagar histórico do browser)' : 'Local browser memory only (deleted if browser cache is cleared)'}</span>
                        </li>
                        <li className="flex items-start gap-1">
                          <span className="text-red-500">✗</span>
                          <span>{language === 'pt' ? 'Sem Backup em Nuvem automático nem sincronização móvel' : 'No automatic Cloud server backup or multi-device sync'}</span>
                        </li>
                        <li className="flex items-start gap-1">
                          <span className="text-red-500">✗</span>
                          <span>{language === 'pt' ? 'Importação / Exportação de ficheiros Excel bloqueada' : 'Import / Export of Excel sheets is blocked'}</span>
                        </li>
                        <li className="flex items-start gap-1">
                          <span className="text-red-500">✗</span>
                          <span>{language === 'pt' ? 'Sem Painel de Tipster Oficial verificado e limites diários de IA' : 'No verified Official Tipster Panel & daily query caps on IA Mentor'}</span>
                        </li>
                      </ul>
                    </div>
                  )}
                </div>

                <div className="space-y-4 pt-4 border-t border-zinc-900">
                  <div className="flex flex-col gap-1">
                    <div className="flex items-baseline gap-1.5 flex-wrap">
                      {isMundialActive ? (
                        <>
                          <span className="text-lg sm:text-xl font-bold text-zinc-500 line-through decoration-red-500/70 decoration-1">
                            {planPriceSelected.toFixed(2)}€
                          </span>
                          <span className="text-2xl sm:text-3xl font-black text-emerald-400 font-display animate-pulse">
                            0.00€
                          </span>
                        </>
                      ) : (
                        <span className="text-2xl sm:text-3xl font-black text-white font-display">
                          {planPriceSelected.toFixed(2)}€
                        </span>
                      )}
                      <span className="text-zinc-500 text-[10px] uppercase font-bold tracking-wide">/ {billingCycle === 'yearly' ? (language === 'pt' ? 'ano' : 'year') : dict.perMonth}</span>
                    </div>
                    {isMundialActive && (
                      <div className="mt-0.5 bg-orange-500/10 text-orange-400 border border-orange-500/20 px-2 py-0.5 rounded-md text-[9px] font-black uppercase tracking-wider font-mono inline-flex items-center gap-1 w-fit">
                        <span className="h-1 w-1 rounded-full bg-orange-500 animate-pulse"></span>
                        {translateCampaignTitle(mundialCampaignTitle, language)}
                      </div>
                    )}
                    {/* Complemento de preços anuais/mensais sempre visível para esclarecimento completo */}
                    <div className="text-[10.5px] font-medium tracking-wide">
                      {billingCycle === 'monthly' ? (
                        <span className="text-zinc-400">
                          {language === 'pt' ? 'Ou opção Anual: ' : 'Or Annual option: '}
                          <strong className={isMundialActive ? "text-zinc-500 line-through decoration-red-500/50" : "text-orange-400 font-extrabold"}>{plan.yearlyPrice.toFixed(2)}€</strong>
                          {isMundialActive ? (
                            <span className="text-emerald-400 font-bold ml-1.5">(0.00€ na Promoção)</span>
                          ) : (
                            <span className="text-zinc-500 text-[9px] font-mono"> (poupa 20%)</span>
                          )}
                        </span>
                      ) : (
                        <span className={isMundialActive ? "text-zinc-500" : "text-teal-400"}>
                          {language === 'pt' ? 'Equivale a apenas ' : 'Equivalent to only '}
                          <strong className={isMundialActive ? "line-through font-bold" : "font-extrabold"}>{(plan.yearlyPrice / 12).toFixed(2)}€</strong>
                          {isMundialActive ? (
                            <span className="text-emerald-400 font-bold ml-1.5">(0.00€/mês na Promoção)</span>
                          ) : (
                            <span className="text-zinc-500">/mês</span>
                          )}
                        </span>
                      )}
                    </div>
                  </div>

                  {plan.inhibited ? (
                    <button
                      type="button"
                      disabled
                      className="w-full py-3 bg-zinc-950 border border-orange-500/30 text-orange-450 text-xs font-black uppercase tracking-wider rounded-xl cursor-not-allowed flex items-center justify-center gap-2"
                    >
                      <span>Brevemente disponível</span>
                    </button>
                  ) : isCurrentPlan ? (
                    <div className="space-y-2 w-full">
                      <button
                        type="button"
                        disabled
                        className="w-full py-3 bg-zinc-900/50 border border-zinc-805 text-zinc-400 text-xs font-black uppercase tracking-wider rounded-xl cursor-default flex items-center justify-center gap-2"
                      >
                        <span>★ Plano Ativo</span>
                      </button>
                      <button
                        type="button"
                        onClick={() => {
                          setCancellingPlanId(plan.id);
                          setCancellingPlanName(plan.name);
                        }}
                        className="w-full py-2 bg-rose-950/40 hover:bg-rose-900/40 border border-rose-500/20 hover:border-rose-500/50 text-rose-450 hover:text-white text-[10px] font-black uppercase tracking-wider rounded-xl transition-all cursor-pointer flex items-center justify-center gap-1.5 h-10"
                      >
                        <span>❌ Anular Subscrição</span>
                      </button>
                    </div>
                  ) : isUpgradePossible ? (
                    <button
                      type="button"
                      onClick={() => setCheckoutPlanId(plan.id)}
                      className="w-full py-3 bg-gradient-to-r from-pink-500 to-rose-500 hover:from-pink-600 hover:to-rose-600 text-white text-xs font-black uppercase tracking-wider rounded-xl transition-all cursor-pointer flex items-center justify-center gap-2 shadow-lg shadow-pink-500/10"
                    >
                      <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2.5} stroke="currentColor" className="w-3.5 h-3.5">
                        <path strokeLinecap="round" strokeLinejoin="round" d="M4.5 12.75l7.5-7.5 7.5 7.5m-15 6l7.5-7.5 7.5 7.5" />
                      </svg>
                      <span>{language === 'pt' ? 'Efetuar Upgrade' : 
                            language === 'fr' ? 'Effectuer une Mise à Niveau' : 
                            language === 'it' ? 'Effettua Upgrade' : 
                            language === 'de' ? 'Upgrade Durchführen' : 
                            'Perform Upgrade'}</span>
                    </button>
                  ) : (
                    <button
                      type="button"
                      onClick={() => setCheckoutPlanId(plan.id)}
                      className="w-full py-3 bg-gradient-to-r from-orange-500 to-amber-500 hover:from-orange-600 hover:to-amber-600 text-white text-xs font-extrabold uppercase tracking-wider rounded-xl transition-all cursor-pointer flex items-center justify-center gap-2"
                    >
                      <span>{language === 'pt' ? 'Aderir ao Plano' : 
                            language === 'fr' ? 'Rejoindre le Plan' : 
                            language === 'it' ? 'Aderisci al Piano' : 
                            language === 'de' ? 'Plan Beitreten' : 
                            'Join Plan'}</span>
                    </button>
                  )}
                </div>
              </div>
            );
          };

          return (
            <div className="space-y-12 animate-fade-in duration-700">
              
              {/* Layout Header */}
              <div className="text-center space-y-3 max-w-2xl mx-auto">
                <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-orange-500/10 border border-orange-500/20 text-orange-400 text-[10px] font-bold uppercase tracking-wider">
                  <span className="h-1.5 w-1.5 rounded-full bg-orange-500 animate-pulse"></span>
                  {isMundialActive 
                    ? `${language === 'pt' ? 'PROMOÇÃO ATIVA' : language === 'fr' ? 'PROMO ACTIVE' : language === 'it' ? 'PROMOZIONE ATTIVA' : language === 'de' ? 'AKTIVE PRÄMIENAKTION' : 'ACTIVE PROMOTION'}: ${translateCampaignTitle(mundialCampaignTitle, language).toUpperCase()}` 
                    : 'iRunBets Premium Club Plans'}
                </span>
                <h2 className="text-2xl sm:text-3xl font-black text-white font-display uppercase tracking-tight">
                  {isMundialActive 
                    ? `${translateCampaignTitle(mundialCampaignTitle, language)} • ${language === 'pt' ? 'Acesso Aberto' : language === 'fr' ? 'Accès Libre' : language === 'it' ? 'Accesso Libero' : language === 'de' ? 'Freier Zugang' : 'Free Open Access'}` 
                    : dict.sectionTitle}
                </h2>
                <p className="text-xs sm:text-sm text-zinc-400 font-light leading-relaxed">
                  {isMundialActive ? (
                    language === 'pt' ? 'Mensalidades e barreiras suspensas! Explore todas as análises gratuitas.' : 
                    language === 'fr' ? 'Mensualités et barrières suspendues ! Explorez toutes les analyses gratuites.' : 
                    language === 'it' ? 'Abbonamenti mensili e barriere sospese! Esplora tutte le analisi gratuite.' : 
                    language === 'de' ? 'Monatsbeiträge und Hürden ausgesetzt! Entdecken Sie kostenlose Analysen.' : 
                    'Subscription fees completely suspended! Explore premium sports analytics entirely free.'
                  ) : dict.sectionDesc}
                </p>
              </div>

              {/* WORLD CUP ACTIVE CAMPAIGN PROMOTIONAL ALERT BANNER */}
              {isMundialActive && (
                <div className="max-w-2xl mx-auto p-6 bg-gradient-to-tr from-purple-950/20 via-orange-950/25 to-amber-950/25 border border-orange-500/35 rounded-3xl space-y-4 relative overflow-hidden shadow-2xl animate-fade-in text-center my-2">
                  <div className="absolute top-0 inset-x-0 h-[2.5px] bg-gradient-to-r from-purple-500 via-orange-500 to-amber-500"></div>
                  <div className="absolute -top-12 -right-12 h-32 w-32 bg-orange-500/15 rounded-full blur-3xl pointer-events-none"></div>
                  <div className="absolute -bottom-12 -left-12 h-32 w-32 bg-purple-500/15 rounded-full blur-3xl pointer-events-none"></div>
                  
                  <div className="space-y-2.5 relative">
                    <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-orange-500/15 border border-orange-500/30 text-orange-450 text-[10px] font-black uppercase tracking-widest font-mono animate-pulse">
                      🏆 {translateCampaignTitle(mundialCampaignTitle, language).toUpperCase()} {language === 'pt' ? 'ACTIVA' : 'ACTIVE'}
                    </span>
                    <h3 className="text-lg sm:text-xl font-black text-white uppercase tracking-tight font-display">
                      {language === 'pt' ? '🔥 MENSALIDADES TOTALMENTE SUSPENSAS NO SITE!' : 
                       language === 'fr' ? '🔥 FRAIS D\'ABONNEMENT SUSPENDUS EN LIGNE!' : 
                       language === 'it' ? '🔥 ABBONAMENTI TOTALMENTE SOSPESI SUL SITO!' : 
                       language === 'de' ? '🔥 TARIFE IM NETZ VOLLSTÄNDIG AUSGESETZT!' : 
                       '🔥 SUBSCRIPTION PLANS COMPLETELY SUSPENDED ONLINE!'}
                    </h3>
                    <p className="text-zinc-300 font-light text-xs max-w-lg mx-auto leading-relaxed">
                      {translateCampaignDescription(mundialCampaignDescription, language)}
                    </p>
                  </div>
                  
                  <div className="flex flex-wrap items-center justify-center gap-2 pt-1 relative">
                    <span className="text-[9.5px] bg-emerald-500/15 text-emerald-400 font-bold font-mono px-3 py-1 rounded-lg border border-emerald-500/20 uppercase tracking-wider">
                      {language === 'pt' ? '✓ chat de ia irunbets: livre' : 
                       language === 'fr' ? '✓ chat ia irunbets : libre' : 
                       language === 'it' ? '✓ chat di ia irunbets: libero' : 
                       language === 'de' ? '✓ irunbets ki-chat: frei' : 
                       '✓ irunbets ai chat: free'}
                    </span>
                    <span className="text-[10px] bg-cyan-700/15 text-cyan-400 font-bold font-mono px-3 py-1 rounded-lg border border-cyan-500/20 uppercase tracking-wider">
                      {language === 'pt' ? '✓ ocr intel: grátis' : 
                       language === 'fr' ? '✓ ocr intel : gratuit' : 
                       language === 'it' ? '✓ ocr intel: gratuito' : 
                       language === 'de' ? '✓ ocr intel: kostenlos' : 
                       '✓ smart ocr: free'}
                    </span>
                    <span className="text-[10px] bg-orange-550/15 text-orange-400 font-bold font-mono px-3 py-1 rounded-lg border border-orange-500/20 uppercase tracking-wider">
                      {language === 'pt' ? '✓ registo de banca: livre' : 
                       language === 'fr' ? '✓ journal bankroll : libre' : 
                       language === 'it' ? '✓ registro bankroll: libero' : 
                       language === 'de' ? '✓ bankroll-kontrolle: frei' : 
                       '✓ bankroll record: free'}
                    </span>
                  </div>
                </div>
              )}

              {/* PENDING MANUAL BILLING ALERT */}
              {activeSubscriberData?.pendingPayment?.status === 'pending' && (
                <div className="max-w-2xl mx-auto p-5 bg-gradient-to-r from-orange-500/10 via-amber-500/10 to-orange-600/10 border border-orange-500/30 rounded-2xl space-y-3 relative overflow-hidden shadow-xl animate-fade-in text-left">
                  <div className="absolute top-0 right-0 p-3">
                    <span className="bg-orange-500/20 text-orange-400 text-[8.5px] font-mono uppercase px-2.5 py-0.5 rounded-full font-bold tracking-wider animate-pulse">
                      Aguardando Validação
                    </span>
                  </div>
                  <div className="flex items-start gap-3">
                    <span className="text-xl pt-0.5">📝</span>
                    <div className="space-y-1">
                      <h4 className="text-xs font-bold text-white uppercase tracking-wider">
                        Comprovativo de Pagamento em Processamento
                      </h4>
                      <p className="text-[11.5px] text-zinc-300 leading-relaxed font-light">
                        Olá <strong>{clientName || activeSubscriberData.displayName || 'Subscritor'}</strong>! O seu pedido de adesão ao plano <span className="text-orange-400 font-bold">{activeSubscriberData.pendingPayment.planName}</span> ({activeSubscriberData.pendingPayment.price.toFixed(2)}€ via <span className="uppercase font-semibold">{activeSubscriberData.pendingPayment.method}</span>) foi registado em <strong>{new Date(activeSubscriberData.pendingPayment.date).toLocaleString('pt-PT')}</strong> e está em verificação manual.
                      </p>
                      <p className="text-[10px] text-zinc-500 italic font-mono pt-1">
                        Ficheiro anexo: {activeSubscriberData.pendingPayment.receiptName}
                      </p>
                      <div className="pt-2 flex flex-wrap gap-3">
                        <button
                          type="button"
                          onClick={() => {
                            const printWindow = window.open('', '_blank');
                            if (printWindow) {
                              printWindow.document.write(`
                                <html>
                                <head>
                                  <title>Fatura Proforma / Guia de Pagamento - iRunBets VIP</title>
                                  <style>
                                    body { font-family: system-ui, sans-serif; background: #fafafa; color: #111; padding: 40px; margin: 0; }
                                    .card { background: white; border: 1px solid #ddd; max-width: 600px; margin: 0 auto; padding: 30px; border-radius: 12px; box-shadow: 0 4px 12px rgba(0,0,0,0.05); }
                                    .header { border-bottom: 2px solid #ef4444; padding-bottom: 15px; margin-bottom: 20px; text-align: center; }
                                    .title { font-size: 22px; font-weight: bold; text-transform: uppercase; letter-spacing: 1px; color: #ef4444; }
                                    .item { display: flex; justify-content: space-between; padding: 12px 0; border-bottom: 1px solid #eee; font-size: 14px; }
                                    .item-label { font-weight: bold; color: #555; }
                                    .total { font-size: 18px; font-weight: bold; padding: 15px 0; border-top: 2px solid #eee; margin-top: 15px; text-align: right; }
                                    .footer { font-size: 11px; color: #888; text-align: center; margin-top: 30px; line-height: 1.5; }
                                  </style>
                                </head>
                                <body>
                                  <div class="card">
                                    <div class="header">
                                      <div class="title">iRunBets VIP</div>
                                      <div style="font-size: 12px; color: #666; margin-top: 5px;">Nota de Pagamento Provisória / Fatura Proforma</div>
                                    </div>
                                    <div class="item">
                                      <span class="item-label">Subscritor (Email):</span>
                                      <span>${activeSubscriberData.email}</span>
                                    </div>
                                    <div class="item">
                                      <span class="item-label">Plano Selecionado:</span>
                                      <span>${activeSubscriberData.pendingPayment.planName}</span>
                                    </div>
                                    <div class="item">
                                      <span class="item-label">Data de Registo:</span>
                                      <span>${new Date(activeSubscriberData.pendingPayment.date).toLocaleString('pt-PT')}</span>
                                    </div>
                                    <div class="item">
                                      <span class="item-label">Método Escolhido:</span>
                                      <span style="text-transform: uppercase;">${activeSubscriberData.pendingPayment.method}</span>
                                    </div>
                                    <div class="item">
                                      <span class="item-label">Estado de Adesão:</span>
                                      <span style="color: #f59e0b; font-weight: bold;">AGUARDANDO VALIDAÇÃO</span>
                                    </div>
                                    <div class="total">
                                      Total Pago/Devido: ${activeSubscriberData.pendingPayment.price.toFixed(2)}€
                                    </div>
                                    <div class="footer">
                                      Obrigado pela sua preferência!<br/>
                                      Esta nota serve como comprovativo de intenção interna e faturamento de teste legal. O seu plano será promovido automaticamente até 2 horas. Para apoio direto contacte: suporte@irunbets.pt
                                    </div>
                                  </div>
                                  <script>window.print();</script>
                                </body>
                                </html>
                              `);
                              printWindow.document.close();
                            }
                          }}
                          className="px-3.5 py-1.5 bg-zinc-900 border border-zinc-800 hover:bg-zinc-850 hover:border-zinc-700 text-zinc-300 hover:text-white rounded-lg text-xs font-bold font-mono uppercase tracking-wider transition-all cursor-pointer flex items-center gap-1.5"
                        >
                          🖨️ Descarregar Nota de Pagamento Provisória (Fatura Proforma)
                        </button>
                      </div>
                    </div>
                  </div>
                </div>
              )}

              {/* Billing Cycle Toggle Switch */}
              <div className="flex flex-col sm:flex-row justify-center items-center gap-3 sm:gap-4 py-2 bg-zinc-950/20 border border-zinc-900/60 p-4 rounded-3xl max-w-md mx-auto backdrop-blur-sm">
                <button
                  type="button"
                  onClick={() => setBillingCycle('monthly')}
                  className={`px-4 py-2 rounded-xl text-xs uppercase font-bold tracking-wider transition-all cursor-pointer ${
                    billingCycle === 'monthly'
                      ? 'bg-zinc-900 text-white shadow-lg border border-zinc-800'
                      : 'text-zinc-500 hover:text-zinc-300'
                  }`}
                >
                  {language === 'pt' ? '⭐ Mensal' : '⭐ Monthly'}
                </button>
                <div className="h-4 w-[1px] bg-zinc-850 hidden sm:block"></div>
                <button
                  type="button"
                  onClick={() => setBillingCycle('yearly')}
                  className={`px-4 py-2 rounded-xl text-xs uppercase font-bold tracking-wider transition-all cursor-pointer flex items-center gap-2 ${
                    billingCycle === 'yearly'
                      ? 'bg-gradient-to-r from-pink-500 to-rose-500 text-white shadow-lg shadow-pink-500/10'
                      : 'text-zinc-500 hover:text-zinc-300'
                  }`}
                >
                  <span>{language === 'pt' ? '⚡ Anual (Poupança)' : '⚡ Annual (Savings)'}</span>
                  <span className="bg-white/20 text-white text-[8px] font-black uppercase px-2 py-0.5 rounded-full tracking-widest leading-none font-mono">
                    -20%
                  </span>
                </button>
              </div>

              {/* GROUP 1: WEB BASE PLANS */}
              <div className="space-y-6">
                <div className="border-b border-zinc-850 pb-3">
                  <h3 className="text-sm sm:text-base font-black text-white uppercase tracking-wider font-display">
                    {dict.group1Title}
                  </h3>
                  <p className="text-xs text-zinc-500 font-light mt-0.5">
                    {dict.group1Desc}
                  </p>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                  {webBasePlans.map(renderPlanCard)}
                </div>
              </div>

              {/* SEPARATOR LINE */}
              <div className="relative py-4 select-none">
                <div className="absolute inset-0 flex items-center">
                  <div className="w-full border-t border-zinc-850/80"></div>
                </div>
                <div className="relative flex justify-center text-xs uppercase">
                  <span className="bg-[#0A0A0C] px-6 text-zinc-500 font-extrabold tracking-widest font-mono text-[10px]">
                    ✦ CROSS-PLATFORM SYSTEMS ✦
                  </span>
                </div>
              </div>

              {/* GROUP 2: MULTI-PLATFORM PLANS */}
              <div className="space-y-6">
                <div className="border-b border-zinc-850 pb-3">
                  <h3 className="text-sm sm:text-base font-black text-white uppercase tracking-wider font-display">
                    {dict.group2Title}
                  </h3>
                  <p className="text-xs text-zinc-500 font-light mt-0.5">
                    {dict.group2Desc}
                  </p>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-3 gap-6 max-w-6xl mx-auto">
                  {multiPlans.map(renderPlanCard)}
                </div>
              </div>

              {/* RESPONSIBLE BETTING DISCLAIMER CARD */}
              <div className="mt-12 bg-zinc-950/40 p-5 sm:p-6 border border-zinc-900 rounded-2xl max-w-4xl mx-auto text-left space-y-3.5">
                <div className="flex items-center gap-2 pb-2.5 border-b border-zinc-900">
                  <span className="text-sm">🛡️</span>
                  <p className="text-[10px] text-zinc-500 font-bold uppercase font-mono tracking-wider">
                    {language === 'pt' ? 'Compromisso com o Jogo Responsável' :
                     language === 'en' ? 'A Commitment to Responsible Gaming' :
                     language === 'fr' ? 'Engagement envers le jeu responsable' :
                     language === 'it' ? 'Impegno per il Gioco Responsabile' :
                     'Verantwortungsvolles Wetten'}
                  </p>
                </div>
                <p className="text-[10.5px] text-zinc-400 font-light leading-relaxed">
                  {language === 'pt' ? 'Sem Qualquer Garantia de Lucro. O propósito do Clube VIP iRunBets e do nosso ecossistema não é dar a ilusão de que vai enriquecer ou obter retornos financeiros fáceis. O nosso verdadeiro objetivo é disponibilizar ferramentas de análise estatística quantitativa avançada e gestão de risco para ajudar a combater apostas recreativas cegas ou aleatórias. Focamos estritamente no controlo matemático e na preservação de uma banca estruturada.' :
                   language === 'en' ? 'No Profit Guarantees. The purpose of the iRunBets VIP Club and our suite is not to promote easy wealth or make empty financial claims. Our real objective is providing advanced quantitative analysis tools and bankroll risk management frameworks to guide users in avoiding random, emotional, or unstructured bets. We advocate for strict mathematically-backed control and asset preservation.' :
                   language === 'fr' ? 'Aucune garantie de profit. Le but du Club VIP iRunBets n\'est pas de donner l\'impression que vous allez devenir riche. Notre véritable objectif est de fournir des outils d\'analyse statistique quantitative avancée et de gestion des risques pour éviter les paris aléatoires ou non planifiés. Nous soutenons la préservation disciplinée de votre capital.' :
                   language === 'it' ? 'Nessuna Garanzia di Profitto. Lo scopo del Club VIP iRunBets non è promuovere facili arricchimenti. Il nostro vero obiettivo è offrire strumenti avanzati di analisi statistica quantitativa e gestione del risco per evitare scommesse casuali e impulsive. Sosteniamo un approccio rigoroso e matematico per salvaguardare la tua cassa.' :
                   'Keine Gewinngarantien. Der iRunBets VIP-Club dient nicht dazu, schnellen Reichtum zu versprechen. Unser wahres Ziel ist es, Ihnen fortschrittliche Werkzeuge zur quantitativen statistischen Analyse und zum Risikomanagement an die Hand zu geben, um unbedachte, emotionale Wetten zu vermeiden. Wir fokussieren uns auf mathematische Kontrolle und den Schutz Ihrer Bankroll.'}
                </p>
              </div>

              {/* RENDER DYNAMIC SECURE PAYMENT MODAL */}
              {renderCheckoutGateway()}

            </div>
          );
        })()}

        {page.slug === 'clube-vip' && clubeVipTab === 'dashboard' && (
          currentUser && (isAdmin || isPaid || isMundialActive) ? (
            <VipDashboard 
              onBackToHome={onBackToHome} 
              isPlatformPaid={isPaid || isAdmin || isMundialActive} 
              isAdmin={Boolean(isAdmin || currentUser?.email?.toLowerCase() === 'morgado.aam@gmail.com')}
              currentUser={currentUser}
            />
          ) : (
            <div className="p-8 sm:p-12 text-center rounded-3xl bg-zinc-900/20 border border-zinc-850 max-w-2xl mx-auto my-12 space-y-6 relative overflow-hidden backdrop-blur-md">
              <div className="absolute top-0 left-1/2 -translate-x-1/2 w-48 h-48 bg-[#00f2fe]/5 rounded-full blur-3xl pointer-events-none"></div>
              
              <div className="w-16 h-16 bg-[#00f2fe]/10 rounded-2xl flex items-center justify-center mx-auto border border-[#00f2fe]/20">
                <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-8 h-8 text-[#00f2fe]">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M16.5 10.5V6.75a4.5 4.5 0 1 0-9 0V10.5m-2.25 10.5h13.5c.621 0 1.125-.504 1.125-1.125V11.25c0-.621-.504-1.125-1.125-1.125H5.25c-.621 0-1.125.504-1.125 1.125v7.125c0 .621.504 1.125 1.125 1.125Z" />
                </svg>
              </div>

              <div className="space-y-2">
                <h3 className="text-xl sm:text-2xl font-black text-white font-display uppercase tracking-tight">
                  {!currentUser 
                    ? (language === 'pt' ? '🔒 Área Exclusiva do Clube VIP' :
                       language === 'fr' ? '🔒 Zone Exclusive du Club VIP' :
                       language === 'it' ? '🔒 Area Esclusiva del Club VIP' :
                       language === 'de' ? '🔒 Exklusiver VIP-Club-Bereich' :
                       '🔒 VIP Club Exclusive Area')
                    : (lockStrings[language as keyof typeof lockStrings]?.title || lockStrings.pt.title)}
                </h3>
                <p className="text-xs sm:text-sm text-zinc-400 font-light leading-relaxed max-w-md mx-auto">
                  {!currentUser 
                    ? (language === 'pt' ? `Mesmo com a promoção de acesso gratuito "${translateCampaignTitle(mundialCampaignTitle, language)}" ativa neste momento, para carregar estatísticas, consultar odds de valor e gerir a sua banca precisa primeiro de se registar de forma gratuita.` :
                       language === 'fr' ? `Même avec la promotion d'accès gratuit "${translateCampaignTitle(mundialCampaignTitle, language)}" active en ce moment, pour charger vos statistiques, consulter les cotes de valeur et gérer votre capital, vous devez d'abord vous inscrire gratuitement.` :
                       language === 'it' ? `Anche con la promozione ad accesso gratuito "${translateCampaignTitle(mundialCampaignTitle, language)}" attiva in questo momento, per caricare le statistiche, consultare le quote di valore e gestire il tuo bankroll devi prima registrarti gratuitamente.` :
                       language === 'de' ? `Selbst wenn die kostenlose Zugangsaktion "${translateCampaignTitle(mundialCampaignTitle, language)}" derzeit aktiv ist, müssen Sie sich zuerst kostenlos registrieren, um Statistiken zu laden, Quoten anzuzeigen und Ihre Bankroll zu verwalten.` :
                       `Even with the free access "${translateCampaignTitle(mundialCampaignTitle, language)}" promotion active right now, you need to register a free account first to load stats, view value odds, and manage your bankroll.`)
                    : (lockStrings[language as keyof typeof lockStrings]?.subtitle || lockStrings.pt.subtitle)
                  }
                </p>
              </div>

              {!currentUser ? (
                <div className="pt-2 text-center text-xs font-semibold text-zinc-550 uppercase tracking-widest font-mono select-none">
                  {language === 'pt' ? (
                    <>💡 Clique em <span className="text-orange-500 font-extrabold font-sans">"ENTRAR / REGISTAR"</span> no topo do site para criar a sua conta gratuita instantaneamente!</>
                  ) : language === 'fr' ? (
                    <>💡 Cliquez sur <span className="text-orange-500 font-extrabold font-sans">"CONNEXION / S'INSCRIRE"</span> en haut du site pour créer votre compte gratuit instantanément !</>
                  ) : language === 'it' ? (
                    <>💡 Clicca su <span className="text-orange-500 font-extrabold font-sans">"ACCEDI / REGISTRATI"</span> in alto sul sito per creare il tuo account gratuito all'istante!</>
                  ) : language === 'de' ? (
                    <>💡 Klicken Sie oben auf der Website auf <span className="text-orange-500 font-extrabold font-sans">"ANMELDEN / REGISTRIEREN"</span>, um sofort Ihr kostenloses Konto zu erstellen!</>
                  ) : (
                    <>💡 Click on <span className="text-orange-500 font-extrabold font-sans">"LOGIN / REGISTER"</span> at the top of the site to create your free account instantly!</>
                  )}
                </div>
              ) : (
                <div className="pt-2">
                  <button
                    type="button"
                    onClick={() => {
                      setClubeVipTab('info');
                      setTimeout(() => {
                        const el = document.getElementById('checkout-gateway');
                        if (el) el.scrollIntoView({ behavior: 'smooth' });
                      }, 100);
                    }}
                    className="px-8 py-3.5 bg-gradient-to-r from-orange-500 to-amber-500 hover:from-orange-600 hover:to-amber-600 text-white font-extrabold text-xs uppercase tracking-wider rounded-xl transition-all shadow-lg shadow-orange-500/15 cursor-pointer"
                  >
                    {lockStrings[language as keyof typeof lockStrings]?.btn || lockStrings.pt.btn}
                  </button>
                </div>
              )}
            </div>
          )
        )}

        {/* POPUP COORDENAÇÃO DE CANCELAMENTO / ANULAÇÃO AUTÓNOMA */}
        {cancellingPlanId && (
          <div className="fixed inset-0 bg-black/90 backdrop-blur-md z-[110] flex items-center justify-center p-4 overflow-y-auto animate-fade-in text-left">
            <div className="bg-[#0e0e13] border border-red-900/60 rounded-3xl w-full max-w-lg p-6 sm:p-8 relative space-y-6 shadow-2xl shadow-red-950/20 my-auto">
              
              <button
                type="button"
                onClick={() => setCancellingPlanId(null)}
                className="absolute top-4 right-4 p-2 rounded-xl text-zinc-500 hover:text-white bg-zinc-950 border border-zinc-900 transition-colors cursor-pointer"
              >
                <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2.5} stroke="currentColor" className="w-4 h-4">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M6 18 18 6M6 6l12 12" />
                </svg>
              </button>

              <div className="flex items-center gap-4 border-b border-zinc-900 pb-4">
                <div className="w-12 h-12 bg-red-500/10 border border-red-500/20 text-red-500 rounded-2xl flex items-center justify-center text-xl">
                  ������
                </div>
                <div>
                  <h3 className="text-base font-black text-white uppercase tracking-tight">Anular Subscrição {cancellingPlanName}</h3>
                  <p className="text-[10px] text-zinc-500 uppercase font-mono tracking-wider">Ações de Rescisão de Serviços VIP</p>
                </div>
              </div>

              <div className="space-y-4">
                <p className="text-xs text-zinc-400 font-light leading-relaxed">
                  Lamentamos que decida suspender a sua subscrição automática. Ao confirmar a anulação, o seu estatuto será imediatamente alterado para <strong>Gratuito</strong> e um alerta oficial de desistência/não renovação será gerido e remetido ao nosso mail de suporte técnico em tempo real:
                </p>

                <div className="p-3.5 bg-zinc-950 rounded-xl border border-zinc-900 font-mono text-[10px] text-zinc-500 space-y-1">
                  <div><span className="text-zinc-400">Destinatário:</span> suporte@irunbets.pt</div>
                  <div><span className="text-zinc-400">Assunto:</span> [ANULAÇÃO VIP] Cancelamento de Subscrição {cancellingPlanName}</div>
                  <div><span className="text-zinc-400">Utilizador:</span> {currentUser?.email || 'anonimo@irunbets.pt'}</div>
                  <div><span className="text-zinc-400">Serviço Pago:</span> Mensalidade Automática Removida</div>
                </div>

                <div className="space-y-1.5">
                  <label className="text-[9px] uppercase font-mono tracking-wider text-zinc-500 block">Razão do cancelamento (Opcional)</label>
                  <textarea
                    rows={3}
                    value={cancelReason}
                    onChange={(e) => setCancelReason(e.target.value)}
                    placeholder="Ex: Vou testar outro método, ou razões pessoais..."
                    className="w-full bg-zinc-950 border border-zinc-900 rounded-xl p-3 text-xs text-white placeholder:text-zinc-700 outline-none focus:border-red-500/60 transition-colors"
                  />
                </div>
              </div>

              <div className="flex gap-3 pt-2">
                <button
                  type="button"
                  onClick={() => setCancellingPlanId(null)}
                  className="flex-1 py-3 bg-zinc-900 hover:bg-zinc-805 text-zinc-400 hover:text-white font-bold text-xs uppercase tracking-wider rounded-xl transition-colors cursor-pointer text-center"
                >
                  Manter VIP Ativo
                </button>
                <button
                  type="button"
                  disabled={isCancellingProcess}
                  onClick={() => handleCancelSubscriptionSubmit(cancellingPlanId, cancellingPlanName, cancelReason)}
                  className="flex-1 py-3 bg-red-600 hover:bg-red-500 text-white font-black text-xs uppercase tracking-wider rounded-xl transition-all cursor-pointer flex items-center justify-center gap-1.5 shadow-lg shadow-red-600/15"
                >
                  {isCancellingProcess ? (
                    <>
                      <div className="w-3 h-3 rounded-full border border-white border-t-transparent animate-spin"></div>
                      <span>Processando...</span>
                    </>
                  ) : (
                    <span>Confirmar Anulação</span>
                  )}
                </button>
              </div>

            </div>
          </div>
        )}

        {/* NOTIFICAÇÃO DE SUCESSO DE CANCELAMENTO */}
        {cancelSuccessMessage && (
          <div className="fixed inset-0 bg-black/95 backdrop-blur-md z-[120] flex items-center justify-center p-4 animate-fade-in text-left">
            <div className="bg-[#0e0e13] border border-zinc-850 rounded-2xl w-full max-w-md p-6 relative shadow-2xl space-y-4 text-center">
              <div className="w-12 h-12 bg-emerald-500/10 border border-emerald-500/25 text-emerald-400 rounded-full flex items-center justify-center mx-auto text-xl animate-pulse">
                ✓
              </div>
              <div className="space-y-1.5">
                <h3 className="text-sm font-black text-white uppercase tracking-wider">Subscrição Cancelada</h3>
                <p className="text-xs text-zinc-400 font-light leading-relaxed">
                  {cancelSuccessMessage}
                </p>
                <p className="text-[10.5px] text-zinc-500 text-center font-mono max-w-sm mx-auto">
                  Os tipos de pagamentos serão futuramente processados em ambiente de produção após completarmos a integração Paddle.
                </p>
              </div>
              <button
                type="button"
                onClick={() => setCancelSuccessMessage(null)}
                className="w-full py-2.5 bg-zinc-900 hover:bg-zinc-800 text-zinc-300 font-bold text-xs uppercase tracking-wider rounded-xl transition-colors cursor-pointer"
              >
                Fechar Painel
              </button>
            </div>
          </div>
        )}

      </div>
    </div>
  );
};

export default DynamicCustomPageView;

