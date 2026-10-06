import React, { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { 
  X, 
  Sparkles, 
  TrendingUp, 
  ShieldCheck, 
  Target, 
  Zap, 
  CheckCircle2, 
  Copy, 
  Share2, 
  Flame, 
  BarChart3, 
  Activity, 
  AlertTriangle,
  Send,
  RefreshCw,
  Award,
  ShieldAlert
} from 'lucide-react';

export interface HybridAnalysisModalProps {
  isOpen: boolean;
  onClose: () => void;
  homeTeam: string;
  awayTeam: string;
  simLeague: string;
  homeGoals: string;
  awayGoals: string;
  homePosition?: number | string | null;
  awayPosition?: number | string | null;
  homeForm?: any;
  awayForm?: any;
  predictionResult: any;
  bestPossibleBet: {
    selection: string;
    targetOdd: string;
    rationale: string;
    confidence: string;
    category?: string;
    isHighRisk?: boolean;
  };
  smartSelection?: {
    market?: string;
    bet?: string;
    prob?: number;
    recommendedOdd?: number;
    odd?: string;
    justification?: string;
    isHighRisk?: boolean;
  };
  aiReport?: string;
  loadingAi?: boolean;
  onGenerateAiReport?: () => void;
  onSendToBetSlip?: (bet: any) => void;
  onSendToHomepage?: (bet: any) => void;
  tacticalRigor?: string;
  surpriseRisk?: number;
  coachSupport?: string;
  lawnState?: string;
  weather?: string;
  keyInjuries?: string;
  language?: string;
}

export const HybridAnalysisModal: React.FC<HybridAnalysisModalProps> = ({
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
  predictionResult,
  bestPossibleBet,
  smartSelection,
  aiReport = '',
  loadingAi = false,
  onGenerateAiReport,
  onSendToBetSlip,
  onSendToHomepage,
  tacticalRigor = 'none',
  surpriseRisk = 0,
  coachSupport = 'solid',
  lawnState = 'normal',
  weather = 'limpo',
  keyInjuries = 'nenhum',
  language = 'pt',
}) => {
  const [copied, setCopied] = useState(false);
  const [activeTab, setActiveTab] = useState<'overview' | 'best_bet' | 'ai_report'>('overview');
  const [notification, setNotification] = useState<string | null>(null);

  if (!isOpen) return null;

  const isPt = language === 'pt';

  // Robust extraction of Poisson results
  const homeWinProb = typeof predictionResult?.homeWinProb === 'number'
    ? predictionResult.homeWinProb
    : typeof predictionResult?.homeWin === 'number'
    ? predictionResult.homeWin
    : parseFloat(predictionResult?.homeWin || '52.0') || 52.0;

  const drawProb = typeof predictionResult?.drawProb === 'number'
    ? predictionResult.drawProb
    : typeof predictionResult?.draw === 'number'
    ? predictionResult.draw
    : parseFloat(predictionResult?.draw || '22.5') || 22.5;

  const awayWinProb = typeof predictionResult?.awayWinProb === 'number'
    ? predictionResult.awayWinProb
    : typeof predictionResult?.awayWin === 'number'
    ? predictionResult.awayWin
    : parseFloat(predictionResult?.awayWin || '25.5') || 25.5;

  const over15Prob = typeof predictionResult?.over15Prob === 'number'
    ? predictionResult.over15Prob
    : typeof predictionResult?.over15 === 'number'
    ? predictionResult.over15
    : 100 - (parseFloat(predictionResult?.under15Prob || predictionResult?.under15 || '18') || 18);

  const over25Prob = typeof predictionResult?.over25Prob === 'number'
    ? predictionResult.over25Prob
    : typeof predictionResult?.over25 === 'number'
    ? predictionResult.over25
    : 100 - (parseFloat(predictionResult?.under25Prob || predictionResult?.under25 || '38') || 38);

  const under35Prob = typeof predictionResult?.under35Prob === 'number'
    ? predictionResult.under35Prob
    : typeof predictionResult?.under35 === 'number'
    ? predictionResult.under35
    : parseFloat(predictionResult?.under35 || '60.2') || 60.2;

  const bttsProb = typeof predictionResult?.bttsProb === 'number'
    ? predictionResult.bttsProb
    : typeof predictionResult?.btts === 'number'
    ? predictionResult.btts
    : parseFloat(predictionResult?.btts || '60.4') || 60.4;

  const fairHomeOdd = typeof predictionResult?.fairHomeOdd === 'number'
    ? predictionResult.fairHomeOdd.toFixed(2)
    : (100 / Math.max(1, homeWinProb)).toFixed(2);

  const fairDrawOdd = (100 / Math.max(1, drawProb)).toFixed(2);

  const fairAwayOdd = typeof predictionResult?.fairAwayOdd === 'number'
    ? predictionResult.fairAwayOdd.toFixed(2)
    : (100 / Math.max(1, awayWinProb)).toFixed(2);

  const isHighRisk = surpriseRisk >= 3 || coachSupport === 'broken' || bestPossibleBet?.isHighRisk;

  const showNotification = (msg: string) => {
    setNotification(msg);
    setTimeout(() => setNotification(null), 3000);
  };

  const handleCopyAnalysis = () => {
    const text = [
      `🏆 ANÁLISE HÍBRIDA: ${homeTeam} vs ${awayTeam} (${simLeague})`,
      `🎯 MELHOR APOSTA: ${bestPossibleBet?.selection || 'Ambas Marcam (BTTS)'} (Odd Alvo: @${bestPossibleBet?.targetOdd || '1.65'})`,
      `📊 Confiança: ${bestPossibleBet?.confidence || '86%'}`,
      `💡 Justificação: ${bestPossibleBet?.rationale || ''}`,
      '',
      '📈 PROBABILIDADES MATEMÁTICAS (Poisson EV):',
      `• 1 - Vitória ${homeTeam}: ${homeWinProb.toFixed(1)}% (Odd Justa: @${fairHomeOdd})`,
      `• X - Empate: ${drawProb.toFixed(1)}% (Odd Justa: @${fairDrawOdd})`,
      `• 2 - Vitória ${awayTeam}: ${awayWinProb.toFixed(1)}% (Odd Justa: @${fairAwayOdd})`,
      `• Mais de 1.5 Golos: ${over15Prob.toFixed(1)}%`,
      `• Mais de 2.5 Golos: ${over25Prob.toFixed(1)}%`,
      `• Menos de 3.5 Golos: ${under35Prob.toFixed(1)}%`,
      `• Ambas Marcam (BTTS): ${bttsProb.toFixed(1)}%`,
      '',
      '🤖 PARECER TÉCNICO IA:',
      aiReport || 'Análise calculada com motor preditivo de Poisson e calibração de fatores humanos iRunBets.'
    ].join('\n');

    navigator.clipboard.writeText(text);
    setCopied(true);
    showNotification(isPt ? 'Análise copiada para a área de transferência!' : 'Analysis copied to clipboard!');
    setTimeout(() => setCopied(false), 2000);
  };

  const handleSendBetSlipClick = () => {
    if (onSendToBetSlip) {
      onSendToBetSlip({
        homeTeam,
        awayTeam,
        league: simLeague,
        market: bestPossibleBet?.selection || 'Ambas Marcam',
        odd: parseFloat(bestPossibleBet?.targetOdd || '1.70') || 1.70,
        confidence: bestPossibleBet?.confidence || '85%',
        rationale: bestPossibleBet?.rationale || '',
      });
      showNotification(isPt ? 'Aposta adicionada ao Boletim!' : 'Bet added to Bet Slip!');
    }
  };

  const handleSendHomepageClick = () => {
    if (onSendToHomepage) {
      onSendToHomepage({
        homeTeam,
        awayTeam,
        league: simLeague,
        tip: bestPossibleBet?.selection || 'Ambas Marcam',
        odd: parseFloat(bestPossibleBet?.targetOdd || '1.70') || 1.70,
        confidence: bestPossibleBet?.confidence || '85%',
        notes: bestPossibleBet?.rationale || '',
      });
      showNotification(isPt ? 'Prognóstico publicado na Página Inicial!' : 'Tip published to Homepage!');
    }
  };

  const renderAiReportFormatted = (text: string) => {
    if (!text) return null;
    return text.split('\n').map((line, i) => {
      if (line.startsWith('### ')) {
        return <h4 key={i} className="text-sm sm:text-base font-bold text-[#00f2fe] uppercase mt-3.5 mb-1.5 font-mono">{line.replace('### ', '')}</h4>;
      }
      if (line.startsWith('## ')) {
        return <h3 key={i} className="text-base sm:text-lg font-black text-white uppercase mt-4 mb-2 border-l-2 border-[#00f2fe] pl-2 font-display">{line.replace('## ', '')}</h3>;
      }
      if (line.startsWith('# ')) {
        return <h2 key={i} className="text-lg sm:text-xl font-black text-[#FFEF00] uppercase mt-4.5 mb-2.5 font-display pb-1 border-b border-zinc-800">{line.replace('# ', '')}</h2>;
      }
      if (line.startsWith('- ') || line.startsWith('* ')) {
        return <li key={i} className="text-sm sm:text-base text-zinc-200 font-normal ml-4 list-disc mt-1.5 leading-relaxed">{line.substring(2)}</li>;
      }
      if (line.trim() === '') return <div key={i} className="h-2" />;
      
      const parts = line.split('**');
      if (parts.length > 1) {
        return (
          <p key={i} className="text-sm sm:text-base text-zinc-200 leading-relaxed mt-1.5">
            {parts.map((pPart, idx) => idx % 2 === 1 ? <strong key={idx} className="font-bold text-white pr-0.5">{pPart}</strong> : pPart)}
          </p>
        );
      }
      return <p key={i} className="text-sm sm:text-base text-zinc-200 leading-relaxed mt-1.5">{line}</p>;
    });
  };

  const modalContent = (
    <div className="fixed inset-0 z-[999999] flex items-center justify-center p-3 sm:p-6 overflow-y-auto bg-black/85 backdrop-blur-md animate-fade-in" id="modal-hybrid-analysis" onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}>
      {/* Backdrop */}
      <div 
        className="fixed inset-0 bg-black/85 backdrop-blur-md transition-opacity cursor-pointer"
        onClick={onClose}
      />

      {/* Main Container */}
      <div 
        className="relative w-full max-w-[98vw] sm:max-w-4xl md:max-w-5xl lg:max-w-6xl xl:max-w-7xl 2xl:max-w-[1500px] bg-[#0E0E12] border border-[#00f2fe]/40 rounded-2xl sm:rounded-3xl shadow-[0_0_50px_rgba(0,242,254,0.18)] overflow-hidden flex flex-col my-auto max-h-[94vh] z-10 animate-fade-in"
        onClick={(e) => e.stopPropagation()}
        id="hybrid-analysis-modal-container"
      >
        {/* Glow ambient background elements */}
        <div className="absolute top-0 right-0 w-96 h-96 bg-[#00f2fe]/10 rounded-full blur-3xl pointer-events-none -mr-20 -mt-20"></div>
        <div className="absolute bottom-0 left-0 w-96 h-96 bg-amber-500/10 rounded-full blur-3xl pointer-events-none -ml-20 -mb-20"></div>

        {/* Floating Notification Toast */}
        {notification && (
          <div className="absolute top-4 left-1/2 -translate-x-1/2 z-50 bg-[#00f2fe] text-zinc-950 px-4 py-2 rounded-xl font-black text-xs uppercase tracking-wider shadow-lg flex items-center gap-2 animate-bounce">
            <CheckCircle2 className="w-4 h-4" />
            <span>{notification}</span>
          </div>
        )}

        {/* Modal Header */}
        <div className="p-4 sm:p-6 border-b border-zinc-800/80 bg-zinc-950/80 flex items-center justify-between shrink-0 relative z-20">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-[#00f2fe]/20 to-sky-500/20 border border-[#00f2fe]/40 flex items-center justify-center shadow-lg shadow-[#00f2fe]/10">
              <Sparkles className="w-5 h-5 text-[#00f2fe]" />
            </div>
            <div>
              <div className="flex items-center gap-2 flex-wrap">
                <h2 className="text-base sm:text-lg font-black text-white font-display uppercase tracking-tight flex items-center gap-2">
                  <span>{isPt ? 'Análise Híbrida & Decisão de Aposta' : 'Hybrid Analysis & Bet Decision'}</span>
                  <span className="px-2 py-0.5 rounded-md bg-[#00f2fe]/15 border border-[#00f2fe]/40 text-[#00f2fe] text-[10px] font-mono font-bold uppercase tracking-wider">
                    IA + Poisson EV
                  </span>
                </h2>
              </div>
              <p className="text-xs text-zinc-400 font-sans mt-0.5">
                <span className="font-bold text-zinc-200">{homeTeam || 'Equipa Casa'}</span>
                <span className="text-[#00f2fe] font-bold mx-1.5">vs</span>
                <span className="font-bold text-zinc-200">{awayTeam || 'Equipa Fora'}</span>
                <span className="text-zinc-500 ml-2">• {simLeague || 'Primeira Liga'}</span>
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={handleCopyAnalysis}
              className="p-2 sm:px-3 sm:py-2 rounded-xl bg-zinc-900 border border-zinc-800 hover:border-zinc-700 text-zinc-300 hover:text-white text-xs font-semibold flex items-center gap-1.5 transition-all cursor-pointer"
              title="Copiar Análise Completa"
            >
              {copied ? <CheckCircle2 className="w-4 h-4 text-emerald-400" /> : <Copy className="w-4 h-4" />}
              <span className="hidden sm:inline">{copied ? (isPt ? 'Copiado!' : 'Copied!') : (isPt ? 'Copiar' : 'Copy')}</span>
            </button>

            <button
              type="button"
              onClick={onClose}
              className="p-2 rounded-xl bg-zinc-900 border border-zinc-800 hover:border-zinc-700 text-zinc-400 hover:text-white transition-all cursor-pointer"
              title="Fechar"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Navigation Tabs */}
        <div className="px-4 sm:px-6 pt-3 pb-2 bg-zinc-950/40 border-b border-zinc-855 flex items-center gap-2 overflow-x-auto shrink-0 relative z-20">
          <button
            type="button"
            onClick={() => setActiveTab('overview')}
            className={`px-3.5 py-2 rounded-xl text-xs font-black uppercase tracking-wider transition-all flex items-center gap-2 whitespace-nowrap cursor-pointer ${
              activeTab === 'overview'
                ? 'bg-[#00f2fe] text-zinc-950 shadow-md shadow-[#00f2fe]/20'
                : 'bg-zinc-900/80 text-zinc-400 hover:text-white border border-zinc-800/80'
            }`}
          >
            <BarChart3 className="w-3.5 h-3.5" />
            <span>{isPt ? 'Resumo Geral & Métricas' : 'General Summary'}</span>
          </button>

          <button
            type="button"
            onClick={() => setActiveTab('best_bet')}
            className={`px-3.5 py-2 rounded-xl text-xs font-black uppercase tracking-wider transition-all flex items-center gap-2 whitespace-nowrap cursor-pointer ${
              activeTab === 'best_bet'
                ? 'bg-amber-400 text-zinc-950 shadow-md shadow-amber-400/20'
                : 'bg-zinc-900/80 text-zinc-400 hover:text-white border border-zinc-800/80'
            }`}
          >
            <Award className="w-3.5 h-3.5" />
            <span>{isPt ? '⭐ Melhor Aposta Possível' : '⭐ Best Possible Bet'}</span>
          </button>

          <button
            type="button"
            onClick={() => setActiveTab('ai_report')}
            className={`px-3.5 py-2 rounded-xl text-xs font-black uppercase tracking-wider transition-all flex items-center gap-2 whitespace-nowrap cursor-pointer ${
              activeTab === 'ai_report'
                ? 'bg-purple-500 text-white shadow-md shadow-purple-500/20'
                : 'bg-zinc-900/80 text-zinc-400 hover:text-white border border-zinc-800/80'
            }`}
          >
            <Sparkles className="w-3.5 h-3.5" />
            <span>{isPt ? 'Relatório Híbrido IA' : 'AI Hybrid Report'}</span>
          </button>
        </div>

        {/* Modal Body with Scroll */}
        <div className="p-4 sm:p-6 overflow-y-auto space-y-6 flex-1 relative z-10 custom-scrollbar">

          {/* TAB 1: OVERVIEW & PROBABILITIES */}
          {activeTab === 'overview' && (
            <div className="space-y-6 animate-fade-in">
              
              {/* If high risk, alert banner */}
              {isHighRisk && (
                <div className="p-4 rounded-2xl bg-red-950/40 border border-red-500/60 flex items-center justify-between flex-wrap gap-2">
                  <div className="flex items-center gap-2 text-red-400 text-xs font-bold font-mono uppercase">
                    <ShieldAlert className="w-4 h-4 text-red-400 animate-pulse" />
                    <span>{isPt ? 'Aviso: Fator de Risco / Zebra Detetado' : 'Warning: High Surprise / Volatility Risk'}</span>
                  </div>
                  <span className="text-[10px] bg-red-900/80 text-red-200 px-2 py-0.5 rounded font-mono font-bold">
                    Risco {surpriseRisk}/5
                  </span>
                </div>
              )}

              {/* Highlight Best Bet Banner inside Overview */}
              <div className="p-5 sm:p-6 rounded-2xl bg-gradient-to-r from-amber-500/10 via-orange-500/10 to-amber-500/5 border border-amber-500/30 relative overflow-hidden">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                  <div className="space-y-2">
                    <div className="flex items-center gap-2">
                      <span className="px-2.5 py-1 rounded-full bg-amber-400 text-zinc-950 text-xs font-black uppercase tracking-widest font-mono">
                        {isPt ? 'ENTRADA DE MÁXIMO VALOR' : 'MAX VALUE ENTRY'}
                      </span>
                      <span className="text-sm font-bold text-amber-400">
                        {isPt ? 'Confiança:' : 'Confidence:'} {bestPossibleBet?.confidence || '86%'}
                      </span>
                    </div>
                    <div className="text-xl sm:text-2xl font-black text-white font-display flex items-center gap-2.5">
                      <Target className="w-6 h-6 text-amber-400 shrink-0" />
                      <span>{bestPossibleBet?.selection || 'Ambas Marcam (BTTS) / Mais de 2.0 Golos'}</span>
                    </div>
                    <p className="text-sm sm:text-base text-zinc-200 font-sans leading-relaxed max-w-2xl">
                      {bestPossibleBet?.rationale || 'Estatísticas indicam futebol de transições ricas com expectativa equilibrada de golos, contornando a volatilidade do mercado 1X2 clássico.'}
                    </p>
                  </div>

                  <div className="flex sm:flex-col items-center justify-between sm:items-end gap-2.5 bg-black/40 p-3.5 sm:p-5 rounded-xl border border-zinc-800/80 shrink-0">
                    <span className="text-xs uppercase font-bold text-zinc-400 font-mono">
                      {isPt ? 'ODD ALVO RECOMENDADA' : 'TARGET ODD'}
                    </span>
                    <span className="text-2xl sm:text-3xl font-black text-[#00f2fe] font-mono">
                      @{bestPossibleBet?.targetOdd || '1.65'}
                    </span>
                    <button
                      type="button"
                      onClick={handleSendBetSlipClick}
                      className="px-3.5 py-2 bg-[#00f2fe] hover:bg-cyan-400 text-zinc-950 font-black text-xs uppercase tracking-wider rounded-lg transition-all flex items-center gap-1.5 cursor-pointer"
                    >
                      <Send className="w-4 h-4" />
                      <span>{isPt ? 'Boletim' : 'Bet Slip'}</span>
                    </button>
                  </div>
                </div>
              </div>

              {/* 1X2 Probabilities Grid */}
              <div className="space-y-3">
                <h3 className="text-sm font-bold uppercase tracking-wider text-zinc-300 font-mono flex items-center gap-2">
                  <Activity className="w-4.5 h-4.5 text-[#00f2fe]" />
                  <span>{isPt ? 'Probabilidades 1X2 & Golos Esperados (Poisson EV)' : '1X2 Probabilities & Expected Goals'}</span>
                </h3>

                <div className="grid grid-cols-3 gap-3">
                  {/* Home */}
                  <div className="p-4 rounded-xl bg-zinc-950/80 border border-zinc-800 flex flex-col items-center text-center">
                    <span className="text-xs sm:text-sm text-zinc-300 font-bold uppercase truncate max-w-full font-mono mb-1">
                      1 - {homeTeam || 'Casa'}
                    </span>
                    <span className="text-xl sm:text-2xl font-black text-white font-mono">
                      {homeWinProb.toFixed(1)}%
                    </span>
                    <span className="text-xs text-[#00f2fe] font-bold font-mono mt-1">
                      Odd: @{fairHomeOdd}
                    </span>
                  </div>

                  {/* Draw */}
                  <div className="p-4 rounded-xl bg-zinc-950/80 border border-zinc-800 flex flex-col items-center text-center">
                    <span className="text-xs sm:text-sm text-zinc-300 font-bold uppercase font-mono mb-1">
                      X - {isPt ? 'Empate' : 'Draw'}
                    </span>
                    <span className="text-xl sm:text-2xl font-black text-zinc-300 font-mono">
                      {drawProb.toFixed(1)}%
                    </span>
                    <span className="text-xs text-zinc-400 font-mono mt-1">
                      Odd: @{fairDrawOdd}
                    </span>
                  </div>

                  {/* Away */}
                  <div className="p-4 rounded-xl bg-zinc-950/80 border border-zinc-800 flex flex-col items-center text-center">
                    <span className="text-xs sm:text-sm text-zinc-300 font-bold uppercase truncate max-w-full font-mono mb-1">
                      2 - {awayTeam || 'Fora'}
                    </span>
                    <span className="text-xl sm:text-2xl font-black text-white font-mono">
                      {awayWinProb.toFixed(1)}%
                    </span>
                    <span className="text-xs text-[#00f2fe] font-bold font-mono mt-1">
                      Odd: @{fairAwayOdd}
                    </span>
                  </div>
                </div>
              </div>

              {/* Markets Matrix: Over/Under & BTTS */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                {/* Over/Under Matrix */}
                <div className="p-4 sm:p-5 rounded-xl bg-zinc-950/80 border border-zinc-800 space-y-3">
                  <h4 className="text-sm font-bold uppercase tracking-wider text-zinc-200 font-mono flex items-center justify-between">
                    <span>{isPt ? 'Mercados de Golos' : 'Goal Markets'}</span>
                    <span className="text-xs text-zinc-400 font-mono font-normal">Over / Under</span>
                  </h4>

                  <div className="space-y-2.5 text-sm font-sans">
                    <div className="flex items-center justify-between p-2.5 rounded-lg bg-zinc-900/60 border border-zinc-850">
                      <span className="text-zinc-200 font-medium">Mais de 1.5 Golos</span>
                      <span className="font-mono font-bold text-emerald-400 text-sm sm:text-base">
                        {over15Prob.toFixed(1)}%
                      </span>
                    </div>

                    <div className="flex items-center justify-between p-2.5 rounded-lg bg-zinc-900/60 border border-zinc-850">
                      <span className="text-zinc-200 font-medium">Mais de 2.5 Golos</span>
                      <span className="font-mono font-bold text-white text-sm sm:text-base">
                        {over25Prob.toFixed(1)}%
                      </span>
                    </div>

                    <div className="flex items-center justify-between p-2.5 rounded-lg bg-zinc-900/60 border border-zinc-850">
                      <span className="text-zinc-200 font-medium">Menos de 3.5 Golos</span>
                      <span className="font-mono font-bold text-[#00f2fe] text-sm sm:text-base">
                        {under35Prob.toFixed(1)}%
                      </span>
                    </div>
                  </div>
                </div>

                {/* BTTS & Factors Matrix */}
                <div className="p-4 sm:p-5 rounded-xl bg-zinc-950/80 border border-zinc-800 space-y-3">
                  <h4 className="text-sm font-bold uppercase tracking-wider text-zinc-200 font-mono flex items-center justify-between">
                    <span>{isPt ? 'Ambas Marcam & Contexto' : 'BTTS & Match Context'}</span>
                    <span className="text-xs text-zinc-400 font-mono font-normal">Fatores</span>
                  </h4>

                  <div className="space-y-2.5 text-sm font-sans">
                    <div className="flex items-center justify-between p-2.5 rounded-lg bg-zinc-900/60 border border-zinc-850">
                      <span className="text-zinc-200 font-medium">Ambas Marcam (Sim)</span>
                      <span className="font-mono font-bold text-amber-400 text-sm sm:text-base">
                        {bttsProb.toFixed(1)}%
                      </span>
                    </div>

                    <div className="flex items-center justify-between p-2.5 rounded-lg bg-zinc-900/60 border border-zinc-850">
                      <span className="text-zinc-200 font-medium">Risco Surpresa / Zebra</span>
                      <span className={`font-mono font-bold text-sm sm:text-base ${surpriseRisk > 2 ? 'text-red-400' : 'text-zinc-300'}`}>
                        {surpriseRisk}/5 ({surpriseRisk === 0 ? 'Estável' : surpriseRisk <= 2 ? 'Moderado' : 'Crítico'})
                      </span>
                    </div>

                    <div className="flex items-center justify-between p-2.5 rounded-lg bg-zinc-900/60 border border-zinc-850">
                      <span className="text-zinc-200 font-medium">Rigor Tático</span>
                      <span className="font-mono font-bold text-[#00f2fe] text-sm sm:text-base">
                        {tacticalRigor === 'cup_knockout' ? 'Extremo (-30%)' : tacticalRigor === 'cup_groups' ? 'Rigoroso (-15%)' : 'Padrão (0%)'}
                      </span>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* TAB 2: BEST POSSIBLE BET DETAILED BREAKDOWN */}
          {activeTab === 'best_bet' && (
            <div className="space-y-6 animate-fade-in">
              <div className="p-6 rounded-2xl bg-gradient-to-b from-amber-500/10 via-zinc-900/80 to-zinc-950 border border-amber-500/30 space-y-4">
                <div className="flex items-center gap-2">
                  <span className="px-2.5 py-1 rounded-lg bg-amber-400 text-zinc-950 font-black text-xs uppercase tracking-wider font-mono">
                    {isPt ? 'ESTATÍSTICA + PURIFICADOR + IA' : 'STATS + PURIFIER + AI'}
                  </span>
                  <span className="text-xs text-amber-400 font-bold">
                    Nível de Certeza: {bestPossibleBet?.confidence || '86%'}
                  </span>
                </div>

                <div className="space-y-1.5">
                  <span className="text-xs sm:text-sm text-zinc-300 font-bold uppercase font-mono tracking-wider block">
                    {isPt ? 'Seleção Recomendada' : 'Recommended Selection'}
                  </span>
                  <h3 className="text-2xl sm:text-3xl font-black text-white font-display">
                    {bestPossibleBet?.selection || 'Ambas Marcam (BTTS) / Mais de 2.0 Golos'}
                  </h3>
                </div>

                <div className="p-4 sm:p-5 rounded-xl bg-black/50 border border-zinc-800/80 space-y-2.5">
                  <span className="text-xs sm:text-sm font-bold text-zinc-300 uppercase font-mono block">
                    {isPt ? 'Justificação Detalhada & Análise de Risco:' : 'Detailed Rationale & Risk Analysis:'}
                  </span>
                  <p className="text-sm sm:text-base text-zinc-100 font-sans leading-relaxed">
                    {bestPossibleBet?.rationale || 'Estatísticas indicam futebol de transições ricas com expectativa de 3.05 golos, contornando a volatilidade do mercado 1X2 clássico.'}
                  </p>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-2">
                  <div className="p-3.5 rounded-xl bg-zinc-900/60 border border-zinc-800 flex items-center justify-between">
                    <span className="text-xs sm:text-sm text-zinc-300 font-medium">{isPt ? 'Odd Mínima de Valor (+EV):' : 'Min +EV Odd:'}</span>
                    <span className="text-lg sm:text-xl font-black text-[#00f2fe] font-mono">@{bestPossibleBet?.targetOdd || '1.65'}</span>
                  </div>
                  <div className="p-3.5 rounded-xl bg-zinc-900/60 border border-zinc-800 flex items-center justify-between">
                    <span className="text-xs sm:text-sm text-zinc-300 font-medium">{isPt ? 'Gestão de Stake Recomendada:' : 'Recommended Stake:'}</span>
                    <span className="text-lg sm:text-xl font-black text-emerald-400 font-mono">1.0% - 2.5%</span>
                  </div>
                </div>

                {/* Quick Action Buttons */}
                <div className="flex flex-col sm:flex-row items-center gap-3 pt-3">
                  <button
                    type="button"
                    onClick={handleSendBetSlipClick}
                    className="w-full sm:flex-1 py-3 px-4 bg-gradient-to-r from-[#00f2fe] to-sky-500 hover:from-cyan-400 hover:to-sky-400 text-zinc-950 font-black text-xs sm:text-sm uppercase tracking-wider rounded-xl transition-all shadow-lg shadow-cyan-500/10 flex items-center justify-center gap-2 cursor-pointer"
                  >
                    <Send className="w-4 h-4" />
                    <span>{isPt ? 'Adicionar ao Boletim de Apostas' : 'Add to Bet Slip'}</span>
                  </button>

                  <button
                    type="button"
                    onClick={handleSendHomepageClick}
                    className="w-full sm:flex-1 py-3 px-4 bg-gradient-to-r from-orange-500 to-amber-500 hover:from-orange-400 hover:to-amber-400 text-zinc-950 font-black text-xs sm:text-sm uppercase tracking-wider rounded-xl transition-all shadow-lg shadow-orange-500/10 flex items-center justify-center gap-2 cursor-pointer"
                  >
                    <Share2 className="w-4 h-4" />
                    <span>{isPt ? 'Publicar na Página Inicial' : 'Publish to Homepage'}</span>
                  </button>
                </div>
              </div>
            </div>
          )}

          {/* TAB 3: AI HYBRID REPORT WITH LIVE GENERATOR */}
          {activeTab === 'ai_report' && (
            <div className="space-y-4 animate-fade-in">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Sparkles className="w-4 h-4 text-purple-400" />
                  <span className="text-xs font-bold uppercase tracking-wider text-purple-300 font-mono">
                    {isPt ? 'Parecer Técnico Especialista Gemini' : 'Gemini AI Specialist Verdict'}
                  </span>
                </div>

                {onGenerateAiReport && (
                  <button
                    type="button"
                    onClick={onGenerateAiReport}
                    disabled={loadingAi}
                    className="px-3 py-1.5 rounded-lg bg-purple-950/60 border border-purple-800/80 hover:bg-purple-900 text-purple-200 text-xs font-bold flex items-center gap-1.5 transition-all cursor-pointer disabled:opacity-50"
                  >
                    <RefreshCw className={`w-3.5 h-3.5 ${loadingAi ? 'animate-spin' : ''}`} />
                    <span>{loadingAi ? (isPt ? 'A Gerar...' : 'Generating...') : (isPt ? 'Regenerar Parecer' : 'Regenerate')}</span>
                  </button>
                )}
              </div>

              <div className="p-5 rounded-2xl bg-zinc-950 border border-zinc-800 text-zinc-200 font-sans text-xs sm:text-sm leading-relaxed space-y-3 min-h-[160px]">
                {loadingAi ? (
                  <div className="py-12 flex flex-col items-center justify-center space-y-3 text-center">
                    <div className="w-8 h-8 border-2 border-purple-400 border-t-transparent rounded-full animate-spin"></div>
                    <p className="text-xs text-purple-300 font-mono font-medium animate-pulse">
                      {isPt ? 'A compor parecer analítico híbrido (estatística + contexto desportivo)...' : 'Synthesizing hybrid analytical report...'}
                    </p>
                  </div>
                ) : aiReport ? (
                  <div className="font-sans text-zinc-300 space-y-2">
                    {renderAiReportFormatted(aiReport)}
                  </div>
                ) : (
                  <div className="py-10 text-center space-y-3">
                    <p className="text-zinc-400 text-xs">
                      {isPt ? 'Ainda não foi gerado um parecer por inteligência artificial para este jogo.' : 'No AI verdict has been generated yet for this match.'}
                    </p>
                    {onGenerateAiReport && (
                      <button
                        type="button"
                        onClick={onGenerateAiReport}
                        className="px-5 py-2.5 bg-gradient-to-r from-[#00f2fe] to-sky-500 hover:from-cyan-400 text-zinc-950 font-black text-xs uppercase tracking-wider rounded-xl transition-all inline-flex items-center gap-2 cursor-pointer shadow-lg shadow-cyan-500/10"
                      >
                        <Sparkles className="w-4 h-4" />
                        <span>{isPt ? 'Gerar Parecer Agora' : 'Generate Verdict Now'}</span>
                      </button>
                    )}
                  </div>
                )}
              </div>
            </div>
          )}

        </div>

        {/* Modal Footer */}
        <div className="p-4 sm:p-5 border-t border-zinc-850 bg-zinc-950/90 flex flex-col sm:flex-row items-center justify-between gap-3 shrink-0 relative z-20">
          <div className="text-[11px] text-zinc-500 font-mono text-center sm:text-left">
            <span>🛡️ iRunBets Predictive Engine v4.8 • Poisson + Fatores Humanos</span>
          </div>

          <div className="flex items-center gap-2 w-full sm:w-auto">
            <button
              type="button"
              onClick={handleCopyAnalysis}
              className="flex-1 sm:flex-initial px-4 py-2.5 rounded-xl bg-zinc-900 border border-zinc-800 hover:border-zinc-700 text-zinc-300 hover:text-white text-xs font-bold transition-all flex items-center justify-center gap-2 cursor-pointer"
            >
              <Copy className="w-4 h-4" />
              <span>{copied ? (isPt ? 'Copiado!' : 'Copied!') : (isPt ? 'Copiar Resumo' : 'Copy Summary')}</span>
            </button>

            <button
              type="button"
              onClick={onClose}
              className="flex-1 sm:flex-initial px-6 py-2.5 rounded-xl bg-zinc-800 hover:bg-zinc-700 text-white text-xs font-bold transition-all cursor-pointer"
            >
              {isPt ? 'Fechar' : 'Close'}
            </button>
          </div>
        </div>

      </div>
    </div>
  );

  if (typeof document !== 'undefined') {
    return createPortal(modalContent, document.body);
  }
  return modalContent;
};

export default HybridAnalysisModal;
