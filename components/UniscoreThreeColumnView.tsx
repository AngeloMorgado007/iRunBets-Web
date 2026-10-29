import React, { useState, useMemo, useEffect } from 'react';
import { 
  JogoDoDia, 
  getCalibratedMatchMetrics, 
  LiveMatchInfo,
  normalizeClubName 
} from '../services/supabase';
import { resolveActualMatchScore } from '../services/auditPerformanceService';

export interface UniscoreThreeColumnViewProps {
  jogos: JogoDoDia[];
  filteredJogos: JogoDoDia[];
  selectedLeague: string;
  onSelectLeague: (league: string) => void;
  topLeagues: Array<{ name: string; label: string; flag: string }>;
  leaguesSummary: [string, number][];
  selectedDateFilter: string;
  onSelectDateFilter: (date: string) => void;
  currentDateString: string;
  yesterdayStr: string;
  availableDates: string[];
  statusFilter: 'all' | 'live' | 'finished' | 'scheduled';
  onSelectStatusFilter: (status: 'all' | 'live' | 'finished' | 'scheduled') => void;
  searchTerm: string;
  onSearchChange: (term: string) => void;
  onOpenMatchModal: (match: {
    jogo: JogoDoDia;
    metrics: ReturnType<typeof getCalibratedMatchMetrics>;
    liveInfo?: LiveMatchInfo;
  }) => void;
  onSelectTeam?: (teamName: string, leagueName?: string) => void;
  selectedMultiplaItems: any[];
  onToggleMultiplaSelection: (e: React.MouseEvent, jogo: JogoDoDia, metrics: any) => void;
  unlockedIds: string[];
  isUserRegistered: boolean;
  isAdmin?: boolean;
  showLiveOnly: boolean;
  setShowLiveOnly: (show: boolean) => void;
  liveGamesCount: number;
  finishedGamesCount: number;
  scheduledGamesCount: number;
  liveGamesMap: Map<string, LiveMatchInfo>;
  onResetFilters: () => void;
}

// Helper to get league flag
function getLeagueFlag(leagueName: string = ''): string {
  const l = leagueName.toLowerCase();
  if (l.includes('champions')) return '🏆';
  if (l.includes('europa league')) return '🟠';
  if (l.includes('conference')) return '🟢';
  if (l.includes('portugal') || l.includes('primeira liga') || l.includes('taça de portugal')) return '🇵🇹';
  if (l.includes('premier') || l.includes('inglaterra') || l.includes('fa cup')) return '🏴󠁧󠁢󠁥󠁮󠁧󠁿';
  if (l.includes('championship')) return '🇬🇧';
  if (l.includes('la liga') || l.includes('primera division') || l.includes('espanha') || l.includes('copa del rey')) return '🇪🇸';
  if (l.includes('serie a') || l.includes('itália') || l.includes('italia') || l.includes('coppa italia')) return '🇮🇹';
  if (l.includes('bundesliga') || l.includes('alemanha')) return '🇩🇪';
  if (l.includes('ligue 1') || l.includes('frança') || l.includes('france')) return '🇫🇷';
  if (l.includes('eredivisie') || l.includes('holanda') || l.includes('netherlands')) return '🇳🇱';
  if (l.includes('brasileir') || l.includes('brasil')) return '🇧🇷';
  return '⚽';
}

export const UniscoreThreeColumnView: React.FC<UniscoreThreeColumnViewProps> = ({
  jogos,
  filteredJogos,
  selectedLeague,
  onSelectLeague,
  topLeagues,
  leaguesSummary,
  selectedDateFilter,
  onSelectDateFilter,
  currentDateString,
  yesterdayStr,
  statusFilter,
  onSelectStatusFilter,
  searchTerm,
  onSearchChange,
  onOpenMatchModal,
  onSelectTeam,
  selectedMultiplaItems,
  onToggleMultiplaSelection,
  unlockedIds,
  isUserRegistered,
  isAdmin = false,
  showLiveOnly,
  setShowLiveOnly,
  liveGamesCount,
  finishedGamesCount,
  scheduledGamesCount,
  liveGamesMap,
  onResetFilters
}) => {
  // Currently selected game in the side panel (Column 3)
  const [selectedSideGameId, setSelectedSideGameId] = useState<string | null>(null);
  const [leagueSearchTerm, setLeagueSearchTerm] = useState('');
  const [mobileTab, setMobileTab] = useState<'leagues' | 'matches' | 'probabilities'>('matches');

  // Find the active match object for Column 3
  const activeMatch = useMemo(() => {
    if (!filteredJogos.length) return null;
    if (selectedSideGameId) {
      const found = filteredJogos.find(
        j => (j.jogo_id && String(j.jogo_id) === selectedSideGameId) ||
             (`${j.data}_${j.hora}_${j.clube_casa}_vs_${j.clube_fora}` === selectedSideGameId)
      );
      if (found) return found;
    }
    // Default to the first match in the filtered list
    return filteredJogos[0];
  }, [filteredJogos, selectedSideGameId]);

  // Keep selectedSideGameId in sync if filteredJogos change
  useEffect(() => {
    if (activeMatch) {
      const key = (activeMatch.jogo_id && String(activeMatch.jogo_id)) ||
        `${activeMatch.data}_${activeMatch.hora}_${activeMatch.clube_casa}_vs_${activeMatch.clube_fora}`;
      if (key !== selectedSideGameId) {
        setSelectedSideGameId(key);
      }
    }
  }, [activeMatch, selectedSideGameId]);

  // Metrics and liveInfo for the active match in Column 3
  const activeMetrics = useMemo(() => {
    if (!activeMatch) return null;
    return getCalibratedMatchMetrics(activeMatch);
  }, [activeMatch]);

  const activeLiveInfo = useMemo(() => {
    if (!activeMatch) return undefined;
    const matchKey = (activeMatch.jogo_id && String(activeMatch.jogo_id).trim())
      ? String(activeMatch.jogo_id).trim()
      : `${activeMatch.data}_${activeMatch.hora}_${activeMatch.clube_casa}_vs_${activeMatch.clube_fora}`.replace(/\s+/g, '_').toLowerCase();
    return liveGamesMap.get(matchKey);
  }, [activeMatch, liveGamesMap]);

  // Group filtered games by League for middle column
  const groupedMatches = useMemo(() => {
    const groups: { league: string; flag: string; matches: JogoDoDia[] }[] = [];
    const map = new Map<string, JogoDoDia[]>();

    filteredJogos.forEach((jogo) => {
      const l = jogo.liga || 'Outras Ligas';
      if (!map.has(l)) {
        map.set(l, []);
      }
      map.get(l)!.push(jogo);
    });

    map.forEach((matches, league) => {
      groups.push({
        league,
        flag: getLeagueFlag(league),
        matches
      });
    });

    return groups;
  }, [filteredJogos]);

  // Filter leagues in sidebar
  const filteredSidebarLeagues = useMemo(() => {
    if (!leagueSearchTerm.trim()) return leaguesSummary;
    const term = leagueSearchTerm.toLowerCase();
    return leaguesSummary.filter(([name]) => name.toLowerCase().includes(term));
  }, [leaguesSummary, leagueSearchTerm]);

  return (
    <div className="w-full space-y-4 font-sans text-zinc-100">
      {/* Mobile Top Navigation Tabs (Ligas | Jogos | Probabilidades) */}
      <div className="flex lg:hidden items-center justify-between p-1.5 bg-[#12141f] border border-zinc-800 rounded-2xl shadow-lg">
        <button
          type="button"
          onClick={() => setMobileTab('leagues')}
          className={`flex-1 py-2 text-xs font-mono font-bold rounded-xl transition-all cursor-pointer flex items-center justify-center gap-1.5 ${
            mobileTab === 'leagues'
              ? 'bg-amber-500 text-black shadow-md font-black'
              : 'text-zinc-400 hover:text-white'
          }`}
        >
          <span>🌍</span>
          <span>Ligas ({leaguesSummary.length})</span>
        </button>
        <button
          type="button"
          onClick={() => setMobileTab('matches')}
          className={`flex-1 py-2 text-xs font-mono font-bold rounded-xl transition-all cursor-pointer flex items-center justify-center gap-1.5 ${
            mobileTab === 'matches'
              ? 'bg-orange-500 text-black shadow-md font-black'
              : 'text-zinc-400 hover:text-white'
          }`}
        >
          <span>⚽</span>
          <span>Jogos ({filteredJogos.length})</span>
        </button>
        <button
          type="button"
          onClick={() => setMobileTab('probabilities')}
          className={`flex-1 py-2 text-xs font-mono font-bold rounded-xl transition-all cursor-pointer flex items-center justify-center gap-1.5 ${
            mobileTab === 'probabilities'
              ? 'bg-cyan-500 text-black shadow-md font-black'
              : 'text-zinc-400 hover:text-white'
          }`}
        >
          <span>📊</span>
          <span>Probabilidades</span>
          {activeMatch && <span className="w-2 h-2 rounded-full bg-cyan-300 animate-pulse" />}
        </button>
      </div>

      {/* Main 3-Column Layout Grid (iRunBets Pro Multi-Painel) */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-4 items-start">
        
        {/* ========================================================================= */}
        {/* COLUNA 1 (ESQUERDA): LIGAS & COMPETIÇÕES (~270px - 3 cols)                 */}
        {/* ========================================================================= */}
        <aside className={`lg:col-span-3 space-y-3 ${mobileTab !== 'leagues' ? 'hidden lg:block' : 'block'}`}>
          <div className="bg-[#111420]/95 border border-zinc-800/90 rounded-2xl p-3.5 shadow-xl backdrop-blur-md sticky top-4 max-h-[85vh] flex flex-col">
            {/* Header Ligas */}
            <div className="flex items-center justify-between pb-3 border-b border-zinc-800/80 mb-2">
              <div className="flex items-center gap-2">
                <span className="text-base">🏆</span>
                <span className="font-mono font-black text-xs uppercase tracking-wider text-white">
                  Ligas & Competições
                </span>
              </div>
              <span className="text-[11px] font-mono font-bold px-2 py-0.5 rounded-full bg-zinc-800 text-zinc-300 border border-zinc-700/60">
                {leaguesSummary.length} Ligas
              </span>
            </div>

            {/* Quick Search inside Sidebar */}
            <div className="relative mb-2.5">
              <input
                type="text"
                placeholder="Filtrar campeonato..."
                value={leagueSearchTerm}
                onChange={(e) => setLeagueSearchTerm(e.target.value)}
                className="w-full bg-[#0a0c14] border border-zinc-800 rounded-xl px-3 py-1.5 pl-8 text-xs font-mono text-zinc-200 placeholder-zinc-500 focus:outline-none focus:border-amber-500/60 transition-all"
              />
              <span className="absolute left-2.5 top-1/2 -translate-y-1/2 text-zinc-500 text-xs">🔍</span>
              {leagueSearchTerm && (
                <button
                  type="button"
                  onClick={() => setLeagueSearchTerm('')}
                  className="absolute right-2.5 top-1/2 -translate-y-1/2 text-zinc-500 hover:text-white text-xs"
                >
                  ✕
                </button>
              )}
            </div>

            {/* List of Leagues (Scrollable) */}
            <div className="space-y-1 overflow-y-auto pr-1 flex-1 scrollbar-thin scrollbar-thumb-zinc-700 scrollbar-track-transparent">
              {/* Todas as Ligas Option */}
              <button
                type="button"
                onClick={() => {
                  onSelectLeague('all');
                  if (window.innerWidth < 1024) setMobileTab('matches');
                }}
                className={`w-full flex items-center justify-between px-3 py-2.5 rounded-xl font-mono text-xs font-bold transition-all cursor-pointer ${
                  selectedLeague === 'all'
                    ? 'bg-gradient-to-r from-amber-500 to-orange-500 text-black shadow-lg shadow-orange-500/20 font-black scale-[1.01]'
                    : 'bg-[#151928]/80 hover:bg-[#1a2034] text-zinc-300 border border-zinc-800/80 hover:border-zinc-700'
                }`}
              >
                <div className="flex items-center gap-2.5 truncate">
                  <span className="text-sm">🌍</span>
                  <span className="truncate">Todas as Ligas</span>
                </div>
                <span className={`text-[10px] px-2 py-0.5 rounded-md font-mono font-black ${
                  selectedLeague === 'all' ? 'bg-black/30 text-black' : 'bg-zinc-800/90 text-amber-400'
                }`}>
                  {jogos.length}
                </span>
              </button>

              {/* Destaque: Principais Ligas */}
              <div className="pt-2 pb-1 px-1 flex items-center justify-between text-[10px] font-mono uppercase tracking-wider text-zinc-500 font-bold">
                <span>Principais Campeonatos</span>
                <span>Jogos</span>
              </div>

              {filteredSidebarLeagues.map(([leagueName, count]) => {
                const isSelected = selectedLeague === leagueName || 
                  (selectedLeague !== 'all' && leagueName.toLowerCase().includes(selectedLeague.toLowerCase()));
                const flag = getLeagueFlag(leagueName);

                return (
                  <button
                    key={leagueName}
                    type="button"
                    onClick={() => {
                      onSelectLeague(leagueName);
                      if (window.innerWidth < 1024) setMobileTab('matches');
                    }}
                    className={`w-full flex items-center justify-between px-3 py-2 rounded-xl font-mono text-xs transition-all cursor-pointer ${
                      isSelected
                        ? 'bg-gradient-to-r from-orange-500 to-amber-500 text-black font-black shadow-md shadow-orange-500/15 scale-[1.01]'
                        : 'bg-[#141724]/60 hover:bg-[#1a1f32] text-zinc-300 hover:text-white border border-transparent hover:border-zinc-800'
                    }`}
                  >
                    <div className="flex items-center gap-2 truncate pr-2">
                      <span className="text-sm">{flag}</span>
                      <span className="truncate text-left">{leagueName}</span>
                    </div>
                    <span className={`text-[10px] px-1.5 py-0.2 rounded font-mono font-bold flex-shrink-0 ${
                      isSelected ? 'bg-black/30 text-black' : 'bg-zinc-800 text-zinc-400'
                    }`}>
                      {count}
                    </span>
                  </button>
                );
              })}

              {filteredSidebarLeagues.length === 0 && (
                <div className="py-6 text-center text-xs font-mono text-zinc-500">
                  Nenhuma liga encontrada com "{leagueSearchTerm}".
                </div>
              )}
            </div>

            {/* Sidebar Bottom Reset Action */}
            {selectedLeague !== 'all' && (
              <div className="pt-3 border-t border-zinc-800/80 mt-2">
                <button
                  type="button"
                  onClick={() => onSelectLeague('all')}
                  className="w-full py-2 px-3 rounded-xl bg-zinc-850 hover:bg-zinc-800 text-amber-400 hover:text-amber-300 font-mono text-xs font-bold transition-all border border-amber-500/20 flex items-center justify-center gap-1.5 cursor-pointer"
                >
                  <span>✕</span>
                  <span>Limpar Filtro de Liga</span>
                </button>
              </div>
            )}
          </div>
        </aside>

        {/* ========================================================================= */}
        {/* COLUNA 2 (CENTRO): JOGOS DO DIA & LISTA PRINCIPAL (6 cols em desktop)       */}
        {/* ========================================================================= */}
        <main className={`lg:col-span-5 space-y-3 ${mobileTab !== 'matches' ? 'hidden lg:block' : 'block'}`}>
          {/* Top Control Bar: Status (Todos, Ao Vivo, etc.) + Dates */}
          <div className="bg-[#111420]/95 border border-zinc-800 rounded-2xl p-3 shadow-xl space-y-2.5">
            {/* Quick Status Chips */}
            <div className="flex items-center justify-between gap-1 overflow-x-auto scrollbar-thin pb-1">
              {/* Todos */}
              <button
                type="button"
                onClick={() => {
                  onSelectStatusFilter('all');
                  setShowLiveOnly(false);
                }}
                className={`px-3 py-1.5 rounded-xl text-xs font-mono font-bold transition-all flex items-center gap-1.5 whitespace-nowrap cursor-pointer ${
                  statusFilter === 'all' && !showLiveOnly
                    ? 'bg-zinc-100 text-black shadow-md'
                    : 'bg-zinc-900/90 hover:bg-zinc-800 text-zinc-300 border border-zinc-800'
                }`}
              >
                <span>🌐 Todos</span>
                <span className={`text-[10px] px-1 py-0.2 rounded font-mono font-black ${
                  statusFilter === 'all' && !showLiveOnly ? 'bg-black/20 text-black' : 'bg-zinc-800 text-zinc-400'
                }`}>
                  {jogos.length}
                </span>
              </button>

              {/* Ao Vivo */}
              <button
                type="button"
                onClick={() => {
                  const next = statusFilter === 'live' ? 'all' : 'live';
                  onSelectStatusFilter(next);
                  setShowLiveOnly(next === 'live');
                }}
                className={`px-3 py-1.5 rounded-xl text-xs font-mono font-bold transition-all flex items-center gap-1.5 whitespace-nowrap cursor-pointer border ${
                  statusFilter === 'live' || showLiveOnly
                    ? 'bg-gradient-to-r from-red-600 to-rose-600 text-white border-red-400 shadow-md shadow-red-600/30'
                    : liveGamesCount > 0
                    ? 'bg-red-950/70 border-red-500/50 text-red-300 hover:bg-red-900/80 animate-pulse'
                    : 'bg-zinc-900/90 border-zinc-800 text-zinc-400'
                }`}
              >
                <span className="w-2 h-2 rounded-full bg-red-400" />
                <span>Ao Vivo</span>
                <span className="text-[10px] px-1 py-0.2 rounded font-mono font-black bg-black/40 text-white">
                  {liveGamesCount}
                </span>
              </button>

              {/* Terminados */}
              <button
                type="button"
                onClick={() => {
                  onSelectStatusFilter(statusFilter === 'finished' ? 'all' : 'finished');
                  setShowLiveOnly(false);
                }}
                className={`px-3 py-1.5 rounded-xl text-xs font-mono font-bold transition-all flex items-center gap-1.5 whitespace-nowrap cursor-pointer border ${
                  statusFilter === 'finished'
                    ? 'bg-gradient-to-r from-emerald-600 to-teal-600 text-white border-emerald-400 shadow-md'
                    : 'bg-zinc-900/90 border-zinc-800 text-zinc-400 hover:text-zinc-200'
                }`}
              >
                <span>✅ FT</span>
                <span className="text-[10px] px-1 py-0.2 rounded font-mono font-black bg-black/40 text-emerald-400">
                  {finishedGamesCount}
                </span>
              </button>

              {/* Agendados */}
              <button
                type="button"
                onClick={() => {
                  onSelectStatusFilter(statusFilter === 'scheduled' ? 'all' : 'scheduled');
                  setShowLiveOnly(false);
                }}
                className={`px-3 py-1.5 rounded-xl text-xs font-mono font-bold transition-all flex items-center gap-1.5 whitespace-nowrap cursor-pointer border ${
                  statusFilter === 'scheduled'
                    ? 'bg-gradient-to-r from-blue-600 to-cyan-600 text-white border-blue-400 shadow-md'
                    : 'bg-zinc-900/90 border-zinc-800 text-zinc-400 hover:text-zinc-200'
                }`}
              >
                <span>📅 Agendados</span>
                <span className="text-[10px] px-1 py-0.2 rounded font-mono font-black bg-black/40 text-cyan-400">
                  {scheduledGamesCount}
                </span>
              </button>
            </div>

            {/* Quick Date Selector Bar */}
            <div className="flex items-center gap-1.5 overflow-x-auto scrollbar-thin pt-1 border-t border-zinc-850">
              <button
                type="button"
                onClick={() => onSelectDateFilter('all')}
                className={`px-2.5 py-1 rounded-lg text-xs font-mono font-bold transition-all cursor-pointer whitespace-nowrap ${
                  selectedDateFilter === 'all'
                    ? 'bg-zinc-800 text-white border border-zinc-650 shadow-sm'
                    : 'text-zinc-400 hover:text-zinc-200 hover:bg-zinc-850'
                }`}
              >
                {isAdmin ? '🗓️ Todas' : '🗓️ Próximos'}
              </button>

              {/* Botão de Ontem visível estritamente para Admin */}
              {isAdmin && (
                <button
                  type="button"
                  onClick={() => onSelectDateFilter(selectedDateFilter === yesterdayStr ? 'all' : yesterdayStr)}
                  className={`px-2.5 py-1 rounded-lg text-xs font-mono font-bold transition-all cursor-pointer whitespace-nowrap ${
                    selectedDateFilter === yesterdayStr
                      ? 'bg-amber-600 text-white shadow-sm font-black'
                      : 'text-amber-400/90 hover:text-amber-300 hover:bg-zinc-850'
                  }`}
                  title="Painel Admin: Ver jogos de ontem com histórico e probabilidades completas"
                >
                  ⏪ Ontem
                </button>
              )}

              <button
                type="button"
                onClick={() => onSelectDateFilter(selectedDateFilter === currentDateString ? 'all' : currentDateString)}
                className={`px-3 py-1 rounded-lg text-xs font-mono font-black transition-all cursor-pointer whitespace-nowrap ${
                  selectedDateFilter === currentDateString
                    ? 'bg-gradient-to-r from-orange-500 to-amber-500 text-black shadow-md shadow-orange-500/20'
                    : 'text-orange-400 hover:text-orange-300 hover:bg-zinc-850'
                }`}
              >
                ⭐ Hoje ({currentDateString})
              </button>

              {/* Seletor Livre de Qualquer Data para o Administrador */}
              {isAdmin && (
                <div className="flex items-center gap-1 px-2 py-0.5 rounded-lg bg-zinc-900 border border-amber-500/50 text-[11px] font-mono text-amber-300 whitespace-nowrap shrink-0">
                  <span className="text-amber-400 font-bold">👑 Data:</span>
                  <input
                    type="date"
                    value={selectedDateFilter !== 'all' && selectedDateFilter !== currentDateString && selectedDateFilter !== yesterdayStr ? selectedDateFilter : ''}
                    onChange={(e) => onSelectDateFilter(e.target.value || 'all')}
                    className="bg-black/90 border border-zinc-750 text-white text-[11px] font-mono rounded px-1.5 py-0.5 focus:outline-none focus:border-amber-400 cursor-pointer"
                    title="Administrador: Selecionar qualquer data histórica ou futura para auditar probabilidades"
                  />
                </div>
              )}
            </div>

            {/* Search Input for Clubs */}
            <div className="relative pt-1">
              <input
                type="text"
                placeholder="Pesquisar clube (ex: Sporting, Benfica, Real Madrid, Porto, Arsenal)..."
                value={searchTerm}
                onChange={(e) => onSearchChange(e.target.value)}
                className="w-full bg-[#0a0c14] border border-zinc-800 rounded-xl px-3.5 py-2 pl-9 text-xs font-mono text-zinc-100 placeholder-zinc-500 focus:outline-none focus:border-orange-500/70 transition-all shadow-inner"
              />
              <span className="absolute left-3 top-1/2 -translate-y-1/2 pt-1 text-zinc-500 text-xs">🔍</span>
              {searchTerm && (
                <button
                  type="button"
                  onClick={() => onSearchChange('')}
                  className="absolute right-3 top-1/2 -translate-y-1/2 pt-1 text-zinc-500 hover:text-white text-xs font-bold"
                >
                  ✕
                </button>
              )}
            </div>
          </div>

          {/* Matches List Header Status */}
          <div className="flex items-center justify-between px-2 text-xs font-mono text-zinc-400">
            <span className="flex items-center gap-1.5 font-bold">
              <span>⚽</span>
              <span>
                {selectedLeague !== 'all' ? selectedLeague : 'Todos os Campeonatos'}
              </span>
              <span className="text-zinc-500 font-normal">({filteredJogos.length} jogos)</span>
            </span>
            <span className="text-[11px] text-zinc-500 hidden sm:inline">
              Clique em qualquer jogo para ver probabilidades na lateral
            </span>
          </div>

          {/* Matches List Container */}
          {filteredJogos.length === 0 ? (
            <div className="bg-[#111420] border border-zinc-800 rounded-2xl p-8 text-center space-y-3">
              <div className="w-12 h-12 rounded-full bg-amber-500/10 border border-amber-500/30 flex items-center justify-center text-2xl mx-auto">
                🔍
              </div>
              <h3 className="text-sm font-mono font-bold text-white">Nenhum jogo encontrado</h3>
              <p className="text-xs text-zinc-400 font-mono max-w-sm mx-auto">
                Não existem partidas para os filtros ativos. Tente limpar os filtros para ver todos os jogos.
              </p>
              <button
                type="button"
                onClick={onResetFilters}
                className="px-4 py-2 bg-gradient-to-r from-orange-500 to-amber-500 text-black font-mono font-bold text-xs rounded-xl shadow-md cursor-pointer"
              >
                Limpar Todos os Filtros
              </button>
            </div>
          ) : (
            <div className="space-y-4">
              {groupedMatches.map((group) => (
                <div key={group.league} className="bg-[#111420]/90 border border-zinc-800/80 rounded-2xl overflow-hidden shadow-lg">
                  {/* League Section Header */}
                  <div className="bg-gradient-to-r from-[#171b2c] to-[#121524] px-4 py-2.5 border-b border-zinc-800 flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <span className="text-base">{group.flag}</span>
                      <strong className="font-mono text-xs font-black text-white uppercase tracking-wide">
                        {group.league}
                      </strong>
                    </div>
                    <span className="text-[10px] font-mono font-bold px-2 py-0.5 rounded-full bg-zinc-800 text-zinc-400 border border-zinc-700/50">
                      {group.matches.length}
                    </span>
                  </div>

                  {/* League Matches Cards */}
                  <div className="divide-y divide-zinc-800/60">
                    {group.matches.map((jogo) => {
                      const matchKey = (jogo.jogo_id && String(jogo.jogo_id).trim())
                        ? String(jogo.jogo_id).trim()
                        : `${jogo.data}_${jogo.hora}_${jogo.clube_casa}_vs_${jogo.clube_fora}`.replace(/\s+/g, '_').toLowerCase();

                      const metrics = getCalibratedMatchMetrics(jogo);
                      const liveInfo = liveGamesMap.get(matchKey);

                      const isMatchFinished = Boolean(
                        liveInfo?.isFinished ||
                        liveInfo?.fase === 'Terminado' ||
                        (jogo.estado && ['FINISHED', 'FT', 'TERMINADO', 'FINAL', 'ENCERRADO'].includes(jogo.estado.toUpperCase())) ||
                        (jogo.data && jogo.data < currentDateString)
                      );

                      const { homeScore: dbGolosCasa, awayScore: dbGolosFora, hasScore: hasDbScore } = resolveActualMatchScore(jogo);
                      const hasLiveScore = Boolean(liveInfo && liveInfo.isLive && typeof liveInfo.golosCasa === 'number' && typeof liveInfo.golosFora === 'number');

                      const finalGolosCasa = hasDbScore ? dbGolosCasa : (hasLiveScore ? liveInfo!.golosCasa : (liveInfo?.hasOfficialScore ? liveInfo.golosCasa : null));
                      const finalGolosFora = hasDbScore ? dbGolosFora : (hasLiveScore ? liveInfo!.golosFora : (liveInfo?.hasOfficialScore ? liveInfo.golosFora : null));
                      const hasValidScore = finalGolosCasa !== null && finalGolosFora !== null;

                      const isSelectedInSidebar = activeMatch && (
                        (activeMatch.jogo_id && activeMatch.jogo_id === jogo.jogo_id) ||
                        (`${activeMatch.data}_${activeMatch.hora}_${activeMatch.clube_casa}_vs_${activeMatch.clube_fora}` === 
                         `${jogo.data}_${jogo.hora}_${jogo.clube_casa}_vs_${jogo.clube_fora}`)
                      );

                      const isMultiplaSelected = selectedMultiplaItems.some(item => item.gameId === matchKey);

                      return (
                        <div
                          key={matchKey}
                          onClick={() => {
                            setSelectedSideGameId(matchKey);
                            if (window.innerWidth < 1024) setMobileTab('probabilities');
                          }}
                          className={`p-3 transition-all cursor-pointer relative group ${
                            isSelectedInSidebar
                              ? 'bg-gradient-to-r from-orange-500/15 via-[#1a2035] to-[#121626] border-l-4 border-l-orange-500'
                              : 'hover:bg-[#151928]/80'
                          }`}
                        >
                          {/* Row 1: Time, Status, Sinal Aberto, Multipla Checkbox */}
                          <div className="flex items-center justify-between text-xs font-mono pb-2">
                            <div className="flex items-center gap-2">
                              {/* Match Status or Time */}
                              {liveInfo?.isLive ? (
                                <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-red-600/90 text-white font-black text-[10px] animate-pulse">
                                  <span className="w-1.5 h-1.5 rounded-full bg-white" />
                                  <span>{liveInfo.minuto}</span>
                                </span>
                              ) : isMatchFinished ? (
                                <span className="px-2 py-0.5 rounded-md bg-emerald-950 border border-emerald-500/50 text-emerald-300 font-bold text-[10px]">
                                  FT
                                </span>
                              ) : (
                                <span className="text-zinc-400 font-bold flex items-center gap-1 text-[11px]">
                                  <span>🕒</span>
                                  <span>{jogo.hora || '19:00'}</span>
                                  <span className="text-[10px] text-zinc-500 font-normal">({jogo.data})</span>
                                </span>
                              )}

                              {/* Aberto Badge */}
                              {unlockedIds.includes(matchKey) && (
                                <span className="px-1.5 py-0.2 rounded bg-emerald-500/20 text-emerald-300 border border-emerald-500/40 text-[9px] font-bold">
                                  🔓 Aberto
                                </span>
                              )}
                            </div>

                            {/* Actions Right: Multipla Checkbox + Quick Popup Button */}
                            <div className="flex items-center gap-1.5">
                              {/* Multipla Button */}
                              <button
                                type="button"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  onToggleMultiplaSelection(e, jogo, metrics);
                                }}
                                className={`px-2 py-0.5 rounded-lg text-[10px] font-mono font-bold transition-all border ${
                                  isMultiplaSelected
                                    ? 'bg-amber-500 text-black border-amber-400 font-black'
                                    : 'bg-zinc-900 border-zinc-750 text-zinc-400 hover:text-white'
                                }`}
                                title="Adicionar ao Boletim de Múltiplas"
                              >
                                {isMultiplaSelected ? '✓ Múltipla' : '+ Múltipla'}
                              </button>

                              {/* Quick Pop-up Modal Button */}
                              <button
                                type="button"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  onOpenMatchModal({ jogo, metrics, liveInfo });
                                }}
                                className="px-2 py-0.5 rounded-lg bg-zinc-900 hover:bg-orange-500 hover:text-black border border-zinc-750 text-zinc-300 text-[10px] font-mono font-bold transition-all flex items-center gap-1"
                                title="Abrir Relatório Completo em Janela Pop-up"
                              >
                                <span>🔍 Pop-up</span>
                              </button>
                            </div>
                          </div>

                          {/* Row 2: Teams Names and Live Score */}
                          <div className="flex items-center justify-between gap-3 py-1">
                            <div className="space-y-1 flex-1 min-w-0 font-sans">
                              {/* Home Team */}
                              <div className="flex items-center justify-between">
                                <span className={`text-xs sm:text-sm font-bold truncate ${
                                  isMatchFinished && hasValidScore && finalGolosCasa! > finalGolosFora! ? 'text-emerald-400 font-black' : 'text-zinc-100'
                                }`}>
                                  {jogo.clube_casa}
                                </span>
                                {(liveInfo?.isLive || isMatchFinished) && (
                                  <span className="font-mono font-black text-sm px-2 text-white">
                                    {hasValidScore ? finalGolosCasa : (isMatchFinished ? '-' : '')}
                                  </span>
                                )}
                              </div>

                              {/* Away Team */}
                              <div className="flex items-center justify-between">
                                <span className={`text-xs sm:text-sm font-bold truncate ${
                                  isMatchFinished && hasValidScore && finalGolosFora! > finalGolosCasa! ? 'text-emerald-400 font-black' : 'text-zinc-100'
                                }`}>
                                  {jogo.clube_fora}
                                </span>
                                {(liveInfo?.isLive || isMatchFinished) && (
                                  <span className="font-mono font-black text-sm px-2 text-white">
                                    {hasValidScore ? finalGolosFora : (isMatchFinished ? '-' : '')}
                                  </span>
                                )}
                              </div>
                            </div>
                          </div>

                          {/* Row 3: 1X2 Odds & IA Tip Badge */}
                          <div className="mt-2 pt-2 border-t border-zinc-800/60 flex flex-wrap items-center justify-between gap-2">
                            {(isMatchFinished || (jogo.data && jogo.data < currentDateString)) && !isAdmin ? (
                              <div className="flex items-center gap-2">
                                <span className="text-[10px] font-mono font-bold px-2.5 py-0.5 rounded-md bg-zinc-900 text-zinc-500 border border-zinc-800">
                                  🔒 Previsão &amp; Probabilidades Arquivadas
                                </span>
                              </div>
                            ) : (
                              <>
                                {/* 1X2 Odds Chips */}
                                <div className="flex items-center gap-1 font-mono text-[11px]">
                                  <span className="px-2 py-0.5 rounded bg-zinc-900/90 border border-zinc-800 text-zinc-300">
                                    <span className="text-[9px] text-zinc-500 mr-1">1</span>
                                    <strong className="text-cyan-300">{metrics.odd1}</strong>
                                  </span>
                                  <span className="px-2 py-0.5 rounded bg-zinc-900/90 border border-zinc-800 text-zinc-300">
                                    <span className="text-[9px] text-zinc-500 mr-1">X</span>
                                    <strong className="text-zinc-200">{metrics.oddX}</strong>
                                  </span>
                                  <span className="px-2 py-0.5 rounded bg-zinc-900/90 border border-zinc-800 text-zinc-300">
                                    <span className="text-[9px] text-zinc-500 mr-1">2</span>
                                    <strong className="text-amber-300">{metrics.odd2}</strong>
                                  </span>
                                </div>

                                {/* IA Prediction Badge */}
                                <div className="flex items-center gap-1.5">
                                  <span className="text-[10px] font-mono font-black px-2 py-0.5 rounded-md bg-purple-950/70 text-purple-300 border border-purple-500/40 truncate max-w-[200px]">
                                    🤖 {metrics.seloIa}
                                  </span>
                                  <span className="text-[10px] font-mono font-extrabold text-emerald-400 bg-emerald-950/60 px-1.5 py-0.5 rounded border border-emerald-500/30">
                                    {metrics.evVal}
                                  </span>
                                </div>
                              </>
                            )}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              ))}
            </div>
          )}
        </main>

        {/* ========================================================================= */}
        {/* COLUNA 3 (DIREITA): LATERAL DE PROBABILIDADES & RELATÓRIO TÁTICO            */}
        {/* ========================================================================= */}
        <aside className={`lg:col-span-4 space-y-3 ${mobileTab !== 'probabilities' ? 'hidden lg:block' : 'block'}`}>
          {activeMatch && activeMetrics ? (
            <div className="bg-[#111420]/95 border border-zinc-800 rounded-2xl p-4 shadow-2xl backdrop-blur-md sticky top-4 space-y-4 max-h-[88vh] overflow-y-auto scrollbar-thin scrollbar-thumb-zinc-700">
              
              {/* Header: Competition & Time */}
              <div className="pb-3 border-b border-zinc-800 space-y-2">
                <div className="flex items-center justify-between">
                  <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-orange-500/10 border border-orange-500/30 text-orange-400 text-xs font-mono font-bold">
                    <span>{getLeagueFlag(activeMatch.liga)}</span>
                    <span className="truncate max-w-[170px]">{activeMatch.liga || 'Liga'}</span>
                  </span>
                  <span className="text-xs font-mono text-zinc-400 font-bold">
                    📅 {activeMatch.data} • {activeMatch.hora}
                  </span>
                </div>

                {/* Match Title Casa vs Fora */}
                <div className="text-center py-2 bg-gradient-to-b from-[#181d30] to-[#121626] rounded-xl border border-zinc-800 p-3">
                  <h3 className="text-sm sm:text-base font-black text-white leading-snug">
                    <span className="text-orange-400">{activeMatch.clube_casa}</span>
                    <span className="mx-2 text-zinc-500 text-xs font-mono">VS</span>
                    <span className="text-cyan-400">{activeMatch.clube_fora}</span>
                  </h3>
                  
                  {(() => {
                    const isSelectedMatchFinished = Boolean(
                      activeLiveInfo?.isFinished ||
                      activeLiveInfo?.fase === 'Terminado' ||
                      (activeMatch.estado && ['FINISHED', 'FT', 'TERMINADO', 'FINAL', 'ENCERRADO'].includes(activeMatch.estado.toUpperCase())) ||
                      (activeMatch.data && activeMatch.data < currentDateString)
                    );

                    const { homeScore: activeDbCasa, awayScore: activeDbFora, hasScore: activeHasDbScore } = resolveActualMatchScore(activeMatch);
                    const hasActiveLiveScore = Boolean(activeLiveInfo && activeLiveInfo.isLive && typeof activeLiveInfo.golosCasa === 'number' && typeof activeLiveInfo.golosFora === 'number');

                    const activeGolosCasa = activeHasDbScore ? activeDbCasa : (hasActiveLiveScore ? activeLiveInfo!.golosCasa : (activeLiveInfo?.hasOfficialScore ? activeLiveInfo.golosCasa : null));
                    const activeGolosFora = activeHasDbScore ? activeDbFora : (hasActiveLiveScore ? activeLiveInfo!.golosFora : (activeLiveInfo?.hasOfficialScore ? activeLiveInfo.golosFora : null));
                    const hasActiveValidScore = activeGolosCasa !== null && activeGolosFora !== null;

                    if (activeLiveInfo?.isLive) {
                      return (
                        <div className="mt-1 inline-flex items-center gap-1.5 px-3 py-0.5 rounded-full bg-red-600 text-white font-mono font-black text-xs shadow-md animate-pulse">
                          <span>🔴 EM DIRETO • {activeLiveInfo.minuto}</span>
                          <span>({activeLiveInfo.golosCasa} - {activeLiveInfo.golosFora})</span>
                        </div>
                      );
                    } else if (isSelectedMatchFinished) {
                      return (
                        <div className="mt-1 inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-emerald-950 text-emerald-300 font-mono font-bold text-xs border border-emerald-500/40">
                          <span>✅ TERMINADO</span>
                          <span>{hasActiveValidScore ? `(${activeGolosCasa} - ${activeGolosFora})` : '(Aguardando Confirmação)'}</span>
                        </div>
                      );
                    } else {
                      return (
                        <div className="mt-1 text-[11px] font-mono text-zinc-400">
                          Probabilidades &amp; Estimativas em Tempo Real
                        </div>
                      );
                    }
                  })()}
                </div>
              </div>

              {/* 🎯 BOTÃO SOLICITADO PELO UTILIZADOR: VER EM POP-UP PARA MELHOR LEITURA */}
              <div>
                <button
                  type="button"
                  onClick={() => onOpenMatchModal({
                    jogo: activeMatch,
                    metrics: activeMetrics,
                    liveInfo: activeLiveInfo
                  })}
                  className="w-full py-3 px-4 rounded-xl bg-gradient-to-r from-orange-500 via-amber-500 to-yellow-500 hover:from-orange-400 hover:to-amber-400 text-black font-mono font-black text-xs uppercase tracking-wider shadow-lg shadow-orange-500/20 flex items-center justify-center gap-2 cursor-pointer transition-all active:scale-98 border border-amber-300/40"
                  title="Abrir o relatório analítico completo, Raio-X e centro de jogo em pop-up"
                >
                  <span className="text-sm">📖</span>
                  <span>Ver em Pop-up (Relatório Completo)</span>
                  <span className="text-sm">↗</span>
                </button>
                <p className="text-[10px] text-zinc-400 text-center font-mono mt-1">
                  Abre janela expansível com Raio-X Tático, Balneário iRB_IA e Simulação
                </p>
              </div>

              {/* Se a partida for de um dia anterior ou estiver terminada e o utilizador NÃO for Admin: ocultar previsões pré-jogo como na Flashscore */}
              {Boolean(
                (activeLiveInfo?.isFinished ||
                 activeLiveInfo?.fase === 'Terminado' ||
                 (activeMatch.estado && ['FINISHED', 'FT', 'TERMINADO', 'FINAL', 'ENCERRADO'].includes(activeMatch.estado.toUpperCase())) ||
                 (activeMatch.data && activeMatch.data < currentDateString)) &&
                !isAdmin
              ) ? (
                <div className="bg-[#141829] border border-zinc-800 rounded-xl p-5 text-center space-y-3 shadow-inner">
                  <div className="w-12 h-12 rounded-full bg-zinc-900 border border-zinc-750 flex items-center justify-center mx-auto text-amber-400 text-xl shadow-lg">
                    🔒
                  </div>
                  <div className="space-y-1">
                    <h4 className="text-xs font-bold text-zinc-200 uppercase font-mono tracking-wider">
                      Previsões Pré-Jogo Arquivadas
                    </h4>
                    <p className="text-[11px] text-zinc-400 font-mono leading-relaxed">
                      As probabilidades estatísticas da SuperIA ficam disponíveis publicamente apenas para os jogos do próprio dia e partidas agendadas. O histórico de análises pré-jogo de datas anteriores é arquivado após a conclusão.
                    </p>
                  </div>
                  <div className="pt-1">
                    <span className="inline-block px-3 py-1 rounded-md bg-zinc-900 text-zinc-400 text-[10px] font-mono border border-zinc-800">
                      👑 Acesso Completo ao Histórico Reservado a Administrador
                    </span>
                  </div>
                </div>
              ) : (
                <>
                  {/* 1X2 Probabilities Meters (iRunBets Pro Style) */}
                  <div className="bg-[#141829] border border-zinc-800 rounded-xl p-3.5 space-y-3">
                    <div className="flex items-center justify-between text-xs font-mono font-bold text-zinc-300">
                      <span className="flex items-center gap-1.5 text-white">
                        <span>📊</span>
                        <span>Probabilidades 1X2 (SuperIA)</span>
                      </span>
                      <span className="text-[10px] text-zinc-400">Odd de Mercado</span>
                    </div>

                {/* 1: Casa */}
                <div className="space-y-1">
                  <div className="flex items-center justify-between text-xs font-mono">
                    <span className="text-zinc-300 truncate max-w-[150px] font-bold">
                      1 • {activeMatch.clube_casa}
                    </span>
                    <div className="flex items-center gap-2">
                      <span className="font-black text-cyan-300">{activeMetrics.probCasa}%</span>
                      <span className="px-1.5 py-0.2 rounded bg-zinc-900 border border-zinc-750 text-cyan-400 font-bold text-[11px]">
                        @{activeMetrics.odd1}
                      </span>
                    </div>
                  </div>
                  <div className="w-full bg-zinc-900 rounded-full h-2 overflow-hidden">
                    <div
                      className="bg-gradient-to-r from-cyan-500 to-blue-500 h-2 rounded-full transition-all duration-500"
                      style={{ width: `${Math.min(100, activeMetrics.probCasa)}%` }}
                    />
                  </div>
                </div>

                {/* X: Empate */}
                <div className="space-y-1">
                  <div className="flex items-center justify-between text-xs font-mono">
                    <span className="text-zinc-300 font-bold">X • Empate</span>
                    <div className="flex items-center gap-2">
                      <span className="font-black text-zinc-200">{activeMetrics.probEmpate}%</span>
                      <span className="px-1.5 py-0.2 rounded bg-zinc-900 border border-zinc-750 text-zinc-300 font-bold text-[11px]">
                        @{activeMetrics.oddX}
                      </span>
                    </div>
                  </div>
                  <div className="w-full bg-zinc-900 rounded-full h-2 overflow-hidden">
                    <div
                      className="bg-gradient-to-r from-zinc-500 to-zinc-400 h-2 rounded-full transition-all duration-500"
                      style={{ width: `${Math.min(100, activeMetrics.probEmpate)}%` }}
                    />
                  </div>
                </div>

                {/* 2: Fora */}
                <div className="space-y-1">
                  <div className="flex items-center justify-between text-xs font-mono">
                    <span className="text-zinc-300 truncate max-w-[150px] font-bold">
                      2 • {activeMatch.clube_fora}
                    </span>
                    <div className="flex items-center gap-2">
                      <span className="font-black text-amber-300">{activeMetrics.probFora}%</span>
                      <span className="px-1.5 py-0.2 rounded bg-zinc-900 border border-zinc-750 text-amber-400 font-bold text-[11px]">
                        @{activeMetrics.odd2}
                      </span>
                    </div>
                  </div>
                  <div className="w-full bg-zinc-900 rounded-full h-2 overflow-hidden">
                    <div
                      className="bg-gradient-to-r from-amber-500 to-orange-500 h-2 rounded-full transition-all duration-500"
                      style={{ width: `${Math.min(100, activeMetrics.probFora)}%` }}
                    />
                  </div>
                </div>
              </div>

              {/* Previsão & Selo IA com Expected Value */}
              <div className="bg-gradient-to-br from-purple-950/40 via-[#181528] to-[#12111c] border border-purple-500/40 rounded-xl p-3.5 space-y-2">
                <div className="flex items-center justify-between text-xs font-mono">
                  <span className="flex items-center gap-1.5 font-bold text-purple-300">
                    <span>🤖</span>
                    <span>Previsão Recomendada</span>
                  </span>
                  <span className="px-2 py-0.5 rounded-full bg-emerald-500/20 text-emerald-300 font-mono font-black text-[10px] border border-emerald-500/40">
                    {activeMetrics.evVal}
                  </span>
                </div>
                
                <div className="text-sm font-mono font-black text-white bg-black/30 p-2.5 rounded-lg border border-purple-500/20">
                  {activeMetrics.seloIa}
                </div>

                <div className="flex items-center justify-between text-[11px] font-mono text-zinc-400 pt-1">
                  <span>Confiança do Algoritmo:</span>
                  <strong className="text-purple-300 font-black">{activeMetrics.confianca}%</strong>
                </div>
              </div>

              {/* Mercados Secundários: Golos (Over/Under), BTTS, Cantos & Cartões */}
              <div className="bg-[#141829] border border-zinc-800 rounded-xl p-3.5 space-y-2.5">
                <span className="text-xs font-mono font-bold text-zinc-300 flex items-center gap-1.5">
                  <span>⚽</span>
                  <span>Métricas de Golos &amp; Estatísticas</span>
                </span>

                <div className="grid grid-cols-2 gap-2 text-xs font-mono">
                  <div className="bg-[#0e111c] p-2 rounded-lg border border-zinc-800/80">
                    <div className="text-[10px] text-zinc-400">Mais 1.5 Golos</div>
                    <div className="text-xs font-black text-cyan-300">{activeMetrics.over15Prob}%</div>
                  </div>
                  <div className="bg-[#0e111c] p-2 rounded-lg border border-zinc-800/80">
                    <div className="text-[10px] text-zinc-400">Mais 2.5 Golos</div>
                    <div className="text-xs font-black text-orange-300">{activeMetrics.over25Prob}%</div>
                  </div>
                  <div className="bg-[#0e111c] p-2 rounded-lg border border-zinc-800/80">
                    <div className="text-[10px] text-zinc-400">Ambas Marcam (BTTS)</div>
                    <div className="text-xs font-black text-emerald-300">{activeMetrics.bttsYesProb}%</div>
                  </div>
                  <div className="bg-[#0e111c] p-2 rounded-lg border border-zinc-800/80">
                    <div className="text-[10px] text-zinc-400">xG Total Estimado</div>
                    <div className="text-xs font-black text-amber-300">{activeMetrics.totalXg}</div>
                  </div>
                </div>

                <div className="flex items-center justify-between pt-1 border-t border-zinc-800 text-[11px] font-mono text-zinc-400">
                  <span>🚩 Cantos Projetados: <strong className="text-zinc-200">{activeMetrics.cantosVal}</strong></span>
                  <span>🟨 Cartões Projetados: <strong className="text-zinc-200">{activeMetrics.cartoesVal}</strong></span>
                </div>
              </div>

              {/* Treinadores & Resumo Tático */}
              {(activeMatch.treinador_casa || activeMatch.treinador_fora) && (
                <div className="bg-[#141829] border border-zinc-800 rounded-xl p-3 space-y-1.5 text-xs font-mono">
                  <span className="text-[11px] text-zinc-400 font-bold flex items-center gap-1">
                    <span>👔</span>
                    <span>Duelo no Banco:</span>
                  </span>
                  <div className="flex items-center justify-between text-zinc-200 text-[11px]">
                    <span className="truncate max-w-[140px] text-orange-300">{activeMatch.treinador_casa || 'Treinador Casa'}</span>
                    <span className="text-zinc-500 font-bold">vs</span>
                    <span className="truncate max-w-[140px] text-cyan-300">{activeMatch.treinador_fora || 'Treinador Fora'}</span>
                  </div>
                </div>
              )}
                </>
              )}

              {/* Bottom Multipla Button */}
              <button
                type="button"
                onClick={(e) => onToggleMultiplaSelection(e, activeMatch, activeMetrics)}
                className="w-full py-2.5 px-3 rounded-xl bg-zinc-900 hover:bg-zinc-850 text-amber-300 font-mono text-xs font-bold transition-all border border-amber-500/30 flex items-center justify-center gap-2 cursor-pointer shadow-md"
              >
                <span>☑</span>
                <span>Adicionar ao Boletim de Múltiplas</span>
              </button>
            </div>
          ) : (
            <div className="bg-[#111420] border border-zinc-800 rounded-2xl p-8 text-center space-y-3 font-mono text-xs text-zinc-400">
              <span>👈 Selecione um jogo na lista para visualizar as probabilidades detalhadas e abrir em pop-up.</span>
            </div>
          )}
        </aside>

      </div>
    </div>
  );
};

export default UniscoreThreeColumnView;
