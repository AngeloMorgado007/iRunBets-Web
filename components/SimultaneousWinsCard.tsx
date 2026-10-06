import React, { useState } from 'react';
import {
  TeamSelectionItem,
  SimultaneousWinsAnalysisResult,
  analyzeSimultaneousWins
} from '../services/simultaneousWinsService';

interface SimultaneousWinsCardProps {
  selections: TeamSelectionItem[];
  combinedOdd?: string | number;
  onClose?: () => void;
  isModal?: boolean;
}

export const SimultaneousWinsCard: React.FC<SimultaneousWinsCardProps> = ({
  selections,
  combinedOdd,
  onClose,
  isModal = false
}) => {
  const [loadingGemini, setLoadingGemini] = useState(false);
  const [geminiData, setGeminiData] = useState<{
    scoutVerdict?: string;
    historicalSimultaneousNote?: string;
    repeatedTeamsInsight?: string;
    weakestLinkAlert?: string;
    expectedValueComment?: string;
  } | null>(null);
  const [geminiError, setGeminiError] = useState<string | null>(null);

  // Computar análise instantânea
  const analysis: SimultaneousWinsAnalysisResult = React.useMemo(() => {
    return analyzeSimultaneousWins(selections);
  }, [selections]);

  const handleFetchGeminiScout = async () => {
    setLoadingGemini(true);
    setGeminiError(null);
    try {
      const res = await fetch('/api/gemini/analyze-simultaneous-wins', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          selections: selections.map(s => ({
            team: s.team,
            opponent: s.opponent,
            date: s.matchDate,
            odd: s.odd,
            league: s.league
          })),
          totalOdd: combinedOdd || analysis.combinedOdd
        })
      });

      const data = await res.json();
      if (res.ok && data.status === 'success') {
        setGeminiData(data.data);
      } else {
        setGeminiError(data.message || 'Não foi possível contactar o serviço de IA em tempo real.');
      }
    } catch (err: any) {
      console.error('Erro Gemini Simultaneous Wins:', err);
      setGeminiError('Ocorreu uma falha ao comunicar com o servidor da SuperIA.');
    } finally {
      setLoadingGemini(false);
    }
  };

  const containerContent = (
    <div className="bg-[#0b0e14] border border-[#00E676]/35 rounded-3xl p-5 md:p-6 text-zinc-100 shadow-[0_0_40px_rgba(0,230,118,0.12)] relative space-y-6">
      {/* HEADER */}
      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-zinc-850 pb-4">
        <div className="flex items-center gap-2.5">
          <span className="flex h-3 w-3 relative">
            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-[#00E676] opacity-75"></span>
            <span className="relative inline-flex rounded-full h-3 w-3 bg-[#00E676]"></span>
          </span>
          <div>
            <h3 className="text-sm md:text-base font-black uppercase text-white font-mono tracking-wider flex items-center gap-2">
              <span>SuperIA • Vitórias em Simultâneo</span>
              <span className="text-[10px] px-2 py-0.5 rounded-full bg-[#00E676]/20 text-[#00E676] border border-[#00E676]/40 font-mono">
                {analysis.totalSelections} Equipas / Seleções
              </span>
            </h3>
            <p className="text-[11px] text-zinc-400 font-mono mt-0.5">
              Co-ocorrência histórica e probabilidade conjunta em jornadas comparáveis
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <span className={`px-3 py-1 rounded-xl text-xs font-black font-mono uppercase tracking-wider border ${analysis.aiVerdictColor}`}>
            {analysis.aiVerdict}
          </span>
          {isModal && onClose && (
            <button
              onClick={onClose}
              type="button"
              className="w-8 h-8 rounded-xl bg-zinc-850 hover:bg-zinc-800 text-zinc-400 hover:text-white flex items-center justify-center font-mono cursor-pointer transition-colors"
            >
              ✕
            </button>
          )}
        </div>
      </div>

      {/* HERO METRIC BLOCK */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-3.5">
        {/* Metric 1: Pleno Simultâneo */}
        <div className="bg-[#101622] border border-[#00E676]/30 rounded-2xl p-4 flex flex-col justify-between relative overflow-hidden">
          <div className="absolute right-2 top-2 text-3xl opacity-10 font-mono">🏆</div>
          <span className="text-[10px] uppercase font-bold text-zinc-400 font-mono">
            Vitórias Plenas em Simultâneo
          </span>
          <div className="my-2">
            <div className="text-2xl md:text-3xl font-black text-[#00E676] font-mono flex items-baseline gap-1.5">
              <span>{analysis.simultaneousWinsOccurrences}</span>
              <span className="text-xs text-zinc-400 font-normal">/ {analysis.totalHistoricalRoundsEvaluated} jornadas</span>
            </div>
            <div className="text-[11px] text-zinc-400 font-mono">
              Taxa real: <strong className="text-white">{analysis.simultaneousWinRate}%</strong> das rondas
            </div>
          </div>
          <div className="w-full bg-zinc-850 h-1.5 rounded-full overflow-hidden">
            <div
              className="bg-[#00E676] h-full rounded-full transition-all duration-500"
              style={{ width: `${Math.min(100, Math.max(5, analysis.simultaneousWinRate))}%` }}
            ></div>
          </div>
        </div>

        {/* Metric 2: Odd Combinada */}
        <div className="bg-[#101622] border border-zinc-800 rounded-2xl p-4 flex flex-col justify-between">
          <span className="text-[10px] uppercase font-bold text-zinc-400 font-mono">
            Odd Combinada do Boletim
          </span>
          <div className="my-2">
            <div className="text-2xl md:text-3xl font-black text-cyan-400 font-mono">
              @{combinedOdd || analysis.combinedOdd}
            </div>
            <div className="text-[11px] text-zinc-400 font-mono">
              Prob. Implícita Casa: <strong className="text-zinc-300">{analysis.theoreticalProbability}%</strong>
            </div>
          </div>
          <span className="text-[10px] text-zinc-500 font-mono">
            Projeção matemática das cotas
          </span>
        </div>

        {/* Metric 3: Valor Esperado (+EV) */}
        <div className="bg-[#101622] border border-zinc-800 rounded-2xl p-4 flex flex-col justify-between">
          <span className="text-[10px] uppercase font-bold text-zinc-400 font-mono">
            Valor Esperado da SuperIA
          </span>
          <div className="my-2">
            <div className={`text-2xl md:text-3xl font-black font-mono ${analysis.expectedValueEV >= 0 ? 'text-[#00E676]' : 'text-amber-400'}`}>
              {analysis.expectedValueEV > 0 ? `+${analysis.expectedValueEV}%` : `${analysis.expectedValueEV}%`}
            </div>
            <div className="text-[11px] text-zinc-400 font-mono">
              {analysis.expectedValueEV >= 0 ? 'Rentabilidade Positiva (+EV)' : 'Odd Abaixo do Histórico'}
            </div>
          </div>
          <span className="text-[10px] text-zinc-500 font-mono">
            Frequência Real vs Odd Oferecida
          </span>
        </div>

        {/* Metric 4: Equipas Únicas / Repetidas */}
        <div className="bg-[#101622] border border-purple-500/30 rounded-2xl p-4 flex flex-col justify-between">
          <span className="text-[10px] uppercase font-bold text-purple-300 font-mono flex items-center justify-between">
            <span>Composição do Boletim</span>
            {analysis.hasRepeatedTeams && <span className="text-[9px] text-purple-400 bg-purple-500/20 px-1.5 py-0.5 rounded">Repetições</span>}
          </span>
          <div className="my-2">
            <div className="text-2xl md:text-3xl font-black text-purple-400 font-mono">
              {analysis.distinctTeamsCount} <span className="text-xs text-zinc-400 font-normal">clubes distintos</span>
            </div>
            <div className="text-[11px] text-zinc-400 font-mono">
              {analysis.hasRepeatedTeams 
                ? `${analysis.repeatedTeams.length} equipa(s) em datas diferentes`
                : '1 jogo por equipa no lote'}
            </div>
          </div>
          <span className="text-[10px] text-zinc-500 font-mono">
            {analysis.totalSelections} seleções acumuladas
          </span>
        </div>
      </div>

      {/* ALERTA CRÍTICO SE HOUVER EQUIPAS REPETIDAS EM DATAS DIFERENTES */}
      {analysis.hasRepeatedTeams && (
        <div className="bg-purple-950/30 border border-purple-500/40 rounded-2xl p-4 space-y-2">
          <div className="flex items-center gap-2 text-xs font-bold font-mono text-purple-300 uppercase tracking-wide">
            <span>🔄 Análise Especial: Equipas Repetidas em Datas Diferentes</span>
          </div>
          {analysis.repeatedTeams.map((rep, idx) => (
            <div key={idx} className="text-xs text-zinc-300 font-mono leading-relaxed bg-black/40 p-3 rounded-xl border border-purple-500/20">
              <strong className="text-purple-300">{rep.team}</strong> surge <strong>{rep.count} vezes</strong> neste mesmo boletim em datas distintas ({rep.dates.join(', ')}). 
              A SuperIA calculou a probabilidade condicional de vitória consecutiva (taxa histórica de <strong className="text-[#00E676]">{rep.consecutiveWinRate}%</strong> no mesmo ciclo) para que ambos os jogos sejam ganhos e o boletim se mantenha vivo.
            </div>
          ))}
        </div>
      )}

      {/* DISTRIBUIÇÃO DE SUCESSO (PLENO, N-1, N-2) */}
      <div className="space-y-2.5">
        <div className="flex items-center justify-between text-xs font-mono">
          <span className="text-zinc-400 uppercase font-bold tracking-wider">
            📊 Desdobramento Histórico por Número de Vitórias:
          </span>
          <span className="text-zinc-500 text-[11px]">
            Base de amostragem: {analysis.totalHistoricalRoundsEvaluated} jornadas
          </span>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5">
          {analysis.distributionBySuccess.map((item, idx) => (
            <div 
              key={idx}
              className={`p-3 rounded-xl border flex flex-col justify-between font-mono ${
                idx === 0 
                  ? 'bg-[#00E676]/10 border-[#00E676]/40 text-[#00E676]' 
                  : 'bg-zinc-900/60 border-zinc-800 text-zinc-300'
              }`}
            >
              <div className="flex justify-between items-center text-xs">
                <span className="font-bold">
                  {item.wonCount === analysis.totalSelections ? '⭐ Pleno (Todas Vencem)' : `${item.wonCount} de ${analysis.totalSelections} Equipas`}
                </span>
                <span className="text-[10px] opacity-75">{item.percentage}%</span>
              </div>
              <div className="mt-1.5 text-lg font-black">
                {item.occurrences} <span className="text-xs font-normal opacity-80">ocorrências históricas</span>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* ANÁLISE SELEÇÃO A SELEÇÃO (TABELA) */}
      <div className="space-y-2.5">
        <div className="flex items-center justify-between text-xs font-mono">
          <span className="text-zinc-400 uppercase font-bold tracking-wider">
            📋 Raio-X Individual de Cada Equipa no Boletim:
          </span>
          <span className="text-zinc-500 text-[11px]">
            Forma nos últimos 10 jogos
          </span>
        </div>

        <div className="overflow-x-auto rounded-2xl border border-zinc-800">
          <table className="w-full text-left text-xs font-mono">
            <thead className="bg-zinc-900/80 text-zinc-400 text-[10px] uppercase border-b border-zinc-800">
              <tr>
                <th className="py-2.5 px-3">#</th>
                <th className="py-2.5 px-3">Equipa Selecionada</th>
                <th className="py-2.5 px-3">Adversário / Liga</th>
                <th className="py-2.5 px-3">Data</th>
                <th className="py-2.5 px-3">Odd</th>
                <th className="py-2.5 px-3">Taxa Vitória</th>
                <th className="py-2.5 px-3">Últimos 10 Jogos</th>
                <th className="py-2.5 px-3">Perfil</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-zinc-850/70 bg-[#080b10]">
              {analysis.selections.map((sel, idx) => (
                <tr key={idx} className="hover:bg-zinc-900/40 transition-colors">
                  <td className="py-2.5 px-3 text-zinc-500">{idx + 1}</td>
                  <td className="py-2.5 px-3 font-bold text-white flex items-center gap-1.5">
                    <span>{sel.team}</span>
                    {sel.isRepeated && (
                      <span className="text-[9px] px-1.5 py-0.2 rounded bg-purple-500/20 text-purple-300 font-normal border border-purple-500/30" title="Equipa repetida no mesmo boletim">
                        Repetida #{sel.repeatIndex}
                      </span>
                    )}
                  </td>
                  <td className="py-2.5 px-3 text-zinc-400">
                    <span className="truncate max-w-[120px] block">{sel.opponent}</span>
                    <span className="text-[9px] text-zinc-500">{sel.league}</span>
                  </td>
                  <td className="py-2.5 px-3 text-zinc-300">{sel.matchDate}</td>
                  <td className="py-2.5 px-3 text-cyan-400 font-bold">@{sel.odd.toFixed(2)}</td>
                  <td className="py-2.5 px-3 text-[#00E676] font-bold">{sel.winProbability}%</td>
                  <td className="py-2.5 px-3">
                    <div className="flex gap-0.5">
                      {sel.formLast10.map((f, fi) => (
                        <span
                          key={fi}
                          className={`w-3.5 h-3.5 rounded text-[8px] font-bold flex items-center justify-center ${
                            f === 'V'
                              ? 'bg-[#00E676]/20 text-[#00E676]'
                              : f === 'E'
                              ? 'bg-amber-500/20 text-amber-400'
                              : 'bg-rose-500/20 text-rose-400'
                          }`}
                        >
                          {f}
                        </span>
                      ))}
                    </div>
                  </td>
                  <td className="py-2.5 px-3">
                    <span
                      className={`text-[9px] px-2 py-0.5 rounded-full font-bold uppercase ${
                        sel.riskTier.includes('Baixo')
                          ? 'bg-[#00E676]/15 text-[#00E676] border border-[#00E676]/30'
                          : sel.riskTier.includes('Elevado')
                          ? 'bg-rose-500/15 text-rose-400 border border-rose-500/30'
                          : 'bg-amber-500/15 text-amber-400 border border-amber-500/30'
                      }`}
                    >
                      {sel.riskTier.split(' ')[0]}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* DESTAQUES: ELO MAIS FRACO & ÂNCORA */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-3.5">
        <div className="bg-rose-950/20 border border-rose-500/30 rounded-2xl p-4 font-mono space-y-1.5">
          <div className="flex items-center gap-2 text-rose-400 font-bold text-xs uppercase">
            <span>⚠️ Elo Mais Fraco (Ponto Crítico de Quebra)</span>
          </div>
          <div className="text-sm font-black text-white">{analysis.weakestLink.team}</div>
          <p className="text-xs text-zinc-300 leading-relaxed">{analysis.weakestLink.reason}</p>
          <div className="text-[10px] text-rose-300">Risco estimado de tropeço: {analysis.weakestLink.dropRiskPercent}%</div>
        </div>

        <div className="bg-[#00E676]/10 border border-[#00E676]/30 rounded-2xl p-4 font-mono space-y-1.5">
          <div className="flex items-center gap-2 text-[#00E676] font-bold text-xs uppercase">
            <span>🛡️ Âncora de Segurança da Múltipla</span>
          </div>
          <div className="text-sm font-black text-white">{analysis.strongestAnchor.team}</div>
          <p className="text-xs text-zinc-300 leading-relaxed">{analysis.strongestAnchor.reason}</p>
          <div className="text-[10px] text-[#00E676]">Índice de fiabilidade: {analysis.strongestAnchor.safetyScore}/100</div>
        </div>
      </div>

      {/* SÍNTESE EXPLICATIVA */}
      <div className="bg-[#0f141d] border border-zinc-800 rounded-2xl p-4 text-xs font-mono text-zinc-300 leading-relaxed">
        <strong className="text-white block mb-1">🧠 Veredito e Explicação da SuperIA:</strong>
        {analysis.aiExplanation}
      </div>

      {/* GEMINI DEEP SCOUT ACTION */}
      <div className="pt-2 border-t border-zinc-850 flex flex-col sm:flex-row items-center justify-between gap-3">
        <div className="text-xs text-zinc-400 font-mono">
          Desejas fundamentação ao vivo com pesquisa Google Grounding sobre baixas e calendário?
        </div>
        <button
          type="button"
          disabled={loadingGemini}
          onClick={handleFetchGeminiScout}
          className="px-4 py-2.5 rounded-xl bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-500 hover:to-indigo-500 text-white font-bold text-xs font-mono uppercase tracking-wider transition-all shadow-lg shadow-purple-600/20 active:scale-95 cursor-pointer flex items-center gap-2"
        >
          {loadingGemini ? (
            <>
              <span className="w-3.5 h-3.5 border-2 border-white border-t-transparent rounded-full animate-spin"></span>
              <span>A Consultar Gemini IA...</span>
            </>
          ) : (
            <>
              <span>🤖 Aprofundar com Gemini IA (Live Scout)</span>
            </>
          )}
        </button>
      </div>

      {/* GEMINI SCOUT RESULT IF LOADED */}
      {geminiData && (
        <div className="bg-purple-950/25 border border-purple-500/50 rounded-2xl p-4 font-mono space-y-3 animate-fade-in">
          <div className="flex items-center justify-between">
            <span className="text-xs font-black uppercase text-purple-300 flex items-center gap-1.5">
              <span>✨ Relatório Especial do Gemini Scout IA</span>
            </span>
            <span className="text-[10px] text-zinc-400 font-mono">Google Search Grounding Ativo</span>
          </div>

          {geminiData.scoutVerdict && (
            <p className="text-xs text-zinc-200 leading-relaxed">
              <strong className="text-purple-300">Veredito do Analista:</strong> {geminiData.scoutVerdict}
            </p>
          )}

          {geminiData.historicalSimultaneousNote && (
            <p className="text-xs text-zinc-300 leading-relaxed">
              <strong className="text-[#00E676]">Co-Ocorrência Histórica:</strong> {geminiData.historicalSimultaneousNote}
            </p>
          )}

          {geminiData.repeatedTeamsInsight && (
            <p className="text-xs text-purple-200 leading-relaxed bg-black/40 p-2.5 rounded-xl border border-purple-500/20">
              <strong>Equipas Repetidas:</strong> {geminiData.repeatedTeamsInsight}
            </p>
          )}

          {geminiData.weakestLinkAlert && (
            <p className="text-xs text-rose-300 leading-relaxed">
              <strong>Aviso de Ponto de Risco:</strong> {geminiData.weakestLinkAlert}
            </p>
          )}

          {geminiData.expectedValueComment && (
            <p className="text-xs text-cyan-300 leading-relaxed">
              <strong>Valor Esperado (+EV):</strong> {geminiData.expectedValueComment}
            </p>
          )}
        </div>
      )}

      {geminiError && (
        <div className="p-3 rounded-xl bg-rose-500/10 border border-rose-500/30 text-rose-300 text-xs font-mono">
          {geminiError}
        </div>
      )}
    </div>
  );

  if (isModal) {
    return (
      <div className="fixed inset-0 bg-black/85 backdrop-blur-xl z-[99999] flex items-center justify-center p-3 md:p-6 overflow-y-auto animate-fade-in">
        <div className="relative w-full max-w-4xl max-h-[92vh] overflow-y-auto scrollbar-thin">
          {containerContent}
        </div>
      </div>
    );
  }

  return containerContent;
};
