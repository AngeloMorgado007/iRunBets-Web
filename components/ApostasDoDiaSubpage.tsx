import React, { useState, useEffect, useMemo } from 'react';
import { JogoDoDia, getCalibratedMatchMetrics, getTodayDateString } from '../services/supabase';
import { db } from '../services/firebase';
import { doc, getDoc, setDoc } from 'firebase/firestore';

export interface TicketSelection {
  id: string;
  gameId?: string;
  match: string;
  homeTeam: string;
  awayTeam: string;
  competition: string;
  date: string;
  time: string;
  dayLabel?: string;
  market: string;
  selection: string;
  odd: number;
  prob: number;
  marketType: '1x2' | 'goals' | 'corners' | 'scorer' | 'double_chance' | 'custom';
  status?: 'pending' | 'green' | 'red';
  playerScorer?: string;
}

export interface BettingTicket {
  id: string;
  title: string;
  subtitle: string;
  badge: string;
  type: 'auto' | 'manual' | 'simulator';
  selections: TicketSelection[];
  totalOdd: number;
  jointProbability: number;
  recommendedStake: number;
  notes?: string;
  updatedAt: string;
  author?: string;
}

interface ApostasDoDiaSubpageProps {
  jogos: JogoDoDia[];
  isUserRegistered: boolean;
  isAdmin: boolean;
  onOpenAuth: () => void;
  language?: string;
}

// Top known scorers when teams play
const STAR_SCORERS: Record<string, { player: string; odd: number; prob: number }> = {
  sporting: { player: 'Viktor Gyökeres', odd: 1.62, prob: 76 },
  benfica: { player: 'Vangelis Pavlidis', odd: 1.85, prob: 66 },
  porto: { player: 'Samu Omorodion', odd: 1.90, prob: 65 },
  braga: { player: 'Ricardo Horta', odd: 2.25, prob: 56 },
  'manchester city': { player: 'Erling Haaland', odd: 1.55, prob: 78 },
  arsenal: { player: 'Bukayo Saka', odd: 2.10, prob: 60 },
  liverpool: { player: 'Mohamed Salah', odd: 1.95, prob: 65 },
  'real madrid': { player: 'Kylian Mbappé', odd: 1.75, prob: 70 },
  barcelona: { player: 'Robert Lewandowski', odd: 1.80, prob: 68 },
  'bayern munich': { player: 'Harry Kane', odd: 1.65, prob: 74 },
  'bayern munchen': { player: 'Harry Kane', odd: 1.65, prob: 74 },
  inter: { player: 'Lautaro Martínez', odd: 2.00, prob: 62 },
  juventus: { player: 'Dušan Vlahović', odd: 2.15, prob: 58 },
  psg: { player: 'Bradley Barcola', odd: 2.20, prob: 58 },
};

function findStarScorer(teamName: string): { player: string; odd: number; prob: number } | null {
  if (!teamName) return null;
  const lower = teamName.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '');
  for (const [key, scorer] of Object.entries(STAR_SCORERS)) {
    if (lower.includes(key)) {
      return scorer;
    }
  }
  return null;
}

export default function ApostasDoDiaSubpage({
  jogos,
  isUserRegistered,
  isAdmin,
  onOpenAuth,
  language = 'pt'
}: ApostasDoDiaSubpageProps) {
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  const showToast = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(null), 3500);
  };

  // Helper calculation for joint probability and total odd
  const calculateTicketMetrics = (selections: TicketSelection[]) => {
    if (!selections || selections.length === 0) {
      return { totalOdd: 1.0, jointProbability: 0 };
    }
    const cleanSelections = selections.map(s => ({
      ...s,
      odd: Math.max(1.05, Number(s.odd) || 1.30),
      prob: Math.min(95, Math.max(20, Number(s.prob) || 70))
    }));

    const totalOdd = cleanSelections.reduce((acc, curr) => acc * curr.odd, 1);
    const rawJointProb = cleanSelections.reduce((acc, curr) => acc * (curr.prob / 100), 1);
    const jointProbability = Math.round(Math.max(1, rawJointProb * 100));

    return {
      totalOdd: Number(totalOdd.toFixed(2)),
      jointProbability
    };
  };

  // -------------------------------------------------------------
  // DATES ENGINE: TODAY (00:00 - 24:00) & 3-DAY HORIZON
  // -------------------------------------------------------------
  const todayStr = useMemo(() => getTodayDateString(), []);

  const threeDaysList = useMemo(() => {
    const list: string[] = [];
    const d = new Date();
    for (let i = 0; i < 3; i++) {
      const cur = new Date(d);
      cur.setDate(d.getDate() + i);
      const y = cur.getFullYear();
      const m = String(cur.getMonth() + 1).padStart(2, '0');
      const day = String(cur.getDate()).padStart(2, '0');
      list.push(`${y}-${m}-${day}`);
    }
    return list;
  }, []);

  const getDayBadge = (dateStr: string) => {
    if (!dateStr) return 'Hoje';
    if (dateStr === threeDaysList[0]) return 'Hoje';
    if (dateStr === threeDaysList[1]) return 'Amanhã';
    if (dateStr === threeDaysList[2]) return '+2 Dias';
    return dateStr;
  };

  // Real matches of TODAY strictly (00:00 - 24:00)
  const matchesToday = useMemo(() => {
    let list = jogos.filter(j => j.data === todayStr);
    if (list.length === 0) {
      // Fallback only if database has no records for exact current date
      const sortedDates = Array.from(new Set(jogos.map(j => j.data).filter(Boolean))).sort();
      const nextDate = sortedDates.find(d => d >= todayStr) || sortedDates[0];
      list = jogos.filter(j => j.data === nextDate);
    }
    return list;
  }, [jogos, todayStr]);

  // Real matches across 3 DAYS (Hoje, Amanhã, +2 Dias)
  const matches3Days = useMemo(() => {
    const maxDate = threeDaysList[2];
    let list = jogos.filter(j => j.data && j.data >= todayStr && j.data <= maxDate);
    if (list.length < 5) {
      const sortedDates = Array.from(new Set(jogos.map(j => j.data).filter(Boolean))).sort();
      const futureDates = sortedDates.filter(d => d >= todayStr).slice(0, 3);
      if (futureDates.length > 0) {
        list = jogos.filter(j => futureDates.includes(j.data));
      } else {
        list = jogos.slice(0, 30);
      }
    }
    return list;
  }, [jogos, todayStr, threeDaysList]);

  // Helper to extract candidate selections from a list of matches
  const extractCandidateSelections = (matchList: JogoDoDia[]) => {
    const pool1x2: TicketSelection[] = [];
    const poolGoals: TicketSelection[] = [];
    const poolCorners: TicketSelection[] = [];
    const poolScorers: TicketSelection[] = [];

    matchList.forEach((j, idx) => {
      const metrics = getCalibratedMatchMetrics(j);
      const matchName = `${j.clube_casa} vs ${j.clube_fora}`;
      const baseId = j.jogo_id || j.id || `game-${idx}`;
      const comp = j.campeonato || j.liga || 'Liga';
      const date = j.data || 'Hoje';
      const time = j.hora || '20:00';
      const dayLabel = getDayBadge(date);

      const prob1 = metrics.probCasa ?? 45;
      const probX = metrics.probEmpate ?? 28;
      const prob2 = metrics.probFora ?? 27;
      const over15 = metrics.over15Prob ?? 75;
      const over25 = metrics.over25Prob ?? 50;
      const under35 = metrics.under35Prob ?? 78;
      const btts = metrics.bttsYesProb ?? 50;

      // 1X2 selections
      if (prob1 >= 64) {
        pool1x2.push({
          id: `${baseId}-1`,
          gameId: baseId,
          match: matchName,
          homeTeam: j.clube_casa,
          awayTeam: j.clube_fora,
          competition: comp,
          date,
          time,
          dayLabel,
          market: '1X2 (Resultado Final)',
          selection: `Vitória ${j.clube_casa} (1)`,
          odd: Number((1 / (prob1 / 100) * 0.94).toFixed(2)),
          prob: prob1,
          marketType: '1x2'
        });
      } else if (prob2 >= 60) {
        pool1x2.push({
          id: `${baseId}-2`,
          gameId: baseId,
          match: matchName,
          homeTeam: j.clube_casa,
          awayTeam: j.clube_fora,
          competition: comp,
          date,
          time,
          dayLabel,
          market: '1X2 (Resultado Final)',
          selection: `Vitória ${j.clube_fora} (2)`,
          odd: Number((1 / (prob2 / 100) * 0.94).toFixed(2)),
          prob: prob2,
          marketType: '1x2'
        });
      }

      // Dupla Hipótese de Alta Segurança
      if (prob1 + probX >= 80) {
        pool1x2.push({
          id: `${baseId}-1x`,
          gameId: baseId,
          match: matchName,
          homeTeam: j.clube_casa,
          awayTeam: j.clube_fora,
          competition: comp,
          date,
          time,
          dayLabel,
          market: 'Dupla Hipótese',
          selection: `${j.clube_casa} ou Empate (1X)`,
          odd: Number((1 / ((prob1 + probX) / 100) * 0.94).toFixed(2)),
          prob: Math.min(94, prob1 + probX),
          marketType: 'double_chance'
        });
      }

      // Mercados de Golos
      if (over15 >= 75) {
        poolGoals.push({
          id: `${baseId}-ov15`,
          gameId: baseId,
          match: matchName,
          homeTeam: j.clube_casa,
          awayTeam: j.clube_fora,
          competition: comp,
          date,
          time,
          dayLabel,
          market: 'Total de Golos',
          selection: 'Mais de 1.5 Golos',
          odd: Number((1 / (over15 / 100) * 0.95).toFixed(2)),
          prob: over15,
          marketType: 'goals'
        });
      }
      if (under35 >= 78) {
        poolGoals.push({
          id: `${baseId}-un35`,
          gameId: baseId,
          match: matchName,
          homeTeam: j.clube_casa,
          awayTeam: j.clube_fora,
          competition: comp,
          date,
          time,
          dayLabel,
          market: 'Total de Golos',
          selection: 'Menos de 3.5 Golos',
          odd: Number((1 / (under35 / 100) * 0.95).toFixed(2)),
          prob: under35,
          marketType: 'goals'
        });
      }
      if (over25 >= 66) {
        poolGoals.push({
          id: `${baseId}-ov25`,
          gameId: baseId,
          match: matchName,
          homeTeam: j.clube_casa,
          awayTeam: j.clube_fora,
          competition: comp,
          date,
          time,
          dayLabel,
          market: 'Total de Golos',
          selection: 'Mais de 2.5 Golos',
          odd: Number((1 / (over25 / 100) * 0.94).toFixed(2)),
          prob: over25,
          marketType: 'goals'
        });
      }
      if (btts >= 64) {
        poolGoals.push({
          id: `${baseId}-btts`,
          gameId: baseId,
          match: matchName,
          homeTeam: j.clube_casa,
          awayTeam: j.clube_fora,
          competition: comp,
          date,
          time,
          dayLabel,
          market: 'Ambas Marcam (BTTS)',
          selection: 'Ambas as Equipas Marcam (Sim)',
          odd: Number((1 / (btts / 100) * 0.94).toFixed(2)),
          prob: btts,
          marketType: 'goals'
        });
      }

      // Cantos
      const cornersFloat = parseFloat(metrics.cantosVal || '9.0');
      if (cornersFloat >= 9.2) {
        poolCorners.push({
          id: `${baseId}-corners85`,
          gameId: baseId,
          match: matchName,
          homeTeam: j.clube_casa,
          awayTeam: j.clube_fora,
          competition: comp,
          date,
          time,
          dayLabel,
          market: 'Cantos do Jogo',
          selection: 'Mais de 8.5 Cantos',
          odd: 1.55,
          prob: 79,
          marketType: 'corners'
        });
      } else {
        poolCorners.push({
          id: `${baseId}-corners75`,
          gameId: baseId,
          match: matchName,
          homeTeam: j.clube_casa,
          awayTeam: j.clube_fora,
          competition: comp,
          date,
          time,
          dayLabel,
          market: 'Cantos do Jogo',
          selection: 'Mais de 7.5 Cantos',
          odd: 1.38,
          prob: 84,
          marketType: 'corners'
        });
      }

      // Marcadores de topo se clube jogar
      const homeScorer = findStarScorer(j.clube_casa);
      const awayScorer = findStarScorer(j.clube_fora);
      if (homeScorer) {
        poolScorers.push({
          id: `${baseId}-scorer-h`,
          gameId: baseId,
          match: matchName,
          homeTeam: j.clube_casa,
          awayTeam: j.clube_fora,
          competition: comp,
          date,
          time,
          dayLabel,
          market: 'Marcador no Jogo',
          selection: `${homeScorer.player} Marca a Qualquer Momento`,
          odd: homeScorer.odd,
          prob: homeScorer.prob,
          marketType: 'scorer',
          playerScorer: homeScorer.player
        });
      }
      if (awayScorer) {
        poolScorers.push({
          id: `${baseId}-scorer-a`,
          gameId: baseId,
          match: matchName,
          homeTeam: j.clube_casa,
          awayTeam: j.clube_fora,
          competition: comp,
          date,
          time,
          dayLabel,
          market: 'Marcador no Jogo',
          selection: `${awayScorer.player} Marca a Qualquer Momento`,
          odd: awayScorer.odd,
          prob: awayScorer.prob,
          marketType: 'scorer',
          playerScorer: awayScorer.player
        });
      }
    });

    return { pool1x2, poolGoals, poolCorners, poolScorers };
  };

  // Helper: Pick top N without duplicate matches
  const pickUniqueGames = (candidates: TicketSelection[], maxCount = 5): TicketSelection[] => {
    const sorted = [...candidates].sort((a, b) => b.prob - a.prob);
    const chosen: TicketSelection[] = [];
    const usedGames = new Set<string>();

    for (const item of sorted) {
      const matchKey = item.gameId || item.match;
      if (!usedGames.has(matchKey)) {
        usedGames.add(matchKey);
        chosen.push(item);
        if (chosen.length >= maxCount) break;
      }
    }
    return chosen;
  };

  // -------------------------------------------------------------
  // QUADRO 1: TICKETS AUTOMÁTICOS DO PRÓPRIO DIA (00:00 - 24:00)
  // Máximo 5 jogos por ticket • Jogos Reais do Dia
  // -------------------------------------------------------------
  const { ticket1Auto, ticket2Auto, ticket3Auto } = useMemo(() => {
    const { pool1x2, poolGoals, poolCorners, poolScorers } = extractCandidateSelections(matchesToday);

    // #1 ticket multipla: Top probabilidade do próprio dia (máx. 5 jogos)
    const allHighProbToday = [...pool1x2, ...poolGoals, ...poolCorners].sort((a, b) => b.prob - a.prob);
    const selections1 = pickUniqueGames(allHighProbToday, 5);

    // #2 ticket: Equilíbrio & Golos (+EV / Over / Under / 1X2) do próprio dia (máx. 5 jogos)
    const goalsAnd1x2Today = [...poolGoals, ...pool1x2].filter(s => s.prob >= 66);
    const t1GameKeys = new Set(selections1.map(s => s.gameId || s.match));
    let selections2 = pickUniqueGames(goalsAnd1x2Today.filter(s => !t1GameKeys.has(s.gameId || s.match)), 5);
    if (selections2.length < 4) {
      selections2 = pickUniqueGames(goalsAnd1x2Today, 5);
    }

    // #3 ticket: Misto (Cantos, Marcadores/Golos & 1X2) do próprio dia (máx. 5 jogos)
    const mixedPoolToday = [...poolScorers, ...poolCorners, ...poolGoals, ...pool1x2];
    const selections3: TicketSelection[] = [];
    const usedT3 = new Set<string>();

    if (poolScorers.length > 0) {
      selections3.push(poolScorers[0]);
      usedT3.add(poolScorers[0].gameId || poolScorers[0].match);
    }
    for (const c of poolCorners) {
      if (!usedT3.has(c.gameId || c.match)) {
        selections3.push(c);
        usedT3.add(c.gameId || c.match);
        break;
      }
    }
    for (const item of mixedPoolToday.sort((a, b) => b.prob - a.prob)) {
      if (!usedT3.has(item.gameId || item.match)) {
        usedT3.add(item.gameId || item.match);
        selections3.push(item);
        if (selections3.length >= 5) break;
      }
    }

    const buildAutoTicket = (
      id: string,
      title: string,
      subtitle: string,
      badge: string,
      selections: TicketSelection[],
      recStake: number
    ): BettingTicket => {
      const { totalOdd, jointProbability } = calculateTicketMetrics(selections);
      return {
        id,
        title,
        subtitle,
        badge,
        type: 'auto',
        selections,
        totalOdd,
        jointProbability,
        recommendedStake: recStake,
        updatedAt: 'Hoje (00:00 - 24:00)'
      };
    };

    return {
      ticket1Auto: buildAutoTicket(
        'ticket_1_multipla',
        '#1 ticket multipla',
        'Múltipla de Ouro do Dia • Jogos de Maior Probabilidade (00:00 às 24:00)',
        '🔥 TOP PROBABILIDADE',
        selections1,
        15
      ),
      ticket2Auto: buildAutoTicket(
        'ticket_2',
        '#2 ticket',
        'Ticket Equilíbrio & Golos • Margem Estatística e +EV do Dia',
        '⚡ EQUILÍBRIO & GOLOS',
        selections2,
        10
      ),
      ticket3Auto: buildAutoTicket(
        'ticket_3',
        '#3 ticket',
        'Ticket Misto • Mercados Combinados (Cantos, Marcadores & 1X2)',
        '🎯 MISTO & MARCADORES',
        selections3,
        10
      )
    };
  }, [matchesToday]);

  // -------------------------------------------------------------
  // #5 TICKET: PARA 3 DIAS (JANELA HOJE + 2 DIAS)
  // Jogos Reais dos Próximos 3 Dias • Máx 5 Jogos
  // -------------------------------------------------------------
  const ticket5ThreeDays = useMemo(() => {
    const { pool1x2, poolGoals, poolCorners, poolScorers } = extractCandidateSelections(matches3Days);
    const combined3DaysPool = [...pool1x2, ...poolGoals, ...poolCorners, ...poolScorers].sort((a, b) => b.prob - a.prob);

    // Pick top 5 matches spanning across the 3 days
    const selections5 = pickUniqueGames(combined3DaysPool, 5);
    const { totalOdd, jointProbability } = calculateTicketMetrics(selections5);

    return {
      id: 'ticket_5_tres_dias',
      title: '#5 ticket (3 Dias)',
      subtitle: 'Múltipla de 3 Dias • Melhores Jogos Reais no Horizonte de 72 Horas',
      badge: '🗓️ ACUMULADA 3 DIAS',
      type: 'auto' as const,
      selections: selections5,
      totalOdd,
      jointProbability,
      recommendedStake: 10,
      updatedAt: 'Janela de 3 Dias Ativa'
    };
  }, [matches3Days]);

  // -------------------------------------------------------------
  // #4 TICKET: MANUAL / QUADRO (SEM JOGOS INICIAIS)
  // Fica tipo um quadro vazio com botão [+] e poder apagar [-/lixeira]
  // Continua com a informação da probabilidade de sucesso e odd
  // -------------------------------------------------------------
  const [ticket4Selections, setTicket4Selections] = useState<TicketSelection[]>(() => {
    const saved = localStorage.getItem('irunbets_ticket_4_manual_selections');
    if (saved) {
      try {
        return JSON.parse(saved);
      } catch (e) {}
    }
    // Começa SEM JOGOS por pedido expresso do utilizador
    return [];
  });

  const [ticket4Stake, setTicket4Stake] = useState<number>(10);

  // Sync ticket 4 in localStorage
  useEffect(() => {
    localStorage.setItem('irunbets_ticket_4_manual_selections', JSON.stringify(ticket4Selections));
  }, [ticket4Selections]);

  const ticket4Metrics = useMemo(() => {
    return calculateTicketMetrics(ticket4Selections);
  }, [ticket4Selections]);

  const handleRemoveSelection4 = (id: string) => {
    setTicket4Selections(prev => prev.filter(s => s.id !== id));
    showToast('Seleção removida do #4 ticket');
  };

  const handleClearTicket4 = () => {
    if (ticket4Selections.length === 0) return;
    if (window.confirm('Tens a certeza que desejas apagar todas as seleções do #4 ticket?')) {
      setTicket4Selections([]);
      showToast('Quadro #4 limpo');
    }
  };

  // -------------------------------------------------------------
  // #6 TICKET: PARA QUALQUER UTILIZADOR REGISTADO (TAMBÉM VAZIO)
  // Com botão [+] e poder apagar [-] • Calculadora & Análise IA
  // -------------------------------------------------------------
  const [ticket6Selections, setTicket6Selections] = useState<TicketSelection[]>(() => {
    const saved = localStorage.getItem('irunbets_ticket_6_user_selections');
    if (saved) {
      try {
        return JSON.parse(saved);
      } catch (e) {}
    }
    // Começa SEM JOGOS por pedido expresso do utilizador
    return [];
  });

  const [ticket6Stake, setTicket6Stake] = useState<number>(10);

  // Sync ticket 6 in localStorage
  useEffect(() => {
    localStorage.setItem('irunbets_ticket_6_user_selections', JSON.stringify(ticket6Selections));
  }, [ticket6Selections]);

  const ticket6Metrics = useMemo(() => {
    return calculateTicketMetrics(ticket6Selections);
  }, [ticket6Selections]);

  const ticket6PotentialReturn = useMemo(() => {
    return Number((ticket6Stake * ticket6Metrics.totalOdd).toFixed(2));
  }, [ticket6Stake, ticket6Metrics.totalOdd]);

  const ticket6PotentialProfit = useMemo(() => {
    return Number(Math.max(0, ticket6PotentialReturn - ticket6Stake).toFixed(2));
  }, [ticket6PotentialReturn, ticket6Stake]);

  const handleRemoveSelection6 = (id: string) => {
    setTicket6Selections(prev => prev.filter(s => s.id !== id));
    setAiAnalysisResult(null);
    showToast('Seleção removida do #6 ticket');
  };

  const handleClearTicket6 = () => {
    if (ticket6Selections.length === 0) return;
    if (window.confirm('Tens a certeza que desejas apagar todas as seleções do #6 ticket?')) {
      setTicket6Selections([]);
      setAiAnalysisResult(null);
      showToast('Boletim #6 limpo');
    }
  };

  // AI Diagnostic state for Ticket 6
  const [aiAnalysisResult, setAiAnalysisResult] = useState<{
    confidenceIndex: number;
    riskCategory: string;
    probabilityPercentage: number;
    totalOdd: string;
    potentialReturn: string;
    potentialProfit: string;
    summary: string;
    strongestPick: string;
    riskiestPick: string;
    optimizationAdvice: string;
    expectedValueComment: string;
  } | null>(null);
  const [isAiAnalyzing, setIsAiAnalyzing] = useState(false);

  const handleRunAiAnalysis6 = async () => {
    if (ticket6Selections.length === 0) {
      alert('Adicione pelo menos 1 jogo ao #6 ticket para gerar o diagnóstico da IA.');
      return;
    }

    setIsAiAnalyzing(true);
    try {
      const res = await fetch('/api/gemini/ticket-analysis', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          selections: ticket6Selections,
          stake: ticket6Stake,
          totalOdd: ticket6Metrics.totalOdd,
          jointProb: ticket6Metrics.jointProbability
        })
      });

      if (res.ok) {
        const json = await res.json();
        if (json.status === 'success' && json.data) {
          setAiAnalysisResult(json.data);
          showToast('🤖 Diagnóstico da IA gerado com sucesso!');
          return;
        }
      }
      generateFallbackAnalysis6();
    } catch (err) {
      console.warn('Erro ao ligar ao serviço de IA:', err);
      generateFallbackAnalysis6();
    } finally {
      setIsAiAnalyzing(false);
    }
  };

  const generateFallbackAnalysis6 = () => {
    const count = ticket6Selections.length;
    let risk = 'Moderado';
    if (ticket6Metrics.totalOdd < 2.5 && count <= 3) risk = 'Conservador';
    else if (ticket6Metrics.totalOdd > 10 || count > 5) risk = 'Alto Risco';

    setAiAnalysisResult({
      confidenceIndex: Math.min(94, Math.max(25, ticket6Metrics.jointProbability)),
      riskCategory: risk,
      probabilityPercentage: ticket6Metrics.jointProbability,
      totalOdd: ticket6Metrics.totalOdd.toFixed(2),
      potentialReturn: ticket6PotentialReturn.toFixed(2),
      potentialProfit: ticket6PotentialProfit.toFixed(2),
      summary: `Bilhete com ${count} jogo(s) com odd combinada @${ticket6Metrics.totalOdd.toFixed(2)}. Probabilidade calculada em ${ticket6Metrics.jointProbability}%, enquadrada no perfil de risco ${risk}.`,
      strongestPick: ticket6Selections[0] ? `${ticket6Selections[0].match}: ${ticket6Selections[0].selection} (@${ticket6Selections[0].odd})` : 'Seleção 1',
      riskiestPick: ticket6Selections[ticket6Selections.length - 1] ? `${ticket6Selections[ticket6Selections.length - 1].match}: ${ticket6Selections[ticket6Selections.length - 1].selection}` : 'Seleção Final',
      optimizationAdvice: count > 4 
        ? 'Para evitar a volatilidade natural de acumuladas longas, considera reduzir para 3 ou 4 jogos focando nas maiores probabilidades.' 
        : 'Estrutura bem distribuída. Mantém a stake ajustada à gestão de banca.',
      expectedValueComment: ticket6Metrics.jointProbability >= 50 
        ? `+EV Favorável: A probabilidade de acerto supera as probabilidades implícitas de mercado.` 
        : `Margem moderada: Mantém atenção na gestão da stake.`
    });
    showToast('🤖 Diagnóstico probabilístico processado!');
  };

  // -------------------------------------------------------------
  // MODAL DE ADICIONAR JOGOS (DESTINADO AO #4 OU AO #6)
  // -------------------------------------------------------------
  const [activeAddModal, setActiveAddModal] = useState<'ticket4' | 'ticket6' | null>(null);
  const [modalSearchTerm, setModalSearchTerm] = useState('');
  const [modalDateFilter, setModalDateFilter] = useState<'hoje' | '3dias' | 'todos'>('hoje');

  // Custom match input in modal
  const [customMatchName, setCustomMatchName] = useState('');
  const [customMarketName, setCustomMarketName] = useState('1X2');
  const [customSelectionName, setCustomSelectionName] = useState('');
  const [customOddVal, setCustomOddVal] = useState('1.50');
  const [customProbVal, setCustomProbVal] = useState('75');

  const modalSourceGames = useMemo(() => {
    let baseList = jogos;
    if (modalDateFilter === 'hoje') {
      baseList = matchesToday;
    } else if (modalDateFilter === '3dias') {
      baseList = matches3Days;
    }

    if (!modalSearchTerm.trim()) {
      return baseList.slice(0, 30);
    }
    const t = modalSearchTerm.toLowerCase();
    return baseList.filter(j => 
      (j.clube_casa || '').toLowerCase().includes(t) ||
      (j.clube_fora || '').toLowerCase().includes(t) ||
      (j.campeonato || j.liga || '').toLowerCase().includes(t)
    );
  }, [jogos, matchesToday, matches3Days, modalDateFilter, modalSearchTerm]);

  const handleAddGameToTargetTicket = (
    jogo: JogoDoDia,
    chosenMarket: string,
    chosenSelection: string,
    odd: number,
    prob: number
  ) => {
    const newSel: TicketSelection = {
      id: `sel-${Date.now()}-${Math.random().toString(36).substr(2, 4)}`,
      gameId: jogo.jogo_id || jogo.id,
      match: `${jogo.clube_casa} vs ${jogo.clube_fora}`,
      homeTeam: jogo.clube_casa,
      awayTeam: jogo.clube_fora,
      competition: jogo.campeonato || jogo.liga || 'Liga',
      date: jogo.data || 'Hoje',
      time: jogo.hora || '20:00',
      dayLabel: getDayBadge(jogo.data),
      market: chosenMarket,
      selection: chosenSelection,
      odd: Number(odd.toFixed(2)),
      prob: Math.round(prob),
      marketType: 'custom',
      status: 'pending'
    };

    if (activeAddModal === 'ticket4') {
      setTicket4Selections(prev => [...prev, newSel]);
      showToast(`✓ Adicionado ao #4 Ticket: ${newSel.match}`);
    } else if (activeAddModal === 'ticket6') {
      setTicket6Selections(prev => [...prev, newSel]);
      setAiAnalysisResult(null);
      showToast(`✓ Adicionado ao #6 Ticket: ${newSel.match}`);
    }
    setActiveAddModal(null);
  };

  const handleAddCustomToTargetTicket = () => {
    if (!customMatchName.trim() || !customSelectionName.trim()) {
      alert('Por favor introduz o confronto (ex: Sporting vs Braga) e a seleção pretendida.');
      return;
    }

    const newSel: TicketSelection = {
      id: `custom-${Date.now()}`,
      match: customMatchName.trim(),
      homeTeam: customMatchName.split('vs')[0]?.trim() || customMatchName,
      awayTeam: customMatchName.split('vs')[1]?.trim() || '',
      competition: 'Seleção Personalizada',
      date: 'Hoje',
      time: '19:00',
      dayLabel: 'Hoje',
      market: customMarketName,
      selection: customSelectionName.trim(),
      odd: parseFloat(customOddVal) || 1.50,
      prob: parseInt(customProbVal, 10) || 75,
      marketType: 'custom',
      status: 'pending'
    };

    if (activeAddModal === 'ticket4') {
      setTicket4Selections(prev => [...prev, newSel]);
      showToast(`✓ Adicionado ao #4 Ticket: ${newSel.match}`);
    } else if (activeAddModal === 'ticket6') {
      setTicket6Selections(prev => [...prev, newSel]);
      setAiAnalysisResult(null);
      showToast(`✓ Adicionado ao #6 Ticket: ${newSel.match}`);
    }

    setCustomMatchName('');
    setCustomSelectionName('');
    setActiveAddModal(null);
  };

  // Quick Action: Load any ticket into Ticket 6
  const handleLoadTicketInto6 = (ticket: { title: string; selections: TicketSelection[]; recommendedStake?: number }) => {
    if (!isUserRegistered) {
      onOpenAuth();
      return;
    }
    setTicket6Selections([...ticket.selections]);
    if (ticket.recommendedStake) {
      setTicket6Stake(ticket.recommendedStake);
    }
    setAiAnalysisResult(null);
    showToast(`✓ ${ticket.title} carregado no #6 Ticket!`);
    const el = document.getElementById('quadro-3-ticket-6');
    if (el) {
      el.scrollIntoView({ behavior: 'smooth' });
    }
  };

  // Copy Ticket Formatted Text
  const handleCopyFormattedTicket = (title: string, subtitle: string, odd: number, prob: number, selections: TicketSelection[]) => {
    if (selections.length === 0) {
      showToast('O bilhete está vazio');
      return;
    }
    const lines = [
      `🎯 iRunBets • ${title.toUpperCase()}`,
      `📌 ${subtitle}`,
      `Odd Total: @${odd.toFixed(2)} | Probabilidade Estimada: ${prob}%`,
      `---------------------------------`
    ];

    selections.forEach((s, idx) => {
      lines.push(`${idx + 1}. [${s.dayLabel || 'Hoje'}] ${s.match}`);
      lines.push(`   Mercado: ${s.market} ➔ ${s.selection} (@${s.odd.toFixed(2)})`);
    });

    lines.push(`---------------------------------`);
    lines.push(`Gerado em irunbets.pt/apostas-do-dia`);

    navigator.clipboard.writeText(lines.join('\n')).then(() => {
      showToast('📋 Bilhete copiado para a área de transferência!');
    }).catch(() => {
      showToast('Erro ao copiar');
    });
  };

  return (
    <div className="w-full space-y-10 animate-fade-in text-zinc-100 font-sans pb-20">
      
      {/* Toast Notification */}
      {toastMessage && (
        <div className="fixed bottom-6 right-6 z-50 bg-gradient-to-r from-orange-600 to-amber-600 text-white px-5 py-3 rounded-2xl shadow-2xl font-mono text-xs font-bold flex items-center gap-2.5 animate-bounce border border-orange-400/40">
          <span>🔔</span>
          <span>{toastMessage}</span>
        </div>
      )}

      {/* SUBPAGE HEADER */}
      <div className="relative rounded-3xl p-6 sm:p-8 bg-gradient-to-br from-[#121218] via-[#171722] to-[#0e0e14] border border-zinc-800 shadow-2xl overflow-hidden">
        <div className="absolute top-0 right-0 w-96 h-96 bg-gradient-to-bl from-orange-500/10 via-amber-500/5 to-transparent rounded-full blur-3xl pointer-events-none" />
        <div className="absolute top-0 left-0 w-72 h-72 bg-gradient-to-br from-cyan-500/10 via-blue-500/5 to-transparent rounded-full blur-2xl pointer-events-none" />

        <div className="relative z-10 space-y-4">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-orange-500/10 border border-orange-500/30 text-orange-400 text-xs font-mono font-bold tracking-wider uppercase">
              <span className="w-2 h-2 rounded-full bg-orange-400 animate-pulse" />
              <span>Subpágina Oficial • Apostas do Dia</span>
            </div>

            <div className="flex items-center gap-3 text-xs font-mono text-zinc-400">
              <span className="flex items-center gap-1.5">
                <span className="w-2 h-2 rounded-full bg-emerald-400" />
                <span>Jogos Reais: <strong>{jogos.length}</strong></span>
              </span>
              <span className="text-zinc-600">•</span>
              <span>Hoje: <strong>{matchesToday.length}</strong></span>
              <span className="text-zinc-600">•</span>
              <span>3 Dias: <strong>{matches3Days.length}</strong></span>
            </div>
          </div>

          <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-6">
            <div className="space-y-2">
              <h1 className="text-2xl sm:text-3xl lg:text-4xl font-black tracking-tight text-white flex items-center gap-3">
                <span>🎯 Apostas do Dia & Bilhetes de Alta Probabilidade</span>
              </h1>
              <p className="text-zinc-400 text-xs sm:text-sm max-w-3xl leading-relaxed">
                Três quadros dinâmicos com jogos reais calibrados: os bilhetes automáticos do próprio dia (00:00 - 24:00 • #1, #2 e #3), os tickets de curadoria (#4 Quadro Manual e #5 para 3 dias) e o #6 Ticket para utilizador registado com simulador e inteligência artificial.
              </p>
            </div>

            {/* Quick anchors */}
            <div className="flex flex-wrap items-center gap-2">
              <a
                href="#quadro-1-dia"
                className="px-3 py-2 rounded-xl bg-zinc-900 hover:bg-zinc-800 border border-zinc-750 text-xs font-mono font-bold text-zinc-300 transition-all flex items-center gap-1.5"
              >
                <span>🏆 #1, #2, #3 (Hoje 24h)</span>
              </a>
              <a
                href="#quadro-2-especiais"
                className="px-3 py-2 rounded-xl bg-zinc-900 hover:bg-zinc-800 border border-zinc-750 text-xs font-mono font-bold text-amber-300 transition-all flex items-center gap-1.5"
              >
                <span>✍️ #4 Manual & #5 (3 Dias)</span>
              </a>
              <a
                href="#quadro-3-ticket-6"
                className="px-3 py-2 rounded-xl bg-gradient-to-r from-orange-500 to-amber-500 hover:from-orange-400 hover:to-amber-400 text-black text-xs font-mono font-black transition-all flex items-center gap-1.5 shadow-lg shadow-orange-500/20"
              >
                <span>🧪 #6 Ticket Utilizador</span>
              </a>
            </div>
          </div>
        </div>
      </div>

      {/* ========================================================================= */}
      {/* QUADRO 1: OS TICKETS DO PRÓPRIO DIA 00:00 - 24:00 (#1, #2, #3)          */}
      {/* Máx 5 jogos por ticket • Apenas jogos reais de hoje (00:00 às 24:00)      */}
      {/* ========================================================================= */}
      <div id="quadro-1-dia" className="space-y-6">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-zinc-800 pb-4">
          <div className="space-y-1">
            <div className="flex items-center gap-2">
              <span className="text-xl">🏆</span>
              <h2 className="text-lg sm:text-xl font-black text-white uppercase tracking-wider font-display">
                Quadro 1: Tickets Automáticos do Próprio Dia (00:00 às 24:00)
              </h2>
            </div>
            <p className="text-xs text-zinc-400 font-sans">
              Contêm <strong>apenas jogos reais do próprio dia</strong> (00:00 - 24:00), com um <strong>máximo de 5 jogos</strong> por ticket selecionados pelo maior índice de probabilidade de sucesso.
            </p>
          </div>

          <span className="text-[11px] font-mono px-3 py-1 rounded-full bg-emerald-950/60 border border-emerald-500/30 text-emerald-400 self-start sm:self-auto font-bold">
            ✓ Jogos Reais de Hoje ({todayStr})
          </span>
        </div>

        {/* The 3 Automatic Ticket Cards Grid */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {[ticket1Auto, ticket2Auto, ticket3Auto].map((ticket, tIdx) => {
            const isGold = tIdx === 0;
            const isSilver = tIdx === 1;
            const borderGlow = isGold 
              ? 'border-amber-500/40 hover:border-amber-500/80 shadow-amber-500/5' 
              : isSilver 
              ? 'border-cyan-500/40 hover:border-cyan-500/80 shadow-cyan-500/5' 
              : 'border-orange-500/40 hover:border-orange-500/80 shadow-orange-500/5';
            
            const badgeBg = isGold
              ? 'bg-amber-500/15 border-amber-500/40 text-amber-300'
              : isSilver
              ? 'bg-cyan-500/15 border-cyan-500/40 text-cyan-300'
              : 'bg-orange-500/15 border-orange-500/40 text-orange-300';

            return (
              <div
                key={ticket.id}
                className={`bg-[#101015] border rounded-3xl p-5 sm:p-6 shadow-xl flex flex-col justify-between transition-all duration-300 ${borderGlow} relative overflow-hidden`}
              >
                <div className="space-y-4">
                  <div className="flex items-center justify-between gap-2">
                    <span className={`px-2.5 py-1 rounded-full text-[10px] font-mono font-black uppercase tracking-wider border ${badgeBg}`}>
                      {ticket.badge}
                    </span>
                    <span className="text-[11px] font-mono text-zinc-400">
                      {ticket.selections.length} / 5 Jogos
                    </span>
                  </div>

                  <div>
                    <h3 className="text-lg font-black text-white tracking-tight flex items-center gap-2">
                      <span>{ticket.title}</span>
                    </h3>
                    <p className="text-[11px] text-zinc-400 mt-1 line-clamp-2">
                      {ticket.subtitle}
                    </p>
                  </div>

                  {/* Summary Bar */}
                  <div className="grid grid-cols-2 gap-2 p-3 rounded-2xl bg-zinc-950/80 border border-zinc-850 text-center font-mono">
                    <div>
                      <span className="text-[10px] text-zinc-400 block uppercase">Odd Total</span>
                      <strong className="text-base sm:text-lg font-black text-amber-400">
                        @{ticket.totalOdd.toFixed(2)}
                      </strong>
                    </div>
                    <div>
                      <span className="text-[10px] text-zinc-400 block uppercase">Probabilidade</span>
                      <strong className="text-base sm:text-lg font-black text-emerald-400">
                        {ticket.jointProbability}%
                      </strong>
                    </div>
                  </div>

                  {/* Selection List */}
                  <div className="space-y-2.5 pt-2">
                    <span className="text-[10px] font-mono uppercase font-bold text-zinc-400 tracking-wider block">
                      Seleções Reais do Dia (00:00 - 24:00):
                    </span>
                    {ticket.selections.length === 0 ? (
                      <p className="text-xs text-zinc-500 italic p-3 text-center">Nenhum jogo disponível de momento.</p>
                    ) : (
                      ticket.selections.map((sel, idx) => (
                        <div
                          key={sel.id}
                          className="p-2.5 rounded-xl bg-zinc-900/60 border border-zinc-800/80 hover:border-zinc-700 transition-all text-xs space-y-1"
                        >
                          <div className="flex items-center justify-between text-[11px] text-zinc-400">
                            <span className="truncate max-w-[180px] font-bold text-zinc-300">
                              {idx + 1}. {sel.match}
                            </span>
                            <span className="font-mono text-[10px] text-zinc-400">{sel.time}</span>
                          </div>

                          <div className="flex items-center justify-between font-mono pt-0.5">
                            <span className="font-bold text-orange-400 text-[11px]">
                              {sel.selection}
                            </span>
                            <div className="flex items-center gap-1.5">
                              <span className="px-1.5 py-0.5 rounded bg-zinc-800 text-[10px] text-zinc-300 font-bold">
                                @{sel.odd.toFixed(2)}
                              </span>
                              <span className="px-1.5 py-0.5 rounded bg-emerald-950/60 text-emerald-400 text-[10px] font-bold border border-emerald-500/20">
                                {sel.prob}%
                              </span>
                            </div>
                          </div>

                          <div className="text-[10px] text-zinc-400 font-sans flex items-center justify-between pt-0.5">
                            <span>{sel.market}</span>
                            <span className="text-[9px] text-zinc-400">{sel.competition}</span>
                          </div>
                        </div>
                      ))
                    )}
                  </div>
                </div>

                {/* Footer Actions */}
                <div className="mt-6 pt-4 border-t border-zinc-850 space-y-2">
                  <div className="flex items-center justify-between text-xs font-mono text-zinc-400 mb-2">
                    <span>Retorno para {ticket.recommendedStake}€:</span>
                    <strong className="text-white font-bold">
                      {(ticket.recommendedStake * ticket.totalOdd).toFixed(2)} €
                    </strong>
                  </div>

                  <div className="grid grid-cols-2 gap-2">
                    <button
                      type="button"
                      onClick={() => handleCopyFormattedTicket(ticket.title, ticket.subtitle, ticket.totalOdd, ticket.jointProbability, ticket.selections)}
                      className="px-3 py-2 rounded-xl bg-zinc-900 hover:bg-zinc-800 border border-zinc-750 text-[11px] font-mono font-bold text-zinc-200 transition-all flex items-center justify-center gap-1.5 cursor-pointer shadow"
                    >
                      <span>📋 Copiar</span>
                    </button>

                    <button
                      type="button"
                      onClick={() => handleLoadTicketInto6(ticket)}
                      className="px-3 py-2 rounded-xl bg-gradient-to-r from-orange-500 to-amber-500 hover:from-orange-400 hover:to-amber-400 text-black text-[11px] font-mono font-black transition-all flex items-center justify-center gap-1.5 cursor-pointer shadow-md"
                      title="Carregar seleções no #6 Ticket para simular"
                    >
                      <span>⚡ Simular no #6</span>
                    </button>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* ========================================================================= */}
      {/* QUADRO 2: #4 TICKET MANUAL (QUADRO VAZIO) & #5 TICKET (PARA 3 DIAS)      */}
      {/* #4: Sem jogos... fica tipo um quadro com botão [+] e apagar [-]           */}
      {/* #5: Múltipla para 3 dias de jogos reais                                   */}
      {/* ========================================================================= */}
      <div id="quadro-2-especiais" className="space-y-8 pt-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-zinc-800 pb-4">
          <div className="space-y-1">
            <div className="flex items-center gap-2">
              <span className="text-xl">✍️</span>
              <h2 className="text-lg sm:text-xl font-black text-white uppercase tracking-wider font-display">
                Quadro 2: #4 Ticket Manual (Quadro) & #5 Ticket (3 Dias)
              </h2>
            </div>
            <p className="text-xs text-zinc-400 font-sans">
              O <strong>#4 ticket</strong> fica em formato de quadro sem jogos iniciais, com botão <strong>[+]</strong> para adicionar e poder apagar qualquer jogo. O <strong>#5 ticket</strong> agrega os melhores jogos reais no horizonte de <strong>3 dias</strong>.
            </p>
          </div>

          <span className="text-[11px] font-mono px-3 py-1 rounded-full bg-zinc-900 border border-zinc-800 text-amber-400 self-start sm:self-auto font-bold">
            Curadoria & Horizonte 3 Dias
          </span>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
          
          {/* ---------------------------------------------------- */}
          {/* #4 TICKET: MANUAL / QUADRO (SEM JOGOS INICIAIS)     */}
          {/* ---------------------------------------------------- */}
          <div className="bg-[#101017] border border-amber-500/40 rounded-3xl p-6 sm:p-7 shadow-2xl flex flex-col justify-between relative overflow-hidden">
            <div className="absolute top-0 right-0 w-80 h-80 bg-amber-500/5 rounded-full blur-3xl pointer-events-none" />

            <div className="space-y-5">
              {/* Header #4 Ticket */}
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-zinc-850 pb-4">
                <div className="space-y-1">
                  <div className="flex items-center gap-2">
                    <span className="px-3 py-1 rounded-full text-xs font-mono font-black uppercase tracking-wider bg-amber-500/20 text-amber-300 border border-amber-500/40">
                      👑 #4 TICKET MANUAL
                    </span>
                    <span className="text-xs font-mono text-zinc-400">
                      {ticket4Selections.length} Jogos (Sem Limite)
                    </span>
                  </div>
                  <h3 className="text-xl font-black text-white tracking-tight">
                    #4 ticket • Quadro Manual de Curadoria
                  </h3>
                  <p className="text-xs text-zinc-400">
                    Sem limite de jogos: adiciona as tuas próprias seleções com o botão <strong>[+]</strong> e remove com <strong>[Apagar]</strong>.
                  </p>
                </div>

                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => setActiveAddModal('ticket4')}
                    className="px-3.5 py-2 rounded-xl bg-amber-500 hover:bg-amber-400 text-black text-xs font-mono font-black transition-all flex items-center gap-1.5 cursor-pointer shadow-lg shadow-amber-500/20"
                  >
                    <span>➕</span>
                    <span>Adicionar Jogo</span>
                  </button>

                  {ticket4Selections.length > 0 && (
                    <button
                      type="button"
                      onClick={handleClearTicket4}
                      className="px-2.5 py-2 rounded-xl bg-zinc-900 hover:bg-zinc-800 text-zinc-400 hover:text-red-400 border border-zinc-750 text-xs font-mono transition-all"
                      title="Apagar todas as seleções"
                    >
                      🗑️
                    </button>
                  )}
                </div>
              </div>

              {/* Metrics Bar #4: Odd & Probabilidade de Sucesso em Tempo Real */}
              <div className="grid grid-cols-3 gap-2 p-3 rounded-2xl bg-zinc-950/80 border border-zinc-850 text-center font-mono">
                <div>
                  <span className="text-[10px] text-zinc-400 uppercase block">Odd Acumulada</span>
                  <strong className="text-base sm:text-lg font-black text-amber-400">
                    @{ticket4Metrics.totalOdd.toFixed(2)}
                  </strong>
                </div>
                <div>
                  <span className="text-[10px] text-zinc-400 uppercase block">Prob. de Sucesso</span>
                  <strong className="text-base sm:text-lg font-black text-emerald-400">
                    {ticket4Metrics.jointProbability}%
                  </strong>
                </div>
                <div>
                  <span className="text-[10px] text-zinc-400 uppercase block">Retorno (10€)</span>
                  <strong className="text-base sm:text-lg font-black text-white">
                    {(ticket4Stake * ticket4Metrics.totalOdd).toFixed(2)} €
                  </strong>
                </div>
              </div>

              {/* Selections List or Empty Canvas Frame */}
              {ticket4Selections.length === 0 ? (
                <div className="py-12 px-6 rounded-2xl border-2 border-dashed border-amber-500/30 text-center space-y-3 bg-zinc-950/40">
                  <span className="text-4xl block">📋</span>
                  <h4 className="text-sm font-bold text-amber-200">
                    Quadro #4 pronto para montagem (Sem jogos)
                  </h4>
                  <p className="text-xs text-zinc-400 max-w-sm mx-auto">
                    Clica no botão <strong>➕ Adicionar Jogo</strong> para preencher este quadro com os jogos e mercados que desejares. A odd acumulada e a probabilidade de sucesso serão calculadas automaticamente!
                  </p>
                  <button
                    type="button"
                    onClick={() => setActiveAddModal('ticket4')}
                    className="mt-2 px-4 py-2 rounded-xl bg-amber-500 hover:bg-amber-400 text-black text-xs font-mono font-black transition-all cursor-pointer shadow"
                  >
                    ➕ Adicionar Primeiro Jogo ao Quadro #4
                  </button>
                </div>
              ) : (
                <div className="space-y-2.5 max-h-[420px] overflow-y-auto pr-1">
                  {ticket4Selections.map((sel, idx) => (
                    <div
                      key={sel.id}
                      className="p-3 rounded-2xl bg-zinc-950/70 border border-zinc-850 hover:border-zinc-700 transition-all flex items-center justify-between gap-3 text-xs"
                    >
                      <div className="flex items-start gap-2.5 min-w-0">
                        <span className="w-5 h-5 rounded-full bg-amber-500/15 text-amber-400 border border-amber-500/30 flex items-center justify-center font-mono font-bold text-[10px] shrink-0 mt-0.5">
                          {idx + 1}
                        </span>
                        <div className="min-w-0">
                          <div className="flex items-center gap-2">
                            <strong className="text-white font-bold truncate">
                              {sel.match}
                            </strong>
                            <span className="text-[9px] font-mono text-zinc-400 px-1.5 py-0.5 rounded bg-zinc-900 border border-zinc-800 shrink-0">
                              {sel.dayLabel || 'Hoje'}
                            </span>
                          </div>
                          <div className="flex items-center gap-1.5 text-[11px] pt-0.5">
                            <span className="text-zinc-400">{sel.market}:</span>
                            <span className="text-orange-400 font-mono font-bold">{sel.selection}</span>
                          </div>
                        </div>
                      </div>

                      <div className="flex items-center gap-2 shrink-0 font-mono">
                        <span className="px-2 py-0.5 rounded bg-zinc-900 border border-zinc-800 text-amber-400 font-bold text-[11px]">
                          @{sel.odd.toFixed(2)}
                        </span>
                        <span className="px-2 py-0.5 rounded bg-emerald-950/50 border border-emerald-500/30 text-emerald-400 font-bold text-[11px]">
                          {sel.prob}%
                        </span>
                        <button
                          type="button"
                          onClick={() => handleRemoveSelection4(sel.id)}
                          className="px-2 py-1 rounded-lg bg-red-950/40 hover:bg-red-500/20 text-red-400 hover:text-red-300 border border-red-500/30 text-[10px] font-mono font-bold transition-all cursor-pointer"
                          title="Apagar jogo do quadro"
                        >
                          Apagar 🗑️
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Footer #4 */}
            <div className="mt-6 pt-4 border-t border-zinc-850 flex items-center justify-between gap-3">
              <button
                type="button"
                onClick={() => handleCopyFormattedTicket('#4 ticket', 'Quadro Manual', ticket4Metrics.totalOdd, ticket4Metrics.jointProbability, ticket4Selections)}
                className="px-3 py-2 rounded-xl bg-zinc-900 hover:bg-zinc-800 border border-zinc-750 text-xs font-mono font-bold text-zinc-300 transition-all flex items-center gap-1.5 cursor-pointer"
              >
                <span>📋 Copiar #4</span>
              </button>

              <button
                type="button"
                onClick={() => handleLoadTicketInto6({ title: '#4 Ticket Manual', selections: ticket4Selections, recommendedStake: ticket4Stake })}
                className="px-4 py-2 rounded-xl bg-gradient-to-r from-amber-500 to-orange-500 hover:from-amber-400 hover:to-orange-400 text-black text-xs font-mono font-black transition-all flex items-center gap-1.5 cursor-pointer shadow-md"
              >
                <span>⚡ Simular no #6</span>
                <span>→</span>
              </button>
            </div>
          </div>

          {/* ---------------------------------------------------- */}
          {/* #5 TICKET: PARA 3 DIAS (JOGOS REAIS DE 3 DIAS)       */}
          {/* ---------------------------------------------------- */}
          <div className="bg-[#101017] border border-cyan-500/40 rounded-3xl p-6 sm:p-7 shadow-2xl flex flex-col justify-between relative overflow-hidden">
            <div className="absolute top-0 right-0 w-80 h-80 bg-cyan-500/5 rounded-full blur-3xl pointer-events-none" />

            <div className="space-y-5">
              {/* Header #5 Ticket */}
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-zinc-850 pb-4">
                <div className="space-y-1">
                  <div className="flex items-center gap-2">
                    <span className="px-3 py-1 rounded-full text-xs font-mono font-black uppercase tracking-wider bg-cyan-500/20 text-cyan-300 border border-cyan-500/40">
                      {ticket5ThreeDays.badge}
                    </span>
                    <span className="text-xs font-mono text-zinc-400">
                      {ticket5ThreeDays.selections.length} / 5 Jogos Reais
                    </span>
                  </div>
                  <h3 className="text-xl font-black text-white tracking-tight">
                    {ticket5ThreeDays.title}
                  </h3>
                  <p className="text-xs text-zinc-400">
                    {ticket5ThreeDays.subtitle}
                  </p>
                </div>

                <span className="px-3 py-1 rounded-full bg-cyan-950/60 border border-cyan-500/30 text-cyan-300 text-[11px] font-mono font-bold self-start sm:self-auto">
                  Hoje • Amanhã • +2 Dias
                </span>
              </div>

              {/* Metrics Bar #5 */}
              <div className="grid grid-cols-3 gap-2 p-3 rounded-2xl bg-zinc-950/80 border border-zinc-850 text-center font-mono">
                <div>
                  <span className="text-[10px] text-zinc-400 uppercase block">Odd Acumulada</span>
                  <strong className="text-base sm:text-lg font-black text-amber-400">
                    @{ticket5ThreeDays.totalOdd.toFixed(2)}
                  </strong>
                </div>
                <div>
                  <span className="text-[10px] text-zinc-400 uppercase block">Prob. de Sucesso</span>
                  <strong className="text-base sm:text-lg font-black text-emerald-400">
                    {ticket5ThreeDays.jointProbability}%
                  </strong>
                </div>
                <div>
                  <span className="text-[10px] text-zinc-400 uppercase block">Retorno (10€)</span>
                  <strong className="text-base sm:text-lg font-black text-white">
                    {(ticket5ThreeDays.recommendedStake * ticket5ThreeDays.totalOdd).toFixed(2)} €
                  </strong>
                </div>
              </div>

              {/* Selections List 3 Days */}
              <div className="space-y-2.5 max-h-[420px] overflow-y-auto pr-1">
                {ticket5ThreeDays.selections.map((sel, idx) => (
                  <div
                    key={sel.id}
                    className="p-3 rounded-2xl bg-zinc-950/70 border border-zinc-850 hover:border-cyan-500/30 transition-all flex items-center justify-between gap-3 text-xs"
                  >
                    <div className="flex items-start gap-2.5 min-w-0">
                      <span className="w-5 h-5 rounded-full bg-cyan-500/15 text-cyan-400 border border-cyan-500/30 flex items-center justify-center font-mono font-bold text-[10px] shrink-0 mt-0.5">
                        {idx + 1}
                      </span>
                      <div className="min-w-0">
                        <div className="flex items-center gap-2">
                          <strong className="text-white font-bold truncate">
                            {sel.match}
                          </strong>
                          <span className="text-[9px] font-mono text-cyan-300 px-2 py-0.5 rounded-full bg-cyan-950/80 border border-cyan-500/30 shrink-0 font-bold">
                            {sel.dayLabel || 'Hoje'} ({sel.time})
                          </span>
                        </div>
                        <div className="flex items-center gap-1.5 text-[11px] pt-0.5">
                          <span className="text-zinc-400">{sel.market}:</span>
                          <span className="text-orange-400 font-mono font-bold">{sel.selection}</span>
                        </div>
                      </div>
                    </div>

                    <div className="flex items-center gap-2 shrink-0 font-mono">
                      <span className="px-2 py-0.5 rounded bg-zinc-900 border border-zinc-800 text-amber-400 font-bold text-[11px]">
                        @{sel.odd.toFixed(2)}
                      </span>
                      <span className="px-2 py-0.5 rounded bg-emerald-950/50 border border-emerald-500/30 text-emerald-400 font-bold text-[11px]">
                        {sel.prob}%
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Footer #5 */}
            <div className="mt-6 pt-4 border-t border-zinc-850 flex items-center justify-between gap-3">
              <button
                type="button"
                onClick={() => handleCopyFormattedTicket(ticket5ThreeDays.title, ticket5ThreeDays.subtitle, ticket5ThreeDays.totalOdd, ticket5ThreeDays.jointProbability, ticket5ThreeDays.selections)}
                className="px-3 py-2 rounded-xl bg-zinc-900 hover:bg-zinc-800 border border-zinc-750 text-xs font-mono font-bold text-zinc-300 transition-all flex items-center gap-1.5 cursor-pointer"
              >
                <span>📋 Copiar #5</span>
              </button>

              <button
                type="button"
                onClick={() => handleLoadTicketInto6(ticket5ThreeDays)}
                className="px-4 py-2 rounded-xl bg-gradient-to-r from-cyan-500 to-blue-600 hover:from-cyan-400 hover:to-blue-500 text-white text-xs font-mono font-black transition-all flex items-center gap-1.5 cursor-pointer shadow-lg shadow-cyan-500/20"
              >
                <span>⚡ Simular no #6</span>
                <span>→</span>
              </button>
            </div>
          </div>

        </div>
      </div>

      {/* ========================================================================= */}
      {/* QUADRO 3: #6 TICKET PARA UTILIZADORES REGISTADOS                          */}
      {/* Vazio inicialmente • Botão [+] e Apagar [-] • Calculadora & IA de Sucesso */}
      {/* ========================================================================= */}
      <div id="quadro-3-ticket-6" className="space-y-6 pt-6">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-zinc-800 pb-4">
          <div className="space-y-1">
            <div className="flex items-center gap-2">
              <span className="text-xl">🧪</span>
              <h2 className="text-lg sm:text-xl font-black text-white uppercase tracking-wider font-display">
                Quadro 3: #6 Ticket para Utilizadores Registados (Calculadora & IA)
              </h2>
            </div>
            <p className="text-xs text-zinc-400 font-sans">
              Quadro dedicado para qualquer utilizador registado montar as suas próprias apostas a partir do zero. Inclui botão <strong>[+]</strong> para adicionar jogos reais ou seleções manuais, botão <strong>[Apagar]</strong>, cálculo de odd com stake e <strong>probabilidade de sucesso analisada por IA</strong>.
            </p>
          </div>

          <div className="flex items-center gap-2 self-start sm:self-auto font-mono text-xs">
            <span className={`px-3 py-1 rounded-full border ${isUserRegistered ? 'bg-emerald-500/10 border-emerald-500/30 text-emerald-400 font-bold' : 'bg-amber-500/10 border-amber-500/30 text-amber-400 font-bold'}`}>
              {isUserRegistered ? '✓ Acesso #6 Desbloqueado' : '🔒 Requer Registo Gratuito'}
            </span>
          </div>
        </div>

        {/* Lock Screen if Not Registered */}
        {!isUserRegistered ? (
          <div className="bg-[#101018] border border-zinc-800 rounded-3xl p-8 sm:p-12 text-center space-y-6 relative overflow-hidden shadow-2xl">
            <div className="w-16 h-16 rounded-2xl bg-gradient-to-tr from-orange-500/20 to-amber-500/20 border border-orange-500/40 text-orange-400 flex items-center justify-center text-3xl mx-auto">
              🔒
            </div>

            <div className="max-w-xl mx-auto space-y-2">
              <h3 className="text-xl sm:text-2xl font-black text-white tracking-tight">
                #6 Ticket Reservado a Membros Registados
              </h3>
              <p className="text-xs sm:text-sm text-zinc-400 leading-relaxed">
                Inicia sessão ou cria uma conta gratuita em segundos para usar o quadro #6 vazio, adicionar e apagar os teus jogos, simular a stake e calcular a probabilidade matemática com o diagnóstico da IA.
              </p>
            </div>

            <div className="flex flex-wrap items-center justify-center gap-3 pt-2">
              <button
                type="button"
                onClick={onOpenAuth}
                className="px-6 py-3 rounded-2xl bg-gradient-to-r from-orange-500 to-amber-500 hover:from-orange-400 hover:to-amber-400 text-black text-xs font-mono font-black uppercase tracking-wider transition-all shadow-xl shadow-orange-500/20 cursor-pointer"
              >
                <span>🔑 Iniciar Sessão / Criar Conta Gratuita</span>
              </button>
            </div>
          </div>
        ) : (
          /* UNLOCKED FULL TICKET 6 CANVAS */
          <div className="bg-[#101018] border border-cyan-500/30 rounded-3xl p-6 sm:p-8 shadow-2xl space-y-8 relative overflow-hidden">
            <div className="absolute top-0 right-0 w-96 h-96 bg-cyan-500/5 rounded-full blur-3xl pointer-events-none" />

            {/* Top Toolbar Ticket 6 */}
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-zinc-850 pb-6">
              <div className="space-y-1">
                <div className="flex items-center gap-2">
                  <span className="px-3 py-1 rounded-full text-xs font-mono font-black uppercase tracking-wider bg-cyan-500/20 text-cyan-300 border border-cyan-500/40">
                    #TICKET 6 PESSOAL
                  </span>
                  <span className="text-xs font-mono text-zinc-400">
                    {ticket6Selections.length} Seleção(ões) no Boletim
                  </span>
                </div>
                <h3 className="text-xl sm:text-2xl font-black text-white tracking-tight">
                  Quadro Interativo #6 • Simulação com IA & Probabilidade de Sucesso
                </h3>
              </div>

              <div className="flex flex-wrap items-center gap-2">
                <button
                  type="button"
                  onClick={() => setActiveAddModal('ticket6')}
                  className="px-4 py-2.5 rounded-xl bg-cyan-500 hover:bg-cyan-400 text-black text-xs font-mono font-black transition-all flex items-center gap-1.5 cursor-pointer shadow-lg shadow-cyan-500/20"
                >
                  <span>➕ Adicionar Jogo</span>
                </button>

                {ticket6Selections.length > 0 && (
                  <button
                    type="button"
                    onClick={handleClearTicket6}
                    className="px-3 py-2.5 rounded-xl bg-zinc-900 hover:bg-zinc-800 border border-zinc-750 text-xs font-mono font-bold text-zinc-400 hover:text-red-400 transition-all cursor-pointer"
                    title="Limpar todas as seleções"
                  >
                    <span>🗑️ Limpar</span>
                  </button>
                )}
              </div>
            </div>

            {/* Ticket 6 Selections or Empty Canvas */}
            {ticket6Selections.length === 0 ? (
              <div className="py-12 px-4 rounded-2xl border-2 border-dashed border-zinc-800 text-center space-y-3 bg-zinc-950/40">
                <span className="text-4xl block">📝</span>
                <h4 className="text-sm font-bold text-zinc-300">
                  O teu #Ticket 6 está vazio de momento
                </h4>
                <p className="text-xs text-zinc-400 max-w-md mx-auto">
                  Clica em <strong>&ldquo;➕ Adicionar Jogo&rdquo;</strong> acima para escolher jogos reais de hoje ou dos próximos 3 dias, ou clica em <strong>&ldquo;⚡ Simular no #6&rdquo;</strong> em qualquer ticket acima para carregar as seleções.
                </p>
                <button
                  type="button"
                  onClick={() => setActiveAddModal('ticket6')}
                  className="mt-2 px-5 py-2.5 rounded-xl bg-zinc-900 hover:bg-zinc-800 border border-cyan-500/40 text-xs font-mono font-bold text-cyan-300 transition-all cursor-pointer"
                >
                  ➕ Escolher Jogos da Lista
                </button>
              </div>
            ) : (
              <div className="space-y-3">
                <span className="text-xs font-mono uppercase font-bold text-zinc-400 tracking-wider block">
                  Jogos Selecionados no teu Quadro #6:
                </span>
                {ticket6Selections.map((sel, idx) => (
                  <div
                    key={sel.id}
                    className="p-3.5 sm:p-4 rounded-2xl bg-zinc-950/80 border border-zinc-800/80 hover:border-cyan-500/30 transition-all flex flex-col sm:flex-row sm:items-center justify-between gap-3 font-mono"
                  >
                    <div className="flex items-start gap-3">
                      <span className="w-6 h-6 rounded-full bg-cyan-500/15 text-cyan-400 border border-cyan-500/30 flex items-center justify-center font-bold text-xs shrink-0 mt-0.5">
                        {idx + 1}
                      </span>
                      <div className="space-y-0.5">
                        <div className="flex items-center gap-2">
                          <strong className="text-sm text-white font-sans font-bold">
                            {sel.match}
                          </strong>
                          <span className="text-[10px] font-mono text-cyan-300 px-2 py-0.5 rounded bg-cyan-950/60 border border-cyan-500/20">
                            {sel.dayLabel || 'Hoje'} ({sel.time})
                          </span>
                        </div>
                        <div className="flex flex-wrap items-center gap-2 text-xs">
                          <span className="text-zinc-400 font-sans">{sel.market}:</span>
                          <span className="text-orange-400 font-bold">{sel.selection}</span>
                        </div>
                      </div>
                    </div>

                    <div className="flex items-center justify-between sm:justify-end gap-3 text-xs shrink-0 pl-9 sm:pl-0">
                      <div className="flex items-center gap-2">
                        <span className="px-2.5 py-1 rounded-lg bg-zinc-900 border border-zinc-800 text-amber-400 font-bold">
                          Odd @{sel.odd.toFixed(2)}
                        </span>
                        <span className="px-2.5 py-1 rounded-lg bg-emerald-950/50 border border-emerald-500/30 text-emerald-400 font-bold">
                          {sel.prob}% prob
                        </span>
                      </div>

                      <button
                        type="button"
                        onClick={() => handleRemoveSelection6(sel.id)}
                        className="px-2.5 py-1 rounded-lg bg-red-950/40 hover:bg-red-500/20 text-red-400 hover:text-red-300 border border-red-500/30 text-xs font-mono font-bold transition-all cursor-pointer"
                        title="Apagar seleção"
                      >
                        Apagar 🗑️
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}

            {/* STAKE CALCULATOR & STATS */}
            {ticket6Selections.length > 0 && (
              <div className="bg-zinc-950 rounded-2xl p-5 sm:p-6 border border-zinc-850 space-y-6">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-zinc-850/80 pb-4">
                  <div className="space-y-1">
                    <span className="text-xs font-mono font-bold uppercase text-zinc-400 tracking-wider block">
                      Calculadora de Stake & Probabilidade
                    </span>
                    <span className="text-xs text-zinc-400">
                      Ajusta o valor da aposta para calcular o retorno potencial e a probabilidade conjunta em tempo real.
                    </span>
                  </div>

                  {/* Stake controls */}
                  <div className="flex items-center gap-2">
                    <div className="flex items-center gap-1.5 bg-zinc-900 px-3 py-1.5 rounded-xl border border-zinc-750">
                      <span className="text-xs text-zinc-400 font-mono">Stake:</span>
                      <input
                        type="number"
                        min="1"
                        max="10000"
                        step="1"
                        value={ticket6Stake}
                        onChange={(e) => setTicket6Stake(Math.max(1, parseFloat(e.target.value) || 1))}
                        className="w-16 bg-transparent text-right font-mono font-bold text-white focus:outline-none text-sm"
                      />
                      <span className="text-xs text-zinc-400 font-mono">€</span>
                    </div>

                    <div className="flex items-center gap-1">
                      {[5, 10, 20, 50].map((v) => (
                        <button
                          key={v}
                          type="button"
                          onClick={() => setTicket6Stake(v)}
                          className={`px-2 py-1 rounded-lg text-[10px] font-mono font-bold transition-all ${
                            ticket6Stake === v
                              ? 'bg-orange-500 text-black'
                              : 'bg-zinc-900 hover:bg-zinc-800 text-zinc-300 border border-zinc-800'
                          }`}
                        >
                          {v}€
                        </button>
                      ))}
                    </div>
                  </div>
                </div>

                {/* 4 Financial & Probability Metric Boxes */}
                <div className="grid grid-cols-2 md:grid-cols-4 gap-3 font-mono">
                  <div className="p-3.5 rounded-xl bg-zinc-900/60 border border-zinc-800 text-center">
                    <span className="text-[10px] text-zinc-400 uppercase block">Odd Combinada</span>
                    <strong className="text-lg sm:text-xl font-black text-amber-400">
                      @{ticket6Metrics.totalOdd.toFixed(2)}
                    </strong>
                  </div>

                  <div className="p-3.5 rounded-xl bg-zinc-900/60 border border-zinc-800 text-center">
                    <span className="text-[10px] text-zinc-400 uppercase block">Prob. de Sucesso</span>
                    <strong className="text-lg sm:text-xl font-black text-emerald-400">
                      {ticket6Metrics.jointProbability}%
                    </strong>
                  </div>

                  <div className="p-3.5 rounded-xl bg-zinc-900/60 border border-zinc-800 text-center">
                    <span className="text-[10px] text-zinc-400 uppercase block">Retorno Bruto</span>
                    <strong className="text-lg sm:text-xl font-black text-white">
                      {ticket6PotentialReturn.toFixed(2)} €
                    </strong>
                  </div>

                  <div className="p-3.5 rounded-xl bg-zinc-900/60 border border-zinc-800 text-center">
                    <span className="text-[10px] text-zinc-400 uppercase block">Lucro Líquido</span>
                    <strong className="text-lg sm:text-xl font-black text-cyan-400">
                      +{ticket6PotentialProfit.toFixed(2)} €
                    </strong>
                  </div>
                </div>

                {/* AI Trigger */}
                <div className="pt-2 text-center">
                  <button
                    type="button"
                    onClick={handleRunAiAnalysis6}
                    disabled={isAiAnalyzing}
                    className="px-6 py-3.5 rounded-2xl bg-gradient-to-r from-cyan-500 via-blue-600 to-indigo-600 hover:from-cyan-400 hover:to-indigo-500 text-white text-xs font-mono font-black uppercase tracking-wider transition-all flex items-center justify-center gap-2 mx-auto shadow-xl shadow-cyan-500/20 cursor-pointer disabled:opacity-50"
                  >
                    <span>{isAiAnalyzing ? '⏳' : '🤖'}</span>
                    <span>
                      {isAiAnalyzing ? 'A IA está a diagnosticar o #6 ticket...' : 'Analisar #6 Ticket com IA (Probabilidade & Vulnerabilidades)'}
                    </span>
                  </button>
                </div>
              </div>
            )}

            {/* AI DIAGNOSTIC REPORT CARD */}
            {aiAnalysisResult && (
              <div className="p-6 sm:p-7 rounded-2xl bg-gradient-to-br from-[#121624] via-[#10141f] to-[#0c0f17] border border-cyan-500/40 shadow-2xl space-y-5 animate-fade-in">
                <div className="flex flex-wrap items-center justify-between gap-3 border-b border-zinc-800 pb-4">
                  <div className="flex items-center gap-2.5">
                    <span className="w-8 h-8 rounded-xl bg-cyan-500/20 border border-cyan-500/40 text-cyan-400 flex items-center justify-center text-base">
                      🤖
                    </span>
                    <div>
                      <h4 className="text-base font-black text-white font-display uppercase tracking-wider">
                        Diagnóstico Tático da Inteligência Artificial (#6 Ticket)
                      </h4>
                      <span className="text-[10px] font-mono text-zinc-400">
                        Avaliação algorítmica de assertividade e gestão de risco
                      </span>
                    </div>
                  </div>

                  <div className="flex items-center gap-2 font-mono">
                    <span className="px-3 py-1 rounded-full bg-cyan-950/80 border border-cyan-500/40 text-cyan-300 text-xs font-bold">
                      Índice de Confiança: {aiAnalysisResult.confidenceIndex}/100
                    </span>
                    <span className={`px-3 py-1 rounded-full border text-xs font-bold ${
                      aiAnalysisResult.riskCategory.includes('Conservador')
                        ? 'bg-emerald-950/80 border-emerald-500/40 text-emerald-400'
                        : aiAnalysisResult.riskCategory.includes('Moderado')
                        ? 'bg-amber-950/80 border-amber-500/40 text-amber-400'
                        : 'bg-red-950/80 border-red-500/40 text-red-400'
                    }`}>
                      Risco: {aiAnalysisResult.riskCategory}
                    </span>
                  </div>
                </div>

                <div className="p-4 rounded-xl bg-zinc-950/60 border border-zinc-850 text-xs text-zinc-300 leading-relaxed font-sans">
                  <strong className="text-white block mb-1 font-mono uppercase text-[11px]">
                    Veredito da Simulação:
                  </strong>
                  {aiAnalysisResult.summary}
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-xs font-sans">
                  <div className="p-4 rounded-xl bg-emerald-950/20 border border-emerald-500/30 space-y-1">
                    <span className="font-mono text-[10px] text-emerald-400 font-bold uppercase block">
                      🛡️ Ponto Forte / Seleção mais Confiável:
                    </span>
                    <p className="text-zinc-200 font-medium">
                      {aiAnalysisResult.strongestPick}
                    </p>
                  </div>

                  <div className="p-4 rounded-xl bg-red-950/20 border border-red-500/30 space-y-1">
                    <span className="font-mono text-[10px] text-red-400 font-bold uppercase block">
                      ⚠️ Ponto Crítico / Jogo mais Vulnerável:
                    </span>
                    <p className="text-zinc-200 font-medium">
                      {aiAnalysisResult.riskiestPick}
                    </p>
                  </div>
                </div>

                <div className="p-4 rounded-xl bg-amber-500/10 border border-amber-500/30 space-y-1 text-xs">
                  <span className="font-mono text-[10px] text-amber-400 font-bold uppercase block">
                    💡 Dica de Otimização da IA:
                  </span>
                  <p className="text-zinc-300 leading-relaxed">
                    {aiAnalysisResult.optimizationAdvice}
                  </p>
                </div>

                <div className="flex items-center justify-between text-xs font-mono text-zinc-400 pt-2 border-t border-zinc-850">
                  <span>{aiAnalysisResult.expectedValueComment}</span>
                  <span className="text-cyan-400 font-bold">iRunBets AI Engine</span>
                </div>
              </div>
            )}
          </div>
        )}
      </div>

      {/* ========================================================================= */}
      {/* MODAL UNIVERSAL PARA ADICIONAR JOGOS (#4 OU #6)                           */}
      {/* Suporta filtro "Hoje (00:00 - 24:00)", "Próximos 3 Dias" e Personalizado   */}
      {/* ========================================================================= */}
      {activeAddModal && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-[#121218] border border-zinc-800 rounded-3xl w-full max-w-2xl max-h-[85vh] flex flex-col shadow-2xl overflow-hidden animate-fade-in font-sans">
            <div className="p-5 border-b border-zinc-800 flex items-center justify-between">
              <div>
                <h3 className="text-base font-black text-white uppercase tracking-wider font-display flex items-center gap-2">
                  <span>➕ Adicionar Jogo ao</span>
                  <span className={activeAddModal === 'ticket4' ? 'text-amber-400' : 'text-cyan-400'}>
                    {activeAddModal === 'ticket4' ? '#4 Ticket Manual' : '#6 Ticket Utilizador'}
                  </span>
                </h3>
                <span className="text-xs text-zinc-400">
                  Escolhe da lista de jogos reais ou introduz uma seleção personalizada.
                </span>
              </div>
              <button
                type="button"
                onClick={() => setActiveAddModal(null)}
                className="p-1.5 rounded-lg text-zinc-400 hover:text-white hover:bg-zinc-800 text-sm font-bold"
              >
                ✕
              </button>
            </div>

            <div className="p-5 overflow-y-auto space-y-6 flex-1">
              {/* Option A: Search Real Games */}
              <div className="space-y-3">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <span className="text-xs font-mono font-bold uppercase text-orange-400 tracking-wider">
                    Opção A: Escolher dos Jogos Reais ({modalSourceGames.length} encontrados)
                  </span>

                  {/* Date Filter Tabs in Modal */}
                  <div className="flex items-center gap-1 bg-zinc-950 p-1 rounded-xl border border-zinc-800 text-[10px] font-mono">
                    <button
                      type="button"
                      onClick={() => setModalDateFilter('hoje')}
                      className={`px-2.5 py-1 rounded-lg transition-all ${
                        modalDateFilter === 'hoje' ? 'bg-orange-500 text-black font-bold' : 'text-zinc-400 hover:text-white'
                      }`}
                    >
                      Hoje (24h)
                    </button>
                    <button
                      type="button"
                      onClick={() => setModalDateFilter('3dias')}
                      className={`px-2.5 py-1 rounded-lg transition-all ${
                        modalDateFilter === '3dias' ? 'bg-cyan-500 text-black font-bold' : 'text-zinc-400 hover:text-white'
                      }`}
                    >
                      3 Dias
                    </button>
                    <button
                      type="button"
                      onClick={() => setModalDateFilter('todos')}
                      className={`px-2.5 py-1 rounded-lg transition-all ${
                        modalDateFilter === 'todos' ? 'bg-zinc-800 text-white font-bold' : 'text-zinc-400 hover:text-white'
                      }`}
                    >
                      Todos
                    </button>
                  </div>
                </div>

                <input
                  type="text"
                  placeholder="Pesquisar equipa ou liga (ex: Sporting, Benfica, Porto, Real Madrid)..."
                  value={modalSearchTerm}
                  onChange={(e) => setModalSearchTerm(e.target.value)}
                  className="w-full bg-zinc-950 border border-zinc-800 rounded-xl px-4 py-2.5 text-xs text-white placeholder-zinc-500 focus:outline-none focus:border-orange-500 font-mono"
                />

                <div className="space-y-2 max-h-56 overflow-y-auto pr-1">
                  {modalSourceGames.length === 0 ? (
                    <p className="text-xs text-zinc-500 text-center py-4">Nenhum jogo encontrado com esse termo.</p>
                  ) : (
                    modalSourceGames.map((j) => {
                      const metrics = getCalibratedMatchMetrics(j);
                      const p1 = metrics.probCasa ?? 45;
                      const px = metrics.probEmpate ?? 28;
                      const p2 = metrics.probFora ?? 27;
                      const ov15 = metrics.over15Prob ?? 75;
                      const ov25 = metrics.over25Prob ?? 50;

                      return (
                        <div
                          key={j.jogo_id || j.id}
                          className="p-3 rounded-xl bg-zinc-950/60 border border-zinc-850 hover:border-zinc-700 text-xs space-y-2"
                        >
                          <div className="flex items-center justify-between font-bold text-zinc-200">
                            <span>{j.clube_casa} vs {j.clube_fora}</span>
                            <span className="font-mono text-[10px] text-zinc-400">
                              {getDayBadge(j.data)} • {j.hora}
                            </span>
                          </div>

                          {/* Quick pick market buttons */}
                          <div className="flex flex-wrap items-center gap-1.5 pt-1">
                            <button
                              type="button"
                              onClick={() => handleAddGameToTargetTicket(j, '1X2', `Vitória ${j.clube_casa} (1)`, Number((1 / (p1 / 100) * 0.94).toFixed(2)), p1)}
                              className="px-2 py-1 rounded-lg bg-zinc-900 hover:bg-orange-500/20 text-zinc-300 hover:text-orange-400 border border-zinc-800 text-[10px] font-mono cursor-pointer"
                            >
                              1 ({j.clube_casa}) • {p1}%
                            </button>
                            <button
                              type="button"
                              onClick={() => handleAddGameToTargetTicket(j, '1X2', `Vitória ${j.clube_fora} (2)`, Number((1 / (p2 / 100) * 0.94).toFixed(2)), p2)}
                              className="px-2 py-1 rounded-lg bg-zinc-900 hover:bg-orange-500/20 text-zinc-300 hover:text-orange-400 border border-zinc-800 text-[10px] font-mono cursor-pointer"
                            >
                              2 ({j.clube_fora}) • {p2}%
                            </button>
                            <button
                              type="button"
                              onClick={() => handleAddGameToTargetTicket(j, 'Golos', 'Mais de 1.5 Golos', 1.30, ov15)}
                              className="px-2 py-1 rounded-lg bg-zinc-900 hover:bg-orange-500/20 text-zinc-300 hover:text-orange-400 border border-zinc-800 text-[10px] font-mono cursor-pointer"
                            >
                              +1.5 Golos • {ov15}%
                            </button>
                            <button
                              type="button"
                              onClick={() => handleAddGameToTargetTicket(j, 'Cantos', 'Mais de 8.5 Cantos', 1.50, 78)}
                              className="px-2 py-1 rounded-lg bg-zinc-900 hover:bg-orange-500/20 text-zinc-300 hover:text-orange-400 border border-zinc-800 text-[10px] font-mono cursor-pointer"
                            >
                              +8.5 Cantos • 78%
                            </button>
                          </div>
                        </div>
                      );
                    })
                  )}
                </div>
              </div>

              {/* Option B: Insert Custom Match */}
              <div className="space-y-3 pt-4 border-t border-zinc-800">
                <span className="text-xs font-mono font-bold uppercase text-cyan-400 tracking-wider block">
                  Opção B: Inserir Seleção Manual Personalizada
                </span>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
                  <div>
                    <label className="text-[11px] text-zinc-400 block mb-1">Confronto (ex: Arsenal vs Chelsea):</label>
                    <input
                      type="text"
                      placeholder="Equipa A vs Equipa B"
                      value={customMatchName}
                      onChange={(e) => setCustomMatchName(e.target.value)}
                      className="w-full bg-zinc-950 border border-zinc-800 rounded-xl px-3 py-2 text-white font-mono focus:outline-none focus:border-cyan-500"
                    />
                  </div>

                  <div>
                    <label className="text-[11px] text-zinc-400 block mb-1">Mercado / Seleção:</label>
                    <input
                      type="text"
                      placeholder="ex: Mais de 2.5 Golos ou Vitória Casa"
                      value={customSelectionName}
                      onChange={(e) => setCustomSelectionName(e.target.value)}
                      className="w-full bg-zinc-950 border border-zinc-800 rounded-xl px-3 py-2 text-white font-mono focus:outline-none focus:border-cyan-500"
                    />
                  </div>

                  <div>
                    <label className="text-[11px] text-zinc-400 block mb-1">Odd:</label>
                    <input
                      type="number"
                      step="0.05"
                      min="1.05"
                      value={customOddVal}
                      onChange={(e) => setCustomOddVal(e.target.value)}
                      className="w-full bg-zinc-950 border border-zinc-800 rounded-xl px-3 py-2 text-white font-mono focus:outline-none focus:border-cyan-500"
                    />
                  </div>

                  <div>
                    <label className="text-[11px] text-zinc-400 block mb-1">Probabilidade Estimada (%):</label>
                    <input
                      type="number"
                      step="1"
                      min="10"
                      max="98"
                      value={customProbVal}
                      onChange={(e) => setCustomProbVal(e.target.value)}
                      className="w-full bg-zinc-950 border border-zinc-800 rounded-xl px-3 py-2 text-white font-mono focus:outline-none focus:border-cyan-500"
                    />
                  </div>
                </div>

                <button
                  type="button"
                  onClick={handleAddCustomToTargetTicket}
                  className="w-full py-2.5 rounded-xl bg-zinc-900 hover:bg-zinc-800 border border-cyan-500/40 text-cyan-300 text-xs font-mono font-bold transition-all cursor-pointer"
                >
                  ✓ Adicionar Seleção ao {activeAddModal === 'ticket4' ? '#4 Ticket' : '#6 Ticket'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

    </div>
  );
}
