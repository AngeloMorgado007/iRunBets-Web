import React, { useState, useEffect } from 'react';
import { 
  Star, Trophy, ChevronRight, Trash2, Plus, Check, Info, 
  RefreshCw, AlertTriangle, Shield, Calendar, Award, User, X, Edit, MessageSquare, Paintbrush 
} from 'lucide-react';
import { 
  saveFavoriteTeamsFirestore, 
  saveTeamMetaFirestore, 
  getTeamMetaFirestore, 
  subscribeUtilizadorDoc 
} from '../services/firebase';

interface FavoriteTeam {
  name: string;
  leagueCode: string;
  crestUrl?: string;
}

interface TeamDisplayStats {
  teamId: number | string;
  teamName: string;
  crestUrl?: string;
  position: number;
  playedGames: number;
  won: number;
  draw: number;
  lost: number;
  points: number;
  goalsFor: number;
  goalsAgainst: number;
  goalDifference: number;
}

interface ScorerMeta {
  id: string;
  name: string;
  position: 'Avançado' | 'Médio' | 'Defesa';
  injured: boolean;
  goals: number;
}

interface ObservationEntry {
  id: string;
  text: string;
  date: string;
  colorIndex: number; // 0..3
}

interface VipFavoritesProps {
  currentUser: any;
  language: string;
}

const LEAGUES = {
  PPL: 'Primeira Liga (Portugal)',
  PD: 'La Liga (Espanha)',
  PL: 'Premier League (Inglaterra)',
  BL1: 'Bundesliga (Alemanha)',
  SA: 'Serie A (Itália)',
  FL1: 'Ligue 1 (França)',
  DED: 'Eredivisie (Holanda)',
  BSA: 'Brasileirão Série A (Brasil)',
};

const OBSERVATION_PALETTE = [
  { bg: 'bg-cyan-500/10 border-cyan-500/30 text-cyan-400', glow: '#00f2fe' },
  { bg: 'bg-emerald-500/10 border-emerald-500/30 text-emerald-400', glow: '#10b981' },
  { bg: 'bg-orange-500/10 border-orange-500/30 text-orange-400', glow: '#f97316' },
  { bg: 'bg-purple-500/10 border-purple-500/30 text-purple-400', glow: '#8b5cf6' },
];

export const VipFavorites: React.FC<VipFavoritesProps> = ({ currentUser, language }) => {
  const [selectedLeague, setSelectedLeague] = useState<keyof typeof LEAGUES>('PPL');
  const [standings, setStandings] = useState<TeamDisplayStats[]>([]);
  const [loadingStandings, setLoadingStandings] = useState<boolean>(false);
  const [errorStandings, setErrorStandings] = useState<string | null>(null);

  // User Profile Favorites
  const [favoriteTeams, setFavoriteTeams] = useState<FavoriteTeam[]>([]);
  const [loadingUser, setLoadingUser] = useState<boolean>(true);
  const [userPlan, setUserPlan] = useState<string>('gratuito');

  // Selection Detail Modal state
  const [selectedTeam, setSelectedTeam] = useState<TeamDisplayStats | null>(null);
  const [coachName, setCoachName] = useState<string>('');
  const [coachReputation, setCoachReputation] = useState<number>(3);
  const [topScorerName, setTopScorerName] = useState<string>('');
  const [topScorerGoals, setTopScorerGoals] = useState<string>('');
  
  const [top3, setTop3] = useState<ScorerMeta[]>([
    { id: '1', name: '', position: 'Avançado', injured: false, goals: 0 },
    { id: '2', name: '', position: 'Médio', injured: false, goals: 0 },
    { id: '3', name: '', position: 'Defesa', injured: false, goals: 0 },
  ]);

  const [observations, setObservations] = useState<ObservationEntry[]>([]);
  const [newObsText, setNewObsText] = useState<string>('');
  const [savingDetail, setSavingDetail] = useState<boolean>(false);
  const [metaMessage, setMetaMessage] = useState<string | null>(null);

  // Simulated Poisson Opponent state
  const [poissonSimOpen, setPoissonSimOpen] = useState<boolean>(false);
  const [opponentName, setOpponentName] = useState<string>('Oponente');
  const [oppScoredAvg, setOppScoredAvg] = useState<number>(1.2);
  const [oppConcededAvg, setOppConcededAvg] = useState<number>(1.4);
  const [simulationResult, setSimulationResult] = useState<any | null>(null);

  // Tipsters section states and persistence mechanisms
  const [isTipstersModalOpen, setIsTipstersModalOpen] = useState(false);
  const [tipsters, setTipsters] = useState<{ id: string; name: string; network: string; link: string }[]>(() => {
    try {
      const saved = localStorage.getItem('irunbets_my_tipsters');
      return saved ? JSON.parse(saved) : [];
    } catch {
      return [];
    }
  });

  const [newTipsterName, setNewTipsterName] = useState('');
  const [newTipsterNetwork, setNewTipsterNetwork] = useState('Telegram');
  const [newTipsterLink, setNewTipsterLink] = useState('');
  const [editingTipsterId, setEditingTipsterId] = useState<string | null>(null);

  const saveTipsters = (newTipsters: typeof tipsters) => {
    setTipsters(newTipsters);
    localStorage.setItem('irunbets_my_tipsters', JSON.stringify(newTipsters));
  };

  const handleAddOrEditTipster = () => {
    if (!newTipsterLink.trim()) {
      alert(language === 'en' ? 'Please supply a link/url!' : 'Por favor insira o link/URL!');
      return;
    }

    let cleanLink = newTipsterLink.trim();
    if (!/^https?:\/\//i.test(cleanLink)) {
      cleanLink = 'https://' + cleanLink;
    }

    const displayName = newTipsterName.trim() || (language === 'en' ? `Tipster (${newTipsterNetwork})` : `Tipster (${newTipsterNetwork})`);

    if (editingTipsterId) {
      const updated = tipsters.map(t => t.id === editingTipsterId ? { ...t, name: displayName, network: newTipsterNetwork, link: cleanLink } : t);
      saveTipsters(updated);
      setEditingTipsterId(null);
    } else {
      const newItem = {
        id: Date.now().toString() + Math.random().toString().substring(2, 7),
        name: displayName,
        network: newTipsterNetwork,
        link: cleanLink
      };
      saveTipsters([...tipsters, newItem]);
    }

    setNewTipsterName('');
    setNewTipsterNetwork('Telegram');
    setNewTipsterLink('');
  };

  const handleStartEditTipster = (item: { id: string; name: string; network: string; link: string }) => {
    setEditingTipsterId(item.id);
    setNewTipsterName(item.name);
    setNewTipsterNetwork(item.network);
    setNewTipsterLink(item.link);
  };

  const handleDeleteTipster = (id: string) => {
    const updated = tipsters.filter(t => t.id !== id);
    saveTipsters(updated);
    if (editingTipsterId === id) {
      setEditingTipsterId(null);
      setNewTipsterName('');
      setNewTipsterLink('');
    }
  };

  // Subscribe to profile favoriteTeams of utilizadores document
  useEffect(() => {
    if (!currentUser) {
      setFavoriteTeams([]);
      setLoadingUser(false);
      return;
    }

    setLoadingUser(true);
    const unsub = subscribeUtilizadorDoc(currentUser.uid, (profileData) => {
      setLoadingUser(false);
      
      let matchedPlan = '';
      if (profileData) {
        for (const k of Object.keys(profileData)) {
          if (k.toLowerCase().includes('plano') || k.toLowerCase().includes('plan')) {
            const val = String(profileData[k] || '').trim().toLowerCase();
            if (val.includes('pro') || val.includes('premium') || val.includes('vip')) {
              matchedPlan = 'pro';
              break;
            } else if (val.includes('site') || val.includes('local')) {
              matchedPlan = 'site';
              break;
            } else if (val.includes('tipster')) {
              matchedPlan = 'tipster';
              break;
            } else if (val.includes('gratuito') || val.includes('free') || val.includes('guest')) {
              matchedPlan = 'gratuito';
              break;
            }
          }
        }

        if (!matchedPlan) {
          const remainsPremium = profileData.premium || profileData.isPremium || profileData.activeSubscriber;
          if (remainsPremium) {
            const isCloud = profileData.cloudActive || profileData.cloud_active || profileData.syncCloud;
            matchedPlan = isCloud ? 'pro' : 'site';
          } else {
            matchedPlan = 'gratuito';
          }
        }
      }

      if (currentUser) {
        const lowerMail = currentUser.email?.toLowerCase();
        if (lowerMail === 'morgado.aam@gmail.com') {
          matchedPlan = 'pro';
        } else if (lowerMail === 'basic@irunbets.pt' || lowerMail === 'site@irunbets.pt') {
          matchedPlan = 'site';
        }
      }

      const activePlan = matchedPlan || 'gratuito';
      setUserPlan(activePlan);

      if (activePlan === 'pro') {
        let matchedFavorites: any[] | null = null;
        const favKeys = [
          'favoriteteams', 'favorite_teams', 'equipasfavoritas', 'equipas_favoritas', 
          'favorites', 'favoritos', 'teams', 'team_list', 'teamlist'
        ];
        
        if (profileData) {
          for (const k of Object.keys(profileData)) {
            if (favKeys.includes(k.toLowerCase())) {
              const val = profileData[k];
              if (Array.isArray(val)) {
                matchedFavorites = val;
                break;
              }
            }
          }
        }

        if (matchedFavorites) {
          const normalized = matchedFavorites.map(f => {
            if (typeof f === 'string') {
              return { name: f, crestUrl: '', leagueCode: '' };
            }
            return {
              name: f.name || f.teamName || f.team_name || f.title || '',
              crestUrl: f.crestUrl || f.crest_url || f.logo || '',
              leagueCode: f.leagueCode || f.league_code || f.competition || ''
            };
          }).filter(f => f.name);
          setFavoriteTeams(normalized);
        } else {
          setFavoriteTeams([]);
        }
      } else {
        const localFavs = localStorage.getItem('irunbets_favorite_teams_local');
        if (localFavs) {
          try {
            setFavoriteTeams(JSON.parse(localFavs));
          } catch (e) {
            setFavoriteTeams([]);
          }
        } else {
          setFavoriteTeams([]);
        }
      }
    });

    return () => unsub();
  }, [currentUser]);

  // Fetch League Standings
  const fetchLeagueStandings = async (leagueCode: keyof typeof LEAGUES) => {
    setLoadingStandings(true);
    setErrorStandings(null);
    try {
      const resp = await fetch(`/api/getLeagueStandings?competition=${leagueCode}`);
      if (!resp.ok) {
        throw new Error(`HTTP Error Code ${resp.status}`);
      }
      const json = await resp.json();
      
      // Extract standings TOTAL table or aggregate across groups/stages
      if (json && json.data && Array.isArray(json.data.standings)) {
        let allRows: any[] = [];
        const totalStanding = json.data.standings.find((s: any) => s.type === 'TOTAL' || s.type === null);
        
        if (totalStanding && Array.isArray(totalStanding.table) && totalStanding.table.length > 0) {
          allRows = totalStanding.table;
        } else {
          // Aggregate tables from all groups or stages
          json.data.standings.forEach((st: any) => {
            if (Array.isArray(st.table)) {
              allRows.push(...st.table);
            }
          });
        }

        if (allRows.length > 0) {
          const fetchedTable: TeamDisplayStats[] = allRows.map((row: any, index: number) => ({
            teamId: row.team?.id || index,
            teamName: row.team?.name || 'Equipa',
            crestUrl: row.team?.crest || '',
            position: row.position || (index + 1),
            playedGames: row.playedGames || 0,
            won: row.won || 0,
            draw: row.draw || 0,
            lost: row.lost || 0,
            points: row.points || 0,
            goalsFor: row.goalsFor || 0,
            goalsAgainst: row.goalsAgainst || 0,
            goalDifference: row.goalDifference || 0
          }));
          setStandings(fetchedTable);
        } else {
          setStandings([]);
        }
      } else {
        setStandings([]);
      }
    } catch (err: any) {
      console.error('Error loading league standings:', err);
      setErrorStandings(language === 'en' ? 'Unable to load live league standings. Please retry.' : 'Não foi possível carregar os dados classificativos em tempo real. Tente novamente.');
    } finally {
      setLoadingStandings(false);
    }
  };

  useEffect(() => {
    fetchLeagueStandings(selectedLeague);
  }, [selectedLeague]);

  // Handle Toggling Favorite directly to Firestore or LocalStorage depending on userPlan
  const toggleFavorite = async (team: { name: string; crestUrl?: string; leagueCode: string }) => {
    const isFav = favoriteTeams.some(f => f.name === team.name && f.leagueCode === team.leagueCode);
    let updated: FavoriteTeam[];
    
    if (isFav) {
      updated = favoriteTeams.filter(f => !(f.name === team.name && f.leagueCode === team.leagueCode));
    } else {
      updated = [...favoriteTeams, { name: team.name, crestUrl: team.crestUrl, leagueCode: team.leagueCode }];
    }
    
    setFavoriteTeams(updated);
    
    if (currentUser && userPlan === 'pro') {
      await saveFavoriteTeamsFirestore(currentUser.uid, updated);
    } else {
      localStorage.setItem('irunbets_favorite_teams_local', JSON.stringify(updated));
    }
  };

  // Open Details Modal and Load metadata from Firestore/Cache
  const openTeamDetail = async (team: TeamDisplayStats) => {
    setSelectedTeam(team);
    setPoissonSimOpen(false);
    setSimulationResult(null);
    setMetaMessage(null);

    // Initial default values
    setCoachName('');
    setCoachReputation(3);
    setTopScorerName('');
    setTopScorerGoals('');
    setTop3([
      { id: '1', name: '', position: 'Avançado', injured: false, goals: 0 },
      { id: '2', name: '', position: 'Médio', injured: false, goals: 0 },
      { id: '3', name: '', position: 'Defesa', injured: false, goals: 0 },
    ]);
    setObservations([]);

    if (!currentUser) return;

    try {
      let data = await getTeamMetaFirestore(currentUser.uid, team.teamId);
      
      // Fallback 1: Try teamName directly (like "Sporting CP")
      if (!data && team.teamName) {
        data = await getTeamMetaFirestore(currentUser.uid, team.teamName);
      }
      
      // Fallback 2: If teamId is a compound string like "Sporting CP-PPL", split and try the name part
      if (!data && team.teamId && typeof team.teamId === 'string' && team.teamId.includes('-')) {
        const namePart = team.teamId.split('-')[0];
        data = await getTeamMetaFirestore(currentUser.uid, namePart);
      }

      if (data) {
        setCoachName(data.coachName || '');
        setCoachReputation(data.coachReputation || 3);
        setTopScorerName(data.topScorerName || '');
        setTopScorerGoals(data.topScorerGoals ? String(data.topScorerGoals) : '');
        if (Array.isArray(data.top3Scorers)) {
          setTop3(data.top3Scorers);
        }
        if (Array.isArray(data.observations)) {
          setObservations(data.observations);
        }
      }
    } catch (err) {
      console.error('Error loading team details:', err);
    }
  };

  // Save metadata to Firestore
  const handleSaveMeta = async () => {
    if (!currentUser || !selectedTeam) return;
    setSavingDetail(true);
    setMetaMessage(null);

    const metaPayload = {
      teamId: selectedTeam.teamId,
      teamName: selectedTeam.teamName,
      leagueCode: selectedLeague,
      crest: selectedTeam.crestUrl || null,
      coachName,
      coachReputation,
      topScorerName,
      topScorerGoals: topScorerGoals ? parseInt(topScorerGoals) : 0,
      top3Scorers: top3,
      observations
    };

    try {
      // 1. Save to main teamId (e.g. numeric 521 or "Sporting CP-PPL")
      await saveTeamMetaFirestore(currentUser.uid, selectedTeam.teamId, metaPayload);
      
      // 2. Also save to exact teamName (e.g. "Sporting CP") so mobile app matches
      if (selectedTeam.teamName && String(selectedTeam.teamId) !== String(selectedTeam.teamName)) {
        await saveTeamMetaFirestore(currentUser.uid, selectedTeam.teamName, {
          ...metaPayload,
          teamId: selectedTeam.teamName
        });
      }

      // 3. If teamId is a compound string like "Sporting CP-PPL", extract and save to just "Sporting CP"
      if (selectedTeam.teamId && typeof selectedTeam.teamId === 'string' && selectedTeam.teamId.includes('-')) {
        const namePart = selectedTeam.teamId.split('-')[0];
        if (namePart && namePart !== selectedTeam.teamId && namePart !== selectedTeam.teamName) {
          await saveTeamMetaFirestore(currentUser.uid, namePart, {
            ...metaPayload,
            teamId: namePart
          });
        }
      }

      setMetaMessage(language === 'en' ? 'Saved successfully!' : 'Guardado com sucesso!');
      setTimeout(() => setMetaMessage(null), 3000);
    } catch (err) {
      console.error('Error saving team meta:', err);
      setMetaMessage(language === 'en' ? 'Error saving to cloud.' : 'Erro ao sincronizar na cloud.');
    } finally {
      setSavingDetail(false);
    }
  };

  // Add a new observation note with cycling color scheme
  const handleAddObservation = () => {
    if (!newObsText.trim()) return;
    const colorIndex = observations.length % 4;
    const newEntry: ObservationEntry = {
      id: Math.random().toString(36).substring(2, 9),
      text: newObsText,
      date: new Date().toLocaleDateString('pt-PT', { day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit' }),
      colorIndex
    };
    setObservations([newEntry, ...observations]);
    setNewObsText('');
  };

  // Delete an observation note
  const handleDeleteObs = (id: string) => {
    setObservations(observations.filter(o => o.id !== id));
  };

  // Cycle observation background/glow color scheme
  const cycleColorIndex = (id: string) => {
    setObservations(observations.map(o => o.id === id ? { ...o, colorIndex: (o.colorIndex + 1) % 4 } : o));
  };

  // Stats summaries computations
  const getStatsSummaries = () => {
    if (standings.length === 0) return null;
    let bOffense = standings[0];
    let wOffense = standings[0];
    let bDefense = standings[0];
    let wDefense = standings[0];

    standings.forEach(team => {
      if (team.goalsFor > bOffense.goalsFor) bOffense = team;
      if (team.goalsFor < wOffense.goalsFor) wOffense = team;
      if (team.goalsAgainst < bDefense.goalsAgainst) bDefense = team;
      if (team.goalsAgainst > wDefense.goalsAgainst) wDefense = team;
    });

    return { bOffense, wOffense, bDefense, wDefense };
  };

  const summaries = getStatsSummaries();

  // Poisson Factorials for probabilities calculations
  const factorial = (num: number): number => {
    if (num <= 1) return 1;
    let result = 1;
    for (let i = 2; i <= num; i++) result *= i;
    return result;
  };

  const getPoissonProbability = (k: number, lambda: number): number => {
    return (Math.pow(lambda, k) * Math.exp(-lambda)) / factorial(k);
  };

  // Run a quick simulator of selected favorite team vs custom opponent on user values
  const handleRunPoissonSimulation = () => {
    if (!selectedTeam) return;
    
    // Compute current team averages
    const matchesPlayed = selectedTeam.playedGames || 1;
    const homeGoalsScoredAvg = selectedTeam.goalsFor / matchesPlayed;
    const homeGoalsConcededAvg = selectedTeam.goalsAgainst / matchesPlayed;

    // Grid sizes: up to 6 goals (0..5)
    const grid: number[][] = Array(6).fill(0).map(() => Array(6).fill(0));
    
    // Team goals expectation vs Opponent
    const lambdaA = (homeGoalsScoredAvg + oppConcededAvg) / 2;
    const lambdaB = (oppScoredAvg + homeGoalsConcededAvg) / 2;

    let probHomeWin = 0;
    let probAwayWin = 0;
    let probDraw = 0;
    let probOver25 = 0;
    let probUnder25 = 0;

    for (let h = 0; h < 6; h++) {
      for (let a = 0; a < 6; a++) {
        const probH = getPoissonProbability(h, lambdaA);
        const probA = getPoissonProbability(a, lambdaB);
        const cellProb = probH * probA;
        grid[h][a] = cellProb;

        if (h > a) probHomeWin += cellProb;
        else if (a > h) probAwayWin += cellProb;
        else probDraw += cellProb;

        if (h + a > 2.5) probOver25 += cellProb;
        else probUnder25 += cellProb;
      }
    }

    setSimulationResult({
      win: probHomeWin * 100,
      draw: probDraw * 100,
      loss: probAwayWin * 100,
      over25: probOver25 * 100,
      under25: probUnder25 * 100,
      lambdaHome: lambdaA,
      lambdaAway: lambdaB
    });
  };

  return (
    <div className="space-y-8">
      {/* HEADER CONTROLLER BANNER */}
      <div className="p-6 bg-gradient-to-r from-cyan-950/20 via-zinc-950 to-zinc-950 border border-zinc-850 rounded-2xl flex flex-col md:flex-row items-start md:items-center justify-between gap-6 shadow-xl relative overflow-hidden">
        <div className="absolute top-0 right-0 w-64 h-64 bg-[#00f2fe]/[0.02] rounded-full blur-3xl pointer-events-none"></div>
        <div className="space-y-1">
          <span className="text-[10px] font-black text-cyan-400 font-mono tracking-widest uppercase flex items-center gap-1.5">
            <span className="h-1.5 w-1.5 rounded-full bg-cyan-400 animate-pulse"></span>
            {language === 'en' ? 'CHAMPIONSHIPS & FAVORITES CO-PILOT' : 'MÓDULO DE SELECÇÃO DE EQUIPAS E LIGAS ESPELHADAS'}
          </span>
          <h2 className="text-xl font-mono font-bold text-white tracking-tight">
            {language === 'en' ? 'Favourite Teams Workspace' : 'Canais e Equipas Favoritas'}
          </h2>
          <p className="text-xs text-zinc-400 font-light max-w-2xl">
            {language === 'en' 
              ? 'Synchronized directly with your iOS/Android application structure on Firestore. Maintain notes, ratings, scores, and play Poisson forecasts.' 
              : 'Sincronizado diretamente com a estrutura de base de dados partilhada. Guarde plantéis, treinadores, observações de valor e corra Poisson de 1-Clique.'}
          </p>
        </div>
        <div className="flex items-center gap-2">
          <button 
            onClick={() => fetchLeagueStandings(selectedLeague)}
            className="p-2 bg-zinc-900 border border-zinc-800 rounded-xl text-zinc-400 hover:text-white transition-colors"
            title="Sincronizar"
          >
            <RefreshCw size={15} className={loadingStandings ? 'animate-spin' : ''} />
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-12 gap-8 items-start">
        
        {/* LEFT COLUMN: STANDINGS AND SUMMARIES (COL-SPAN 8) */}
        <div className="xl:col-span-8 space-y-6">
          
          {/* LEAGUE STANDINGS WORKSPACE */}
          <div className="bg-[#0b0b0e] border border-zinc-850/80 p-5 rounded-2xl shadow-xl space-y-4">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-zinc-850/50 pb-4">
              <div className="flex items-center gap-2.5">
                <div className="h-6 w-1 bg-cyan-400 rounded-full"></div>
                <h3 className="text-xs font-black text-zinc-100 uppercase tracking-widest font-mono">
                  {language === 'en' ? 'Live League Table' : 'Tabelas Classificativas'}
                </h3>
              </div>
              <div className="flex items-center gap-2">
                <span className="text-[10px] font-mono text-zinc-500">{language === 'en' ? 'LEAGUE:' : 'LIGA:'}</span>
                <select 
                  value={selectedLeague} 
                  onChange={(e) => setSelectedLeague(e.target.value as keyof typeof LEAGUES)}
                  className="bg-zinc-950 border border-zinc-800 rounded-xl px-3 py-1.5 text-xs text-white uppercase font-mono tracking-wider outline-none focus:border-cyan-400 transition-colors"
                >
                  {Object.entries(LEAGUES).map(([code, name]) => (
                    <option key={code} value={code} className="bg-zinc-950 text-white">{name}</option>
                  ))}
                </select>
              </div>
            </div>

            {loadingStandings ? (
              <div className="py-16 flex flex-col items-center justify-center gap-3">
                <RefreshCw size={26} className="text-cyan-400 animate-spin" />
                <span className="text-xs text-zinc-500 font-mono tracking-wider">
                  {language === 'en' ? 'Fetching live table metadata...' : 'A sincronizar dados desportivos...'}
                </span>
              </div>
            ) : errorStandings ? (
              <div className="p-4 bg-red-500/5 border border-red-500/20 rounded-xl flex items-center gap-3 text-red-400 text-xs">
                <AlertTriangle size={16} />
                <span>{errorStandings}</span>
              </div>
            ) : standings.length === 0 ? (
              <p className="text-xs text-zinc-500 py-10 text-center font-mono">
                {language === 'en' ? 'No standings retrieved for this code.' : 'Sem registos de tabela disponiveis de momento.'}
              </p>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-left text-zinc-300 text-xs font-mono">
                  <thead>
                    <tr className="border-b border-zinc-850 text-zinc-550 uppercase font-mono tracking-wider text-[10px]">
                      <th className="py-1.5 pl-2 w-8 text-center">Pos</th>
                      <th className="py-1.5">Equipa</th>
                      <th className="py-1.5 text-center w-10">Pts</th>
                      <th className="py-1.5 text-center w-6">J</th>
                      <th className="py-1.5 text-center w-6">V</th>
                      <th className="py-1.5 text-center w-6">E</th>
                      <th className="py-1.5 text-center w-6">D</th>
                      <th className="py-1.5 text-center w-14">Golos</th>
                      <th className="py-1.5 text-center w-10 pr-2">DG</th>
                    </tr>
                  </thead>
                  <tbody>
                    {standings.map((team) => {
                      const isFav = favoriteTeams.some(f => f.name === team.teamName && f.leagueCode === selectedLeague);
                      return (
                        <tr 
                          key={`${team.teamId || 'team'}-${team.teamName}-${team.position}`}
                          className="border-b border-zinc-900/40 hover:bg-zinc-900/40 hover:text-white transition-colors cursor-pointer group"
                          onClick={() => openTeamDetail(team)}
                        >
                          <td className="py-1.5 text-center pl-2">
                            <span className={`inline-flex items-center justify-center w-4 h-4 rounded font-bold text-[9px] ${
                              team.position <= 3 
                                ? 'bg-cyan-500/15 text-cyan-400 border border-cyan-500/20 shadow-[0_0_3px_rgba(0,242,254,0.1)]' 
                                : team.position >= standings.length - 2 
                                  ? 'bg-rose-500/15 text-rose-400 border border-rose-500/25' 
                                  : 'bg-zinc-900 text-zinc-400'
                            }`}>
                              {team.position}
                            </span>
                          </td>
                          <td className="py-1.5 font-semibold text-zinc-200 group-hover:text-cyan-400 transition-colors">
                            <div className="flex items-center gap-2">
                              {team.crestUrl ? (
                                <img src={team.crestUrl} alt={team.teamName} className="w-5 h-5 flex-shrink-0 object-contain" onError={(e) => { (e.target as HTMLElement).style.display = 'none'; }} />
                              ) : (
                                <Shield size={12} className="text-zinc-600 flex-shrink-0" />
                              )}
                              <span className="truncate max-w-[110px] sm:max-w-[180px] text-xs font-sans tracking-wide">{team.teamName}</span>
                              <button
                                onClick={(e) => {
                                  e.stopPropagation();
                                  toggleFavorite({ name: team.teamName, crestUrl: team.crestUrl, leagueCode: selectedLeague });
                                }}
                                className={`ml-auto p-0.5 text-zinc-600 hover:text-yellow-400 transition-colors opacity-0 group-hover:opacity-100 ${isFav ? 'opacity-100 text-yellow-500' : ''}`}
                              >
                                <Star size={11} fill={isFav ? 'currentColor' : 'none'} />
                              </button>
                            </div>
                          </td>
                          <td className="py-1.5 text-center font-bold text-yellow-400">{team.points}</td>
                          <td className="py-1.5 text-center text-zinc-400">{team.playedGames}</td>
                          <td className="py-1.5 text-center text-emerald-400">{team.won}</td>
                          <td className="py-1.5 text-center text-zinc-400">{team.draw}</td>
                          <td className="py-1.5 text-center text-rose-400">{team.lost}</td>
                          <td className="py-1.5 text-center font-light text-zinc-500">{team.goalsFor}:{team.goalsAgainst}</td>
                          <td className={`py-1.5 text-center font-semibold text-xs pr-2 ${team.goalDifference > 0 ? 'text-emerald-400' : team.goalDifference < 0 ? 'text-rose-400' : 'text-zinc-500'}`}>
                            {team.goalDifference > 0 ? `+${team.goalDifference}` : team.goalDifference}
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )}
          </div>

          {/* AUTO COMPUTES STAT SUMMARY BOX */}
          {summaries && (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="p-4 bg-zinc-950 border border-zinc-850 rounded-xl space-y-2">
                <span className="text-[9px] uppercase font-bold text-zinc-500 tracking-wider flex items-center gap-1.5 label select-none font-mono">
                  <Award size={10} className="text-cyan-400" />
                  {language === 'en' ? 'GOL REGISTERS (ATTACK)' : 'Registos Goleadores (Ataque)'}
                </span>
                <div className="space-y-1.5 text-xs font-mono">
                  <div className="flex justify-between items-center bg-[#07070a] p-2 rounded-lg border border-zinc-900">
                    <span className="text-zinc-400">{language === 'en' ? 'Best Attack:' : 'Melhor Ataque:'}</span>
                    <span className="text-emerald-400 font-bold">{summaries.bOffense.teamName} <span className="text-[10px] text-zinc-500">({summaries.bOffense.goalsFor} GM)</span></span>
                  </div>
                  <div className="flex justify-between items-center bg-[#07070a] p-2 rounded-lg border border-zinc-900">
                    <span className="text-zinc-400">{language === 'en' ? 'Least Scored:' : 'Pior Ataque:'}</span>
                    <span className="text-zinc-400">{summaries.wOffense.teamName} <span className="text-[10px] text-rose-500">({summaries.wOffense.goalsFor} GM)</span></span>
                  </div>
                </div>
              </div>
              
              <div className="p-4 bg-zinc-950 border border-zinc-850 rounded-xl space-y-2">
                <span className="text-[9px] uppercase font-bold text-zinc-500 tracking-wider flex items-center gap-1.5 label select-none font-mono">
                  <Shield size={10} className="text-rose-400" />
                  {language === 'en' ? 'DEFENSIVE SOLIDITY' : 'Consistência Defensiva (Sofridos)'}
                </span>
                <div className="space-y-1.5 text-xs font-mono">
                  <div className="flex justify-between items-center bg-[#07070a] p-2 rounded-lg border border-zinc-900">
                    <span className="text-zinc-400">{language === 'en' ? 'Best Defense:' : 'Melhor Defesa:'}</span>
                    <span className="text-emerald-400 font-bold">{summaries.bDefense.teamName} <span className="text-[10px] text-zinc-500">({summaries.bDefense.goalsAgainst} GS)</span></span>
                  </div>
                  <div className="flex justify-between items-center bg-[#07070a] p-2 rounded-lg border border-zinc-900">
                    <span className="text-zinc-400">{language === 'en' ? 'Weakest Defense:' : 'Pior Defesa:'}</span>
                    <span className="text-rose-400 font-bold">{summaries.wDefense.teamName} <span className="text-[10px] text-rose-500">({summaries.wDefense.goalsAgainst} GS)</span></span>
                  </div>
                </div>
              </div>
            </div>
          )}

        </div>

        {/* RIGHT COLUMN: REGLIST FAVORITES AND BRIEF DETAILS PANEL (COL-SPAN 4) */}
        <div className="xl:col-span-4 space-y-6">
          
          {/* FAVORITE CLUBS PANEL */}
          <div className="bg-[#0b0b0e] border border-zinc-850/80 p-5 rounded-2xl shadow-xl space-y-4">
            <div className="flex items-center justify-between border-b border-zinc-850/40 pb-3">
              <h3 className="text-xs font-black text-white uppercase tracking-wider flex items-center gap-2 font-mono">
                <Star size={14} className="text-yellow-400 fill-yellow-400" />
                {language === 'en' ? 'MY FAVORITED CLUBS' : 'AS MINHAS EQUIPAS'}
              </h3>
              {userPlan === 'pro' ? (
                <span className="text-[9px] bg-emerald-500/10 text-emerald-400 px-2 py-0.5 rounded-full border border-emerald-500/20 font-mono flex items-center gap-1">
                  ☁️ CLOUD SYNC
                </span>
              ) : (
                <span className="text-[9px] bg-amber-500/10 text-amber-400 px-2 py-0.5 rounded-full border border-amber-500/20 font-mono flex items-center gap-1">
                  💾 LOCAL STORAGE
                </span>
              )}
            </div>

            {userPlan !== 'pro' && (
              <div className="p-2.5 bg-amber-500/5 rounded-xl border border-amber-500/10 text-[9px] text-amber-500/80 leading-normal font-mono">
                {language === 'en' 
                  ? '☁️ Want multi-device sync? Upgrade to the Pro plan (6€/mo) to keep favorites in sync with iOS & Android!'
                  : '☁️ Quer sincronizar entre dispositivos? Adira ao plano Cloud Pro (6€/mês) para sincronizar com as apps Android e iOS!'}
              </div>
            )}

            {loadingUser ? (
              <div className="py-10 text-center flex flex-col items-center justify-center gap-2">
                <RefreshCw size={18} className="text-zinc-500 animate-spin" />
                <span className="text-[10px] text-zinc-500 font-mono tracking-wider">{language === 'en' ? 'Synchronizing with profile...' : 'A ler as suas equipas...'}</span>
              </div>
            ) : favoriteTeams.length === 0 ? (
              <div className="py-8 text-center space-y-2">
                <p className="text-xs text-zinc-500 font-mono">
                  {language === 'en' ? 'You have not favorited any clubs yet.' : 'Ainda não adicionou nenhuma equipa favorita.'}
                </p>
                <p className="text-[10px] text-zinc-600 leading-normal font-light">
                  {language === 'en' ? 'Select a league on the left and tap the star next to any team name.' : 'Selecione uma liga à esquerda e clique na estrela de qualquer clube para marcar.'}
                </p>
              </div>
            ) : (
              <div className="space-y-2.5">
                {favoriteTeams.map((fav, index) => {
                  return (
                    <div 
                      key={`${fav.name}-${fav.leagueCode}-${index}`}
                      className="group p-3 bg-zinc-950 border border-zinc-850/60 rounded-xl flex items-center justify-between hover:border-cyan-500/30 transition-all cursor-pointer"
                      onClick={() => {
                        // Open metadata if team is currently available in listed table (to get stats) OR construct virtual team
                        const matchInStandings = standings.find(s => s.teamName === fav.name && selectedLeague === fav.leagueCode);
                        const teamDataToOpen: TeamDisplayStats = matchInStandings || {
                          teamId: `${fav.name}-${fav.leagueCode}`,
                          teamName: fav.name,
                          crestUrl: fav.crestUrl,
                          position: 0,
                          playedGames: 0,
                          won: 0,
                          draw: 0,
                          lost: 0,
                          points: 0,
                          goalsFor: 0,
                          goalsAgainst: 0,
                          goalDifference: 0
                        };
                        openTeamDetail(teamDataToOpen);
                      }}
                    >
                      <div className="flex items-center gap-3">
                        {fav.crestUrl ? (
                          <img src={fav.crestUrl} alt={fav.name} className="w-5 h-5 object-contain" onError={(e) => { (e.target as HTMLElement).style.display = 'none'; }} />
                        ) : (
                          <Shield size={14} className="text-zinc-500" />
                        )}
                        <div className="space-y-0.5">
                          <p className={`text-xs font-mono font-bold ${index % 2 === 0 ? 'text-[#00f2fe]' : 'text-white'}`}>
                            {fav.name}
                          </p>
                          <p className="text-[9px] font-mono text-zinc-500 uppercase">
                            {fav.leagueCode}
                          </p>
                        </div>
                      </div>

                      <div className="flex items-center gap-1.5 opacity-0 group-hover:opacity-100 transition-opacity">
                        <button 
                          onClick={(e) => {
                            e.stopPropagation();
                            toggleFavorite(fav);
                          }}
                          className="p-1 px-1.5 hover:bg-rose-500/10 hover:text-rose-400 text-zinc-500 rounded-md transition-all border border-transparent hover:border-rose-500/20"
                          title="Apagar"
                        >
                          <Trash2 size={13} />
                        </button>
                        <ChevronRight size={14} className="text-zinc-500" />
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>

          {/* MY CUSTOM TIPSTERS PANEL */}
          <div className="bg-[#0b0b0e] border border-zinc-850/80 p-5 rounded-2xl shadow-xl space-y-4">
            <div className="flex justify-between items-center border-b border-zinc-850/40 pb-3">
              <h3 className="text-xs font-black text-white uppercase tracking-wider flex items-center gap-2 font-mono">
                <MessageSquare size={14} className="text-purple-400" />
                {language === 'en' ? 'MY TARGET TIPSTERS' : 'OS MEUS TIPSTERS'}
              </h3>
              <span className="text-[10px] bg-purple-500/10 text-purple-400 border border-purple-500/20 px-2 py-0.5 rounded-full font-mono font-bold">
                {tipsters.length}
              </span>
            </div>

            {tipsters.length === 0 ? (
              <div className="py-4 text-center space-y-3">
                <p className="text-xs text-zinc-500 font-mono">
                  {language === 'en' ? 'No custom tipster links configured.' : 'Nenhum canal ou tipster registado ainda.'}
                </p>
                <p className="text-[9px] text-zinc-605 leading-normal font-light">
                  {language === 'en' ? 'Click below to register channels like Vento Vencemos, Lets go Greens, etc.' : 'Registe os canais que segue (ex: Vento Vencemos, Lets go Greens) com links diretos.'}
                </p>
              </div>
            ) : (
              <div className="space-y-2">
                {tipsters.map((item) => {
                  let networkColor = 'text-sky-400 bg-sky-500/10 border-sky-500/20';
                  if (item.network === 'WhatsApp') networkColor = 'text-emerald-400 bg-emerald-500/10 border-emerald-500/20';
                  if (item.network === 'Facebook') networkColor = 'text-blue-400 bg-blue-500/10 border-blue-500/20';
                  if (item.network === 'Instagram') networkColor = 'text-pink-400 bg-pink-500/10 border-pink-500/20';

                  return (
                    <a
                      key={item.id || item.name}
                      href={item.link}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="group p-2.5 bg-zinc-950/80 hover:bg-zinc-900 border border-zinc-850/50 hover:border-purple-500/30 rounded-xl flex items-center justify-between transition-all font-mono"
                      title={language === 'en' ? 'Open Channel' : 'Abrir Canal'}
                    >
                      <div className="flex items-center gap-2.5 truncate">
                        <span className={`text-[9px] font-mono px-1.5 py-0.5 rounded border ${networkColor}`}>
                          {item.network}
                        </span>
                        <div className="truncate">
                          <p className="text-xs font-bold text-zinc-200 group-hover:text-purple-300 transition-colors truncate">
                            {item.name}
                          </p>
                          <p className="text-[9px] text-zinc-500 truncate max-w-[140px] sm:max-w-xs">
                            {item.link}
                          </p>
                        </div>
                      </div>
                      <ChevronRight size={13} className="text-zinc-600 group-hover:text-purple-400 transition-all transform group-hover:translate-x-0.5" />
                    </a>
                  );
                })}
              </div>
            )}

            {/* Neon Dark Blue Button */}
            <button
              type="button"
              onClick={() => {
                setEditingTipsterId(null);
                setNewTipsterName('');
                setNewTipsterLink('');
                setIsTipstersModalOpen(true);
              }}
              className="w-full py-2.5 bg-[#001030] hover:bg-[#001a4f] text-cyan-400 hover:text-cyan-300 border border-cyan-500/30 hover:border-cyan-400/50 font-mono font-bold text-[10.5px] uppercase tracking-widest rounded-xl transition-all shadow-[0_0_15px_rgba(6,182,212,0.15)] hover:shadow-[0_0_20px_rgba(6,182,212,0.3)] active:scale-95 flex items-center justify-center gap-2 cursor-pointer"
            >
              <Plus size={14} className="stroke-[2.5]" />
              {language === 'en' ? 'MANAGE MY TIPSTERS' : 'OS MEUS TIPSTERS'}
            </button>
          </div>

        </div>

      </div>

      {/* TEAM DETAILED SHEET / PROFILE MODAL */}
      {selectedTeam && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/85 backdrop-blur-sm p-4 overflow-y-auto">
          <div className="w-full max-w-2xl bg-[#0b0b0e] border border-zinc-800 rounded-2xl shadow-2xl relative max-h-[90vh] overflow-y-auto flex flex-col text-zinc-300 font-mono">
            
            {/* Modal Header */}
            <div className="p-4 sm:p-5 border-b border-zinc-900 flex items-center justify-between bg-zinc-950">
              <div className="flex items-center gap-3">
                {selectedTeam.crestUrl ? (
                  <img src={selectedTeam.crestUrl} alt={selectedTeam.teamName} className="w-8 h-8 object-contain" />
                ) : (
                  <Shield size={24} className="text-cyan-400" />
                )}
                <div>
                  <h3 className="text-sm sm:text-base font-bold text-white leading-tight font-display">{selectedTeam.teamName}</h3>
                  <p className="text-[10px] text-zinc-500 uppercase tracking-widest font-mono">
                    {selectedLeague} • {language === 'en' ? 'CO-PILOT DATA SYNC' : 'REGISTO DE VALOR IA'}
                  </p>
                </div>
              </div>

              <div className="flex items-center gap-2">
                <button
                  onClick={() => toggleFavorite({ name: selectedTeam.teamName, crestUrl: selectedTeam.crestUrl, leagueCode: selectedLeague })}
                  className="p-1.5 px-2 bg-gradient-to-r from-zinc-900 to-zinc-950 text-xs border border-zinc-800 rounded-lg hover:border-yellow-400 text-yellow-500 flex items-center gap-1.5 transition-colors font-mono"
                >
                  <Star size={13} fill={favoriteTeams.some(f => f.name === selectedTeam.teamName && f.leagueCode === selectedLeague) ? 'currentColor' : 'none'} />
                  {favoriteTeams.some(f => f.name === selectedTeam.teamName && f.leagueCode === selectedLeague) ? 'FAV' : '+ FAV'}
                </button>
                <button 
                  onClick={() => setSelectedTeam(null)}
                  className="p-1 px-1.5 text-zinc-500 hover:text-white hover:bg-zinc-900 border border-zinc-800 rounded-lg transition-colors"
                >
                  <X size={15} />
                </button>
              </div>
            </div>

            {/* Modal Body */}
            <div className="p-5 sm:p-6 overflow-y-auto space-y-6 flex-1 text-xs">
              
              {/* COMPACT BASIC STATS CARDS */}
              {selectedTeam.playedGames > 0 && (
                <div className="p-3 bg-zinc-950/80 border border-zinc-900 rounded-xl grid grid-cols-5 gap-1.5 text-center text-[10px] font-mono select-none">
                  <div>
                    <span className="block text-zinc-500 text-[8px] uppercase">{language === 'en' ? 'POSITION' : 'POSIÇÃO'}</span>
                    <span className="block font-bold text-yellow-400 text-sm mt-0.5">{selectedTeam.position}º</span>
                  </div>
                  <div>
                    <span className="block text-zinc-500 text-[8px] uppercase">{language === 'en' ? 'PLAYED' : 'JOGADOS'}</span>
                    <span className="block font-bold text-white text-sm mt-0.5">{selectedTeam.playedGames}</span>
                  </div>
                  <div>
                    <span className="block text-zinc-500 text-[8px] uppercase">{language === 'en' ? 'WINS' : 'VITÓRIAS'}</span>
                    <span className="block font-bold text-emerald-400 text-sm mt-0.5">{selectedTeam.won}</span>
                  </div>
                  <div>
                    <span className="block text-zinc-500 text-[8px] uppercase">{language === 'en' ? 'GOALS' : 'GOLOS'}</span>
                    <span className="block font-bold text-zinc-400 text-sm mt-0.5">{selectedTeam.goalsFor}:{selectedTeam.goalsAgainst}</span>
                  </div>
                  <div>
                    <span className="block text-zinc-500 text-[8px] uppercase">{language === 'en' ? 'PTS' : 'PONTOS'}</span>
                    <span className="block font-bold text-yellow-500 text-sm mt-0.5">{selectedTeam.points}</span>
                  </div>
                </div>
              )}

              {/* SIMULATE POISSON WORKSPACE TOGGLE */}
              <div className="p-4 bg-gradient-to-r from-cyan-950/10 to-zinc-950/40 border border-[#00f2fe]/10 rounded-xl space-y-3">
                <div className="flex justify-between items-center bg-zinc-950/50 p-1 px-2.5 rounded-lg border border-zinc-900">
                  <span className="text-zinc-300 font-bold flex items-center gap-1.5 truncate">
                    <Trophy size={13} className="text-cyan-400" />
                    {language === 'en' ? 'Quick Poisson Match Predictor' : 'Calculador / Simulador Poisson Clássico'}
                  </span>
                  <button 
                    onClick={() => {
                      setPoissonSimOpen(!poissonSimOpen);
                      if (!poissonSimOpen) handleRunPoissonSimulation();
                    }}
                    className="text-[10px] text-cyan-400 hover:underline font-mono"
                  >
                    {poissonSimOpen ? (language === 'en' ? 'Hide Simulator' : 'Ocultar Simulador') : (language === 'en' ? 'Open Calculator' : 'Simular 1-Clique')}
                  </button>
                </div>

                {poissonSimOpen && (
                  <div className="space-y-4 pt-1 transition-all">
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
                      <div className="space-y-1">
                        <label className="text-[9px] text-zinc-500 uppercase font-mono tracking-widest">Oponente (Personalizado)</label>
                        <input 
                          type="text" 
                          value={opponentName}
                          onChange={(e) => setOpponentName(e.target.value)}
                          className="w-full bg-zinc-950 border border-zinc-800 rounded-lg px-2.5 py-1.5 text-xs text-white outline-none focus:border-cyan-400"
                        />
                      </div>
                      <div className="grid grid-cols-2 gap-1.5">
                        <div className="space-y-1">
                          <label className="text-[8px] text-zinc-500 uppercase truncate block">GM/Jogo Oponente</label>
                          <input 
                            type="number" 
                            step="0.1" 
                            value={oppScoredAvg}
                            onChange={(e) => {
                              setOppScoredAvg(parseFloat(e.target.value) || 0);
                              setTimeout(handleRunPoissonSimulation, 100);
                            }}
                            className="w-full bg-zinc-950 border border-zinc-800 rounded-lg px-2 py-1.5 text-xs text-emerald-400 text-center outline-none focus:border-cyan-400"
                          />
                        </div>
                        <div className="space-y-1">
                          <label className="text-[8px] text-zinc-500 uppercase truncate block">GS/Jogo Oponente</label>
                          <input 
                            type="number" 
                            step="0.1" 
                            value={oppConcededAvg}
                            onChange={(e) => {
                              setOppConcededAvg(parseFloat(e.target.value) || 0);
                              setTimeout(handleRunPoissonSimulation, 100);
                            }}
                            className="w-full bg-zinc-950 border border-zinc-800 rounded-lg px-2 py-1.5 text-xs text-rose-400 text-center outline-none focus:border-cyan-400"
                          />
                        </div>
                      </div>
                    </div>

                    <button 
                      onClick={handleRunPoissonSimulation}
                      className="w-full py-1.5 text-xs font-black uppercase text-center bg-cyan-500/10 text-cyan-400 border border-cyan-500/30 hover:bg-cyan-500/20 rounded-lg transition-colors font-mono"
                    >
                      {language === 'en' ? 'Re-run Poisson Probability Grid' : 'Calcular Probabilidades de Golos'}
                    </button>

                    {simulationResult && (
                      <div className="bg-zinc-950 p-3 rounded-lg border border-zinc-850 space-y-2 text-xs font-mono">
                        <div className="grid grid-cols-3 gap-2.5 text-center text-[10px]">
                          <div className="p-2 bg-gradient-to-b from-[#07070a] to-zinc-950 rounded border border-zinc-900">
                            <span className="block text-[8px] text-zinc-500 uppercase">Vitória {selectedTeam.teamName}</span>
                            <span className="block font-bold text-emerald-400 text-xs mt-0.5">{simulationResult.win.toFixed(1)}%</span>
                          </div>
                          <div className="p-2 bg-gradient-to-b from-[#07070a] to-zinc-950 rounded border border-zinc-900">
                            <span className="block text-[8px] text-zinc-500 uppercase">Empate</span>
                            <span className="block font-bold text-zinc-300 text-xs mt-0.5">{simulationResult.draw.toFixed(1)}%</span>
                          </div>
                          <div className="p-2 bg-gradient-to-b from-[#07070a] to-zinc-950 rounded border border-zinc-900">
                            <span className="block text-[8px] text-zinc-500 uppercase">Vitória {opponentName}</span>
                            <span className="block font-bold text-rose-400 text-xs mt-0.5">{simulationResult.loss.toFixed(1)}%</span>
                          </div>
                        </div>

                        <div className="grid grid-cols-2 gap-2.5 text-center text-[10px] pt-1">
                          <div className="p-1 px-2.5 flex items-center justify-between bg-zinc-900/40 rounded border border-zinc-900">
                            <span className="text-zinc-500 uppercase text-[8px]">{language === 'en' ? 'PROB OVER 2.5:' : 'Probabilidade +2.5 Golos:'}</span>
                            <span className="font-bold text-yellow-400">{simulationResult.over25.toFixed(1)}%</span>
                          </div>
                          <div className="p-1 px-2.5 flex items-center justify-between bg-zinc-900/40 rounded border border-zinc-900">
                            <span className="text-zinc-500 uppercase text-[8px]">{language === 'en' ? 'PROB UNDER 2.5:' : 'Probabilidade -2.5 Golos:'}</span>
                            <span className="font-bold text-zinc-400">{simulationResult.under25.toFixed(1)}%</span>
                          </div>
                        </div>
                      </div>
                    )}
                  </div>
                )}
              </div>

              {/* COACH AND PLAYER EDIT FIELDS */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="space-y-4 p-4 bg-zinc-950/40 border border-zinc-900 rounded-xl">
                  <h4 className="font-bold text-white uppercase tracking-wider text-[10px] border-b border-zinc-900 pb-2 flex items-center gap-1.5">
                    <User size={12} className="text-cyan-400" />
                    {language === 'en' ? 'Coach Profile' : 'Ficha Técnica do Treinador'}
                  </h4>

                  <div className="space-y-1">
                    <label className="text-[9px] text-zinc-500 uppercase block font-mono">{language === 'en' ? 'COACH NAME:' : 'TREINADOR:'}</label>
                    <input 
                      type="text"
                      value={coachName}
                      onChange={(e) => setCoachName(e.target.value)}
                      placeholder="Ex: José Mourinho"
                      className="w-full bg-zinc-950 border border-zinc-800 rounded-lg px-2.5 py-1.5 outline-none focus:border-cyan-400 placeholder-zinc-700"
                    />
                  </div>

                  <div className="space-y-1">
                    <label className="text-[9px] text-zinc-500 uppercase block font-mono">{language === 'en' ? 'REPUTATION TEAM VALUE:' : 'REPUTAÇÃO ESTRELA (1-5):'}</label>
                    <div className="flex items-center gap-1.5 pt-1">
                      {[1, 2, 3, 4, 5].map((star) => (
                        <button 
                          key={star} 
                          onClick={() => setCoachReputation(star)}
                          className="hover:scale-110 transition-transform"
                        >
                          <Star 
                            size={16} 
                            className={star <= coachReputation ? 'text-yellow-400 fill-yellow-400' : 'text-zinc-700'} 
                          />
                        </button>
                      ))}
                      <span className="text-[10px] text-zinc-500 ml-2 font-mono">{coachReputation}/5 Stars</span>
                    </div>
                  </div>
                </div>

                <div className="space-y-4 p-4 bg-zinc-950/40 border border-zinc-900 rounded-xl">
                  <h4 className="font-bold text-white uppercase tracking-wider text-[10px] border-b border-zinc-900 pb-2 flex items-center gap-1.5">
                    <Award size={12} className="text-yellow-400" />
                    {language === 'en' ? 'Season Goal Scorer' : 'Melhor Marcador da Época'}
                  </h4>

                  <div className="space-y-1">
                    <label className="text-[9px] text-zinc-500 uppercase block font-mono">{language === 'en' ? 'PLAYER:' : 'NOME DO ATLETA:'}</label>
                    <input 
                      type="text"
                      value={topScorerName}
                      onChange={(e) => setTopScorerName(e.target.value)}
                      placeholder="Ex: Viktor Gyökeres"
                      className="w-full bg-zinc-950 border border-zinc-800 rounded-lg px-2.5 py-1.5 outline-none focus:border-cyan-400 placeholder-zinc-700"
                    />
                  </div>

                  <div className="space-y-1">
                    <label className="text-[9px] text-zinc-500 uppercase block font-mono">{language === 'en' ? 'ESTIMATED GOALS:' : 'SOMA DE GOLOS REGISTADOS:'}</label>
                    <input 
                      type="number"
                      value={topScorerGoals}
                      onChange={(e) => setTopScorerGoals(e.target.value)}
                      placeholder="Ex: 12"
                      className="w-full bg-zinc-950 border border-zinc-800 rounded-lg px-2.5 py-1.5 outline-none focus:border-cyan-400 placeholder-zinc-700"
                    />
                  </div>
                </div>
              </div>

              {/* TOP 3 SCORERS SUB-LIST */}
              <div className="p-4 bg-zinc-950/40 border border-zinc-900 rounded-xl space-y-3">
                <h4 className="font-bold text-white uppercase tracking-wider text-[10px] border-b border-zinc-900 pb-2 flex items-center gap-1.5 font-mono">
                  <Award size={12} className="text-[#00f2fe]" />
                  {language === 'en' ? 'Squad Key Scorers (Avançado/Médio)' : 'Plantel de Destaques (Top 3 Melhores Marcadores)'}
                </h4>

                <div className="space-y-2.5">
                  {top3.map((scorer, index) => (
                    <div key={scorer.id || `scorer-${index}`} className="grid grid-cols-1 md:grid-cols-12 gap-2 bg-[#060608] p-2.5 rounded-lg border border-zinc-900 items-center">
                      <div className="md:col-span-1 text-zinc-500 font-bold text-center text-[10px]">{index + 1}</div>
                      
                      {/* Name input */}
                      <div className="md:col-span-4 select-none">
                        <input 
                          type="text"
                          value={scorer.name}
                          onChange={(e) => {
                            const updated = [...top3];
                            updated[index].name = e.target.value;
                            setTop3(updated);
                          }}
                          placeholder={language === 'en' ? `Scorer Name ${index+1}` : `Nome do Jogador ${index+1}`}
                          className="w-full bg-zinc-950 border border-zinc-850 rounded px-2 py-1 text-[11px] text-white outline-none placeholder-zinc-800 focus:border-cyan-400/50"
                        />
                      </div>

                      {/* Position Select */}
                      <div className="md:col-span-3">
                        <select
                          value={scorer.position}
                          onChange={(e) => {
                            const updated = [...top3];
                            updated[index].position = e.target.value as any;
                            setTop3(updated);
                          }}
                          className="w-full bg-zinc-950 border border-zinc-850 rounded px-2 py-1 text-[11px] text-zinc-400 outline-none"
                        >
                          <option value="Avançado">Avançado</option>
                          <option value="Médio">Médio</option>
                          <option value="Defesa">Defesa</option>
                        </select>
                      </div>

                      {/* Goals input */}
                      <div className="md:col-span-2">
                        <input 
                          type="number"
                          value={scorer.goals || ''}
                          onChange={(e) => {
                            const updated = [...top3];
                            updated[index].goals = parseInt(e.target.value) || 0;
                            setTop3(updated);
                          }}
                          placeholder="Golos"
                          className="w-full bg-zinc-950 border border-zinc-850 rounded px-2 py-1 text-[11px] text-center text-emerald-400 outline-none"
                        />
                      </div>

                      {/* Injured toggle */}
                      <div className="md:col-span-2 text-center flex items-center justify-center gap-1.5">
                        <input 
                          type="checkbox"
                          id={`injured-${scorer.id}`}
                          checked={scorer.injured}
                          onChange={(e) => {
                            const updated = [...top3];
                            updated[index].injured = e.target.checked;
                            setTop3(updated);
                          }}
                          className="rounded border-zinc-850 bg-zinc-950 accent-rose-500 h-3 w-3"
                        />
                        <label htmlFor={`injured-${scorer.id}`} className="text-[10px] text-rose-400 font-bold font-mono uppercase select-none cursor-pointer">
                          {language === 'en' ? 'INJURED' : 'LESIONADO'}
                        </label>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* TIMELINE OBSERVATIONS NOTES LIST */}
              <div className="p-4 bg-zinc-950/40 border border-zinc-900 rounded-xl space-y-4">
                <h4 className="font-bold text-white uppercase tracking-wider text-[10px] border-b border-zinc-900 pb-2 flex items-center justify-between font-mono">
                  <span className="flex items-center gap-1.5">
                    <MessageSquare size={12} className="text-cyan-400" />
                    {language === 'en' ? 'Observations Timeline' : 'Notas e Observações (Lançamentos de Valor)'}
                  </span>
                  <span className="text-[9px] text-zinc-500 font-mono">
                    {observations.length} {language === 'en' ? 'entries' : 'entradas'}
                  </span>
                </h4>

                {/* Add new Observation */}
                <div className="space-y-2">
                  <textarea 
                    value={newObsText}
                    onChange={(e) => setNewObsText(e.target.value)}
                    placeholder={language === 'en' ? 'Ex: High tactical advantage detected. Strong defense at home...' : 'Insira novo registo (ex: Benfica completo, excelente forma fora de portas)...'}
                    className="w-full h-16 bg-zinc-950 border border-zinc-800 rounded-lg p-2 text-xs text-[#00f2fe] placeholder-zinc-700 outline-none focus:border-cyan-400 font-mono resize-none leading-relaxed"
                  />
                  <div className="flex justify-end gap-2">
                    <button 
                      onClick={handleAddObservation}
                      disabled={!newObsText.trim()}
                      className="px-3.5 py-1.5 bg-cyan-500 text-black text-[11px] font-black uppercase rounded-lg hover:bg-cyan-400 disabled:opacity-50 disabled:hover:bg-cyan-500 flex items-center gap-1 transition-colors font-mono"
                    >
                      <Plus size={13} strokeWidth={3} />
                      {language === 'en' ? 'Insert Entry' : 'Inserir Nota'}
                    </button>
                  </div>
                </div>

                {/* Observations list */}
                {observations.length === 0 ? (
                  <p className="text-center py-4 text-[10px] text-zinc-600 font-mono uppercase">
                    {language === 'en' ? 'No observations for this squad.' : 'Sem notas ou observações associadas a este clube.'}
                  </p>
                ) : (
                  <div className="space-y-2.5 max-h-[160px] overflow-y-auto pr-1">
                    {observations.map((obs) => {
                      const color = OBSERVATION_PALETTE[obs.colorIndex] || OBSERVATION_PALETTE[0];
                      return (
                        <div 
                          key={obs.id || `obs-${obs.date}-${obs.text}`}
                          className={`p-2.5 border rounded-lg space-y-1.5 relative transition-all ${color.bg}`}
                          style={{
                            boxShadow: `0 0 2px ${color.glow}12`
                          }}
                        >
                          <div className="flex items-center justify-between text-[8px] font-mono border-b border-white/[0.04] pb-1">
                            <span className="text-zinc-400 flex items-center gap-1">
                              <Calendar size={10} />
                              {obs.date}
                            </span>
                            <div className="flex items-center gap-1.5">
                              <button 
                                onClick={() => cycleColorIndex(obs.id)}
                                className="hover:scale-110 active:scale-90 transition-transform text-white/40 hover:text-white"
                                title="Mudar Cor"
                              >
                                <Paintbrush size={10} />
                              </button>
                              <button 
                                onClick={() => handleDeleteObs(obs.id)}
                                className="hover:scale-110 active:scale-90 transition-transform text-zinc-500 hover:text-rose-400"
                                title="Apagar"
                              >
                                <X size={10} className="stroke-[3]" />
                              </button>
                            </div>
                          </div>
                          <p className="text-[11px] text-zinc-200 leading-normal whitespace-pre-line font-mono font-medium">
                            {obs.text}
                          </p>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>

            </div>

            {/* Modal Footer Controls */}
            <div className="p-4 sm:p-5 border-t border-zinc-900 bg-zinc-950 flex items-center justify-between">
              <div>
                {metaMessage && (
                  <span className={`text-[10px] font-mono font-bold leading-normal truncate block ${metaMessage.includes('Erro') ? 'text-rose-400' : 'text-emerald-400'}`}>
                    {metaMessage}
                  </span>
                )}
              </div>
              <div className="flex items-center gap-2.5">
                <button 
                  onClick={() => setSelectedTeam(null)}
                  className="px-4 py-2 bg-zinc-800 border border-zinc-700 hover:bg-zinc-700 text-white rounded-xl text-xs font-bold font-mono transition-colors"
                >
                  {language === 'en' ? 'Close' : 'Fechar'}
                </button>
                <button 
                  onClick={handleSaveMeta}
                  disabled={savingDetail}
                  className="px-5 py-2 bg-gradient-to-r from-red-650 to-red-600 hover:from-red-600 hover:to-red-550 disabled:opacity-60 text-white rounded-xl text-xs font-black uppercase tracking-wider transition-colors shadow-lg shadow-red-500/10 border border-red-500/10 font-mono"
                >
                  {savingDetail 
                    ? (language === 'en' ? 'Saving...' : 'A guardar...') 
                    : (language === 'en' ? 'Guardar' : 'Sincronizar Cloud')}
                </button>
              </div>
            </div>

          </div>
        </div>
      )}

      {/* TIPSTERS CUSTOM MANAGER MODAL */}
      {isTipstersModalOpen && (
        <div className="fixed inset-0 z-50 flex items-start justify-center bg-black/90 backdrop-blur-md p-4 pt-24 sm:pt-32 overflow-y-auto font-mono">
          <div className="w-full max-w-lg bg-[#0c0c11] border border-zinc-850 rounded-2xl shadow-2xl relative max-h-[90vh] overflow-y-auto flex flex-col text-zinc-300">
            
            {/* Modal Header */}
            <div className="p-4 sm:p-5 border-b border-zinc-900 flex items-center justify-between bg-zinc-950">
              <div className="flex items-center gap-2.5">
                <span className="p-1.5 bg-purple-500/10 text-purple-400 border border-purple-500/20 rounded-lg">
                  <MessageSquare size={16} />
                </span>
                <div>
                  <h3 className="text-sm sm:text-base font-bold text-white tracking-wide">
                    {language === 'en' ? 'MANAGE MY TIPSTERS' : 'GERIR OS MEUS TIPSTERS'}
                  </h3>
                  <p className="text-[9px] text-zinc-500 uppercase tracking-widest leading-none mt-1">
                    {language === 'en' ? 'Custom channels quick links' : 'Atalhos dos meus canais favoritos'}
                  </p>
                </div>
              </div>
              <button 
                onClick={() => {
                  setIsTipstersModalOpen(false);
                  setEditingTipsterId(null);
                  setNewTipsterName('');
                  setNewTipsterLink('');
                }}
                className="p-1.5 text-zinc-500 hover:text-white hover:bg-zinc-900 border border-zinc-900 rounded-lg transition-colors cursor-pointer"
                title={language === 'en' ? 'Close' : 'Fechar'}
              >
                <X size={15} />
              </button>
            </div>

            {/* Modal Body */}
            <div className="p-5 sm:p-6 space-y-5 overflow-y-auto flex-1 text-xs">
              
              {/* Form Input Container */}
              <div className="space-y-3.5 p-4 bg-zinc-950/70 border border-zinc-900 rounded-xl">
                <p className="text-[10px] text-purple-400 uppercase tracking-widest font-black">
                  {editingTipsterId 
                    ? (language === 'en' ? '📝 EDITING TIPSTER CHANNEL' : '📝 A EDITAR CANAL DE TIPSTER')
                    : (language === 'en' ? '➕ ADD NEW TIPSTER CHANNEL' : '➕ ADICIONAR NOVO CANAL DE TIPSTER')}
                </p>

                <div className="space-y-2.5">
                  {/* Name field */}
                  <div className="space-y-1">
                    <label className="text-[9px] text-zinc-500 uppercase tracking-wider block">
                      {language === 'en' ? 'Tipster / Channel Name' : 'Nome do Tipster (ex: Vento Vencemos, Lets go Greens)'}
                    </label>
                    <input
                      type="text"
                      placeholder={language === 'en' ? 'e.g. Lets go Greens' : 'ex: Lets go Greens'}
                      value={newTipsterName}
                      onChange={(e) => setNewTipsterName(e.target.value)}
                      className="w-full bg-zinc-900 border border-zinc-850 px-3 py-2 rounded-lg text-xs text-white outline-none focus:border-purple-400 transition-colors"
                    />
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                    {/* Select Network Combo Box */}
                    <div className="space-y-1">
                      <label className="text-[9px] text-zinc-500 uppercase tracking-wider block">
                        {language === 'en' ? 'Social Network' : 'Rede Social'}
                      </label>
                      <select
                        value={newTipsterNetwork}
                        onChange={(e) => setNewTipsterNetwork(e.target.value)}
                        className="w-full bg-zinc-900 border border-zinc-850 px-3 py-2 rounded-lg text-xs text-white outline-none focus:border-purple-400 transition-colors"
                      >
                        <option value="Telegram">Telegram</option>
                        <option value="WhatsApp">WhatsApp</option>
                        <option value="Instagram">Instagram</option>
                        <option value="Facebook">Facebook</option>
                      </select>
                    </div>

                    {/* URL Link Input */}
                    <div className="space-y-1">
                      <label className="text-[9px] text-zinc-500 uppercase tracking-wider block">
                        {language === 'en' ? 'Channel Link/URL' : 'Link / URL do Canal'}
                      </label>
                      <input
                        type="text"
                        placeholder="https://t.me/..."
                        value={newTipsterLink}
                        onChange={(e) => setNewTipsterLink(e.target.value)}
                        className="w-full bg-zinc-900 border border-zinc-850 px-3 py-2 rounded-lg text-xs text-white outline-none focus:border-purple-400 transition-colors"
                      />
                    </div>
                  </div>
                </div>

                {/* Submitting Button */}
                <div className="pt-1 flex justify-end">
                  <button
                    type="button"
                    onClick={handleAddOrEditTipster}
                    className="px-4 py-2 bg-purple-650 hover:bg-purple-600 border border-purple-500/30 text-white rounded-xl text-xs font-black uppercase tracking-wider transition-all shadow-lg hover:shadow-purple-500/10 flex items-center gap-1.5 cursor-pointer"
                  >
                    {editingTipsterId ? (
                      <>
                        <Check size={13} className="stroke-[3]" />
                        {language === 'en' ? 'Save Changes' : 'Gravar Alterações'}
                      </>
                    ) : (
                      <>
                        <Plus size={13} className="stroke-[3]" />
                        {language === 'en' ? 'Add Channel' : 'Adicionar Canal'}
                      </>
                    )}
                  </button>
                </div>
              </div>

              {/* NEON PURPLE SEPARATOR LINE! EXACTLY AS REQUESTED ("separada por uma linha roxa neon") */}
              <div className="relative py-2 flex items-center justify-center">
                <div className="absolute inset-x-0 h-[1.5px] bg-[#bc34fa] shadow-[0_0_8px_#bc34fa,0_0_12px_#bc34fa] w-full" />
                <span className="relative bg-[#0c0c11] px-3 text-[9px] text-purple-400 font-bold uppercase tracking-widest font-mono z-10 select-none">
                  {language === 'en' ? 'My Configured Channels' : 'Os Meus Links Ativos'}
                </span>
              </div>

              {/* Saved Links list container */}
              <div className="space-y-2.5 max-h-[300px] overflow-y-auto pr-1">
                {tipsters.length === 0 ? (
                  <p className="text-center py-6 text-[10px] text-zinc-650 font-mono uppercase">
                    {language === 'en' ? 'No channels configured yet.' : 'Nenhum canal ativo associado.'}
                  </p>
                ) : (
                  tipsters.map((item) => {
                    let networkColor = 'text-sky-450 bg-sky-500/10 border-sky-500/20';
                    if (item.network === 'WhatsApp') networkColor = 'text-emerald-400 bg-emerald-500/10 border-emerald-500/20';
                    if (item.network === 'Facebook') networkColor = 'text-blue-400 bg-blue-500/10 border-blue-500/20';
                    if (item.network === 'Instagram') networkColor = 'text-pink-400 bg-pink-500/10 border-pink-500/20';

                    return (
                      <div 
                        key={item.id || item.name}
                        className="p-3 bg-zinc-950/80 border border-zinc-900 rounded-xl space-y-2.5 transition-all hover:border-zinc-800"
                      >
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-2 truncate">
                            <span className={`text-[9px] font-mono px-1.5 py-0.5 rounded border ${networkColor}`}>
                              {item.network}
                            </span>
                            <span className="font-bold text-white text-[11px] truncate">{item.name}</span>
                          </div>
                          
                          {/* Anchor direct redirection */}
                          <a
                            href={item.link}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="px-2.5 py-1 bg-purple-500/15 text-purple-400 hover:bg-purple-500/25 border border-purple-500/30 text-[10px] uppercase font-bold tracking-wider rounded-lg transition-colors cursor-pointer"
                          >
                            {language === 'en' ? 'Connect ↗' : 'Ir p/ Canal ↗'}
                          </a>
                        </div>

                        {/* Direct display link */}
                        <div className="text-[10.5px] text-zinc-500 font-light truncate select-all bg-zinc-900/40 p-1.5 rounded-md">
                          {item.link}
                        </div>

                        {/* Edit & Delete section at bottom of separator row ("na parte de baixo da linha, tenho de ter opção editar e apagar, claro") */}
                        <div className="flex items-center justify-end gap-3 pt-1.5 border-t border-white/[0.03] text-[10px]">
                          <button
                            type="button"
                            onClick={() => handleStartEditTipster(item)}
                            className="text-zinc-400 hover:text-cyan-400 flex items-center gap-1 transition-colors cursor-pointer font-mono"
                            title={language === 'en' ? 'Edit' : 'Editar'}
                          >
                            <Edit size={11} />
                            <span>{language === 'en' ? 'Edit' : 'Editar'}</span>
                          </button>
                          
                          <button
                            type="button"
                            onClick={() => handleDeleteTipster(item.id)}
                            className="text-zinc-550 hover:text-rose-450 flex items-center gap-1 transition-colors cursor-pointer font-mono"
                            title={language === 'en' ? 'Delete' : 'Apagar'}
                          >
                            <Trash2 size={11} />
                            <span className="text-zinc-500 hover:text-rose-400">{language === 'en' ? 'Delete' : 'Apagar'}</span>
                          </button>
                        </div>
                      </div>
                    );
                  })
                )}
              </div>

            </div>

            {/* Modal Footer Controls */}
            <div className="p-4 sm:p-5 border-t border-zinc-900 bg-zinc-950 flex items-center justify-end">
              <button 
                onClick={() => {
                  setIsTipstersModalOpen(false);
                  setEditingTipsterId(null);
                  setNewTipsterName('');
                  setNewTipsterLink('');
                }}
                className="px-4 py-2 bg-gradient-to-r from-zinc-900 to-zinc-950 border border-zinc-850 hover:bg-zinc-900 text-zinc-400 hover:text-white rounded-xl text-xs font-bold transition-colors cursor-pointer"
              >
                {language === 'en' ? 'Close' : 'Fechar'}
              </button>
            </div>

          </div>
        </div>
      )}

    </div>
  );
};
