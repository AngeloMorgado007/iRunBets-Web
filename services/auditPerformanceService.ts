import * as XLSX from 'xlsx';
import { JogoDoDia, getCalibratedMatchMetrics } from './supabase';

export interface EvaluatedMatchOutcome {
  matchKey: string;
  jogoId: string;
  date: string;
  time: string;
  league: string;
  homeTeam: string;
  awayTeam: string;
  homeScore: number | null;
  awayScore: number | null;
  scoreText: string;
  hasScore: boolean;
  status: string;
  
  // AI Prediction Details
  aiPredictionText: string;
  aiMarketType: '1X2' | 'Golos' | 'BTTS' | 'Dupla' | 'Outro';
  chosenOdd: number;
  confidence: number;
  evVal: string;
  
  // Outcome Evaluation
  isFinished: boolean;
  outcome: 'GREEN' | 'RED' | 'PENDING' | 'CANCELLED';
  profitUnits: number; // e.g. +(odd - 1) on GREEN, -1.00 on RED, 0 on PENDING
}

export interface MonthlyAuditSummary {
  monthKey: string; // e.g. "2026-10"
  monthLabel: string; // e.g. "Outubro 2026"
  totalMatches: number;
  evaluatedMatches: number;
  greens: number;
  reds: number;
  pending: number;
  winrate: number; // percentage (0 - 100)
  totalProfitUnits: number;
  yieldPercent: number; // percentage (e.g. +7.5%)
  avgOdd: number;
  
  // By market breakdown
  marketStats: {
    market: string;
    total: number;
    greens: number;
    reds: number;
    winrate: number;
  }[];
}

import {
  resolveActualMatchScore,
  OFFICIAL_RECORDED_MATCH_SCORES
} from './officialScoresData';

export {
  resolveActualMatchScore,
  OFFICIAL_RECORDED_MATCH_SCORES
};

/**
 * Evaluates whether an AI prediction hit (GREEN) or missed (RED) based on official full-time score.
 */
export function evaluateSingleMatch(jogo: JogoDoDia, currentDateString: string): EvaluatedMatchOutcome {
  const { homeScore, awayScore, hasScore } = resolveActualMatchScore(jogo);
  const metrics = getCalibratedMatchMetrics(jogo);
  
  const estadoUpper = (jogo.estado || '').toUpperCase();
  const isFinished = Boolean(
    ['FINISHED', 'FT', 'TERMINADO', 'FINAL', 'ENCERRADO'].includes(estadoUpper) ||
    (jogo.data && jogo.data < currentDateString && hasScore)
  );

  const homeTeam = jogo.clube_casa || 'Equipa Casa';
  const awayTeam = jogo.clube_fora || 'Equipa Fora';
  const scoreText = hasScore ? `${homeScore} - ${awayScore}` : (isFinished ? 'Aguardando Placar' : 'Agendado');

  // Determine prediction text
  const rawTip = (jogo.previsao_resumo || metrics.seloIa || '').trim();
  let aiPredictionText = rawTip;
  if (!aiPredictionText || aiPredictionText === 'Em análise quantitativa') {
    if (metrics.probCasa >= 50) aiPredictionText = `${homeTeam} Vence (1)`;
    else if (metrics.probFora >= 50) aiPredictionText = `${awayTeam} Vence (2)`;
    else if (metrics.probEmpate >= 35) aiPredictionText = 'Empate (X)';
    else aiPredictionText = `${homeTeam} ou Empate (1X)`;
  }

  // Determine market and odd
  let aiMarketType: '1X2' | 'Golos' | 'BTTS' | 'Dupla' | 'Outro' = '1X2';
  let chosenOdd = 1.85;

  const tipLower = aiPredictionText.toLowerCase();

  if (tipLower.includes('mais 1.5') || tipLower.includes('over 1.5')) {
    aiMarketType = 'Golos';
    chosenOdd = 1.32;
  } else if (tipLower.includes('mais 2.5') || tipLower.includes('over 2.5')) {
    aiMarketType = 'Golos';
    chosenOdd = 1.88;
  } else if (tipLower.includes('ambas marcam') || tipLower.includes('btts')) {
    aiMarketType = 'BTTS';
    chosenOdd = 1.80;
  } else if (tipLower.includes('1x') || tipLower.includes('ou empate') || tipLower.includes('dupla')) {
    aiMarketType = 'Dupla';
    chosenOdd = 1.38;
  } else if (tipLower.includes('x2') || tipLower.includes('empate ou')) {
    aiMarketType = 'Dupla';
    chosenOdd = 1.45;
  } else if (tipLower.includes('empate') || tipLower.includes('(x)')) {
    aiMarketType = '1X2';
    chosenOdd = Number(jogo.odd_x) || Number(metrics.oddX) || 3.30;
  } else if (tipLower.includes('2') || tipLower.includes('fora') || tipLower.includes(awayTeam.toLowerCase())) {
    aiMarketType = '1X2';
    chosenOdd = Number(jogo.odd_2) || Number(metrics.odd2) || 2.45;
  } else {
    // Default: Home win (1)
    aiMarketType = '1X2';
    chosenOdd = Number(jogo.odd_1) || Number(metrics.odd1) || 1.95;
  }

  // Determine Outcome
  let outcome: 'GREEN' | 'RED' | 'PENDING' | 'CANCELLED' = 'PENDING';
  let profitUnits = 0;

  if (estadoUpper === 'CANCELLED' || estadoUpper === 'POSTPONED' || estadoUpper === 'ADIADO') {
    outcome = 'CANCELLED';
    profitUnits = 0;
  } else if (isFinished && hasScore) {
    const isHomeWin = homeScore! > awayScore!;
    const isDraw = homeScore! === awayScore!;
    const isAwayWin = homeScore! < awayScore!;
    const totalGoals = homeScore! + awayScore!;
    const bothScored = homeScore! > 0 && awayScore! > 0;

    let isGreen = false;

    if (aiMarketType === 'Golos') {
      if (tipLower.includes('1.5')) isGreen = totalGoals >= 2;
      else if (tipLower.includes('2.5')) isGreen = totalGoals >= 3;
      else isGreen = totalGoals >= 2;
    } else if (aiMarketType === 'BTTS') {
      isGreen = bothScored;
    } else if (aiMarketType === 'Dupla') {
      if (tipLower.includes('1x') || tipLower.includes('casa ou empate')) isGreen = isHomeWin || isDraw;
      else isGreen = isAwayWin || isDraw;
    } else if (tipLower.includes('empate') || tipLower.includes('(x)')) {
      isGreen = isDraw;
    } else if (tipLower.includes('2') || tipLower.includes('fora') || tipLower.includes(awayTeam.toLowerCase())) {
      isGreen = isAwayWin;
    } else {
      isGreen = isHomeWin;
    }

    if (isGreen) {
      outcome = 'GREEN';
      profitUnits = Number((chosenOdd - 1).toFixed(2));
    } else {
      outcome = 'RED';
      profitUnits = -1.0;
    }
  }

  return {
    matchKey: jogo.jogo_id || `${jogo.data}_${jogo.clube_casa}_vs_${jogo.clube_fora}`,
    jogoId: String(jogo.jogo_id || ''),
    date: jogo.data || '',
    time: jogo.hora || '',
    league: jogo.liga || 'Geral',
    homeTeam,
    awayTeam,
    homeScore,
    awayScore,
    scoreText,
    hasScore,
    status: jogo.estado || 'SCHEDULED',
    aiPredictionText,
    aiMarketType,
    chosenOdd: Number(chosenOdd.toFixed(2)),
    confidence: metrics.confianca,
    evVal: metrics.evVal,
    isFinished,
    outcome,
    profitUnits
  };
}

const MONTH_NAMES_PT: Record<string, string> = {
  '01': 'Janeiro',
  '02': 'Fevereiro',
  '03': 'Março',
  '04': 'Abril',
  '05': 'Maio',
  '06': 'Junho',
  '07': 'Julho',
  '08': 'Agosto',
  '09': 'Setembro',
  '10': 'Outubro',
  '11': 'Novembro',
  '12': 'Dezembro'
};

/**
 * Groups evaluated matches by Month and calculates audit metrics.
 */
export function aggregateMonthlyAudit(evaluated: EvaluatedMatchOutcome[]): MonthlyAuditSummary[] {
  const groups = new Map<string, EvaluatedMatchOutcome[]>();

  for (const item of evaluated) {
    if (!item.date || item.date.length < 7) continue;
    const monthKey = item.date.substring(0, 7); // e.g. "2026-10"
    if (!groups.has(monthKey)) {
      groups.set(monthKey, []);
    }
    groups.get(monthKey)!.push(item);
  }

  const results: MonthlyAuditSummary[] = [];

  // Sort months descending (latest first)
  const sortedMonths = Array.from(groups.keys()).sort((a, b) => b.localeCompare(a));

  for (const mKey of sortedMonths) {
    const list = groups.get(mKey)!;
    const [year, month] = mKey.split('-');
    const monthLabel = `${MONTH_NAMES_PT[month] || month} ${year}`;

    const totalMatches = list.length;
    let greens = 0;
    let reds = 0;
    let pending = 0;
    let totalProfitUnits = 0;
    let sumOdds = 0;
    let evaluatedCount = 0;

    const marketMap = new Map<string, { total: number; greens: number; reds: number }>();

    for (const item of list) {
      if (!marketMap.has(item.aiMarketType)) {
        marketMap.set(item.aiMarketType, { total: 0, greens: 0, reds: 0 });
      }
      const mStats = marketMap.get(item.aiMarketType)!;

      if (item.outcome === 'GREEN') {
        greens++;
        evaluatedCount++;
        totalProfitUnits += item.profitUnits;
        sumOdds += item.chosenOdd;
        mStats.greens++;
        mStats.total++;
      } else if (item.outcome === 'RED') {
        reds++;
        evaluatedCount++;
        totalProfitUnits += item.profitUnits;
        sumOdds += item.chosenOdd;
        mStats.reds++;
        mStats.total++;
      } else {
        pending++;
      }
    }

    const winrate = evaluatedCount > 0 ? Number(((greens / evaluatedCount) * 100).toFixed(1)) : 0;
    const yieldPercent = evaluatedCount > 0 ? Number(((totalProfitUnits / evaluatedCount) * 100).toFixed(1)) : 0;
    const avgOdd = evaluatedCount > 0 ? Number((sumOdds / evaluatedCount).toFixed(2)) : 0;

    const marketStats = Array.from(marketMap.entries()).map(([market, data]) => ({
      market,
      total: data.total,
      greens: data.greens,
      reds: data.reds,
      winrate: data.total > 0 ? Number(((data.greens / data.total) * 100).toFixed(1)) : 0
    }));

    results.push({
      monthKey: mKey,
      monthLabel,
      totalMatches,
      evaluatedMatches: evaluatedCount,
      greens,
      reds,
      pending,
      winrate,
      totalProfitUnits: Number(totalProfitUnits.toFixed(2)),
      yieldPercent,
      avgOdd,
      marketStats
    });
  }

  return results;
}

/**
 * Exports comprehensive AI performance audit workbook to Excel (.xlsx) with 2 sheets.
 */
export function exportAuditReportToExcel(
  summaries: MonthlyAuditSummary[],
  allEvaluated: EvaluatedMatchOutcome[],
  filename = 'iRunBets_Auditoria_Performance_IA.xlsx'
) {
  const wb = XLSX.utils.book_new();

  // Sheet 1: Resumo Mensal
  const summaryRows = summaries.map(s => ({
    'Mês / Ano': s.monthLabel,
    'Total de Jogos': s.totalMatches,
    'Jogos Avaliados': s.evaluatedMatches,
    '✅ Greens (Acertos)': s.greens,
    '❌ Reds (Falhas)': s.reds,
    'Pendentes / Agendados': s.pending,
    'Taxa de Acerto (%)': `${s.winrate}%`,
    'Odd Média': s.avgOdd,
    'Lucro Líquido (Unidades)': `${s.totalProfitUnits > 0 ? '+' : ''}${s.totalProfitUnits} U`,
    'Yield Estimado (%)': `${s.yieldPercent > 0 ? '+' : ''}${s.yieldPercent}%`
  }));

  const wsSummary = XLSX.utils.json_to_sheet(summaryRows);
  XLSX.utils.book_append_sheet(wb, wsSummary, 'Resumo Mensal & KPIs');

  // Sheet 2: Auditoria Jogo a Jogo
  const detailRows = allEvaluated
    .filter(e => e.isFinished && e.hasScore)
    .sort((a, b) => (b.date + b.time).localeCompare(a.date + a.time))
    .map(e => ({
      'Data': e.date,
      'Hora': e.time,
      'Liga': e.league,
      'Confronto': `${e.homeTeam} vs ${e.awayTeam}`,
      'Resultado Oficial Final': `${e.homeScore} - ${e.awayScore}`,
      'Previsão Recomendada IA': e.aiPredictionText,
      'Mercado': e.aiMarketType,
      'Odd Registada': e.chosenOdd,
      'Confiança (%)': `${e.confidence}%`,
      'Valor EV': e.evVal,
      'Desfecho Oficial': e.outcome === 'GREEN' ? '✅ GREEN' : '❌ RED',
      'Retorno (Unidades)': `${e.profitUnits > 0 ? '+' : ''}${e.profitUnits} U`
    }));

  const wsDetail = XLSX.utils.json_to_sheet(detailRows);
  XLSX.utils.book_append_sheet(wb, wsDetail, 'Auditoria Detalhada Jogo a Jogo');

  XLSX.writeFile(wb, filename);
}
