import React from 'react';
import { createPortal } from 'react-dom';
import { 
  AlertTriangle, 
  ShieldAlert, 
  Sparkles, 
  Flame, 
  TrendingUp, 
  CheckCircle2, 
  Send, 
  X, 
  Target, 
  RefreshCw, 
  Sliders, 
  Activity,
  Award,
  ChevronRight,
  Bot,
  FileText
} from 'lucide-react';

interface TeamCoachAnalysisModalProps {
  isOpen: boolean;
  onClose: () => void;
  homeTeam: string;
  awayTeam: string;
  simLeague: string;
  homeGoals: string;
  awayGoals: string;
  homePosition?: number | string | null;
  awayPosition?: number | string | null;
  homeForm?: { wins: number; draws: number; losses: number } | null;
  awayForm?: { wins: number; draws: number; losses: number } | null;
  realStatsExplanation?: string;
  loadingFetchRealStats?: boolean;
  onFetchRealStats?: () => void;
  coachSupport: 'aligned' | 'shaky' | 'broken';
  setCoachSupport?: (val: 'aligned' | 'shaky' | 'broken') => void;
  surpriseRisk: number;
  setSurpriseRisk?: (val: number) => void;
  tacticalRigor: 'standard' | 'cup_groups' | 'cup_knockout';
  lawnState: 'excelente' | 'humido' | 'lama' | 'artificial';
  weather: 'bom' | 'chuva' | 'vento' | 'calor';
  keyInjuries: 'nenhuma' | 'casa' | 'fora' | 'ambas';
  homeMotivation: number;
  awayMotivation: number;
  homeCoachChicotada: boolean;
  setHomeCoachChicotada: (val: boolean) => void;
  homePlayersWithCoach: boolean;
  setHomePlayersWithCoach: (val: boolean) => void;
  homeBondedTeam: boolean;
  setHomeBondedTeam: (val: boolean) => void;
  awayCoachChicotada: boolean;
  setAwayCoachChicotada: (val: boolean) => void;
  awayPlayersWithCoach: boolean;
  setAwayPlayersWithCoach: (val: boolean) => void;
  awayBondedTeam: boolean;
  setAwayBondedTeam: (val: boolean) => void;
  predictionResult: any;
  bestPossibleBet: {
    selection: string;
    confidence: string;
    targetOdd: string;
    rationale: string;
    isHighRisk?: boolean;
  };
  smartSelection: {
    bet: string;
    odd: string;
    isHighRisk?: boolean;
    riskReason?: string;
  };
  aiReport?: string;
  loadingAi?: boolean;
  onGenerateAiReport?: () => void;
  onApplyFactorsAndRecalculate: () => void;
  onSendToBetSlip: () => void;
  onSendToHomepage: () => void;
  language: string;
}

export const TeamCoachAnalysisModal: React.FC<TeamCoachAnalysisModalProps> = ({
  isOpen,
  onClose,
  homeTeam,
  awayTeam,
  simLeague,
  homeGoals,
  awayGoals,
  homePosition,
  awayPosition,
  homeForm,
  awayForm,
  realStatsExplanation,
  loadingFetchRealStats,
  onFetchRealStats,
  coachSupport,
  setCoachSupport,
  surpriseRisk,
  setSurpriseRisk,
  tacticalRigor,
  lawnState,
  weather,
  keyInjuries,
  homeMotivation,
  awayMotivation,
  homeCoachChicotada,
  setHomeCoachChicotada,
  homePlayersWithCoach,
  setHomePlayersWithCoach,
  homeBondedTeam,
  setHomeBondedTeam,
  awayCoachChicotada,
  setAwayCoachChicotada,
  awayPlayersWithCoach,
  setAwayPlayersWithCoach,
  awayBondedTeam,
  setAwayBondedTeam,
  predictionResult,
  bestPossibleBet,
  smartSelection,
  aiReport,
  loadingAi,
  onGenerateAiReport,
  onApplyFactorsAndRecalculate,
  onSendToBetSlip,
  onSendToHomepage,
  language = 'pt'
}) => {
  if (!isOpen) return null;

  const isPt = language === 'pt';

  // Compute total expected goals
  const hGNum = parseFloat(homeGoals) || 1.6;
  const aGNum = parseFloat(awayGoals) || 1.1;
  const totalExpGoals = (hGNum + aGNum).toFixed(2);

  // Detect high risk condition
  const hasLockerRoomIssues = homeCoachChicotada || !homePlayersWithCoach || awayCoachChicotada || !awayPlayersWithCoach;
  const isHighRisk = surpriseRisk >= 3 || coachSupport === 'broken' || hasLockerRoomIssues;

  // Single Best Bet derivation
  let singleBestBetTitle = smartSelection?.bet || bestPossibleBet?.selection || 'Mais de 1.5 Golos';
  let singleBestBetOdd = smartSelection?.odd || bestPossibleBet?.targetOdd || '1.45';
  let singleBestBetConfidence = bestPossibleBet?.confidence || '88%';
  let singleBestBetRationale = bestPossibleBet?.rationale || '';

  // If high risk, ensure single best bet is strictly goals market and highlighted
  if (isHighRisk) {
    if (hGNum + aGNum >= 2.6 || (predictionResult && predictionResult.over25Prob > 55)) {
      singleBestBetTitle = isPt ? 'Mais de 2.0 / 2.5 Golos (Over)' : 'Over 2.0 / 2.5 Goals';
      singleBestBetOdd = predictionResult ? (100 / Math.max(50, predictionResult.over25Prob)).toFixed(2) : '1.65';
      singleBestBetConfidence = '86%';
      singleBestBetRationale = isPt
        ? `🚨 Fator de Risco / Desgaste Detetado (Risco ${surpriseRisk}/5). O mercado 1X2 é volátil. A IA direciona a recomendação para o Mercado de Golos "Mais de 2.0/2.5 Golos", contornando imprevistos no desfecho final.`
        : `🚨 High Risk / Volatility (${surpriseRisk}/5). 1X2 market is volatile. AI routes best bet strictly to Over Goals.`;
    } else if (hGNum + aGNum < 2.1 || lawnState === 'lama' || tacticalRigor === 'cup_knockout') {
      singleBestBetTitle = isPt ? 'Menos de 3.5 Golos (Under 3.5)' : 'Under 3.5 Goals';
      singleBestBetOdd = predictionResult ? (100 / Math.max(60, predictionResult.under35Prob)).toFixed(2) : '1.30';
      singleBestBetConfidence = '91%';
      singleBestBetRationale = isPt
        ? `🚨 Jogo Fechado / Alta Tensão Tática. Com risco de surpresa elevado e expectativa reduzida de finalização (${totalExpGoals} golos), o mercado mais seguro e com valor (+EV) é "Menos de 3.5 Golos".`
        : `🚨 Tight Game / Tactical Tension. High surprise risk and low goal expectation. Safest value market is Under 3.5 Goals.`;
    } else {
      singleBestBetTitle = isPt ? 'Mais de 1.5 Golos (Over 1.5)' : 'Over 1.5 Goals';
      singleBestBetOdd = predictionResult ? (100 / Math.max(70, predictionResult.over15Prob)).toFixed(2) : '1.35';
      singleBestBetConfidence = '89%';
      singleBestBetRationale = isPt
        ? `🚨 Proteção de Banca Ativa. Perante incógnitas no balneário e favoritismo instável, a IA seleciona a linha de segurança de Mais de 1.5 Golos para salvaguarda de banca.`
        : `🚨 Active Bankroll Protection. Due to locker room tension, AI selects Over 1.5 Goals safety line.`;
    }
  }

  // Format AI report lines
  const renderAiReportContent = (text: string) => {
    return text.split('\n').map((line, i) => {
      if (line.startsWith('### ')) {
        return <h4 key={i} className="text-xs font-bold text-[#00f2fe] uppercase mt-3 mb-1.5 tracking-wide font-display">{line.replace('### ', '')}</h4>;
      }
      if (line.startsWith('## ')) {
        return <h3 key={i} className="text-sm font-black text-white uppercase mt-4 mb-2 border-l-2 border-[#FFEF00] pl-2.5 font-display">{line.replace('## ', '')}</h3>;
      }
      if (line.startsWith('# ')) {
        return <h2 key={i} className="text-base font-black text-[#FFEF00] uppercase mt-4 mb-2 font-display pb-1 border-b border-zinc-800">{line.replace('# ', '')}</h2>;
      }
      if (line.startsWith('- ') || line.startsWith('* ')) {
        return <li key={i} className="text-xs text-zinc-300 font-light ml-4 list-disc mt-1 leading-relaxed">{line.substring(2)}</li>;
      }
      if (line.trim() === '') return <div key={i} className="h-1.5" />;
      
      const parts = line.split('**');
      if (parts.length > 1) {
        return (
          <p key={i} className="text-xs text-zinc-300 leading-relaxed mt-1">
            {parts.map((pPart, idx) => idx % 2 === 1 ? <strong key={idx} className="font-bold text-white pr-0.5">{pPart}</strong> : pPart)}
          </p>
        );
      }
      return <p key={i} className="text-xs text-zinc-300 leading-relaxed mt-1">{line}</p>;
    });
  };

  const modalContent = (
    <div 
      className="fixed inset-0 z-[999999] flex items-center justify-center p-2.5 sm:p-4 bg-black/85 backdrop-blur-md animate-fade-in overflow-hidden"
      id="modal-team-coach-analysis"
      onClick={(e) => {
        if (e.target === e.currentTarget) {
          onClose();
        }
      }}
    >
      <div 
        className="relative w-full max-w-4xl bg-[#09090D] border-2 border-[#FFEF00]/50 rounded-3xl shadow-[0_0_50px_rgba(255,239,0,0.18)] overflow-hidden flex flex-col max-h-[94vh] animate-scale-up"
      >
        {/* Modal Top Header Bar */}
        <div className="p-4 sm:p-5 bg-[#0E0E14] border-b border-[#FFEF00]/30 flex items-center justify-between gap-3 shrink-0">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-gradient-to-br from-[#FFEF00]/20 to-yellow-500/10 border border-[#FFEF00]/50 flex items-center justify-center text-[#FFEF00] shadow-[0_0_15px_rgba(255,239,0,0.25)]">
              <Sparkles className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="text-sm sm:text-base font-black text-white uppercase tracking-wider font-display">
                  {isPt ? 'ANÁLISE HÍBRIDA & DECISÃO DE APOSTA (IA + MATEMÁTICA)' : 'HYBRID AI ANALYSIS & BET SELECTION'}
                </h3>
                <span className="text-[9px] bg-[#FFEF00] text-black font-black px-2 py-0.5 rounded-md font-mono uppercase tracking-wider">
                  iRunBets PRO
                </span>
              </div>
              <p className="text-[11px] text-zinc-400 font-mono mt-0.5">
                {homeTeam || 'Casa'} <span className="text-[#FFEF00] font-bold">vs</span> {awayTeam || 'Fora'} • <span className="text-zinc-300">{simLeague || 'Liga'}</span>
              </p>
            </div>
          </div>

          <button 
            type="button"
            onClick={onClose}
            className="w-8 h-8 rounded-xl bg-zinc-900/80 border border-zinc-700/60 text-zinc-400 hover:text-white hover:border-[#FFEF00] transition-all flex items-center justify-center cursor-pointer text-lg font-bold font-mono shadow"
            id="btn-close-teamcoach-modal"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Modal Scrollable Body */}
        <div className="p-4 sm:p-6 space-y-5 overflow-y-auto scrollbar-thin max-h-[calc(94vh-135px)]">

          {/* 1. CONDICIONAL DE ALERTA DE RISCO ELEVADO (VERMELHO) */}
          {isHighRisk ? (
            <div className="p-4 sm:p-5 rounded-2xl bg-gradient-to-br from-red-950/80 via-red-900/40 to-black border-2 border-red-500/80 shadow-[0_0_25px_rgba(239,35,60,0.35)] space-y-2.5">
              <div className="flex items-center justify-between flex-wrap gap-2">
                <div className="flex items-center gap-2 text-red-400 font-black text-xs sm:text-sm uppercase font-mono tracking-wider">
                  <ShieldAlert className="w-5 h-5 text-red-500 animate-bounce" />
                  <span>🚨 {isPt ? 'ALERTA DE RISCO ELEVADO / FATOR ZEBRA DETETADO' : 'HIGH SURPRISE / RISK FACTOR DETECTED'}</span>
                </div>
                <div className="flex items-center gap-1.5">
                  <span className="text-[9px] bg-red-600 text-white font-black px-2.5 py-0.5 rounded-full font-mono uppercase tracking-wider shadow">
                    {isPt ? `Risco: ${surpriseRisk}/5` : `Risk: ${surpriseRisk}/5`}
                  </span>
                  {coachSupport === 'broken' && (
                    <span className="text-[9px] bg-red-950 border border-red-500 text-red-300 font-black px-2 py-0.5 rounded-full font-mono uppercase">
                      {isPt ? 'Balneário em Ruptura' : 'Locker Room Broken'}
                    </span>
                  )}
                </div>
              </div>
              <p className="text-[11px] sm:text-xs text-zinc-200 leading-relaxed font-sans font-medium">
                {isPt ? (
                  <>
                    <strong className="text-white">Atenção ao mercado 1X2:</strong> O modelo identificou elevado perigo de surpresa/zebra e instabilidade no balneário. Em cenários de alta volatilidade, apostar no vencedor direto apresenta risco excessivo de perda.
                    <br />
                    <span className="text-yellow-300 font-bold block mt-1.5 flex items-center gap-1.5">
                      <span>🛡️</span>
                      <span>
                        Por critério de proteção matemática, a IA <strong>descarta o mercado de vencedor</strong> e define como <strong>A MELHOR APOSTA O MERCADO DE GOLOS</strong>.
                      </span>
                    </span>
                  </>
                ) : (
                  <>
                    <strong className="text-white">Caution on 1X2 Market:</strong> High volatility and locker room tension detected. Direct match winner bets carry elevated risk. The AI automatically routes the single best bet to the <strong>GOALS MARKET</strong> for bankroll protection.
                  </>
                )}
              </p>
            </div>
          ) : (
            <div className="p-3.5 rounded-2xl bg-emerald-950/20 border border-emerald-500/30 flex items-center justify-between gap-3">
              <div className="flex items-center gap-2">
                <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
                <span className="text-[11px] font-bold text-emerald-300 font-sans">
                  {isPt 
                    ? 'Fatores de Balneário & Treinador Estáveis — Sem anomalias críticas de zebra detetadas.' 
                    : 'Stable Locker Room & Coach Dynamics — Normal statistical confidence.'}
                </span>
              </div>
              <span className="text-[9px] font-mono font-bold text-emerald-400 bg-emerald-500/10 px-2 py-0.5 rounded-lg border border-emerald-500/20 shrink-0">
                {isPt ? `Risco: ${surpriseRisk}/5 (Controlado)` : `Risk: ${surpriseRisk}/5`}
              </span>
            </div>
          )}

          {/* 2. 🎯 A MELHOR APOSTA (ÚNICA OPÇÃO DEVOLVIDA PELA IA) */}
          <div className="relative p-5 sm:p-6 rounded-3xl bg-gradient-to-br from-[#12121c] via-[#09090f] to-[#151522] border-2 border-[#00f2fe]/60 shadow-[0_0_30px_rgba(0,242,254,0.18)] space-y-4">
            
            {/* Top Label */}
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <div className="w-6 h-6 rounded-lg bg-[#FFEF00]/20 border border-[#FFEF00]/50 flex items-center justify-center text-[#FFEF00]">
                  <Flame className="w-4 h-4 fill-[#FFEF00]" />
                </div>
                <span className="text-[11px] sm:text-xs font-black uppercase text-[#FFEF00] font-mono tracking-wider">
                  {isPt ? '🎯 A MELHOR APOSTA POSSÍVEL (RECOMENDAÇÃO DA IA)' : '🎯 SINGLE BEST BET (AI SELECTION)'}
                </span>
              </div>
              <span className="text-[9px] bg-gradient-to-r from-[#00f2fe] to-emerald-400 text-black font-black font-mono px-3 py-1 rounded-full uppercase tracking-wider shadow">
                {isPt ? `CONFIANÇA: ${singleBestBetConfidence}` : `CONFIDENCE: ${singleBestBetConfidence}`}
              </span>
            </div>

            {/* Selection Card */}
            <div className="p-4 rounded-2xl bg-[#06060A] border border-[#00f2fe]/30 space-y-2">
              <div className="flex items-baseline justify-between flex-wrap gap-2">
                <h4 className="text-base sm:text-lg font-black text-white font-sans tracking-wide drop-shadow-[0_0_10px_rgba(255,255,255,0.2)]">
                  {singleBestBetTitle}
                </h4>
                <div className="flex items-center gap-2">
                  <span className="text-[10px] text-zinc-400 uppercase font-mono">{isPt ? 'Odd Justa / Alvo:' : 'Target Odd:'}</span>
                  <span className="text-base font-black font-mono text-[#00f2fe] bg-[#00f2fe]/10 border border-[#00f2fe]/30 px-3 py-0.5 rounded-xl shadow-[0_0_10px_rgba(0,242,254,0.25)]">
                    @ {singleBestBetOdd}
                  </span>
                </div>
              </div>

              <div className="pt-2 border-t border-zinc-850/80">
                <span className="text-[9px] text-zinc-400 uppercase font-mono font-bold block mb-1">
                  {isPt ? '💡 Justificação da Escolha:' : '💡 Analytical Rationale:'}
                </span>
                <p className="text-[11px] sm:text-xs text-zinc-300 leading-relaxed font-sans">
                  {singleBestBetRationale || (isPt 
                    ? `Seleção validada por modelação matemática Poisson Pro considerando médias de golos (${totalExpGoals} totais), solidez tática e o índice de risco do balneário.` 
                    : `Selection validated by mathematical model accounting for ${totalExpGoals} expected goals and team dynamics.`)}
                </p>
              </div>
            </div>

            {/* Action buttons inside Best Bet */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5 pt-1">
              <button
                type="button"
                onClick={() => {
                  onSendToBetSlip();
                  onClose();
                }}
                className="py-3 px-4 bg-gradient-to-r from-[#FFEF00] to-yellow-400 hover:from-yellow-300 hover:to-yellow-500 text-black font-black text-xs uppercase tracking-wider rounded-xl transition-all duration-150 flex items-center justify-center gap-2 shadow-[0_4px_15px_rgba(255,239,0,0.3)] hover:scale-[1.01] cursor-pointer"
                id="btn-modal-send-best-bet"
              >
                <Send className="w-4 h-4 text-black" />
                <span>{isPt ? '🛒 Inserir no Boletim de Apostas' : '🛒 Add to Betting Slip'}</span>
              </button>

              <button
                type="button"
                onClick={() => {
                  onSendToHomepage();
                  onClose();
                }}
                className="py-3 px-4 bg-zinc-900 hover:bg-zinc-850 text-white font-bold text-xs uppercase tracking-wider rounded-xl border border-zinc-700 hover:border-[#00f2fe] transition-all flex items-center justify-center gap-2 cursor-pointer shadow"
                id="btn-modal-send-homepage"
              >
                <Award className="w-4 h-4 text-[#00f2fe]" />
                <span>{isPt ? '⭐ Publicar em Destaque' : '⭐ Publish Highlight'}</span>
              </button>
            </div>
          </div>

          {/* 3. RESUMO DA ANÁLISE DE DADOS (PESQUISAR DADOS & CONFRONTO) */}
          <div className="p-5 rounded-2xl bg-[#0D0D14] border border-zinc-800 space-y-3.5">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Activity className="w-4 h-4 text-[#00f2fe]" />
                <h4 className="text-xs font-black uppercase text-white font-mono tracking-wider">
                  {isPt ? '📊 RESUMO DA ANÁLISE DE DADOS & PESQUISA' : '📊 RESEARCH DATA & STATS SUMMARY'}
                </h4>
              </div>
              {onFetchRealStats && (
                <button
                  type="button"
                  onClick={onFetchRealStats}
                  disabled={loadingFetchRealStats}
                  className="text-[10px] font-bold font-mono text-[#00f2fe] hover:text-white bg-[#00f2fe]/10 hover:bg-[#00f2fe]/20 border border-[#00f2fe]/30 px-2.5 py-1 rounded-lg transition-all flex items-center gap-1.5 cursor-pointer disabled:opacity-50"
                  id="btn-modal-refresh-data"
                >
                  <RefreshCw className={`w-3 h-3 ${loadingFetchRealStats ? 'animate-spin' : ''}`} />
                  <span>{loadingFetchRealStats ? (isPt ? 'A Pesquisar...' : 'Searching...') : (isPt ? '⚡ Atualizar Dados IA' : '⚡ Refresh IA Stats')}</span>
                </button>
              )}
            </div>

            {/* Quick Metrics Grid */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 text-center font-mono">
              <div className="p-2.5 rounded-xl bg-black/60 border border-zinc-850">
                <span className="text-[8.5px] uppercase text-zinc-500 font-bold block">{homeTeam || 'Casa'} (xG)</span>
                <span className="text-sm font-black text-[#00f2fe]">{homeGoals}</span>
                <span className="text-[8px] text-zinc-500 block mt-0.5">Motiv: {homeMotivation}%</span>
              </div>
              <div className="p-2.5 rounded-xl bg-black/60 border border-zinc-850">
                <span className="text-[8.5px] uppercase text-zinc-500 font-bold block">{awayTeam || 'Fora'} (xG)</span>
                <span className="text-sm font-black text-pink-400">{awayGoals}</span>
                <span className="text-[8px] text-zinc-500 block mt-0.5">Motiv: {awayMotivation}%</span>
              </div>
              <div className="p-2.5 rounded-xl bg-black/60 border border-zinc-850">
                <span className="text-[8.5px] uppercase text-zinc-500 font-bold block">{isPt ? 'Golos Totais' : 'Total Goals'}</span>
                <span className="text-sm font-black text-yellow-300">{totalExpGoals}</span>
                <span className="text-[8px] text-zinc-500 block mt-0.5">{isPt ? 'Média Prevista' : 'Expected'}</span>
              </div>
              <div className="p-2.5 rounded-xl bg-black/60 border border-zinc-850">
                <span className="text-[8.5px] uppercase text-zinc-500 font-bold block">{isPt ? 'Balneário / Risco' : 'Locker / Risk'}</span>
                <span className={`text-xs font-black ${isHighRisk ? 'text-red-400' : 'text-emerald-400'}`}>
                  {isHighRisk ? (isPt ? '⚠️ Instável' : '⚠️ High Risk') : (isPt ? '✅ 100% Unido' : '✅ Aligned')}
                </span>
                <span className="text-[8px] text-zinc-500 block mt-0.5">{isPt ? `Risco: ${surpriseRisk}/5` : `Risk: ${surpriseRisk}/5`}</span>
              </div>
            </div>

            {/* Structured Text Summary */}
            <div className="p-3.5 rounded-xl bg-black/70 border border-zinc-850 space-y-1.5">
              <span className="text-[9px] uppercase font-mono font-bold text-zinc-400 flex items-center gap-1.5">
                <Target className="w-3 h-3 text-[#FFEF00]" />
                <span>{isPt ? 'Síntese Analítica do Confronto:' : 'Analytical Match Synthesis:'}</span>
              </span>
              <p className="text-[11px] text-zinc-300 leading-relaxed font-sans">
                {realStatsExplanation ? (
                  realStatsExplanation
                ) : (
                  isPt ? (
                    `Confronto entre ${homeTeam || 'a equipa da casa'} e ${awayTeam || 'a equipa visitante'} no campeonato ${simLeague}. A modelagem aponta para um volume ofensivo com ${totalExpGoals} golos esperados totais. Relvado em estado ${lawnState}, condições climatéricas com ${weather} e rigor tático ${tacticalRigor === 'standard' ? 'de Liga Regular' : tacticalRigor === 'cup_groups' ? 'de fase de grupos internacional' : 'decisivo de eliminatória'}. A estabilidade do balneário e a motivação (${homeMotivation}% vs ${awayMotivation}%) foram ponderadas para ajustar as odds da partida.`
                  ) : (
                    `Match between ${homeTeam} and ${awayTeam} in ${simLeague}. Modeled with ${totalExpGoals} expected goals rate. Grass condition is ${lawnState} under ${weather} weather.`
                  )
                )}
              </p>
            </div>
          </div>

          {/* 4. AS MELHORES OPÇÕES DE APOSTAS AVALIADAS (QUADRO COMPARATIVO) */}
          <div className="p-5 rounded-2xl bg-[#0D0D14] border border-zinc-800 space-y-3">
            <div className="flex items-center gap-2">
              <TrendingUp className="w-4 h-4 text-emerald-400" />
              <h4 className="text-xs font-black uppercase text-white font-mono tracking-wider">
                {isPt ? '📈 TODAS AS OPÇÕES DE APOSTAS AVALIADAS' : '📈 ALL EVALUATED BETTING OPTIONS'}
              </h4>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-xs">
              {/* 1X2 Home */}
              <div className={`p-3 rounded-xl border flex items-center justify-between ${
                !isHighRisk && predictionResult?.homeWinProb > 50 
                  ? 'bg-emerald-950/20 border-emerald-500/40 text-white' 
                  : 'bg-black/40 border-zinc-850 text-zinc-300'
              }`}>
                <div>
                  <span className="font-bold block">{homeTeam || 'Casa'} Vence (1)</span>
                  <span className="text-[9px] text-zinc-500 font-mono">Probabilidade: {predictionResult?.homeWinProb?.toFixed(1) || 45}%</span>
                </div>
                <span className="font-mono font-bold text-[#00f2fe] bg-zinc-900 px-2 py-0.5 rounded border border-zinc-800">
                  @{predictionResult?.fairHomeOdd?.toFixed(2) || '2.20'}
                </span>
              </div>

              {/* 1X2 Away */}
              <div className={`p-3 rounded-xl border flex items-center justify-between ${
                !isHighRisk && predictionResult?.awayWinProb > 50 
                  ? 'bg-emerald-950/20 border-emerald-500/40 text-white' 
                  : 'bg-black/40 border-zinc-850 text-zinc-300'
              }`}>
                <div>
                  <span className="font-bold block">{awayTeam || 'Fora'} Vence (2)</span>
                  <span className="text-[9px] text-zinc-500 font-mono">Probabilidade: {predictionResult?.awayWinProb?.toFixed(1) || 28}%</span>
                </div>
                <span className="font-mono font-bold text-pink-400 bg-zinc-900 px-2 py-0.5 rounded border border-zinc-800">
                  @{predictionResult?.fairAwayOdd?.toFixed(2) || '3.55'}
                </span>
              </div>

              {/* Over 1.5 */}
              <div className={`p-3 rounded-xl border flex items-center justify-between ${
                (predictionResult?.over15Prob || 75) > 70 
                  ? 'bg-[#00f2fe]/10 border-[#00f2fe]/40 text-white' 
                  : 'bg-black/40 border-zinc-850 text-zinc-300'
              }`}>
                <div>
                  <span className="font-bold block">Mais de 1.5 Golos (Over 1.5)</span>
                  <span className="text-[9px] text-zinc-500 font-mono">Probabilidade: {predictionResult?.over15Prob?.toFixed(1) || 75}%</span>
                </div>
                <span className="font-mono font-bold text-yellow-300 bg-zinc-900 px-2 py-0.5 rounded border border-zinc-800">
                  @{predictionResult ? (100 / Math.max(1, predictionResult.over15Prob)).toFixed(2) : '1.33'}
                </span>
              </div>

              {/* Over 2.5 */}
              <div className={`p-3 rounded-xl border flex items-center justify-between ${
                (predictionResult?.over25Prob || 50) > 60 
                  ? 'bg-[#00f2fe]/10 border-[#00f2fe]/40 text-white' 
                  : 'bg-black/40 border-zinc-850 text-zinc-300'
              }`}>
                <div>
                  <span className="font-bold block">Mais de 2.5 Golos (Over 2.5)</span>
                  <span className="text-[9px] text-zinc-500 font-mono">Probabilidade: {predictionResult?.over25Prob?.toFixed(1) || 52}%</span>
                </div>
                <span className="font-mono font-bold text-yellow-300 bg-zinc-900 px-2 py-0.5 rounded border border-zinc-800">
                  @{predictionResult ? (100 / Math.max(1, predictionResult.over25Prob)).toFixed(2) : '1.92'}
                </span>
              </div>

              {/* Under 3.5 */}
              <div className={`p-3 rounded-xl border flex items-center justify-between ${
                (predictionResult?.under35Prob || 70) > 70 
                  ? 'bg-purple-950/20 border-purple-500/40 text-white' 
                  : 'bg-black/40 border-zinc-850 text-zinc-300'
              }`}>
                <div>
                  <span className="font-bold block">Menos de 3.5 Golos (Under 3.5)</span>
                  <span className="text-[9px] text-zinc-500 font-mono">Probabilidade: {predictionResult?.under35Prob?.toFixed(1) || 78}%</span>
                </div>
                <span className="font-mono font-bold text-purple-300 bg-zinc-900 px-2 py-0.5 rounded border border-zinc-800">
                  @{predictionResult ? (100 / Math.max(1, predictionResult.under35Prob)).toFixed(2) : '1.28'}
                </span>
              </div>

              {/* BTTS */}
              <div className={`p-3 rounded-xl border flex items-center justify-between ${
                (predictionResult?.bttsProb || 50) > 55 
                  ? 'bg-amber-950/20 border-amber-500/40 text-white' 
                  : 'bg-black/40 border-zinc-850 text-zinc-300'
              }`}>
                <div>
                  <span className="font-bold block">Ambas Marcam: Sim (BTTS)</span>
                  <span className="text-[9px] text-zinc-500 font-mono">Probabilidade: {predictionResult?.bttsProb?.toFixed(1) || 54}%</span>
                </div>
                <span className="font-mono font-bold text-amber-300 bg-zinc-900 px-2 py-0.5 rounded border border-zinc-800">
                  @{predictionResult ? (100 / Math.max(1, predictionResult.bttsProb)).toFixed(2) : '1.85'}
                </span>
              </div>
            </div>
          </div>

          {/* 5. RELATÓRIO ANALÍTICO DE ELITE DA IA (HYBRID GEMINI REPORT) */}
          <div className="p-5 rounded-2xl bg-gradient-to-br from-[#0b0c16] via-[#090a12] to-[#121324] border border-[#00f2fe]/40 space-y-3.5 shadow-lg">
            <div className="flex items-center justify-between flex-wrap gap-2">
              <div className="flex items-center gap-2">
                <Bot className="w-5 h-5 text-[#00f2fe]" />
                <h4 className="text-xs font-black uppercase text-white font-mono tracking-wider">
                  {isPt ? '🤖 RELATÓRIO DE ELITE IA SPECIALIST (ANÁLISE PROFISSIONAL)' : '🤖 SPECIALIST AI ELITE REPORT (PROFESSIONAL ANALYSIS)'}
                </h4>
              </div>

              {onGenerateAiReport && !loadingAi && (
                <button
                  type="button"
                  onClick={onGenerateAiReport}
                  className="text-[10px] font-bold font-mono text-zinc-300 hover:text-white bg-zinc-900 hover:bg-zinc-800 border border-zinc-700 hover:border-[#00f2fe] px-3 py-1 rounded-lg transition-all flex items-center gap-1.5 cursor-pointer shadow"
                >
                  <Sparkles className="w-3 h-3 text-[#00f2fe]" />
                  <span>{aiReport ? (isPt ? '🔄 Regenerar Parecer IA' : '🔄 Regenerate AI') : (isPt ? '✨ Gerar Parecer IA' : '✨ Generate AI Report')}</span>
                </button>
              )}
            </div>

            {loadingAi ? (
              <div className="p-6 rounded-xl bg-black/60 border border-[#00f2fe]/30 flex flex-col items-center justify-center text-center space-y-3 py-8">
                <div className="w-8 h-8 border-3 border-[#00f2fe] border-t-transparent rounded-full animate-spin"></div>
                <div className="space-y-1">
                  <span className="text-xs font-bold text-white font-mono block">
                    {isPt ? 'iR-Engine-v3.5 a redigir o parecer analítico especializado...' : 'iR-Engine-v3.5 generating specialist report...'}
                  </span>
                  <span className="text-[10px] text-zinc-400 font-sans block">
                    {isPt ? 'A cruzar probabilidades matemáticas com fatores humanos, balneário e margem +EV.' : 'Cross-referencing mathematics with qualitative factors and +EV margin.'}
                  </span>
                </div>
              </div>
            ) : aiReport ? (
              <div className="p-4 sm:p-5 rounded-xl bg-black/80 border border-zinc-800/90 leading-relaxed font-sans text-xs text-zinc-200 space-y-2">
                {renderAiReportContent(aiReport)}
              </div>
            ) : (
              <div className="p-4 rounded-xl bg-black/40 border border-zinc-850 flex items-center justify-between gap-3">
                <p className="text-[11px] text-zinc-400 italic">
                  {isPt 
                    ? 'O parecer detalhado por texto será redigido pela IA Specialist. Clique em "Gerar Parecer IA" para obter a análise completa.' 
                    : 'Detailed text report ready to be generated by Specialist AI.'}
                </p>
                {onGenerateAiReport && (
                  <button
                    type="button"
                    onClick={onGenerateAiReport}
                    className="shrink-0 px-3 py-1.5 bg-[#00f2fe] hover:bg-cyan-400 text-black font-bold text-[10px] uppercase font-mono rounded-lg transition-all cursor-pointer shadow"
                  >
                    {isPt ? 'Gerar Agora' : 'Generate Now'}
                  </button>
                )}
              </div>
            )}
          </div>

          {/* 6. PARÂMETROS SUBJETIVOS DE BALNEÁRIO & TREINADOR (AFINAÇÃO) */}
          <div className="p-5 rounded-2xl bg-[#0A0A0F] border border-zinc-850 space-y-4">
            <div className="flex items-center justify-between">
              <span className="text-xs font-black uppercase text-zinc-300 font-mono tracking-wider flex items-center gap-1.5">
                <Sliders className="w-4 h-4 text-[#FFEF00]" />
                <span>{isPt ? 'AFINAÇÃO QUALITATIVA DE BALNEÁRIO & TREINADOR' : 'QUALITATIVE LOCKER & COACH PARAMETERS'}</span>
              </span>
              <span className="text-[9px] text-zinc-500 font-mono">
                {isPt ? 'Impacto na Simulação Poisson' : 'Poisson Impact'}
              </span>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              {/* HOME TEAM QUALITATIVE */}
              <div className="p-4 rounded-2xl bg-black border border-zinc-850 space-y-3">
                <span className="text-xs font-black text-[#00f2fe] uppercase tracking-wider block">
                  🏠 {homeTeam || 'Equipa Casa'}
                </span>

                {/* Chicotada */}
                <div className="flex justify-between items-center bg-[#07070A] p-2.5 rounded-xl border border-zinc-900">
                  <div className="space-y-0.5 pr-2">
                    <span className="text-xs font-bold text-white block">
                      {isPt ? 'Treinador em risco de demissão?' : 'Manager at risk?'}
                    </span>
                    <span className="text-[9px] text-zinc-500 block">
                      {isPt ? 'Instabilidade diretiva (-18% rendimento)' : 'Board instability (-18% score)'}
                    </span>
                  </div>
                  <div className="flex gap-1 shrink-0">
                    <button
                      type="button"
                      onClick={() => setHomeCoachChicotada(true)}
                      className={`px-2.5 py-1 text-[10px] font-black rounded-lg uppercase border transition-all cursor-pointer ${
                        homeCoachChicotada 
                          ? 'bg-red-500 text-white border-red-500' 
                          : 'bg-zinc-900 text-zinc-400 border-zinc-800 hover:border-zinc-700'
                      }`}
                    >
                      {isPt ? 'Sim' : 'Yes'}
                    </button>
                    <button
                      type="button"
                      onClick={() => setHomeCoachChicotada(false)}
                      className={`px-2.5 py-1 text-[10px] font-black rounded-lg uppercase border transition-all cursor-pointer ${
                        !homeCoachChicotada 
                          ? 'bg-zinc-800 text-white border-zinc-700' 
                          : 'bg-zinc-900 text-zinc-400 border-zinc-800 hover:border-zinc-700'
                      }`}
                    >
                      {isPt ? 'Não' : 'No'}
                    </button>
                  </div>
                </div>

                {/* Players support */}
                <div className="flex justify-between items-center bg-[#07070A] p-2.5 rounded-xl border border-zinc-900">
                  <div className="space-y-0.5 pr-2">
                    <span className="text-xs font-bold text-white block">
                      {isPt ? 'Plantel apoia o treinador?' : 'Players with coach?'}
                    </span>
                    <span className="text-[9px] text-zinc-500 block">
                      {isPt ? 'Falta de compromisso tático' : 'Tactical disconnection'}
                    </span>
                  </div>
                  <div className="flex gap-1 shrink-0">
                    <button
                      type="button"
                      onClick={() => setHomePlayersWithCoach(true)}
                      className={`px-2.5 py-1 text-[10px] font-black rounded-lg uppercase border transition-all cursor-pointer ${
                        homePlayersWithCoach 
                          ? 'bg-emerald-600 text-white border-emerald-500' 
                          : 'bg-zinc-900 text-zinc-400 border-zinc-800 hover:border-zinc-700'
                      }`}
                    >
                      {isPt ? 'Sim' : 'Yes'}
                    </button>
                    <button
                      type="button"
                      onClick={() => setHomePlayersWithCoach(false)}
                      className={`px-2.5 py-1 text-[10px] font-black rounded-lg uppercase border transition-all cursor-pointer ${
                        !homePlayersWithCoach 
                          ? 'bg-red-500 text-white border-red-500' 
                          : 'bg-zinc-900 text-zinc-400 border-zinc-800 hover:border-zinc-700'
                      }`}
                    >
                      {isPt ? 'Não' : 'No'}
                    </button>
                  </div>
                </div>

                {/* Cohesion / bonded */}
                <div className="flex justify-between items-center bg-[#07070A] p-2.5 rounded-xl border border-zinc-900">
                  <div className="space-y-0.5 pr-2">
                    <span className="text-xs font-bold text-white block">
                      {isPt ? 'Equipa unida e entrosada?' : 'Group cohesive?'}
                    </span>
                    <span className="text-[9px] text-zinc-500 block">
                      {isPt ? 'Química positiva no balneário' : 'Good chemistry'}
                    </span>
                  </div>
                  <div className="flex gap-1 shrink-0">
                    <button
                      type="button"
                      onClick={() => setHomeBondedTeam(true)}
                      className={`px-2.5 py-1 text-[10px] font-black rounded-lg uppercase border transition-all cursor-pointer ${
                        homeBondedTeam 
                          ? 'bg-emerald-600 text-white border-emerald-500' 
                          : 'bg-zinc-900 text-zinc-400 border-zinc-800 hover:border-zinc-700'
                      }`}
                    >
                      {isPt ? 'Sim' : 'Yes'}
                    </button>
                    <button
                      type="button"
                      onClick={() => setHomeBondedTeam(false)}
                      className={`px-2.5 py-1 text-[10px] font-black rounded-lg uppercase border transition-all cursor-pointer ${
                        !homeBondedTeam 
                          ? 'bg-red-500 text-white border-red-500' 
                          : 'bg-zinc-900 text-zinc-400 border-zinc-800 hover:border-zinc-700'
                      }`}
                    >
                      {isPt ? 'Não' : 'No'}
                    </button>
                  </div>
                </div>
              </div>

              {/* AWAY TEAM QUALITATIVE */}
              <div className="p-4 rounded-2xl bg-black border border-zinc-850 space-y-3">
                <span className="text-xs font-black text-pink-400 uppercase tracking-wider block">
                  🚀 {awayTeam || 'Equipa Fora'}
                </span>

                {/* Chicotada */}
                <div className="flex justify-between items-center bg-[#07070A] p-2.5 rounded-xl border border-zinc-900">
                  <div className="space-y-0.5 pr-2">
                    <span className="text-xs font-bold text-white block">
                      {isPt ? 'Treinador em risco de demissão?' : 'Manager at risk?'}
                    </span>
                    <span className="text-[9px] text-zinc-500 block">
                      {isPt ? 'Instabilidade diretiva (-18% rendimento)' : 'Board instability (-18% score)'}
                    </span>
                  </div>
                  <div className="flex gap-1 shrink-0">
                    <button
                      type="button"
                      onClick={() => setAwayCoachChicotada(true)}
                      className={`px-2.5 py-1 text-[10px] font-black rounded-lg uppercase border transition-all cursor-pointer ${
                        awayCoachChicotada 
                          ? 'bg-red-500 text-white border-red-500' 
                          : 'bg-zinc-900 text-zinc-400 border-zinc-800 hover:border-zinc-700'
                      }`}
                    >
                      {isPt ? 'Sim' : 'Yes'}
                    </button>
                    <button
                      type="button"
                      onClick={() => setAwayCoachChicotada(false)}
                      className={`px-2.5 py-1 text-[10px] font-black rounded-lg uppercase border transition-all cursor-pointer ${
                        !awayCoachChicotada 
                          ? 'bg-zinc-800 text-white border-zinc-700' 
                          : 'bg-zinc-900 text-zinc-400 border-zinc-800 hover:border-zinc-700'
                      }`}
                    >
                      {isPt ? 'Não' : 'No'}
                    </button>
                  </div>
                </div>

                {/* Players support */}
                <div className="flex justify-between items-center bg-[#07070A] p-2.5 rounded-xl border border-zinc-900">
                  <div className="space-y-0.5 pr-2">
                    <span className="text-xs font-bold text-white block">
                      {isPt ? 'Plantel apoia o treinador?' : 'Players with coach?'}
                    </span>
                    <span className="text-[9px] text-zinc-500 block">
                      {isPt ? 'Falta de compromisso tático' : 'Tactical disconnection'}
                    </span>
                  </div>
                  <div className="flex gap-1 shrink-0">
                    <button
                      type="button"
                      onClick={() => setAwayPlayersWithCoach(true)}
                      className={`px-2.5 py-1 text-[10px] font-black rounded-lg uppercase border transition-all cursor-pointer ${
                        awayPlayersWithCoach 
                          ? 'bg-emerald-600 text-white border-emerald-500' 
                          : 'bg-zinc-900 text-zinc-400 border-zinc-800 hover:border-zinc-700'
                      }`}
                    >
                      {isPt ? 'Sim' : 'Yes'}
                    </button>
                    <button
                      type="button"
                      onClick={() => setAwayPlayersWithCoach(false)}
                      className={`px-2.5 py-1 text-[10px] font-black rounded-lg uppercase border transition-all cursor-pointer ${
                        !awayPlayersWithCoach 
                          ? 'bg-red-500 text-white border-red-500' 
                          : 'bg-zinc-900 text-zinc-400 border-zinc-800 hover:border-zinc-700'
                      }`}
                    >
                      {isPt ? 'Não' : 'No'}
                    </button>
                  </div>
                </div>

                {/* Cohesion / bonded */}
                <div className="flex justify-between items-center bg-[#07070A] p-2.5 rounded-xl border border-zinc-900">
                  <div className="space-y-0.5 pr-2">
                    <span className="text-xs font-bold text-white block">
                      {isPt ? 'Equipa unida e entrosada?' : 'Group cohesive?'}
                    </span>
                    <span className="text-[9px] text-zinc-500 block">
                      {isPt ? 'Química positiva no balneário' : 'Good chemistry'}
                    </span>
                  </div>
                  <div className="flex gap-1 shrink-0">
                    <button
                      type="button"
                      onClick={() => setAwayBondedTeam(true)}
                      className={`px-2.5 py-1 text-[10px] font-black rounded-lg uppercase border transition-all cursor-pointer ${
                        awayBondedTeam 
                          ? 'bg-emerald-600 text-white border-emerald-500' 
                          : 'bg-zinc-900 text-zinc-400 border-zinc-800 hover:border-zinc-700'
                      }`}
                    >
                      {isPt ? 'Sim' : 'Yes'}
                    </button>
                    <button
                      type="button"
                      onClick={() => setAwayBondedTeam(false)}
                      className={`px-2.5 py-1 text-[10px] font-black rounded-lg uppercase border transition-all cursor-pointer ${
                        !awayBondedTeam 
                          ? 'bg-red-500 text-white border-red-500' 
                          : 'bg-zinc-900 text-zinc-400 border-zinc-800 hover:border-zinc-700'
                      }`}
                    >
                      {isPt ? 'Não' : 'No'}
                    </button>
                  </div>
                </div>
              </div>
            </div>
          </div>

        </div>

        {/* Footer */}
        <div className="p-4 sm:p-5 bg-[#0E0E14] border-t border-[#FFEF00]/25 flex flex-col sm:flex-row items-center justify-between gap-3 shrink-0">
          <button
            type="button"
            onClick={() => {
              onApplyFactorsAndRecalculate();
            }}
            className="w-full sm:w-auto py-2.5 px-5 bg-zinc-850 hover:bg-zinc-750 text-white font-bold text-xs uppercase tracking-wider rounded-xl border border-zinc-700 hover:border-[#FFEF00] transition-all flex items-center justify-center gap-2 cursor-pointer"
            id="btn-modal-recalculate"
          >
            <RefreshCw className="w-3.5 h-3.5 text-[#FFEF00]" />
            <span>{isPt ? '🔄 Recalcular Probabilidades' : '🔄 Recalculate Odds'}</span>
          </button>

          <button
            type="button"
            onClick={onClose}
            className="w-full sm:w-auto py-2.5 px-6 bg-zinc-900 hover:bg-zinc-800 text-zinc-400 hover:text-white font-bold text-xs uppercase tracking-wider rounded-xl border border-zinc-800 transition-all text-center cursor-pointer"
            id="btn-modal-close"
          >
            {isPt ? 'Fechar Janela' : 'Close Window'}
          </button>
        </div>

      </div>
    </div>
  );

  if (typeof document !== 'undefined') {
    return createPortal(modalContent, document.body);
  }
  return modalContent;
};

export default TeamCoachAnalysisModal;
