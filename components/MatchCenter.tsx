import React, { useState, useEffect, useRef, useMemo } from 'react';
import {
  Chart as ChartJS,
  RadialLinearScale,
  PointElement,
  LineElement,
  Filler,
  Tooltip as ChartTooltip,
  Legend as ChartLegend,
  BarElement,
  CategoryScale,
  LinearScale,
  RadarController,
  BarController
} from 'chart.js';
import {
  MatchCenterGame,
  FullTacticalAnalysis,
  fetchJogosDoDiaFromSupabase,
  buildFullTacticalAnalysis,
  getFreeMarketingGameIds,
  toggleFreeMarketingGameId,
  getUserCheckedGameIds,
  toggleUserCheckedGameId
} from '../services/matchCenterService';
import { getCalibratedMatchMetrics, getDailyTop75MatchesForSinalAberto, getTodayDateString } from '../services/supabase';
import { GLOBAL_LEAGUES_TEAMS_MAP } from '../leaguesData';
import { SimultaneousWinsCard } from './SimultaneousWinsCard';
import { TeamSelectionItem } from '../services/simultaneousWinsService';

// Register Chart.js modules
ChartJS.register(
  RadialLinearScale,
  PointElement,
  LineElement,
  Filler,
  ChartTooltip,
  ChartLegend,
  BarElement,
  CategoryScale,
  LinearScale,
  RadarController,
  BarController
);

interface MatchCenterProps {
  onBackToHome?: () => void;
  userSubscriptionStatus?: string;
  isAdmin?: boolean;
  currentUser?: any;
  onSendGamesToBetSlip?: (bets: any[]) => void;
}

export const MatchCenter: React.FC<MatchCenterProps> = ({
  onBackToHome,
  userSubscriptionStatus = 'Gratuito',
  isAdmin = false,
  currentUser = null,
  onSendGamesToBetSlip
}) => {
  // Navigation & View Mode
  const [activeMode, setActiveMode] = useState<'jogos_do_dia' | 'duelo_livre'>('jogos_do_dia');
  const [gameFilterTab, setGameFilterTab] = useState<'todos' | 'live' | 'selecionados' | 'free_marketing'>('todos');
  const [searchQuery, setSearchQuery] = useState('');

  // Data States
  const [gamesList, setGamesList] = useState<MatchCenterGame[]>([]);
  const [loadingGames, setLoadingGames] = useState(true);
  const [selectedGame, setSelectedGame] = useState<MatchCenterGame | null>(null);
  const [analysis, setAnalysis] = useState<FullTacticalAnalysis | null>(null);
  const [loadingAnalysis, setLoadingAnalysis] = useState(false);

  // Marketing & User Selection States
  const [marketingFreeIds, setMarketingFreeIds] = useState<string[]>([]);
  const [userCheckedIds, setUserCheckedIds] = useState<string[]>([]);
  const [adminToast, setAdminToast] = useState<string | null>(null);

  // Simultaneous Wins & Slip Integration States
  const [showSimultaneousModal, setShowSimultaneousModal] = useState<boolean>(false);
  const [teamPicksMap, setTeamPicksMap] = useState<Record<string, 'casa' | 'fora' | 'empate'>>({});

  // Interactive Duel Dropdowns States
  const leaguesAvailable = useMemo(() => Object.keys(GLOBAL_LEAGUES_TEAMS_MAP), []);
  const [selectedLeague, setSelectedLeague] = useState<string>(leaguesAvailable[0] || 'Liga Portugal Betclic');
  const teamsInSelectedLeague = useMemo(() => GLOBAL_LEAGUES_TEAMS_MAP[selectedLeague] || [], [selectedLeague]);
  const [teamHome, setTeamHome] = useState<string>('Benfica');
  const [teamAway, setTeamAway] = useState<string>('FC Porto');

  // Chart Canvas Refs & Analysis Container Ref
  const analysisContainerRef = useRef<HTMLDivElement | null>(null);
  const radarCanvasRef = useRef<HTMLCanvasElement | null>(null);
  const barCanvasRef = useRef<HTMLCanvasElement | null>(null);
  const radarChartInstance = useRef<ChartJS | null>(null);
  const barChartInstance = useRef<ChartJS | null>(null);

  // Check if user has VIP full access
  const isVipUser = useMemo(() => {
    if (isAdmin) return true;
    const email = currentUser?.email?.toLowerCase() || '';
    if (email === 'morgado.aam@gmail.com' || email === '1982veramorgado@gmail.com') return true;
    if (typeof window !== 'undefined') {
      if (localStorage.getItem('irunbets_vip_paid') === 'true') return true;
      const cachedEmail = (localStorage.getItem('irunbets_user_email') || '').toLowerCase();
      if (cachedEmail === 'morgado.aam@gmail.com' || cachedEmail === '1982veramorgado@gmail.com') return true;
    }
    const status = (userSubscriptionStatus || '').toLowerCase();
    return (
      status.includes('pro') ||
      status.includes('vip') ||
      status.includes('mensal') ||
      status.includes('trimestral') ||
      status.includes('anual') ||
      status.includes('founder') ||
      status.includes('fundador') ||
      status.includes('basic') ||
      status.includes('tipster') ||
      status.includes('site')
    );
  }, [isAdmin, currentUser, userSubscriptionStatus]);

  // Initial Load of Games and Storage
  useEffect(() => {
    setMarketingFreeIds(getFreeMarketingGameIds());
    setUserCheckedIds(getUserCheckedGameIds());

    const loadGames = async () => {
      setLoadingGames(true);
      const data = await fetchJogosDoDiaFromSupabase(200);
      const calibratedGames: MatchCenterGame[] = data.map(game => {
        const calibrated = getCalibratedMatchMetrics(game as any);
        return {
          ...game,
          odd_1: game.odd_1 != null ? Number(game.odd_1) : parseFloat(calibrated.odd1),
          odd_x: game.odd_x != null ? Number(game.odd_x) : parseFloat(calibrated.oddX),
          odd_2: game.odd_2 != null ? Number(game.odd_2) : parseFloat(calibrated.odd2),
          // Directly adapted according to SuperIA calibrated Poisson / xG model
          prob_casa: calibrated.probCasa,
          prob_empate: calibrated.probEmpate,
          prob_fora: calibrated.probFora,
          valor_ev: calibrated.evVal,
          confianca_percentagem: calibrated.confianca,
          previsao_resumo: calibrated.seloIa,
          analise_texto: (game.analise_texto && game.analise_texto !== 'Análise detalhada a ser processada pelo algoritmo.') ? game.analise_texto : calibrated.textoAnalise,
          estimativa_cantos: game.estimativa_cantos != null ? game.estimativa_cantos : calibrated.cantosVal,
          estimativa_cartoes: game.estimativa_cartoes != null ? game.estimativa_cartoes : calibrated.cartoesVal,
        };
      });
      setGamesList(calibratedGames);
      setLoadingGames(false);

      // Automated Daily "Sinal Aberto" at 00:00:
      // Guarantee that 3 games with SuperIA probability >= 75% are available in Sinal Aberto without login
      try {
        const top3Daily = getDailyTop75MatchesForSinalAberto(calibratedGames as any);
        if (top3Daily.length > 0) {
          const currentFree = getFreeMarketingGameIds();
          const merged = Array.from(new Set([...currentFree, ...top3Daily]));
          setMarketingFreeIds(merged);
          localStorage.setItem('irunbets_free_marketing_games_v2', JSON.stringify(merged));
        }
      } catch (e) {
        // ignore
      }

      // Default selection (don't scroll on initial mount)
      if (calibratedGames.length > 0) {
        handleSelectGame(calibratedGames[0], false);
      } else {
        // Fallback demo match
        handleRunFreeDuel('Benfica', 'FC Porto', 'Liga Portugal Betclic', false);
      }
    };

    loadGames();

    // Listeners for external storage updates
    const handleMarketingChange = (e: any) => {
      if (e.detail) setMarketingFreeIds(e.detail);
    };
    const handleCheckedChange = (e: any) => {
      if (e.detail) setUserCheckedIds(e.detail);
    };

    window.addEventListener('irunbets_marketing_games_updated', handleMarketingChange);
    window.addEventListener('irunbets_checked_games_updated', handleCheckedChange);

    return () => {
      window.removeEventListener('irunbets_marketing_games_updated', handleMarketingChange);
      window.removeEventListener('irunbets_checked_games_updated', handleCheckedChange);
    };
  }, []);

  // Sync teams when league changes in Duelo Livre
  useEffect(() => {
    if (teamsInSelectedLeague.length >= 2) {
      setTeamHome(teamsInSelectedLeague[0]);
      setTeamAway(teamsInSelectedLeague[1]);
    }
  }, [selectedLeague, teamsInSelectedLeague]);

  // Select a game from the list
  const handleSelectGame = async (game: MatchCenterGame, shouldScroll = true) => {
    setSelectedGame(game);
    setLoadingAnalysis(true);

    if (shouldScroll) {
      setTimeout(() => {
        analysisContainerRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' });
      }, 50);
    }

    try {
      const full = await buildFullTacticalAnalysis(game);
      setAnalysis(full);
      if (shouldScroll) {
        setTimeout(() => {
          analysisContainerRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' });
        }, 120);
      }
    } catch (e) {
      console.warn('Erro ao calcular análise:', e);
    } finally {
      setLoadingAnalysis(false);
    }
  };

  // Run custom duel from dropdowns
  const handleRunFreeDuel = async (home: string, away: string, league: string, shouldScroll = true) => {
    setLoadingAnalysis(true);
    if (shouldScroll) {
      setTimeout(() => {
        analysisContainerRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' });
      }, 50);
    }
    try {
      const full = await buildFullTacticalAnalysis({
        homeTeam: home,
        awayTeam: away,
        league: league
      });
      setSelectedGame(full.game);
      setAnalysis(full);
      if (shouldScroll) {
        setTimeout(() => {
          analysisContainerRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' });
        }, 120);
      }
    } catch (e) {
      console.warn('Erro ao gerar duelo livre:', e);
    } finally {
      setLoadingAnalysis(false);
    }
  };

  // Toggle user favorite / checkmark
  const handleToggleChecked = (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    const next = toggleUserCheckedGameId(id);
    setUserCheckedIds(next);
  };

  // Toggle admin marketing free game
  const handleToggleMarketing = (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    if (!isAdmin && currentUser?.email?.toLowerCase() !== 'morgado.aam@gmail.com') return;

    const res = toggleFreeMarketingGameId(id);
    if (!res.success && res.message) {
      setAdminToast(res.message);
      setTimeout(() => setAdminToast(null), 4000);
      return;
    }
    setMarketingFreeIds(res.list);
    setAdminToast(
      res.list.includes(id)
        ? `Jogo libertado com sucesso para a versão Free! (${res.list.length}/4)`
        : `Jogo removido da versão Free. (${res.list.length}/4)`
    );
    setTimeout(() => setAdminToast(null), 3000);
  };

  // Filtered games list
  const filteredGames = useMemo(() => {
    return gamesList.filter(g => {
      const query = searchQuery.toLowerCase().trim();
      const matchQuery =
        !query ||
        g.clube_casa.toLowerCase().includes(query) ||
        g.clube_fora.toLowerCase().includes(query) ||
        g.liga.toLowerCase().includes(query);

      if (!matchQuery) return false;

      if (gameFilterTab === 'live') {
        return g.isLive || g.estado === 'LIVE';
      }
      if (gameFilterTab === 'selecionados') {
        return userCheckedIds.includes(g.jogo_id);
      }
      if (gameFilterTab === 'free_marketing') {
        return marketingFreeIds.includes(g.jogo_id);
      }
      return true;
    });
  }, [gamesList, searchQuery, gameFilterTab, userCheckedIds, marketingFreeIds]);

  // Separate into Selected / Favorites vs General List (with the user's requested clear divider line!)
  const favoriteGames = useMemo(() => {
    return filteredGames.filter(g => userCheckedIds.includes(g.jogo_id));
  }, [filteredGames, userCheckedIds]);

  const nonFavoriteGames = useMemo(() => {
    return filteredGames.filter(g => !userCheckedIds.includes(g.jogo_id));
  }, [filteredGames, userCheckedIds]);

  // Selected Matches formatted for Simultaneous Wins Analysis & Bet Slip
  const selectedMatches = useMemo(() => {
    return gamesList.filter(g => userCheckedIds.includes(g.jogo_id));
  }, [gamesList, userCheckedIds]);

  const simultaneousSelections: TeamSelectionItem[] = useMemo(() => {
    return selectedMatches.map(g => {
      const defaultPick = Number(g.prob_fora || 0) > Number(g.prob_casa || 0) ? 'fora' : 'casa';
      const userPick = teamPicksMap[g.jogo_id] || defaultPick;
      const isAway = userPick === 'fora';
      const team = isAway ? g.clube_fora : g.clube_casa;
      const opponent = isAway ? g.clube_casa : g.clube_fora;
      const odd = isAway ? (g.odd_2 || 2.10) : (g.odd_1 || 1.70);

      return {
        team,
        opponent,
        league: g.liga || 'Geral',
        matchDate: g.data || 'Hoje',
        odd: typeof odd === 'number' ? odd : parseFloat(String(odd).replace(',', '.')),
        betType: `${team} Vence (${isAway ? '2' : '1'})`,
        isHome: !isAway
      };
    });
  }, [selectedMatches, teamPicksMap]);

  const combinedSelectionsOdd = useMemo(() => {
    if (simultaneousSelections.length === 0) return '1.00';
    const total = simultaneousSelections.reduce((acc, curr) => {
      const oddVal = typeof curr.odd === 'number' ? curr.odd : parseFloat(String(curr.odd)) || 1.5;
      return acc * (oddVal > 1 ? oddVal : 1.5);
    }, 1);
    return total.toFixed(2);
  }, [simultaneousSelections]);

  const handleLaunchSelectedToBetSlip = () => {
    if (selectedMatches.length === 0) return;

    const betsToLaunch = selectedMatches.map(g => {
      const defaultPick = Number(g.prob_fora || 0) > Number(g.prob_casa || 0) ? 'fora' : 'casa';
      const userPick = teamPicksMap[g.jogo_id] || defaultPick;
      const isAway = userPick === 'fora';
      const team = isAway ? g.clube_fora : g.clube_casa;
      const odd = isAway ? (g.odd_2 || 2.10) : (g.odd_1 || 1.70);

      return {
        homeTeam: g.clube_casa,
        awayTeam: g.clube_fora,
        betType: `${team} Vence (${isAway ? '2' : '1'})`,
        league: g.liga,
        odd: typeof odd === 'number' ? odd.toFixed(2) : String(odd),
        observations: `SuperIA (${g.data} ${g.hora}) • Seleção Tática`,
        resultStatus: 'pending' as const,
        sport: 'Futebol',
        matchDate: g.data
      };
    });

    if (onSendGamesToBetSlip) {
      onSendGamesToBetSlip(betsToLaunch);
    } else {
      alert(`${betsToLaunch.length} equipas enviadas para o Boletim!`);
    }
  };

  // Check if a specific game is accessible to current user (Sinal Aberto / VIP / Free)
  const isGameUnlocked = (gameId: string) => {
    if (isVipUser) return true;
    if (marketingFreeIds.includes(gameId)) return true;
    try {
      const globalUnlocked = JSON.parse(localStorage.getItem('irunbets_unlocked_predictions') || '[]');
      if (Array.isArray(globalUnlocked) && globalUnlocked.includes(gameId)) return true;
    } catch (e) {
      // ignore
    }
    // If no marketing games have been set yet, unlock first 3 by default for marketing preview
    const firstThreeIds = gamesList.slice(0, 3).map(g => g.jogo_id);
    return firstThreeIds.includes(gameId);
  };

  // RENDER RADAR CHART (Chart.js)
  useEffect(() => {
    if (!analysis || !radarCanvasRef.current) return;

    if (radarChartInstance.current) {
      radarChartInstance.current.destroy();
      radarChartInstance.current = null;
    }

    const ctx = radarCanvasRef.current.getContext('2d');
    if (!ctx) return;

    const labels = ['Guarda-Redes (GR)', 'Setor Defensivo', 'Meio-Campo', 'Poder de Ataque'];
    const rx = analysis.raioX;

    radarChartInstance.current = new ChartJS(ctx, {
      type: 'radar',
      data: {
        labels: labels,
        datasets: [
          {
            label: rx.equipa_casa,
            data: [
              rx.rating_gr_casa || 7.2,
              rx.rating_defesa_casa || 7.5,
              rx.rating_meios_casa || 7.8,
              rx.rating_ataque_casa || 8.0
            ],
            backgroundColor: 'rgba(0, 230, 118, 0.22)', // Neon Green
            borderColor: '#00E676',
            borderWidth: 2.5,
            pointBackgroundColor: '#00E676',
            pointBorderColor: '#0b0e14',
            pointHoverBackgroundColor: '#FFFFFF',
            pointHoverBorderColor: '#00E676',
            pointRadius: 4.5,
            pointHoverRadius: 6
          },
          {
            label: rx.equipa_fora,
            data: [
              rx.rating_gr_fora || 7.0,
              rx.rating_defesa_fora || 7.1,
              rx.rating_meios_fora || 7.4,
              rx.rating_ataque_fora || 7.6
            ],
            backgroundColor: 'rgba(124, 77, 255, 0.22)', // Neon Purple
            borderColor: '#7C4DFF',
            borderWidth: 2.5,
            pointBackgroundColor: '#7C4DFF',
            pointBorderColor: '#0b0e14',
            pointHoverBackgroundColor: '#FFFFFF',
            pointHoverBorderColor: '#7C4DFF',
            pointRadius: 4.5,
            pointHoverRadius: 6
          }
        ]
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        scales: {
          r: {
            angleLines: {
              color: 'rgba(255, 255, 255, 0.08)'
            },
            grid: {
              color: 'rgba(255, 255, 255, 0.08)'
            },
            pointLabels: {
              color: '#94A3B8',
              font: {
                size: 11,
                weight: 'bold',
                family: 'monospace'
              }
            },
            ticks: {
              color: '#64748B',
              backdropColor: 'transparent',
              stepSize: 2,
              font: { size: 9 }
            },
            min: 4,
            max: 10
          }
        },
        plugins: {
          legend: {
            display: true,
            position: 'top',
            labels: {
              color: '#FFFFFF',
              font: { weight: 'bold', size: 12 },
              usePointStyle: true,
              pointStyle: 'circle',
              padding: 18
            }
          },
          tooltip: {
            backgroundColor: '#151a23',
            titleColor: '#00E676',
            bodyColor: '#FFFFFF',
            borderColor: '#7C4DFF',
            borderWidth: 1,
            padding: 10,
            displayColors: true
          }
        }
      }
    });

    return () => {
      if (radarChartInstance.current) {
        radarChartInstance.current.destroy();
        radarChartInstance.current = null;
      }
    };
  }, [analysis]);

  // RENDER BAR CHART: CANTOS & DISCIPLINA (Chart.js)
  useEffect(() => {
    if (!analysis || !barCanvasRef.current) return;

    if (barChartInstance.current) {
      barChartInstance.current.destroy();
      barChartInstance.current = null;
    }

    const ctx = barCanvasRef.current.getContext('2d');
    if (!ctx) return;

    const home = analysis.game.clube_casa;
    const away = analysis.game.clube_fora;
    const corners = analysis.cornersProjection;
    const cards = analysis.cardsProjection;

    barChartInstance.current = new ChartJS(ctx, {
      type: 'bar',
      data: {
        labels: ['Cantos Médios Proj.', 'Cartões Amarelos Proj.'],
        datasets: [
          {
            label: `${home} (Casa)`,
            data: [corners.homeCorners, cards.homeYellows],
            backgroundColor: '#00E676', // Neon Green
            borderRadius: 6,
            borderSkipped: false
          },
          {
            label: `${away} (Fora)`,
            data: [corners.awayCorners, cards.awayYellows],
            backgroundColor: '#7C4DFF', // Neon Purple
            borderRadius: 6,
            borderSkipped: false
          }
        ]
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        scales: {
          x: {
            grid: { display: false },
            ticks: {
              color: '#94A3B8',
              font: { weight: 'bold', size: 11 }
            }
          },
          y: {
            grid: { color: 'rgba(255, 255, 255, 0.06)' },
            ticks: {
              color: '#64748B',
              stepSize: 2,
              font: { size: 10 }
            },
            beginAtZero: true
          }
        },
        plugins: {
          legend: {
            display: true,
            position: 'top',
            labels: {
              color: '#FFFFFF',
              font: { weight: 'bold', size: 11 },
              usePointStyle: true,
              pointStyle: 'rectRounded',
              padding: 14
            }
          },
          tooltip: {
            backgroundColor: '#151a23',
            titleColor: '#FFD700',
            bodyColor: '#FFFFFF',
            borderColor: '#00E676',
            borderWidth: 1,
            padding: 10
          }
        }
      }
    });

    return () => {
      if (barChartInstance.current) {
        barChartInstance.current.destroy();
        barChartInstance.current = null;
      }
    };
  }, [analysis]);

  return (
    <div className="min-h-screen bg-[#0b0e14] text-zinc-100 pb-28 selection:bg-[#00E676]/30 font-sans">
      {/* ELITE GLOW AMBIENT BACKGROUND */}
      <div className="fixed top-0 right-0 w-[550px] h-[550px] bg-[#00E676]/5 rounded-full blur-[160px] pointer-events-none"></div>
      <div className="fixed bottom-0 left-0 w-[600px] h-[600px] bg-[#7C4DFF]/5 rounded-full blur-[170px] pointer-events-none"></div>

      {/* TOP HEADER / SUPERIA BRANDING */}
      <div className="border-b border-zinc-850/80 bg-[#151a23]/80 backdrop-blur-md sticky top-0 z-30 px-4 sm:px-6 py-3.5 shadow-xl">
        <div className="max-w-7xl mx-auto flex flex-col sm:flex-row items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            {onBackToHome && (
              <button
                type="button"
                onClick={onBackToHome}
                className="px-3 py-1.5 rounded-xl bg-zinc-900 border border-zinc-800 hover:border-zinc-700 text-xs text-zinc-400 hover:text-white transition-all cursor-pointer flex items-center gap-1.5"
              >
                <span>←</span>
                <span>Voltar</span>
              </button>
            )}

            <div className="flex items-center gap-2.5">
              <div className="w-10 h-10 rounded-2xl bg-gradient-to-br from-[#00E676]/20 to-[#7C4DFF]/30 border border-[#00E676]/40 flex items-center justify-center text-lg shadow-[0_0_15px_rgba(0,230,118,0.25)] animate-pulse">
                ⚡
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <h1 className="text-lg sm:text-xl font-black uppercase tracking-tight text-white flex items-center gap-2">
                    <span>Match Center</span>
                    <span className="px-2 py-0.5 rounded-full bg-[#00E676] text-black text-[10px] font-extrabold tracking-widest uppercase shadow-[0_0_12px_rgba(0,230,118,0.4)]">
                      SuperIA
                    </span>
                  </h1>
                  <span className="hidden md:inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-[#7C4DFF]/15 border border-[#7C4DFF]/30 text-[#A78BFA] text-[10px] font-mono font-bold uppercase">
                    v4.2 Tactical Engine
                  </span>
                </div>
                <p className="text-[11px] text-zinc-400 font-light">
                  Raio-X Tático Completo, Análise de Treinadores e Cockpit Preditivo Poisson
                </p>
              </div>
            </div>
          </div>

          {/* RIGHT CONTROLS & MODE TOGGLE */}
          <div className="flex items-center gap-3 w-full sm:w-auto justify-between sm:justify-end">
            <div className="flex bg-[#0b0e14] p-1 rounded-xl border border-zinc-800">
              <button
                type="button"
                onClick={() => setActiveMode('jogos_do_dia')}
                className={`px-3.5 py-1.5 rounded-lg text-xs font-bold uppercase tracking-wider transition-all cursor-pointer ${
                  activeMode === 'jogos_do_dia'
                    ? 'bg-gradient-to-r from-[#00E676] to-emerald-400 text-black shadow-md'
                    : 'text-zinc-400 hover:text-white'
                }`}
              >
                📅 Jogos do Dia
              </button>
              <button
                type="button"
                onClick={() => setActiveMode('duelo_livre')}
                className={`px-3.5 py-1.5 rounded-lg text-xs font-bold uppercase tracking-wider transition-all cursor-pointer ${
                  activeMode === 'duelo_livre'
                    ? 'bg-gradient-to-r from-[#7C4DFF] to-purple-500 text-white shadow-md'
                    : 'text-zinc-400 hover:text-white'
                }`}
              >
                ⚔️ Duelo Livre
              </button>
            </div>

            {/* Admin Marketing Counter Badge */}
            {(isAdmin || currentUser?.email === 'morgado.aam@gmail.com') && (
              <div className="hidden lg:flex items-center gap-2 px-3 py-1 rounded-xl bg-amber-500/10 border border-amber-500/30 text-amber-400 text-[11px] font-mono font-bold">
                <span>⭐ Free Marketing:</span>
                <span className="px-1.5 py-0.2 rounded bg-amber-500/20 text-white">
                  {marketingFreeIds.length}/4
                </span>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* TOAST ALERTS */}
      {adminToast && (
        <div className="fixed bottom-6 right-6 z-50 bg-[#151a23] border border-[#00E676]/60 p-4 rounded-2xl shadow-2xl flex items-center gap-3 animate-fade-in text-xs text-white max-w-md">
          <span className="text-xl">⚡</span>
          <div>
            <p className="font-bold text-[#00E676]">Aviso de Gestão SuperIA</p>
            <p className="text-zinc-300 text-[11px]">{adminToast}</p>
          </div>
        </div>
      )}

      {/* MAIN CONTAINER */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 pt-6 space-y-6">

        {/* ========================================================================= */}
        {/* MODE 1: JOGOS DO DIA (Com divisor estrito entre Favoritos e Todos)       */}
        {/* ========================================================================= */}
        {activeMode === 'jogos_do_dia' && (
          <div className="bg-[#151a23] border border-zinc-800/80 rounded-2xl p-4 sm:p-5 shadow-2xl space-y-4">
            
            {/* SEARCH & FILTER BAR */}
            <div className="flex flex-col md:flex-row items-center justify-between gap-3">
              {/* Filter Tabs */}
              <div className="flex flex-wrap items-center gap-2 w-full md:w-auto">
                <button
                  type="button"
                  onClick={() => setGameFilterTab('todos')}
                  className={`px-3 py-1.5 rounded-xl text-xs font-bold uppercase transition-all cursor-pointer ${
                    gameFilterTab === 'todos'
                      ? 'bg-zinc-800 text-white border border-zinc-700'
                      : 'bg-zinc-900/60 text-zinc-400 hover:text-white border border-transparent'
                  }`}
                >
                  Todos ({gamesList.length})
                </button>

                <button
                  type="button"
                  onClick={() => setGameFilterTab('live')}
                  className={`px-3 py-1.5 rounded-xl text-xs font-bold uppercase transition-all cursor-pointer flex items-center gap-1.5 ${
                    gameFilterTab === 'live'
                      ? 'bg-rose-500/20 text-rose-400 border border-rose-500/40'
                      : 'bg-zinc-900/60 text-zinc-400 hover:text-white border border-transparent'
                  }`}
                >
                  <span className="w-2 h-2 rounded-full bg-rose-500 animate-ping"></span>
                  <span>Ao Vivo</span>
                </button>

                <button
                  type="button"
                  onClick={() => setGameFilterTab('selecionados')}
                  className={`px-3 py-1.5 rounded-xl text-xs font-bold uppercase transition-all cursor-pointer flex items-center gap-1.5 ${
                    gameFilterTab === 'selecionados'
                      ? 'bg-[#00E676]/20 text-[#00E676] border border-[#00E676]/40'
                      : 'bg-zinc-900/60 text-zinc-400 hover:text-white border border-transparent'
                  }`}
                >
                  <span>⭐ Meus Selecionados</span>
                  <span className="px-1.5 py-0.2 rounded bg-zinc-800 text-[10px] text-white">
                    {userCheckedIds.length}
                  </span>
                </button>

                <button
                  type="button"
                  onClick={() => setGameFilterTab('free_marketing')}
                  className={`px-3 py-1.5 rounded-xl text-xs font-bold uppercase transition-all cursor-pointer flex items-center gap-1.5 ${
                    gameFilterTab === 'free_marketing'
                      ? 'bg-amber-500/20 text-amber-400 border border-amber-500/40'
                      : 'bg-zinc-900/60 text-zinc-400 hover:text-white border border-transparent'
                  }`}
                >
                  <span>⚡ Jogos Free (Marketing)</span>
                  <span className="px-1.5 py-0.2 rounded bg-zinc-800 text-[10px] text-white">
                    {marketingFreeIds.length}
                  </span>
                </button>
              </div>

              {/* Search Box */}
              <div className="w-full md:w-72 relative">
                <input
                  type="text"
                  value={searchQuery}
                  onChange={e => setSearchQuery(e.target.value)}
                  placeholder="Pesquisar equipa ou liga..."
                  className="w-full bg-[#0b0e14] border border-zinc-800 rounded-xl px-3.5 py-2 text-xs text-white placeholder:text-zinc-600 focus:outline-none focus:border-[#00E676] transition-colors"
                />
                {searchQuery && (
                  <button
                    onClick={() => setSearchQuery('')}
                    className="absolute right-3 top-2.5 text-zinc-500 hover:text-white text-xs cursor-pointer"
                  >
                    ✕
                  </button>
                )}
              </div>
            </div>

            {/* MARKETING FREE BANNER FOR VISITORS */}
            {!isVipUser && (
              <div className="p-3 bg-amber-500/10 border border-amber-500/30 rounded-xl flex items-center justify-between text-xs text-amber-300">
                <div className="flex items-center gap-2">
                  <span className="text-lg">📢</span>
                  <span>
                    <strong>Modo Marketing Ativo:</strong> Disponibilizamos gratuitamente a análise tática completa de até <strong>4 jogos selecionados</strong> pelo Administrador.
                  </span>
                </div>
                <button
                  onClick={() => {
                    window.location.hash = '#clube-vip';
                  }}
                  className="px-3 py-1 bg-gradient-to-r from-amber-500 to-orange-500 text-black font-extrabold text-[11px] rounded-lg uppercase tracking-wider cursor-pointer hover:opacity-90 transition-opacity"
                >
                  Desbloquear Todos VIP
                </button>
              </div>
            )}

            {/* GAMES LIST SECTION */}
            {loadingGames ? (
              <div className="py-12 text-center text-zinc-500 space-y-2">
                <div className="w-8 h-8 rounded-full border-2 border-[#00E676] border-t-transparent animate-spin mx-auto"></div>
                <p className="text-xs font-mono">A carregar jogos do Supabase...</p>
              </div>
            ) : filteredGames.length === 0 ? (
              <div className="py-10 text-center text-zinc-500 text-xs">
                Nenhum jogo encontrado com os filtros selecionados.
              </div>
            ) : (
              <div className="space-y-4">
                {/* SECTION 1: MEUS JOGOS SELECIONADOS / FAVORITOS (se existirem) */}
                {favoriteGames.length > 0 && (
                  <div className="space-y-3 bg-[#0d131a] border border-[#00E676]/30 p-4 rounded-3xl">
                    <div className="flex flex-wrap items-center justify-between gap-3 border-b border-zinc-850 pb-3">
                      <div className="flex items-center gap-2">
                        <span className="text-base">⚡</span>
                        <div>
                          <h3 className="text-xs sm:text-sm font-black uppercase tracking-wider text-[#00E676] font-mono flex items-center gap-2">
                            <span>Painel SuperIA • Múltiplas e Vitórias em Simultâneo</span>
                            <span className="px-2 py-0.2 rounded-full bg-[#00E676]/20 text-[#00E676] text-[10px]">
                              {favoriteGames.length} Seleções
                            </span>
                          </h3>
                          <p className="text-[11px] text-zinc-400 font-mono">
                            {favoriteGames.length >= 4
                              ? `Odd Combinada: @${combinedSelectionsOdd} • Pronto para análise quantitativa de vitórias em simultâneo (4 a 13 equipas)`
                              : `Odd Combinada: @${combinedSelectionsOdd} • Selecione 4 a 13 equipas para a análise completa de co-ocorrência histórica`}
                          </p>
                        </div>
                      </div>

                      <div className="flex items-center gap-2">
                        <button
                          type="button"
                          onClick={() => setShowSimultaneousModal(true)}
                          className="px-3.5 py-1.5 rounded-xl bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-500 hover:to-indigo-500 text-white font-bold text-xs font-mono uppercase tracking-wider transition-all shadow-md active:scale-95 cursor-pointer flex items-center gap-1.5"
                        >
                          <span>📊 Raio-X Vitórias em Simultâneo</span>
                        </button>

                        <button
                          type="button"
                          onClick={handleLaunchSelectedToBetSlip}
                          className="px-3.5 py-1.5 rounded-xl bg-[#00E676] hover:bg-[#00c853] text-black font-black text-xs font-mono uppercase tracking-wider transition-all shadow-md active:scale-95 cursor-pointer flex items-center gap-1.5"
                        >
                          <span>🚀 Lançar para o Boletim</span>
                        </button>
                      </div>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
                      {favoriteGames.map(game => renderGameCard(game))}
                    </div>

                    {/* CLEAR DIVIDER LINE REQUESTED BY USER */}
                    <div className="relative py-4 select-none">
                      <div className="absolute inset-0 flex items-center">
                        <div className="w-full border-t-2 border-dashed border-[#00E676]/30"></div>
                      </div>
                      <div className="relative flex justify-center text-xs uppercase">
                        <span className="bg-[#151a23] px-4 text-[#00E676] font-extrabold tracking-widest font-mono text-[10px] flex items-center gap-2">
                          <span>✦ RESTANTES JOGOS DISPONÍVEIS ✦</span>
                        </span>
                      </div>
                    </div>
                  </div>
                )}

                {/* SECTION 2: TODOS OS JOGOS DISPONÍVEIS */}
                <div className="space-y-2.5">
                  {favoriteGames.length > 0 && (
                    <div className="flex items-center gap-2 px-1">
                      <span className="text-sm">📋</span>
                      <h3 className="text-xs font-black uppercase tracking-wider text-zinc-400 font-mono">
                        Lista Geral ({nonFavoriteGames.length})
                      </h3>
                    </div>
                  )}

                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3 max-h-[380px] overflow-y-auto pr-1">
                    {nonFavoriteGames.map(game => renderGameCard(game))}
                  </div>
                </div>
              </div>
            )}
          </div>
        )}

        {/* ========================================================================= */}
        {/* MODE 2: DUELO LIVRE (Dropdown Campeonato -> Equipa A vs Equipa B)         */}
        {/* ========================================================================= */}
        {activeMode === 'duelo_livre' && (
          <div className="bg-[#151a23] border border-zinc-800/80 rounded-2xl p-5 sm:p-6 shadow-2xl space-y-5">
            <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-2 border-b border-zinc-800 pb-3">
              <div>
                <h2 className="text-base font-black uppercase tracking-tight text-white flex items-center gap-2">
                  <span>Simulador de Duelo Interativo</span>
                  <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-[#7C4DFF]/20 text-[#A78BFA] border border-[#7C4DFF]/30">
                    Qualquer Confronto do Globo
                  </span>
                </h2>
                <p className="text-xs text-zinc-400 font-light">
                  Selecione primeiro o campeonato e depois as duas equipas para gerar o Raio-X instantâneo.
                </p>
              </div>

              <div className="text-xs text-zinc-500 font-mono">
                {teamsInSelectedLeague.length} Equipas na Liga
              </div>
            </div>

            {/* THREE DROPDOWNS: CAMPEONATO -> EQUIPA A -> EQUIPA B */}
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4 items-end">
              {/* Dropdown 1: Campeonato */}
              <div className="space-y-1.5">
                <label className="text-[11px] font-bold text-zinc-400 uppercase tracking-wider block font-mono">
                  1. Escolher Campeonato:
                </label>
                <select
                  value={selectedLeague}
                  onChange={e => setSelectedLeague(e.target.value)}
                  className="w-full bg-[#0b0e14] border border-zinc-800 rounded-xl px-3 py-2.5 text-xs text-white font-medium focus:outline-none focus:border-[#7C4DFF] transition-colors cursor-pointer"
                >
                  {leaguesAvailable.map(l => (
                    <option key={l} value={l}>
                      {l}
                    </option>
                  ))}
                </select>
              </div>

              {/* Dropdown 2: Equipa Casa (Equipa A) */}
              <div className="space-y-1.5">
                <label className="text-[11px] font-bold text-[#00E676] uppercase tracking-wider block font-mono">
                  2. Equipa A (Casa):
                </label>
                <select
                  value={teamHome}
                  onChange={e => setTeamHome(e.target.value)}
                  className="w-full bg-[#0b0e14] border border-[#00E676]/40 rounded-xl px-3 py-2.5 text-xs text-white font-bold focus:outline-none focus:border-[#00E676] transition-colors cursor-pointer"
                >
                  {teamsInSelectedLeague.map(t => (
                    <option key={`home-${t}`} value={t}>
                      {t}
                    </option>
                  ))}
                </select>
              </div>

              {/* Dropdown 3: Equipa Fora (Equipa B) */}
              <div className="space-y-1.5">
                <label className="text-[11px] font-bold text-[#7C4DFF] uppercase tracking-wider block font-mono">
                  3. Equipa B (Fora):
                </label>
                <select
                  value={teamAway}
                  onChange={e => setTeamAway(e.target.value)}
                  className="w-full bg-[#0b0e14] border border-[#7C4DFF]/40 rounded-xl px-3 py-2.5 text-xs text-white font-bold focus:outline-none focus:border-[#7C4DFF] transition-colors cursor-pointer"
                >
                  {teamsInSelectedLeague
                    .filter(t => t !== teamHome)
                    .map(t => (
                      <option key={`away-${t}`} value={t}>
                        {t}
                      </option>
                    ))}
                </select>
              </div>

              {/* Action Buttons: Swap + Trigger Analysis */}
              <div className="flex gap-2">
                <button
                  type="button"
                  title="Inverter Mandos de Campo"
                  onClick={() => {
                    const temp = teamHome;
                    setTeamHome(teamAway);
                    setTeamAway(temp);
                  }}
                  className="px-3 py-2.5 bg-zinc-900 hover:bg-zinc-800 border border-zinc-800 text-zinc-300 hover:text-white rounded-xl text-xs font-bold transition-all cursor-pointer"
                >
                  ⇄
                </button>

                <button
                  type="button"
                  onClick={() => handleRunFreeDuel(teamHome, teamAway, selectedLeague)}
                  className="flex-1 py-2.5 bg-gradient-to-r from-[#00E676] to-[#7C4DFF] hover:opacity-95 text-black font-black text-xs uppercase tracking-wider rounded-xl shadow-lg transition-all cursor-pointer flex items-center justify-center gap-1.5"
                >
                  <span>⚡ Analisar Raio-X</span>
                </button>
              </div>
            </div>
          </div>
        )}

        {/* ========================================================================= */}
        {/* THE 6 BLOCKS OF TACTICAL ANALYSIS (Dark Mode de Elite)                   */}
        {/* ========================================================================= */}
        <div ref={analysisContainerRef} id="superia-analysis-section" className="scroll-mt-24 space-y-6">
          {/* Active Selected Game Status Banner */}
          {selectedGame && (
            <div className="p-4 bg-gradient-to-r from-[#00E676]/15 via-zinc-900 to-[#7C4DFF]/15 border border-[#00E676]/40 rounded-2xl flex flex-col sm:flex-row items-center justify-between gap-3 shadow-xl">
              <div className="flex items-center gap-3">
                <span className="w-3 h-3 rounded-full bg-[#00E676] animate-ping shrink-0"></span>
                <div>
                  <p className="text-[10px] font-mono uppercase tracking-wider text-[#00E676] font-bold">
                    Raio-X Tático Ativo
                  </p>
                  <h3 className="text-sm sm:text-base font-black text-white uppercase tracking-tight">
                    {selectedGame.clube_casa} <span className="text-zinc-500 font-light">vs</span> {selectedGame.clube_fora}
                    <span className="text-xs text-zinc-400 font-normal font-mono ml-2">({selectedGame.liga})</span>
                  </h3>
                </div>
              </div>

              <div className="flex items-center gap-2 w-full sm:w-auto">
                <button
                  type="button"
                  onClick={() => {
                    analysisContainerRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' });
                  }}
                  className="w-full sm:w-auto px-4 py-2 rounded-xl bg-[#00E676] hover:bg-[#00c864] text-black font-black text-xs uppercase tracking-wider shadow-lg hover:shadow-[0_0_20px_rgba(0,230,118,0.4)] transition-all flex items-center justify-center gap-1.5 cursor-pointer shrink-0"
                >
                  <span>Ver Análise Abaixo ↓</span>
                </button>
              </div>
            </div>
          )}

          {loadingAnalysis ? (
            <div className="py-20 text-center bg-[#151a23] border border-zinc-800 rounded-3xl p-8 space-y-4 shadow-2xl">
              <div className="w-12 h-12 rounded-full border-4 border-[#00E676] border-t-transparent animate-spin mx-auto"></div>
              <p className="text-sm font-bold uppercase tracking-wider text-white">
                A Processar Raio-X Tático e Métricas Poisson...
              </p>
              <p className="text-xs text-zinc-400 font-mono">
                Cruzamento de dados Supabase + Modelagem Estatística iRunBets
              </p>
            </div>
          ) : !analysis ? (
            <div className="p-8 text-center text-zinc-500 bg-[#151a23] rounded-2xl border border-zinc-800">
              Selecione um jogo da lista acima para ver o Raio-X completo.
            </div>
          ) : (
          <div className="space-y-6 animate-fade-in">
            {/* ------------------------------------------------------------- */}
            {/* BLOCO 1: CABEÇALHO DO DUELO & CONDIÇÕES DE JOGO              */}
            {/* ------------------------------------------------------------- */}
            <div className="bg-[#151a23] border border-zinc-800/90 rounded-2xl p-5 sm:p-6 shadow-2xl relative overflow-hidden">
              <div className="absolute top-0 right-0 w-80 h-80 bg-gradient-to-bl from-[#00E676]/10 to-transparent pointer-events-none rounded-full blur-2xl"></div>

              {/* Match League & Time Badge */}
              <div className="flex flex-wrap items-center justify-between gap-2 border-b border-zinc-800/80 pb-3 mb-4">
                <div className="flex items-center gap-2">
                  <span className="px-2.5 py-1 rounded-md bg-[#7C4DFF]/15 border border-[#7C4DFF]/30 text-[#A78BFA] text-[11px] font-bold font-mono uppercase">
                    🏆 {analysis.game.liga}
                  </span>
                  <span className="text-xs text-zinc-400 font-mono">
                    📅 {analysis.game.data} • {analysis.game.hora}
                  </span>
                </div>

                {analysis.game.isLive && (
                  <div className="flex items-center gap-1.5 px-3 py-1 rounded-full bg-rose-500/20 border border-rose-500/40 text-rose-400 text-xs font-black uppercase tracking-wider">
                    <span className="w-2 h-2 rounded-full bg-rose-500 animate-ping"></span>
                    <span>EM DIRETO: {analysis.game.liveScore} ({analysis.game.liveMinute})</span>
                  </div>
                )}
              </div>

              {/* Teams Display Header */}
              <div className="grid grid-cols-1 md:grid-cols-3 items-center gap-4 py-2">
                {/* Home Team */}
                <div className="text-center md:text-left space-y-1">
                  <div className="flex items-center justify-center md:justify-start gap-2">
                    <span className="w-3 h-3 rounded-full bg-[#00E676]"></span>
                    <span className="text-[11px] font-mono text-[#00E676] uppercase font-bold">
                      Equipa Mandante (Casa)
                    </span>
                  </div>
                  <h2 className="text-2xl sm:text-3xl font-black text-white uppercase tracking-tight">
                    {analysis.game.clube_casa}
                  </h2>
                  <p className="text-xs text-zinc-400 font-mono">
                    Rating Geral: <strong className="text-[#00E676]">{analysis.raioX.rating_ataque_casa}</strong> | Formação: {analysis.coachHome.preferredFormation}
                  </p>
                </div>

                {/* VS Center Badge */}
                <div className="text-center space-y-2">
                  <span className="inline-block px-4 py-1.5 rounded-full bg-zinc-900 border border-zinc-750 text-xs font-mono font-black text-zinc-300 tracking-widest">
                    VS
                  </span>
                  <p className="text-[11px] text-[#FFD700] font-mono font-bold">
                    Odd Justa Poisson: {analysis.game.odd_1?.toFixed(2)} • {analysis.game.odd_x?.toFixed(2)} • {analysis.game.odd_2?.toFixed(2)}
                  </p>
                </div>

                {/* Away Team */}
                <div className="text-center md:text-right space-y-1">
                  <div className="flex items-center justify-center md:justify-end gap-2">
                    <span className="text-[11px] font-mono text-[#7C4DFF] uppercase font-bold">
                      Equipa Visitante (Fora)
                    </span>
                    <span className="w-3 h-3 rounded-full bg-[#7C4DFF]"></span>
                  </div>
                  <h2 className="text-2xl sm:text-3xl font-black text-white uppercase tracking-tight">
                    {analysis.game.clube_fora}
                  </h2>
                  <p className="text-xs text-zinc-400 font-mono">
                    Rating Geral: <strong className="text-[#7C4DFF]">{analysis.raioX.rating_ataque_fora}</strong> | Formação: {analysis.coachAway.preferredFormation}
                  </p>
                </div>
              </div>

              {/* Stadium & Environmental Conditions */}
              <div className="mt-5 pt-4 border-t border-zinc-800/80 grid grid-cols-2 sm:grid-cols-4 gap-3 text-xs">
                <div className="p-3 bg-[#0b0e14] rounded-xl border border-zinc-850 space-y-0.5">
                  <span className="text-zinc-500 text-[10px] font-mono uppercase block">🏟️ Estádio</span>
                  <p className="font-bold text-white truncate">{analysis.stadium.name}</p>
                  <p className="text-[10px] text-zinc-400">{analysis.stadium.city}</p>
                </div>

                <div className="p-3 bg-[#0b0e14] rounded-xl border border-zinc-850 space-y-0.5">
                  <span className="text-zinc-500 text-[10px] font-mono uppercase block">📐 Dimensões & Relva</span>
                  <p className="font-bold text-white">{analysis.stadium.dimensions}</p>
                  <p className="text-[10px] text-[#00E676]">{analysis.stadium.pitchType} ({analysis.stadium.grassQuality}/5 ★)</p>
                </div>

                <div className="p-3 bg-[#0b0e14] rounded-xl border border-zinc-850 space-y-0.5">
                  <span className="text-zinc-500 text-[10px] font-mono uppercase block">🌤️ Temperatura & Clima</span>
                  <p className="font-bold text-white flex items-center gap-1">
                    <span>{analysis.stadium.weatherIcon}</span>
                    <span>{analysis.stadium.temperature}</span>
                  </p>
                  <p className="text-[10px] text-zinc-400 truncate">{analysis.stadium.weatherDesc}</p>
                </div>

                <div className="p-3 bg-[#0b0e14] rounded-xl border border-zinc-850 space-y-0.5">
                  <span className="text-zinc-500 text-[10px] font-mono uppercase block">💨 Vento & Humidade</span>
                  <p className="font-bold text-white">{analysis.stadium.windSpeed}</p>
                  <p className="text-[10px] text-zinc-400">Humidade: {analysis.stadium.humidity}</p>
                </div>
              </div>
            </div>

            {/* ------------------------------------------------------------- */}
            {/* NOVO: PIPELINE OFICIAL FLUXO DO AI_ENGINE.PY (5 MÓDULOS)      */}
            {/* ------------------------------------------------------------- */}
            {analysis.engineModules && (
              <div className="bg-[#151a23] border border-cyan-500/30 rounded-2xl p-5 sm:p-6 shadow-2xl space-y-4 relative overflow-hidden">
                <div className="absolute top-0 right-0 w-80 h-80 bg-cyan-500/5 rounded-full blur-3xl pointer-events-none"></div>

                {/* HEADER DO PIPELINE */}
                <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 border-b border-zinc-800 pb-3">
                  <div className="space-y-0.5">
                    <div className="flex items-center gap-2">
                      <span className="text-xl">⚡</span>
                      <h3 className="text-sm sm:text-base font-black uppercase tracking-tight text-white flex items-center gap-2">
                        <span>Elevados Padrões de Probabilidade & Tendências</span>
                        <span className="px-2 py-0.5 rounded-full bg-cyan-500/10 text-cyan-400 border border-cyan-500/30 text-[10px] font-mono font-bold">
                          5 Módulos Operacionais
                        </span>
                      </h3>
                    </div>
                    <p className="text-xs text-zinc-400">
                      Pipeline integrado: calibração de elevados padrões de probabilidade, tendências históricas, contexto climatérico e rendimento físico.
                    </p>
                  </div>

                  <div className="flex items-center gap-2">
                    <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-emerald-500/10 border border-emerald-500/30 text-emerald-400 text-xs font-mono font-bold">
                      <span className="h-1.5 w-1.5 rounded-full bg-emerald-400 animate-pulse"></span>
                      CALIBRAÇÃO ATIVA
                    </span>
                  </div>
                </div>

                {/* GRID DOS 5 MÓDULOS */}
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3.5">
                  {/* MÓDULO 1: POISSON */}
                  <div className="p-4 rounded-xl bg-[#0b0e14] border border-zinc-800 space-y-2.5 relative">
                    <div className="flex items-center justify-between">
                      <span className="text-sm sm:text-base font-black uppercase tracking-wider text-emerald-400 flex items-center gap-1.5">
                        <span>📊</span> Módulo 1: Poisson & xG
                      </span>
                      <span className="text-xs font-mono font-bold px-2.5 py-0.5 rounded bg-emerald-500/10 text-emerald-300 border border-emerald-500/20">
                        {analysis.engineModules.modulo1_poisson.status}
                      </span>
                    </div>
                    <div className="space-y-1.5 text-xs sm:text-sm font-mono">
                      <div className="flex justify-between text-zinc-300">
                        <span className="text-zinc-400">xG Esperado:</span>
                        <strong className="text-white">
                          {analysis.engineModules.modulo1_poisson.xgHome} (C) vs {analysis.engineModules.modulo1_poisson.xgAway} (F)
                        </strong>
                      </div>
                      <div className="flex justify-between text-zinc-300">
                        <span className="text-zinc-400">Total xG / 1X2:</span>
                        <strong className="text-[#00E676]">
                          {analysis.engineModules.modulo1_poisson.totalXg} golos • {analysis.engineModules.modulo1_poisson.prob1X2.home}%-{analysis.engineModules.modulo1_poisson.prob1X2.draw}%-{analysis.engineModules.modulo1_poisson.prob1X2.away}%
                        </strong>
                      </div>
                      <div className="flex justify-between text-zinc-300">
                        <span className="text-zinc-400">Over 2.5 / BTTS:</span>
                        <span className="text-cyan-300 font-bold">
                          {analysis.engineModules.modulo1_poisson.overUnder25.over}% Over • {analysis.engineModules.modulo1_poisson.btts.yes}% BTTS
                        </span>
                      </div>
                    </div>
                  </div>

                  {/* MÓDULO 2: FÍSICO / CLIMA */}
                  <div className="p-4 rounded-xl bg-[#0b0e14] border border-zinc-800 space-y-2.5 relative">
                    <div className="flex items-center justify-between">
                      <span className="text-sm sm:text-base font-black uppercase tracking-wider text-cyan-400 flex items-center gap-1.5">
                        <span>🌦️</span> Módulo 2: Físico & Clima
                      </span>
                      <span className="text-xs font-mono font-bold px-2.5 py-0.5 rounded bg-cyan-500/10 text-cyan-300 border border-cyan-500/20">
                        Open-Meteo
                      </span>
                    </div>
                    <div className="space-y-1.5 text-xs sm:text-sm font-mono">
                      <div className="flex justify-between text-zinc-300">
                        <span className="text-zinc-400">Clima / Vento:</span>
                        <strong className="text-white">
                          {analysis.engineModules.modulo2_clima.temperature} • {analysis.engineModules.modulo2_clima.windKmH} km/h {analysis.engineModules.modulo2_clima.rainMm > 0 ? `• Chuva ${analysis.engineModules.modulo2_clima.rainMm}mm` : '• Seco'}
                        </strong>
                      </div>
                      <div className="flex justify-between text-zinc-300">
                        <span className="text-zinc-400">Relvado / Área:</span>
                        <strong className="text-zinc-200">
                          {analysis.engineModules.modulo2_clima.pitchType} ({analysis.engineModules.modulo2_clima.pitchDimension})
                        </strong>
                      </div>
                      <p className="text-xs sm:text-sm text-zinc-300 leading-relaxed pt-1">
                        {analysis.engineModules.modulo2_clima.impactSummary}
                      </p>
                    </div>
                  </div>

                  {/* MÓDULO 3: FATOR DE REGRESSÃO */}
                  <div className={`p-4 rounded-xl bg-[#0b0e14] border space-y-2.5 relative ${analysis.engineModules.modulo3_fatorAngelo.hasStreak5Plus ? 'border-amber-500/40 bg-amber-500/5' : 'border-zinc-800'}`}>
                    <div className="flex items-center justify-between">
                      <span className="text-sm sm:text-base font-black uppercase tracking-wider text-amber-400 flex items-center gap-1.5">
                        <span>⚡</span> Módulo 3: Fator de Regressão (Streak 5+)
                      </span>
                      <span className={`text-xs font-mono font-bold px-2.5 py-0.5 rounded ${analysis.engineModules.modulo3_fatorAngelo.hasStreak5Plus ? 'bg-amber-500/20 text-amber-300 border border-amber-500/40 animate-pulse' : 'bg-zinc-800 text-zinc-400'}`}>
                        {analysis.engineModules.modulo3_fatorAngelo.meanReversionRisk === 'Severo ⚠️' ? 'REGRESSÃO SEVERA' : analysis.engineModules.modulo3_fatorAngelo.meanReversionRisk === 'Moderado' ? 'ALERTA 5+ VITÓRIAS' : 'ESTÁVEL'}
                      </span>
                    </div>
                    <div className="space-y-1.5 text-xs sm:text-sm font-mono">
                      <div className="flex justify-between text-zinc-300">
                        <span className="text-zinc-400">Deteção 5+ Vitórias:</span>
                        <strong className={analysis.engineModules.modulo3_fatorAngelo.hasStreak5Plus ? 'text-amber-300' : 'text-zinc-300'}>
                          {analysis.engineModules.modulo3_fatorAngelo.hasStreak5Plus ? `${analysis.engineModules.modulo3_fatorAngelo.teamWithStreak} (${analysis.engineModules.modulo3_fatorAngelo.streakCount} seguidas) 🔥` : 'Sem streak extrema'}
                        </strong>
                      </div>
                      <p className="text-xs sm:text-sm text-zinc-200 leading-relaxed">
                        {analysis.engineModules.modulo3_fatorAngelo.explanation}
                      </p>
                      <p className="text-xs sm:text-sm text-amber-300 font-bold">
                        🛡️ Regra: {analysis.engineModules.modulo3_fatorAngelo.suggestedCautionOdd}
                      </p>
                    </div>
                  </div>

                  {/* MÓDULO 4: JORNADA DUPLA & FADIGA */}
                  <div className={`p-4 rounded-xl bg-[#0b0e14] border space-y-2.5 relative ${analysis.engineModules.modulo4_jornadaDupla.hasMatchWithin72h ? 'border-orange-500/40 bg-orange-500/5' : 'border-zinc-800'}`}>
                    <div className="flex items-center justify-between">
                      <span className="text-sm sm:text-base font-black uppercase tracking-wider text-orange-400 flex items-center gap-1.5">
                        <span>⏱️</span> Módulo 4: Jornada Dupla & Fadiga
                      </span>
                      <span className={`text-xs font-mono font-bold px-2.5 py-0.5 rounded ${analysis.engineModules.modulo4_jornadaDupla.hasMatchWithin72h ? 'bg-orange-500/20 text-orange-300 border border-orange-500/40' : 'bg-zinc-800 text-zinc-400'}`}>
                        {analysis.engineModules.modulo4_jornadaDupla.fatigueLevel}
                      </span>
                    </div>
                    <div className="space-y-1.5 text-xs sm:text-sm font-mono">
                      <div className="flex justify-between text-zinc-300">
                        <span className="text-zinc-400">Intervalo de Jogos:</span>
                        <strong className={analysis.engineModules.modulo4_jornadaDupla.hasMatchWithin72h ? 'text-orange-300' : 'text-zinc-300'}>
                          {analysis.engineModules.modulo4_jornadaDupla.restHours}h de descanso {analysis.engineModules.modulo4_jornadaDupla.hasMatchWithin72h ? `(2.º jogo na semana)` : '(Descanso total)'}
                        </strong>
                      </div>
                      <p className="text-xs sm:text-sm text-zinc-200 leading-relaxed">
                        {analysis.engineModules.modulo4_jornadaDupla.performanceDropWarning}
                      </p>
                    </div>
                  </div>

                  {/* MÓDULO 5: CO-OCORRÊNCIA */}
                  <div className="p-4 rounded-xl bg-[#0b0e14] border border-zinc-800 space-y-2.5 relative md:col-span-2 lg:col-span-2">
                    <div className="flex items-center justify-between">
                      <span className="text-sm sm:text-base font-black uppercase tracking-wider text-purple-400 flex items-center gap-1.5">
                        <span>🔗</span> Módulo 5: Co-Ocorrência & Vitórias em Simultâneo
                      </span>
                      <span className="text-xs font-mono font-bold px-2.5 py-0.5 rounded bg-purple-500/10 text-purple-300 border border-purple-500/20">
                        SuperIA Combinadas (4 a 13 equipas)
                      </span>
                    </div>
                    <div className="space-y-1.5 text-xs sm:text-sm font-mono">
                      <p className="text-xs sm:text-sm text-zinc-200 leading-relaxed">
                        {analysis.engineModules.modulo5_coOcorrencia.summary}
                      </p>
                      <div className="flex flex-wrap items-center justify-between gap-2 pt-1.5">
                        <span className="text-xs text-zinc-400">
                          Auditado por histórico real de co-ocorrência em ciclo de boletim com identificação do «Elo Mais Fraco».
                        </span>
                        <button
                          type="button"
                          onClick={() => {
                            const simWinsElement = document.getElementById('simultaneous-wins-section');
                            if (simWinsElement) {
                              simWinsElement.scrollIntoView({ behavior: 'smooth' });
                            }
                          }}
                          className="px-3 py-1.5 rounded-lg bg-purple-500/15 hover:bg-purple-500/25 border border-purple-500/40 text-purple-300 text-xs font-mono font-bold transition-all cursor-pointer"
                        >
                          Ver Matriz de Co-ocorrência ↓
                        </button>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* ------------------------------------------------------------- */}
            {/* BLOCO 2: COCKPIT DE IA & PROBABILIDADES DE POISSON           */}
            {/* ------------------------------------------------------------- */}
            <div className="bg-[#151a23] border border-zinc-800/90 rounded-2xl p-5 sm:p-6 shadow-2xl space-y-5">
              <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 border-b border-zinc-800 pb-3">
                <div className="flex items-center gap-2">
                  <span className="text-lg">🧠</span>
                  <h3 className="text-sm sm:text-base font-black uppercase tracking-tight text-white">
                    Cockpit de IA & Distribuição de Poisson
                  </h3>
                </div>

                {/* SELO ROXO DA IA (#7C4DFF) & BOTÃO LANÇAR BOLETIM */}
                <div className="flex flex-wrap items-center gap-2">
                  <div className="flex items-center gap-2 px-3.5 py-1.5 rounded-xl bg-[#7C4DFF]/15 border border-[#7C4DFF]/40 text-white text-xs shadow-[0_0_15px_rgba(124,77,255,0.2)]">
                    <span className="text-[#A78BFA] font-bold font-mono">Selo SuperIA:</span>
                    <strong className="text-white font-black uppercase tracking-wide">{analysis.aiPick.label}</strong>
                    <span className="px-1.5 py-0.2 rounded bg-[#7C4DFF] text-[10px] font-bold text-white">
                      {analysis.aiPick.confidence}% Conf.
                    </span>
                    <span className="text-[#FFD700] font-mono font-black">{analysis.aiPick.ev}</span>
                  </div>

                  <button
                    type="button"
                    onClick={() => {
                      if (analysis && onSendGamesToBetSlip) {
                        onSendGamesToBetSlip([{
                          homeTeam: analysis.game.clube_casa,
                          awayTeam: analysis.game.clube_fora,
                          betType: analysis.aiPick.label,
                          league: analysis.game.liga,
                          odd: String(analysis.aiPick.odd || '1.75'),
                          observations: `SuperIA (${analysis.game.data}) • ${analysis.aiPick.ev}`,
                          resultStatus: 'pending',
                          sport: 'Futebol',
                          matchDate: analysis.game.data
                        }]);
                      }
                    }}
                    className="px-3 py-1.5 rounded-xl bg-[#00E676] hover:bg-[#00c853] text-black font-black text-xs font-mono uppercase tracking-wider transition-all shadow-md active:scale-95 cursor-pointer flex items-center gap-1.5"
                  >
                    <span>📥 Lançar para o Boletim</span>
                  </button>
                </div>
              </div>

              {/* 1X2 Triple Bar Distribution */}
              <div className="space-y-2">
                <div className="flex justify-between text-xs font-mono font-bold">
                  <span className="text-[#00E676]">{analysis.game.clube_casa}: {analysis.poisson.probHome}%</span>
                  <span className="text-zinc-400">Empate (X): {analysis.poisson.probDraw}%</span>
                  <span className="text-[#7C4DFF]">{analysis.game.clube_fora}: {analysis.poisson.probAway}%</span>
                </div>

                <div className="h-4 w-full rounded-full bg-zinc-900 overflow-hidden flex p-0.5 border border-zinc-800">
                  <div
                    style={{ width: `${analysis.poisson.probHome}%` }}
                    className="h-full bg-[#00E676] rounded-l-full transition-all duration-700"
                    title={`Vitória Casa: ${analysis.poisson.probHome}%`}
                  ></div>
                  <div
                    style={{ width: `${analysis.poisson.probDraw}%` }}
                    className="h-full bg-zinc-500 transition-all duration-700"
                    title={`Empate: ${analysis.poisson.probDraw}%`}
                  ></div>
                  <div
                    style={{ width: `${analysis.poisson.probAway}%` }}
                    className="h-full bg-[#7C4DFF] rounded-r-full transition-all duration-700"
                    title={`Vitória Fora: ${analysis.poisson.probAway}%`}
                  ></div>
                </div>
              </div>

              {/* Poisson Goals Markets Grid */}
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 pt-2">
                <div className="p-3 bg-[#0b0e14] rounded-xl border border-zinc-850 space-y-1.5">
                  <div className="flex justify-between text-[11px] font-mono text-zinc-400">
                    <span>Over 1.5 Golos</span>
                    <strong className="text-white">{analysis.poisson.over15Prob}%</strong>
                  </div>
                  <div className="w-full h-2 bg-zinc-900 rounded-full overflow-hidden">
                    <div
                      style={{ width: `${analysis.poisson.over15Prob}%` }}
                      className="h-full bg-[#00E676] rounded-full"
                    ></div>
                  </div>
                  <p className="text-[10px] text-zinc-500 font-mono">Golos Totais Esperados: {analysis.poisson.totalExpectedGoals}</p>
                </div>

                <div className="p-3 bg-[#0b0e14] rounded-xl border border-zinc-850 space-y-1.5">
                  <div className="flex justify-between text-[11px] font-mono text-zinc-400">
                    <span>Over 2.5 Golos</span>
                    <strong className="text-white">{analysis.poisson.over25Prob}%</strong>
                  </div>
                  <div className="w-full h-2 bg-zinc-900 rounded-full overflow-hidden">
                    <div
                      style={{ width: `${analysis.poisson.over25Prob}%` }}
                      className="h-full bg-[#FFD700] rounded-full"
                    ></div>
                  </div>
                  <p className="text-[10px] text-zinc-500 font-mono">Under 2.5: {analysis.poisson.under25Prob}%</p>
                </div>

                <div className="p-3 bg-[#0b0e14] rounded-xl border border-zinc-850 space-y-1.5">
                  <div className="flex justify-between text-[11px] font-mono text-zinc-400">
                    <span>Ambas Marcam (Sim)</span>
                    <strong className="text-white">{analysis.poisson.bttsYesProb}%</strong>
                  </div>
                  <div className="w-full h-2 bg-zinc-900 rounded-full overflow-hidden">
                    <div
                      style={{ width: `${analysis.poisson.bttsYesProb}%` }}
                      className="h-full bg-[#7C4DFF] rounded-full"
                    ></div>
                  </div>
                  <p className="text-[10px] text-zinc-500 font-mono">BTTS Não: {analysis.poisson.bttsNoProb}%</p>
                </div>

                <div className="p-3 bg-[#0b0e14] rounded-xl border border-zinc-850 space-y-1.5">
                  <div className="flex justify-between text-[11px] font-mono text-zinc-400">
                    <span>xG Casa vs Fora</span>
                    <strong className="text-[#00E676]">{analysis.poisson.expectedHomeGoals} vs {analysis.poisson.expectedAwayGoals}</strong>
                  </div>
                  <div className="w-full h-2 bg-zinc-900 rounded-full overflow-hidden flex">
                    <div
                      style={{ width: `${Math.round((analysis.poisson.expectedHomeGoals / analysis.poisson.totalExpectedGoals) * 100)}%` }}
                      className="h-full bg-[#00E676]"
                    ></div>
                    <div
                      style={{ width: `${Math.round((analysis.poisson.expectedAwayGoals / analysis.poisson.totalExpectedGoals) * 100)}%` }}
                      className="h-full bg-[#7C4DFF]"
                    ></div>
                  </div>
                  <p className="text-[10px] text-zinc-500 font-mono">Calibrado pela Defesa adversária</p>
                </div>
              </div>
            </div>

            {/* ------------------------------------------------------------- */}
            {/* BLOCO 3 & BLOCO 4: GRÁFICOS (Chart.js Radar & Bar Chart)     */}
            {/* ------------------------------------------------------------- */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              {/* GRÁFICO 1: RADAR TÁTICO DE SETORES (Chart.js Radar) */}
              <div className="bg-[#151a23] border border-zinc-800/90 rounded-2xl p-5 shadow-2xl space-y-4">
                <div className="flex items-center justify-between border-b border-zinc-800 pb-3">
                  <div className="flex items-center gap-2">
                    <span className="text-base">🕸️</span>
                    <h3 className="text-sm font-black uppercase tracking-tight text-white">
                      Radar Tático de Setores
                    </h3>
                  </div>
                  <span className="text-[10px] font-mono text-zinc-400 bg-[#0b0e14] px-2 py-0.5 rounded border border-zinc-800">
                    Escala 4.0 - 10.0
                  </span>
                </div>

                <div className="relative h-64 sm:h-72 w-full flex items-center justify-center">
                  <canvas ref={radarCanvasRef}></canvas>
                </div>

                <div className="grid grid-cols-4 gap-2 text-center text-[10px] font-mono pt-2 border-t border-zinc-850">
                  <div className="p-1.5 bg-[#0b0e14] rounded-lg">
                    <span className="text-zinc-500 block">GR</span>
                    <strong className="text-[#00E676]">{analysis.raioX.rating_gr_casa}</strong> vs{' '}
                    <strong className="text-[#7C4DFF]">{analysis.raioX.rating_gr_fora}</strong>
                  </div>
                  <div className="p-1.5 bg-[#0b0e14] rounded-lg">
                    <span className="text-zinc-500 block">DEF</span>
                    <strong className="text-[#00E676]">{analysis.raioX.rating_defesa_casa}</strong> vs{' '}
                    <strong className="text-[#7C4DFF]">{analysis.raioX.rating_defesa_fora}</strong>
                  </div>
                  <div className="p-1.5 bg-[#0b0e14] rounded-lg">
                    <span className="text-zinc-500 block">MEIO</span>
                    <strong className="text-[#00E676]">{analysis.raioX.rating_meios_casa}</strong> vs{' '}
                    <strong className="text-[#7C4DFF]">{analysis.raioX.rating_meios_fora}</strong>
                  </div>
                  <div className="p-1.5 bg-[#0b0e14] rounded-lg">
                    <span className="text-zinc-500 block">ATK</span>
                    <strong className="text-[#00E676]">{analysis.raioX.rating_ataque_casa}</strong> vs{' '}
                    <strong className="text-[#7C4DFF]">{analysis.raioX.rating_ataque_fora}</strong>
                  </div>
                </div>
              </div>

              {/* GRÁFICO 2: CANTOS & DISCIPLINA + STREAKS BANNER (Chart.js Bar) */}
              <div className="bg-[#151a23] border border-zinc-800/90 rounded-2xl p-5 shadow-2xl space-y-4">
                <div className="flex items-center justify-between border-b border-zinc-800 pb-3">
                  <div className="flex items-center gap-2">
                    <span className="text-base">📊</span>
                    <h3 className="text-sm font-black uppercase tracking-tight text-white">
                      Projeção de Cantos & Disciplina
                    </h3>
                  </div>
                  <span className="text-[10px] font-mono text-[#00E676] bg-[#00E676]/10 px-2 py-0.5 rounded border border-[#00E676]/20">
                    {analysis.cornersProjection.totalEstimated} Cantos Estimados
                  </span>
                </div>

                {/* STREAK ALERT BANNER (se existir série de 5+ jogos) */}
                {analysis.streaks.homeStreak && (
                  <div className="p-2.5 rounded-xl bg-gradient-to-r from-orange-500/15 to-amber-500/15 border border-orange-500/30 text-amber-300 text-xs font-bold flex items-center gap-2">
                    <span className="text-base">🔥</span>
                    <span>{analysis.streaks.homeStreak}</span>
                  </div>
                )}

                <div className="relative h-56 sm:h-60 w-full flex items-center justify-center">
                  <canvas ref={barCanvasRef}></canvas>
                </div>

                <div className="p-3 bg-[#0b0e14] rounded-xl border border-zinc-850 flex items-center justify-between text-xs font-mono">
                  <span className="text-zinc-400">Risco de Cartão Vermelho:</span>
                  <span
                    className={`font-black px-2 py-0.5 rounded ${
                      analysis.cardsProjection.redCardRisk === 'Alto'
                        ? 'bg-rose-500/20 text-rose-400'
                        : analysis.cardsProjection.redCardRisk === 'Moderado'
                        ? 'bg-amber-500/20 text-amber-400'
                        : 'bg-emerald-500/20 text-emerald-400'
                    }`}
                  >
                    {analysis.cardsProjection.redCardRisk} ({analysis.cardsProjection.totalEstimated} cartões proj.)
                  </span>
                </div>
              </div>
            </div>

            {/* ------------------------------------------------------------- */}
            {/* BLOCO 5: DUELO DE BANCOS & PERFIL PSICOLÓGICO/ASTROLÓGICO    */}
            {/* ------------------------------------------------------------- */}
            <div className="bg-[#151a23] border border-zinc-800/90 rounded-2xl p-5 sm:p-6 shadow-2xl space-y-4">
              <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-2 border-b border-zinc-800 pb-3">
                <div className="flex items-center gap-2">
                  <span className="text-lg">👔</span>
                  <h3 className="text-sm sm:text-base font-black uppercase tracking-tight text-white">
                    Duelo de Bancos & Perfil Psicológico / Astrológico dos Treinadores
                  </h3>
                </div>

                <span className="text-[11px] font-mono text-[#00E676] bg-[#00E676]/10 px-3 py-1 rounded-full border border-[#00E676]/30">
                  {analysis.tacticalEdge}
                </span>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {/* Coach Home */}
                <div className="p-4 bg-[#0b0e14] border border-zinc-800 rounded-2xl space-y-3 relative overflow-hidden">
                  <div className="flex items-start justify-between">
                    <div>
                      <span className="text-[10px] font-mono text-[#00E676] uppercase font-bold">
                        Treinador Mandante
                      </span>
                      <h4 className="text-lg font-black text-white">{analysis.coachHome.name}</h4>
                      <p className="text-xs text-zinc-400">
                        {analysis.coachHome.nationality} • {analysis.coachHome.age} anos • {analysis.coachHome.momentum}
                      </p>
                    </div>

                    <div className="text-right">
                      <div className="text-[#FFD700] text-sm font-bold">
                        {'★'.repeat(Math.round(analysis.coachHome.stars))}
                        <span className="text-xs text-zinc-500 ml-1">({analysis.coachHome.stars})</span>
                      </div>
                      <span className="text-[10px] font-mono text-zinc-400 bg-zinc-900 px-2 py-0.5 rounded border border-zinc-800">
                        {analysis.coachHome.preferredFormation}
                      </span>
                    </div>
                  </div>

                  <div className="p-3 rounded-xl bg-zinc-950/80 border border-zinc-900 space-y-1">
                    <div className="flex items-center gap-2">
                      <span className="text-xs">✨ Signo:</span>
                      <strong className="text-white text-xs">{analysis.coachHome.sign}</strong>
                      <span className="text-[10px] text-zinc-500 font-mono">({analysis.coachHome.archetypeTitle})</span>
                    </div>
                    <p className="text-xs text-zinc-300 font-light leading-relaxed">
                      {analysis.coachHome.archetypeDesc}
                    </p>
                  </div>
                </div>

                {/* Coach Away */}
                <div className="p-4 bg-[#0b0e14] border border-zinc-800 rounded-2xl space-y-3 relative overflow-hidden">
                  <div className="flex items-start justify-between">
                    <div>
                      <span className="text-[10px] font-mono text-[#7C4DFF] uppercase font-bold">
                        Treinador Visitante
                      </span>
                      <h4 className="text-lg font-black text-white">{analysis.coachAway.name}</h4>
                      <p className="text-xs text-zinc-400">
                        {analysis.coachAway.nationality} • {analysis.coachAway.age} anos • {analysis.coachAway.momentum}
                      </p>
                    </div>

                    <div className="text-right">
                      <div className="text-[#FFD700] text-sm font-bold">
                        {'★'.repeat(Math.round(analysis.coachAway.stars))}
                        <span className="text-xs text-zinc-500 ml-1">({analysis.coachAway.stars})</span>
                      </div>
                      <span className="text-[10px] font-mono text-zinc-400 bg-zinc-900 px-2 py-0.5 rounded border border-zinc-800">
                        {analysis.coachAway.preferredFormation}
                      </span>
                    </div>
                  </div>

                  <div className="p-3 rounded-xl bg-zinc-950/80 border border-zinc-900 space-y-1">
                    <div className="flex items-center gap-2">
                      <span className="text-xs">✨ Signo:</span>
                      <strong className="text-white text-xs">{analysis.coachAway.sign}</strong>
                      <span className="text-[10px] text-zinc-500 font-mono">({analysis.coachAway.archetypeTitle})</span>
                    </div>
                    <p className="text-xs text-zinc-300 font-light leading-relaxed">
                      {analysis.coachAway.archetypeDesc}
                    </p>
                  </div>
                </div>
              </div>
            </div>

            {/* ------------------------------------------------------------- */}
            {/* BLOCO 6: ANÁLISE TÁTICA EXPLICATIVA DA IA (Texto Corrido)    */}
            {/* ------------------------------------------------------------- */}
            <div className="bg-[#151a23] border border-zinc-800/90 rounded-2xl p-5 sm:p-6 shadow-2xl space-y-4">
              <div className="flex items-center justify-between border-b border-zinc-800 pb-3">
                <div className="flex items-center gap-2">
                  <span className="text-lg">📝</span>
                  <h3 className="text-sm sm:text-base font-black uppercase tracking-tight text-white">
                    Relatório Scout & Análise Tática Explicativa da SuperIA
                  </h3>
                </div>
                {!isGameUnlocked(analysis.game.jogo_id) && (
                  <span className="px-2.5 py-1 rounded-md bg-amber-500/15 border border-amber-500/30 text-amber-400 text-xs font-bold font-mono">
                    🔒 Pré-visualização VIP
                  </span>
                )}
              </div>

              {!isGameUnlocked(analysis.game.jogo_id) ? (
                <div className="p-6 bg-[#0b0e14] border border-amber-500/30 rounded-xl text-center space-y-3 relative overflow-hidden">
                  <div className="filter blur-sm select-none opacity-40 space-y-2 pointer-events-none">
                    <p className="text-xs text-zinc-400">
                      {analysis.aiPick.rationale.slice(0, 160)}...
                    </p>
                    <div className="grid grid-cols-2 gap-2 text-xs">
                      <div>› Análise de bloco defensivo e transições rápidas</div>
                      <div>› Fragilidade nos flancos e bolas paradas</div>
                    </div>
                  </div>
                  <div className="relative z-10 pt-2 space-y-2 max-w-lg mx-auto">
                    <p className="text-xs sm:text-sm font-bold text-amber-400">
                      O Raio-X estatístico, Poisson e setores deste jogo estão 100% disponíveis acima. O relatório explicativo aprofundado faz parte do Clube VIP.
                    </p>
                    <button
                      type="button"
                      onClick={() => {
                        window.location.hash = '#clube-vip';
                      }}
                      className="inline-block px-5 py-2 rounded-xl bg-gradient-to-r from-amber-500 to-[#00E676] text-black font-black text-xs uppercase tracking-wider shadow-lg hover:opacity-95 transition-all cursor-pointer"
                    >
                      Desbloquear Todos os Jogos sem Limite
                    </button>
                  </div>
                </div>
              ) : (
                <div className="p-5 bg-[#0b0e14] border border-zinc-850 rounded-xl space-y-3.5">
                  <p className="text-sm sm:text-base text-zinc-100 leading-relaxed font-normal">
                    {analysis.aiPick.rationale}
                  </p>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5 pt-3 border-t border-zinc-850/60">
                    {analysis.scoutingNotes.map((note, idx) => (
                      <div key={idx} className="flex items-start gap-2.5 text-xs sm:text-sm text-zinc-200">
                        <span className="text-[#00E676] font-bold text-sm">›</span>
                        <span>{note}</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          </div>
        )}

        {/* FLOATING ACTION BAR FOR SUPERIA MULTIPLES */}
        {userCheckedIds.length > 0 && (
          <div className="fixed bottom-4 inset-x-4 max-w-4xl mx-auto z-[9990] bg-[#0b0e14]/95 border-2 border-[#00E676]/60 rounded-2xl p-3.5 backdrop-blur-xl shadow-[0_0_40px_rgba(0,230,118,0.3)] flex flex-wrap items-center justify-between gap-3 animate-fade-in">
            <div className="flex items-center gap-3">
              <span className="flex h-3 w-3 relative">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-[#00E676] opacity-75"></span>
                <span className="relative inline-flex rounded-full h-3 w-3 bg-[#00E676]"></span>
              </span>
              <div>
                <div className="text-xs font-black uppercase text-white font-mono flex items-center gap-2">
                  <span>⚡ SuperIA: {userCheckedIds.length} Equipas Selecionadas</span>
                  <span className="text-[10px] px-2 py-0.2 rounded-full bg-[#00E676]/20 text-[#00E676] border border-[#00E676]/40 font-mono">
                    Odd Combinada: @{combinedSelectionsOdd}
                  </span>
                </div>
                <p className="text-[11px] text-zinc-400 font-mono">
                  {userCheckedIds.length >= 4 
                    ? 'Pronto para análise quantitativa de vitórias em simultâneo (4 a 13 equipas)'
                    : `Selecione mais ${4 - userCheckedIds.length} equipas para atingir o lote de 4 a 13 equipas`}
                </p>
              </div>
            </div>

            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => setShowSimultaneousModal(true)}
                className="px-3.5 py-2 rounded-xl bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-500 hover:to-indigo-500 text-white font-black text-xs font-mono uppercase tracking-wider transition-all shadow-md active:scale-95 cursor-pointer flex items-center gap-1.5"
              >
                <span>📊 Vitórias em Simultâneo</span>
              </button>

              <button
                type="button"
                onClick={handleLaunchSelectedToBetSlip}
                className="px-4 py-2 rounded-xl bg-[#00E676] hover:bg-[#00c853] text-black font-black text-xs font-mono uppercase tracking-wider transition-all shadow-md active:scale-95 cursor-pointer flex items-center gap-1.5"
              >
                <span>🚀 Lançar para o Boletim ({userCheckedIds.length})</span>
              </button>

              <button
                type="button"
                onClick={() => setUserCheckedIds([])}
                title="Limpar seleções"
                className="p-2 rounded-xl bg-zinc-850 hover:bg-zinc-800 text-zinc-400 hover:text-white text-xs font-mono cursor-pointer transition-colors"
              >
                ✕
              </button>
            </div>
          </div>
        )}

        {/* MODAL DE ANÁLISE DE VITÓRIAS EM SIMULTÂNEO */}
        {showSimultaneousModal && (
          <SimultaneousWinsCard
            isModal
            selections={simultaneousSelections}
            combinedOdd={combinedSelectionsOdd}
            onClose={() => setShowSimultaneousModal(false)}
          />
        )}
        </div>
      </div>
    </div>
  );

  // HELPER TO RENDER INDIVIDUAL GAME CARDS
  function renderGameCard(game: MatchCenterGame) {
    const isSelected = selectedGame?.jogo_id === game.jogo_id;
    const isChecked = userCheckedIds.includes(game.jogo_id);
    const isFreeMarketing = marketingFreeIds.includes(game.jogo_id);
    const isUnlocked = isGameUnlocked(game.jogo_id);

    const isThisCardLoading = isSelected && loadingAnalysis;

    return (
      <div
        key={game.jogo_id}
        onClick={() => {
          handleSelectGame(game, true);
        }}
        className={`p-3.5 rounded-2xl border transition-all cursor-pointer relative flex flex-col justify-between gap-3 ${
          isSelected
            ? 'bg-[#121c24] border-2 border-[#00E676] shadow-[0_0_20px_rgba(0,230,118,0.25)] ring-2 ring-[#00E676]/40'
            : 'bg-[#0b0e14] border-zinc-800/80 hover:border-zinc-600 hover:bg-[#0f141d]'
        }`}
      >
        {/* TOP ROW: LEAGUE + ICONS (STAR / VISTO + MARKETING PIN) */}
        <div className="flex items-center justify-between text-[11px] gap-2">
          <span className="text-zinc-400 font-mono truncate max-w-[170px]">
            {game.liga}
          </span>

          <div className="flex items-center gap-1.5">
            {/* Live Indicator */}
            {game.isLive && (
              <span className="flex items-center gap-1 text-[10px] text-rose-400 font-bold uppercase font-mono px-1.5 py-0.5 rounded bg-rose-500/15">
                <span className="w-1.5 h-1.5 rounded-full bg-rose-500 animate-ping"></span>
                {game.liveMinute || 'LIVE'}
              </span>
            )}

            {/* Free Marketing Badge or Pin */}
            {isFreeMarketing && (
              <span className="px-1.5 py-0.5 rounded bg-amber-500/20 text-amber-400 font-bold text-[9px] uppercase font-mono" title="Jogo Gratuito no Modo Marketing">
                FREE
              </span>
            )}

            {/* Admin Marketing Toggle */}
            {(isAdmin || currentUser?.email?.toLowerCase() === 'morgado.aam@gmail.com') && (
              <button
                type="button"
                onClick={e => handleToggleMarketing(game.jogo_id, e)}
                title={isFreeMarketing ? 'Remover da versão Free' : 'Libertar na versão Free (Max 4)'}
                className={`w-6 h-6 rounded-lg flex items-center justify-center text-xs transition-all ${
                  isFreeMarketing
                    ? 'bg-amber-500 text-black font-black'
                    : 'bg-zinc-850 text-zinc-500 hover:text-amber-400'
                }`}
              >
                ★
              </button>
            )}

            {/* User Checkmark / Visto Toggle */}
            <button
              type="button"
              onClick={e => handleToggleChecked(game.jogo_id, e)}
              title={isChecked ? 'Remover dos meus favoritos' : 'Marcar visto / favorito'}
              className={`w-6 h-6 rounded-lg flex items-center justify-center text-xs transition-all ${
                isChecked
                  ? 'bg-[#00E676] text-black font-black'
                  : 'bg-zinc-850 text-zinc-500 hover:text-white'
              }`}
            >
              {isChecked ? '✓' : '○'}
            </button>
          </div>
        </div>

        {/* MIDDLE: TEAMS & SCORE */}
        <div className="space-y-1">
          <div className="flex justify-between items-center text-xs font-bold text-white">
            <span className="truncate">{game.clube_casa}</span>
            {game.isLive && <span className="text-[#00E676] font-mono">{game.liveScore?.split('-')[0] || '0'}</span>}
          </div>
          <div className="flex justify-between items-center text-xs font-bold text-white">
            <span className="truncate">{game.clube_fora}</span>
            {game.isLive && <span className="text-[#7C4DFF] font-mono">{game.liveScore?.split('-')[1] || '0'}</span>}
          </div>
        </div>

        {/* METRICS ROW: ODDS & PROBABILITIES */}
        <div className="pt-2 border-t border-zinc-850/60 space-y-1.5">
          <div className="flex items-center justify-between text-[10px] font-mono">
            <div className="flex items-center gap-1.5">
              <span className="px-1.5 py-0.5 rounded bg-zinc-900 border border-zinc-750 text-cyan-300 font-bold">
                1: {Number(game.odd_1 || 1.85).toFixed(2)}
              </span>
              <span className="px-1.5 py-0.5 rounded bg-zinc-900 border border-zinc-750 text-zinc-300 font-bold">
                X: {Number(game.odd_x || 3.40).toFixed(2)}
              </span>
              <span className="px-1.5 py-0.5 rounded bg-zinc-900 border border-zinc-750 text-amber-300 font-bold">
                2: {Number(game.odd_2 || 4.20).toFixed(2)}
              </span>
            </div>
            {game.valor_ev && (
              <span className="text-[9px] font-mono text-[#00E676] bg-[#00E676]/10 px-1.5 py-0.5 rounded border border-[#00E676]/30 font-bold">
                {String(game.valor_ev)}
              </span>
            )}
          </div>

          {/* Mini Probability Distribution Bar */}
          {game.prob_casa != null && game.prob_fora != null && (
            <div className="space-y-0.5">
              <div className="h-1.5 w-full bg-zinc-900 rounded-full overflow-hidden flex border border-zinc-800">
                <div
                  style={{ width: `${game.prob_casa}%` }}
                  className="bg-[#00E676] h-full transition-all"
                  title={`Casa: ${game.prob_casa}%`}
                />
                <div
                  style={{ width: `${game.prob_empate || Math.max(10, 100 - Number(game.prob_casa) - Number(game.prob_fora))}%` }}
                  className="bg-zinc-600 h-full transition-all"
                  title={`Empate: ${game.prob_empate}%`}
                />
                <div
                  style={{ width: `${game.prob_fora}%` }}
                  className="bg-[#7C4DFF] h-full transition-all"
                  title={`Fora: ${game.prob_fora}%`}
                />
              </div>
              <div className="flex justify-between text-[9px] font-mono">
                <span className="text-[#00E676] font-bold">{game.prob_casa}%</span>
                <span className="text-zinc-400">{game.prob_empate || Math.max(10, 100 - Number(game.prob_casa) - Number(game.prob_fora))}%</span>
                <span className="text-[#A78BFA] font-bold">{game.prob_fora}%</span>
              </div>
            </div>
          )}
        </div>

        {/* TIME & STATUS */}
        <div className="pt-2 border-t border-zinc-850/60 flex items-center justify-between text-[10px] font-mono">
          <div className="flex items-center gap-2">
            {/* QUADRADO / VISTO SINAL ABERTO ANTES DA DATA */}
            {(isAdmin || currentUser?.email?.toLowerCase() === 'morgado.aam@gmail.com' || currentUser?.email?.toLowerCase() === '1982veramorgado@gmail.com') ? (
              <button
                type="button"
                onClick={e => handleToggleMarketing(game.jogo_id, e)}
                title={
                  isFreeMarketing
                    ? '✓ Em Sinal Aberto (sem login). Clique para desmarcar visto.'
                    : '☐ Colocar visto para deixar em Sinal Aberto (sem login)'
                }
                className={`w-5 h-5 rounded-md flex items-center justify-center text-xs transition-all border cursor-pointer ${
                  isFreeMarketing
                    ? 'bg-emerald-500 border-emerald-400 text-black font-black shadow-[0_0_8px_rgba(16,185,129,0.5)] active:scale-95'
                    : 'bg-zinc-900 border-zinc-700 text-transparent hover:border-emerald-500 hover:text-emerald-400/50 active:scale-95'
                }`}
              >
                <span className="font-black leading-none">{isFreeMarketing ? '✓' : ''}</span>
              </button>
            ) : (
              isFreeMarketing && (
                <span 
                  className="px-1.5 py-0.5 rounded bg-emerald-500/20 text-emerald-400 border border-emerald-500/40 text-[9px] font-mono font-bold flex items-center gap-0.5"
                  title="Sinal Aberto (Acesso sem Login)"
                >
                  <span>🔓</span>
                  <span>Aberto</span>
                </span>
              )
            )}
            <span className="text-zinc-400">{game.data} • {game.hora}</span>
          </div>

          {!isUnlocked ? (
            <span className="text-amber-400 flex items-center gap-1 font-bold">
              <span>🔒 Prévia</span>
            </span>
          ) : (
            <span className="text-[#00E676] font-bold truncate max-w-[130px]">
              {game.confianca_percentagem && game.confianca_percentagem >= 75 ? `🔥 ${game.previsao_resumo}` : (game.previsao_resumo || '⚡ Raio-X Pronto')}
            </span>
          )}
        </div>

        {/* PICK SELECTION FOR SUPERIA MULTIPLE */}
        {isChecked && (
          <div className="pt-2 border-t border-zinc-800 flex items-center justify-between gap-1 text-[10px] font-mono" onClick={e => e.stopPropagation()}>
            <span className="text-zinc-500 text-[9px] uppercase">Pick:</span>
            <div className="flex items-center gap-1">
              <button
                type="button"
                onClick={() => setTeamPicksMap(prev => ({ ...prev, [game.jogo_id]: 'casa' }))}
                className={`px-2 py-0.5 rounded font-bold transition-all text-[9px] ${
                  (teamPicksMap[game.jogo_id] || (Number(game.prob_fora || 0) > Number(game.prob_casa || 0) ? 'fora' : 'casa')) === 'casa'
                    ? 'bg-[#00E676] text-black shadow-sm'
                    : 'bg-zinc-850 text-zinc-400 hover:text-white'
                }`}
              >
                1: {game.clube_casa.split(' ')[0]} @{game.odd_1 || '1.70'}
              </button>
              <button
                type="button"
                onClick={() => setTeamPicksMap(prev => ({ ...prev, [game.jogo_id]: 'fora' }))}
                className={`px-2 py-0.5 rounded font-bold transition-all text-[9px] ${
                  (teamPicksMap[game.jogo_id] || (Number(game.prob_fora || 0) > Number(game.prob_casa || 0) ? 'fora' : 'casa')) === 'fora'
                    ? 'bg-[#7C4DFF] text-white shadow-sm'
                    : 'bg-zinc-850 text-zinc-400 hover:text-white'
                }`}
              >
                2: {game.clube_fora.split(' ')[0]} @{game.odd_2 || '2.10'}
              </button>
            </div>
          </div>
        )}

        {/* EXPLICIT ACTION BUTTON TO ENSURE ZERO CLICK CONFUSION */}
        <button
          type="button"
          onClick={(e) => {
            e.stopPropagation();
            handleSelectGame(game, true);
          }}
          className={`w-full py-2 px-3 rounded-xl font-black text-xs uppercase tracking-wider transition-all flex items-center justify-center gap-1.5 shadow-md cursor-pointer mt-1 ${
            isSelected
              ? 'bg-[#00E676] text-black shadow-[0_0_15px_rgba(0,230,118,0.4)]'
              : 'bg-zinc-850 hover:bg-[#00E676] text-zinc-200 hover:text-black border border-zinc-750 hover:border-[#00E676]'
          }`}
        >
          {isThisCardLoading ? (
            <>
              <span className="w-3 h-3 border-2 border-current border-t-transparent rounded-full animate-spin"></span>
              <span>A Calcular Raio-X...</span>
            </>
          ) : isSelected ? (
            <span>✓ A Ver Análise Abaixo ↓</span>
          ) : (
            <span>⚡ Ver Análise Tática</span>
          )}
        </button>
      </div>
    );
  }
};
