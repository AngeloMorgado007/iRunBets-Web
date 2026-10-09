import React, { useState, useEffect, useMemo, useRef } from 'react';
import * as XLSX from 'xlsx';
import { 
  fetchJogosDoDiaFromSupabase, 
  JogoDoDia, 
  getCalibratedMatchMetrics, 
  getTodayDateString,
  getDailyTop75MatchesForSinalAberto,
  getMatchLiveInfo,
  LiveMatchInfo,
  SUPABASE_URL,
  subscribeToJogosRealtime,
  normalizeJogoRecord,
  normalizeClubName,
  testarMultiplaEquipas,
  MultiplaSimulationResult,
  carregarRaioXTatico,
  RaioXTaticoData
} from '../services/supabase';
import { 
  getUnlockedPredictionsFromFirebase, 
  saveUnlockedPredictionsToFirebase,
  onAuthStatusChange 
} from '../services/firebase';
import { TeamDetailsModal } from './TeamDetailsModal';
import { LeagueStandingsView } from './LeagueStandingsView';
import ApostasDoDiaSubpage from './ApostasDoDiaSubpage';

// Accent and diacritic stripper for search accuracy
function normalizeSearchText(text: string): string {
  if (!text) return '';
  return text
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '') // remove accents: á, é, í, ó, ú, ã, õ, ç -> a, e, i, o, u, a, o, c
    .replace(/[^a-z0-9\s]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

// Common aliases for clubs
const CLUB_ALIASES: Record<string, string[]> = {
  sporting: ['sporting clube de portugal', 'scp'],
  scp: ['sporting clube de portugal', 'sporting'],
  benfica: ['sport lisboa e benfica', 'slb'],
  slb: ['sport lisboa e benfica', 'benfica'],
  porto: ['fc porto', 'fcp'],
  fcp: ['fc porto', 'porto'],
  braga: ['sporting clube de braga', 'sc braga', 'scb'],
  scb: ['sporting clube de braga', 'braga'],
  madrid: ['real madrid', 'atletico de madrid', 'rayo vallecano'],
  real: ['real madrid', 'real betis', 'real sociedad'],
  atletico: ['club atletico de madrid', 'ca mineiro', 'ca paranaense'],
  barca: ['fc barcelona', 'barcelona'],
  psg: ['paris saint germain', 'paris sg'],
  inter: ['sc internacional', 'internazionale'],
  city: ['manchester city'],
  united: ['manchester united']
};

function matchMatchesSearch(j: JogoDoDia, rawTerm: string): boolean {
  if (!rawTerm || !rawTerm.trim()) return true;
  const term = normalizeSearchText(rawTerm);
  if (!term) return true;

  const target = normalizeSearchText(
    `${j.clube_casa || ''} ${j.clube_fora || ''} ${j.confronto || ''} ${j.liga || ''} ${j.previsao_resumo || ''} ${j.data || ''} ${j.hora || ''}`
  );

  // If exact normalized query appears anywhere in target
  if (target.includes(term)) return true;

  // Split term into separate search words/tokens
  const tokens = term.split(' ').filter(Boolean);
  
  // Every token must match the target or an alias of the token
  return tokens.every((token) => {
    if (target.includes(token)) return true;
    
    // Check aliases
    const aliases = CLUB_ALIASES[token];
    if (aliases && aliases.some(alias => target.includes(alias) || alias.includes(token))) {
      return true;
    }
    return false;
  });
}

export interface FootballMatchPrediction {
  id: string;
  date?: string;
  time: string;
  competition: string;
  homeTeam: string;
  awayTeam: string;
  confronto?: string;
  tip: string;
  odd: string;
  odd1?: string;
  oddX?: string;
  odd2?: string;
  probCasa?: number;
  probEmpate?: number;
  probFora?: number;
  cantosVal?: string;
  cartoesVal?: string;
  evVal?: string;
  confidenceLevel?: number;
  predictionTitle?: string;
  predictionText?: string;
  status?: string;
}

interface FootballPredictionsTableProps {
  language?: string;
  isAdmin?: boolean;
  userSubscriptionStatus?: string;
}

export default function FootballPredictionsTable({ language = 'pt', isAdmin = false, userSubscriptionStatus }: FootballPredictionsTableProps) {
  const [jogos, setJogos] = useState<JogoDoDia[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [refreshing, setRefreshing] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedLeague, setSelectedLeague] = useState<string>('all');
  const [leagueViewTab, setLeagueViewTab] = useState<'standings' | 'matches'>('standings');
  const [forceShowAllLeagueGames, setForceShowAllLeagueGames] = useState<boolean>(false);
  const [currentDateString, setCurrentDateString] = useState<string>(() => getTodayDateString());
  const [selectedDateFilter, setSelectedDateFilter] = useState<string>(() => getTodayDateString());
  const [autoHidePast, setAutoHidePast] = useState<boolean>(false);
  const [visibleFutureDays, setVisibleFutureDays] = useState<number>(5); // Limite padrão de 5 dias futuros solicitado
  const [showCommercialExportModal, setShowCommercialExportModal] = useState(false);

  // Subpage Tab Navigation: 'tabela' (Tabela Geral de Jogos & Métricas) vs 'apostas-do-dia' (Apostas do Dia - 3 Quadros)
  const [mainSubpageTab, setMainSubpageTab] = useState<'tabela' | 'apostas-do-dia'>(() => {
    if (typeof window !== 'undefined' && window.location.hash.toLowerCase().includes('apostas-do-dia')) {
      return 'apostas-do-dia';
    }
    return 'tabela';
  });

  useEffect(() => {
    const handleHash = () => {
      const h = (window.location.hash || '').toLowerCase();
      if (h.includes('apostas-do-dia') || h.includes('bilhetes')) {
        setMainSubpageTab('apostas-do-dia');
      } else {
        // Any navigation to #prognosticos-futebol, #prognosticos, #tabela or base page restores the match list table
        setMainSubpageTab('tabela');
      }
    };

    const handleCustomTab = (e: any) => {
      if (e.detail === 'tabela' || e.detail === 'apostas-do-dia') {
        setMainSubpageTab(e.detail);
      }
    };

    // Run on initial mount
    handleHash();

    window.addEventListener('hashchange', handleHash);
    window.addEventListener('irunbets_switch_prognosticos_tab', handleCustomTab);
    return () => {
      window.removeEventListener('hashchange', handleHash);
      window.removeEventListener('irunbets_switch_prognosticos_tab', handleCustomTab);
    };
  }, []);

  // Calcula a data máxima futura visível com base no limite progressivo (janela de 5 dias)
  const maxFutureDateString = useMemo(() => {
    const d = new Date();
    d.setDate(d.getDate() + visibleFutureDays);
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
  }, [visibleFutureDays]);

  const maxFuture5DaysStr = useMemo(() => {
    const d = new Date();
    d.setDate(d.getDate() + 5);
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
  }, []);

  // Datas relativas calculadas: Ontem e Antes de Ontem para filtro e histórico instantâneo
  const yesterdayStr = useMemo(() => {
    const d = new Date();
    d.setDate(d.getDate() - 1);
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
  }, []);

  const beforeYesterdayStr = useMemo(() => {
    const d = new Date();
    d.setDate(d.getDate() - 2);
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
  }, []);

  const getDateLabel = (dateStr: string) => {
    if (!dateStr) return '';
    if (dateStr === currentDateString) return `Hoje (${dateStr})`;
    if (dateStr === yesterdayStr) return `Ontem (${dateStr})`;
    if (dateStr === beforeYesterdayStr) return `Antes de Ontem (${dateStr})`;
    
    // Indica se está dentro da janela de 8 dias ou além
    if (dateStr > currentDateString) {
      const diffTime = new Date(dateStr).getTime() - new Date(currentDateString).getTime();
      const diffDays = Math.round(diffTime / (1000 * 60 * 60 * 24));
      if (diffDays <= 8) {
        return `+${diffDays}d • ${dateStr}`;
      }
      return `+${diffDays}d (Futuro) • ${dateStr}`;
    }
    return dateStr;
  };

  // Auth & Access Control states
  const [authUser, setAuthUser] = useState<any>(() => {
    try {
      const saved = localStorage.getItem('irunbets_session');
      return saved ? JSON.parse(saved) : null;
    } catch {
      return null;
    }
  });
  const [internalIsAdmin, setInternalIsAdmin] = useState<boolean>(() => {
    try {
      const saved = localStorage.getItem('irunbets_session');
      if (saved) {
        const u = JSON.parse(saved);
        const mail = u?.email?.toLowerCase();
        if (mail === 'morgado.aam@gmail.com' || mail === '1982veramorgado@gmail.com') return true;
      }
    } catch {}
    return isAdmin;
  });
  const [unlockedIds, setUnlockedIds] = useState<string[]>(() => {
    try {
      const saved = localStorage.getItem('irunbets_unlocked_predictions');
      return saved ? JSON.parse(saved) : [];
    } catch {
      return [];
    }
  });

  // Filter state for displaying only games in Sinal Aberto
  const [showOnlySinalAberto, setShowOnlySinalAberto] = useState(false);

  // Seleção de equipas para Múltipla / Boletim (UUIDs e dados da seleção)
  const [selectedMultiplaItems, setSelectedMultiplaItems] = useState<Array<{
    id: string; // UUID da seleção / equipa para RPC
    gameId: string;
    teamName: string;
    matchText: string;
    date: string;
    odd: string;
  }>>([]);
  const [isSimulatingMultipla, setIsSimulatingMultipla] = useState<boolean>(false);
  const [multiplaSimulationResult, setMultiplaSimulationResult] = useState<MultiplaSimulationResult | null>(null);
  const [showMultiplaModal, setShowMultiplaModal] = useState<boolean>(false);

  // Table Font Size state ('small', 'normal', 'large', 'xlarge')
  const [tableFontSize, setTableFontSize] = useState<'small' | 'normal' | 'large' | 'xlarge'>(() => {
    try {
      return (localStorage.getItem('irunbets_table_font_size') as any) || 'large';
    } catch {
      return 'large';
    }
  });

  const handleSetFontSize = (size: 'small' | 'normal' | 'large' | 'xlarge') => {
    setTableFontSize(size);
    try {
      localStorage.setItem('irunbets_table_font_size', size);
    } catch {}
  };

  const handleStepFontSize = (direction: 'up' | 'down') => {
    const sizes: Array<'small' | 'normal' | 'large' | 'xlarge'> = ['small', 'normal', 'large', 'xlarge'];
    const idx = sizes.indexOf(tableFontSize);
    if (direction === 'up' && idx < sizes.length - 1) {
      handleSetFontSize(sizes[idx + 1]);
    } else if (direction === 'down' && idx > 0) {
      handleSetFontSize(sizes[idx - 1]);
    }
  };

  // Row Density State ('compact' | 'normal' | 'spacious') estilo folha de cálculo Excel
  const [rowDensity, setRowDensity] = useState<'compact' | 'normal' | 'spacious'>(() => {
    try {
      return (localStorage.getItem('irunbets_table_row_density') as any) || 'normal';
    } catch {
      return 'normal';
    }
  });

  const handleSetRowDensity = (density: 'compact' | 'normal' | 'spacious') => {
    setRowDensity(density);
    try {
      localStorage.setItem('irunbets_table_row_density', density);
    } catch {}
  };

  // Excel Columns & Scaling Customizer State
  const [columnScale, setColumnScale] = useState<number>(100);
  const [showExcelSettings, setShowExcelSettings] = useState(false);
  const [visibleColumns, setVisibleColumns] = useState({
    multipla: true,
    sinalAberto: true,
    data: true,
    hora: true,
    liga: true,
    confronto: true,
    odds: true,
    previsao: true,
    metricas: true
  });

  // Top Synchronized Scrollbar References
  const topScrollRef = useRef<HTMLDivElement | null>(null);
  const tableContainerRef = useRef<HTMLDivElement | null>(null);
  const [tableScrollWidth, setTableScrollWidth] = useState<number>(1200);

  const handleTopScroll = () => {
    if (topScrollRef.current && tableContainerRef.current) {
      tableContainerRef.current.scrollLeft = topScrollRef.current.scrollLeft;
    }
  };

  const handleTableScroll = () => {
    if (topScrollRef.current && tableContainerRef.current) {
      topScrollRef.current.scrollLeft = tableContainerRef.current.scrollLeft;
    }
  };

  useEffect(() => {
    const updateScrollWidth = () => {
      if (tableContainerRef.current) {
        setTableScrollWidth(tableContainerRef.current.scrollWidth);
      }
    };
    updateScrollWidth();
    const timer = setTimeout(updateScrollWidth, 300);
    window.addEventListener('resize', updateScrollWidth);
    return () => {
      clearTimeout(timer);
      window.removeEventListener('resize', updateScrollWidth);
    };
  }, [jogos, visibleColumns, columnScale, tableFontSize]);

  // Modal Interativo de Dossiê da Equipa e Classificação da Liga
  const [teamModalState, setTeamModalState] = useState<{
    isOpen: boolean;
    teamName?: string;
    leagueName?: string;
  }>({
    isOpen: false,
    teamName: undefined,
    leagueName: undefined
  });

  // 3 Filtros Rápidos de Estado: 🔴 Ao Vivo (IN_PLAY), ✅ Terminados (FINISHED) e 📅 Agendados (SCHEDULED)
  const [statusFilter, setStatusFilter] = useState<'all' | 'live' | 'finished' | 'scheduled'>('all');
  const [showLiveOnly, setShowLiveOnly] = useState(false);
  const [simulatedLiveActive, setSimulatedLiveActive] = useState(false);
  const [nowClock, setNowClock] = useState<Date>(() => new Date());

  // Check if current user is registered/logged in or has VIP access
  const isEffectiveAdmin = Boolean(
    isAdmin || 
    internalIsAdmin || 
    authUser?.email?.toLowerCase() === 'morgado.aam@gmail.com' || 
    authUser?.email?.toLowerCase() === '1982veramorgado@gmail.com'
  );
  const isUserRegistered = Boolean(authUser) || Boolean(userSubscriptionStatus && userSubscriptionStatus !== 'Gratuito') || isEffectiveAdmin;

  // Selected game for the quantitative metrics modal pop-up (including Live info if in play)
  const [selectedMatch, setSelectedMatch] = useState<{
    jogo: JogoDoDia;
    metrics: ReturnType<typeof getCalibratedMatchMetrics>;
    liveInfo?: LiveMatchInfo;
  } | null>(null);

  // Raio-X Tático & Duelo de Treinadores State
  const [raioXTatico, setRaioXTatico] = useState<RaioXTaticoData | null>(null);
  const [loadingRaioX, setLoadingRaioX] = useState<boolean>(false);

  const [copiedToast, setCopiedToast] = useState(false);

  // Balneário UEFA DT Chat State
  interface DtChatMessage {
    id: string;
    role: 'user' | 'model';
    text: string;
    timestamp: string;
  }
  const [dtChatMessages, setDtChatMessages] = useState<DtChatMessage[]>([]);
  const [dtChatInput, setDtChatInput] = useState<string>('');
  const [isDtChatThinking, setIsDtChatThinking] = useState<boolean>(false);
  const dtChatScrollRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    if (dtChatScrollRef.current) {
      dtChatScrollRef.current.scrollTop = dtChatScrollRef.current.scrollHeight;
    }
  }, [dtChatMessages, isDtChatThinking]);

  // Initialize initial message when selectedMatch changes
  useEffect(() => {
    if (selectedMatch) {
      const cCasa = selectedMatch.jogo.clube_casa;
      const cFora = selectedMatch.jogo.clube_fora;
      const p1 = selectedMatch.metrics?.probCasa ?? 45;
      const px = selectedMatch.metrics?.probEmpate ?? 28;
      const p2 = selectedMatch.metrics?.probFora ?? 27;
      const xgC = selectedMatch.metrics?.xgCasa ?? selectedMatch.metrics?.engineModules?.modulo1_poisson?.xgHome ?? 1.35;
      const xgF = selectedMatch.metrics?.xgFora ?? selectedMatch.metrics?.engineModules?.modulo1_poisson?.xgAway ?? 1.05;
      
      const welcomeMsg: DtChatMessage = {
        id: 'initial-' + (selectedMatch.jogo.jogo_id || selectedMatch.jogo.id || Date.now()),
        role: 'model',
        text: `Olá! Tudo bem? Sou o teu assistente de análise para o embate **${cCasa} vs ${cFora}**. Como estamos de apostas hoje? Em que mercado ou palpite te posso ajudar neste confronto?`,
        timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
      };
      setDtChatMessages([welcomeMsg]);
      setDtChatInput('');
    } else {
      setDtChatMessages([]);
    }
  }, [selectedMatch?.jogo.id, selectedMatch?.jogo.jogo_id]);

  const handleSendDtChatMessage = async (customText?: string) => {
    const textToSend = (customText || dtChatInput).trim();
    if (!textToSend || !selectedMatch || isDtChatThinking) return;

    const userMsg: DtChatMessage = {
      id: 'usr-' + Date.now(),
      role: 'user',
      text: textToSend,
      timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
    };

    const previousHistory = [...dtChatMessages];
    const newHistory = [...dtChatMessages, userMsg];
    setDtChatMessages(newHistory);
    setDtChatInput('');
    setIsDtChatThinking(true);

    const cCasa = selectedMatch.jogo.clube_casa;
    const cFora = selectedMatch.jogo.clube_fora;
    const p1 = Number(selectedMatch.metrics?.probCasa ?? 45);
    const px = Number(selectedMatch.metrics?.probEmpate ?? 28);
    const p2 = Number(selectedMatch.metrics?.probFora ?? 27);
    const xgC = Number(selectedMatch.metrics?.xgCasa ?? selectedMatch.metrics?.engineModules?.modulo1_poisson?.xgHome ?? 1.35).toFixed(2);
    const xgF = Number(selectedMatch.metrics?.xgFora ?? selectedMatch.metrics?.engineModules?.modulo1_poisson?.xgAway ?? 1.05).toFixed(2);
    const totalXg = (Number(xgC) + Number(xgF)).toFixed(2);
    const over15 = selectedMatch.metrics?.over15Prob ?? 75;
    const over25 = selectedMatch.metrics?.over25Prob ?? 50;
    const btts = selectedMatch.metrics?.bttsYesProb ?? 52;
    const cantos = selectedMatch.metrics?.cantosVal || '9.2';
    const cartoes = selectedMatch.metrics?.cartoesVal || '4.1';
    const seloIa = selectedMatch.metrics?.seloIa || (p1 >= 50 ? `${cCasa} Vence (1)` : p2 >= 50 ? `${cFora} Vence (2)` : `${cCasa} ou Empate (1X)`);

    try {
      const matchContext = {
        homeTeam: cCasa,
        awayTeam: cFora,
        competition: selectedMatch.jogo.campeonato || selectedMatch.jogo.liga || "Campeonato",
        date: selectedMatch.jogo.data,
        time: selectedMatch.jogo.hora,
        probHome: p1,
        probDraw: px,
        probAway: p2,
        xgHome: xgC,
        xgAway: xgF,
        totalXg,
        over15Prob: over15,
        over25Prob: over25,
        bttsProb: btts,
        cantosVal: cantos,
        cartoesVal: cartoes,
        seloIa,
        trainerHome: raioXTatico?.treinador_casa,
        trainerAway: raioXTatico?.treinador_fora
      };

      const res = await fetch("/api/gemini/dt-chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        signal: AbortSignal.timeout(8500),
        body: JSON.stringify({
          history: previousHistory.map(m => ({ role: m.role, text: m.text })),
          newMessage: textToSend,
          matchContext
        })
      });

      if (res.ok) {
        const data = await res.json();
        if (data.status === "success" && data.reply) {
          const aiMsg: DtChatMessage = {
            id: 'ai-' + Date.now(),
            role: 'model',
            text: data.reply,
            timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
          };
          setDtChatMessages(prev => [...prev, aiMsg]);
          setIsDtChatThinking(false);
          return;
        }
      }

      // Fallback conversacional e natural
      const lower = textToSend.toLowerCase();
      let simulatedReply = '';

      if (/^(ol[aá]|boas|bom dia|boa tarde|boa noite|oi|hey|hello|hi)/i.test(lower) || lower.length <= 4 && /^(ol|oi|hi)/i.test(lower)) {
        simulatedReply = `Olá! Tudo bem? Sou o teu assistente de apostas e análise desportiva. Como estamos de apostas hoje?\n\nEstás de olho neste duelo entre o **${cCasa}** e o **${cFora}** ou procuras alguma recomendação para o teu bilhete? Diz-me o que tens em mente!`;
      } else if (lower.includes('como estamos') || lower.includes('apostas hoje') || lower.includes('o que temos hoje') || lower.includes('dicas para hoje')) {
        const fav = p1 >= p2 ? cCasa : cFora;
        const favProb = Math.max(p1, p2);
        simulatedReply = `Hoje temos boas oportunidades em análise! Para este jogo **${cCasa} vs ${cFora}**, o modelo coloca o **${fav}** como favorito com **${favProb}%** de probabilidade e estimamos cerca de **${totalXg}** golos esperados (xG).\n\nQueres apostar no resultado final (1X2), estás mais inclinado para o mercado de golos (como Over ou Ambas Marcam), ou queres ver se há valor nas odds?`;
      } else if (lower.includes('tudo bem') || lower.includes('como estás') || lower.includes('tudo bom') || lower.includes('como vais')) {
        simulatedReply = `Tudo ótimo por aqui, 100% focado a dissecar as estatísticas e as odds do dia! E contigo, como estão a correr as apostas? Queres ver algum detalhe deste jogo?`;
      } else if (lower.includes('quem ganha') || lower.includes('quem vence') || lower.includes('favorit') || lower.includes('vence')) {
        const fav = p1 >= p2 ? cCasa : cFora;
        const favProb = Math.max(p1, p2);
        simulatedReply = `Olhando para os números deste embate, o modelo dá **${p1}%** de probabilidade de vitória ao **${cCasa}**, **${px}%** ao empate e **${p2}%** ao **${cFora}**.\n\nO **${fav}** assume aqui o favoritismo (${favProb}% de probabilidade e ${p1 >= p2 ? xgC : xgF} xG projetado). Se fores a seco na vitória, há bom fundamento matemático, mas se quiseres um bilhete mais conservador, a Dupla Chance protege contra uma surpresa do ${p1 >= p2 ? cFora : cCasa}. O que achas?`;
      } else if (lower.includes('golo') || lower.includes('golos') || lower.includes('over') || lower.includes('under') || lower.includes('ambas') || lower.includes('btts')) {
        simulatedReply = `Em termos de golos para este jogo, a expectativa total está fixada em **${totalXg} xG**.\n\nAs probabilidades apontam para **${over15}%** de chances no Mais de 1.5 Golos, **${over25}%** no Mais de 2.5 e **${btts}%** para Ambas as Equipas Marcarem. É um jogo com ${Number(totalXg) >= 2.4 ? 'boa propensão ofensiva' : 'tendência para ritmo mais tático e controlado'}. Qual destes mercados costumas preferir?`;
      } else if (lower.includes('físic') || lower.includes('cansaço') || lower.includes('70') || lower.includes('fadiga')) {
        simulatedReply = `A partir dos 70 minutos a quebra física costuma fazer a diferença. Se o jogo chegar aos últimos 20 minutos empatado ou com margem curta, as linhas defensivas começam a esticar e as falhas de concentração aumentam, sendo uma boa janela para golos tardios se estiveres a acompanhar ao vivo.`;
      } else if (lower.includes('empate') || lower.includes('empata')) {
        simulatedReply = `O empate neste jogo está cotado pelo modelo com uma probabilidade de **${px}%**. A diferença de xG entre as duas equipas é de ${(Math.abs(Number(xgC) - Number(xgF))).toFixed(2)}, o que indica que ${Math.abs(Number(xgC) - Number(xgF)) < 0.4 ? 'o equilíbrio tático pode facilmente arrastar o resultado para a divisão de pontos' : 'o favorito tem vantagem clara para desbloquear o marcador'}.`;
      } else {
        simulatedReply = `Percebo perfeitamente! Para o embate **${cCasa} vs ${cFora}** (${p1}% [1] | ${px}% [X] | ${p2}% [2]), estou aqui para te ajudar a escolher a melhor aposta ou validar o teu raciocínio.\n\nDiz-me, em que mercado estás mais tentado a apostar neste jogo?`;
      }

      const fallbackMsg: DtChatMessage = {
        id: 'ai-' + Date.now(),
        role: 'model',
        text: simulatedReply,
        timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
      };
      setDtChatMessages(prev => [...prev, fallbackMsg]);
    } catch (err) {
      console.warn("Erro ao contactar /api/gemini/dt-chat:", err);
      const errFallback: DtChatMessage = {
        id: 'ai-' + Date.now(),
        role: 'model',
        text: `Olá! Tudo bem? Estou aqui contigo para analisar este jogo entre o **${cCasa}** e o **${cFora}**. Como estão as tuas apostas para hoje?`,
        timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
      };
      setDtChatMessages(prev => [...prev, errFallback]);
    } finally {
      setIsDtChatThinking(false);
    }
  };

  // Sync auth state
  useEffect(() => {
    const unsub = onAuthStatusChange((user, checkAdmin) => {
      setAuthUser(user);
      const isEmailAdmin = user?.email?.toLowerCase() === 'morgado.aam@gmail.com' || user?.email?.toLowerCase() === '1982veramorgado@gmail.com';
      setInternalIsAdmin(Boolean(checkAdmin || isEmailAdmin));
    });
    return () => unsub();
  }, []);

  // Sync unlocked prediction IDs from Firebase / storage
  useEffect(() => {
    getUnlockedPredictionsFromFirebase().then(ids => {
      if (Array.isArray(ids)) setUnlockedIds(ids);
    });

    const handleUnlockedUpdate = () => {
      try {
        const saved = localStorage.getItem('irunbets_unlocked_predictions');
        if (saved) setUnlockedIds(JSON.parse(saved));
      } catch (e) {
        // ignore
      }
    };

    window.addEventListener('irunbets_unlocked_predictions_updated', handleUnlockedUpdate);
    window.addEventListener('storage', handleUnlockedUpdate);
    return () => {
      window.removeEventListener('irunbets_unlocked_predictions_updated', handleUnlockedUpdate);
      window.removeEventListener('storage', handleUnlockedUpdate);
    };
  }, []);

  // Efeito para carregar o Raio-X Tático & Duelo de Treinadores sempre que um jogo for selecionado
  useEffect(() => {
    if (!selectedMatch) {
      setRaioXTatico(null);
      return;
    }

    let isMounted = true;
    setLoadingRaioX(true);

    const matchId = selectedMatch.jogo.jogo_id ? String(selectedMatch.jogo.jogo_id) : undefined;
    const clubeCasa = selectedMatch.jogo.clube_casa;
    const clubeFora = selectedMatch.jogo.clube_fora;

    carregarRaioXTatico(matchId, clubeCasa, clubeFora)
      .then((data) => {
        if (!isMounted) return;
        if (data) {
          setRaioXTatico(data);
        } else {
          // Gerar Raio-X tático derivado com base nas equipas e métricas do jogo se não houver registo direto no Supabase
          const taticasPossiveis = ['4-3-3', '4-2-3-1', '3-5-2', '4-4-2', '3-4-3'];
          const casaHash = (clubeCasa || '').split('').reduce((acc, c) => acc + c.charCodeAt(0), 0);
          const foraHash = (clubeFora || '').split('').reduce((acc, c) => acc + c.charCodeAt(0), 0);
          
          const taticaCasa = taticasPossiveis[casaHash % taticasPossiveis.length];
          const taticaFora = taticasPossiveis[foraHash % taticasPossiveis.length];

          // Ratings calibrados através das métricas Poisson & xG
          const probC = Number(selectedMatch.metrics.probCasa) || 45;
          const probF = Number(selectedMatch.metrics.probFora) || 28;

          const rAtqCasa = parseFloat((6.5 + (probC / 100) * 2.2).toFixed(1));
          const rDefFora = parseFloat((7.4 - (probC / 100) * 1.5).toFixed(1));
          const rAtqFora = parseFloat((6.0 + (probF / 100) * 2.0).toFixed(1));
          const rDefCasa = parseFloat((7.5 - (probF / 100) * 1.5).toFixed(1));
          const rMeiosCasa = parseFloat((6.8 + (probC / 100) * 1.2).toFixed(1));
          const rMeiosFora = parseFloat((6.8 + (probF / 100) * 1.2).toFixed(1));
          const rGrCasa = parseFloat((6.8 + ((casaHash % 10) / 10)).toFixed(1));
          const rGrFora = parseFloat((6.8 + ((foraHash % 10) / 10)).toFixed(1));

          const fallbackRaioX: RaioXTaticoData = {
            jogo_id: matchId || 'simulated',
            equipa_casa: clubeCasa || 'Equipa Casa',
            equipa_fora: clubeFora || 'Equipa Fora',
            treinador_casa: `Treinador de ${clubeCasa}`,
            tatica_casa: taticaCasa,
            estrelas_treinador_casa: parseFloat((3.5 + ((casaHash % 15) / 10)).toFixed(1)),
            treinador_fora: `Treinador de ${clubeFora}`,
            tatica_fora: taticaFora,
            estrelas_treinador_fora: parseFloat((3.5 + ((foraHash % 15) / 10)).toFixed(1)),
            rating_gr_casa: rGrCasa,
            rating_gr_fora: rGrFora,
            rating_defesa_casa: rDefCasa,
            rating_defesa_fora: rDefFora,
            rating_meios_casa: rMeiosCasa,
            rating_meios_fora: rMeiosFora,
            rating_ataque_casa: rAtqCasa,
            rating_ataque_fora: rAtqFora,
            perfil_lideranca_psicologica: probC > probF 
              ? 'Liderança Ofensiva de Alta Pressão & Domínio Posicional Territorial' 
              : 'Bloco Baixo Reativo com Transição Vertical & Exploração de Espaço'
          };
          setRaioXTatico(fallbackRaioX);
        }
      })
      .catch((err) => {
        console.error('Falha ao obter Raio-X:', err);
      })
      .finally(() => {
        if (isMounted) setLoadingRaioX(false);
      });

    return () => {
      isMounted = false;
    };
  }, [selectedMatch]);

  // Admin toggle prediction unlock (Sinal Aberto visto)
  const handleToggleUnlock = async (e: React.MouseEvent, matchKey: string) => {
    e.stopPropagation();
    if (!isEffectiveAdmin) return;

    const isCurrentlyUnlocked = unlockedIds.includes(matchKey);
    let nextIds: string[];
    if (isCurrentlyUnlocked) {
      nextIds = unlockedIds.filter(id => id !== matchKey);
    } else {
      nextIds = [...unlockedIds, matchKey];
    }
    setUnlockedIds(nextIds);
    await saveUnlockedPredictionsToFirebase(nextIds);
  };

  // Helper para gerar UUID determinístico padrão v4 a partir de qualquer string (equipa + jogo)
  const generateDeterministicUuid = (str: string): string => {
    let hash = 0;
    for (let i = 0; i < str.length; i++) {
      hash = ((hash << 5) - hash) + str.charCodeAt(i);
      hash |= 0;
    }
    const hex = Math.abs(hash).toString(16).padStart(8, '0');
    return `${hex.slice(0, 8)}-0000-4000-8000-${hex.padEnd(12, '0').slice(0, 12)}`;
  };

  // Toggle seleção de jogo/equipa para a Múltipla
  const handleToggleMultiplaSelection = (
    e: React.MouseEvent,
    jogo: JogoDoDia,
    metrics: ReturnType<typeof getCalibratedMatchMetrics>
  ) => {
    e.stopPropagation();
    const gameId = (jogo.jogo_id && String(jogo.jogo_id).trim()) 
      ? String(jogo.jogo_id).trim() 
      : `${jogo.data}_${jogo.hora}_${jogo.clube_casa}_vs_${jogo.clube_fora}`.replace(/\s+/g, '_').toLowerCase();

    // Determina a equipa favorita/recomendada da previsão para a seleção da múltipla
    let teamName = jogo.clube_casa || 'Equipa Casa';
    let oddVal = metrics.odd1;
    if (metrics.seloIa.includes('Fora') || metrics.seloIa.includes('2')) {
      teamName = jogo.clube_fora || 'Equipa Fora';
      oddVal = metrics.odd2;
    } else if (metrics.seloIa.includes('1X') || Number(metrics.probCasa) >= Number(metrics.probFora)) {
      teamName = jogo.clube_casa || 'Equipa Casa';
      oddVal = metrics.odd1;
    } else {
      teamName = jogo.clube_fora || 'Equipa Fora';
      oddVal = metrics.odd2;
    }

    const uuid = generateDeterministicUuid(`${teamName}_${jogo.jogo_id || gameId}`);

    setSelectedMultiplaItems(prev => {
      const exists = prev.some(item => item.gameId === gameId);
      if (exists) {
        return prev.filter(item => item.gameId !== gameId);
      } else {
        return [...prev, {
          id: uuid,
          gameId,
          teamName,
          matchText: jogo.confronto || `${jogo.clube_casa} vs ${jogo.clube_fora}`,
          date: jogo.data || '',
          odd: oddVal
        }];
      }
    });
  };

  // Função 1: obter IDs das equipas selecionadas pelo utilizador na interface (como fornecido pelo utilizador)
  const obterEquipasSelecionadasPeloUtilizador = (): string[] => {
    const checkboxes = document.querySelectorAll<HTMLInputElement>('.equipa-checkbox:checked');
    const ids: string[] = [];
    checkboxes.forEach(cb => {
      if (cb.value) ids.push(cb.value);
    });
    // Se a query DOM estiver vazia mas houver itens no state, usar os IDs do state como garantia
    if (ids.length === 0 && selectedMultiplaItems.length > 0) {
      return selectedMultiplaItems.map(item => item.id);
    }
    return ids;
  };

  // Função 2: Executar o teste de múltipla via Supabase RPC simular_boletim_multimercados
  const executarSimulacaoMultipla = async () => {
    const ids = obterEquipasSelecionadasPeloUtilizador();
    if (ids.length === 0) {
      alert('Por favor selecione pelo menos uma equipa no visto antes da data para simular a múltipla.');
      return;
    }

    setIsSimulatingMultipla(true);
    try {
      const resultado = await testarMultiplaEquipas(ids);
      if (resultado) {
        setMultiplaSimulationResult(resultado);
        setShowMultiplaModal(true);
      } else {
        alert('Não foi possível obter a simulação no momento. Verifique a conexão ao Supabase.');
      }
    } catch (err) {
      console.error('Erro na simulação:', err);
      alert('Ocorreu um erro ao calcular a probabilidade da múltipla.');
    } finally {
      setIsSimulatingMultipla(false);
    }
  };

  // Automate Daily "Sinal Aberto":
  // Every day at 00:00 (and upon match load), automatically selects 3 games of the day
  // where SuperIA calibrated probability is above 75%, making them available without login.
  useEffect(() => {
    if (!jogos || jogos.length === 0) return;

    const applyDailySinalAberto = async () => {
      try {
        const today = getTodayDateString();
        const lastAppliedDay = localStorage.getItem('irunbets_sinal_aberto_applied_day');
        if (lastAppliedDay === today) return; // already applied today, do nothing

        const top3DailyKeys = getDailyTop75MatchesForSinalAberto(jogos);
        if (!top3DailyKeys || top3DailyKeys.length === 0) return;

        localStorage.setItem('irunbets_sinal_aberto_applied_day', today);

        setUnlockedIds(prev => {
          const currentList = Array.isArray(prev) ? prev : [];
          const missing = top3DailyKeys.filter(k => !currentList.includes(k));
          if (missing.length === 0) return currentList;

          const nextIds = Array.from(new Set([...currentList, ...top3DailyKeys]));
          saveUnlockedPredictionsToFirebase(nextIds).catch(() => {});
          return nextIds;
        });
      } catch (err) {
        console.warn('Silent issue in daily sinal aberto:', err);
      }
    };

    applyDailySinalAberto();

    // Check every minute for midnight roll-over (00:00)
    const midnightInterval = setInterval(() => {
      const today = getTodayDateString();
      const lastAppliedDay = localStorage.getItem('irunbets_sinal_aberto_applied_day');
      if (lastAppliedDay !== today) {
        applyDailySinalAberto();
      }
    }, 60000);

    return () => clearInterval(midnightInterval);
  }, [jogos]);

  // Load from Supabase with instant fallback to cached data
  const loadJogosDoDia = async (isManualRefresh = false, showPast = true) => {
    if (isManualRefresh) setRefreshing(true);
    else if (jogos.length === 0) setLoading(true);
    setError(null);

    try {
      const data = await fetchJogosDoDiaFromSupabase({ includePast: showPast });
      if (data && data.length > 0) {
        setJogos(data);
        try {
          localStorage.setItem('irunbets_supabase_jogos_do_dia', JSON.stringify(data));
        } catch (e) {
          // ignore storage quota
        }
      } else {
        // If empty, try cache
        const cached = localStorage.getItem('irunbets_supabase_jogos_do_dia');
        if (cached) {
          setJogos(JSON.parse(cached));
        }
      }
    } catch (err: any) {
      console.error('Falha ao obter jogos_do_dia do Supabase:', err);
      // Try local cache
      const cached = localStorage.getItem('irunbets_supabase_jogos_do_dia');
      if (cached) {
        setJogos(JSON.parse(cached));
      } else {
        setError('Não foi possível estabelecer ligação direta com a base de dados Supabase.');
      }
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  // Subscrição Supabase Realtime: canal 'realtime_live_jogos_feed' na tabela 'jogos' e 'jogos_do_dia'
  useEffect(() => {
    console.log('[Supabase Realtime] A subscrever alterações em tempo real...');
    const unsubscribe = subscribeToJogosRealtime(({ eventType, new: newRow }) => {
      if (!newRow) return;

      setJogos((prevJogos) => {
        const targetId = newRow.jogo_id;
        const normCasa = normalizeClubName(newRow.clube_casa || '');
        const normFora = normalizeClubName(newRow.clube_fora || '');
        const index = prevJogos.findIndex(j => {
          if (targetId && j.jogo_id === targetId) return true;
          if (normCasa && normFora && normalizeClubName(j.clube_casa || '') === normCasa && normalizeClubName(j.clube_fora || '') === normFora) return true;
          if (newRow.clube_casa && newRow.clube_fora && j.clube_casa === newRow.clube_casa && j.clube_fora === newRow.clube_fora) return true;
          if (newRow.confronto && j.confronto === newRow.confronto) return true;
          return false;
        });

        if (index >= 0) {
          const updatedList = [...prevJogos];
          const existing = updatedList[index];
          const resolvedGolosCasa = newRow.golos_casa_final !== undefined && newRow.golos_casa_final !== null
            ? newRow.golos_casa_final
            : (newRow.golos_casa !== undefined && newRow.golos_casa !== null ? newRow.golos_casa : existing.golos_casa);
          const resolvedGolosFora = newRow.golos_fora_final !== undefined && newRow.golos_fora_final !== null
            ? newRow.golos_fora_final
            : (newRow.golos_fora !== undefined && newRow.golos_fora !== null ? newRow.golos_fora : existing.golos_fora);

          const merged: JogoDoDia = {
            ...existing,
            ...newRow,
            estado: newRow.estado || existing.estado,
            minuto: newRow.minuto !== undefined && newRow.minuto !== null ? newRow.minuto : existing.minuto,
            golos_casa: resolvedGolosCasa,
            golos_fora: resolvedGolosFora,
            golos_casa_final: newRow.golos_casa_final !== undefined && newRow.golos_casa_final !== null ? newRow.golos_casa_final : existing.golos_casa_final,
            golos_fora_final: newRow.golos_fora_final !== undefined && newRow.golos_fora_final !== null ? newRow.golos_fora_final : existing.golos_fora_final,
            golos_casa_intervalo: newRow.golos_casa_intervalo !== undefined && newRow.golos_casa_intervalo !== null ? newRow.golos_casa_intervalo : existing.golos_casa_intervalo,
            golos_fora_intervalo: newRow.golos_fora_intervalo !== undefined && newRow.golos_fora_intervalo !== null ? newRow.golos_fora_intervalo : existing.golos_fora_intervalo,
            resultado: newRow.resultado || existing.resultado
          };
          updatedList[index] = merged;

          // Se a modal de métricas estiver aberta para este jogo, atualizar em tempo real
          setSelectedMatch((curr) => {
            if (!curr) return null;
            if (curr.jogo.jogo_id === existing.jogo_id || curr.jogo.jogo_id === targetId) {
              return {
                jogo: merged,
                metrics: getCalibratedMatchMetrics(merged),
                liveInfo: getMatchLiveInfo(merged, undefined, new Date())
              };
            }
            return curr;
          });

          return updatedList;
        } else if (eventType === 'INSERT') {
          return [newRow, ...prevJogos];
        }
        return prevJogos;
      });
    });

    return () => {
      unsubscribe();
    };
  }, []);

  // Check every 30 seconds if midnight has rolled over (00:01) to auto-hide previous day's games
  useEffect(() => {
    const checkMidnight = () => {
      const today = getTodayDateString();
      if (today !== currentDateString) {
        setCurrentDateString(today);
        loadJogosDoDia(false, !autoHidePast);
      }
    };

    const intervalId = setInterval(checkMidnight, 30000);
    return () => clearInterval(intervalId);
  }, [currentDateString, autoHidePast]);

  useEffect(() => {
    // Check initial cached render for instantaneous display, filtering out past games
    const cached = localStorage.getItem('irunbets_supabase_jogos_do_dia');
    if (cached) {
      try {
        const parsed = JSON.parse(cached);
        if (Array.isArray(parsed) && parsed.length > 0) {
          const today = getTodayDateString();
          const validCached = parsed.map(normalizeJogoRecord).filter(j => !j.data || j.data >= today);
          if (validCached.length > 0) {
            setJogos(validCached);
            setLoading(false);
          }
        }
      } catch (e) {
        // ignore
      }
    }

    loadJogosDoDia();
  }, []);

  // Clock tick every 15s to dynamically advance live match minutes
  useEffect(() => {
    const clockInterval = setInterval(() => {
      setNowClock(new Date());
    }, 15000);
    return () => clearInterval(clockInterval);
  }, []);

  // NOTA: O polling forçado de 30 segundos e o refresh no window focus foram desativados
  // conforme solicitado pelo utilizador para eliminar refreshes indesejados.
  // Os jogos ao vivo são atualizados diretamente e silenciosamente em tempo real através do Supabase Realtime.

  // Compute unique leagues and counts (preserva histórico completo)
  const leaguesSummary = useMemo(() => {
    const map = new Map<string, number>();
    jogos.forEach((j) => {
      const l = j.liga?.trim() || 'Outras Ligas';
      map.set(l, (map.get(l) || 0) + 1);
    });
    return Array.from(map.entries()).sort((a, b) => b[1] - a[1]);
  }, [jogos]);

  // Compute unique dates for filtering (preserva histórico de ontem, antes de ontem e dias anteriores)
  const availableDates = useMemo(() => {
    const set = new Set<string>();
    jogos.forEach((j) => {
      if (j.data) set.add(j.data.trim());
    });
    return Array.from(set).sort();
  }, [jogos]);

  const todayGamesCount = useMemo(() => {
    return jogos.filter((j) => j.data === currentDateString).length;
  }, [jogos, currentDateString]);

  // Check if search requires relaxing league filter to prevent false empty results
  const searchStatus = useMemo(() => {
    const hasSearch = Boolean(searchTerm.trim());
    if (!hasSearch || selectedLeague === 'all') {
      return { hasSearch, leagueRelaxed: false };
    }

    // Check if the searched term yields any results inside the active league
    const matchesInLeague = jogos.some((j) => {
      if (j.liga !== selectedLeague) return false;
      return matchMatchesSearch(j, searchTerm);
    });

    // If 0 matches in current league, but matches exist in other leagues, relax league
    return {
      hasSearch,
      leagueRelaxed: !matchesInLeague
    };
  }, [jogos, searchTerm, selectedLeague]);

  // Pre-calculate live information for all games (synced with Supabase API + real-time clock)
  const liveGamesMap = useMemo(() => {
    const map = new Map<string, LiveMatchInfo>();
    const today = getTodayDateString();

    jogos.forEach((j, idx) => {
      const key = (j.jogo_id && String(j.jogo_id).trim()) 
        ? String(j.jogo_id).trim() 
        : `${j.data}_${j.hora}_${j.clube_casa}_vs_${j.clube_fora}`.replace(/\s+/g, '_').toLowerCase();

      // If simulated live mode is activated for demonstration during off-peak hours
      let simOverride: { isLive?: boolean; minute?: number } | undefined = undefined;
      if (simulatedLiveActive && (j.data === today || !j.data)) {
        if (idx % 2 === 0 || idx < 4) {
          const simMin = 18 + ((idx * 17) % 65);
          simOverride = { isLive: true, minute: simMin };
        }
      }

      const info = getMatchLiveInfo(j, simOverride, nowClock);
      map.set(key, info);
    });
    return map;
  }, [jogos, simulatedLiveActive, nowClock]);

  // Contagens em tempo real dos 3 estados: Ao Vivo, Terminados e Agendados
  const liveGamesCount = useMemo(() => {
    let count = 0;
    liveGamesMap.forEach((info) => {
      if (info.isLive) count++;
    });
    return count;
  }, [liveGamesMap]);

  const finishedGamesCount = useMemo(() => {
    let count = 0;
    liveGamesMap.forEach((info) => {
      if (info.isFinished || info.fase === 'Terminado') count++;
    });
    return count;
  }, [liveGamesMap]);

  const scheduledGamesCount = useMemo(() => {
    let count = 0;
    liveGamesMap.forEach((info) => {
      if (!info.isLive && !info.isFinished && info.fase !== 'Terminado') count++;
    });
    return count;
  }, [liveGamesMap]);

  // Count of games currently in Sinal Aberto (unlocked without login)
  const sinalAbertoCount = useMemo(() => {
    return jogos.filter((j) => {
      if (autoHidePast && j.data && j.data < currentDateString) return false;
      const key = (j.jogo_id && String(j.jogo_id).trim()) 
        ? String(j.jogo_id).trim() 
        : `${j.data}_${j.hora}_${j.clube_casa}_vs_${j.clube_fora}`.replace(/\s+/g, '_').toLowerCase();
      return unlockedIds.includes(key);
    }).length;
  }, [jogos, unlockedIds, autoHidePast, currentDateString]);

  // Filtered games
  const filteredJogos = useMemo(() => {
    const { hasSearch, leagueRelaxed } = searchStatus;

    return jogos.filter((j) => {
      const matchKey = (j.jogo_id && String(j.jogo_id).trim()) 
        ? String(j.jogo_id).trim() 
        : `${j.data}_${j.hora}_${j.clube_casa}_vs_${j.clube_fora}`.replace(/\s+/g, '_').toLowerCase();

      const liveInfo = liveGamesMap.get(matchKey);

      // 0. Filtros Rápidos de Estado: 🔴 Ao Vivo (IN_PLAY), ✅ Terminados (FINISHED), 📅 Agendados (SCHEDULED)
      if (statusFilter === 'live' || showLiveOnly) {
        if (!liveInfo || !liveInfo.isLive) {
          return false;
        }
      } else if (statusFilter === 'finished') {
        if (!liveInfo?.isFinished && liveInfo?.fase !== 'Terminado') {
          return false;
        }
      } else if (statusFilter === 'scheduled') {
        if (liveInfo?.isLive || liveInfo?.isFinished || liveInfo?.fase === 'Terminado') {
          return false;
        }
      }

      // 1. Regra Estrita Solicitada: Na listagem geral da tabela, mostrar APENAS os resultados do dia anterior (ontem) e jogos futuros limitados a 5 dias.
      // Os jogos com resultados passados das jornadas anteriores foram deslocados para a própria equipa (ver no pop-up ao clicar no clube).
      if (selectedDateFilter === 'all' && !hasSearch && statusFilter === 'all' && !showLiveOnly && !(selectedLeague !== 'all' && forceShowAllLeagueGames)) {
        if (j.data) {
          // Deslocar jogos de jornadas anteriores a ontem para a ficha da equipa
          if (j.data < yesterdayStr) {
            return false;
          }
          // Limitar jogos futuros estritamente a 5 dias
          if (j.data > maxFuture5DaysStr) {
            return false;
          }
        }
      }

      // Auto-hide games from previous days (>24h / yesterday) - apenas se autoHidePast for explicitamente ativado
      if (statusFilter !== 'live' && statusFilter !== 'finished' && !showLiveOnly && autoHidePast && selectedDateFilter === 'all' && j.data && j.data < currentDateString) {
        return false;
      }

      // 2. Search term (accent-insensitive, alias-aware, multi-token)
      if (hasSearch && !matchMatchesSearch(j, searchTerm)) {
        return false;
      }

      // 3. League filter (if search relaxed or viewing live with specific search, handle gracefully)
      if (selectedLeague !== 'all' && !leagueRelaxed) {
        if (j.liga !== selectedLeague) {
          return false;
        }
      }

      // 4. Date filter (se filtro ao vivo ou terminado estiver ativo, não restringir artificialmente)
      if (statusFilter === 'all' && !showLiveOnly && selectedDateFilter !== 'all') {
        if (j.data !== selectedDateFilter && !hasSearch) {
          return false;
        }
      }

      // 5. Sinal Aberto filter (show only games marked with seen/unlocked)
      if (showOnlySinalAberto) {
        if (!unlockedIds.includes(matchKey)) {
          return false;
        }
      }

      // 6. Janela Progressiva Flashscore de 8 dias para Jogos Futuros
      // Garante que métricas estatísticas fiquem calibradas e tabela não fique sobrecarregada
      // Se o utilizador pesquisar diretamente por um clube ou selecionar uma data específica no menu, exibe livremente
      if (selectedDateFilter === 'all' && !hasSearch && j.data && j.data > maxFutureDateString) {
        return false;
      }

      return true;
    });
  }, [jogos, selectedLeague, selectedDateFilter, searchTerm, autoHidePast, currentDateString, maxFutureDateString, searchStatus, showOnlySinalAberto, showLiveOnly, statusFilter, liveGamesMap, unlockedIds, forceShowAllLeagueGames]);

  // Contagem de jogos futuros além da janela atual de 8 dias (ocultados temporariamente até desbloqueio)
  const futureHiddenCount = useMemo(() => {
    if (selectedDateFilter !== 'all' || searchStatus.hasSearch) return 0;
    return jogos.filter((j) => j.data && j.data > maxFutureDateString).length;
  }, [jogos, selectedDateFilter, searchStatus.hasSearch, maxFutureDateString]);

  // Export clean Excel file (.xlsx) - Protegido por Licença Comercial / VIP (Regra Anti-Scraping)
  const handleExportToExcel = () => {
    // Se for Administrador ou utilizador com subscrição Pro Max / Tipster / Comercial autorizada
    const isCommercialAuthorized = isAdmin || 
      userSubscriptionStatus === 'Pro Max' || 
      userSubscriptionStatus === 'Tipster' || 
      userSubscriptionStatus === 'Empresarial';

    if (!isCommercialAuthorized) {
      setShowCommercialExportModal(true);
      return;
    }

    if (filteredJogos.length === 0) {
      alert('Não há jogos disponíveis para exportar.');
      return;
    }

    const rows = filteredJogos.map((j) => {
      const metrics = getCalibratedMatchMetrics(j);
      return {
        'ID': j.jogo_id,
        'Data': j.data || '',
        'Hora': j.hora || '',
        'Liga': j.liga || '',
        'Equipa Casa': j.clube_casa || '',
        'Equipa Fora': j.clube_fora || '',
        'Confronto': j.confronto || `${j.clube_casa} vs ${j.clube_fora}`,
        'Odd 1 (Casa)': metrics.odd1,
        'Odd X (Empate)': metrics.oddX,
        'Odd 2 (Fora)': metrics.odd2,
        'Previsão IA': metrics.seloIa,
        'Confiança IA (%)': `${metrics.confianca}%`,
        'Prob. Casa (%)': `${metrics.probCasa}%`,
        'Prob. Empate (%)': `${metrics.probEmpate}%`,
        'Prob. Fora (%)': `${metrics.probFora}%`,
        'Est. Cantos': metrics.cantosVal,
        'Est. Cartões': metrics.cartoesVal,
        'Valor Esperado': metrics.evVal,
        'Análise Quantitativa': metrics.textoAnalise,
        'Estado': j.estado || 'Agendado'
      };
    });

    const worksheet = XLSX.utils.json_to_sheet(rows);
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, 'Jogos do Dia');
    
    // Auto-fit columns
    const colWidths = [
      { wch: 38 }, // ID
      { wch: 12 }, // Data
      { wch: 8 },  // Hora
      { wch: 28 }, // Liga
      { wch: 20 }, // Casa
      { wch: 20 }, // Fora
      { wch: 35 }, // Confronto
      { wch: 12 }, // Odd 1
      { wch: 12 }, // Odd X
      { wch: 12 }, // Odd 2
      { wch: 24 }, // Previsao
      { wch: 15 }, // Confianca
      { wch: 15 }, // Prob Casa
      { wch: 15 }, // Prob Empate
      { wch: 15 }, // Prob Fora
      { wch: 12 }, // Cantos
      { wch: 12 }, // Cartoes
      { wch: 15 }, // EV
      { wch: 50 }, // Analise
      { wch: 12 }  // Estado
    ];
    worksheet['!cols'] = colWidths;

    const dateStr = new Date().toISOString().split('T')[0];
    XLSX.writeFile(workbook, `iRunBets_Jogos_do_Dia_${dateStr}.xlsx`);
  };

  // Copy match quantitative analysis to clipboard
  const handleCopyAnalysis = () => {
    if (!selectedMatch) return;
    const { jogo, metrics } = selectedMatch;
    const matchKey = (jogo.jogo_id && String(jogo.jogo_id).trim()) 
      ? String(jogo.jogo_id).trim() 
      : `${jogo.data}_${jogo.hora}_${jogo.clube_casa}_vs_${jogo.clube_fora}`.replace(/\s+/g, '_').toLowerCase();
    const isUnlocked = unlockedIds.includes(matchKey);
    const canView = isUserRegistered || isUnlocked;

    if (!canView) {
      const evt = new CustomEvent('open-auth-modal', { detail: { mode: 'register' } });
      window.dispatchEvent(evt);
      return;
    }

    const modules = metrics.engineModules;
    const text = `⚽ iRunBets IA - ELEVADOS PADRÕES DE PROBABILIDADE E TENDÊNCIAS\n` +
      `🏆 ${jogo.liga}\n` +
      `⚔️ ${jogo.confronto || `${jogo.clube_casa} vs ${jogo.clube_fora}`}\n` +
      `📅 ${jogo.data} às ${jogo.hora}\n\n` +
      `⚡ PADRÕES DE PROBABILIDADE & TENDÊNCIAS (5 MÓDULOS):\n` +
      `1️⃣ POISSON: xG ${modules?.modulo1_poisson?.xgHome} vs ${modules?.modulo1_poisson?.xgAway} (Total: ${modules?.modulo1_poisson?.totalXg}) | Over 2.5: ${modules?.modulo1_poisson?.overUnder25?.over}% | BTTS: ${modules?.modulo1_poisson?.btts?.yes}%\n` +
      `2️⃣ CLIMA & FÍSICO: ${modules?.modulo2_clima?.temperature} • Vento ${modules?.modulo2_clima?.windKmH}km/h • Relvado ${modules?.modulo2_clima?.pitchDimension} (${modules?.modulo2_clima?.pitchType})\n` +
      `3️⃣ FATOR DE REGRESSÃO: ${modules?.modulo3_fatorAngelo?.hasStreak5Plus ? `Alerta de Regressão Ativo (${modules?.modulo3_fatorAngelo?.teamWithStreak} ${modules?.modulo3_fatorAngelo?.streakCount} vitórias seguidas)` : 'Série Estável'}\n` +
      `4️⃣ JORNADA DUPLA: ${modules?.modulo4_jornadaDupla?.hasMatchWithin72h ? `Alerta de Fadiga (<72h de intervalo no 2.º jogo: ${modules?.modulo4_jornadaDupla?.fatiguedTeam})` : 'Descanso Total >120h'}\n` +
      `5️⃣ CO-OCORRÊNCIA: Análise de combinadas 4 a 13 seleções com deteção do Elo Mais Fraco\n\n` +
      `📊 PROBABILIDADES 1X2:\n` +
      `• Casa (${jogo.clube_casa}): ${metrics.probCasa}% (Odd ${metrics.odd1})\n` +
      `• Empate: ${metrics.probEmpate}% (Odd ${metrics.oddX})\n` +
      `• Fora (${jogo.clube_fora}): ${metrics.probFora}% (Odd ${metrics.odd2})\n\n` +
      `🎯 MÉTRICAS ESPECÍFICAS:\n` +
      `• Cantos Estimados: ${metrics.cantosVal}\n` +
      `• Cartões Estimados: ${metrics.cartoesVal}\n` +
      `• Valor Esperado: ${metrics.evVal}\n` +
      `• Nível de Confiança: ${metrics.confianca}%\n\n` +
      `💎 PALPITE RECOMENDADO: ${metrics.seloIa}\n` +
      `📝 JUSTIFICAÇÃO TÁCTICA: ${metrics.textoAnalise}\n\n` +
      `Aceda a https://irunbets.pt para mais prognósticos em tempo real.`;

    navigator.clipboard.writeText(text).then(() => {
      setCopiedToast(true);
      setTimeout(() => setCopiedToast(false), 3000);
    });
  };

  // Top popular leagues helper list
  const topLeagues = [
    { name: 'all', label: 'Todas as Ligas', flag: '🌍' },
    { name: 'Liga Portugal', label: 'Liga Portugal', flag: '🇵🇹' },
    { name: 'Premier League', label: 'Premier League', flag: '🏴󠁧󠁢󠁥󠁮󠁧󠁿' },
    { name: 'Primera Division', label: 'La Liga', flag: '🇪🇸' },
    { name: 'Serie A', label: 'Serie A', flag: '🇮🇹' },
    { name: 'Bundesliga', label: 'Bundesliga', flag: '🇩🇪' },
    { name: 'Ligue 1', label: 'Ligue 1', flag: '🇫🇷' },
    { name: 'Liga Profesional', label: 'Camp. Argentino', flag: '🇦🇷' },
    { name: 'Campeonato Brasileiro Série A', label: 'Brasileirão', flag: '🇧🇷' },
    { name: 'UEFA Champions League', label: 'Champions League', flag: '🏆' },
    { name: 'UEFA Europa League', label: 'Liga Europa', flag: '🟠' },
    { name: 'UEFA Europa Conference League', label: 'Liga Conferência', flag: '🟢' }
  ];

  // Dynamic cell padding based on Excel row density
  const rowPadding = rowDensity === 'compact'
    ? 'py-1.5 px-3'
    : rowDensity === 'spacious'
    ? 'py-4.5 px-5'
    : 'py-3 px-4';

  // Dynamic font sizing classes for table elements to ensure excellent readability
  const fontStyles = {
    header: tableFontSize === 'xlarge' 
      ? 'text-sm font-black tracking-wider' 
      : tableFontSize === 'large' 
      ? 'text-xs sm:text-[13px] font-black tracking-wider' 
      : tableFontSize === 'small'
      ? 'text-[10px] font-bold tracking-wider'
      : 'text-[11px] font-bold tracking-wider',
    rowIdx: tableFontSize === 'xlarge'
      ? 'text-sm font-black'
      : tableFontSize === 'large'
      ? 'text-xs font-bold'
      : tableFontSize === 'small'
      ? 'text-[10px] font-bold'
      : 'text-[11px] font-bold',
    date: tableFontSize === 'xlarge'
      ? 'text-base font-black'
      : tableFontSize === 'large'
      ? 'text-sm sm:text-[15px] font-bold'
      : tableFontSize === 'small'
      ? 'text-xs font-semibold'
      : 'text-xs sm:text-sm font-semibold',
    time: tableFontSize === 'xlarge'
      ? 'text-base font-black'
      : tableFontSize === 'large'
      ? 'text-sm sm:text-[14px] font-black'
      : tableFontSize === 'small'
      ? 'text-[11px] font-semibold'
      : 'text-xs font-bold',
    league: tableFontSize === 'xlarge'
      ? 'text-sm font-black px-3.5 py-1.5'
      : tableFontSize === 'large'
      ? 'text-xs sm:text-[13px] font-bold px-3 py-1'
      : tableFontSize === 'small'
      ? 'text-[10px] font-medium px-2 py-0.5'
      : 'text-xs font-semibold px-2.5 py-1',
    teams: tableFontSize === 'xlarge'
      ? 'text-base sm:text-lg lg:text-xl font-black'
      : tableFontSize === 'large'
      ? 'text-sm sm:text-base lg:text-[17px] font-black'
      : tableFontSize === 'small'
      ? 'text-xs sm:text-xs font-semibold'
      : 'text-xs sm:text-sm font-bold',
    vs: tableFontSize === 'xlarge'
      ? 'text-xs px-2 py-0.5'
      : tableFontSize === 'small'
      ? 'text-[9px] px-1 py-0.2'
      : 'text-[10px] px-1.5 py-0.5',
    oddBox: tableFontSize === 'xlarge'
      ? 'text-base sm:text-lg font-black py-2'
      : tableFontSize === 'large'
      ? 'text-sm sm:text-base font-black py-1.5'
      : tableFontSize === 'small'
      ? 'text-xs font-bold py-1'
      : 'text-xs sm:text-sm font-black py-1.5',
    oddProb: tableFontSize === 'xlarge'
      ? 'text-xs sm:text-sm font-black'
      : tableFontSize === 'large'
      ? 'text-[11px] sm:text-xs font-bold'
      : tableFontSize === 'small'
      ? 'text-[9px] font-normal'
      : 'text-[10px] font-bold',
    predBadge: tableFontSize === 'xlarge'
      ? 'text-sm sm:text-base font-black px-4 py-1.5'
      : tableFontSize === 'large'
      ? 'text-xs sm:text-sm font-black px-3.5 py-1'
      : tableFontSize === 'small'
      ? 'text-[10px] font-bold px-2 py-0.5'
      : 'text-xs font-bold px-3 py-1',
    predSub: tableFontSize === 'xlarge'
      ? 'text-xs font-black'
      : tableFontSize === 'large'
      ? 'text-[11px] font-bold'
      : tableFontSize === 'small'
      ? 'text-[9px]'
      : 'text-[10px] font-bold',
    predEv: tableFontSize === 'xlarge'
      ? 'text-xs font-black px-2.5 py-0.5'
      : tableFontSize === 'large'
      ? 'text-[11px] font-bold px-2 py-0.5'
      : tableFontSize === 'small'
      ? 'text-[8.5px] px-1.5 py-0.2'
      : 'text-[9px] font-bold px-2 py-0.2',
    actionBtn: tableFontSize === 'xlarge'
      ? 'text-sm sm:text-base font-black px-4 py-2.5'
      : tableFontSize === 'large'
      ? 'text-xs sm:text-sm font-black px-3.5 py-2'
      : tableFontSize === 'small'
      ? 'text-[10px] font-bold px-2 py-1'
      : 'text-xs font-bold px-3 py-1.5',
  };

  return (
    <div className="w-full max-w-full space-y-6 animate-fade-in text-zinc-100 font-sans pb-16">
      {/* Subpage Top Navigation: Tabela Geral de Jogos vs Apostas do Dia */}
      <div className="flex flex-wrap items-center gap-2 p-1.5 rounded-2xl bg-zinc-950/90 border border-zinc-800 shadow-xl backdrop-blur-md">
        <button
          type="button"
          onClick={() => {
            setMainSubpageTab('tabela');
            if (window.location.hash.includes('apostas-do-dia')) {
              window.location.hash = '#prognosticos-futebol';
            }
          }}
          className={`px-5 py-3 rounded-xl text-xs sm:text-sm font-mono font-black uppercase tracking-wider transition-all flex items-center gap-2.5 cursor-pointer ${
            mainSubpageTab === 'tabela'
              ? 'bg-zinc-100 text-black shadow-lg scale-[1.01]'
              : 'text-zinc-400 hover:text-white hover:bg-zinc-900'
          }`}
        >
          <span>⚽</span>
          <span>Tabela Geral de Jogos & Métricas</span>
          <span className={`px-2 py-0.5 rounded-md text-[10px] font-bold ${
            mainSubpageTab === 'tabela' ? 'bg-black/15 text-black' : 'bg-zinc-850 text-zinc-400'
          }`}>
            {jogos.length} Jogos
          </span>
        </button>

        <button
          type="button"
          onClick={() => {
            setMainSubpageTab('apostas-do-dia');
            window.location.hash = '#apostas-do-dia';
          }}
          className={`px-5 py-3 rounded-xl text-xs sm:text-sm font-mono font-black uppercase tracking-wider transition-all flex items-center gap-2.5 cursor-pointer ${
            mainSubpageTab === 'apostas-do-dia'
              ? 'bg-gradient-to-r from-orange-500 via-amber-500 to-yellow-500 text-black shadow-xl shadow-orange-500/20 scale-[1.01]'
              : 'text-orange-400 hover:text-orange-300 hover:bg-orange-500/10 border border-orange-500/30'
          }`}
        >
          <span>🎯</span>
          <span>Apostas do Dia (Tickets #1 a #6 • 3 Quadros)</span>
          <span className={`px-2 py-0.5 rounded-md text-[10px] font-bold ${
            mainSubpageTab === 'apostas-do-dia' ? 'bg-black/20 text-black' : 'bg-orange-500/20 text-orange-300'
          }`}>
            3 Quadros
          </span>
        </button>
      </div>

      {mainSubpageTab === 'apostas-do-dia' ? (
        <ApostasDoDiaSubpage
          jogos={jogos}
          isUserRegistered={isUserRegistered}
          isAdmin={isEffectiveAdmin}
          onOpenAuth={() => {
            window.dispatchEvent(new CustomEvent('irunbets_open_auth'));
          }}
          language={language}
        />
      ) : (
        <>
          {/* Header & Status Banner */}
          <div className="bg-gradient-to-br from-[#121216] via-[#16161d] to-[#0d0d12] border border-zinc-800 rounded-3xl p-6 sm:p-8 shadow-2xl relative overflow-hidden">
        <div className="absolute top-0 right-0 w-96 h-96 bg-gradient-to-bl from-orange-500/10 via-amber-500/5 to-transparent rounded-full blur-3xl pointer-events-none" />
        <div className="absolute top-0 left-0 w-64 h-64 bg-gradient-to-br from-cyan-500/10 via-blue-500/5 to-transparent rounded-full blur-2xl pointer-events-none" />

        <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-6">
          <div className="space-y-2.5">
            <div className="inline-flex items-center gap-2.5 px-3.5 py-1.5 rounded-full bg-emerald-950/80 border border-emerald-500/40 text-emerald-400 text-xs font-mono font-semibold tracking-wide">
              <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
              <span>Supabase Dados Reais em Tempo Real • Tabela: jogos & treinadores</span>
            </div>

            <h1 className="text-2xl sm:text-3xl lg:text-4xl font-black tracking-tight text-white flex items-center gap-3">
              <span>⚽ Prognósticos & Jogos do Dia</span>
            </h1>

            <p className="text-zinc-400 text-xs sm:text-sm max-w-2xl leading-relaxed">
              Tabela quantitativa calibrada em tempo real com probabilidades 1X2, estimativas de cantos e cartões,
              odds de valor estatístico (+EV) e justificações táticas da IA. Clique em qualquer jogo para abrir o relatório completo.
            </p>
          </div>

          {/* Quick Action Buttons */}
          <div className="flex flex-wrap items-center gap-2.5">
            <button
              type="button"
              onClick={() => loadJogosDoDia(true)}
              disabled={refreshing || loading}
              className="px-4 py-2.5 bg-zinc-900 hover:bg-zinc-800 border border-zinc-750 hover:border-zinc-600 rounded-xl text-xs font-mono font-bold text-zinc-200 transition-all flex items-center gap-2 cursor-pointer shadow-md disabled:opacity-50"
              title="Atualizar dados do Supabase"
            >
              <span className={refreshing ? 'animate-spin' : ''}>🔄</span>
              <span>{refreshing ? 'A sincronizar...' : 'Atualizar Dados'}</span>
            </button>

            <button
              type="button"
              onClick={handleExportToExcel}
              className="px-4 py-2.5 bg-gradient-to-r from-amber-600 via-emerald-600 to-teal-600 hover:from-amber-500 hover:to-teal-500 text-white rounded-xl text-xs font-mono font-bold tracking-wide transition-all flex items-center gap-2 cursor-pointer shadow-lg hover:shadow-emerald-500/20 active:scale-95 border border-amber-400/30"
              title="Exportar base de dados e métricas para Excel (Requer Licença Comercial / VIP)"
            >
              <span>💎</span>
              <span>Exportar Excel / API</span>
              <span className="bg-amber-400/20 text-amber-300 text-[10px] px-1.5 py-0.5 rounded border border-amber-400/40 uppercase">VIP / B2B</span>
            </button>
          </div>
        </div>

        {/* Real-time counters row */}
        <div className="mt-6 pt-5 border-t border-zinc-850/80 flex flex-wrap items-center justify-between gap-4 text-xs font-mono text-zinc-400">
          <div className="flex flex-wrap items-center gap-4">
            <span className="flex items-center gap-1.5">
              <strong className="text-white font-bold">{jogos.length}</strong> jogos disponíveis na base de dados
            </span>
            <span>•</span>
            <span className="flex items-center gap-1.5">
              <strong className="text-orange-400 font-bold">{filteredJogos.length}</strong> visíveis nos filtros atuais
            </span>
            <span>•</span>
            <span className="flex items-center gap-1.5">
              <strong className="text-cyan-400 font-bold">{leaguesSummary.length}</strong> ligas ativas
            </span>
            {selectedDateFilter === 'all' && !searchTerm && (
              <>
                <span>•</span>
                <span className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-md bg-amber-500/10 border border-amber-500/30 text-amber-300 text-[11px] font-mono">
                  <span>⏱️ Janela Futura:</span>
                  <strong>+ {visibleFutureDays} Dias (até {maxFutureDateString})</strong>
                  {futureHiddenCount > 0 && (
                    <span className="text-zinc-400 text-[10px]">({futureHiddenCount} ocultados)</span>
                  )}
                </span>
              </>
            )}
          </div>

          <div className="flex items-center gap-2 text-[11px] text-zinc-400">
            <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-emerald-950/40 border border-emerald-500/30 text-emerald-400 text-[10px] font-mono">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
              <span>🛡️ Proteção Anti-Scraping Ativa</span>
            </span>
            <span className="text-[11px] text-zinc-500 hidden sm:inline">•</span>
            <span className="text-[11px] text-zinc-500 hidden sm:inline">Servidor Seguro SSR</span>
          </div>
        </div>
      </div>

      {/* 3 Filtros Rápidos de Estado: 🔴 Ao Vivo (IN_PLAY), ✅ Terminados (FINISHED) e 📅 Agendados (SCHEDULED) */}
      <div className="bg-[#12131a] border border-zinc-800 rounded-2xl p-3 sm:p-4 shadow-xl flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-2">
          <div className="w-2 h-2 rounded-full bg-emerald-400 animate-ping" />
          <span className="text-xs font-mono font-black uppercase text-zinc-300 tracking-wider">
            Filtros Rápidos em Tempo Real:
          </span>
          <span className="hidden sm:inline text-[10px] font-mono text-zinc-400 px-2 py-0.5 rounded-full bg-zinc-900 border border-zinc-800">
            📡 Supabase Realtime (jogos)
          </span>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          {/* Todos */}
          <button
            type="button"
            onClick={() => {
              setStatusFilter('all');
              setShowLiveOnly(false);
            }}
            className={`px-3.5 py-2 rounded-xl text-xs font-mono font-bold transition-all flex items-center gap-2 cursor-pointer border ${
              statusFilter === 'all' && !showLiveOnly
                ? 'bg-zinc-100 text-black border-white shadow-md scale-[1.02]'
                : 'bg-zinc-900/90 hover:bg-zinc-800 text-zinc-300 border-zinc-800'
            }`}
          >
            <span>🌐 Todos</span>
            <span className={`px-1.5 py-0.2 rounded text-[10px] font-black ${
              statusFilter === 'all' && !showLiveOnly ? 'bg-black/20 text-black' : 'bg-zinc-800 text-zinc-400'
            }`}>
              {jogos.length}
            </span>
          </button>

          {/* 🔴 Ao Vivo (IN_PLAY) */}
          <button
            type="button"
            onClick={() => {
              const next = statusFilter === 'live' ? 'all' : 'live';
              setStatusFilter(next);
              setShowLiveOnly(next === 'live');
            }}
            className={`px-3.5 py-2 rounded-xl text-xs font-mono font-bold tracking-wide transition-all flex items-center gap-2 cursor-pointer border ${
              statusFilter === 'live' || showLiveOnly
                ? 'bg-gradient-to-r from-red-600 to-rose-600 text-white border-red-400 shadow-lg shadow-red-600/30 scale-[1.03]'
                : liveGamesCount > 0
                ? 'bg-red-950/70 hover:bg-red-900/80 text-red-300 border-red-500/50 animate-pulse'
                : 'bg-zinc-900/90 hover:bg-zinc-800 text-zinc-400 border-zinc-800'
            }`}
            title="Mostrar apenas jogos em direto a decorrer neste momento (IN_PLAY)"
          >
            <span className="relative flex h-2.5 w-2.5">
              <span className={`animate-ping absolute inline-flex h-full w-full rounded-full ${liveGamesCount > 0 ? 'bg-red-400' : 'bg-zinc-500'} opacity-75`} />
              <span className={`relative inline-flex rounded-full h-2.5 w-2.5 ${liveGamesCount > 0 ? 'bg-red-500' : 'bg-zinc-600'}`} />
            </span>
            <span>🔴 Ao Vivo</span>
            <span className="text-[10px] px-1.5 py-0.2 rounded font-black bg-black/40 text-white">
              {liveGamesCount}
            </span>
          </button>

          {/* ✅ Terminados (FINISHED) */}
          <button
            type="button"
            onClick={() => {
              setStatusFilter(statusFilter === 'finished' ? 'all' : 'finished');
              setShowLiveOnly(false);
            }}
            className={`px-3.5 py-2 rounded-xl text-xs font-mono font-bold tracking-wide transition-all flex items-center gap-2 cursor-pointer border ${
              statusFilter === 'finished'
                ? 'bg-gradient-to-r from-emerald-600 to-teal-600 text-white border-emerald-400 shadow-lg shadow-emerald-600/30 scale-[1.03]'
                : 'bg-zinc-900/90 hover:bg-zinc-800 text-zinc-300 border-zinc-800'
            }`}
            title="Mostrar apenas jogos já terminados com resultado final (FINISHED)"
          >
            <span>✅ Terminados</span>
            <span className="text-[10px] px-1.5 py-0.2 rounded font-black bg-black/40 text-emerald-400">
              {finishedGamesCount}
            </span>
          </button>

          {/* 📅 Agendados (SCHEDULED) */}
          <button
            type="button"
            onClick={() => {
              setStatusFilter(statusFilter === 'scheduled' ? 'all' : 'scheduled');
              setShowLiveOnly(false);
            }}
            className={`px-3.5 py-2 rounded-xl text-xs font-mono font-bold tracking-wide transition-all flex items-center gap-2 cursor-pointer border ${
              statusFilter === 'scheduled'
                ? 'bg-gradient-to-r from-blue-600 to-cyan-600 text-white border-blue-400 shadow-lg shadow-blue-600/30 scale-[1.03]'
                : 'bg-zinc-900/90 hover:bg-zinc-800 text-zinc-300 border-zinc-800'
            }`}
            title="Mostrar apenas jogos agendados que ainda não começaram (SCHEDULED)"
          >
            <span>📅 Agendados</span>
            <span className="text-[10px] px-1.5 py-0.2 rounded font-black bg-black/40 text-cyan-400">
              {scheduledGamesCount}
            </span>
          </button>

          {/* Separador de Data / Histórico */}
          <div className="h-6 w-px bg-zinc-800 hidden sm:block" />

          {/* 📅 Todas as Datas */}
          <button
            type="button"
            onClick={() => setSelectedDateFilter('all')}
            className={`px-3 py-2 rounded-xl text-xs font-mono font-bold transition-all flex items-center gap-1.5 cursor-pointer border ${
              selectedDateFilter === 'all'
                ? 'bg-zinc-800 text-white border-zinc-600 shadow-sm'
                : 'bg-zinc-900/70 hover:bg-zinc-800 text-zinc-400 border-zinc-850'
            }`}
            title="Ver jogos de todas as datas disponíveis no banco de dados"
          >
            <span>🗓️ Todas Datas</span>
          </button>

          {/* ⏪ Ontem (Resultados Finais Registados) */}
          <button
            type="button"
            onClick={() => {
              setSelectedDateFilter(selectedDateFilter === yesterdayStr ? 'all' : yesterdayStr);
              setStatusFilter('all');
              setShowLiveOnly(false);
            }}
            className={`px-3 py-2 rounded-xl text-xs font-mono font-bold transition-all flex items-center gap-1.5 cursor-pointer border ${
              selectedDateFilter === yesterdayStr
                ? 'bg-gradient-to-r from-amber-600 to-amber-700 text-white border-amber-400 shadow-lg shadow-amber-600/30 scale-[1.02]'
                : 'bg-zinc-900/90 hover:bg-zinc-800 text-amber-300/90 border-amber-500/30'
            }`}
            title="Ver histórico de jogos de ontem com resultados finais e placares registados"
          >
            <span>⏪ Ontem</span>
          </button>

          {/* ⭐ Hoje */}
          <button
            type="button"
            onClick={() => {
              setSelectedDateFilter(selectedDateFilter === currentDateString ? 'all' : currentDateString);
              setStatusFilter('all');
              setShowLiveOnly(false);
            }}
            className={`px-3 py-2 rounded-xl text-xs font-mono font-bold transition-all flex items-center gap-1.5 cursor-pointer border ${
              selectedDateFilter === currentDateString
                ? 'bg-gradient-to-r from-orange-600 to-amber-600 text-white border-orange-400 shadow-lg shadow-orange-600/30 scale-[1.02]'
                : 'bg-zinc-900/90 hover:bg-zinc-800 text-orange-300/90 border-orange-500/30'
            }`}
            title="Ver jogos agendados e a decorrer hoje"
          >
            <span>⭐ Hoje</span>
          </button>

          {/* ⚡ Janela de 8 Dias (Estilo Flashscore) */}
          <button
            type="button"
            onClick={() => {
              setSelectedDateFilter('all');
              setVisibleFutureDays(8);
            }}
            className={`px-3 py-2 rounded-xl text-xs font-mono font-bold transition-all flex items-center gap-1.5 cursor-pointer border ${
              selectedDateFilter === 'all' && visibleFutureDays === 8
                ? 'bg-gradient-to-r from-amber-500 to-orange-500 text-black font-black border-amber-300 shadow-lg shadow-amber-500/20 scale-[1.02]'
                : 'bg-zinc-900/90 hover:bg-zinc-800 text-amber-300 border-amber-500/30'
            }`}
            title="Janela padrão recomendada: Próximos 8 dias com métricas estatísticas calibradas e dados protegidos"
          >
            <span>⚡ Próximos 8 Dias</span>
          </button>
        </div>
      </div>

      {/* Quick League Filter Chips */}
      <div className="flex flex-wrap items-center gap-2 py-1 overflow-x-auto scrollbar-thin">
        {/* Quick AO VIVO Live Chip */}
        <button
          type="button"
          onClick={() => setShowLiveOnly(!showLiveOnly)}
          className={`px-3.5 py-2 rounded-xl text-xs font-mono font-bold tracking-wide transition-all flex items-center gap-2 whitespace-nowrap cursor-pointer border ${
            showLiveOnly
              ? 'bg-gradient-to-r from-red-600 to-rose-600 border-red-400 text-white shadow-lg shadow-red-600/30 scale-[1.03]'
              : liveGamesCount > 0
              ? 'bg-red-950/70 border-red-500/60 text-red-300 hover:bg-red-900/80 animate-pulse'
              : 'bg-zinc-900/90 border-zinc-800 text-zinc-400 hover:text-zinc-200'
          }`}
          title="Ver jogos em direto (Ao Vivo) com estatísticas atualizadas em tempo real via Supabase"
        >
          <span className="relative flex h-2.5 w-2.5">
            <span className={`animate-ping absolute inline-flex h-full w-full rounded-full ${liveGamesCount > 0 ? 'bg-red-400' : 'bg-zinc-500'} opacity-75`} />
            <span className={`relative inline-flex rounded-full h-2.5 w-2.5 ${liveGamesCount > 0 ? 'bg-red-500' : 'bg-zinc-600'}`} />
          </span>
          <span className="uppercase font-black">Ao Vivo</span>
          <span className={`px-1.5 py-0.2 rounded-md text-[10px] font-black ${
            showLiveOnly ? 'bg-white/20 text-white' : 'bg-black/40 text-red-400'
          }`}>
            {liveGamesCount}
          </span>
        </button>

        {topLeagues.map((item) => {
          const matchedSummary = item.name === 'all' 
            ? null 
            : leaguesSummary.find(l => l[0] === item.name || l[0].toLowerCase().includes(item.name.toLowerCase()));
          const count = item.name === 'all' 
            ? jogos.length 
            : (matchedSummary?.[1] || 0);
          const isSelected = item.name === 'all' 
            ? selectedLeague === 'all' 
            : (selectedLeague === item.name || (matchedSummary && selectedLeague === matchedSummary[0]));

          if (item.name !== 'all' && count === 0) return null;

          return (
            <button
              key={item.name}
              type="button"
              onClick={() => {
                const targetL = matchedSummary ? matchedSummary[0] : item.name;
                setSelectedLeague(targetL);
                setLeagueViewTab('standings');
                setForceShowAllLeagueGames(false);
              }}
              className={`px-3 py-2 rounded-xl text-xs font-mono font-bold tracking-wide transition-all flex items-center gap-2 whitespace-nowrap cursor-pointer ${
                isSelected
                  ? 'bg-gradient-to-r from-orange-500 to-amber-500 text-black shadow-lg shadow-orange-500/20 scale-[1.02]'
                  : 'bg-zinc-900/90 hover:bg-zinc-800 text-zinc-300 border border-zinc-800 hover:border-zinc-700'
              }`}
            >
              <span>{item.flag}</span>
              <span>{item.label}</span>
              <span className={`px-1.5 py-0.2 rounded-md text-[10px] font-extrabold ${
                isSelected ? 'bg-black/30 text-black' : 'bg-zinc-800 text-zinc-400'
              }`}>
                {count}
              </span>
            </button>
          );
        })}
      </div>

      {/* Control Bar: Search & League Dropdown & Date Filter & Auto-Hide 24h */}
      <div className="bg-[#121216]/95 border border-zinc-800 rounded-2xl p-4 shadow-xl space-y-3">
        <div className="flex flex-wrap items-center justify-between gap-4">
          {/* Search input with live match counter */}
          <div className="relative flex-1 min-w-[280px]">
            <span className="absolute left-3.5 top-1/2 -translate-y-1/2 text-zinc-500 text-sm">🔍</span>
            <input
              type="text"
              placeholder="Pesquisar clube (ex: Sporting, Benfica, Real Madrid, Porto, Arsenal)..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full bg-zinc-950 border border-zinc-800 focus:border-orange-500 rounded-xl pl-10 pr-24 py-2.5 text-xs text-white placeholder-zinc-500 focus:outline-none transition-all font-mono shadow-inner"
            />
            {searchTerm && (
              <div className="absolute right-2.5 top-1/2 -translate-y-1/2 flex items-center gap-1.5">
                <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-orange-950/80 border border-orange-500/40 text-orange-300 font-bold">
                  {filteredJogos.length} {filteredJogos.length === 1 ? 'jogo' : 'jogos'}
                </span>
                <button
                  type="button"
                  onClick={() => setSearchTerm('')}
                  className="text-zinc-400 hover:text-white text-xs font-bold p-1 cursor-pointer"
                  title="Limpar pesquisa"
                >
                  ✕
                </button>
              </div>
            )}
          </div>

          {/* Controls: League, Date & Auto-Hide */}
          <div className="flex items-center gap-2 flex-wrap">
            {/* All Leagues Select Dropdown */}
            <div className="relative">
              <select
                value={selectedLeague}
                onChange={(e) => {
                  setSelectedLeague(e.target.value);
                  setLeagueViewTab('standings');
                  setForceShowAllLeagueGames(false);
                }}
                className="bg-zinc-950 border border-zinc-800 hover:border-zinc-700 text-zinc-200 text-xs font-mono font-bold rounded-xl px-3 py-2.5 focus:outline-none focus:border-orange-500 cursor-pointer shadow-sm pr-8"
              >
                <option value="all">🏆 Todas as Ligas ({jogos.length})</option>
                {leaguesSummary.map(([ligaName, count]) => (
                  <option key={ligaName} value={ligaName}>
                    {ligaName} ({count})
                  </option>
                ))}
              </select>
            </div>

            {/* Botão para Ver Classificação do Campeonato Selecionado */}
            {selectedLeague !== 'all' && (
              <button
                type="button"
                onClick={() => setTeamModalState({
                  isOpen: true,
                  leagueName: selectedLeague,
                  teamName: undefined
                })}
                className="px-3 py-2 rounded-xl text-xs font-mono font-bold transition-all flex items-center gap-1.5 cursor-pointer border bg-gradient-to-r from-amber-500/20 to-orange-500/20 hover:from-amber-500/30 hover:to-orange-500/30 border-amber-500/50 text-amber-300 shadow-sm active:scale-95"
                title={`Ver Tabela Classificativa e Estatísticas Completas de ${selectedLeague}`}
              >
                <span>🏆</span>
                <span>Classificação {selectedLeague}</span>
              </button>
            )}

            {/* Date Filter */}
            <div className="relative">
              <select
                value={selectedDateFilter}
                onChange={(e) => setSelectedDateFilter(e.target.value)}
                className="bg-zinc-950 border border-amber-500/40 hover:border-amber-400 text-amber-300 text-xs font-mono font-bold rounded-xl px-3 py-2.5 focus:outline-none focus:border-orange-500 cursor-pointer shadow-sm pr-8"
              >
                <option value={currentDateString} className="font-bold text-amber-300 bg-zinc-950">
                  ⭐ HOJE ({currentDateString}) {todayGamesCount > 0 ? `(${todayGamesCount})` : '(0 Jogos)'}
                </option>
                <option value="all" className="text-zinc-200 bg-zinc-950">
                  📅 Todas as Datas ({availableDates.length})
                </option>
                {availableDates.filter(d => d !== currentDateString).map((dateStr) => {
                  const label = getDateLabel(dateStr);
                  return (
                    <option key={dateStr} value={dateStr} className="text-zinc-300 bg-zinc-950">
                      {label}
                    </option>
                  );
                })}
              </select>
            </div>

            {/* Ao Vivo / Live Filter Toggle */}
            <button
              type="button"
              onClick={() => setShowLiveOnly(!showLiveOnly)}
              className={`px-3 py-2 rounded-xl text-xs font-mono font-bold transition-all flex items-center gap-2 cursor-pointer border ${
                showLiveOnly
                  ? 'bg-gradient-to-r from-red-600 to-rose-600 border-red-400 text-white shadow-lg shadow-red-600/30 scale-[1.02]'
                  : liveGamesCount > 0
                  ? 'bg-red-950/50 border-red-500/50 text-red-300 hover:bg-red-900/60 animate-pulse'
                  : 'bg-zinc-900 border-zinc-800 text-zinc-400 hover:bg-zinc-850 hover:text-zinc-200'
              }`}
              title="Filtrar apenas jogos a decorrer em direto (AO VIVO) com estatísticas sincronizadas via API Supabase"
            >
              <span className="relative flex h-2 w-2">
                <span className={`animate-ping absolute inline-flex h-full w-full rounded-full ${liveGamesCount > 0 ? 'bg-red-400' : 'bg-zinc-500'} opacity-75`} />
                <span className={`relative inline-flex rounded-full h-2 w-2 ${liveGamesCount > 0 ? 'bg-red-500' : 'bg-zinc-600'}`} />
              </span>
              <span className="uppercase font-black">Ao Vivo</span>
              <span className={`px-1.5 py-0.2 rounded text-[10px] font-black ${
                showLiveOnly ? 'bg-white/20 text-white' : 'bg-black/50 text-red-400'
              }`}>
                {liveGamesCount}
              </span>
            </button>

            {/* Sinal Aberto Filter Toggle */}
            <button
              type="button"
              onClick={() => setShowOnlySinalAberto(!showOnlySinalAberto)}
              className={`px-3 py-2 rounded-xl text-xs font-mono font-bold transition-all flex items-center gap-1.5 cursor-pointer border ${
                showOnlySinalAberto
                  ? 'bg-emerald-500 border-emerald-400 text-black shadow-lg shadow-emerald-500/20'
                  : 'bg-emerald-950/40 border-emerald-500/40 text-emerald-300 hover:bg-emerald-900/50'
              }`}
              title="Filtrar apenas jogos em Sinal Aberto (com visto e acesso livre sem login)"
            >
              <span>🔓</span>
              <span>Sinal Aberto ({sinalAbertoCount})</span>
            </button>

            {/* Auto-Hide Past Games Toggle */}
            <button
              type="button"
              onClick={() => {
                const nextState = !autoHidePast;
                setAutoHidePast(nextState);
                loadJogosDoDia(true, !nextState);
              }}
              className={`px-3 py-2 rounded-xl text-xs font-mono font-bold transition-all flex items-center gap-1.5 cursor-pointer border ${
                autoHidePast
                  ? 'bg-emerald-950/60 border-emerald-500/50 text-emerald-300 hover:bg-emerald-900/60'
                  : 'bg-zinc-900 border-zinc-750 text-zinc-400 hover:bg-zinc-800 hover:text-zinc-200'
              }`}
              title="Quando ativo, jogos de dias anteriores (>24h) são automaticamente ocultados à meia-noite (00:01)"
            >
              <span>{autoHidePast ? '✓' : '○'}</span>
              <span>Auto-ocultar &gt;24h</span>
            </button>

            {/* Seletor de Tamanho da Letra (A-, A+, Pequeno, Normal, Grande, X-Grande) */}
            <div className="flex items-center gap-1 bg-zinc-900 border border-zinc-750 p-1 rounded-xl shadow-sm">
              <span className="text-[11px] font-mono font-bold text-zinc-400 px-1.5 flex items-center gap-1 select-none" title="Ajustar tamanho da letra da tabela">
                <span>🔤</span>
                <span>Letra:</span>
              </span>
              <button
                type="button"
                onClick={() => handleStepFontSize('down')}
                className="w-6 h-6 flex items-center justify-center rounded bg-zinc-800 hover:bg-zinc-700 text-zinc-200 font-mono font-bold text-xs cursor-pointer"
                title="Diminuir tamanho da letra (A-)"
              >
                A-
              </button>
              <button
                type="button"
                onClick={() => handleStepFontSize('up')}
                className="w-6 h-6 flex items-center justify-center rounded bg-zinc-800 hover:bg-zinc-700 text-zinc-200 font-mono font-bold text-xs cursor-pointer"
                title="Aumentar tamanho da letra (A+)"
              >
                A+
              </button>
              <button
                type="button"
                onClick={() => handleSetFontSize('small')}
                className={`px-2 py-1 rounded-lg text-[10px] font-mono font-bold transition-all cursor-pointer ${
                  tableFontSize === 'small'
                    ? 'bg-orange-500 text-black shadow-md font-black'
                    : 'text-zinc-400 hover:text-white hover:bg-zinc-800'
                }`}
                title="Letra Pequena (Para caber mais conteúdo)"
              >
                Pequena
              </button>
              <button
                type="button"
                onClick={() => handleSetFontSize('normal')}
                className={`px-2 py-1 rounded-lg text-xs font-mono font-bold transition-all cursor-pointer ${
                  tableFontSize === 'normal'
                    ? 'bg-orange-500 text-black shadow-md font-black'
                    : 'text-zinc-400 hover:text-white hover:bg-zinc-800'
                }`}
                title="Tamanho de letra Padrão (Médio)"
              >
                Normal
              </button>
              <button
                type="button"
                onClick={() => handleSetFontSize('large')}
                className={`px-2 py-1 rounded-lg text-xs font-mono transition-all cursor-pointer ${
                  tableFontSize === 'large'
                    ? 'bg-orange-500 text-black shadow-md font-black'
                    : 'text-zinc-400 hover:text-white hover:bg-zinc-800 font-bold'
                }`}
                title="Tamanho de letra Grande (Recomendado)"
              >
                Grande
              </button>
              <button
                type="button"
                onClick={() => handleSetFontSize('xlarge')}
                className={`px-2 py-1 rounded-lg text-xs font-mono transition-all cursor-pointer ${
                  tableFontSize === 'xlarge'
                    ? 'bg-orange-500 text-black shadow-md font-black'
                    : 'text-zinc-400 hover:text-white hover:bg-zinc-800 font-bold'
                }`}
                title="Tamanho de letra Muito Grande"
              >
                X-Grande
              </button>
            </div>

            {/* Seletor de Densidade de Linhas (Excel: Compacto / Normal / Amplo) */}
            <div className="flex items-center gap-1 bg-zinc-900 border border-zinc-750 p-1 rounded-xl shadow-sm">
              <span className="text-[11px] font-mono font-bold text-zinc-400 px-1.5 flex items-center gap-1 select-none" title="Ajustar altura das linhas da tabela como no Excel">
                <span>📏</span>
                <span>Linhas:</span>
              </span>
              <button
                type="button"
                onClick={() => handleSetRowDensity('compact')}
                className={`px-2 py-1 rounded-lg text-xs font-mono font-bold transition-all cursor-pointer ${
                  rowDensity === 'compact'
                    ? 'bg-cyan-500 text-black shadow-md font-black'
                    : 'text-zinc-400 hover:text-white hover:bg-zinc-800'
                }`}
                title="Linhas Compactas (Estilo Excel - permite ver dezenas de jogos no ecrã)"
              >
                Compacto
              </button>
              <button
                type="button"
                onClick={() => handleSetRowDensity('normal')}
                className={`px-2 py-1 rounded-lg text-xs font-mono font-bold transition-all cursor-pointer ${
                  rowDensity === 'normal'
                    ? 'bg-cyan-500 text-black shadow-md font-black'
                    : 'text-zinc-400 hover:text-white hover:bg-zinc-800'
                }`}
                title="Linhas Normais"
              >
                Normal
              </button>
              <button
                type="button"
                onClick={() => handleSetRowDensity('spacious')}
                className={`px-2 py-1 rounded-lg text-xs font-mono font-bold transition-all cursor-pointer ${
                  rowDensity === 'spacious'
                    ? 'bg-cyan-500 text-black shadow-md font-black'
                    : 'text-zinc-400 hover:text-white hover:bg-zinc-800'
                }`}
                title="Linhas Espaçosas"
              >
                Amplo
              </button>
            </div>

            {/* Botão Personalizar Colunas e Escala da Tabela (Excel) */}
            <div className="relative">
              <button
                type="button"
                onClick={() => setShowExcelSettings(!showExcelSettings)}
                className={`px-3 py-2 rounded-xl text-xs font-mono font-bold transition-all flex items-center gap-1.5 cursor-pointer border ${
                  showExcelSettings
                    ? 'bg-amber-500 text-black border-amber-400 shadow-md'
                    : 'bg-zinc-900 border-zinc-750 text-zinc-300 hover:bg-zinc-800'
                }`}
                title="Personalizar colunas visíveis e largura da tabela na página"
              >
                <span>⚙️</span>
                <span>Ajustar Tabela (Excel)</span>
              </button>

              {/* Popover de personalização de colunas e escala */}
              {showExcelSettings && (
                <div className="absolute right-0 top-full mt-2 w-72 bg-[#121626] border border-amber-500/50 rounded-2xl p-4 shadow-2xl z-40 space-y-3 font-mono text-xs animate-fade-in">
                  <div className="flex items-center justify-between border-b border-zinc-800 pb-2">
                    <strong className="text-white flex items-center gap-1.5">
                      <span>⚙️</span>
                      <span>Configurações Excel</span>
                    </strong>
                    <button
                      type="button"
                      onClick={() => setShowExcelSettings(false)}
                      className="text-zinc-400 hover:text-white text-xs font-bold"
                    >
                      ✕
                    </button>
                  </div>

                  {/* Escala / Largura das Colunas */}
                  <div className="space-y-1.5">
                    <span className="text-[10px] text-zinc-400 uppercase tracking-wider block">
                      Largura das Colunas: {columnScale}%
                    </span>
                    <div className="flex items-center gap-1">
                      {[85, 100, 115, 130].map((scale) => (
                        <button
                          key={scale}
                          type="button"
                          onClick={() => setColumnScale(scale)}
                          className={`flex-1 py-1 rounded text-[10px] font-bold border ${
                            columnScale === scale
                              ? 'bg-amber-500 text-black border-amber-400'
                              : 'bg-zinc-900 border-zinc-800 text-zinc-400 hover:text-white'
                          }`}
                        >
                          {scale}%
                        </button>
                      ))}
                    </div>
                  </div>

                  {/* Ativar/Desativar Colunas Individuais */}
                  <div className="space-y-1 border-t border-zinc-800 pt-2">
                    <span className="text-[10px] text-zinc-400 uppercase tracking-wider block mb-1">
                      Colunas Visíveis:
                    </span>
                    <label className="flex items-center justify-between text-zinc-300 hover:text-white cursor-pointer py-0.5">
                      <span>☑ Boletim Múltiplas</span>
                      <input
                        type="checkbox"
                        checked={visibleColumns.multipla}
                        onChange={(e) => setVisibleColumns(prev => ({ ...prev, multipla: e.target.checked }))}
                        className="rounded border-zinc-700 text-amber-500 focus:ring-0"
                      />
                    </label>
                    <label className="flex items-center justify-between text-zinc-300 hover:text-white cursor-pointer py-0.5">
                      <span>🔓 Sinal Aberto</span>
                      <input
                        type="checkbox"
                        checked={visibleColumns.sinalAberto}
                        onChange={(e) => setVisibleColumns(prev => ({ ...prev, sinalAberto: e.target.checked }))}
                        className="rounded border-zinc-700 text-amber-500 focus:ring-0"
                      />
                    </label>
                    <label className="flex items-center justify-between text-zinc-300 hover:text-white cursor-pointer py-0.5">
                      <span>📅 Data do Jogo</span>
                      <input
                        type="checkbox"
                        checked={visibleColumns.data}
                        onChange={(e) => setVisibleColumns(prev => ({ ...prev, data: e.target.checked }))}
                        className="rounded border-zinc-700 text-amber-500 focus:ring-0"
                      />
                    </label>
                    <label className="flex items-center justify-between text-zinc-300 hover:text-white cursor-pointer py-0.5">
                      <span>⏱️ Estado / Hora</span>
                      <input
                        type="checkbox"
                        checked={visibleColumns.hora}
                        onChange={(e) => setVisibleColumns(prev => ({ ...prev, hora: e.target.checked }))}
                        className="rounded border-zinc-700 text-amber-500 focus:ring-0"
                      />
                    </label>
                    <label className="flex items-center justify-between text-zinc-300 hover:text-white cursor-pointer py-0.5">
                      <span>🏆 Liga</span>
                      <input
                        type="checkbox"
                        checked={visibleColumns.liga}
                        onChange={(e) => setVisibleColumns(prev => ({ ...prev, liga: e.target.checked }))}
                        className="rounded border-zinc-700 text-amber-500 focus:ring-0"
                      />
                    </label>
                    <label className="flex items-center justify-between text-zinc-300 hover:text-white cursor-pointer py-0.5">
                      <span>⚔️ Confronto &amp; Placar</span>
                      <input
                        type="checkbox"
                        checked={visibleColumns.confronto}
                        onChange={(e) => setVisibleColumns(prev => ({ ...prev, confronto: e.target.checked }))}
                        className="rounded border-zinc-700 text-amber-500 focus:ring-0"
                      />
                    </label>
                    <label className="flex items-center justify-between text-zinc-300 hover:text-white cursor-pointer py-0.5">
                      <span>📊 Odds (1 - X - 2)</span>
                      <input
                        type="checkbox"
                        checked={visibleColumns.odds}
                        onChange={(e) => setVisibleColumns(prev => ({ ...prev, odds: e.target.checked }))}
                        className="rounded border-zinc-700 text-amber-500 focus:ring-0"
                      />
                    </label>
                    <label className="flex items-center justify-between text-zinc-300 hover:text-white cursor-pointer py-0.5">
                      <span>💎 Previsão SuperIA</span>
                      <input
                        type="checkbox"
                        checked={visibleColumns.previsao}
                        onChange={(e) => setVisibleColumns(prev => ({ ...prev, previsao: e.target.checked }))}
                        className="rounded border-zinc-700 text-amber-500 focus:ring-0"
                      />
                    </label>
                    <label className="flex items-center justify-between text-zinc-300 hover:text-white cursor-pointer py-0.5">
                      <span>🔍 Ações &amp; Métricas</span>
                      <input
                        type="checkbox"
                        checked={visibleColumns.metricas}
                        onChange={(e) => setVisibleColumns(prev => ({ ...prev, metricas: e.target.checked }))}
                        className="rounded border-zinc-700 text-amber-500 focus:ring-0"
                      />
                    </label>
                  </div>

                  <button
                    type="button"
                    onClick={() => {
                      setVisibleColumns({
                        multipla: true,
                        sinalAberto: true,
                        data: true,
                        hora: true,
                        liga: true,
                        confronto: true,
                        odds: true,
                        previsao: true,
                        metricas: true
                      });
                      setColumnScale(100);
                      handleSetRowDensity('normal');
                      handleSetFontSize('large');
                    }}
                    className="w-full py-1.5 text-center text-[10px] text-zinc-400 hover:text-white bg-zinc-900 border border-zinc-800 rounded-lg hover:bg-zinc-800 transition-colors"
                  >
                    Restaurar Configurações Originais
                  </button>
                </div>
              )}
            </div>

            {/* Reset Filters button */}
            {(selectedLeague !== 'all' || selectedDateFilter !== 'all' || searchTerm) && (
              <button
                type="button"
                onClick={() => {
                  setSelectedLeague('all');
                  setSelectedDateFilter('all');
                  setSearchTerm('');
                }}
                className="px-3 py-2 bg-zinc-800 hover:bg-zinc-700 text-zinc-300 text-xs font-mono rounded-xl transition-all cursor-pointer shadow-sm"
              >
                Limpar Filtros
              </button>
            )}
          </div>
        </div>

        {/* Dynamic notice if search relaxed league filter */}
        {searchStatus.hasSearch && searchStatus.leagueRelaxed && selectedLeague !== 'all' && (
          <div className="pt-2 border-t border-zinc-850 flex items-center justify-between text-xs font-mono text-amber-300 bg-amber-950/20 px-3 py-1.5 rounded-lg border border-amber-500/20">
            <span className="flex items-center gap-1.5">
              <span>⚡</span>
              <span>A pesquisar em todas as ligas (o clube <strong>"{searchTerm}"</strong> não tem jogos em <strong>{selectedLeague}</strong>).</span>
            </span>
            <button
              type="button"
              onClick={() => setSelectedLeague('all')}
              className="text-[11px] underline hover:text-white font-bold ml-2 cursor-pointer"
            >
              Mudar filtro para Todas as Ligas
            </button>
          </div>
        )}

        {/* Midnight auto-hide status badge */}
        <div className="pt-1 flex items-center justify-between text-[11px] font-mono text-zinc-500">
          <span className="flex items-center gap-1.5">
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-400"></span>
            <span>
              {selectedDateFilter === currentDateString
                ? `📅 Filtro Ativo: Jogos de Hoje (${currentDateString})`
                : selectedDateFilter !== 'all'
                ? `📅 Filtro Ativo: ${getDateLabel(selectedDateFilter)}`
                : autoHidePast 
                ? `Regra ativa: Jogos de ontem/anteriores a hoje (${currentDateString}) são automaticamente ocultados à meia-noite (00:01)`
                : `A mostrar todos os registos (todas as datas)`}
            </span>
          </span>
          {searchTerm && (
            <span className="text-zinc-400">
              Pesquisa: <strong>"{searchTerm}"</strong> ({filteredJogos.length} resultados)
            </span>
          )}
        </div>
      </div>

      {/* Main Excel-Style Grid / Table or League Dashboard */}
      <div className="bg-[#0f0f14] border border-zinc-800 rounded-2xl overflow-hidden shadow-2xl relative">
        {/* Navigation Tabs when a League is selected */}
        {selectedLeague !== 'all' && (
          <div className="flex flex-wrap items-center justify-between gap-3 px-5 py-3.5 bg-gradient-to-r from-[#0d1322] via-[#10182c] to-[#0d1322] border-b border-cyan-500/30">
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => setLeagueViewTab('standings')}
                className={`px-4 py-2 rounded-xl font-mono text-xs font-bold transition-all flex items-center gap-2 cursor-pointer shadow-sm ${
                  leagueViewTab === 'standings'
                    ? 'bg-gradient-to-r from-amber-400 to-orange-500 text-black font-black shadow-orange-500/20 scale-[1.02]'
                    : 'bg-zinc-900/90 text-zinc-300 hover:text-white hover:bg-zinc-800 border border-zinc-750'
                }`}
              >
                <span>🏆</span>
                <span>Classificação &amp; Estatísticas</span>
              </button>

              <button
                type="button"
                onClick={() => {
                  setLeagueViewTab('matches');
                  if (filteredJogos.length === 0) {
                    setForceShowAllLeagueGames(true);
                    setSelectedDateFilter('all');
                  }
                }}
                className={`px-4 py-2 rounded-xl font-mono text-xs font-bold transition-all flex items-center gap-2 cursor-pointer shadow-sm ${
                  leagueViewTab === 'matches'
                    ? 'bg-gradient-to-r from-orange-500 to-amber-500 text-black font-black shadow-orange-500/20 scale-[1.02]'
                    : 'bg-zinc-900/90 text-zinc-300 hover:text-white hover:bg-zinc-800 border border-zinc-750'
                }`}
              >
                <span>⚽</span>
                <span>
                  Jogos da Liga ({
                    jogos.filter(g => 
                      (g.liga || '').toLowerCase().includes(selectedLeague.toLowerCase()) || 
                      selectedLeague.toLowerCase().includes((g.liga || '').toLowerCase())
                    ).length
                  })
                </span>
              </button>
            </div>

            <div className="flex items-center gap-3">
              <span className="text-xs font-mono text-cyan-300 hidden sm:inline-flex items-center gap-1">
                <span>📍</span>
                <span>Campeonato: <strong>{selectedLeague}</strong></span>
              </span>
              <button
                type="button"
                onClick={() => {
                  setSelectedLeague('all');
                  setForceShowAllLeagueGames(false);
                  setLeagueViewTab('standings');
                }}
                className="px-3 py-1.5 rounded-lg bg-zinc-900 hover:bg-zinc-800 border border-zinc-750 text-zinc-300 hover:text-white font-mono text-xs transition-all cursor-pointer flex items-center gap-1"
              >
                <span>✕</span>
                <span>Ver Todas as Ligas</span>
              </button>
            </div>
          </div>
        )}

        {loading ? (
          <div className="py-24 text-center space-y-4">
            <div className="inline-block w-8 h-8 border-3 border-orange-500 border-t-transparent rounded-full animate-spin" />
            <p className="text-zinc-400 font-mono text-xs animate-pulse">
              A carregar vista de jogos_do_dia diretamente do Supabase...
            </p>
          </div>
        ) : error && jogos.length === 0 ? (
          <div className="p-12 text-center space-y-4">
            <span className="text-4xl">⚠️</span>
            <h3 className="text-base font-bold text-white">Falha ao ligar ao Supabase</h3>
            <p className="text-zinc-400 text-xs max-w-md mx-auto">{error}</p>
            <button
              type="button"
              onClick={() => loadJogosDoDia()}
              className="px-5 py-2 bg-orange-500 hover:bg-orange-400 text-black font-mono font-bold text-xs rounded-xl"
            >
              Tentar Novamente
            </button>
          </div>
        ) : selectedLeague !== 'all' && (leagueViewTab === 'standings' || filteredJogos.length === 0) ? (
          <div className="p-4 sm:p-6 bg-[#090d16]">
            <LeagueStandingsView
              leagueName={selectedLeague}
              allGames={jogos}
              totalLeagueGamesCount={
                jogos.filter(g => 
                  (g.liga || '').toLowerCase().includes(selectedLeague.toLowerCase()) || 
                  selectedLeague.toLowerCase().includes((g.liga || '').toLowerCase())
                ).length
              }
              onSelectTeam={(teamName) => {
                setTeamModalState({
                  isOpen: true,
                  teamName,
                  leagueName: selectedLeague
                });
              }}
              onClearLeagueFilter={() => {
                setSelectedLeague('all');
                setForceShowAllLeagueGames(false);
              }}
              onShowAllLeagueGames={() => {
                setForceShowAllLeagueGames(true);
                setLeagueViewTab('matches');
                setSelectedDateFilter('all');
              }}
            />
          </div>
        ) : filteredJogos.length === 0 ? (
          <div className="py-16 px-6 text-center space-y-4">
            {showLiveOnly ? (
              <>
                <div className="w-14 h-14 mx-auto rounded-full bg-red-500/10 border border-red-500/30 flex items-center justify-center text-3xl shadow-lg shadow-red-500/10">
                  🔴
                </div>
                <div className="space-y-1.5 max-w-md mx-auto">
                  <h3 className="text-lg font-mono font-black text-white">
                    Nenhum Jogo a Decorrer em Direto Neste Momento
                  </h3>
                  <p className="text-xs text-zinc-400 leading-relaxed font-mono">
                    Não existem jogos com pontapé de saída ativo no horário atual nos dados da Supabase. Pode ativar a simulação ao vivo para testar a atualização dinâmica da SuperIA.
                  </p>
                </div>
                <div className="pt-2 flex flex-wrap items-center justify-center gap-3">
                  <button
                    type="button"
                    onClick={() => setSimulatedLiveActive(true)}
                    className="px-5 py-2.5 bg-gradient-to-r from-red-600 to-rose-600 hover:from-red-500 hover:to-rose-500 text-white font-mono font-black text-xs uppercase tracking-wider rounded-xl shadow-lg shadow-red-600/30 transition-all cursor-pointer flex items-center gap-2 active:scale-95"
                  >
                    <span>⚡</span>
                    <span>Ativar Simulação Ao Vivo (Demonstração SuperIA)</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => setShowLiveOnly(false)}
                    className="px-4 py-2.5 bg-zinc-800 hover:bg-zinc-750 text-zinc-200 font-mono font-bold text-xs rounded-xl transition-all cursor-pointer"
                  >
                    Ver Todos os Jogos do Dia
                  </button>
                </div>
              </>
            ) : selectedDateFilter === currentDateString ? (
              <div className="flex flex-col items-center justify-center p-8 sm:p-12 text-center max-w-lg mx-auto space-y-4 animate-fade-in">
                <div className="w-16 h-16 rounded-3xl bg-amber-500/10 border border-amber-500/30 flex items-center justify-center text-4xl shadow-inner animate-pulse">
                  ⚽
                </div>
                <div className="space-y-1.5">
                  <h3 className="text-xl sm:text-2xl font-black text-amber-300 font-mono tracking-wide uppercase">
                    NÃO HÁ JOGOS HOJE ;-)
                  </h3>
                  <p className="text-zinc-400 text-xs sm:text-sm font-mono max-w-md">
                    Não existem partidas agendadas na base de dados para a data de hoje ({currentDateString}).
                  </p>
                </div>
                <div className="flex flex-wrap items-center justify-center gap-2.5 pt-2">
                  <button
                    type="button"
                    onClick={() => setSelectedDateFilter('all')}
                    className="px-4 py-2.5 bg-gradient-to-r from-amber-500 to-orange-500 hover:from-amber-600 hover:to-orange-600 text-black font-black font-mono text-xs rounded-xl shadow-lg shadow-amber-500/20 transition-all cursor-pointer active:scale-95 flex items-center gap-2"
                  >
                    <span>📅</span>
                    <span>Ver Todas as Datas ({availableDates.length})</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => setSelectedDateFilter(yesterdayStr)}
                    className="px-4 py-2.5 bg-zinc-800 hover:bg-zinc-750 text-zinc-200 border border-zinc-700 font-mono font-bold text-xs rounded-xl transition-all cursor-pointer active:scale-95 flex items-center gap-1.5"
                  >
                    <span>⏪</span>
                    <span>Resultados de Ontem</span>
                  </button>
                </div>
              </div>
            ) : (
              <>
                <span className="text-4xl">🔍</span>
                <h3 className="text-base font-bold text-white">Nenhum jogo encontrado</h3>
                <p className="text-zinc-400 text-xs">
                  Não foram encontrados jogos para os filtros selecionados. Tente alterar o campeonato ou termo de pesquisa.
                </p>
                <button
                  type="button"
                  onClick={() => {
                    setSelectedLeague('all');
                    setSelectedDateFilter('all');
                    setSearchTerm('');
                    setShowLiveOnly(false);
                  }}
                  className="px-4 py-2 bg-zinc-800 hover:bg-zinc-700 text-white font-mono text-xs rounded-xl"
                >
                  Ver Todos os Jogos
                </button>
              </>
            )}
          </div>
        ) : (
          <div className="flex flex-col w-full">
            {/* ↔ BARRA DE DESLOCAMENTOS HORIZONTAL SINCRONIZADA NO CIMO DA TABELA */}
            <div className="bg-[#121626] border-t border-x border-zinc-700/80 rounded-t-2xl px-4 py-2 flex flex-col gap-1 shadow-md">
              <div className="flex items-center justify-between text-[11px] font-mono text-zinc-300">
                <span className="flex items-center gap-1.5 font-bold text-amber-300">
                  <span className="text-sm">↔</span>
                  <span>Barra de Deslocamento Superior da Tabela (Deslize para a esquerda / direita):</span>
                </span>
                <span className="text-zinc-400 text-[10px] hidden sm:inline">
                  Navegue facilmente pelas colunas sem precisar rolar até ao fundo da página
                </span>
              </div>
              <div 
                ref={topScrollRef} 
                onScroll={handleTopScroll}
                className="overflow-x-auto w-full h-4 bg-zinc-950 rounded-md border border-zinc-800 scrollbar-thin cursor-ew-resize"
                style={{ scrollbarColor: '#f59e0b #18181b' }}
                title="Deslize horizontalmente para navegar pelas colunas da tabela"
              >
                <div style={{ width: `${tableScrollWidth}px`, height: '1px' }} />
              </div>
            </div>

            {/* Container Principal da Tabela com Scroll Sincronizado */}
            <div 
              ref={tableContainerRef}
              onScroll={handleTableScroll}
              className="overflow-x-auto w-full rounded-b-2xl border-b border-x border-zinc-800 shadow-2xl relative"
            >
            {/* 🎟️ BARRA DE AÇÕES DO BOLETIM DE MÚLTIPLAS (QUANDO HÁ SELEÇÕES) */}
            {selectedMultiplaItems.length > 0 && (
              <div className="sticky top-0 z-30 bg-gradient-to-r from-[#181a26] via-[#201c2b] to-[#1a1720] border-b-2 border-amber-500/60 p-3 sm:px-5 sm:py-3.5 flex flex-wrap items-center justify-between gap-3 shadow-2xl animate-fade-in backdrop-blur-md">
                <div className="flex items-center gap-3">
                  <div className="w-8 h-8 rounded-xl bg-amber-500/20 border border-amber-400/50 flex items-center justify-center text-amber-400 font-black text-base shadow-inner">
                    ☑
                  </div>
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="font-mono font-bold text-white text-xs sm:text-sm">
                        Boletim de Múltiplas: <span className="text-amber-400 font-black">{selectedMultiplaItems.length} equipas selecionadas</span>
                      </span>
                      <span className="text-[10px] px-2 py-0.5 rounded-full bg-amber-500/20 text-amber-300 font-mono font-bold border border-amber-500/30">
                        Odd Total Aprox: {selectedMultiplaItems.reduce((acc, item) => acc * (parseFloat(item.odd) || 1.2), 1).toFixed(2)}
                      </span>
                    </div>
                    <div className="text-[11px] text-zinc-400 truncate max-w-[300px] sm:max-w-xl">
                      {selectedMultiplaItems.map(i => i.teamName).join(' • ')}
                    </div>
                  </div>
                </div>

                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => setSelectedMultiplaItems([])}
                    className="px-3 py-2 bg-zinc-900 hover:bg-zinc-800 text-zinc-400 hover:text-zinc-200 border border-zinc-750 text-xs font-mono font-bold rounded-xl transition-all cursor-pointer"
                  >
                    Limpar
                  </button>
                  <button
                    type="button"
                    onClick={executarSimulacaoMultipla}
                    disabled={isSimulatingMultipla}
                    className="px-4 py-2 bg-gradient-to-r from-amber-500 via-orange-500 to-amber-600 hover:from-amber-400 hover:to-orange-400 text-black font-mono font-black text-xs sm:text-sm rounded-xl transition-all cursor-pointer shadow-lg shadow-amber-500/30 flex items-center gap-2 active:scale-95 disabled:opacity-60"
                  >
                    {isSimulatingMultipla ? (
                      <>
                        <span className="animate-spin text-sm">⏳</span>
                        <span>A Simular no Supabase...</span>
                      </>
                    ) : (
                      <>
                        <span>📊</span>
                        <span>Simular Probabilidade da Múltipla</span>
                      </>
                    )}
                  </button>
                </div>
              </div>
            )}

            {/* Live Indicator Banner inside grid if Live filter active */}
            {showLiveOnly && (
              <div className="bg-red-950/60 border-b border-red-500/40 px-5 py-3 flex flex-wrap items-center justify-between gap-3 text-xs font-mono">
                <div className="flex items-center gap-2.5 text-red-200">
                  <span className="relative flex h-2.5 w-2.5">
                    <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-red-400 opacity-75" />
                    <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-red-500" />
                  </span>
                  <span className="font-black tracking-wide text-white uppercase">
                    Jogos em Direto ({filteredJogos.length}) • Sincronizados com Supabase
                  </span>
                </div>
                <div className="flex items-center gap-2">
                  <span className="text-zinc-400 text-[11px]">
                    Minuto e estatísticas atualizadas em tempo real pela SuperIA
                  </span>
                  {simulatedLiveActive && (
                    <button
                      type="button"
                      onClick={() => setSimulatedLiveActive(false)}
                      className="text-[10px] px-2 py-0.5 rounded bg-amber-500/20 text-amber-300 border border-amber-500/40 font-bold"
                    >
                      Desativar Simulação
                    </button>
                  )}
                </div>
              </div>
            )}

            <table className="w-full text-left border-collapse" style={{ minWidth: `${Math.max(100, columnScale)}%` }}>
              {/* Excel-style table header */}
              <thead>
                <tr className={`bg-[#181a26] border-b-2 border-zinc-700 text-zinc-300 uppercase tracking-wider font-mono select-none ${fontStyles.header}`}>
                  <th className="py-3 px-2 w-10 border-r border-zinc-800 text-center text-zinc-400">#</th>
                  
                  {/* QUADRADO / SINAL ABERTO ANTES DA DATA */}
                  {visibleColumns.sinalAberto && (
                    <th className="py-3 px-2.5 w-24 border-r border-zinc-800 text-center select-none" title="Sinal Aberto: Eventos com visto têm acesso livre sem login para todos os visitantes">
                      <div className="flex flex-col items-center justify-center gap-0.5">
                        <span className="flex items-center gap-1 text-emerald-400 font-bold text-[11px]">
                          <span>🔓</span>
                          <span>ABERTO</span>
                        </span>
                        <span className="text-[9px] text-zinc-400 font-normal">S/ Login</span>
                      </div>
                    </th>
                  )}

                  {/* VISTO MÚLTIPLA: ANTES DA DATA */}
                  {visibleColumns.multipla && (
                    <th className="py-3 px-2.5 w-24 border-r border-zinc-800 text-center select-none bg-amber-500/10" title="Selecione as equipas para testar a probabilidade histórica e matemática de sucesso da Múltipla">
                      <div className="flex flex-col items-center justify-center gap-0.5">
                        <span className="flex items-center gap-1 text-amber-400 font-bold text-[11px]">
                          <span>☑</span>
                          <span>MÚLTIPLA</span>
                        </span>
                        <span className="text-[9px] text-amber-300/80 font-mono">
                          {selectedMultiplaItems.length > 0 ? `(${selectedMultiplaItems.length} sel.)` : 'Boletim'}
                        </span>
                      </div>
                    </th>
                  )}

                  {visibleColumns.data && <th className="py-3 px-3.5 w-28 border-r border-zinc-800">DATA</th>}
                  {visibleColumns.hora && <th className="py-3 px-2.5 w-24 border-r border-zinc-800 text-center">ESTADO / HORA</th>}
                  {visibleColumns.liga && <th className="py-3 px-3.5 border-r border-zinc-800 min-w-[170px]">LIGA</th>}
                  {visibleColumns.confronto && <th className="py-3 px-4 border-r border-zinc-800 min-w-[260px]">CONFRONTO &amp; PLACAR</th>}
                  {visibleColumns.odds && (
                    <>
                      <th className="py-3 px-2.5 w-20 border-r border-zinc-800 text-center bg-zinc-900/60 text-cyan-300">
                        <div>ODD 1</div>
                        <div className="text-[9px] text-cyan-400/80 font-normal">Casa %</div>
                      </th>
                      <th className="py-3 px-2.5 w-20 border-r border-zinc-800 text-center bg-zinc-900/60 text-zinc-300">
                        <div>ODD X</div>
                        <div className="text-[9px] text-zinc-400/80 font-normal">Empate %</div>
                      </th>
                      <th className="py-3 px-2.5 w-20 border-r border-zinc-800 text-center bg-zinc-900/60 text-amber-300">
                        <div>ODD 2</div>
                        <div className="text-[9px] text-amber-400/80 font-normal">Fora %</div>
                      </th>
                    </>
                  )}
                  {visibleColumns.previsao && (
                    <th className="py-3 px-4 border-r border-zinc-800 text-center min-w-[220px]">
                      <div className="flex items-center justify-center gap-1.5">
                        <span>PREVISÃO SUPERIA</span>
                        <span className="text-[9px] px-1.5 py-0.5 rounded bg-purple-500/20 text-purple-300 border border-purple-500/40 font-bold" title="Probabilidades calculadas pelo modelo quantitativo SuperIA">
                          POISSON
                        </span>
                      </div>
                    </th>
                  )}
                  {visibleColumns.metricas && <th className="py-3 px-4 w-28 text-center">MÉTRICAS</th>}
                </tr>
              </thead>

              {/* Excel-style alternating table rows */}
              <tbody className={`font-sans ${tableFontSize === 'xlarge' ? 'text-base' : tableFontSize === 'large' ? 'text-sm' : 'text-xs'}`}>
                {filteredJogos.map((jogo, index) => {
                  const metrics = getCalibratedMatchMetrics(jogo);
                  const isEven = index % 2 === 0;

                  // Unique match key for unlocking
                  const matchKey = (jogo.jogo_id && String(jogo.jogo_id).trim()) 
                    ? String(jogo.jogo_id).trim() 
                    : `${jogo.data}_${jogo.hora}_${jogo.clube_casa}_vs_${jogo.clube_fora}`.replace(/\s+/g, '_').toLowerCase();

                  const liveInfo = liveGamesMap.get(matchKey);
                  const isUnlockedByAdmin = unlockedIds.includes(matchKey);

                  // Verificar se o jogo já terminou
                  const isMatchFinished = Boolean(
                    liveInfo?.isFinished ||
                    liveInfo?.fase === 'Terminado' ||
                    (jogo.estado && ['FINISHED', 'FT', 'TERMINADO', 'FINAL', 'ENCERRADO'].includes(jogo.estado.toUpperCase())) ||
                    (jogo.data && jogo.data < currentDateString)
                  );

                  // Golos finais garantidos para jogos terminados
                  const finalGolosCasa = liveInfo?.golosCasa ?? (typeof jogo.golos_casa === 'number' ? jogo.golos_casa : 0);
                  const finalGolosFora = liveInfo?.golosFora ?? (typeof jogo.golos_fora === 'number' ? jogo.golos_fora : 0);
                  const finalWinner = finalGolosCasa > finalGolosFora ? '1' : finalGolosFora > finalGolosCasa ? '2' : 'X';

                  // Em jogos terminados, o bloqueio/premium desaparece completamente
                  const canViewPrediction = isUserRegistered || isUnlockedByAdmin || isMatchFinished;

                  return (
                    <tr
                      key={jogo.jogo_id || `match-${index}`}
                      onClick={() => {
                        if (!canViewPrediction) {
                          const evt = new CustomEvent('open-auth-modal', { detail: { mode: 'register' } });
                          window.dispatchEvent(evt);
                          return;
                        }
                        setSelectedMatch({ jogo, metrics, liveInfo });
                      }}
                      className={`transition-colors cursor-pointer group border-b border-zinc-800/80 ${
                        liveInfo?.isLive
                          ? 'border-l-4 border-l-red-500 bg-red-950/20 hover:bg-red-950/40'
                          : isMatchFinished
                          ? 'border-l-4 border-l-emerald-600/70 bg-emerald-950/15 hover:bg-emerald-950/30'
                          : isEven ? 'bg-[#1a1d28]' : 'bg-[#0e1015]'
                      } hover:bg-orange-500/20`}
                      title={canViewPrediction ? "Clique para abrir métricas quantitativas completas e centro ao vivo" : "🔒 Análises protegidas. Registe-se para desbloquear"}
                    >
                      {/* Excel Row Index */}
                      <td className={`${rowPadding} px-2.5 font-mono text-zinc-500 text-center border-r border-zinc-800/80 bg-black/20 ${fontStyles.rowIdx}`}>
                        {index + 1}
                      </td>

                      {/* QUADRADO / VISTO SINAL ABERTO ANTES DA DATA */}
                      {visibleColumns.sinalAberto && (
                        <td 
                          className={`${rowPadding} px-2 text-center border-r border-zinc-800/80 transition-colors ${
                            isUnlockedByAdmin ? 'bg-emerald-950/20' : ''
                          }`}
                          onClick={(e) => {
                            if (isEffectiveAdmin) {
                              e.stopPropagation();
                              handleToggleUnlock(e, matchKey);
                            }
                          }}
                        >
                          {isEffectiveAdmin ? (
                            <div className="flex flex-col items-center justify-center gap-1">
                              <button
                                type="button"
                                onClick={(e) => handleToggleUnlock(e, matchKey)}
                                title={
                                  isUnlockedByAdmin
                                    ? '✓ Em Sinal Aberto (livre sem login). Clique para desmarcar visto.'
                                    : '☐ Clique para colocar o visto e deixar em Sinal Aberto (livre sem login).'
                                }
                                className={`w-7 h-7 rounded-lg flex items-center justify-center transition-all cursor-pointer border shadow-sm ${
                                  isUnlockedByAdmin
                                    ? 'bg-emerald-500 border-emerald-400 text-black font-black text-sm shadow-[0_0_12px_rgba(16,185,129,0.5)] active:scale-95'
                                    : 'bg-zinc-900 border-zinc-700 text-transparent hover:border-emerald-500 hover:text-emerald-400/50 active:scale-95'
                                }`}
                              >
                                <span className="leading-none select-none font-black">{isUnlockedByAdmin ? '✓' : ''}</span>
                              </button>
                              {isUnlockedByAdmin && (
                                <span className="text-[8px] font-mono text-emerald-400 font-bold uppercase tracking-tight">
                                  Aberto
                                </span>
                              )}
                            </div>
                          ) : (
                            <div className="flex flex-col items-center justify-center gap-0.5">
                              {isUnlockedByAdmin ? (
                                <span 
                                  className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-emerald-500/20 border border-emerald-500/50 text-emerald-400 text-[10px] font-mono font-black animate-pulse"
                                  title="🔓 Jogo em Sinal Aberto: Acesso livre sem necessidade de login!"
                                >
                                  <span>🔓</span>
                                  <span>LIVRE</span>
                                </span>
                              ) : (
                                <span 
                                  className="inline-flex items-center justify-center w-6 h-6 rounded-lg bg-zinc-900/80 border border-zinc-800 text-zinc-600 text-xs"
                                  title="🔒 Exclusivo para membros registados"
                                >
                                  🔒
                                </span>
                              )}
                            </div>
                          )}
                        </td>
                      )}

                      {/* VISTO / CHECKBOX MÚLTIPLA (ANTES DA DATA) */}
                      {visibleColumns.multipla && (() => {
                        const isItemSelected = selectedMultiplaItems.some(item => item.gameId === matchKey);
                        let teamName = jogo.clube_casa || 'Equipa Casa';
                        if (metrics.seloIa.includes('Fora') || metrics.seloIa.includes('2')) {
                          teamName = jogo.clube_fora || 'Equipa Fora';
                        }
                        const itemUuid = generateDeterministicUuid(`${teamName}_${jogo.jogo_id || matchKey}`);

                        return (
                          <td 
                            className={`${rowPadding} px-2 text-center border-r border-zinc-800/80 transition-colors ${
                              isItemSelected ? 'bg-amber-950/40' : 'bg-black/10'
                            }`}
                            onClick={(e) => handleToggleMultiplaSelection(e, jogo, metrics)}
                            title="Clique para adicionar ou remover esta equipa do Boletim de Múltiplas"
                          >
                            <div className="flex flex-col items-center justify-center gap-1">
                              {/* Hidden checkbox com a classe pedida: .equipa-checkbox */}
                              <input 
                                type="checkbox"
                                className="equipa-checkbox sr-only"
                                value={itemUuid}
                                checked={isItemSelected}
                                onChange={() => {}}
                                readOnly
                              />
                              <button
                                type="button"
                                onClick={(e) => handleToggleMultiplaSelection(e, jogo, metrics)}
                                className={`w-7 h-7 rounded-lg flex items-center justify-center transition-all cursor-pointer border shadow-sm ${
                                  isItemSelected
                                    ? 'bg-gradient-to-br from-amber-400 to-orange-500 border-amber-300 text-black font-black text-sm shadow-[0_0_12px_rgba(245,158,11,0.5)] scale-105 active:scale-95'
                                    : 'bg-zinc-900 border-zinc-750 text-transparent hover:border-amber-500/70 hover:text-amber-400/40 active:scale-95'
                                }`}
                                title={isItemSelected ? `✓ ${teamName} selecionada para a múltipla` : `Adicionar ${teamName} à múltipla`}
                              >
                                <span className="leading-none select-none font-black">{isItemSelected ? '✓' : ''}</span>
                              </button>
                              {isItemSelected && (
                                <span className="text-[8px] font-mono text-amber-400 font-bold uppercase tracking-tight truncate max-w-[65px]">
                                  {teamName.split(' ')[0]}
                                </span>
                              )}
                            </div>
                          </td>
                        );
                      })()}

                      {/* Data */}
                      {visibleColumns.data && (
                        <td className={`${rowPadding} px-3.5 font-mono text-zinc-200 whitespace-nowrap border-r border-zinc-800/80 ${fontStyles.date}`}>
                          <span className="flex items-center gap-1.5">
                            <span className="text-orange-400/80">📅</span>
                            <span>{jogo.data || '—'}</span>
                          </span>
                        </td>
                      )}

                      {/* Hora / Minuto Ao Vivo / Terminado */}
                      {visibleColumns.hora && (
                        <td className={`${rowPadding} px-2.5 font-mono font-bold text-center text-zinc-200 whitespace-nowrap border-r border-zinc-800/80 ${fontStyles.time}`}>
                          {liveInfo?.isLive ? (
                            <div className="flex flex-col items-center justify-center gap-0.5">
                              <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full bg-red-600/95 border border-red-400 text-[10px] text-white font-black font-mono shadow-sm animate-pulse">
                                <span className="w-1.5 h-1.5 rounded-full bg-white animate-ping" />
                                <span>{liveInfo.minuto}</span>
                              </span>
                              <span className="text-[9px] font-mono text-red-300 font-bold tracking-tight">
                                {liveInfo.fase || 'Em Direto'}
                              </span>
                            </div>
                          ) : isMatchFinished ? (
                            <div className="flex flex-col items-center justify-center gap-0.5">
                              <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full bg-emerald-950/90 border border-emerald-500/60 text-emerald-400 text-[10px] font-mono font-black shadow-sm">
                                <span>✅</span>
                                <span>Terminado</span>
                              </span>
                              <span className="text-[10px] font-mono text-emerald-300 font-black">
                                FT {finalGolosCasa} - {finalGolosFora}
                              </span>
                            </div>
                          ) : (
                            <span className={`inline-flex items-center gap-1 rounded bg-zinc-900/90 border border-zinc-750 text-emerald-400 font-bold ${
                              tableFontSize === 'xlarge' ? 'px-2.5 py-1 text-sm' : tableFontSize === 'large' ? 'px-2 py-0.5 text-xs' : 'px-2 py-0.5 text-[11px]'
                            }`}>
                              <span className="w-1.5 h-1.5 rounded-full bg-emerald-400"></span>
                              {jogo.hora || '—'}
                            </span>
                          )}
                        </td>
                      )}

                      {/* Liga */}
                      {visibleColumns.liga && (
                        <td className={`${rowPadding} px-3.5 text-zinc-200 font-mono whitespace-nowrap border-r border-zinc-800/80`}>
                          <button
                            type="button"
                            onClick={(e) => {
                              e.stopPropagation();
                              setTeamModalState({
                                isOpen: true,
                                leagueName: jogo.liga,
                                teamName: undefined
                              });
                            }}
                            className={`inline-flex items-center gap-1 rounded-md bg-zinc-900/90 hover:bg-cyan-950/80 border border-zinc-750 hover:border-cyan-500/50 font-semibold text-zinc-200 hover:text-cyan-300 transition-all cursor-pointer select-none text-left ${fontStyles.league}`}
                            title={`🏆 Ver Classificação e Estatísticas da Liga ${jogo.liga}`}
                          >
                            <span className="text-amber-400">🏆</span>
                            <span>{jogo.liga || 'Geral'}</span>
                          </button>
                        </td>
                      )}

                      {/* Confronto & Placar Ao Vivo / Terminado */}
                      {visibleColumns.confronto && (
                        <td className={`${rowPadding} px-4 border-r border-zinc-800/80`}>
                          {liveInfo?.isLive ? (
                            <div className="space-y-1.5">
                              <div className="flex items-center justify-between gap-2">
                                <button
                                  type="button"
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    setTeamModalState({
                                      isOpen: true,
                                      teamName: jogo.clube_casa,
                                      leagueName: jogo.liga
                                    });
                                  }}
                                  className={`font-bold text-white hover:text-cyan-300 text-left hover:underline decoration-cyan-400 transition-colors truncate max-w-[120px] sm:max-w-none cursor-pointer ${fontStyles.teams}`}
                                  title={`Ver Histórico, xG, Treinador e Plantel de ${jogo.clube_casa}`}
                                >
                                  {jogo.clube_casa}
                                </button>
                                <span className="px-2.5 py-0.5 rounded-md bg-gradient-to-r from-red-600 to-rose-600 border border-red-400 text-white font-mono font-black text-xs shadow-md shrink-0">
                                  {liveInfo.golosCasa} - {liveInfo.golosFora}
                                </span>
                                <button
                                  type="button"
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    setTeamModalState({
                                      isOpen: true,
                                      teamName: jogo.clube_fora,
                                      leagueName: jogo.liga
                                    });
                                  }}
                                  className={`font-bold text-white hover:text-cyan-300 text-left hover:underline decoration-cyan-400 transition-colors truncate max-w-[120px] sm:max-w-none cursor-pointer ${fontStyles.teams}`}
                                  title={`Ver Histórico, xG, Treinador e Plantel de ${jogo.clube_fora}`}
                                >
                                  {jogo.clube_fora}
                                </button>
                              </div>
                              <div className="flex flex-wrap items-center gap-1.5 text-[10px] font-mono text-zinc-400">
                                <span className="px-1.5 py-0.2 rounded bg-red-950/80 border border-red-500/40 text-red-300 font-bold">
                                  🚩 {liveInfo.totalCantosLive} cantos
                                </span>
                                <span className="px-1.5 py-0.2 rounded bg-amber-950/80 border border-amber-500/40 text-amber-300 font-bold">
                                  🟨 {liveInfo.totalCartoesLive} cartões
                                </span>
                                <span className="text-zinc-400">
                                  {liveInfo.posseCasa}% vs {liveInfo.posseFora}%
                                </span>
                              </div>
                            </div>
                          ) : isMatchFinished ? (
                            <div className="space-y-1">
                              <div className="flex items-center justify-between gap-2">
                                <button
                                  type="button"
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    setTeamModalState({
                                      isOpen: true,
                                      teamName: jogo.clube_casa,
                                      leagueName: jogo.liga
                                    });
                                  }}
                                  className={`font-bold text-left hover:text-cyan-300 hover:underline decoration-cyan-400 ${finalGolosCasa > finalGolosFora ? 'text-emerald-300 font-black' : 'text-zinc-200'} transition-colors truncate max-w-[120px] sm:max-w-none cursor-pointer ${fontStyles.teams}`}
                                  title={`Ver Histórico, xG, Treinador e Plantel de ${jogo.clube_casa}`}
                                >
                                  {jogo.clube_casa}
                                </button>
                                <span className="px-2.5 py-0.5 rounded-md bg-emerald-950 border-2 border-emerald-500/70 text-emerald-300 font-mono font-black text-xs sm:text-sm shadow-md shrink-0">
                                  {finalGolosCasa} - {finalGolosFora}
                                </span>
                                <button
                                  type="button"
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    setTeamModalState({
                                      isOpen: true,
                                      teamName: jogo.clube_fora,
                                      leagueName: jogo.liga
                                    });
                                  }}
                                  className={`font-bold text-left hover:text-cyan-300 hover:underline decoration-cyan-400 ${finalGolosFora > finalGolosCasa ? 'text-emerald-300 font-black' : 'text-zinc-200'} transition-colors truncate max-w-[120px] sm:max-w-none cursor-pointer ${fontStyles.teams}`}
                                  title={`Ver Histórico, xG, Treinador e Plantel de ${jogo.clube_fora}`}
                                >
                                  {jogo.clube_fora}
                                </button>
                              </div>
                              <div className="flex items-center justify-between text-[10px] font-mono">
                                <span className="inline-flex items-center gap-1 text-emerald-400 font-bold">
                                  <span>🏁 Terminado</span>
                                  <span>• Resultado Final: {finalGolosCasa}-{finalGolosFora}</span>
                                </span>
                                {jogo.data && (
                                  <span className="text-zinc-400 font-medium">{getDateLabel(jogo.data)}</span>
                                )}
                              </div>
                            </div>
                          ) : (
                            <div className="flex items-center gap-2">
                              <button
                                type="button"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  setTeamModalState({
                                    isOpen: true,
                                    teamName: jogo.clube_casa,
                                    leagueName: jogo.liga
                                  });
                                }}
                                className={`font-bold text-white hover:text-cyan-300 text-left hover:underline decoration-cyan-400 transition-colors cursor-pointer ${fontStyles.teams}`}
                                title={`Ver Histórico, xG, Treinador e Plantel de ${jogo.clube_casa}`}
                              >
                                {jogo.clube_casa}
                              </button>
                              <span className={`font-mono text-zinc-400 font-extrabold bg-zinc-900 border border-zinc-800 rounded ${fontStyles.vs}`}>
                                vs
                              </span>
                              <button
                                type="button"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  setTeamModalState({
                                    isOpen: true,
                                    teamName: jogo.clube_fora,
                                    leagueName: jogo.liga
                                  });
                                }}
                                className={`font-bold text-white hover:text-cyan-300 text-left hover:underline decoration-cyan-400 transition-colors cursor-pointer ${fontStyles.teams}`}
                                title={`Ver Histórico, xG, Treinador e Plantel de ${jogo.clube_fora}`}
                              >
                                {jogo.clube_fora}
                              </button>
                            </div>
                          )}
                        </td>
                      )}

                      {/* Odd 1 / Resultado Final Vencedor Casa */}
                      {visibleColumns.odds && (
                        <>
                          <td className={`${rowPadding} px-2.5 text-center border-r border-zinc-800/80 bg-cyan-950/20 font-mono`}>
                            {isMatchFinished ? (
                              finalWinner === '1' ? (
                                <div className="inline-flex flex-col items-center justify-center py-1 px-1.5 rounded-lg bg-emerald-500/20 border border-emerald-400 text-emerald-300 font-mono font-black shadow-inner">
                                  <span className="text-xs font-black">✅ 1 Casa</span>
                                  <span className="text-[9px] text-emerald-400/90 font-bold uppercase">Vencedor</span>
                                </div>
                              ) : (
                                <span className="text-zinc-600 font-mono font-bold text-sm">—</span>
                              )
                            ) : (
                              <div className="flex flex-col items-center gap-0.5">
                                <span className={`inline-block w-full rounded bg-zinc-900/90 border border-cyan-500/40 group-hover:border-cyan-400 text-cyan-300 font-black shadow-inner ${fontStyles.oddBox}`}>
                                  {metrics.odd1}
                                </span>
                                <span className={`text-cyan-400/90 font-bold ${fontStyles.oddProb}`}>
                                  {metrics.probCasa}%
                                </span>
                              </div>
                            )}
                          </td>

                          {/* Odd X / Resultado Final Empate */}
                          <td className={`${rowPadding} px-2.5 text-center border-r border-zinc-800/80 bg-zinc-950/30 font-mono`}>
                            {isMatchFinished ? (
                              finalWinner === 'X' ? (
                                <div className="inline-flex flex-col items-center justify-center py-1 px-1.5 rounded-lg bg-emerald-500/20 border border-emerald-400 text-emerald-300 font-mono font-black shadow-inner">
                                  <span className="text-xs font-black">🤝 X Empate</span>
                                  <span className="text-[9px] text-emerald-400/90 font-bold uppercase">Resultado</span>
                                </div>
                              ) : (
                                <span className="text-zinc-600 font-mono font-bold text-sm">—</span>
                              )
                            ) : (
                              <div className="flex flex-col items-center gap-0.5">
                                <span className={`inline-block w-full rounded bg-zinc-900/90 border border-zinc-750 group-hover:border-zinc-500 text-zinc-200 font-black shadow-inner ${fontStyles.oddBox}`}>
                                  {metrics.oddX}
                                </span>
                                <span className={`text-zinc-400 font-bold ${fontStyles.oddProb}`}>
                                  {metrics.probEmpate}%
                                </span>
                              </div>
                            )}
                          </td>

                          {/* Odd 2 / Resultado Final Vencedor Fora */}
                          <td className={`${rowPadding} px-2.5 text-center border-r border-zinc-800/80 bg-amber-950/20 font-mono`}>
                            {isMatchFinished ? (
                              finalWinner === '2' ? (
                                <div className="inline-flex flex-col items-center justify-center py-1 px-1.5 rounded-lg bg-emerald-500/20 border border-emerald-400 text-emerald-300 font-mono font-black shadow-inner">
                                  <span className="text-xs font-black">✅ 2 Fora</span>
                                  <span className="text-[9px] text-emerald-400/90 font-bold uppercase">Vencedor</span>
                                </div>
                              ) : (
                                <span className="text-zinc-600 font-mono font-bold text-sm">—</span>
                              )
                            ) : (
                              <div className="flex flex-col items-center gap-0.5">
                                <span className={`inline-block w-full rounded bg-zinc-900/90 border border-amber-500/40 group-hover:border-amber-400 text-amber-300 font-black shadow-inner ${fontStyles.oddBox}`}>
                                  {metrics.odd2}
                                </span>
                                <span className={`text-amber-400/90 font-bold ${fontStyles.oddProb}`}>
                                  {metrics.probFora}%
                                </span>
                              </div>
                            )}
                          </td>
                        </>
                      )}

                      {/* Selo Previsão IA - Em jogos terminados, premium desaparece e passa a mostrar o resultado final */}
                      {visibleColumns.previsao && (
                        <td className={`${rowPadding} px-4 border-r border-zinc-800/80 text-center whitespace-nowrap`}>
                          <div className="inline-flex items-center justify-center gap-2">
                            {isMatchFinished ? (
                              <div className="flex flex-col items-center gap-1">
                                <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-zinc-900/90 border border-emerald-500/60 shadow-sm font-mono">
                                  <span className="text-emerald-300 font-black text-xs">🤖 {metrics.seloIa}</span>
                                  <span className="px-1.5 py-0.2 rounded bg-emerald-500/20 text-emerald-300 border border-emerald-500/40 font-bold text-[10px]">
                                    {metrics.confianca}%
                                  </span>
                                </div>
                                <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full bg-emerald-950/80 border border-emerald-500/50 text-emerald-300 text-[10px] font-mono font-black uppercase">
                                  <span>🏁</span>
                                  <span>Terminado • FT {finalGolosCasa}-{finalGolosFora}</span>
                                </span>
                              </div>
                            ) : canViewPrediction ? (
                              <div className="flex flex-col items-center gap-1">
                                <span className={`inline-flex items-center gap-1.5 rounded-full font-mono font-bold shadow-sm ${fontStyles.predBadge} ${
                                  metrics.confianca >= 75
                                    ? 'bg-gradient-to-r from-emerald-950/90 via-purple-950/90 to-emerald-950/90 border-2 border-emerald-400 text-emerald-200 ring-1 ring-emerald-400/40'
                                    : 'bg-gradient-to-r from-purple-950/90 to-indigo-950/90 border border-purple-500/50 text-purple-200'
                                }`}>
                                  <span>🤖</span>
                                  <span className="text-white font-black">{metrics.seloIa}</span>
                                  <span className={`px-1.5 py-0.2 rounded border font-extrabold ${fontStyles.predSub} ${
                                    metrics.confianca >= 75
                                      ? 'bg-emerald-500/30 text-emerald-300 border-emerald-400 font-black'
                                      : 'bg-purple-900 text-purple-300 border-purple-500/40'
                                  }`}>
                                    {metrics.confianca}% {metrics.confianca >= 75 ? '🔥' : ''}
                                  </span>
                                  {isUnlockedByAdmin && !isUserRegistered && (
                                    <span className={`px-1.5 py-0.2 rounded bg-emerald-500/30 border border-emerald-400/50 text-emerald-300 font-extrabold uppercase ${fontStyles.predSub}`}>
                                      Aberto
                                    </span>
                                  )}
                                </span>
                                {/* EV badge */}
                                <span className={`font-mono text-[#00E676] bg-[#00E676]/10 rounded border border-[#00E676]/30 font-bold ${fontStyles.predEv}`}>
                                  {metrics.evVal}
                                </span>
                              </div>
                            ) : (
                              /* Bloqueado para utilizadores não registados em jogos ainda não terminados */
                              <div 
                                onClick={(e) => {
                                  e.stopPropagation();
                                  const evt = new CustomEvent('open-auth-modal', { detail: { mode: 'register' } });
                                  window.dispatchEvent(evt);
                                }}
                                className="group/lock relative inline-flex items-center gap-2 px-3 py-1 rounded-full bg-gradient-to-r from-amber-950/60 via-zinc-900 to-amber-950/60 border border-amber-500/50 text-amber-300 hover:border-amber-400 hover:text-white transition-all cursor-pointer shadow-sm active:scale-95"
                                title="Selo protegido: Exclusivo para utilizadores registados ou jogos em Sinal Aberto. Clique para criar conta gratuita."
                              >
                                <span className="text-xs">🔒</span>
                                <span className={`font-mono font-black tracking-wide uppercase text-amber-300 group-hover/lock:text-white ${
                                  tableFontSize === 'xlarge' ? 'text-xs' : 'text-[11px]'
                                }`}>
                                  Registo Premium
                                </span>
                                <span className={`px-1.5 py-0.2 rounded bg-amber-500/20 text-amber-200 border border-amber-500/40 font-bold uppercase ${
                                  tableFontSize === 'xlarge' ? 'text-[10px]' : 'text-[9px]'
                                }`}>
                                  Bloqueado
                                </span>
                              </div>
                            )}
                          </div>
                        </td>
                      )}

                      {/* Botão Ação / Abrir Modal */}
                      {visibleColumns.metricas && (
                        <td className={`${rowPadding} px-4 text-center whitespace-nowrap`}>
                          {isMatchFinished ? (
                            <button
                              type="button"
                              onClick={(e) => {
                                e.stopPropagation();
                                setSelectedMatch({ jogo, metrics, liveInfo });
                              }}
                              className={`font-mono font-bold rounded-lg transition-all cursor-pointer shadow-md active:scale-95 border border-emerald-500/60 bg-emerald-950/70 hover:bg-emerald-800 text-emerald-300 hover:text-white flex items-center justify-center gap-1 mx-auto ${fontStyles.actionBtn}`}
                              title="Ver resumo completo do jogo terminado e estatísticas finais"
                            >
                              <span>📋</span>
                              <span>Resumo FT</span>
                            </button>
                          ) : canViewPrediction ? (
                            <button
                              type="button"
                              onClick={(e) => {
                                e.stopPropagation();
                                setSelectedMatch({ jogo, metrics, liveInfo });
                              }}
                              className={`font-mono font-bold rounded-lg transition-all cursor-pointer shadow-md active:scale-95 border ${fontStyles.actionBtn} ${
                                liveInfo?.isLive
                                  ? 'bg-red-600 hover:bg-red-500 border-red-400 text-white shadow-red-500/30 animate-pulse'
                                  : 'bg-orange-500/20 hover:bg-orange-500 border-orange-500/50 hover:border-orange-500 text-orange-300 hover:text-black'
                              }`}
                            >
                              {liveInfo?.isLive ? 'Ao Vivo 🔴' : 'Métricas 🔍'}
                            </button>
                          ) : (
                            <button
                              type="button"
                              onClick={(e) => {
                                e.stopPropagation();
                                const evt = new CustomEvent('open-auth-modal', { detail: { mode: 'register' } });
                                window.dispatchEvent(evt);
                              }}
                              className={`bg-zinc-900/90 hover:bg-amber-950/50 border border-amber-500/50 hover:border-amber-400 text-amber-300 hover:text-white font-mono font-bold rounded-lg transition-all cursor-pointer flex items-center justify-center gap-1.5 mx-auto active:scale-95 shadow-sm ${fontStyles.actionBtn}`}
                              title="Métricas exclusivas para utilizadores registados. Clique para criar conta gratuita."
                            >
                              <span className="text-xs">🔒</span>
                              <span className="uppercase font-black tracking-wide">Bloqueado</span>
                            </button>
                          )}
                        </td>
                      )}
                    </tr>
                  );
                })}
              </tbody>
            </table>
            </div>
          </div>
        )}

        {/* ⚡ CONTROLO DE DESBLOQUEIO PROGRESSIVO DE 8 EM 8 DIAS (ESTILO FLASHSCORE) */}
        {selectedDateFilter === 'all' && !searchTerm && (
          <div className="bg-[#101118] border-t border-zinc-800/90 p-4 sm:p-6 flex flex-col md:flex-row items-center justify-between gap-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-2xl bg-amber-500/10 border border-amber-500/30 flex items-center justify-center text-xl shadow-inner shrink-0">
                ⚡
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <h4 className="font-mono font-bold text-white text-xs sm:text-sm">
                    Janela Temporal Ativa: Próximos {visibleFutureDays} Dias
                  </h4>
                  <span className="px-2 py-0.5 rounded-full bg-amber-500/20 text-amber-300 font-mono font-bold text-[10px] border border-amber-500/40">
                    Até {maxFutureDateString}
                  </span>
                </div>
                <p className="text-[11px] text-zinc-400 font-mono mt-0.5">
                  {futureHiddenCount > 0 
                    ? `Existem ${futureHiddenCount} partidas futuras além deste período que estão ocultas para evitar desajustes nas métricas.` 
                    : `Todas as datas futuras disponíveis na base de dados estão atualmente desbloqueadas nesta vista.`}
                </p>
              </div>
            </div>

            <div className="flex flex-wrap items-center gap-2.5 shrink-0">
              {futureHiddenCount > 0 && (
                <button
                  type="button"
                  onClick={() => setVisibleFutureDays(prev => prev + 8)}
                  className="px-5 py-2.5 bg-gradient-to-r from-amber-500 via-orange-500 to-amber-600 hover:from-amber-400 hover:to-orange-400 text-black font-mono font-black text-xs uppercase tracking-wider rounded-xl shadow-lg shadow-amber-500/20 transition-all cursor-pointer flex items-center gap-2 active:scale-95"
                  title="Desbloquear os próximos 8 dias de jogos futuros adicionais"
                >
                  <span>🔓</span>
                  <span>Desbloquear +8 Dias Futuros</span>
                  <span className="px-1.5 py-0.5 rounded bg-black/30 text-black text-[10px] font-black">
                    +{Math.min(futureHiddenCount, 8)}
                  </span>
                </button>
              )}

              {visibleFutureDays > 8 && (
                <button
                  type="button"
                  onClick={() => setVisibleFutureDays(8)}
                  className="px-4 py-2 bg-zinc-900 hover:bg-zinc-850 border border-zinc-750 text-zinc-400 hover:text-white font-mono text-xs font-bold rounded-xl transition-all cursor-pointer"
                  title="Voltar ao limite padrão recomendado de 8 dias"
                >
                  Repor 8 Dias
                </button>
              )}
            </div>
          </div>
        )}

        {/* Footer info inside table */}
        <div className="bg-[#14141c] border-t border-zinc-800 px-6 py-3.5 flex flex-wrap items-center justify-between text-xs font-mono text-zinc-400">
          <span>
            Mostrando <strong>{filteredJogos.length}</strong> de <strong>{jogos.length}</strong> partidas sincronizadas com o Supabase.
          </span>
          <span className="text-zinc-500">
            Dica: Clique em qualquer linha da tabela para abrir o relatório analítico completo e centro ao vivo.
          </span>
        </div>
      </div>
      </>
      )}

      {/* ========================================================================= */}
      {/* QUANTITATIVE METRICS POP-UP MODAL                                        */}
      {/* ========================================================================= */}
      {selectedMatch && (() => {
        const modalMatchKey = (selectedMatch.jogo.jogo_id && String(selectedMatch.jogo.jogo_id).trim())
          ? String(selectedMatch.jogo.jogo_id).trim()
          : `${selectedMatch.jogo.data}_${selectedMatch.jogo.hora}_${selectedMatch.jogo.clube_casa}_vs_${selectedMatch.jogo.clube_fora}`.replace(/\s+/g, '_').toLowerCase();

        const isModalMatchFinished = Boolean(
          selectedMatch.liveInfo?.isFinished ||
          selectedMatch.liveInfo?.fase === 'Terminado' ||
          (selectedMatch.jogo.estado && ['FINISHED', 'FT', 'TERMINADO', 'FINAL', 'ENCERRADO'].includes(selectedMatch.jogo.estado.toUpperCase())) ||
          (selectedMatch.jogo.data && selectedMatch.jogo.data < currentDateString)
        );

        const modalFinalGolosCasa = selectedMatch.liveInfo?.golosCasa ?? (typeof selectedMatch.jogo.golos_casa === 'number' ? selectedMatch.jogo.golos_casa : 0);
        const modalFinalGolosFora = selectedMatch.liveInfo?.golosFora ?? (typeof selectedMatch.jogo.golos_fora === 'number' ? selectedMatch.jogo.golos_fora : 0);

        const isModalUnlocked = unlockedIds.includes(modalMatchKey);
        const canViewModalPrediction = isUserRegistered || isModalUnlocked || isModalMatchFinished;

        return (
          <div 
            className="fixed inset-0 z-50 flex items-center justify-center p-2 sm:p-4 md:p-6 bg-black/85 backdrop-blur-md animate-fade-in"
            onClick={() => setSelectedMatch(null)}
          >
            <div 
              className="bg-[#121217] border border-orange-500/40 rounded-3xl w-full max-w-[98vw] sm:max-w-4xl md:max-w-5xl lg:max-w-6xl xl:max-w-7xl 2xl:max-w-[1500px] p-6 sm:p-8 lg:p-10 shadow-2xl shadow-orange-500/10 relative overflow-hidden max-h-[94vh] flex flex-col"
              onClick={(e) => e.stopPropagation()}
            >
              {/* Ambient glows */}
              <div className="absolute top-0 right-0 w-64 h-64 bg-orange-500/10 rounded-full blur-3xl pointer-events-none" />
              <div className="absolute bottom-0 left-0 w-64 h-64 bg-cyan-500/10 rounded-full blur-3xl pointer-events-none" />

              {/* Modal Header */}
              <div className="flex items-start justify-between gap-4 pb-4 border-b border-zinc-800 relative z-10">
                <div className="space-y-1">
                  <div className="flex flex-wrap items-center gap-2">
                    <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-orange-500/10 border border-orange-500/30 text-orange-400 text-xs font-mono font-bold">
                      <span>🏆 {selectedMatch.jogo.liga}</span>
                      <span>•</span>
                      <span>📅 {selectedMatch.jogo.data} às {selectedMatch.jogo.hora}</span>
                    </div>

                    {selectedMatch.liveInfo?.isLive ? (
                      <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-red-600/90 border border-red-400 text-white text-xs font-mono font-black shadow-lg animate-pulse">
                        <span className="w-2 h-2 rounded-full bg-white animate-ping" />
                        <span>EM DIRETO • {selectedMatch.liveInfo.minuto}</span>
                      </span>
                    ) : isModalMatchFinished ? (
                      <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-emerald-950 border border-emerald-500/80 text-emerald-300 text-xs font-mono font-black shadow-lg">
                        <span>✅ TERMINADO • FT {modalFinalGolosCasa} - {modalFinalGolosFora}</span>
                      </span>
                    ) : null}
                  </div>

                  <h2 className="text-xl sm:text-2xl font-black text-white tracking-tight flex items-center gap-2 pt-1">
                    <span>{selectedMatch.jogo.clube_casa}</span>
                    {selectedMatch.liveInfo?.isLive ? (
                      <span className="px-3 py-0.5 rounded-lg bg-red-950 border border-red-500 text-white font-mono font-black text-lg sm:text-xl shadow-inner mx-1">
                        {selectedMatch.liveInfo.golosCasa} - {selectedMatch.liveInfo.golosFora}
                      </span>
                    ) : isModalMatchFinished ? (
                      <span className="px-3 py-0.5 rounded-lg bg-emerald-950 border border-emerald-500 text-emerald-300 font-mono font-black text-lg sm:text-xl shadow-inner mx-1">
                        {modalFinalGolosCasa} - {modalFinalGolosFora}
                      </span>
                    ) : (
                      <span className="text-orange-400 font-mono text-base">vs</span>
                    )}
                    <span>{selectedMatch.jogo.clube_fora}</span>
                  </h2>
                </div>

                <button
                  type="button"
                  onClick={() => setSelectedMatch(null)}
                  className="w-9 h-9 rounded-full bg-zinc-900 border border-zinc-800 text-zinc-400 hover:text-white hover:bg-zinc-800 flex items-center justify-center text-sm font-bold transition-all cursor-pointer shrink-0"
                >
                  ✕
                </button>
              </div>

              {/* Scrollable Modal Body */}
              <div className="overflow-y-auto space-y-6 py-5 pr-1 relative z-10 scrollbar-thin">
                {!canViewModalPrediction ? (
                  <div className="bg-gradient-to-b from-zinc-900/95 via-[#0d0d12] to-black border border-amber-500/50 rounded-3xl p-6 sm:p-10 text-center space-y-5 my-2 shadow-2xl">
                    <div className="w-16 h-16 mx-auto rounded-2xl bg-amber-500/10 border border-amber-500/30 flex items-center justify-center text-3xl shadow-lg shadow-amber-500/10">
                      🔒
                    </div>
                    <div className="space-y-2">
                      <span className="text-[10px] font-mono uppercase tracking-widest text-amber-400 font-black px-3 py-1 rounded-full bg-amber-500/10 border border-amber-500/20">
                        Área Reservada • Registo Gratuito / Premium
                      </span>
                      <h3 className="text-xl sm:text-2xl font-mono font-black text-white pt-2">
                        Métricas Quantitativas & Previsões IA Protegidas
                      </h3>
                      <p className="text-xs sm:text-sm text-zinc-400 max-w-lg mx-auto leading-relaxed">
                        As probabilidades calibradas 1X2 com elevados padrões de probabilidade e tendências, estimativas de cantos e cartões, cálculo de valor esperado (+EV), purificador IA e justificações táticas são exclusivas para utilizadores registados e subscritores.
                      </p>
                    </div>
                    <div className="pt-3 flex flex-col sm:flex-row items-center justify-center gap-3">
                      <button
                        type="button"
                        onClick={() => {
                          setSelectedMatch(null);
                          const evt = new CustomEvent('open-auth-modal', { detail: { mode: 'register' } });
                          window.dispatchEvent(evt);
                        }}
                        className="w-full sm:w-auto px-6 py-3 bg-gradient-to-r from-amber-500 via-orange-500 to-amber-600 hover:from-amber-400 hover:to-orange-400 text-black font-mono font-black text-xs uppercase tracking-wider rounded-xl transition-all cursor-pointer shadow-lg active:scale-95"
                      >
                        Criar Conta Gratuita / Entrar
                      </button>
                      {isEffectiveAdmin && (
                        <button
                          type="button"
                          onClick={(e) => handleToggleUnlock(e, modalMatchKey)}
                          className="w-full sm:w-auto px-5 py-3 bg-emerald-950/80 border border-emerald-500/50 hover:bg-emerald-900 text-emerald-300 font-mono font-bold text-xs rounded-xl cursor-pointer transition-all"
                        >
                          ☑ Desbloquear Jogo aos Visitantes (Admin)
                        </button>
                      )}
                    </div>
                  </div>
                ) : (
                  <>
                    {/* Finished Match Center if match has concluded */}
                    {isModalMatchFinished && !selectedMatch.liveInfo?.isLive && (
                      <div className="bg-gradient-to-br from-emerald-950/70 via-[#0b1610] to-zinc-950 border-2 border-emerald-500/50 rounded-2xl p-5 sm:p-6 space-y-4 shadow-2xl relative overflow-hidden">
                        <div className="flex flex-wrap items-center justify-between gap-3 border-b border-emerald-500/30 pb-3">
                          <div className="flex items-center gap-2">
                            <span className="text-xl">🏁</span>
                            <h3 className="text-sm sm:text-base font-mono font-black text-white uppercase tracking-wider">
                              Jogo Terminado • Resultado Final FT
                            </h3>
                          </div>
                          <div className="flex items-center gap-2 font-mono text-xs">
                            <span className="px-3 py-1 rounded-full bg-emerald-500/20 border border-emerald-400 text-emerald-300 font-black uppercase">
                              Encerrado (90'+ FT)
                            </span>
                            {selectedMatch.jogo.data && (
                              <span className="text-zinc-400">📅 {getDateLabel(selectedMatch.jogo.data)}</span>
                            )}
                          </div>
                        </div>

                        {/* Final Scoreboard */}
                        <div className="flex items-center justify-around bg-black/60 border border-emerald-500/30 rounded-2xl p-4 sm:p-5">
                          <div className="text-center flex-1 space-y-1">
                            <span className={`text-base sm:text-xl font-black block truncate ${
                              modalFinalGolosCasa > modalFinalGolosFora ? 'text-emerald-300 font-black' : 'text-white'
                            }`}>
                              {selectedMatch.jogo.clube_casa}
                            </span>
                            <span className="text-xs font-mono text-zinc-400">
                              {modalFinalGolosCasa > modalFinalGolosFora ? '🏆 Vencedor Casa (1)' : 'Casa'}
                            </span>
                          </div>

                          <div className="px-6 py-2.5 rounded-2xl bg-emerald-950/90 border-2 border-emerald-500 text-emerald-300 font-mono font-black text-3xl sm:text-4xl shadow-inner tracking-widest mx-3">
                            {modalFinalGolosCasa} - {modalFinalGolosFora}
                          </div>

                          <div className="text-center flex-1 space-y-1">
                            <span className={`text-base sm:text-xl font-black block truncate ${
                              modalFinalGolosFora > modalFinalGolosCasa ? 'text-emerald-300 font-black' : 'text-white'
                            }`}>
                              {selectedMatch.jogo.clube_fora}
                            </span>
                            <span className="text-xs font-mono text-zinc-400">
                              {modalFinalGolosFora > modalFinalGolosCasa ? '🏆 Vencedor Fora (2)' : 'Fora'}
                            </span>
                          </div>
                        </div>

                        {/* Summary info */}
                        <div className="flex items-center justify-between text-xs font-mono text-zinc-400 px-1">
                          <span>
                            Desfecho 1X2:{' '}
                            <strong className="text-emerald-400">
                              {modalFinalGolosCasa > modalFinalGolosFora ? 'Vitória da Casa (1)' : modalFinalGolosFora > modalFinalGolosCasa ? 'Vitória de Fora (2)' : 'Empate (X)'}
                            </strong>
                          </span>
                          <span>
                            Total de Golos: <strong className="text-white">{modalFinalGolosCasa + modalFinalGolosFora}</strong> ({modalFinalGolosCasa + modalFinalGolosFora > 2.5 ? 'Over 2.5' : 'Under 2.5'})
                          </span>
                        </div>
                      </div>
                    )}

                    {/* Live Match Center (SuperIA Live Radar) if match in play */}
                    {selectedMatch.liveInfo?.isLive && (
                      <div className="bg-gradient-to-br from-red-950/70 via-[#160b10] to-zinc-950 border-2 border-red-500/50 rounded-2xl p-5 sm:p-6 space-y-4 shadow-2xl relative overflow-hidden">
                        <div className="flex flex-wrap items-center justify-between gap-3 border-b border-red-500/30 pb-3">
                          <div className="flex items-center gap-2">
                            <span className="relative flex h-3 w-3">
                              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-red-400 opacity-75" />
                              <span className="relative inline-flex rounded-full h-3 w-3 bg-red-500" />
                            </span>
                            <h3 className="text-sm sm:text-base font-mono font-black text-white uppercase tracking-wider">
                              Centro de Jogo Ao Vivo • Telemetria SuperIA (Supabase)
                            </h3>
                          </div>
                          <div className="flex items-center gap-2 font-mono text-xs">
                            <span className="text-zinc-400">Estado:</span>
                            <span className="px-2.5 py-0.5 rounded bg-red-600 text-white font-black animate-pulse">
                              {selectedMatch.liveInfo.minuto}
                            </span>
                            <span className="text-zinc-400">({selectedMatch.liveInfo.fase})</span>
                          </div>
                        </div>

                        {/* Live Scoreboard */}
                        <div className="flex items-center justify-around bg-black/60 border border-red-500/30 rounded-2xl p-4 sm:p-5">
                          <div className="text-center flex-1 space-y-1">
                            <span className="text-sm sm:text-lg font-black text-white block truncate">
                              {selectedMatch.jogo.clube_casa}
                            </span>
                            <span className="text-xs font-mono text-cyan-400">Casa</span>
                          </div>

                          <div className="px-6 py-2 rounded-2xl bg-gradient-to-r from-red-900 to-rose-950 border-2 border-red-500 text-white font-mono font-black text-3xl sm:text-4xl shadow-inner tracking-widest mx-3">
                            {selectedMatch.liveInfo.golosCasa} - {selectedMatch.liveInfo.golosFora}
                          </div>

                          <div className="text-center flex-1 space-y-1">
                            <span className="text-sm sm:text-lg font-black text-white block truncate">
                              {selectedMatch.jogo.clube_fora}
                            </span>
                            <span className="text-xs font-mono text-amber-400">Fora</span>
                          </div>
                        </div>

                        {/* Live Stats Breakdown */}
                        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 pt-1 font-mono text-xs">
                          <div className="bg-zinc-900/90 border border-zinc-800 rounded-xl p-3 text-center space-y-1">
                            <span className="text-zinc-400 block text-[11px] uppercase font-bold">🚩 Cantos ao Vivo</span>
                            <span className="text-xl font-black text-red-400 block">
                              {selectedMatch.liveInfo.totalCantosLive} cantos
                            </span>
                            <span className="text-[10px] text-zinc-400 block">
                              {selectedMatch.liveInfo.cantosCasa} casa • {selectedMatch.liveInfo.cantosFora} fora
                            </span>
                            <span className="text-[10px] text-zinc-500 block">
                              Projeção 90': {selectedMatch.metrics.cantosVal}
                            </span>
                          </div>

                          <div className="bg-zinc-900/90 border border-zinc-800 rounded-xl p-3 text-center space-y-1">
                            <span className="text-zinc-400 block text-[11px] uppercase font-bold">🟨 Cartões ao Vivo</span>
                            <span className="text-xl font-black text-amber-400 block">
                              {selectedMatch.liveInfo.totalCartoesLive} cartões
                            </span>
                            <span className="text-[10px] text-zinc-400 block">
                              {selectedMatch.liveInfo.cartoesCasa} casa • {selectedMatch.liveInfo.cartoesFora} fora
                            </span>
                            <span className="text-[10px] text-zinc-500 block">
                              Projeção 90': {selectedMatch.metrics.cartoesVal}
                            </span>
                          </div>

                          <div className="bg-zinc-900/90 border border-zinc-800 rounded-xl p-3 text-center space-y-1">
                            <span className="text-zinc-400 block text-[11px] uppercase font-bold">⏱️ Posse de Bola</span>
                            <span className="text-xl font-black text-cyan-300 block">
                              {selectedMatch.liveInfo.posseCasa}% - {selectedMatch.liveInfo.posseFora}%
                            </span>
                            <div className="w-full bg-zinc-800 h-1.5 rounded-full overflow-hidden flex mt-1">
                              <div style={{ width: `${selectedMatch.liveInfo.posseCasa}%` }} className="bg-cyan-500 transition-all" />
                              <div style={{ width: `${selectedMatch.liveInfo.posseFora}%` }} className="bg-amber-500 transition-all" />
                            </div>
                          </div>

                          <div className="bg-zinc-900/90 border border-zinc-800 rounded-xl p-3 text-center space-y-1">
                            <span className="text-zinc-400 block text-[11px] uppercase font-bold">⚡ xG & Remates</span>
                            <span className="text-xl font-black text-emerald-400 block">
                              {selectedMatch.liveInfo.xgLiveCasa} vs {selectedMatch.liveInfo.xgLiveFora} xG
                            </span>
                            <span className="text-[10px] text-zinc-400 block">
                              Remates: {selectedMatch.liveInfo.rematesCasa} vs {selectedMatch.liveInfo.rematesFora}
                            </span>
                          </div>
                        </div>

                        {/* Live Tactical Note by SuperIA */}
                        <div className="bg-red-950/40 border border-red-500/30 rounded-xl p-3.5 flex items-start gap-2.5 text-xs font-mono text-zinc-300">
                          <span className="text-base shrink-0">🧠</span>
                          <div>
                            <strong className="text-white block font-bold">Leitura Tática Live SuperIA:</strong>
                            <span>
                              {selectedMatch.liveInfo.golosCasa > selectedMatch.liveInfo.golosFora
                                ? `${selectedMatch.jogo.clube_casa} em vantagem no marcador (${selectedMatch.liveInfo.golosCasa}-${selectedMatch.liveInfo.golosFora}). Linhas defensivas compactas e transições rápidas favorecem pressão nos corredores e cantos nas saídas forçadas.`
                                : selectedMatch.liveInfo.golosFora > selectedMatch.liveInfo.golosCasa
                                ? `${selectedMatch.jogo.clube_fora} na frente (${selectedMatch.liveInfo.golosCasa}-${selectedMatch.liveInfo.golosFora}). ${selectedMatch.jogo.clube_casa} intensifica pressão ofensiva, aumentando volume de remates e probabilidade de cantos.`
                                : `Partida empatada (${selectedMatch.liveInfo.golosCasa}-${selectedMatch.liveInfo.golosFora}) ao minuto ${selectedMatch.liveInfo.minuto}. Equilíbrio tático a decorrer dentro da margem projetada pelo modelo estocástico inicial.`}
                            </span>
                          </div>
                        </div>
                      </div>
                    )}

                    {/* 1X2 Probabilities Bar */}
                    <div className="bg-zinc-950/80 border border-zinc-850 rounded-2xl p-4 sm:p-5 space-y-3">
                      <div className="flex items-center justify-between text-xs font-mono">
                        <span className="font-bold text-zinc-300 uppercase tracking-wider">
                          📊 Probabilidades 1X2 (Elevados Padrões de Probabilidade & Tendências)
                        </span>
                        <span className="text-orange-400 font-bold">Soma: 100%</span>
                      </div>

                      {/* Progress bar visual */}
                      <div className="h-4 w-full bg-zinc-900 rounded-full overflow-hidden flex border border-zinc-800">
                        <div 
                          style={{ width: `${selectedMatch.metrics.probCasa}%` }} 
                          className="bg-gradient-to-r from-cyan-600 to-cyan-400 transition-all"
                          title={`Casa: ${selectedMatch.metrics.probCasa}%`}
                        />
                        <div 
                          style={{ width: `${selectedMatch.metrics.probEmpate}%` }} 
                          className="bg-zinc-600 transition-all"
                          title={`Empate: ${selectedMatch.metrics.probEmpate}%`}
                        />
                        <div 
                          style={{ width: `${selectedMatch.metrics.probFora}%` }} 
                          className="bg-gradient-to-r from-amber-500 to-orange-500 transition-all"
                          title={`Fora: ${selectedMatch.metrics.probFora}%`}
                        />
                      </div>

                      {/* Breakdown cards */}
                      <div className="grid grid-cols-3 gap-3 pt-1">
                        <div className="bg-cyan-950/40 border border-cyan-500/30 rounded-xl p-3.5 text-center">
                          <span className="text-xs sm:text-sm font-mono uppercase text-cyan-400 block font-bold truncate">
                            {selectedMatch.jogo.clube_casa} (1)
                          </span>
                          <span className="text-xl sm:text-2xl font-black text-cyan-200 font-mono my-0.5 block">
                            {selectedMatch.metrics.probCasa}%
                          </span>
                          <span className="text-xs sm:text-sm text-zinc-300 block font-mono font-semibold">
                            Odd {selectedMatch.metrics.odd1}
                          </span>
                        </div>

                        <div className="bg-zinc-900/60 border border-zinc-850 rounded-xl p-3.5 text-center">
                          <span className="text-xs sm:text-sm font-mono uppercase text-zinc-300 block font-bold">
                            Empate (X)
                          </span>
                          <span className="text-xl sm:text-2xl font-black text-zinc-100 font-mono my-0.5 block">
                            {selectedMatch.metrics.probEmpate}%
                          </span>
                          <span className="text-xs sm:text-sm text-zinc-300 block font-mono font-semibold">
                            Odd {selectedMatch.metrics.oddX}
                          </span>
                        </div>

                        <div className="bg-amber-950/40 border border-amber-500/30 rounded-xl p-3.5 text-center">
                          <span className="text-xs sm:text-sm font-mono uppercase text-amber-400 block font-bold truncate">
                            {selectedMatch.jogo.clube_fora} (2)
                          </span>
                          <span className="text-xl sm:text-2xl font-black text-amber-200 font-mono my-0.5 block">
                            {selectedMatch.metrics.probFora}%
                          </span>
                          <span className="text-xs sm:text-sm text-zinc-300 block font-mono font-semibold">
                            Odd {selectedMatch.metrics.odd2}
                          </span>
                        </div>
                      </div>
                    </div>

                    {/* Secondary Quantitative Metrics: Cantos, Cartões, EV, Confiança */}
                    <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                      <div className="bg-zinc-950/80 border border-zinc-850 rounded-2xl p-4 text-center">
                        <span className="text-sm font-mono text-zinc-300 font-bold block">🎯 Cantos</span>
                        <span className="text-lg sm:text-xl font-black text-emerald-400 font-mono mt-1 block">
                          {selectedMatch.metrics.cantosVal}
                        </span>
                        <span className="text-xs text-zinc-400 font-mono">projetados</span>
                      </div>

                      <div className="bg-zinc-950/80 border border-zinc-850 rounded-2xl p-4 text-center">
                        <span className="text-sm font-mono text-zinc-300 font-bold block">🟨 Cartões</span>
                        <span className="text-lg sm:text-xl font-black text-amber-400 font-mono mt-1 block">
                          {selectedMatch.metrics.cartoesVal}
                        </span>
                        <span className="text-xs text-zinc-400 font-mono">projetados</span>
                      </div>

                      <div className="bg-zinc-950/80 border border-zinc-850 rounded-2xl p-4 text-center">
                        <span className="text-sm font-mono text-zinc-300 font-bold block">📈 Valor (+EV)</span>
                        <span className="text-lg sm:text-xl font-black text-cyan-400 font-mono mt-1 block">
                          {selectedMatch.metrics.evVal}
                        </span>
                        <span className="text-xs text-zinc-400 font-mono">vantagem</span>
                      </div>

                      <div className="bg-zinc-950/80 border border-zinc-850 rounded-2xl p-4 text-center">
                        <span className="text-sm font-mono text-zinc-300 font-bold block">🛡️ Confiança</span>
                        <span className="text-lg sm:text-xl font-black text-purple-400 font-mono mt-1 block">
                          {selectedMatch.metrics.confianca}%
                        </span>
                        <span className="text-xs text-zinc-400 font-mono">algoritmo</span>
                      </div>
                    </div>

                    {/* ELEVADOS PADRÕES DE PROBABILIDADE & TENDÊNCIAS (5 MÓDULOS DE ANÁLISE) */}
                    {selectedMatch.metrics.engineModules && (
                      <div className="bg-zinc-950/90 border border-cyan-500/30 rounded-2xl p-5 sm:p-6 space-y-4 relative overflow-hidden shadow-xl">
                        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-2 border-b border-zinc-800 pb-3">
                          <div className="flex items-center gap-2">
                            <span className="text-xl">⚡</span>
                            <div>
                              <h4 className="text-sm sm:text-base font-black uppercase tracking-wider text-white flex items-center gap-2">
                                <span>Elevados Padrões de Probabilidade & Tendências</span>
                                <span className="px-2.5 py-0.5 rounded-full bg-cyan-500/10 text-cyan-300 border border-cyan-500/30 text-xs font-mono font-bold">
                                  5 Módulos Ativos
                                </span>
                              </h4>
                              <p className="text-xs sm:text-sm text-zinc-300 font-mono">
                                Calibração contínua: elevados padrões matemáticos de probabilidade, tendências históricas, fatores climatéricos e fadiga competitiva.
                              </p>
                            </div>
                          </div>
                          <span className="text-xs font-mono px-2.5 py-1 rounded bg-emerald-500/15 text-emerald-300 border border-emerald-500/30 font-bold shrink-0">
                            ● ENGINE CALIBRADA
                          </span>
                        </div>

                        {/* Grid dos 5 Módulos */}
                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
                          {/* Módulo 1: Poisson */}
                          <div className="p-3.5 rounded-xl bg-[#0e1219] border border-zinc-800/90 space-y-2">
                            <div className="flex items-center justify-between">
                              <span className="text-xs sm:text-sm font-black uppercase tracking-wider text-emerald-400 flex items-center gap-1">
                                <span>📊</span> [1] Volume Ofensivo & Probabilidade
                              </span>
                              <span className="text-[10px] sm:text-xs font-mono px-2 py-0.5 rounded bg-emerald-500/10 text-emerald-300 border border-emerald-500/20 font-bold">
                                {selectedMatch.metrics.engineModules.modulo1_poisson.status}
                              </span>
                            </div>
                            <div className="text-xs sm:text-sm font-mono space-y-1 text-zinc-200">
                              <div className="flex justify-between">
                                <span className="text-zinc-400">xG Esperado:</span>
                                <strong className="text-white">
                                  {selectedMatch.metrics.engineModules.modulo1_poisson.xgHome} (C) vs {selectedMatch.metrics.engineModules.modulo1_poisson.xgAway} (F)
                                </strong>
                              </div>
                              <div className="flex justify-between">
                                <span className="text-zinc-400">Total xG:</span>
                                <strong className="text-[#00E676]">{selectedMatch.metrics.engineModules.modulo1_poisson.totalXg} golos</strong>
                              </div>
                              <div className="flex justify-between">
                                <span className="text-zinc-400">Over 2.5 / BTTS:</span>
                                <span className="text-cyan-300 font-bold">
                                  {selectedMatch.metrics.engineModules.modulo1_poisson.overUnder25.over}% • {selectedMatch.metrics.engineModules.modulo1_poisson.btts.yes}%
                                </span>
                              </div>
                            </div>
                          </div>

                          {/* Módulo 2: Físico/Clima */}
                          <div className="p-3.5 rounded-xl bg-[#0e1219] border border-zinc-800/90 space-y-2">
                            <div className="flex items-center justify-between">
                              <span className="text-xs sm:text-sm font-black uppercase tracking-wider text-cyan-400 flex items-center gap-1">
                                <span>🌦️</span> [2] Físico / Clima
                              </span>
                              <span className="text-[10px] sm:text-xs font-mono px-2 py-0.5 rounded bg-cyan-500/10 text-cyan-300 border border-cyan-500/20 font-bold">
                                Open-Meteo
                              </span>
                            </div>
                            <div className="text-xs sm:text-sm font-mono space-y-1 text-zinc-200">
                              <div className="flex justify-between">
                                <span className="text-zinc-400">Clima & Vento:</span>
                                <strong className="text-white">
                                  {selectedMatch.metrics.engineModules.modulo2_clima.temperature} • {selectedMatch.metrics.engineModules.modulo2_clima.windKmH}km/h
                                </strong>
                              </div>
                              <div className="flex justify-between">
                                <span className="text-zinc-400">Dimensão Relvado:</span>
                                <strong className="text-zinc-200">
                                  {selectedMatch.metrics.engineModules.modulo2_clima.pitchDimension}
                                </strong>
                              </div>
                              <p className="text-xs text-zinc-300 leading-relaxed pt-1">
                                {selectedMatch.metrics.engineModules.modulo2_clima.impactSummary}
                              </p>
                            </div>
                          </div>

                          {/* Módulo 3: Fator de Regressão */}
                          <div className={`p-3.5 rounded-xl bg-[#0e1219] border space-y-2 ${
                            selectedMatch.metrics.engineModules.modulo3_fatorAngelo.hasStreak5Plus 
                              ? 'border-amber-500/40 bg-amber-500/5' 
                              : 'border-zinc-800/90'
                          }`}>
                            <div className="flex items-center justify-between">
                              <span className="text-xs sm:text-sm font-black uppercase tracking-wider text-amber-400 flex items-center gap-1">
                                <span>⚡</span> [3] Fator de Regressão (5+)
                              </span>
                              <span className={`text-[10px] sm:text-xs font-mono px-2 py-0.5 rounded font-bold ${
                                selectedMatch.metrics.engineModules.modulo3_fatorAngelo.hasStreak5Plus
                                  ? 'bg-amber-500/20 text-amber-300 border border-amber-500/40'
                                  : 'bg-zinc-800 text-zinc-400'
                              }`}>
                                {selectedMatch.metrics.engineModules.modulo3_fatorAngelo.meanReversionRisk === 'Severo ⚠️' 
                                  ? 'REGRESSÃO SEVERA' 
                                  : selectedMatch.metrics.engineModules.modulo3_fatorAngelo.hasStreak5Plus 
                                  ? 'ALERTA 5+ VITÓRIAS' 
                                  : 'SÉRIE ESTÁVEL'}
                              </span>
                            </div>
                            <div className="text-xs sm:text-sm font-mono space-y-1 text-zinc-200">
                              <div className="flex justify-between">
                                <span className="text-zinc-400">Sequência:</span>
                                <strong className={selectedMatch.metrics.engineModules.modulo3_fatorAngelo.hasStreak5Plus ? 'text-amber-300' : 'text-zinc-300'}>
                                  {selectedMatch.metrics.engineModules.modulo3_fatorAngelo.hasStreak5Plus 
                                    ? `${selectedMatch.metrics.engineModules.modulo3_fatorAngelo.teamWithStreak} (${selectedMatch.metrics.engineModules.modulo3_fatorAngelo.streakCount} vitórias) 🔥` 
                                    : 'Sem sobreaquecimento'}
                                </strong>
                              </div>
                              <p className="text-xs text-zinc-300 leading-relaxed">
                                {selectedMatch.metrics.engineModules.modulo3_fatorAngelo.explanation}
                              </p>
                              <p className="text-xs text-amber-300 font-bold">
                                🛡️ {selectedMatch.metrics.engineModules.modulo3_fatorAngelo.suggestedCautionOdd}
                              </p>
                            </div>
                          </div>

                          {/* Módulo 4: Jornada Dupla & Fadiga */}
                          <div className={`p-3.5 rounded-xl bg-[#0e1219] border space-y-2 ${
                            selectedMatch.metrics.engineModules.modulo4_jornadaDupla.hasMatchWithin72h 
                              ? 'border-orange-500/40 bg-orange-500/5' 
                              : 'border-zinc-800/90'
                          }`}>
                            <div className="flex items-center justify-between">
                              <span className="text-xs sm:text-sm font-black uppercase tracking-wider text-orange-400 flex items-center gap-1">
                                <span>⏱️</span> [4] Jornada Dupla & Fadiga
                              </span>
                              <span className={`text-[10px] sm:text-xs font-mono px-2 py-0.5 rounded font-bold ${
                                selectedMatch.metrics.engineModules.modulo4_jornadaDupla.hasMatchWithin72h
                                  ? 'bg-orange-500/20 text-orange-300 border border-orange-500/40'
                                  : 'bg-zinc-800 text-zinc-400'
                              }`}>
                                {selectedMatch.metrics.engineModules.modulo4_jornadaDupla.fatigueLevel}
                              </span>
                            </div>
                            <div className="text-xs sm:text-sm font-mono space-y-1 text-zinc-200">
                              <div className="flex justify-between">
                                <span className="text-zinc-400">Descanso:</span>
                                <strong className={selectedMatch.metrics.engineModules.modulo4_jornadaDupla.hasMatchWithin72h ? 'text-orange-300' : 'text-zinc-300'}>
                                  {selectedMatch.metrics.engineModules.modulo4_jornadaDupla.restHours}h {selectedMatch.metrics.engineModules.modulo4_jornadaDupla.hasMatchWithin72h ? '(2.º jogo na semana)' : '(Descanso pleno)'}
                                </strong>
                              </div>
                              <p className="text-xs text-zinc-300 leading-relaxed">
                                {selectedMatch.metrics.engineModules.modulo4_jornadaDupla.performanceDropWarning}
                              </p>
                            </div>
                          </div>

                          {/* Módulo 5: Co-Ocorrência */}
                          <div className="p-3.5 rounded-xl bg-[#0e1219] border border-zinc-800/90 space-y-2 md:col-span-2 lg:col-span-2">
                            <div className="flex items-center justify-between">
                              <span className="text-xs sm:text-sm font-black uppercase tracking-wider text-purple-400 flex items-center gap-1">
                                <span>🔗</span> [5] Co-Ocorrência (SuperIA)
                              </span>
                              <span className="text-[10px] sm:text-xs font-mono px-2 py-0.5 rounded bg-purple-500/10 text-purple-300 font-bold border border-purple-500/20">
                                4 a 13 Seleções
                              </span>
                            </div>
                            <p className="text-xs sm:text-sm font-mono text-zinc-300 leading-relaxed">
                              {selectedMatch.metrics.engineModules.modulo5_coOcorrencia.summary}
                            </p>
                          </div>
                        </div>
                      </div>
                    )}

                    {/* AI Recommendation Badge Block */}
                    <div className="bg-gradient-to-r from-purple-950/60 via-indigo-950/60 to-purple-950/60 border border-purple-500/40 rounded-2xl p-4 sm:p-5 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
                      <div className="space-y-1">
                        <div className="flex items-center gap-2">
                          <span className="text-xs sm:text-sm font-mono text-purple-300 uppercase tracking-wider font-bold block">
                            💎 Seleção Sugerida pelo Purificador IA:
                          </span>
                          {isModalUnlocked && !isUserRegistered && (
                            <span className="text-xs px-2 py-0.5 rounded bg-emerald-500/30 border border-emerald-400/50 text-emerald-300 font-extrabold uppercase">
                              Acesso Livre Admin
                            </span>
                          )}
                        </div>
                        <h4 className="text-lg sm:text-2xl font-black text-white font-mono">
                          {selectedMatch.metrics.seloIa}
                        </h4>
                      </div>
                      <div className="flex items-center gap-2.5">
                        {isEffectiveAdmin && (
                          <button
                            type="button"
                            onClick={(e) => handleToggleUnlock(e, modalMatchKey)}
                            className={`px-3 py-2 rounded-xl text-xs sm:text-sm font-mono font-bold transition-all border cursor-pointer ${
                              isModalUnlocked
                                ? 'bg-emerald-500/20 border-emerald-500 text-emerald-300 hover:bg-emerald-500/30'
                                : 'bg-zinc-900 border-zinc-750 text-zinc-300 hover:text-white'
                            }`}
                            title="Alternar visto de desbloqueio para visitantes"
                          >
                            {isModalUnlocked ? '☑ Livre' : '☐ Bloquear'}
                          </button>
                        )}
                        <div className="px-4 py-2 rounded-xl bg-purple-500/20 border border-purple-400/40 text-purple-200 font-mono font-bold text-xs sm:text-sm shrink-0">
                          Alta Probabilidade
                        </div>
                      </div>
                    </div>

                    {/* ========================================================================= */}
                    {/* ♟️ RAIO-X TÁTICO & DUELO DE TREINADORES (BANCO DE DADOS SUPABASE)         */}
                    {/* ========================================================================= */}
                    {loadingRaioX ? (
                      <div className="p-6 rounded-2xl bg-[#0b0e14] border border-cyan-500/30 flex items-center justify-center gap-3 text-cyan-300 font-mono text-xs">
                        <span className="animate-spin text-lg">⏳</span>
                        <span>A carregar Raio-X Tático e Duelo de Treinadores no Supabase...</span>
                      </div>
                    ) : raioXTatico ? (
                      <div className="bg-gradient-to-b from-[#0b0e17] via-[#0e121d] to-[#080a10] border-2 border-cyan-500/40 rounded-3xl p-5 sm:p-7 space-y-6 shadow-2xl relative overflow-hidden">
                        {/* Ambient Glows */}
                        <div className="absolute -top-12 -right-12 w-48 h-48 bg-cyan-500/10 rounded-full blur-3xl pointer-events-none" />
                        <div className="absolute -bottom-12 -left-12 w-48 h-48 bg-amber-500/10 rounded-full blur-3xl pointer-events-none" />

                        {/* Cabeçalho do Módulo */}
                        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 border-b border-zinc-800/90 pb-4 relative z-10">
                          <div className="space-y-1">
                            <div className="flex items-center gap-2">
                              <span className="text-2xl">♟️</span>
                              <h4 className="text-base sm:text-lg font-black uppercase tracking-wider text-white flex items-center gap-2">
                                <span>Raio-X Tático & Duelo de Treinadores</span>
                              </h4>
                              <span className="px-2.5 py-0.5 rounded-full bg-cyan-500/20 border border-cyan-400/40 text-cyan-300 font-mono text-[11px] font-black">
                                ENGINE TÁTICA SUPABASE
                              </span>
                            </div>
                            <p className="text-xs sm:text-sm text-zinc-300 font-mono">
                              Confronto direto de esquemas táticos, ratings setoriais por bloco e perfil psicológico de liderança.
                            </p>
                          </div>

                          {/* Badge de Vantagem Tática Calculada */}
                          {(() => {
                            const diffAtaqueDefesaCasa = Number(raioXTatico.rating_ataque_casa) - Number(raioXTatico.rating_defesa_fora);
                            const diffAtaqueDefesaFora = Number(raioXTatico.rating_ataque_fora) - Number(raioXTatico.rating_defesa_casa);
                            const vantagemCasa = diffAtaqueDefesaCasa > diffAtaqueDefesaFora;
                            const diffVantagem = Math.abs(diffAtaqueDefesaCasa - diffAtaqueDefesaFora).toFixed(2);

                            return (
                              <div className="px-3.5 py-2 rounded-2xl bg-zinc-900/90 border border-zinc-750 flex items-center gap-2 shrink-0">
                                <span className="text-base">⚡</span>
                                <div className="text-left">
                                  <span className="text-[10px] font-mono uppercase tracking-wider text-zinc-400 block font-bold">Vantagem Tática:</span>
                                  <span className={`text-xs font-mono font-black ${vantagemCasa ? 'text-cyan-300' : 'text-amber-300'}`}>
                                    {vantagemCasa ? `${raioXTatico.equipa_casa} (+${diffVantagem})` : `${raioXTatico.equipa_fora} (+${diffVantagem})`}
                                  </span>
                                </div>
                              </div>
                            );
                          })()}
                        </div>

                        {/* Duelo de Treinadores & Formações (IDs pedidos no prompt integrados) */}
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 relative z-10">
                          {/* Banco Casa */}
                          <div className="bg-gradient-to-br from-[#0e1626] to-[#0a0f1c] border border-cyan-500/30 rounded-2xl p-4 sm:p-5 space-y-3 relative shadow-lg">
                            <div className="flex items-center justify-between">
                              <span className="text-[10px] font-mono uppercase tracking-widest text-cyan-400 font-bold px-2 py-0.5 rounded bg-cyan-500/10 border border-cyan-500/20">
                                CASA • {raioXTatico.equipa_casa}
                              </span>
                              {raioXTatico.estrelas_treinador_casa && (
                                <span className="text-xs font-mono text-amber-400 font-bold flex items-center gap-1">
                                  <span>⭐</span>
                                  <span>{raioXTatico.estrelas_treinador_casa}</span>
                                  {raioXTatico.signo_treinador_casa && (
                                    <span className="text-zinc-400 text-[10px]">({raioXTatico.signo_treinador_casa})</span>
                                  )}
                                </span>
                              )}
                            </div>

                            <div className="space-y-1">
                              <span className="text-xs font-mono text-zinc-400 block">Comandante & Esquema Tático:</span>
                              <div 
                                id="treinador-casa" 
                                className="text-base sm:text-lg font-black text-white font-mono tracking-tight"
                              >
                                {raioXTatico.treinador_casa} ({raioXTatico.tatica_casa})
                              </div>
                            </div>

                            {/* Badge do Esquema Tático */}
                            <div className="flex items-center gap-2 pt-1">
                              <span className="px-3 py-1 rounded-xl bg-cyan-950/80 border border-cyan-500/50 text-cyan-300 font-mono font-black text-xs">
                                Formação {raioXTatico.tatica_casa}
                              </span>
                              <span className="text-[11px] text-zinc-400 font-mono">
                                {raioXTatico.tatica_casa === '4-3-3' 
                                  ? 'Largura pelos extremos com triângulo central' 
                                  : raioXTatico.tatica_casa === '4-2-3-1'
                                  ? 'Duplo pivot de contenção & 10 criativo'
                                  : raioXTatico.tatica_casa === '3-5-2'
                                  ? 'Alas dinâmicos & densidade defensiva axial'
                                  : 'Estrutura compacta com transição rápida'}
                              </span>
                            </div>
                          </div>

                          {/* Banco Fora */}
                          <div className="bg-gradient-to-br from-[#1d1522] to-[#120e17] border border-amber-500/30 rounded-2xl p-4 sm:p-5 space-y-3 relative shadow-lg">
                            <div className="flex items-center justify-between">
                              <span className="text-[10px] font-mono uppercase tracking-widest text-amber-400 font-bold px-2 py-0.5 rounded bg-amber-500/10 border border-amber-500/20">
                                FORA • {raioXTatico.equipa_fora}
                              </span>
                              {raioXTatico.estrelas_treinador_fora && (
                                <span className="text-xs font-mono text-amber-400 font-bold flex items-center gap-1">
                                  <span>⭐</span>
                                  <span>{raioXTatico.estrelas_treinador_fora}</span>
                                  {raioXTatico.signo_treinador_fora && (
                                    <span className="text-zinc-400 text-[10px]">({raioXTatico.signo_treinador_fora})</span>
                                  )}
                                </span>
                              )}
                            </div>

                            <div className="space-y-1">
                              <span className="text-xs font-mono text-zinc-400 block">Comandante & Esquema Tático:</span>
                              <div 
                                id="treinador-fora" 
                                className="text-base sm:text-lg font-black text-white font-mono tracking-tight"
                              >
                                {raioXTatico.treinador_fora} ({raioXTatico.tatica_fora})
                              </div>
                            </div>

                            {/* Badge do Esquema Tático */}
                            <div className="flex items-center gap-2 pt-1">
                              <span className="px-3 py-1 rounded-xl bg-amber-950/80 border border-amber-500/50 text-amber-300 font-mono font-black text-xs">
                                Formação {raioXTatico.tatica_fora}
                              </span>
                              <span className="text-[11px] text-zinc-400 font-mono">
                                {raioXTatico.tatica_fora === '4-3-3' 
                                  ? 'Pressão alta em bloco e ataque apoiado' 
                                  : raioXTatico.tatica_fora === '4-2-3-1'
                                  ? 'Organização equilibrada entre linhas'
                                  : raioXTatico.tatica_fora === '3-5-2'
                                  ? 'Saída a 3 com alas de profundidade'
                                  : 'Linhas recuadas com contra-golpe'}
                              </span>
                            </div>
                          </div>
                        </div>

                        {/* Comparação Setorial (Ataque vs Defesa / Meio-Campo / Guarda-Redes) */}
                        <div className="space-y-3 relative z-10">
                          <div className="flex items-center justify-between">
                            <span className="text-xs sm:text-sm font-mono font-bold uppercase tracking-wider text-zinc-300 flex items-center gap-2">
                              <span>⚔️</span>
                              <span>Comparação de Setores Chave (Escala 0 a 10)</span>
                            </span>
                            <span className="text-[10px] font-mono text-zinc-400">
                              Ratings Algorítmicos Sofascore / SuperIA
                            </span>
                          </div>

                          {/* Grid dos 4 Setores */}
                          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
                            {/* Confronto Crucial 1: Ataque Casa vs Defesa Fora */}
                            <div className="p-4 rounded-2xl bg-zinc-950/90 border border-cyan-500/30 space-y-2">
                              <span className="text-[10px] font-mono uppercase tracking-wider text-cyan-400 block font-bold">
                                Ataque C vs Defesa F
                              </span>
                              <div className="flex items-baseline justify-between font-mono">
                                <div>
                                  <span className="text-[10px] text-zinc-400 block">Atq Casa</span>
                                  <span id="rating-ataque-casa" className="text-2xl font-black text-cyan-300">
                                    {raioXTatico.rating_ataque_casa}
                                  </span>
                                </div>
                                <span className="text-zinc-600 font-bold">vs</span>
                                <div className="text-right">
                                  <span className="text-[10px] text-zinc-400 block">Def Fora</span>
                                  <span id="rating-defesa-fora" className="text-2xl font-black text-amber-300">
                                    {raioXTatico.rating_defesa_fora}
                                  </span>
                                </div>
                              </div>
                              {/* Balanço visual */}
                              <div className="h-1.5 w-full bg-zinc-900 rounded-full overflow-hidden flex">
                                <div 
                                  style={{ width: `${(Number(raioXTatico.rating_ataque_casa) / (Number(raioXTatico.rating_ataque_casa) + Number(raioXTatico.rating_defesa_fora))) * 100}%` }}
                                  className="bg-cyan-400"
                                />
                                <div 
                                  style={{ width: `${(Number(raioXTatico.rating_defesa_fora) / (Number(raioXTatico.rating_ataque_casa) + Number(raioXTatico.rating_defesa_fora))) * 100}%` }}
                                  className="bg-amber-400"
                                />
                              </div>
                              <span className="text-[10px] font-mono text-zinc-400 block truncate">
                                {Number(raioXTatico.rating_ataque_casa) > Number(raioXTatico.rating_defesa_fora)
                                  ? '🔥 Superioridade ofensiva da Casa'
                                  : '🛡️ Defesa Fora anula investidas'}
                              </span>
                            </div>

                            {/* Confronto Crucial 2: Ataque Fora vs Defesa Casa */}
                            <div className="p-4 rounded-2xl bg-zinc-950/90 border border-amber-500/30 space-y-2">
                              <span className="text-[10px] font-mono uppercase tracking-wider text-amber-400 block font-bold">
                                Ataque F vs Defesa C
                              </span>
                              <div className="flex items-baseline justify-between font-mono">
                                <div>
                                  <span className="text-[10px] text-zinc-400 block">Atq Fora</span>
                                  <span className="text-2xl font-black text-amber-300">
                                    {raioXTatico.rating_ataque_fora}
                                  </span>
                                </div>
                                <span className="text-zinc-600 font-bold">vs</span>
                                <div className="text-right">
                                  <span className="text-[10px] text-zinc-400 block">Def Casa</span>
                                  <span className="text-2xl font-black text-cyan-300">
                                    {raioXTatico.rating_defesa_casa}
                                  </span>
                                </div>
                              </div>
                              {/* Balanço visual */}
                              <div className="h-1.5 w-full bg-zinc-900 rounded-full overflow-hidden flex">
                                <div 
                                  style={{ width: `${(Number(raioXTatico.rating_ataque_fora) / (Number(raioXTatico.rating_ataque_fora) + Number(raioXTatico.rating_defesa_casa))) * 100}%` }}
                                  className="bg-amber-400"
                                />
                                <div 
                                  style={{ width: `${(Number(raioXTatico.rating_defesa_casa) / (Number(raioXTatico.rating_ataque_fora) + Number(raioXTatico.rating_defesa_casa))) * 100}%` }}
                                  className="bg-cyan-400"
                                />
                              </div>
                              <span className="text-[10px] font-mono text-zinc-400 block truncate">
                                {Number(raioXTatico.rating_ataque_fora) > Number(raioXTatico.rating_defesa_casa)
                                  ? '⚠️ Fora com perigo no contra-ataque'
                                  : '🔒 Muralha defensiva da Casa'}
                              </span>
                            </div>

                            {/* Batalha do Miolo: Meios Casa vs Meios Fora */}
                            <div className="p-4 rounded-2xl bg-zinc-950/90 border border-zinc-800 space-y-2">
                              <span className="text-[10px] font-mono uppercase tracking-wider text-purple-400 block font-bold">
                                Meio-Campo (Posse & Pressão)
                              </span>
                              <div className="flex items-baseline justify-between font-mono">
                                <div>
                                  <span className="text-[10px] text-zinc-400 block">Meios C</span>
                                  <span className="text-2xl font-black text-cyan-300">
                                    {raioXTatico.rating_meios_casa}
                                  </span>
                                </div>
                                <span className="text-zinc-600 font-bold">vs</span>
                                <div className="text-right">
                                  <span className="text-[10px] text-zinc-400 block">Meios F</span>
                                  <span className="text-2xl font-black text-amber-300">
                                    {raioXTatico.rating_meios_fora}
                                  </span>
                                </div>
                              </div>
                              <div className="h-1.5 w-full bg-zinc-900 rounded-full overflow-hidden flex">
                                <div 
                                  style={{ width: `${(Number(raioXTatico.rating_meios_casa) / (Number(raioXTatico.rating_meios_casa) + Number(raioXTatico.rating_meios_fora))) * 100}%` }}
                                  className="bg-cyan-400"
                                />
                                <div 
                                  style={{ width: `${(Number(raioXTatico.rating_meios_fora) / (Number(raioXTatico.rating_meios_casa) + Number(raioXTatico.rating_meios_fora))) * 100}%` }}
                                  className="bg-amber-400"
                                />
                              </div>
                              <span className="text-[10px] font-mono text-zinc-400 block truncate">
                                {Number(raioXTatico.rating_meios_casa) >= Number(raioXTatico.rating_meios_fora)
                                  ? 'Controlo do ritmo pela equipa da Casa'
                                  : 'Equipa visitante superior na transição'}
                              </span>
                            </div>

                            {/* Balizas: Guarda-Redes Casa vs Guarda-Redes Fora */}
                            <div className="p-4 rounded-2xl bg-zinc-950/90 border border-zinc-800 space-y-2">
                              <span className="text-[10px] font-mono uppercase tracking-wider text-emerald-400 block font-bold">
                                Eficácia de Baliza (GR)
                              </span>
                              <div className="flex items-baseline justify-between font-mono">
                                <div>
                                  <span className="text-[10px] text-zinc-400 block">GR Casa</span>
                                  <span className="text-2xl font-black text-cyan-300">
                                    {raioXTatico.rating_gr_casa}
                                  </span>
                                </div>
                                <span className="text-zinc-600 font-bold">vs</span>
                                <div className="text-right">
                                  <span className="text-[10px] text-zinc-400 block">GR Fora</span>
                                  <span className="text-2xl font-black text-amber-300">
                                    {raioXTatico.rating_gr_fora}
                                  </span>
                                </div>
                              </div>
                              <div className="h-1.5 w-full bg-zinc-900 rounded-full overflow-hidden flex">
                                <div 
                                  style={{ width: `${(Number(raioXTatico.rating_gr_casa) / (Number(raioXTatico.rating_gr_casa) + Number(raioXTatico.rating_gr_fora))) * 100}%` }}
                                  className="bg-cyan-400"
                                />
                                <div 
                                  style={{ width: `${(Number(raioXTatico.rating_gr_fora) / (Number(raioXTatico.rating_gr_casa) + Number(raioXTatico.rating_gr_fora))) * 100}%` }}
                                  className="bg-amber-400"
                                />
                              </div>
                              <span className="text-[10px] font-mono text-zinc-400 block truncate">
                                Segurança de golo evitado (xGOT)
                              </span>
                            </div>
                          </div>
                        </div>

                        {/* Psicologia & Liderança Tática Enriquecida */}
                        <div className="p-4 sm:p-5 rounded-2xl bg-[#080b12] border border-purple-500/30 space-y-4 relative z-10 shadow-lg">
                          <div className="flex items-center justify-between border-b border-zinc-800 pb-2.5">
                            <div className="flex items-center gap-2">
                              <span className="text-base">🧠</span>
                              <span className="text-xs font-mono uppercase tracking-wider text-purple-300 font-bold">
                                Análise Psicológica de Balneário & Perfil de Liderança (Supabase)
                              </span>
                            </div>
                            <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-purple-500/20 text-purple-300 border border-purple-500/40 font-bold">
                              DADOS REAIS TREINADORES
                            </span>
                          </div>

                          {/* Cards Individuais dos Treinadores com Psicologia e Motivação */}
                          <div className="grid grid-cols-1 md:grid-cols-2 gap-3 pt-1">
                            {/* Casa */}
                            <div className="p-3.5 rounded-xl bg-zinc-950/70 border border-cyan-500/20 space-y-2">
                              <div className="flex items-center justify-between">
                                <span className="text-[11px] font-bold text-cyan-400 font-mono">
                                  {raioXTatico.treinador_casa} ({raioXTatico.equipa_casa})
                                </span>
                                {raioXTatico.nacionalidade_treinador_casa && (
                                  <span className="text-[10px] text-zinc-400 font-mono">
                                    {raioXTatico.nacionalidade_treinador_casa}
                                  </span>
                                )}
                              </div>
                              <div className="text-xs text-zinc-200 space-y-1">
                                <div>
                                  <span className="text-zinc-400 font-mono text-[10px] block uppercase">Perfil Psicológico:</span>
                                  <strong className="text-white">{raioXTatico.perfil_psicologico_casa || 'Comandante de alta intensidade e exigência posicional'}</strong>
                                </div>
                                <div className="flex items-center justify-between pt-1 border-t border-zinc-900 text-[11px] font-mono">
                                  <span className="text-zinc-400">Capacidade Motivação:</span>
                                  <span className="text-amber-400 font-bold">
                                    {raioXTatico.motivacao_balneario_casa ? `${raioXTatico.motivacao_balneario_casa}/100` : '85/100'} ⭐
                                  </span>
                                </div>
                                {raioXTatico.dias_cargo_casa != null && (
                                  <div className="flex items-center justify-between text-[11px] font-mono">
                                    <span className="text-zinc-400">Tempo no Cargo:</span>
                                    <span className="text-zinc-300">{raioXTatico.dias_cargo_casa} dias</span>
                                  </div>
                                )}
                              </div>
                            </div>

                            {/* Fora */}
                            <div className="p-3.5 rounded-xl bg-zinc-950/70 border border-amber-500/20 space-y-2">
                              <div className="flex items-center justify-between">
                                <span className="text-[11px] font-bold text-amber-400 font-mono">
                                  {raioXTatico.treinador_fora} ({raioXTatico.equipa_fora})
                                </span>
                                {raioXTatico.nacionalidade_treinador_fora && (
                                  <span className="text-[10px] text-zinc-400 font-mono">
                                    {raioXTatico.nacionalidade_treinador_fora}
                                  </span>
                                )}
                              </div>
                              <div className="text-xs text-zinc-200 space-y-1">
                                <div>
                                  <span className="text-zinc-400 font-mono text-[10px] block uppercase">Perfil Psicológico:</span>
                                  <strong className="text-white">{raioXTatico.perfil_psicologico_fora || 'Organização tática fria, resiliência mental e transição'}</strong>
                                </div>
                                <div className="flex items-center justify-between pt-1 border-t border-zinc-900 text-[11px] font-mono">
                                  <span className="text-zinc-400">Capacidade Motivação:</span>
                                  <span className="text-amber-400 font-bold">
                                    {raioXTatico.motivacao_balneario_fora ? `${raioXTatico.motivacao_balneario_fora}/100` : '82/100'} ⭐
                                  </span>
                                </div>
                                {raioXTatico.dias_cargo_fora != null && (
                                  <div className="flex items-center justify-between text-[11px] font-mono">
                                    <span className="text-zinc-400">Tempo no Cargo:</span>
                                    <span className="text-zinc-300">{raioXTatico.dias_cargo_fora} dias</span>
                                  </div>
                                )}
                              </div>
                            </div>
                          </div>

                          {/* Síntese do Confronto Psicológico */}
                          <div className="pt-1">
                            <span className="text-[10px] font-mono text-zinc-400 uppercase tracking-wider block mb-1">
                              Impacto Psicológico no Relvado:
                            </span>
                            <p 
                              id="psicologia-casa"
                              className="text-xs sm:text-sm text-zinc-200 leading-relaxed font-sans bg-black/40 p-3 rounded-xl border border-zinc-900"
                            >
                              {raioXTatico.perfil_lideranca_psicologica || (
                                Number(raioXTatico.rating_ataque_casa) > Number(raioXTatico.rating_defesa_fora)
                                  ? `${raioXTatico.treinador_casa} impõe um perfil agressivo de bloco alto com pressão pós-perda na saída de bola de ${raioXTatico.treinador_fora}. Em resposta, ${raioXTatico.treinador_fora} procura atrair o adversário para explorar as costas dos laterais com verticalidade veloz.`
                                  : `${raioXTatico.treinador_fora} estrutura uma liderança resiliente e compacta, restringindo o espaço entrelinhas de ${raioXTatico.treinador_casa} e forçando remates de meia distância e cantos nas dobras defensivas.`
                              )}
                            </p>
                          </div>
                        </div>
                      </div>
                    ) : null}

                    {/* Explanatory Analysis Text */}
                    <div className="bg-zinc-950/90 border border-zinc-850 rounded-2xl p-5 sm:p-6 space-y-2.5">
                      <h4 className="text-sm sm:text-base font-mono font-bold uppercase tracking-wider text-orange-400 flex items-center gap-2">
                        <span>📝 Justificação Tática & Análise de Tendências:</span>
                      </h4>
                      <p className="text-sm sm:text-base text-zinc-200 leading-relaxed font-sans">
                        {selectedMatch.metrics.textoAnalise}
                      </p>
                    </div>

                    {/* ========================================================================= */}
                    {/* 💬 BALNEÁRIO TÉCNICO IAiRB • CHAT INTERATIVO UEFA EM TEMPO REAL          */}
                    {/* ========================================================================= */}
                    <div className="bg-[#0b0c12] border-2 border-amber-500/40 rounded-3xl p-5 sm:p-7 space-y-5 shadow-2xl relative overflow-hidden">
                      {/* Header do Balneário */}
                        <div className="flex flex-wrap items-center justify-between gap-3 border-b border-zinc-800 pb-4">
                          <div className="flex items-center gap-3">
                            <div className="w-10 h-10 rounded-2xl bg-gradient-to-br from-amber-500/20 to-orange-500/30 border border-amber-400/50 flex items-center justify-center text-xl shadow-inner">
                              👔
                            </div>
                            <div>
                              <div className="flex items-center gap-2">
                                <h4 className="text-base sm:text-lg font-black text-white tracking-tight flex items-center gap-2">
                                  <span>Balneário Técnico IAiRB</span>
                                </h4>
                                <span className="px-2 py-0.5 rounded-full bg-emerald-500/20 text-emerald-300 font-mono text-[10px] font-black uppercase border border-emerald-500/40 flex items-center gap-1">
                                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-ping" />
                                  Diretor Técnico UEFA Pro • Online
                                </span>
                              </div>
                              <p className="text-xs text-zinc-400 font-mono mt-0.5">
                                Conversação tática fluida e contínua alimentada por dados em tempo real
                              </p>
                            </div>
                          </div>

                          <div className="flex items-center gap-2">
                            <span className="text-[11px] font-mono text-amber-300 px-2.5 py-1 rounded-xl bg-amber-500/10 border border-amber-500/30">
                              {selectedMatch.jogo.clube_casa} vs {selectedMatch.jogo.clube_fora}
                            </span>
                            <button
                              type="button"
                              onClick={() => {
                                const cCasa = selectedMatch.jogo.clube_casa;
                                const cFora = selectedMatch.jogo.clube_fora;
                                const p1 = selectedMatch.metrics.probCasa;
                                const px = selectedMatch.metrics.probEmpate;
                                const p2 = selectedMatch.metrics.probFora;
                                const xgC = selectedMatch.metrics.xgCasa;
                                const xgF = selectedMatch.metrics.xgFora;
                                setDtChatMessages([
                                  {
                                    id: 'initial-' + Date.now(),
                                    role: 'model',
                                    text: `⚽ **Balneário Técnico Reiniciado (${cCasa} vs ${cFora})**\n\nMétricas ativas: **${p1}% [1]** | **${px}% [X]** | **${p2}% [2]** com xG **${xgC}** vs **${xgF}**.\n\nPergunta-me qualquer cenário de jogo ou estratégia técnica!`,
                                    timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
                                  }
                                ]);
                              }}
                              className="text-[10px] font-mono px-2 py-1 rounded-lg bg-zinc-900 hover:bg-zinc-800 text-zinc-400 hover:text-zinc-200 border border-zinc-750 transition-all cursor-pointer"
                              title="Limpar e reiniciar conversa"
                            >
                              🔄 Limpar
                            </button>
                          </div>
                        </div>

                        {/* Atalhos Rápidos Interativos (injetam direto no chat) */}
                        <div className="space-y-2">
                          <div className="flex items-center justify-between">
                            <span className="text-xs font-mono text-amber-400/90 font-bold flex items-center gap-1.5">
                              <span>⚡</span>
                              <span>Atalhos Táticos de Balneário (Clique para Perguntar):</span>
                            </span>
                            <span className="text-[10px] font-mono text-zinc-500">Injeta diretamente no chat</span>
                          </div>

                          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-2">
                            {[
                              {
                                label: '📋 Parecer Completo DT UEFA',
                                question: `Atua como Diretor Técnico UEFA Pro para a partida ${selectedMatch.jogo.clube_casa} vs ${selectedMatch.jogo.clube_fora}. Dá-me um parecer tático completo abordando a dinâmica de balneário, cargas físicas para os 70'+ e solidez defensiva com xG de ${selectedMatch.metrics.xgCasa} vs ${selectedMatch.metrics.xgFora}.`
                              },
                              {
                                label: '🧠 Efeito de Sofrer Golo Cedo',
                                question: `O que acontece no balneário e nas tendências do jogo se o ${selectedMatch.jogo.clube_casa} sofrer um golo madrugador nos primeiros 15 minutos? Como deve a equipa reagir anímica e taticamente?`
                              },
                              {
                                label: '⚡ Cansaço Tardio aos 70\'+',
                                question: `Como projetas a quebra neuromuscular e o desgaste aos 70 minutos para ${selectedMatch.jogo.clube_casa} vs ${selectedMatch.jogo.clube_fora}? Que substituições nos corredores ou meio-campo são prioritárias?`
                              },
                              {
                                label: '🛡️ Ajuste do Miolo & Zona 14',
                                question: `Como ajustar o meio-campo e o último reduto defensivo face ao volume de xG de ${selectedMatch.metrics.xgFora} do adversário para travar entradas entre linhas?`
                              },
                            ].map((item, idx) => (
                              <button
                                key={idx}
                                type="button"
                                disabled={isDtChatThinking}
                                onClick={() => handleSendDtChatMessage(item.question)}
                                className="text-left text-xs font-mono p-2.5 rounded-xl bg-zinc-950/80 hover:bg-amber-500/10 border border-zinc-800 hover:border-amber-400/50 text-zinc-300 hover:text-amber-200 transition-all cursor-pointer flex items-center justify-between gap-1 shadow-sm active:scale-95 disabled:opacity-50"
                              >
                                <span className="truncate font-semibold">{item.label}</span>
                                <span className="text-amber-400 text-[10px]">➔</span>
                              </button>
                            ))}
                          </div>
                        </div>

                        {/* Janela de Balões de Conversação Fluida */}
                        <div
                          ref={dtChatScrollRef}
                          className="bg-black/90 border border-zinc-800 rounded-2xl p-4 min-h-[320px] max-h-[460px] overflow-y-auto space-y-4 shadow-inner scrollbar-thin"
                        >
                          {dtChatMessages.map((msg) => {
                            const isUser = msg.role === 'user';
                            return (
                              <div
                                key={msg.id}
                                className={`flex flex-col ${isUser ? 'items-end' : 'items-start'} space-y-1`}
                              >
                                <div className="flex items-center gap-2 px-1">
                                  <span className="text-[10px] font-mono uppercase tracking-wider text-zinc-500">
                                    {isUser ? '👤 Tu (Utilizador)' : '👔 Diretor Técnico UEFA'}
                                  </span>
                                  <span className="text-[10px] font-mono text-zinc-600">
                                    {msg.timestamp}
                                  </span>
                                </div>

                                <div
                                  className={`max-w-[92%] sm:max-w-[85%] rounded-2xl p-3.5 sm:p-4 text-xs sm:text-sm font-mono leading-relaxed shadow-md whitespace-pre-wrap ${
                                    isUser
                                      ? 'bg-gradient-to-r from-amber-600 to-orange-600 text-white rounded-tr-sm border border-amber-400/40'
                                      : 'bg-zinc-900/95 text-zinc-100 rounded-tl-sm border border-zinc-750'
                                  }`}
                                >
                                  {msg.text}
                                </div>
                              </div>
                            );
                          })}

                          {isDtChatThinking && (
                            <div className="flex flex-col items-start space-y-1">
                              <div className="flex items-center gap-2 px-1">
                                <span className="text-[10px] font-mono uppercase tracking-wider text-amber-400">
                                  👔 Diretor Técnico UEFA
                                </span>
                                <span className="text-[10px] font-mono text-zinc-500">a responder...</span>
                              </div>
                              <div className="bg-zinc-900/95 border border-zinc-750 rounded-2xl rounded-tl-sm p-3.5 flex items-center gap-2 text-xs font-mono text-zinc-300">
                                <div className="flex items-center gap-1.5 py-0.5">
                                  <span className="w-1.5 h-1.5 rounded-full bg-amber-400 animate-pulse" />
                                  <span className="w-1.5 h-1.5 rounded-full bg-amber-400 animate-pulse [animation-delay:200ms]" />
                                  <span className="w-1.5 h-1.5 rounded-full bg-amber-400 animate-pulse [animation-delay:400ms]" />
                                </div>
                                <span className="text-[11px] text-zinc-400 font-sans">A processar resposta...</span>
                              </div>
                            </div>
                          )}
                        </div>

                        {/* Input de Mensagem do Chat */}
                        <form
                          onSubmit={(e) => {
                            e.preventDefault();
                            handleSendDtChatMessage();
                          }}
                          className="space-y-2"
                        >
                          <div className="flex items-center gap-2">
                            <input
                              type="text"
                              value={dtChatInput}
                              onChange={(e) => setDtChatInput(e.target.value)}
                              disabled={isDtChatThinking}
                              placeholder={`Pergunta ao DT (Ex: "Como explorar o favoritismo de ${selectedMatch.metrics.probCasa}%?" ou "Como ajustar o meio-campo?")...`}
                              className="flex-1 bg-black/90 border border-zinc-750 hover:border-amber-500/60 focus:border-amber-400 rounded-xl px-4 py-3 text-xs sm:text-sm font-mono text-zinc-100 placeholder-zinc-500 focus:outline-none transition-all shadow-inner disabled:opacity-50"
                            />
                            <button
                              type="submit"
                              disabled={!dtChatInput.trim() || isDtChatThinking}
                              className="px-5 py-3 bg-gradient-to-r from-amber-500 to-orange-500 hover:from-amber-400 hover:to-orange-400 disabled:opacity-40 disabled:cursor-not-allowed text-black font-mono font-black text-xs sm:text-sm uppercase tracking-wider rounded-xl transition-all cursor-pointer flex items-center gap-2 shadow-lg active:scale-95 shrink-0"
                            >
                              <span>{isDtChatThinking ? '⏳' : 'Enviar'}</span>
                              <span className="hidden sm:inline text-xs">➔</span>
                            </button>
                          </div>

                          <div className="flex flex-wrap items-center justify-between gap-2 text-[11px] font-mono text-zinc-400 pt-1">
                            <div className="flex items-center gap-1.5">
                              <span className="w-1.5 h-1.5 rounded-full bg-emerald-400" />
                              <span>Contexto Ativo: Probabilidades ({selectedMatch.metrics.probCasa}% / {selectedMatch.metrics.probEmpate}% / {selectedMatch.metrics.probFora}%) & xG ({selectedMatch.metrics.xgCasa} vs {selectedMatch.metrics.xgFora})</span>
                            </div>
                            <span className="text-zinc-500">Pressiona Enter para enviar</span>
                          </div>
                        </form>
                      </div>
                  </>
                )}
              </div>

              {/* Modal Footer Actions */}
              <div className="pt-4 border-t border-zinc-800 flex flex-wrap items-center justify-between gap-3 relative z-10">
                {canViewModalPrediction ? (
                  <button
                    type="button"
                    onClick={handleCopyAnalysis}
                    className="px-4 py-3 bg-zinc-900 hover:bg-zinc-800 border border-zinc-750 text-zinc-200 text-xs sm:text-sm font-mono font-bold rounded-xl transition-all cursor-pointer flex items-center gap-2 shadow"
                  >
                    <span>📋</span>
                    <span>{copiedToast ? 'Copiado para a área de transferência!' : 'Copiar Análise Completa'}</span>
                  </button>
                ) : (
                  <div className="text-xs sm:text-sm font-mono text-zinc-400 flex items-center gap-1.5">
                    <span>🔒</span>
                    <span>Métricas e previsões protegidas por registo.</span>
                  </div>
                )}

                <button
                  type="button"
                  onClick={() => setSelectedMatch(null)}
                  className="px-6 py-3 bg-gradient-to-r from-orange-500 to-amber-500 hover:from-orange-400 hover:to-amber-400 text-black text-xs sm:text-sm font-mono font-black uppercase tracking-wider rounded-xl transition-all cursor-pointer shadow-lg active:scale-95"
                >
                  Concluir Leitura
                </button>
              </div>
            </div>
          </div>
        );
      })()}

      {/* 📊 POPUP MODAL: RESULTADO DA SIMULAÇÃO DA MÚLTIPLA (RPC SUPABASE) */}
      {showMultiplaModal && multiplaSimulationResult && (
        <div 
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/90 backdrop-blur-md transition-all duration-300 animate-fade-in"
          onClick={() => setShowMultiplaModal(false)}
        >
          <div 
            className="relative max-w-2xl w-full bg-[#10121a] border border-amber-500/50 rounded-3xl overflow-hidden p-6 sm:p-8 shadow-2xl flex flex-col gap-6 text-left border-glow-amber"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Header */}
            <div className="flex items-start justify-between border-b border-zinc-800 pb-4">
              <div className="space-y-1">
                <span className="text-[10px] font-mono font-bold tracking-widest text-amber-400 uppercase bg-amber-950/70 px-2.5 py-1 rounded-md border border-amber-500/40">
                  🎯 Engine de Simulação de Múltiplas • Supabase RPC
                </span>
                <h3 className="text-xl sm:text-2xl font-black text-white mt-2 flex items-center gap-2">
                  <span>Probabilidade & Histórico da Múltipla</span>
                </h3>
              </div>
              <button
                type="button"
                onClick={() => setShowMultiplaModal(false)}
                className="text-zinc-400 hover:text-white p-2 rounded-xl hover:bg-zinc-800 transition-colors cursor-pointer text-sm"
              >
                ✕
              </button>
            </div>

            {/* Equipas Selecionadas no Boletim */}
            <div className="p-4 rounded-2xl bg-zinc-950/90 border border-zinc-850 space-y-2">
              <div className="flex items-center justify-between text-xs font-mono font-bold text-amber-300">
                <span>📋 Equipas Escolhidas ({selectedMultiplaItems.length}):</span>
                <span>Odd Multiplicada Aprox: {selectedMultiplaItems.reduce((acc, item) => acc * (parseFloat(item.odd) || 1.2), 1).toFixed(2)}</span>
              </div>
              <div className="flex flex-wrap gap-2 pt-1">
                {selectedMultiplaItems.map((item, idx) => (
                  <div key={idx} className="flex items-center gap-1.5 px-3 py-1 rounded-xl bg-zinc-900 border border-zinc-750 text-xs font-mono text-zinc-200">
                    <span className="text-amber-400 font-black">✓</span>
                    <span className="font-bold text-white">{item.teamName}</span>
                    <span className="text-zinc-400 text-[10px]">({item.odd})</span>
                  </div>
                ))}
              </div>
            </div>

            {/* Métricas Principais Retornadas pelo RPC */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
              {/* Taxa de Sucesso */}
              <div className="bg-gradient-to-b from-zinc-900 to-zinc-950 p-4 rounded-2xl border border-zinc-800 text-center space-y-1">
                <span className="text-[10px] font-mono text-zinc-400 uppercase tracking-wider block">Taxa de Sucesso</span>
                <div className="text-2xl font-black font-mono text-emerald-400">
                  {multiplaSimulationResult.taxa_sucesso_percentagem}%
                </div>
                <span className="text-[9px] text-zinc-400 block">Probabilidade Real</span>
              </div>

              {/* Odd Justa Matemática */}
              <div className="bg-gradient-to-b from-zinc-900 to-zinc-950 p-4 rounded-2xl border border-zinc-800 text-center space-y-1">
                <span className="text-[10px] font-mono text-zinc-400 uppercase tracking-wider block">Odd Justa</span>
                <div className="text-2xl font-black font-mono text-amber-400">
                  {multiplaSimulationResult.odd_justa_matematica}
                </div>
                <span className="text-[9px] text-zinc-400 block">Matemática Pura</span>
              </div>

              {/* Classificação de Valor */}
              <div className="bg-gradient-to-b from-zinc-900 to-zinc-950 p-4 rounded-2xl border border-zinc-800 text-center space-y-1">
                <span className="text-[10px] font-mono text-zinc-400 uppercase tracking-wider block">Classificação</span>
                <div className={`text-base sm:text-lg font-black font-mono truncate px-1 ${
                  multiplaSimulationResult.classificacao_valor.includes('ALTO')
                    ? 'text-rose-400'
                    : multiplaSimulationResult.classificacao_valor.includes('VALOR')
                    ? 'text-emerald-400'
                    : 'text-amber-400'
                }`}>
                  {multiplaSimulationResult.classificacao_valor}
                </div>
                <span className="text-[9px] text-zinc-400 block">Perfil de Risco</span>
              </div>

              {/* Stake Recomendada */}
              <div className="bg-gradient-to-b from-zinc-900 to-zinc-950 p-4 rounded-2xl border border-zinc-800 text-center space-y-1">
                <span className="text-[10px] font-mono text-zinc-400 uppercase tracking-wider block">Stake Sugerida</span>
                <div className="text-2xl font-black font-mono text-cyan-400">
                  {multiplaSimulationResult.stake_recomendada_unidades} <span className="text-xs text-zinc-400 font-normal">u</span>
                </div>
                <span className="text-[9px] text-zinc-400 block">Critério de Kelly</span>
              </div>
            </div>

            {/* Histórico de Sucessos Conjuntos */}
            <div className="p-4 rounded-2xl bg-black/40 border border-zinc-800 space-y-2">
              <div className="text-xs font-mono font-bold text-zinc-200 flex items-center gap-2">
                <span>📈 Análise de Co-ocorrência & Histórico Real:</span>
              </div>
              <p className="text-xs text-zinc-300 leading-relaxed font-sans">
                {multiplaSimulationResult.sucessos_historicos !== undefined ? (
                  <>
                    Nas rondas analisadas pelo modelo histórico da base de dados, esta combinação de equipas obteve <strong className="text-emerald-400">{multiplaSimulationResult.sucessos_historicos} sucessos simultâneos</strong> em {multiplaSimulationResult.total_jogos_analisados || 'todas as'} jornadas avaliadas.
                  </>
                ) : (
                  <>
                    A simulação computou o histórico ponderado de cada seleção. Com uma taxa de sucesso estimada de <strong className="text-emerald-400">{multiplaSimulationResult.taxa_sucesso_percentagem}%</strong>, a odd justa matemática situa-se em <strong className="text-amber-400">{multiplaSimulationResult.odd_justa_matematica}</strong>.
                  </>
                )}
              </p>
            </div>

            {/* Footer Actions */}
            <div className="pt-3 border-t border-zinc-800 flex items-center justify-between gap-3">
              <button
                type="button"
                onClick={() => setSelectedMultiplaItems([])}
                className="px-4 py-2.5 bg-zinc-900 hover:bg-zinc-800 text-zinc-400 hover:text-zinc-200 text-xs font-mono font-bold rounded-xl transition-all cursor-pointer"
              >
                Limpar Seleções
              </button>
              <button
                type="button"
                onClick={() => setShowMultiplaModal(false)}
                className="px-6 py-2.5 bg-gradient-to-r from-amber-500 to-orange-500 hover:from-amber-400 hover:to-orange-400 text-black text-xs sm:text-sm font-mono font-black uppercase tracking-wider rounded-xl transition-all cursor-pointer shadow-lg active:scale-95"
              >
                Fechar Simulação
              </button>
            </div>
          </div>
        </div>
      )}

      {/* 🔒 POPUP MODAL: LICENÇA COMERCIAL / DOWNLOAD EXCEL / ACESSO API VIP */}
      {showCommercialExportModal && (
        <div 
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/90 backdrop-blur-md transition-all duration-300 animate-fade-in"
          onClick={() => setShowCommercialExportModal(false)}
        >
          <div 
            className="relative max-w-xl w-full bg-[#0e0e13] border border-amber-500/40 rounded-3xl overflow-hidden p-6 sm:p-8 shadow-2xl flex flex-col gap-5 text-left border-glow-amber"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Header */}
            <div className="flex items-start justify-between border-b border-zinc-850 pb-4">
              <div className="space-y-1">
                <span className="text-[10px] font-mono font-bold tracking-widest text-amber-400 uppercase bg-amber-950/60 px-2.5 py-1 rounded-md border border-amber-500/30">
                  💎 Acesso de Dados Protegido • Anti-Scraping
                </span>
                <h3 className="text-xl font-black text-white mt-2 flex items-center gap-2">
                  <span>Exportação em Massa & Feed API</span>
                </h3>
              </div>
              <button
                type="button"
                onClick={() => setShowCommercialExportModal(false)}
                className="text-zinc-400 hover:text-white p-1.5 rounded-xl hover:bg-zinc-800 transition-colors cursor-pointer text-sm"
              >
                ✕
              </button>
            </div>

            {/* Description */}
            <div className="space-y-3.5 text-xs text-zinc-300 leading-relaxed font-light">
              <p>
                Os dados analíticos, métricas quantitativas de probabilidade e tendências, probabilidades e estimativas de cantos/cartões da <strong className="text-white">iRunBets</strong> são ativos de propriedade intelectual protegidos por 4 camadas de segurança.
              </p>
              
              <div className="p-4 rounded-2xl bg-zinc-950 border border-zinc-850 space-y-2.5">
                <div className="text-[11px] font-mono font-bold text-amber-300 uppercase tracking-wide flex items-center gap-2">
                  <span>🛡️ 4 Regras de Proteção Ativas:</span>
                </div>
                <ul className="space-y-1.5 text-[11px] text-zinc-400 font-mono">
                  <li className="flex items-center gap-2">
                    <span className="text-emerald-400">✓</span> <span>Escudo Cloudflare Bot Fight Mode</span>
                  </li>
                  <li className="flex items-center gap-2">
                    <span className="text-emerald-400">✓</span> <span>Renderização Segura Server-Side (SSR Proxy)</span>
                  </li>
                  <li className="flex items-center gap-2">
                    <span className="text-emerald-400">✓</span> <span>Rate Limiting por IP (Anti-Crawlers)</span>
                  </li>
                  <li className="flex items-center gap-2">
                    <span className="text-emerald-400">✓</span> <span>Row Level Security (RLS) no Supabase</span>
                  </li>
                </ul>
              </div>

              <p className="text-zinc-400 text-[11.5px]">
                Para aquisição de ficheiros estruturados em formato <strong className="text-emerald-400">Excel (.xlsx)</strong>, dumps completos ou chave de integração dedicada para a nossa <strong className="text-cyan-400">API B2B</strong>, é necessária subscrição ativa do plano <strong className="text-amber-400">VIP Pro Max</strong> ou contratação de licença comercial.
              </p>
            </div>

            {/* Pricing / Plan highlights */}
            <div className="grid grid-cols-2 gap-3 pt-1">
              <div className="bg-zinc-950/80 p-3.5 rounded-2xl border border-zinc-800 text-center space-y-1">
                <span className="text-[9px] font-mono text-zinc-400 uppercase tracking-wider block">Ficheiro Excel (.xlsx)</span>
                <div className="text-lg font-black text-emerald-400 font-mono">Download VIP</div>
                <span className="text-[9.5px] text-zinc-500 block">Dados completos + Análises</span>
              </div>
              <div className="bg-zinc-950/80 p-3.5 rounded-2xl border border-zinc-800 text-center space-y-1">
                <span className="text-[9px] font-mono text-zinc-400 uppercase tracking-wider block">Feed de API em Tempo Real</span>
                <div className="text-lg font-black text-cyan-400 font-mono">Licença B2B</div>
                <span className="text-[9.5px] text-zinc-500 block">Latência ultra-baixa</span>
              </div>
            </div>

            {/* Actions */}
            <div className="pt-3 border-t border-zinc-850 flex flex-col sm:flex-row items-center justify-end gap-3">
              <button
                type="button"
                onClick={() => setShowCommercialExportModal(false)}
                className="w-full sm:w-auto px-4 py-2.5 bg-zinc-900 hover:bg-zinc-800 text-zinc-300 text-xs font-mono font-bold rounded-xl transition-all cursor-pointer"
              >
                Voltar à Tabela
              </button>
              <a
                href="#clube-vip"
                onClick={(e) => {
                  setShowCommercialExportModal(false);
                }}
                className="w-full sm:w-auto px-5 py-2.5 bg-gradient-to-r from-amber-500 to-yellow-500 hover:from-amber-400 hover:to-yellow-400 text-black text-xs font-mono font-black uppercase tracking-wider rounded-xl transition-all cursor-pointer text-center shadow-lg shadow-amber-500/20"
              >
                Adquirir Acesso VIP / Comercial ➔
              </a>
            </div>
          </div>
        </div>
      )}

      {/* 🏆 MODAL DETALHADO DA EQUIPA / CAMPEONATO COM DADOS COMPLETOS DAS APIS */}
      <TeamDetailsModal
        isOpen={teamModalState.isOpen}
        onClose={() => setTeamModalState({ isOpen: false })}
        teamName={teamModalState.teamName}
        leagueName={teamModalState.leagueName}
        allGames={jogos as any}
      />
    </div>
  );
}
