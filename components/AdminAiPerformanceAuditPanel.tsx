import React, { useState, useEffect, useMemo } from 'react';
import { 
  fetchJogosDoDiaFromSupabase, 
  JogoDoDia,
  getTodayDateString 
} from '../services/supabase';
import { 
  evaluateSingleMatch, 
  aggregateMonthlyAudit, 
  exportAuditReportToExcel, 
  EvaluatedMatchOutcome, 
  MonthlyAuditSummary,
  resolveActualMatchScore
} from '../services/auditPerformanceService';

export const AdminAiPerformanceAuditPanel: React.FC = () => {
  const [loading, setLoading] = useState(true);
  const [games, setGames] = useState<JogoDoDia[]>([]);
  const [selectedMonth, setSelectedMonth] = useState<string>('all');
  const [outcomeFilter, setOutcomeFilter] = useState<'all' | 'green' | 'red'>('all');
  const [searchFilter, setSearchFilter] = useState<string>('');
  const [isExporting, setIsExporting] = useState(false);

  const currentDateString = useMemo(() => getTodayDateString(), []);

  // Fetch games on mount
  useEffect(() => {
    let isMounted = true;
    const loadData = async () => {
      setLoading(true);
      try {
        const data = await fetchJogosDoDiaFromSupabase({ limit: 1000, includePast: true });
        if (isMounted) {
          setGames(data || []);
        }
      } catch (err) {
        console.warn('Erro ao carregar jogos para auditoria no Backoffice:', err);
      } finally {
        if (isMounted) setLoading(false);
      }
    };

    loadData();
    return () => { isMounted = false; };
  }, []);

  // Evaluate all matches
  const evaluatedMatches = useMemo(() => {
    return games.map(j => evaluateSingleMatch(j, currentDateString));
  }, [games, currentDateString]);

  // Aggregate monthly summaries
  const monthlySummaries = useMemo(() => {
    return aggregateMonthlyAudit(evaluatedMatches);
  }, [evaluatedMatches]);

  // Available months list for selector
  const availableMonths = useMemo(() => {
    return monthlySummaries.map(s => ({
      key: s.monthKey,
      label: s.monthLabel,
      total: s.evaluatedMatches,
      winrate: s.winrate
    }));
  }, [monthlySummaries]);

  // Current active summary (either all months or selected month)
  const activeSummary = useMemo(() => {
    if (selectedMonth === 'all') {
      const allEvaluated = evaluatedMatches.filter(e => e.isFinished && e.hasScore);
      const total = allEvaluated.length;
      const greens = allEvaluated.filter(e => e.outcome === 'GREEN').length;
      const reds = allEvaluated.filter(e => e.outcome === 'RED').length;
      const winrate = total > 0 ? Number(((greens / total) * 100).toFixed(1)) : 0;
      const totalProfit = allEvaluated.reduce((acc, curr) => acc + curr.profitUnits, 0);
      const yieldPercent = total > 0 ? Number(((totalProfit / total) * 100).toFixed(1)) : 0;
      
      const sumOdds = allEvaluated.reduce((acc, curr) => acc + curr.chosenOdd, 0);
      const avgOdd = total > 0 ? Number((sumOdds / total).toFixed(2)) : 0;

      return {
        label: 'Histórico Global Acumulado (Todos os Meses)',
        total,
        greens,
        reds,
        winrate,
        totalProfit: Number(totalProfit.toFixed(2)),
        yieldPercent,
        avgOdd
      };
    }

    const found = monthlySummaries.find(s => s.monthKey === selectedMonth);
    if (found) {
      return {
        label: found.monthLabel,
        total: found.evaluatedMatches,
        greens: found.greens,
        reds: found.reds,
        winrate: found.winrate,
        totalProfit: found.totalProfitUnits,
        yieldPercent: found.yieldPercent,
        avgOdd: found.avgOdd
      };
    }

    return {
      label: 'Mês Selecionado',
      total: 0,
      greens: 0,
      reds: 0,
      winrate: 0,
      totalProfit: 0,
      yieldPercent: 0,
      avgOdd: 0
    };
  }, [selectedMonth, evaluatedMatches, monthlySummaries]);

  // Filtered rows for the audit table
  const filteredMatchesList = useMemo(() => {
    return evaluatedMatches.filter(item => {
      // Must be finished and have valid official score
      if (!item.isFinished || !item.hasScore) return false;

      // Filter by Month
      if (selectedMonth !== 'all') {
        if (!item.date.startsWith(selectedMonth)) return false;
      }

      // Filter by Outcome
      if (outcomeFilter === 'green' && item.outcome !== 'GREEN') return false;
      if (outcomeFilter === 'red' && item.outcome !== 'RED') return false;

      // Filter by Search (Club or League)
      if (searchFilter.trim()) {
        const query = searchFilter.toLowerCase().trim();
        const text = `${item.homeTeam} ${item.awayTeam} ${item.league} ${item.aiPredictionText}`.toLowerCase();
        if (!text.includes(query)) return false;
      }

      return true;
    }).sort((a, b) => (b.date + b.time).localeCompare(a.date + a.time));
  }, [evaluatedMatches, selectedMonth, outcomeFilter, searchFilter]);

  // Export handler
  const handleExportExcel = () => {
    try {
      setIsExporting(true);
      const filename = selectedMonth === 'all'
        ? `iRunBets_Auditoria_Performance_Global_${currentDateString}.xlsx`
        : `iRunBets_Auditoria_Performance_${selectedMonth}.xlsx`;

      exportAuditReportToExcel(monthlySummaries, evaluatedMatches, filename);
    } catch (err) {
      console.error('Falha ao exportar auditoria para Excel:', err);
    } finally {
      setIsExporting(false);
    }
  };

  return (
    <div className="bg-[#121216]/75 border border-zinc-800 rounded-2xl p-6 space-y-6 shadow-2xl backdrop-blur-md">
      
      {/* Top Header & Actions */}
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 border-b border-zinc-850 pb-5">
        <div>
          <div className="flex items-center gap-2">
            <span className="w-2.5 h-2.5 rounded-full bg-emerald-500 animate-pulse" />
            <span className="text-[10px] uppercase font-bold font-mono tracking-widest text-emerald-400">
              Auditoria de Precisão &amp; Backtesting Oficial
            </span>
          </div>
          <h2 className="text-lg font-black text-white mt-1 flex items-center gap-2">
            <span>🎯</span>
            <span>Performance da SuperIA (Greens vs Reds) por Mês</span>
          </h2>
          <p className="text-zinc-400 text-xs font-light mt-0.5">
            Relatório quantitativo com base nos resultados finais oficiais das partidas. Avalia acertos, desvios e rentabilidade (+EV).
          </p>
        </div>

        {/* Action Buttons: Month Selector & Export Excel */}
        <div className="flex flex-wrap items-center gap-3">
          {/* Month Dropdown */}
          <div className="flex items-center gap-1.5 bg-zinc-900 border border-zinc-750 px-3 py-2 rounded-xl text-xs font-mono text-zinc-200">
            <span className="text-zinc-500">🗓️ Mês:</span>
            <select
              value={selectedMonth}
              onChange={(e) => setSelectedMonth(e.target.value)}
              className="bg-transparent text-white font-bold focus:outline-none cursor-pointer"
            >
              <option value="all" className="bg-zinc-900 text-white">Todos os Meses Acumulado</option>
              {availableMonths.map(m => (
                <option key={m.key} value={m.key} className="bg-zinc-900 text-white">
                  {m.label} ({m.total} jogos • {m.winrate}% Win)
                </option>
              ))}
            </select>
          </div>

          {/* Export Excel (.xlsx) Button */}
          <button
            type="button"
            onClick={handleExportExcel}
            disabled={isExporting}
            className="px-4 py-2 bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 text-white rounded-xl text-xs font-bold font-mono tracking-wide transition-all cursor-pointer flex items-center gap-2 shadow-lg shadow-emerald-600/20 active:scale-98"
            title="Descarregar relatório auditado de acertos e falhas em formato Excel (.xlsx)"
          >
            <span>📥</span>
            <span>{isExporting ? 'A Exportar...' : 'Exportar Excel (.xlsx)'}</span>
          </button>
        </div>
      </div>

      {loading ? (
        <div className="py-16 text-center space-y-3 font-mono text-xs text-zinc-400">
          <div className="w-8 h-8 border-2 border-emerald-500 border-t-transparent rounded-full animate-spin mx-auto" />
          <p>A carregar base de dados de partidas e a processar auditoria de acertos...</p>
        </div>
      ) : (
        <>
          {/* Main KPI Cards Row */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-6 gap-3.5">
            {/* Card 1: Total Evaluated */}
            <div className="bg-zinc-950/60 p-4 border border-zinc-850 rounded-xl relative overflow-hidden">
              <span className="text-[10px] text-zinc-400 uppercase tracking-widest font-mono block mb-1">
                Jogos Avaliados
              </span>
              <div className="text-2xl font-mono font-black text-white">
                {activeSummary.total}
              </div>
              <span className="text-[10px] text-zinc-400 font-mono mt-1 block">
                Com resultado oficial final
              </span>
            </div>

            {/* Card 2: Greens (Acertos) */}
            <div className="bg-emerald-950/20 p-4 border border-emerald-500/30 rounded-xl relative overflow-hidden">
              <span className="text-[10px] text-emerald-400 uppercase tracking-widest font-mono block mb-1 font-bold">
                ✅ Greens (Acertos)
              </span>
              <div className="text-2xl font-mono font-black text-emerald-300">
                {activeSummary.greens}
              </div>
              <span className="text-[10px] text-emerald-400/80 font-mono mt-1 block">
                Previsões bem-sucedidas
              </span>
            </div>

            {/* Card 3: Reds (Falhas) */}
            <div className="bg-rose-950/20 p-4 border border-rose-500/30 rounded-xl relative overflow-hidden">
              <span className="text-[10px] text-rose-400 uppercase tracking-widest font-mono block mb-1 font-bold">
                ❌ Reds (Falhas)
              </span>
              <div className="text-2xl font-mono font-black text-rose-300">
                {activeSummary.reds}
              </div>
              <span className="text-[10px] text-rose-400/80 font-mono mt-1 block">
                Desvios de mercado
              </span>
            </div>

            {/* Card 4: Taxa de Acerto (Winrate %) */}
            <div className="bg-zinc-950/60 p-4 border border-zinc-850 rounded-xl relative overflow-hidden">
              <span className="text-[10px] text-amber-400 uppercase tracking-widest font-mono block mb-1 font-bold">
                🎯 Taxa de Acerto
              </span>
              <div className="text-2xl font-mono font-black text-amber-300">
                {activeSummary.winrate}%
              </div>
              {/* Progress bar */}
              <div className="w-full bg-zinc-900 h-1.5 rounded-full mt-2 overflow-hidden border border-zinc-800">
                <div 
                  className="bg-gradient-to-r from-amber-500 to-emerald-400 h-full rounded-full"
                  style={{ width: `${Math.min(100, activeSummary.winrate)}%` }}
                />
              </div>
            </div>

            {/* Card 5: Yield Estimado */}
            <div className="bg-zinc-950/60 p-4 border border-zinc-850 rounded-xl relative overflow-hidden">
              <span className="text-[10px] text-cyan-400 uppercase tracking-widest font-mono block mb-1 font-bold">
                📈 Yield Estimado
              </span>
              <div className={`text-2xl font-mono font-black ${activeSummary.yieldPercent >= 0 ? 'text-cyan-300' : 'text-rose-400'}`}>
                {activeSummary.yieldPercent > 0 ? `+${activeSummary.yieldPercent}%` : `${activeSummary.yieldPercent}%`}
              </div>
              <span className="text-[10px] text-zinc-400 font-mono mt-1 block">
                Odd Média: @{activeSummary.avgOdd}
              </span>
            </div>

            {/* Card 6: Saldo em Unidades */}
            <div className="bg-zinc-950/60 p-4 border border-zinc-850 rounded-xl relative overflow-hidden">
              <span className="text-[10px] text-purple-400 uppercase tracking-widest font-mono block mb-1 font-bold">
                💰 Saldo Unidades
              </span>
              <div className={`text-2xl font-mono font-black ${activeSummary.totalProfit >= 0 ? 'text-purple-300' : 'text-rose-400'}`}>
                {activeSummary.totalProfit > 0 ? `+${activeSummary.totalProfit} U` : `${activeSummary.totalProfit} U`}
              </div>
              <span className="text-[10px] text-zinc-400 font-mono mt-1 block">
                Flat Stake (1 Unidade)
              </span>
            </div>
          </div>

          {/* Monthly Comparison Visual Bar Chart */}
          {monthlySummaries.length > 0 && (
            <div className="bg-zinc-950/50 border border-zinc-850 rounded-xl p-5 space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="text-xs uppercase font-extrabold tracking-wider text-zinc-300 font-mono">
                    📊 Gráfico Mensal: Acertos (Greens) vs Falhas (Reds)
                  </h3>
                  <p className="text-zinc-500 text-[11px] font-mono mt-0.5">
                    Comparação visual mês a mês com taxa de assertividade percentual registrada.
                  </p>
                </div>
                <div className="flex items-center gap-3 text-xs font-mono">
                  <span className="flex items-center gap-1.5 text-emerald-400">
                    <span className="w-2.5 h-2.5 rounded bg-emerald-500" />
                    <span>Greens</span>
                  </span>
                  <span className="flex items-center gap-1.5 text-rose-400">
                    <span className="w-2.5 h-2.5 rounded bg-rose-500" />
                    <span>Reds</span>
                  </span>
                </div>
              </div>

              {/* Responsive Bar Chart */}
              <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 xl:grid-cols-4 gap-4 pt-2">
                {monthlySummaries.map((m) => {
                  const total = m.evaluatedMatches || 1;
                  const greenPercent = Math.round((m.greens / total) * 100);
                  const redPercent = 100 - greenPercent;
                  const isCurrentSelected = selectedMonth === m.monthKey;

                  return (
                    <div
                      key={m.monthKey}
                      onClick={() => setSelectedMonth(m.monthKey)}
                      className={`p-3.5 rounded-xl border transition-all cursor-pointer ${
                        isCurrentSelected
                          ? 'bg-gradient-to-b from-[#181d2f] to-[#121524] border-amber-500/80 shadow-lg shadow-amber-500/10 scale-[1.02]'
                          : 'bg-zinc-900/60 border-zinc-800 hover:border-zinc-700 hover:bg-zinc-900/90'
                      }`}
                    >
                      <div className="flex items-center justify-between text-xs font-mono font-bold text-zinc-200 mb-2">
                        <span>{m.monthLabel}</span>
                        <span className="px-2 py-0.5 rounded-full bg-emerald-500/20 text-emerald-300 text-[11px] font-black border border-emerald-500/30">
                          {m.winrate}%
                        </span>
                      </div>

                      {/* Visual Stacked Bar */}
                      <div className="w-full bg-zinc-950 h-5 rounded-lg overflow-hidden border border-zinc-800 flex">
                        <div
                          style={{ width: `${greenPercent}%` }}
                          className="bg-gradient-to-r from-emerald-600 to-emerald-400 h-full flex items-center justify-center text-[10px] font-mono font-black text-black"
                          title={`Greens: ${m.greens} (${greenPercent}%)`}
                        >
                          {greenPercent > 20 && `${m.greens} G`}
                        </div>
                        <div
                          style={{ width: `${redPercent}%` }}
                          className="bg-gradient-to-r from-rose-600 to-rose-400 h-full flex items-center justify-center text-[10px] font-mono font-black text-white"
                          title={`Reds: ${m.reds} (${redPercent}%)`}
                        >
                          {redPercent > 20 && `${m.reds} R`}
                        </div>
                      </div>

                      <div className="flex items-center justify-between text-[10.5px] font-mono text-zinc-400 mt-2">
                        <span>✅ {m.greens} Greens</span>
                        <span>❌ {m.reds} Reds</span>
                        <span className={`font-bold ${m.totalProfitUnits >= 0 ? 'text-emerald-400' : 'text-rose-400'}`}>
                          {m.totalProfitUnits > 0 ? `+${m.totalProfitUnits}U` : `${m.totalProfitUnits}U`}
                        </span>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* Interactive Audited Matches Table */}
          <div className="bg-zinc-950/60 border border-zinc-850 rounded-xl overflow-hidden space-y-3 p-4">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-2 border-b border-zinc-850">
              <div className="flex items-center gap-2">
                <span className="font-mono text-xs font-bold text-zinc-300 uppercase">
                  📋 Lista de Jogos Auditados ({filteredMatchesList.length} partidas)
                </span>
                <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-zinc-900 text-zinc-400 border border-zinc-800">
                  {activeSummary.label}
                </span>
              </div>

              {/* Filter Chips: All, Greens Only, Reds Only */}
              <div className="flex items-center gap-2">
                <div className="flex items-center gap-1 bg-zinc-900 border border-zinc-800 rounded-lg p-0.5 text-xs font-mono">
                  <button
                    type="button"
                    onClick={() => setOutcomeFilter('all')}
                    className={`px-2.5 py-1 rounded transition-all cursor-pointer font-bold ${
                      outcomeFilter === 'all' ? 'bg-zinc-800 text-white shadow-sm' : 'text-zinc-400 hover:text-white'
                    }`}
                  >
                    Todos ({filteredMatchesList.length})
                  </button>
                  <button
                    type="button"
                    onClick={() => setOutcomeFilter('green')}
                    className={`px-2.5 py-1 rounded transition-all cursor-pointer font-bold ${
                      outcomeFilter === 'green' ? 'bg-emerald-600 text-white shadow-sm' : 'text-emerald-400 hover:text-emerald-300'
                    }`}
                  >
                    ✅ Greens
                  </button>
                  <button
                    type="button"
                    onClick={() => setOutcomeFilter('red')}
                    className={`px-2.5 py-1 rounded transition-all cursor-pointer font-bold ${
                      outcomeFilter === 'red' ? 'bg-rose-600 text-white shadow-sm' : 'text-rose-400 hover:text-rose-300'
                    }`}
                  >
                    ❌ Reds
                  </button>
                </div>

                {/* Club search */}
                <input
                  type="text"
                  placeholder="Pesquisar equipa ou liga..."
                  value={searchFilter}
                  onChange={(e) => setSearchFilter(e.target.value)}
                  className="bg-black/80 border border-zinc-800 text-xs font-mono text-white rounded-lg px-2.5 py-1 focus:outline-none focus:border-emerald-500/80 w-36 sm:w-48 placeholder-zinc-500"
                />
              </div>
            </div>

            {/* Table */}
            <div className="overflow-x-auto max-h-[480px] scrollbar-thin">
              <table className="w-full text-left border-collapse text-xs font-mono">
                <thead>
                  <tr className="bg-zinc-900/80 text-[11px] text-zinc-400 uppercase tracking-wider border-b border-zinc-800">
                    <th className="py-2.5 px-3">Data / Hora</th>
                    <th className="py-2.5 px-3">Liga</th>
                    <th className="py-2.5 px-3">Confronto</th>
                    <th className="py-2.5 px-3 text-center">Placar Real</th>
                    <th className="py-2.5 px-3">Previsão IA</th>
                    <th className="py-2.5 px-3 text-center">Odd</th>
                    <th className="py-2.5 px-3 text-center">Desfecho</th>
                    <th className="py-2.5 px-3 text-right">Retorno</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-zinc-850">
                  {filteredMatchesList.length === 0 ? (
                    <tr>
                      <td colSpan={8} className="py-8 text-center text-zinc-500 font-mono text-xs">
                        Nenhum jogo finalizado encontrado com os filtros atuais.
                      </td>
                    </tr>
                  ) : (
                    filteredMatchesList.map((item) => (
                      <tr key={item.matchKey} className="hover:bg-zinc-900/50 transition-colors">
                        <td className="py-2.5 px-3 whitespace-nowrap text-zinc-400">
                          {item.date} <span className="text-zinc-500">{item.time}</span>
                        </td>
                        <td className="py-2.5 px-3 whitespace-nowrap text-zinc-300 font-bold truncate max-w-[130px]">
                          {item.league}
                        </td>
                        <td className="py-2.5 px-3 whitespace-nowrap text-white font-bold">
                          <span>{item.homeTeam}</span>
                          <span className="text-zinc-500 mx-1.5 font-normal">vs</span>
                          <span>{item.awayTeam}</span>
                        </td>
                        <td className="py-2.5 px-3 whitespace-nowrap text-center font-black">
                          <span className="px-2 py-0.5 rounded bg-zinc-900 border border-zinc-750 text-emerald-300 font-mono">
                            {item.scoreText}
                          </span>
                        </td>
                        <td className="py-2.5 px-3 whitespace-nowrap">
                          <span className="px-2 py-0.5 rounded bg-purple-950/60 text-purple-300 border border-purple-500/30 font-bold text-[11px]">
                            🤖 {item.aiPredictionText}
                          </span>
                        </td>
                        <td className="py-2.5 px-3 whitespace-nowrap text-center font-bold text-amber-300">
                          @{item.chosenOdd}
                        </td>
                        <td className="py-2.5 px-3 whitespace-nowrap text-center">
                          {item.outcome === 'GREEN' ? (
                            <span className="px-2 py-0.5 rounded-full bg-emerald-500/20 text-emerald-300 border border-emerald-500/40 font-black text-[10px]">
                              ✅ GREEN
                            </span>
                          ) : (
                            <span className="px-2 py-0.5 rounded-full bg-rose-500/20 text-rose-300 border border-rose-500/40 font-black text-[10px]">
                              ❌ RED
                            </span>
                          )}
                        </td>
                        <td className="py-2.5 px-3 whitespace-nowrap text-right font-black">
                          <span className={item.profitUnits > 0 ? 'text-emerald-400' : 'text-rose-400'}>
                            {item.profitUnits > 0 ? `+${item.profitUnits} U` : `${item.profitUnits} U`}
                          </span>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </>
      )}

    </div>
  );
};

export default AdminAiPerformanceAuditPanel;
