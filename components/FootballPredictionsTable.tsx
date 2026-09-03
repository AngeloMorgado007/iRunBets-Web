import React, { useState, useEffect } from 'react';
import { 
  db, 
  onAuthStatusChange, 
  saveMainFeaturedMatchToFirebase, 
  saveFootballPredictionsToFirebase, 
  deleteFootballPredictionFromFirebase,
  fetchFootballPredictionsFromServer
} from '../services/firebase';
import { collection, getDocs, doc, setDoc, deleteDoc, onSnapshot } from 'firebase/firestore';
import * as XLSX from 'xlsx';
import { GLOBAL_LEAGUES_TEAMS_MAP, getAllLeaguesList, getTeamsForLeague, getAllTeamsList } from '../leaguesData';

export interface FootballMatchPrediction {
  id: string;
  date?: string;
  time: string;
  competition: string;
  homeTeam: string;
  homeLogo?: string;
  awayTeam: string;
  awayLogo?: string;
  tip: string;
  odd: string;
  status?: 'pending' | 'green' | 'red';
  
  // Prediction Popup details
  predictionTitle?: string;
  predictionText?: string;
  predictionImage?: string;
  editorSuggestion?: string;
  bookmakerName?: string;
  bookmakerLink?: string;
  confidenceLevel?: number; // 1-10
  isAiGenerated?: boolean;
}

interface TeamInputSelectProps {
  value: string;
  onChange: (val: string) => void;
  competition: string;
  placeholder?: string;
  label?: string;
  className?: string;
  compact?: boolean;
}

const TeamInputSelect: React.FC<TeamInputSelectProps> = ({
  value,
  onChange,
  competition,
  placeholder = "Nome da Equipa",
  label,
  className = "",
  compact = false
}) => {
  const teams = getTeamsForLeague(competition);

  if (compact) {
    return (
      <div className={`space-y-1 min-w-[130px] ${className}`}>
        <select
          value={teams.includes(value) ? value : ""}
          onChange={(e) => {
            if (e.target.value) {
              onChange(e.target.value);
            }
          }}
          className="w-full bg-zinc-950 border border-orange-500 rounded px-1.5 py-1 text-xs text-orange-300 font-bold focus:outline-none cursor-pointer"
        >
          <option value="">⚽ Selecionar equipa ({teams.length})...</option>
          {teams.map((t) => (
            <option key={t} value={t}>
              {t}
            </option>
          ))}
        </select>
        <input
          type="text"
          value={value}
          onChange={(e) => onChange(e.target.value)}
          placeholder={placeholder}
          className="w-full bg-zinc-950 border border-orange-500/60 rounded px-1.5 py-1 text-xs text-white font-mono"
        />
      </div>
    );
  }

  return (
    <div className={`space-y-1.5 ${className}`}>
      {label && (
        <label className="text-[10px] text-zinc-400 font-bold uppercase block">
          {label}
        </label>
      )}
      <select
        value={teams.includes(value) ? value : ""}
        onChange={(e) => {
          if (e.target.value) {
            onChange(e.target.value);
          }
        }}
        className="w-full bg-zinc-950 border border-orange-500/50 hover:border-orange-500 rounded-xl px-3 py-2 text-xs text-orange-300 font-bold focus:outline-none focus:border-orange-400 cursor-pointer"
      >
        <option value="">
          ⚽ Selecionar equipa de {competition || 'Geral'} ({teams.length})
        </option>
        {teams.map((teamName) => (
          <option key={teamName} value={teamName}>
            {teamName}
          </option>
        ))}
      </select>
      <input
        type="text"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        className="w-full bg-zinc-900 border border-zinc-750 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-orange-500 font-mono font-medium"
      />
    </div>
  );
};

const DEFAULT_MATCHES: FootballMatchPrediction[] = [
  {
    id: 'match-canada-bosnia',
    date: new Date().toLocaleDateString('pt-PT'),
    time: '18:00',
    competition: 'Amigáveis Internacionais',
    homeTeam: 'Canadá',
    homeLogo: 'https://images.unsplash.com/photo-1508098682722-e99c43a406b2?auto=format&fit=crop&w=200&q=80',
    awayTeam: 'Bósnia e Herzegovina',
    awayLogo: 'https://images.unsplash.com/photo-1522778119026-d647f0596c20?auto=format&fit=crop&w=200&q=80',
    tip: 'Under 2.5 Golos',
    odd: '1.80',
    status: 'pending',
    isAiGenerated: true,
    predictionTitle: 'PROGNÓSTICO CANADÁ vs BÓSNIA E HERZEGOVINA',
    predictionText: `Demonstração de precisão em tempo real. Prognósticos matemáticos calibrados pelo Purificador e validados com modelos probabilísticos avançados.`,
    predictionImage: 'https://images.unsplash.com/photo-1508098682722-e99c43a406b2?auto=format&fit=crop&w=1200&q=80',
    editorSuggestion: 'Under 2.5 Golos @ 1.80',
    bookmakerName: 'Betano',
    bookmakerLink: 'https://www.betano.pt',
    confidenceLevel: 8
  },
  {
    id: 'match-portugal-croatia',
    date: new Date().toLocaleDateString('pt-PT'),
    time: '19:45',
    competition: 'Liga das Nações',
    homeTeam: 'Portugal',
    homeLogo: 'https://images.unsplash.com/photo-1508098682722-e99c43a406b2?auto=format&fit=crop&w=200&q=80',
    awayTeam: 'Croácia',
    awayLogo: 'https://images.unsplash.com/photo-1522778119026-d647f0596c20?auto=format&fit=crop&w=200&q=80',
    tip: 'Under 3.5 Golos',
    odd: '1.45',
    status: 'green',
    isAiGenerated: true,
    predictionTitle: 'PROGNÓSTICO PORTUGAL vs CROÁCIA',
    predictionText: `Análise matemática de expetativa de golos e distribuição de Poisson para o duelo da Liga das Nações entre Portugal e Croácia.`,
    predictionImage: 'https://images.unsplash.com/photo-1574629810360-7efbbe195018?auto=format&fit=crop&w=1200&q=80',
    editorSuggestion: 'Under 3.5 Golos @ 1.45',
    bookmakerName: 'Betano',
    bookmakerLink: 'https://www.betano.pt',
    confidenceLevel: 9
  },
  {
    id: 'match-chelsea-juventus',
    date: new Date().toLocaleDateString('pt-PT'),
    time: '12:30',
    competition: 'Amigáveis de clubes',
    homeTeam: 'Chelsea',
    awayTeam: 'Juventus',
    tip: 'Mais de 2.5 Golos',
    odd: '1.85',
    status: 'pending',
    isAiGenerated: false,
    predictionTitle: 'PROGNÓSTICO CHELSEA vs JUVENTUS',
    predictionText: `Chelsea e Juventus medem forças num teste de pré-época de elevada intensidade. A equipa londrina apresenta um setor ofensivo bastante dinâmico e renovado, ao passo que a formação italiana tem mostrado facilidade na bola parada.

Prevê-se uma partida com ritmo elevado e oportunidades de parte a parte, favorecendo o mercado de golos no Over 2.5.`,
    predictionImage: 'https://images.unsplash.com/photo-1574629810360-7efbbe195018?auto=format&fit=crop&w=1200&q=80',
    editorSuggestion: 'Mais de 2.5 Golos @ 1.85',
    bookmakerName: 'Solverde',
    bookmakerLink: 'https://www.solverde.pt',
    confidenceLevel: 8
  },
  {
    id: 'match-arsenal-betis',
    date: new Date(Date.now() + 86400000).toLocaleDateString('pt-PT'),
    time: '19:30',
    competition: 'Amigáveis de clubes',
    homeTeam: 'Arsenal',
    awayTeam: 'Betis',
    tip: 'Arsenal a Vencer (1)',
    odd: '1.62',
    status: 'green',
    isAiGenerated: true,
    predictionTitle: 'PROGNÓSTICO ARSENAL vs REAL BETIS',
    predictionText: `O Arsenal chega motivado e com maior rotatividade coletiva para este duelo internacional. O Betis atravessa uma fase de reestruturação defensiva, permitindo muitos remates enquadrados nos últimos encontros.

O algoritmo atribui 68% de probabilidade pura de vitória ao Arsenal, gerando um desvio positivo +EV nas cotações atuais.`,
    editorSuggestion: 'Arsenal Vence (1) @ 1.62',
    bookmakerName: 'Betano',
    bookmakerLink: 'https://www.betano.pt',
    confidenceLevel: 8
  },
  {
    id: 'match-maiorca-psg',
    date: new Date(Date.now() + 86400000).toLocaleDateString('pt-PT'),
    time: '19:00',
    competition: 'Amigáveis de clubes',
    homeTeam: 'Maiorca',
    awayTeam: 'PSG',
    tip: 'PSG -1.5 Handicap',
    odd: '1.90',
    status: 'pending',
    predictionTitle: 'PROGNÓSTICO MAIORCA vs PARIS SAINT-GERMAIN',
    predictionText: `Diferença substancial de valores individuais e coletivos. O Paris Saint-Germain procura afinar a eficácia ofensiva e deverá dominar a posse de bola no meio-campo adversário desde o apito inicial.`,
    editorSuggestion: 'PSG a vencer por 2 ou mais golos @ 1.90',
    bookmakerName: 'Betclic',
    bookmakerLink: 'https://www.betclic.pt',
    confidenceLevel: 9
  },
  {
    id: 'match-estrela-sporting',
    date: new Date(Date.now() + 86400000).toLocaleDateString('pt-PT'),
    time: '20:30',
    competition: 'Liga Portugal Betclic',
    homeTeam: 'Estrela da Amadora',
    awayTeam: 'Sporting CP',
    tip: 'Sporting a Vencer & Ambas Marcam Não',
    odd: '1.80',
    status: 'pending',
    predictionTitle: 'PROGNÓSTICO ESTRELA AMADORA vs SPORTING CP',
    predictionText: `O Sporting arranca o campeonato com foco total na estabilidade defensiva. Diante de um Estrela que atua num bloco baixo e defensivo, a turma de Alvalade deverá impor o seu favoritismo sem conceder grandes oportunidades.`,
    editorSuggestion: 'Sporting Vence sem Sofrer Golos @ 1.80',
    bookmakerName: 'Betano',
    bookmakerLink: 'https://www.betano.pt',
    confidenceLevel: 9
  }
];

interface FootballPredictionsTableProps {
  language?: string;
  isAdmin?: boolean;
}

export default function FootballPredictionsTable({ language = 'pt', isAdmin: externalIsAdmin }: FootballPredictionsTableProps) {
  // Strict Security: Only morgado.aam@gmail.com can activate manager/edit mode
  const [currentUser, setCurrentUser] = useState<any>(null);
  const [isStrictAdmin, setIsStrictAdmin] = useState<boolean>(false);
  const [isManagerMode, setIsManagerMode] = useState<boolean>(false);

  useEffect(() => {
    const checkAdmin = (user: any) => {
      const isMorgado = user?.email?.toLowerCase() === 'morgado.aam@gmail.com';
      setIsStrictAdmin(isMorgado);
      setIsManagerMode(isMorgado);
    };

    const unsub = onAuthStatusChange((user) => {
      setCurrentUser(user);
      checkAdmin(user);
    });
    return () => unsub();
  }, [externalIsAdmin]);

  const [matches, setMatches] = useState<FootballMatchPrediction[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [filterTab, setFilterTab] = useState<'all' | 'today' | 'with_prediction'>('all');
  const [selectedLeague, setSelectedLeague] = useState<string>('all');

  // Popup Modal States
  const [selectedPredictionMatch, setSelectedPredictionMatch] = useState<FootballMatchPrediction | null>(null);
  const [isEditingModal, setIsEditingModal] = useState(false);
  const [modalEditMatch, setModalEditMatch] = useState<FootballMatchPrediction | null>(null);

  // Quick Table Row Editor / Add New Row state
  const [editingRowId, setEditingRowId] = useState<string | null>(null);
  const [deleteConfirmId, setDeleteConfirmId] = useState<string | null>(null);
  const [showClearTableConfirm, setShowClearTableConfirm] = useState(false);
  const [showSyncCloudConfirm, setShowSyncCloudConfirm] = useState(false);
  const [toastMessage, setToastMessage] = useState<string | null>(null);
  const [generatingAiId, setGeneratingAiId] = useState<string | null>(null);

  // AI Studio Mirror Pop-up Modal state
  const [aiStudioMatch, setAiStudioMatch] = useState<FootballMatchPrediction | null>(null);
  const [studioHomeTeam, setStudioHomeTeam] = useState<string>('');
  const [studioAwayTeam, setStudioAwayTeam] = useState<string>('');
  const [studioCompetition, setStudioCompetition] = useState<string>('');
  const [studioTip, setStudioTip] = useState<string>('');
  const [studioOdd, setStudioOdd] = useState<string>('');

  const [aiStudioData, setAiStudioData] = useState<{
    predictionTitle: string;
    predictionText: string;
    editorSuggestion: string;
    homeProb: number;
    drawProb: number;
    awayProb: number;
    over25Prob: number;
    bttsProb: number;
    bestBet: string;
    expectedValue: string;
    confidenceLevel: number;
  }>({
    predictionTitle: '',
    predictionText: '',
    editorSuggestion: '',
    homeProb: 52,
    drawProb: 26,
    awayProb: 22,
    over25Prob: 65,
    bttsProb: 68,
    bestBet: '',
    expectedValue: '+EV (Excelente Valor)',
    confidenceLevel: 9
  });

  const showToast = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => {
      setToastMessage(null);
    }, 3500);
  };

  // Open the AI Studio Mirror Pop-up Modal
  const handleOpenAiStudio = (matchToAnalyze: FootballMatchPrediction) => {
    if (!isManagerMode) {
      alert("⚠️ Ação protegida: Apenas o Administrador tem acesso ao Estúdio de IA Gemini.");
      return;
    }

    const home = matchToAnalyze.homeTeam || '';
    const away = matchToAnalyze.awayTeam || '';
    const comp = matchToAnalyze.competition || 'Liga Portugal Betclic';
    const tip = matchToAnalyze.tip || 'Ambas Marcam';
    const odd = matchToAnalyze.odd || '1.75';

    setAiStudioMatch(matchToAnalyze);
    setStudioHomeTeam(home);
    setStudioAwayTeam(away);
    setStudioCompetition(comp);
    setStudioTip(tip);
    setStudioOdd(odd);

    setAiStudioData({
      predictionTitle: matchToAnalyze.predictionTitle || `PROGNÓSTICO ${home} vs ${away}`,
      predictionText: matchToAnalyze.predictionText || '',
      editorSuggestion: matchToAnalyze.editorSuggestion || `${tip} @ ${odd}`,
      homeProb: 54,
      drawProb: 25,
      awayProb: 21,
      over25Prob: 66,
      bttsProb: 70,
      bestBet: `${tip} @ ${odd}`,
      expectedValue: '+EV (Excelente Valor)',
      confidenceLevel: matchToAnalyze.confidenceLevel || 9
    });

    // Auto-generate if empty analysis
    if (!matchToAnalyze.predictionText) {
      handleGenerateAiInStudio(matchToAnalyze, home, away, comp, tip, odd);
    }
  };

  // Generate AI Analysis inside the AI Studio Pop-up Modal via Gemini Backend
  const handleGenerateAiInStudio = async (
    matchToAnalyze?: FootballMatchPrediction,
    overrideHome?: string,
    overrideAway?: string,
    overrideComp?: string,
    overrideTip?: string,
    overrideOdd?: string
  ) => {
    const targetMatch = matchToAnalyze || aiStudioMatch;
    if (!targetMatch) return;

    const hTeam = overrideHome !== undefined ? overrideHome : studioHomeTeam;
    const aTeam = overrideAway !== undefined ? overrideAway : studioAwayTeam;
    const comp = overrideComp !== undefined ? overrideComp : studioCompetition;
    const tipVal = overrideTip !== undefined ? overrideTip : studioTip;
    const oddVal = overrideOdd !== undefined ? overrideOdd : studioOdd;

    try {
      setGeneratingAiId(targetMatch.id);
      const response = await fetch('/api/gemini/generate-football-analysis', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          homeTeam: hTeam,
          awayTeam: aTeam,
          competition: comp,
          date: targetMatch.date,
          time: targetMatch.time,
          tip: tipVal,
          odd: oddVal
        })
      });

      const resData = await response.json();
      if (resData.status === 'success' && resData.data) {
        const aiData = resData.data;
        const sug = aiData.editorSuggestion || aiData.bestBet || `${tipVal} @ ${oddVal}`;

        let newTip = studioTip || tipVal;
        let newOdd = studioOdd || oddVal;
        if (sug && sug.includes('@')) {
          const parts = sug.split('@');
          if (parts[0]?.trim()) newTip = parts[0].trim();
          if (parts[1]?.trim()) newOdd = parts[1].trim();
        } else if (sug && sug.trim()) {
          newTip = sug.trim();
        }

        setStudioTip(newTip);
        setStudioOdd(newOdd);

        setAiStudioData({
          predictionTitle: aiData.predictionTitle || `PROGNÓSTICO ${hTeam} vs ${aTeam}`,
          predictionText: aiData.predictionText || '',
          editorSuggestion: sug,
          homeProb: aiData.homeProb || 52,
          drawProb: aiData.drawProb || 26,
          awayProb: aiData.awayProb || 22,
          over25Prob: aiData.over25Prob || 64,
          bttsProb: aiData.bttsProb || 68,
          bestBet: aiData.bestBet || `${newTip} @ ${newOdd}`,
          expectedValue: aiData.expectedValue || '+EV (Excelente Valor)',
          confidenceLevel: aiData.confidenceLevel || 9
        });

        showToast(`🤖 Análise da IA Gemini calculada com sucesso para ${hTeam} vs ${aTeam} (${comp})!`);
      } else {
        alert(resData.message || 'Ocorreu um erro ao gerar a análise da IA.');
      }
    } catch (err: any) {
      console.error('Erro ao chamar API Gemini no estúdio:', err);
      alert('Erro de comunicação com o servidor da IA Gemini.');
    } finally {
      setGeneratingAiId(null);
    }
  };

  // Save AI Studio analysis result to the Football Predictions Table
  const handleSendStudioToPredictions = () => {
    if (!aiStudioMatch) return;

    let finalTip = studioTip || aiStudioMatch.tip;
    let finalOdd = studioOdd || aiStudioMatch.odd;
    if (aiStudioData.editorSuggestion && aiStudioData.editorSuggestion.includes('@')) {
      const parts = aiStudioData.editorSuggestion.split('@');
      if (parts[0]?.trim()) finalTip = parts[0].trim();
      if (parts[1]?.trim()) finalOdd = parts[1].trim();
    } else if (aiStudioData.editorSuggestion && aiStudioData.editorSuggestion.trim()) {
      finalTip = aiStudioData.editorSuggestion.trim();
    }

    const updatedMatch: FootballMatchPrediction = {
      ...aiStudioMatch,
      homeTeam: studioHomeTeam || aiStudioMatch.homeTeam,
      awayTeam: studioAwayTeam || aiStudioMatch.awayTeam,
      competition: studioCompetition || aiStudioMatch.competition,
      tip: finalTip,
      odd: finalOdd,
      predictionTitle: aiStudioData.predictionTitle,
      predictionText: aiStudioData.predictionText,
      editorSuggestion: aiStudioData.editorSuggestion,
      confidenceLevel: aiStudioData.confidenceLevel,
      isAiGenerated: true
    };

    const updatedList = matches.map(m => m.id === aiStudioMatch.id ? updatedMatch : m);
    saveMatchesList(updatedList);

    if (selectedPredictionMatch && selectedPredictionMatch.id === aiStudioMatch.id) {
      setSelectedPredictionMatch(updatedMatch);
      setModalEditMatch(updatedMatch);
    }

    setAiStudioMatch(null);
    showToast(`✅ Análise enviada e guardada com sucesso no Quadro de Prognósticos!`);
  };

  // Save AI Studio analysis result AND set as Featured Match on the Main Screen
  const handleSendStudioToMainHero = () => {
    if (!aiStudioMatch) return;

    let finalTip = studioTip || aiStudioMatch.tip;
    let finalOdd = studioOdd || aiStudioMatch.odd;
    if (aiStudioData.editorSuggestion && aiStudioData.editorSuggestion.includes('@')) {
      const parts = aiStudioData.editorSuggestion.split('@');
      if (parts[0]?.trim()) finalTip = parts[0].trim();
      if (parts[1]?.trim()) finalOdd = parts[1].trim();
    } else if (aiStudioData.editorSuggestion && aiStudioData.editorSuggestion.trim()) {
      finalTip = aiStudioData.editorSuggestion.trim();
    }

    const updatedMatch: FootballMatchPrediction = {
      ...aiStudioMatch,
      homeTeam: studioHomeTeam || aiStudioMatch.homeTeam,
      awayTeam: studioAwayTeam || aiStudioMatch.awayTeam,
      competition: studioCompetition || aiStudioMatch.competition,
      tip: finalTip,
      odd: finalOdd,
      predictionTitle: aiStudioData.predictionTitle,
      predictionText: aiStudioData.predictionText,
      editorSuggestion: aiStudioData.editorSuggestion,
      confidenceLevel: aiStudioData.confidenceLevel,
      isAiGenerated: true
    };

    const updatedList = matches.map(m => m.id === aiStudioMatch.id ? updatedMatch : m);
    saveMatchesList(updatedList);

    // Save to Firebase & LocalStorage for main hero display
    saveMainFeaturedMatchToFirebase(updatedMatch);

    if (selectedPredictionMatch && selectedPredictionMatch.id === aiStudioMatch.id) {
      setSelectedPredictionMatch(updatedMatch);
      setModalEditMatch(updatedMatch);
    }

    setAiStudioMatch(null);
    showToast(`🌟 Análise publicada em Destaque na Tela Principal e no Quadro de Prognósticos!`);
  };

  // Load matches from Firestore / Server API / LocalStorage & listen for real-time updates
  useEffect(() => {
    let unsubscribeFirestore: (() => void) | null = null;
    let isMounted = true;

    // 1. Initial cached render for zero-delay UI
    const saved = localStorage.getItem('irunbets_football_predictions_data');
    if (saved !== null) {
      try {
        const parsed = JSON.parse(saved);
        if (Array.isArray(parsed) && parsed.length > 0) {
          setMatches(parsed);
          setLoading(false);
        }
      } catch (e) {
        console.error(e);
      }
    }

    // 2. Fetch from high-speed Server API (ensures instant cross-device sync)
    fetchFootballPredictionsFromServer().then((serverMatches) => {
      if (isMounted && serverMatches && Array.isArray(serverMatches) && serverMatches.length > 0) {
        setMatches(serverMatches);
        localStorage.setItem('irunbets_football_predictions_data', JSON.stringify(serverMatches));
        localStorage.setItem('irunbets_football_predictions_initialized', 'true');
        setLoading(false);
      }
    }).catch(err => console.warn('Could not fetch initial server predictions:', err));

    // 3. Attach real-time Firestore listener
    if (db) {
      try {
        unsubscribeFirestore = onSnapshot(collection(db, 'football_predictions'), (snapshot) => {
          if (!isMounted) return;
          if (!snapshot.empty) {
            const list: FootballMatchPrediction[] = [];
            snapshot.forEach(docSnap => {
              list.push({ id: docSnap.id, ...docSnap.data() } as FootballMatchPrediction);
            });
            setMatches(list);
            localStorage.setItem('irunbets_football_predictions_data', JSON.stringify(list));
            localStorage.setItem('irunbets_football_predictions_initialized', 'true');
            setLoading(false);
          } else {
            // If firestore is empty, check if we have server API data or keep clean state
            fetchFootballPredictionsFromServer().then((serverMatches) => {
              if (isMounted && serverMatches && serverMatches.length > 0) {
                setMatches(serverMatches);
                saveFootballPredictionsToFirebase(serverMatches);
              }
            });
          }
        }, (err) => {
          console.warn('Firestore snapshot error for football_predictions:', err);
        });
      } catch (err) {
        console.warn('Could not attach Firestore snapshot:', err);
      }
    }

    const handleRealtimeUpdate = () => {
      const savedLatest = localStorage.getItem('irunbets_football_predictions_data');
      if (savedLatest !== null) {
        try {
          const parsed = JSON.parse(savedLatest);
          if (Array.isArray(parsed)) {
            setMatches(parsed);
          }
        } catch (e) {
          console.error(e);
        }
      }
    };

    window.addEventListener('irunbets_football_predictions_updated', handleRealtimeUpdate);
    window.addEventListener('storage', handleRealtimeUpdate);

    return () => {
      isMounted = false;
      if (unsubscribeFirestore) unsubscribeFirestore();
      window.removeEventListener('irunbets_football_predictions_updated', handleRealtimeUpdate);
      window.removeEventListener('storage', handleRealtimeUpdate);
    };
  }, []);

  // Save matches helper
  const saveMatchesList = async (updatedList: FootballMatchPrediction[]) => {
    setMatches(updatedList);
    localStorage.setItem('irunbets_football_predictions_data', JSON.stringify(updatedList));
    localStorage.setItem('irunbets_football_predictions_initialized', 'true');
    window.dispatchEvent(new Event('irunbets_football_predictions_updated'));
    await saveFootballPredictionsToFirebase(updatedList);
  };

  // Excel-like Add Match Row Function
  const handleAddNewMatchRow = () => {
    if (!isStrictAdmin && currentUser?.email?.toLowerCase() !== 'morgado.aam@gmail.com') {
      alert("⚠️ Ação protegida: Apenas o Administrador (morgado.aam@gmail.com) tem permissão para adicionar novos eventos.");
      return;
    }
    const newId = 'match-' + Date.now();
    const defaultCompetition = selectedLeague !== 'all' ? selectedLeague : 'Amigáveis de clubes';
    const todayDate = new Date().toLocaleDateString('pt-PT', { day: '2-digit', month: '2-digit', year: 'numeric' });

    const newMatch: FootballMatchPrediction = {
      id: newId,
      date: todayDate,
      time: '20:00',
      competition: defaultCompetition,
      homeTeam: 'Equipa Casa',
      awayTeam: 'Equipa Fora',
      tip: 'Ambas Marcam',
      odd: '1.75',
      status: 'pending',
      predictionTitle: `PROGNÓSTICO EQUIPA CASA vs EQUIPA FORA`,
      predictionText: 'Escreva aqui a análise detalhada e fundamentada do jogo para os utilizadores...',
      editorSuggestion: 'Ambas as equipas marcam @ 1.75',
      bookmakerName: 'Betano',
      bookmakerLink: 'https://www.betano.pt',
      confidenceLevel: 8
    };

    const updated = [newMatch, ...matches];
    saveMatchesList(updated);
    setEditingRowId(newId);
    
    // Auto open prediction popup in edit mode
    setSelectedPredictionMatch(newMatch);
    setModalEditMatch(newMatch);
    setIsEditingModal(true);
  };

  // Export Table to Excel (.xlsx)
  const exportToExcel = () => {
    try {
      const exportData = matches.map(m => ({
        'DATA': m.date || new Date().toLocaleDateString('pt-PT'),
        'HORA': m.time || '20:00',
        'COMPETIÇÃO': m.competition || 'Amigáveis de clubes',
        'EQUIPA CASA': m.homeTeam || '',
        'EQUIPA FORA': m.awayTeam || '',
        'DICA / MERCADO': m.tip || '',
        'ODD': m.odd || '1.75',
        'GERADO POR IA': m.isAiGenerated ? 'SIM' : 'NÃO',
        'TÍTULO PREVISÃO': m.predictionTitle || `PROGNÓSTICO ${m.homeTeam} vs ${m.awayTeam}`,
        'ANÁLISE PREVISÃO': m.predictionText || '',
        'SUGESTÃO EDITOR': m.editorSuggestion || `${m.tip} @ ${m.odd}`,
        'CASA APOSTAS': m.bookmakerName || 'Betano',
        'LINK APOSTAS': m.bookmakerLink || 'https://www.betano.pt'
      }));

      const worksheet = XLSX.utils.json_to_sheet(exportData);
      const workbook = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(workbook, worksheet, 'Prognosticos');
      XLSX.writeFile(workbook, 'Prognosticos_Futebol_iRunBets.xlsx');
      showToast('✓ Tabela exportada para Excel com sucesso!');
    } catch (err) {
      console.error('Erro ao exportar Excel:', err);
      alert('Ocorreu um erro ao gerar o ficheiro Excel.');
    }
  };

  // Import Table from Excel (.xlsx, .csv)
  const importFromExcel = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (evt) => {
      try {
        const bstr = evt.target?.result;
        const workbook = XLSX.read(bstr, { type: 'binary' });
        const firstSheetName = workbook.SheetNames[0];
        const worksheet = workbook.Sheets[firstSheetName];
        const rawData: any[] = XLSX.utils.sheet_to_json(worksheet, { defval: '' });

        if (!rawData || rawData.length === 0) {
          alert('O ficheiro Excel selecionado está vazio ou sem formato reconhecido.');
          return;
        }

        const importedMatches: FootballMatchPrediction[] = rawData.map((row, index) => {
          const getVal = (keys: string[]) => {
            for (const k of keys) {
              const foundKey = Object.keys(row).find(rk => rk.toLowerCase().trim() === k.toLowerCase().trim());
              if (foundKey && row[foundKey] !== undefined && String(row[foundKey]).trim() !== '') {
                return String(row[foundKey]).trim();
              }
            }
            return '';
          };

          const home = getVal(['EQUIPA CASA', 'EQUIPACASA', 'HOME', 'HOMETEAM', 'CASA']) || 'Equipa Casa';
          const away = getVal(['EQUIPA FORA', 'EQUIPAFORA', 'AWAY', 'AWAYTEAM', 'FORA']) || 'Equipa Fora';
          const comp = getVal(['COMPETIÇÃO', 'COMPETICAO', 'LIGA', 'LEAGUE', 'COMPETITION']) || 'Amigáveis de clubes';
          const date = getVal(['DATA', 'DATE']) || new Date().toLocaleDateString('pt-PT');
          const time = getVal(['HORA', 'TIME']) || '20:00';
          const tip = getVal(['DICA / MERCADO', 'DICA', 'MERCADO', 'TIP']) || 'Ambas Marcam';
          const odd = getVal(['ODD', 'ODDS', 'COTA']) || '1.75';
          const title = getVal(['TÍTULO PREVISÃO', 'TITULO PREVISAO', 'PREVISAO', 'TITLE']) || `PROGNÓSTICO ${home} vs ${away}`;
          const text = getVal(['ANÁLISE PREVISÃO', 'ANALISE PREVISAO', 'ANALISE', 'TEXT', 'DESCRICAO']) || 'Análise completa do jogo...';
          const suggestion = getVal(['SUGESTÃO EDITOR', 'SUGESTAO EDITOR', 'SUGESTAO', 'EDITOR']) || `${tip} @ ${odd}`;
          const bookmaker = getVal(['CASA APOSTAS', 'BOOKMAKER']) || 'Betano';
          const link = getVal(['LINK APOSTAS', 'LINK']) || 'https://www.betano.pt';
          const isAiRaw = getVal(['GERADO POR IA', 'GERADOPORIA', 'GERADO_POR_IA', 'AI', 'IA', 'IS_AI']);
          const isAiGenerated = /sim|yes|true|1|ia/i.test(isAiRaw);

          return {
            id: `imported-${Date.now()}-${index}`,
            date,
            time,
            competition: comp,
            homeTeam: home,
            awayTeam: away,
            tip,
            odd,
            status: 'pending',
            predictionTitle: title,
            predictionText: text,
            editorSuggestion: suggestion,
            bookmakerName: bookmaker,
            bookmakerLink: link,
            isAiGenerated
          };
        });

        const updatedList = [...importedMatches, ...matches];
        saveMatchesList(updatedList);
        showToast(`✓ ${importedMatches.length} jogo(s) importado(s) do Excel com sucesso!`);
      } catch (err) {
        console.error('Erro ao ler ficheiro Excel:', err);
        alert('Erro ao processar ficheiro Excel. Verifique se o formato é válido (.xlsx ou .csv).');
      }
    };
    reader.readAsBinaryString(file);
    e.target.value = '';
  };

  // Delete Row
  const handleDeleteMatchRow = async (id: string, e?: React.MouseEvent) => {
    if (e) {
      e.stopPropagation();
      e.preventDefault();
    }

    const matchToDelete = matches.find(m => m.id === id);
    const updated = matches.filter(m => m.id !== id);

    // Immediately update local state and localStorage
    setMatches(updated);
    localStorage.setItem('irunbets_football_predictions_data', JSON.stringify(updated));
    localStorage.setItem('irunbets_football_predictions_initialized', 'true');
    window.dispatchEvent(new Event('irunbets_football_predictions_updated'));

    if (selectedPredictionMatch?.id === id) {
      setSelectedPredictionMatch(null);
    }
    if (editingRowId === id) {
      setEditingRowId(null);
    }
    setDeleteConfirmId(null);

    showToast(`Jogo ${matchToDelete ? `${matchToDelete.homeTeam} vs ${matchToDelete.awayTeam}` : ''} eliminado com sucesso!`);

    // Delete directly from Firebase and sync updated list
    await deleteFootballPredictionFromFirebase(id);
    await saveFootballPredictionsToFirebase(updated);
  };

  // Image File Upload for Prediction Modal
  const handleImageFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !modalEditMatch) return;

    if (file.size > 8 * 1024 * 1024) {
      alert('A imagem excede 8MB. Por favor escolha um ficheiro mais leve.');
      return;
    }

    const reader = new FileReader();
    reader.onload = (event) => {
      const dataUrl = event.target?.result as string;
      if (dataUrl) {
        setModalEditMatch({
          ...modalEditMatch,
          predictionImage: dataUrl
        });
      }
    };
    reader.readAsDataURL(file);
  };

  // Save Modal Edits
  const handleSaveModalEdits = () => {
    if (!modalEditMatch) return;

    let finalTip = modalEditMatch.tip;
    let finalOdd = modalEditMatch.odd;
    if (modalEditMatch.editorSuggestion) {
      if (modalEditMatch.editorSuggestion.includes('@')) {
        const parts = modalEditMatch.editorSuggestion.split('@');
        if (parts[0]?.trim()) finalTip = parts[0].trim();
        if (parts[1]?.trim()) finalOdd = parts[1].trim();
      } else if (modalEditMatch.editorSuggestion.trim()) {
        finalTip = modalEditMatch.editorSuggestion.trim();
      }
    }

    const finalMatch: FootballMatchPrediction = {
      ...modalEditMatch,
      tip: finalTip,
      odd: finalOdd
    };

    const updated = matches.map(m => m.id === finalMatch.id ? finalMatch : m);
    saveMatchesList(updated);
    setSelectedPredictionMatch(finalMatch);
    setIsEditingModal(false);
  };

  // Comprehensive API Leagues & Competitions list
  const ALL_API_LEAGUES = getAllLeaguesList();

  // Merge unique leagues from matches + full API leagues list
  const uniqueLeagues = Array.from(
    new Set([
      ...matches.map(m => m.competition).filter(Boolean),
      ...ALL_API_LEAGUES
    ])
  );

  // Filtered List
  const filteredMatches = matches.filter(m => {
    const matchText = `${m.homeTeam} ${m.awayTeam} ${m.competition} ${m.tip}`.toLowerCase();
    const searchMatches = !searchTerm || matchText.includes(searchTerm.toLowerCase());

    if (!searchMatches) return false;

    if (filterTab === 'today') {
      const isToday = m.time.includes(':') || m.time.toLowerCase().includes('hoje');
      if (!isToday) return false;
    }
    if (filterTab === 'with_prediction') {
      const hasPred = !!(m.predictionText || m.predictionTitle);
      if (!hasPred) return false;
    }

    if (selectedLeague !== 'all') {
      const normMatchComp = m.competition.toLowerCase().trim();
      const normSelLeague = selectedLeague.toLowerCase().trim();
      const isMatch = normMatchComp === normSelLeague || normMatchComp.includes(normSelLeague) || normSelLeague.includes(normMatchComp);
      if (!isMatch) return false;
    }

    return true;
  });

  return (
    <div className="w-full space-y-6 relative">
      
      {/* Toast Notification Banner */}
      {toastMessage && (
        <div className="fixed top-20 right-6 z-[10000] bg-emerald-500 text-black px-5 py-3 rounded-2xl shadow-2xl font-extrabold text-xs uppercase tracking-wider flex items-center gap-2 animate-bounce border border-emerald-300">
          <span>✓</span>
          <span>{toastMessage}</span>
        </div>
      )}
      
      {/* Top Banner / Hero Header */}
      <div className="bg-gradient-to-r from-zinc-950 via-zinc-900 to-zinc-950 border border-zinc-850 rounded-3xl p-6 sm:p-8 relative overflow-hidden shadow-2xl">
        <div className="absolute top-0 right-0 w-80 h-80 bg-orange-500/10 rounded-full blur-[100px] pointer-events-none"></div>
        <div className="absolute bottom-0 left-0 w-80 h-80 bg-cyan-500/10 rounded-full blur-[100px] pointer-events-none"></div>

        <div className="relative z-10 space-y-4">
          <div className="flex flex-wrap items-center justify-between gap-4">
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 rounded-2xl bg-orange-500/20 border border-orange-500/40 flex items-center justify-center text-orange-400 font-bold text-2xl shadow-lg shadow-orange-500/10">
                ⚽
              </div>
              <div>
                <span className="text-[10px] uppercase font-bold font-mono tracking-widest text-orange-400 bg-orange-500/10 px-2.5 py-0.5 rounded border border-orange-500/20">
                  PROGNÓSTICOS DE FUTEBOL
                </span>
                <h2 className="text-2xl sm:text-3xl font-black text-white font-display tracking-tight uppercase mt-1">
                  Mural de Análises & Palpites IA
                </h2>
              </div>
            </div>

            {isStrictAdmin && (
              <div className="flex items-center gap-2 flex-wrap">
                {/* + Adicionar Evento Button */}
                <button
                  type="button"
                  onClick={handleAddNewMatchRow}
                  className="px-5 py-3 bg-gradient-to-r from-orange-500 to-amber-500 hover:from-orange-400 hover:to-amber-400 text-black font-extrabold text-xs uppercase tracking-wider rounded-2xl shadow-xl shadow-orange-500/20 transition-all cursor-pointer flex items-center gap-2 hover:scale-105 active:scale-95"
                >
                  <span className="text-lg font-black leading-none">+</span>
                  <span>Adicionar Novo Evento</span>
                </button>

                {/* 📊 Exportar Excel */}
                <button
                  type="button"
                  onClick={exportToExcel}
                  className="px-4 py-3 bg-emerald-500/20 hover:bg-emerald-500/30 text-emerald-400 border border-emerald-500/40 hover:border-emerald-500/70 rounded-2xl text-xs font-bold uppercase tracking-wider transition-all cursor-pointer flex items-center gap-2 hover:scale-105"
                  title="Exportar Tabela para Excel (.xlsx)"
                >
                  <span>📊</span>
                  <span>Exportar Excel</span>
                </button>

                {/* 📥 Importar Excel */}
                <label
                  className="px-4 py-3 bg-cyan-500/20 hover:bg-cyan-500/30 text-cyan-400 border border-cyan-500/40 hover:border-cyan-500/70 rounded-2xl text-xs font-bold uppercase tracking-wider transition-all cursor-pointer flex items-center gap-2 hover:scale-105"
                  title="Importar Ficheiro Excel (.xlsx / .csv)"
                >
                  <span>📥</span>
                  <span>Importar Excel</span>
                  <input
                    type="file"
                    accept=".xlsx, .xls, .csv"
                    onChange={importFromExcel}
                    className="hidden"
                  />
                </label>

                {/* ☁️ Sincronizar Nuvem (Firebase) */}
                {showSyncCloudConfirm ? (
                  <div className="flex items-center gap-1 bg-amber-950/80 p-1 rounded-2xl border border-amber-500/50 animate-pulse">
                    <button
                      type="button"
                      onClick={async () => {
                        try {
                          await saveFootballPredictionsToFirebase(matches);
                          setShowSyncCloudConfirm(false);
                          showToast('✓ Tabela sincronizada e gravada na Firebase!');
                        } catch (err) {
                          console.error(err);
                          alert('Erro ao sincronizar com a Firebase: ' + err);
                        }
                      }}
                      className="px-3 py-2 bg-amber-600 hover:bg-amber-500 text-black font-extrabold text-xs uppercase tracking-wider rounded-xl transition-all cursor-pointer shadow-lg"
                    >
                      ☁️ Confirmar Sincronizar?
                    </button>
                    <button
                      type="button"
                      onClick={() => setShowSyncCloudConfirm(false)}
                      className="px-2.5 py-2 bg-zinc-800 hover:bg-zinc-700 text-zinc-300 font-bold text-xs rounded-xl transition-all cursor-pointer"
                    >
                      ✕
                    </button>
                  </div>
                ) : (
                  <button
                    type="button"
                    onClick={() => setShowSyncCloudConfirm(true)}
                    className="px-4 py-3 bg-amber-500/20 hover:bg-amber-500/30 text-amber-400 border border-amber-500/40 hover:border-amber-500/70 rounded-2xl text-xs font-bold uppercase tracking-wider transition-all cursor-pointer flex items-center gap-2 hover:scale-105"
                    title="Gravar e sincronizar a lista atual na nuvem Firebase"
                  >
                    <span>☁️</span>
                    <span>Sincronizar Nuvem</span>
                  </button>
                )}

                {/* 🗑️ Limpar Tabela */}
                {showClearTableConfirm ? (
                  <div className="flex items-center gap-1 bg-red-950/90 p-1 rounded-2xl border border-red-500/60 animate-pulse">
                    <button
                      type="button"
                      onClick={async () => {
                        try {
                          await saveMatchesList([]);
                          setShowClearTableConfirm(false);
                          showToast('🗑️ Tabela limpa e sincronizada na Firebase!');
                        } catch (err) {
                          console.error(err);
                          alert('Erro ao limpar a tabela: ' + err);
                        }
                      }}
                      className="px-3 py-2 bg-red-600 hover:bg-red-500 text-white font-extrabold text-xs uppercase tracking-wider rounded-xl transition-all cursor-pointer shadow-lg"
                    >
                      ⚠️ Confirmar Limpar Tudo?
                    </button>
                    <button
                      type="button"
                      onClick={() => setShowClearTableConfirm(false)}
                      className="px-2.5 py-2 bg-zinc-800 hover:bg-zinc-700 text-zinc-300 font-bold text-xs rounded-xl transition-all cursor-pointer"
                    >
                      ✕
                    </button>
                  </div>
                ) : (
                  <button
                    type="button"
                    onClick={() => setShowClearTableConfirm(true)}
                    className="px-4 py-3 bg-red-500/20 hover:bg-red-500/30 text-red-400 border border-red-500/40 hover:border-red-500/70 rounded-2xl text-xs font-bold uppercase tracking-wider transition-all cursor-pointer flex items-center gap-2 hover:scale-105"
                    title="Apagar todos os eventos e sincronizar na nuvem"
                  >
                    <span>🗑️</span>
                    <span>Limpar Tabela</span>
                  </button>
                )}

                {/* Toggle Table Manager Mode */}
                <button
                  type="button"
                  onClick={() => setIsManagerMode(!isManagerMode)}
                  className={`px-4 py-3 rounded-2xl border text-xs font-bold uppercase tracking-wider transition-all cursor-pointer flex items-center gap-2 ${
                    isManagerMode 
                      ? 'bg-zinc-800 border-orange-500/50 text-orange-400' 
                      : 'bg-zinc-900 border-zinc-800 text-zinc-400 hover:text-white'
                  }`}
                >
                  <span>⚙️</span>
                  <span>{isManagerMode ? 'Modo Gestão Ativo' : 'Gerir Tabela'}</span>
                </button>
              </div>
            )}
          </div>

          <p className="text-zinc-400 text-xs sm:text-sm font-light max-w-3xl leading-relaxed">
            Consulte os jogos analisados pela nossa IA. Clique no botão <strong className="text-orange-400 font-semibold">"+"</strong> para inserir novos eventos na tabela e em <strong className="text-orange-400 font-semibold">"Previsão"</strong> para abrir a janela pop-up independente com o palpite completo.
          </p>
        </div>
      </div>

      {/* Control Bar: Search, Filter Tabs & CAMPEONATOS / LEAGUES DROPDOWN */}
      <div className="bg-[#121216]/90 border border-zinc-850 rounded-2xl p-3 sm:p-4 shadow-xl flex flex-wrap items-center justify-between gap-4">
        
        {/* Search Input Box */}
        <div className="relative flex-1 min-w-[220px]">
          <span className="absolute left-3.5 top-1/2 -translate-y-1/2 text-zinc-500 text-sm">🔍</span>
          <input
            type="text"
            placeholder="PROCURAR EQUIPA, COMPETIÇÃO OU DICA..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full bg-zinc-950/80 border border-zinc-800 focus:border-orange-500 rounded-xl pl-9 pr-4 py-2.5 text-xs text-white uppercase placeholder-zinc-500 focus:outline-none transition-all font-mono"
          />
          {searchTerm && (
            <button
              onClick={() => setSearchTerm('')}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-zinc-500 hover:text-white text-xs font-bold"
            >
              ✕
            </button>
          )}
        </div>

        {/* Filters Group: Filter Tabs + CAMPEONATOS / LEAGUES DROPDOWN FILTER */}
        <div className="flex flex-wrap items-center gap-2">
          
          {/* Filter Navigation Tabs */}
          <div className="flex items-center gap-1 bg-zinc-950 p-1 rounded-xl border border-zinc-850">
            <button
              type="button"
              onClick={() => setFilterTab('all')}
              className={`px-3 py-1.5 rounded-lg text-xs font-bold uppercase tracking-wider transition-all cursor-pointer ${
                filterTab === 'all'
                  ? 'bg-orange-500 text-black shadow-md'
                  : 'text-zinc-400 hover:text-white hover:bg-zinc-900'
              }`}
            >
              Todos ({matches.length})
            </button>
            <button
              type="button"
              onClick={() => setFilterTab('today')}
              className={`px-3 py-1.5 rounded-lg text-xs font-bold uppercase tracking-wider transition-all cursor-pointer ${
                filterTab === 'today'
                  ? 'bg-orange-500 text-black shadow-md'
                  : 'text-zinc-400 hover:text-white hover:bg-zinc-900'
              }`}
            >
              Futebol Hoje
            </button>
            <button
              type="button"
              onClick={() => setFilterTab('with_prediction')}
              className={`px-3 py-1.5 rounded-lg text-xs font-bold uppercase tracking-wider transition-all cursor-pointer ${
                filterTab === 'with_prediction'
                  ? 'bg-orange-500 text-black shadow-md'
                  : 'text-zinc-400 hover:text-white hover:bg-zinc-900'
              }`}
            >
              Com Previsão IA
            </button>
          </div>

          {/* 🏆 CAMPEONATOS / COMPETITIONS DROPDOWN FILTER */}
          <div className="relative">
            <select
              value={selectedLeague}
              onChange={(e) => setSelectedLeague(e.target.value)}
              className="bg-zinc-950 border border-orange-500/40 text-orange-400 font-bold text-xs uppercase tracking-wider rounded-xl px-3 py-2 focus:outline-none focus:border-orange-500 cursor-pointer shadow-lg shadow-orange-500/5 font-mono"
            >
              <option value="all">🏆 Todos os Campeonatos</option>
              {uniqueLeagues.map((league) => (
                <option key={league} value={league}>
                  ⚽ {league}
                </option>
              ))}
            </select>
          </div>

        </div>
      </div>

      {/* Main Table Container */}
      <div className="bg-[#121216]/60 border border-zinc-850 rounded-3xl overflow-hidden shadow-2xl">
        
        {loading ? (
          <div className="py-16 text-center text-zinc-500 font-mono text-xs animate-pulse">
            A carregar tabela de prognósticos...
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse min-w-[1200px]">
              <thead>
                <tr className="bg-zinc-950/90 border-b border-zinc-850 text-[11px] font-extrabold text-zinc-400 uppercase tracking-wider font-mono">
                  <th className="py-4 px-4 w-32">DATA</th>
                  <th className="py-4 px-4 w-24">HORA</th>
                  <th className="py-4 px-5">COMPETIÇÃO</th>
                  <th className="py-4 px-5 text-left">EQUIPA CASA</th>
                  <th className="py-4 px-3 text-center text-zinc-600 font-normal w-12">VS</th>
                  <th className="py-4 px-5 text-left">EQUIPA FORA</th>
                  <th className="py-4 px-5 text-center">DICA / MERCADO</th>
                  <th className="py-4 px-5 text-center w-24">ODD</th>
                  <th className="py-4 px-4 text-center w-32">ORIGEM / IA</th>
                  <th className="py-4 px-5 text-center w-40">ANÁLISE & PALPITE</th>
                  {isManagerMode && <th className="py-4 px-5 text-right w-36">AÇÕES</th>}
                </tr>
              </thead>
              <tbody className="divide-y divide-zinc-900 text-xs sm:text-sm font-sans">
                {filteredMatches.length === 0 ? (
                  <>
                    {[1, 2, 3, 4].map((slotIdx) => (
                      <tr key={`empty-slot-${slotIdx}`} className="hover:bg-zinc-900/20 transition-colors group">
                        <td className="py-3.5 px-4 font-mono text-zinc-600 text-xs whitespace-nowrap">
                          <span className="bg-zinc-900/50 border border-zinc-850 px-2 py-0.5 rounded text-[11px] text-zinc-600">
                            📅 {new Date().toLocaleDateString('pt-PT')}
                          </span>
                        </td>
                        <td className="py-3.5 px-4 font-mono text-zinc-600 text-xs">—</td>
                        <td className="py-3.5 px-4 text-zinc-600 font-mono text-xs">⚽ Sem jogo registado</td>
                        <td className="py-3.5 px-4 text-zinc-600 font-mono italic text-xs">(Célula sem dados)</td>
                        <td className="py-3.5 px-2 text-center text-zinc-700 font-mono text-xs font-bold">vs</td>
                        <td className="py-3.5 px-4 text-zinc-600 font-mono italic text-xs">(Célula sem dados)</td>
                        <td className="py-3.5 px-4 text-center text-zinc-600 font-mono text-xs">—</td>
                        <td className="py-3.5 px-4 text-center font-mono text-zinc-600 text-xs">—</td>
                        <td className="py-3.5 px-4 text-center font-mono text-zinc-600 text-xs">—</td>
                        <td className="py-3.5 px-5 text-center text-zinc-600 font-mono text-xs">
                          <span className="text-[11px] text-zinc-600 italic">Aguardando dados...</span>
                        </td>
                        {isManagerMode && (
                          <td className="py-3.5 px-5 text-right">
                            <button
                              type="button"
                              onClick={handleAddNewMatchRow}
                              className="px-2.5 py-1 bg-zinc-900 hover:bg-orange-500 hover:text-black border border-zinc-800 text-zinc-400 text-[10px] font-bold font-mono uppercase rounded-lg transition-all cursor-pointer"
                            >
                              + Preencher
                            </button>
                          </td>
                        )}
                      </tr>
                    ))}
                    <tr className="bg-zinc-950/80 border-t border-zinc-800">
                      <td colSpan={isManagerMode ? 11 : 10} className="py-6 text-center text-zinc-400 font-mono text-xs space-y-3">
                        <p className="text-zinc-400 text-xs font-sans font-semibold">
                          {selectedLeague !== 'all' 
                            ? `Nenhum evento registado para ${selectedLeague} de momento.`
                            : 'A tabela não possui jogos registados de momento. As células encontram-se prontas a ser preenchidas.'}
                        </p>
                        {isStrictAdmin && (
                          <button
                            type="button"
                            onClick={handleAddNewMatchRow}
                            className="px-5 py-2.5 bg-gradient-to-r from-orange-500 to-amber-500 hover:from-orange-400 hover:to-amber-400 text-black font-extrabold text-xs uppercase tracking-wider rounded-xl shadow-lg transition-all cursor-pointer inline-flex items-center gap-2 hover:scale-105"
                          >
                            <span className="text-base font-black leading-none">+</span>
                            <span>
                              {selectedLeague !== 'all' 
                                ? `Adicionar Jogo em ${selectedLeague}`
                                : 'Adicionar Novo Jogo à Tabela'}
                            </span>
                          </button>
                        )}
                      </td>
                    </tr>
                  </>
                ) : (
                  filteredMatches.map((match) => {
                  const isEditingThisRow = editingRowId === match.id;

                  return (
                    <tr
                      key={match.id}
                      className="hover:bg-zinc-900/50 transition-colors group relative"
                    >
                      {/* Date */}
                      <td className="py-3.5 px-4 font-mono font-bold text-orange-400 whitespace-nowrap">
                        {isEditingThisRow ? (
                          <input
                            type="text"
                            value={match.date || new Date().toLocaleDateString('pt-PT')}
                            onChange={(e) => {
                              const updated = matches.map(m => m.id === match.id ? { ...m, date: e.target.value } : m);
                              saveMatchesList(updated);
                            }}
                            className="w-24 bg-zinc-950 border border-orange-500 rounded px-1.5 py-1 text-xs text-white"
                          />
                        ) : (
                          <span className="flex items-center gap-1.5 bg-zinc-900/80 border border-zinc-800 px-2 py-0.5 rounded-md text-[11px] text-zinc-300">
                            📅 {match.date || new Date().toLocaleDateString('pt-PT')}
                          </span>
                        )}
                      </td>

                      {/* Time */}
                      <td className="py-3.5 px-4 font-mono font-bold text-zinc-300 whitespace-nowrap">
                        {isEditingThisRow ? (
                          <input
                            type="text"
                            value={match.time}
                            onChange={(e) => {
                              const updated = matches.map(m => m.id === match.id ? { ...m, time: e.target.value } : m);
                              saveMatchesList(updated);
                            }}
                            className="w-16 bg-zinc-950 border border-orange-500 rounded px-1.5 py-1 text-xs text-white"
                          />
                        ) : (
                          <span className="flex items-center gap-1.5">
                            <span className="w-1.5 h-1.5 rounded-full bg-emerald-500/80"></span>
                            {match.time}
                          </span>
                        )}
                      </td>

                      {/* Competition */}
                      <td className="py-3.5 px-4 text-zinc-400 font-mono text-xs whitespace-nowrap">
                        {isEditingThisRow ? (
                          <select
                            value={match.competition}
                            onChange={(e) => {
                              const updated = matches.map(m => m.id === match.id ? { ...m, competition: e.target.value } : m);
                              saveMatchesList(updated);
                            }}
                            className="bg-zinc-950 border border-orange-500 rounded-lg px-2 py-1 text-xs text-orange-400 font-mono font-bold focus:outline-none max-w-[200px]"
                          >
                            {uniqueLeagues.map((league) => (
                              <option key={league} value={league}>
                                ⚽ {league}
                              </option>
                            ))}
                          </select>
                        ) : (
                          <span className="bg-zinc-900/80 border border-zinc-800 px-2.5 py-1 rounded-md text-zinc-300 font-semibold text-[11px] inline-block">
                            ⚽ {match.competition}
                          </span>
                        )}
                      </td>

                      {/* Home Team */}
                      <td className="py-3.5 px-4 font-extrabold text-white text-right sm:text-left font-display">
                        {isEditingThisRow ? (
                          <TeamInputSelect
                            value={match.homeTeam}
                            onChange={(val) => {
                              const updated = matches.map(m => m.id === match.id ? { ...m, homeTeam: val } : m);
                              saveMatchesList(updated);
                            }}
                            competition={match.competition}
                            placeholder="Equipa Casa"
                            compact={true}
                          />
                        ) : (
                          <div className="flex items-center gap-2">
                            {match.homeLogo && (
                              <img src={match.homeLogo} alt="" className="w-5 h-5 rounded-full object-cover" />
                            )}
                            <span>{match.homeTeam}</span>
                          </div>
                        )}
                      </td>

                      {/* VS */}
                      <td className="py-3.5 px-2 text-center text-zinc-600 font-mono text-xs font-bold">
                        vs
                      </td>

                      {/* Away Team */}
                      <td className="py-3.5 px-4 font-extrabold text-white font-display">
                        {isEditingThisRow ? (
                          <TeamInputSelect
                            value={match.awayTeam}
                            onChange={(val) => {
                              const updated = matches.map(m => m.id === match.id ? { ...m, awayTeam: val } : m);
                              saveMatchesList(updated);
                            }}
                            competition={match.competition}
                            placeholder="Equipa Fora"
                            compact={true}
                          />
                        ) : (
                          <div className="flex items-center gap-2">
                            {match.awayLogo && (
                              <img src={match.awayLogo} alt="" className="w-5 h-5 rounded-full object-cover" />
                            )}
                            <span>{match.awayTeam}</span>
                          </div>
                        )}
                      </td>

                      {/* Tip */}
                      <td className="py-3.5 px-4 text-center whitespace-nowrap">
                        {isEditingThisRow ? (
                          <input
                            type="text"
                            value={match.tip}
                            onChange={(e) => {
                              const updated = matches.map(m => m.id === match.id ? { ...m, tip: e.target.value } : m);
                              saveMatchesList(updated);
                            }}
                            className="w-28 bg-zinc-950 border border-orange-500 rounded px-1.5 py-1 text-xs text-white"
                          />
                        ) : (
                          <span className="px-2.5 py-1 rounded-lg bg-orange-500/10 border border-orange-500/30 text-orange-300 font-bold text-xs font-mono inline-block">
                            💡 {match.tip}
                          </span>
                        )}
                      </td>

                      {/* Odd */}
                      <td className="py-3.5 px-4 text-center font-mono font-bold text-cyan-400">
                        {isEditingThisRow ? (
                          <input
                            type="text"
                            value={match.odd}
                            onChange={(e) => {
                              const updated = matches.map(m => m.id === match.id ? { ...m, odd: e.target.value } : m);
                              saveMatchesList(updated);
                            }}
                            className="w-14 bg-zinc-950 border border-orange-500 rounded px-1.5 py-1 text-xs text-white"
                          />
                        ) : (
                          <span>@{match.odd}</span>
                        )}
                      </td>

                      {/* ORIGEM / IA Column */}
                      <td className="py-3.5 px-4 text-center whitespace-nowrap">
                        {isManagerMode ? (
                          <button
                            type="button"
                            disabled={generatingAiId === match.id}
                            onClick={() => handleOpenAiStudio(match)}
                            className={`px-3 py-1.5 rounded-xl font-extrabold text-[11px] font-mono tracking-wider transition-all cursor-pointer inline-flex items-center gap-1.5 shadow-md hover:scale-105 active:scale-95 ${
                              generatingAiId === match.id
                                ? 'bg-amber-500/20 text-amber-300 border border-amber-500/50 animate-pulse'
                                : match.isAiGenerated
                                ? 'bg-cyan-500/20 text-cyan-300 border border-cyan-500/50 hover:bg-cyan-500/30'
                                : 'bg-zinc-800 text-zinc-300 border border-zinc-700 hover:bg-zinc-750 hover:text-white'
                            }`}
                            title={match.isAiGenerated ? "Abrir Quadro de IA Gemini (Espelho). Clique para ver/editar ou re-analisar." : "Abrir Quadro de IA Gemini para gerar análise automática"}
                          >
                            {generatingAiId === match.id ? (
                              <>
                                <span className="animate-spin text-xs">🌀</span>
                                <span>A Gerar...</span>
                              </>
                            ) : match.isAiGenerated ? (
                              <>
                                <span>🤖</span>
                                <span>IA (Estúdio)</span>
                              </>
                            ) : (
                              <>
                                <span>⚡</span>
                                <span>Gerar IA</span>
                              </>
                            )}
                          </button>
                        ) : (
                          /* INERT / READ-ONLY BADGE FOR REGULAR VISITORS */
                          match.isAiGenerated ? (
                            <span
                              className="px-2.5 py-1 rounded-full bg-cyan-500/15 border border-cyan-500/40 text-cyan-300 font-extrabold text-[11px] font-mono inline-flex items-center gap-1 shadow-sm"
                              title="Esta análise foi criada pela Inteligência Artificial Gemini"
                            >
                              🤖 IA
                            </span>
                          ) : (
                            <span
                              className="px-2.5 py-1 rounded-full bg-zinc-800/80 border border-zinc-750 text-zinc-400 font-extrabold text-[11px] font-mono inline-flex items-center gap-1"
                              title="Análise elaborada manualmente pela equipa editorial"
                            >
                              👤 Manual
                            </span>
                          )
                        )}
                      </td>

                      {/* PREVISÃO BUTTON (OPENS POPUP OVERLAY) */}
                      <td className="py-3.5 px-4 text-center whitespace-nowrap">
                        <button
                          type="button"
                          onClick={() => {
                            setSelectedPredictionMatch(match);
                            setIsEditingModal(false);
                            setModalEditMatch(match);
                          }}
                          className="px-5 py-2.5 bg-gradient-to-r from-orange-500 to-amber-500 hover:from-orange-400 hover:to-amber-400 text-black font-black text-xs uppercase tracking-wider rounded-xl shadow-lg shadow-orange-500/20 transition-all cursor-pointer flex items-center justify-center gap-2 mx-auto hover:scale-105 active:scale-95"
                        >
                          <span>👁️</span>
                          <span>Previsão</span>
                        </button>
                      </td>

                      {/* Actions Column (Edit/Delete) */}
                      {isManagerMode && (
                        <td className="py-3.5 px-4 text-right whitespace-nowrap">
                          {deleteConfirmId === match.id ? (
                            <div className="flex items-center justify-end gap-1 bg-red-950/80 p-1 rounded-xl border border-red-500/50 animate-pulse">
                              <button
                                type="button"
                                onClick={(e) => handleDeleteMatchRow(match.id, e)}
                                className="px-2.5 py-1 bg-red-600 hover:bg-red-500 text-white font-extrabold rounded-lg text-xs tracking-wider transition-all cursor-pointer shadow-lg"
                                title="Confirmar Eliminação"
                              >
                                ⚠️ Confirmar?
                              </button>
                              <button
                                type="button"
                                onClick={() => setDeleteConfirmId(null)}
                                className="px-2 py-1 bg-zinc-800 hover:bg-zinc-700 text-zinc-300 rounded-lg text-xs font-bold transition-all cursor-pointer"
                                title="Cancelar"
                              >
                                ✕
                              </button>
                            </div>
                          ) : (
                            <div className="flex items-center justify-end gap-1.5">
                              <button
                                type="button"
                                onClick={() => setEditingRowId(isEditingThisRow ? null : match.id)}
                                className="px-2.5 py-1 bg-zinc-800 hover:bg-zinc-700 text-zinc-300 rounded-lg text-xs font-bold transition-all cursor-pointer"
                                title="Editar Linha Rapidamente"
                              >
                                {isEditingThisRow ? '✓ OK' : '✏️ Editar'}
                              </button>
                              <button
                                type="button"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  e.preventDefault();
                                  setDeleteConfirmId(match.id);
                                }}
                                className="px-2.5 py-1 bg-red-500/20 hover:bg-red-500/40 text-red-400 border border-red-500/30 hover:border-red-500/60 rounded-lg text-xs font-bold transition-all cursor-pointer"
                                title="Eliminar Evento"
                              >
                                🗑️ Apagar
                              </button>
                            </div>
                          )}
                        </td>
                      )}
                    </tr>
                  );
                }))}
              </tbody>
            </table>
          </div>
        )}

        {/* Quick Excel-style + Add Row Button Bar at bottom of table */}
        <div className="p-4 bg-zinc-950 border-t border-zinc-850 flex items-center justify-between flex-wrap gap-3">
          {isStrictAdmin && (
            <button
              type="button"
              onClick={handleAddNewMatchRow}
              className="px-5 py-2.5 bg-orange-500/15 hover:bg-orange-500/25 text-orange-400 border border-orange-500/40 font-extrabold text-xs uppercase tracking-wider rounded-xl transition-all cursor-pointer flex items-center gap-2 hover:scale-102"
            >
              <span className="text-base font-black">+</span>
              <span>Adicionar Novo Evento à Tabela</span>
            </button>
          )}

          <span className="text-[11px] text-zinc-500 font-mono">
            {filteredMatches.length} evento(s) exibido(s) • Gestão em Tempo Real
          </span>
        </div>
      </div>

      {/* ========================================================================= */}
      {/* INDEPENDENT PREDICTION POPUP OVERLAY MODAL */}
      {/* ========================================================================= */}
      {/* MODAL POP-UP (PROGNÓSTICO COMPLETO - WIX STYLE EDITOR) */}
      {/* ========================================================================= */}
      {selectedPredictionMatch && (
        <div 
          className="fixed inset-0 bg-black/85 backdrop-blur-md z-[9999] flex items-center justify-center p-3 sm:p-6 lg:p-8 animate-fade-in overflow-y-auto"
          onClick={() => setSelectedPredictionMatch(null)}
        >
          <div 
            className="bg-[#121216] border border-zinc-800 rounded-3xl w-full max-w-6xl xl:max-w-7xl max-h-[94vh] min-h-[580px] overflow-y-auto shadow-2xl relative text-left p-6 sm:px-10 sm:py-8 space-y-6 flex flex-col justify-between"
            onClick={(e) => e.stopPropagation()}
          >
            <div>
              {/* Header with Title & Close button */}
              <div className="flex items-start justify-between border-b border-zinc-850 pb-4 gap-4">
                <div>
                  {selectedPredictionMatch.isAiGenerated ? (
                    <span className="text-[11px] uppercase font-extrabold font-mono tracking-widest text-cyan-300 bg-cyan-500/15 px-3 py-1 rounded-lg border border-cyan-500/30 inline-flex items-center gap-1.5 shadow-sm mb-2">
                      🤖 PREVISÃO DA NOSSA IA GEMINI
                    </span>
                  ) : (
                    <span className="text-[11px] uppercase font-extrabold font-mono tracking-widest text-orange-400 bg-orange-500/10 px-3 py-1 rounded-lg border border-orange-500/20 inline-flex items-center gap-1.5 mb-2">
                      👤 ANÁLISE EDITORIAL MANUAL
                    </span>
                  )}
                  <h2 className="text-xl sm:text-2xl lg:text-3xl font-black text-white font-display tracking-tight uppercase leading-snug">
                    {selectedPredictionMatch.predictionTitle || `PROGNÓSTICO ${selectedPredictionMatch.homeTeam} vs ${selectedPredictionMatch.awayTeam}`}
                  </h2>
                  <div className="flex items-center gap-3 text-xs sm:text-sm text-zinc-400 font-mono mt-1.5 flex-wrap font-semibold">
                    <span className="text-orange-400">🏆 {selectedPredictionMatch.competition}</span>
                    <span className="text-zinc-600">•</span>
                    <span>📅 {selectedPredictionMatch.date || new Date().toLocaleDateString('pt-PT')}</span>
                    <span className="text-zinc-600">•</span>
                    <span>🕒 {selectedPredictionMatch.time}</span>
                  </div>
                </div>

                <div className="flex items-center gap-2.5 shrink-0">
                  {isStrictAdmin && (
                    <>
                      <button
                        type="button"
                        disabled={generatingAiId === selectedPredictionMatch.id}
                        onClick={() => handleOpenAiStudio(selectedPredictionMatch)}
                        className="px-3.5 py-2 bg-gradient-to-r from-cyan-500 to-blue-600 hover:from-cyan-400 hover:to-blue-500 text-black font-extrabold text-xs sm:text-sm uppercase tracking-wider rounded-xl shadow-lg shadow-cyan-500/20 transition-all cursor-pointer flex items-center gap-1.5 hover:scale-105 active:scale-95 disabled:opacity-50"
                        title="Abrir Quadro/Estúdio de IA Gemini em Pop-up para Análise (Admin)"
                      >
                        {generatingAiId === selectedPredictionMatch.id ? (
                          <>
                            <span className="animate-spin text-xs">🌀</span>
                            <span>A Analisar...</span>
                          </>
                        ) : (
                          <>
                            <span>🤖</span>
                            <span>Análise IA (Estúdio)</span>
                          </>
                        )}
                      </button>

                      <button
                        type="button"
                        onClick={() => {
                          const nextState = !isEditingModal;
                          setIsEditingModal(nextState);
                          if (selectedPredictionMatch) {
                            const defaultSuggestion = selectedPredictionMatch.editorSuggestion || `${selectedPredictionMatch.tip || ''} @ ${selectedPredictionMatch.odd || ''}`.trim();
                            setModalEditMatch({
                              ...selectedPredictionMatch,
                              editorSuggestion: defaultSuggestion
                            });
                          }
                        }}
                        className={`px-3.5 py-2 rounded-xl text-xs sm:text-sm font-extrabold uppercase tracking-wider transition-all cursor-pointer ${
                          isEditingModal
                            ? 'bg-amber-500 text-black shadow-lg shadow-amber-500/20 hover:bg-amber-400'
                            : 'bg-zinc-800 text-zinc-200 hover:bg-zinc-700 hover:text-white border border-zinc-700'
                        }`}
                      >
                        {isEditingModal ? '👁️ Ver Resultado' : '✏️ Editar Previsão'}
                      </button>
                    </>
                  )}

                  <button
                    type="button"
                    onClick={() => setSelectedPredictionMatch(null)}
                    className="p-2.5 bg-zinc-900 hover:bg-zinc-800 border border-zinc-750 rounded-xl text-zinc-400 hover:text-white transition-colors cursor-pointer text-sm font-bold font-mono"
                    title="Fechar Janela"
                  >
                    ✕
                  </button>
                </div>
              </div>

              {/* Modal Body - EDIT FORM MODE */}
              {isEditingModal && modalEditMatch ? (
                <div className="space-y-4 bg-zinc-950 p-5 sm:p-6 rounded-3xl border border-orange-500/40 my-4">
                  <h3 className="text-sm font-extrabold text-orange-400 uppercase tracking-wide font-mono flex items-center gap-2">
                    <span>✏️ Editor de Conteúdo da Pop-up</span>
                  </h3>

                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
                    <div>
                      <label className="block text-xs font-bold text-zinc-400 mb-1">Data do Jogo:</label>
                      <input
                        type="text"
                        value={modalEditMatch.date || ''}
                        onChange={(e) => setModalEditMatch({ ...modalEditMatch, date: e.target.value })}
                        className="w-full bg-zinc-900 border border-zinc-750 rounded-xl px-3 py-2 text-xs text-white focus:border-orange-500 focus:outline-none"
                        placeholder="Ex: 05/08/2026"
                      />
                    </div>

                    <div>
                      <label className="block text-xs font-bold text-zinc-400 mb-1">Hora do Jogo:</label>
                      <input
                        type="text"
                        value={modalEditMatch.time || ''}
                        onChange={(e) => setModalEditMatch({ ...modalEditMatch, time: e.target.value })}
                        className="w-full bg-zinc-900 border border-zinc-750 rounded-xl px-3 py-2 text-xs text-white focus:border-orange-500 focus:outline-none"
                        placeholder="Ex: 20:00"
                      />
                    </div>

                    <div>
                      <label className="block text-xs font-bold text-zinc-400 mb-1">Competição / Liga (API):</label>
                      <select
                        value={modalEditMatch.competition}
                        onChange={(e) => setModalEditMatch({ ...modalEditMatch, competition: e.target.value })}
                        className="w-full bg-zinc-900 border border-orange-500/50 text-orange-400 font-bold rounded-xl px-3 py-2 text-xs focus:outline-none"
                      >
                        {uniqueLeagues.map((league) => (
                          <option key={league} value={league}>
                            ⚽ {league}
                          </option>
                        ))}
                      </select>
                    </div>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <TeamInputSelect
                      label="Equipa Casa:"
                      value={modalEditMatch.homeTeam}
                      onChange={(val) => setModalEditMatch({ ...modalEditMatch, homeTeam: val })}
                      competition={modalEditMatch.competition}
                      placeholder="Ex: Benfica, AS Roma, FC Porto..."
                    />

                    <TeamInputSelect
                      label="Equipa Fora:"
                      value={modalEditMatch.awayTeam}
                      onChange={(val) => setModalEditMatch({ ...modalEditMatch, awayTeam: val })}
                      competition={modalEditMatch.competition}
                      placeholder="Ex: Sporting, Manchester United, Real Madrid..."
                    />
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <div>
                      <label className="block text-xs font-bold text-zinc-400 mb-1">Título do Prognóstico:</label>
                      <input
                        type="text"
                        value={modalEditMatch.predictionTitle || ''}
                        onChange={(e) => setModalEditMatch({ ...modalEditMatch, predictionTitle: e.target.value })}
                        className="w-full bg-zinc-900 border border-zinc-750 rounded-xl px-3 py-2 text-xs text-white focus:border-orange-500 focus:outline-none"
                      />
                    </div>

                    <div>
                      <label className="block text-xs font-bold text-zinc-400 mb-1">Dica Sugerida (Ex: Ambas Marcam @ 1.75):</label>
                      <input
                        type="text"
                        value={modalEditMatch.editorSuggestion || ''}
                        onChange={(e) => {
                          const val = e.target.value;
                          let newTip = modalEditMatch.tip;
                          let newOdd = modalEditMatch.odd;
                          if (val.includes('@')) {
                            const parts = val.split('@');
                            if (parts[0]?.trim()) newTip = parts[0].trim();
                            if (parts[1]?.trim()) newOdd = parts[1].trim();
                          } else if (val.trim()) {
                            newTip = val.trim();
                          }
                          setModalEditMatch({
                            ...modalEditMatch,
                            editorSuggestion: val,
                            tip: newTip,
                            odd: newOdd
                          });
                        }}
                        className="w-full bg-zinc-900 border border-zinc-750 rounded-xl px-3 py-2 text-xs text-white focus:border-orange-500 focus:outline-none"
                      />
                    </div>
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-zinc-400 mb-1">Texto Completo da Análise:</label>
                    <textarea
                      rows={5}
                      value={modalEditMatch.predictionText || ''}
                      onChange={(e) => setModalEditMatch({ ...modalEditMatch, predictionText: e.target.value })}
                      className="w-full bg-zinc-900 border border-zinc-750 rounded-xl px-3.5 py-2.5 text-xs text-zinc-200 focus:border-orange-500 focus:outline-none leading-relaxed"
                      placeholder="Escreva a análise detalhada do jogo..."
                    />
                  </div>

                  <div className="space-y-1.5">
                    <label className="block text-xs font-bold text-zinc-400">Carregar Imagem de Análise do Computador:</label>
                    <div className="flex items-center gap-3">
                      <label className="px-4 py-2 bg-orange-500 hover:bg-orange-400 text-black rounded-xl text-xs font-extrabold uppercase tracking-wider cursor-pointer shadow-lg shadow-orange-500/10 inline-flex items-center gap-2">
                        <span>📁 Escolher Imagem do PC</span>
                        <input
                          type="file"
                          accept="image/*"
                          className="hidden"
                          onChange={handleImageFileUpload}
                        />
                      </label>

                      {modalEditMatch.predictionImage && (
                        <span className="text-xs text-emerald-400 font-mono font-bold">
                          ✓ Imagem Carregada
                        </span>
                      )}
                    </div>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-1">
                    <div>
                      <label className="block text-xs font-bold text-zinc-400 mb-1">Casa de Apostas:</label>
                      <input
                        type="text"
                        value={modalEditMatch.bookmakerName || 'Betano'}
                        onChange={(e) => setModalEditMatch({ ...modalEditMatch, bookmakerName: e.target.value })}
                        className="w-full bg-zinc-900 border border-zinc-750 rounded-xl px-3 py-2 text-xs text-white focus:border-orange-500 focus:outline-none"
                      />
                    </div>

                    <div>
                      <label className="block text-xs font-bold text-zinc-400 mb-1">Link da Casa de Apostas:</label>
                      <input
                        type="text"
                        value={modalEditMatch.bookmakerLink || '#'}
                        onChange={(e) => setModalEditMatch({ ...modalEditMatch, bookmakerLink: e.target.value })}
                        className="w-full bg-zinc-900 border border-zinc-750 rounded-xl px-3 py-2 text-xs text-white focus:border-orange-500 focus:outline-none"
                      />
                    </div>
                  </div>

                  <div className="flex items-center gap-2 pt-2 bg-zinc-900/60 p-3 rounded-xl border border-zinc-800">
                    <input
                      type="checkbox"
                      id="modalIsAiGenerated"
                      checked={!!modalEditMatch.isAiGenerated}
                      onChange={(e) => setModalEditMatch({ ...modalEditMatch, isAiGenerated: e.target.checked })}
                      className="w-4 h-4 accent-cyan-500 rounded cursor-pointer"
                    />
                    <label htmlFor="modalIsAiGenerated" className="text-xs font-extrabold text-zinc-200 cursor-pointer flex items-center gap-1.5">
                      <span>🤖 Marcar como Análise Gerada por IA Gemini</span>
                      <span className="text-[10px] text-zinc-400 font-normal">(Exibe o selo oficial de IA na tabela e exportações)</span>
                    </label>
                  </div>

                  <div className="pt-2 flex justify-end gap-2">
                    <button
                      type="button"
                      onClick={handleSaveModalEdits}
                      className="px-6 py-2.5 bg-emerald-500 hover:bg-emerald-400 text-black font-extrabold text-xs uppercase tracking-wider rounded-xl shadow-lg transition-all cursor-pointer hover:scale-105"
                    >
                      💾 Salvar Alterações na Pop-up
                    </button>
                  </div>
                </div>
              ) : (
                /* Modal Body - REGULAR VIEW MODE */
                <div className="space-y-4 my-4">
                  
                  {/* Visual Teams Duel Header */}
                  <div className="bg-gradient-to-r from-zinc-950 via-zinc-900 to-zinc-950 border border-zinc-800 rounded-2xl p-4 sm:p-5 flex items-center justify-around text-center shadow-lg relative overflow-hidden">
                    <div className="absolute top-0 right-1/4 w-32 h-32 bg-orange-500/5 rounded-full blur-3xl pointer-events-none"></div>
                    
                    <div className="space-y-1 relative z-10 min-w-[110px]">
                      {selectedPredictionMatch.homeLogo ? (
                        <img src={selectedPredictionMatch.homeLogo} alt="" className="w-14 h-14 sm:w-16 sm:h-16 rounded-full mx-auto object-cover border-2 border-zinc-700 shadow-md" />
                      ) : (
                        <div className="w-14 h-14 sm:w-16 sm:h-16 rounded-full bg-orange-500/20 border-2 border-orange-500/40 mx-auto flex items-center justify-center text-orange-400 font-extrabold text-xl sm:text-2xl shadow-md">
                          {selectedPredictionMatch.homeTeam.substring(0, 2).toUpperCase()}
                        </div>
                      )}
                      <h3 className="font-black text-white text-base sm:text-lg font-display uppercase tracking-wide">{selectedPredictionMatch.homeTeam}</h3>
                      <span className="text-[10px] text-zinc-500 font-mono font-bold block uppercase tracking-wider">EQUIPA CASA</span>
                    </div>

                    <div className="space-y-1 relative z-10 px-4">
                      <span className="text-2xl sm:text-3xl font-black text-orange-500 font-mono tracking-tight drop-shadow">VS</span>
                      <div className="text-xs font-bold text-zinc-400 font-mono bg-zinc-950 px-2.5 py-0.5 rounded-full border border-zinc-800 shadow-inner">
                        {selectedPredictionMatch.time}
                      </div>
                    </div>

                    <div className="space-y-1 relative z-10 min-w-[110px]">
                      {selectedPredictionMatch.awayLogo ? (
                        <img src={selectedPredictionMatch.awayLogo} alt="" className="w-14 h-14 sm:w-16 sm:h-16 rounded-full mx-auto object-cover border-2 border-zinc-700 shadow-md" />
                      ) : (
                        <div className="w-14 h-14 sm:w-16 sm:h-16 rounded-full bg-cyan-500/20 border-2 border-cyan-500/40 mx-auto flex items-center justify-center text-cyan-400 font-extrabold text-xl sm:text-2xl shadow-md">
                          {selectedPredictionMatch.awayTeam.substring(0, 2).toUpperCase()}
                        </div>
                      )}
                      <h3 className="font-black text-white text-base sm:text-lg font-display uppercase tracking-wide">{selectedPredictionMatch.awayTeam}</h3>
                      <span className="text-[10px] text-zinc-500 font-mono font-bold block uppercase tracking-wider">EQUIPA FORA</span>
                    </div>
                  </div>

                  {/* Highlighted Recommendation Box */}
                  <div className="bg-gradient-to-r from-orange-500/10 via-amber-500/10 to-orange-500/10 border border-orange-500/30 rounded-2xl p-4 sm:p-5 space-y-3">
                    <div className="flex flex-wrap items-center justify-between gap-2 border-b border-orange-500/20 pb-2.5">
                      <span className="text-xs font-extrabold text-orange-400 uppercase tracking-wider font-mono flex items-center gap-1.5">
                        <span>💡 SUGESTÃO PRINCIPAL DO EDITOR DE IA:</span>
                      </span>
                      <span className="px-4 py-1.5 bg-gradient-to-r from-orange-500 to-amber-500 text-black font-black text-xs uppercase tracking-wider rounded-lg shadow-md font-mono">
                        {selectedPredictionMatch.editorSuggestion || `${selectedPredictionMatch.tip} @ ${selectedPredictionMatch.odd}`}
                      </span>
                    </div>

                    <div className="flex flex-wrap items-center justify-between gap-3 text-xs sm:text-sm">
                      <span className="text-zinc-300 font-medium">
                        Confiança Algorítmica: <strong className="text-emerald-400 font-mono font-bold text-xs sm:text-sm">9.2 / 10 (+EV)</strong>
                      </span>

                      {selectedPredictionMatch.bookmakerName && (
                        <a
                          href={selectedPredictionMatch.bookmakerLink || '#'}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="px-4 py-2 bg-zinc-950 hover:bg-zinc-900 text-orange-400 hover:text-orange-300 border border-orange-500/50 font-extrabold text-xs uppercase tracking-wider rounded-xl transition-all shadow-md inline-flex items-center gap-2 hover:scale-105"
                        >
                          <span>Apostar na {selectedPredictionMatch.bookmakerName}</span>
                          <span className="text-sm font-black">→</span>
                        </a>
                      )}
                    </div>
                  </div>

                  {/* Optional Uploaded Image inside Modal */}
                  {selectedPredictionMatch.predictionImage && (
                    <div className="rounded-2xl overflow-hidden border border-zinc-800 shadow-xl">
                      <img
                        src={selectedPredictionMatch.predictionImage}
                        alt="Análise visual"
                        className="w-full h-auto max-h-[380px] object-cover"
                      />
                    </div>
                  )}

                  {/* Text Analysis Content */}
                  <div className="space-y-2 text-zinc-200 font-normal text-xs sm:text-sm leading-relaxed whitespace-pre-wrap bg-zinc-950/80 p-4 sm:p-5 rounded-2xl border border-zinc-800 shadow-md">
                    <div className="flex items-center justify-between border-b border-zinc-800/80 pb-2 mb-2 flex-wrap gap-2">
                      <h4 className="text-xs font-extrabold text-white uppercase tracking-wider font-mono border-l-4 border-orange-500 pl-2.5">
                        Análise Técnica da Partida:
                      </h4>
                      {selectedPredictionMatch.isAiGenerated ? (
                        <span className="text-[10px] font-mono font-bold text-cyan-300 bg-cyan-950/80 border border-cyan-500/40 px-2.5 py-0.5 rounded-full flex items-center gap-1 shadow-sm">
                          🤖 Gerado por IA Gemini
                        </span>
                      ) : (
                        <span className="text-[10px] font-mono font-bold text-zinc-400 bg-zinc-900 border border-zinc-750 px-2.5 py-0.5 rounded-full flex items-center gap-1">
                          👤 Elaborado pela Equipa Editorial
                        </span>
                      )}
                    </div>
                    <p className="text-zinc-300 font-sans">
                      {selectedPredictionMatch.predictionText || 'Sem análise em texto escrita para este jogo.'}
                    </p>
                  </div>
                </div>
              )}
            </div>

            {/* Modal Footer */}
            <div className="border-t border-zinc-850 pt-3.5 flex items-center justify-between flex-wrap gap-3">
              {isManagerMode ? (
                <button
                  type="button"
                  onClick={() => handleDeleteMatchRow(selectedPredictionMatch.id)}
                  className="px-4 py-2 bg-red-500/20 hover:bg-red-500/40 text-red-400 border border-red-500/30 rounded-xl font-bold text-xs uppercase tracking-wider transition-all cursor-pointer flex items-center gap-1.5 hover:scale-105"
                >
                  <span>🗑️</span>
                  <span>Eliminar Este Evento</span>
                </button>
              ) : (
                <div></div>
              )}

              <button
                type="button"
                onClick={() => setSelectedPredictionMatch(null)}
                className="px-6 py-2.5 bg-zinc-900 hover:bg-zinc-800 text-zinc-200 hover:text-white font-extrabold text-xs uppercase tracking-wider rounded-xl border border-zinc-750 transition-all cursor-pointer hover:scale-105"
              >
                Fechar Janela
              </button>
            </div>
          </div>
        </div>
      )}

      {/* AI STUDIO MIRROR POP-UP MODAL (ADMIN ONLY) */}
      {aiStudioMatch && (
        <div className="fixed inset-0 z-50 bg-black/85 backdrop-blur-md flex items-center justify-center p-3 sm:p-6 overflow-y-auto animate-fade-in">
          <div className="bg-zinc-900 border border-cyan-500/40 rounded-3xl max-w-4xl w-full p-5 sm:p-7 shadow-2xl space-y-6 max-h-[92vh] overflow-y-auto relative">
            
            {/* Top Accent Line */}
            <div className="absolute top-0 inset-x-0 h-1 bg-gradient-to-r from-cyan-500 via-blue-500 to-indigo-500 rounded-t-3xl"></div>

            {/* Modal Header */}
            <div className="flex items-start justify-between border-b border-zinc-800 pb-4 gap-4">
              <div>
                <span className="text-[11px] uppercase font-extrabold font-mono tracking-widest text-cyan-300 bg-cyan-500/15 px-3 py-1 rounded-lg border border-cyan-500/30 inline-flex items-center gap-1.5 shadow-sm mb-2">
                  ⚡ ESTÚDIO ESPELHO • ANÁLISE DE JOGOS IA GEMINI
                </span>
                <h2 className="text-xl sm:text-2xl lg:text-3xl font-black text-white font-display tracking-tight uppercase leading-snug">
                  {studioHomeTeam || aiStudioMatch.homeTeam} <span className="text-cyan-400">vs</span> {studioAwayTeam || aiStudioMatch.awayTeam}
                </h2>
                <div className="flex items-center gap-3 text-xs text-zinc-400 font-mono mt-1 flex-wrap">
                  <span>🏆 {studioCompetition || aiStudioMatch.competition || 'Futebol'}</span>
                  <span>•</span>
                  <span>📅 {aiStudioMatch.date} ({aiStudioMatch.time})</span>
                  <span>•</span>
                  <span>💡 Mercado Base: <strong className="text-orange-400">{studioTip || aiStudioMatch.tip} @ {studioOdd || aiStudioMatch.odd}</strong></span>
                </div>
              </div>

              <button
                type="button"
                onClick={() => setAiStudioMatch(null)}
                className="w-9 h-9 rounded-full bg-zinc-800 hover:bg-zinc-700 text-zinc-300 hover:text-white flex items-center justify-center font-bold transition-all cursor-pointer border border-zinc-700 shrink-0"
              >
                ✕
              </button>
            </div>

            {/* PARAMETERS CONFIGURATION BAR (MATCH, LEAGUE & TEAMS SELECTION VIA API) */}
            <div className="p-4 bg-zinc-950/80 border border-cyan-500/30 rounded-2xl space-y-3">
              <div className="flex items-center justify-between border-b border-zinc-800 pb-2">
                <span className="text-xs font-black text-cyan-300 font-mono uppercase tracking-wider flex items-center gap-1.5">
                  <span>⚽ SELECÇÃO E AJUSTE DE LIGA E EQUIPAS (IA API GEMINI)</span>
                </span>
                <span className="text-[10px] text-zinc-400 font-mono">
                  Carregado do quadro (Altere para qualquer liga/divisão mundial)
                </span>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 text-xs font-mono">
                {/* Competição / Liga */}
                <div className="space-y-1">
                  <label className="text-[10px] text-zinc-400 font-bold uppercase block">
                    🏆 Competição / Liga:
                  </label>
                  <input
                    type="text"
                    list="studioLeaguesList"
                    value={studioCompetition}
                    onChange={(e) => setStudioCompetition(e.target.value)}
                    placeholder="Ex: Liga Portugal, 3. Liga (Alemanha)..."
                    className="w-full bg-zinc-900 border border-zinc-750 rounded-xl px-3 py-2 text-white font-bold focus:outline-none focus:border-cyan-500"
                  />
                  <datalist id="studioLeaguesList">
                    {getAllLeaguesList().map((league) => (
                      <option key={league} value={league} />
                    ))}
                  </datalist>
                </div>

                {/* Equipa Casa */}
                <TeamInputSelect
                  label="🏠 Equipa Casa:"
                  value={studioHomeTeam}
                  onChange={(val) => setStudioHomeTeam(val)}
                  competition={studioCompetition}
                  placeholder="Ex: Benfica, Dynamo Dresden, Inter, Juventus..."
                />

                {/* Equipa Fora */}
                <TeamInputSelect
                  label="✈️ Equipa Fora:"
                  value={studioAwayTeam}
                  onChange={(val) => setStudioAwayTeam(val)}
                  competition={studioCompetition}
                  placeholder="Ex: FC Porto, Saarbrucken, Milan..."
                />

                {/* Dica / Mercado Base */}
                <div className="space-y-1">
                  <label className="text-[10px] text-zinc-400 font-bold uppercase block">
                    💡 Mercado / Dica Aposta:
                  </label>
                  <input
                    type="text"
                    value={studioTip}
                    onChange={(e) => setStudioTip(e.target.value)}
                    placeholder="Ex: Ambas Marcam (BTTS)..."
                    className="w-full bg-zinc-900 border border-zinc-750 rounded-xl px-3 py-2 text-amber-300 font-extrabold focus:outline-none focus:border-cyan-500"
                  />
                </div>

                {/* Odd */}
                <div className="space-y-1">
                  <label className="text-[10px] text-zinc-400 font-bold uppercase block">
                    📈 Odd do Mercado:
                  </label>
                  <input
                    type="text"
                    value={studioOdd}
                    onChange={(e) => setStudioOdd(e.target.value)}
                    placeholder="Ex: 1.75"
                    className="w-full bg-zinc-900 border border-zinc-750 rounded-xl px-3 py-2 text-white font-mono font-bold focus:outline-none focus:border-cyan-500"
                  />
                </div>

                {/* Botão para Recalcular com novos dados */}
                <div className="flex items-end">
                  <button
                    type="button"
                    disabled={generatingAiId === aiStudioMatch.id}
                    onClick={() => handleGenerateAiInStudio()}
                    className="w-full py-2 px-3 bg-gradient-to-r from-cyan-500 to-blue-600 hover:from-cyan-400 hover:to-blue-500 text-black font-black text-xs uppercase tracking-wider rounded-xl shadow-md transition-all cursor-pointer flex items-center justify-center gap-1.5 hover:scale-102 active:scale-98 disabled:opacity-50"
                  >
                    {generatingAiId === aiStudioMatch.id ? (
                      <>
                        <span className="animate-spin">🌀</span>
                        <span>A Analisar Liga...</span>
                      </>
                    ) : (
                      <>
                        <span>🤖</span>
                        <span>Analisar/Recalcular Liga & IA</span>
                      </>
                    )}
                  </button>
                </div>
              </div>
            </div>

            {/* Recalculate Loading State Banner */}
            {generatingAiId === aiStudioMatch.id && (
              <div className="p-4 bg-cyan-500/10 border border-cyan-500/30 rounded-2xl flex items-center gap-3 text-cyan-300 text-xs font-mono font-bold animate-pulse">
                <span className="text-lg">🌀</span>
                <span>O modelo avançado Gemini 2.5 Flash está a processar os dados estatísticos da competição ({studioCompetition || aiStudioMatch.competition}), equipas ({studioHomeTeam || aiStudioMatch.homeTeam} vs {studioAwayTeam || aiStudioMatch.awayTeam}), probabilidades e relatório de especialista em tempo real...</span>
              </div>
            )}

            {/* STUDIO MIRROR CONTENT GRID */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-5">

              {/* CARD 1: MATRIZ DE RESULTADOS - PROBABILIDADE MATEMÁTICA AJUSTADA */}
              <div className="p-4 sm:p-5 bg-zinc-950/90 border border-zinc-800 rounded-2xl space-y-4">
                <div className="flex items-center justify-between border-b border-zinc-850 pb-2.5">
                  <h3 className="text-xs font-black text-white uppercase tracking-wider font-mono flex items-center gap-1.5">
                    <span>📊 MATRIZ DE RESULTADOS</span>
                  </h3>
                  <span className="text-[10px] text-cyan-400 font-mono font-bold">Poisson & IA Híbrida</span>
                </div>

                <div className="space-y-3 font-mono text-xs">
                  {/* Probabilidades 1X2 */}
                  <div>
                    <div className="flex justify-between text-zinc-400 mb-1 text-[11px] font-bold">
                      <span>1 ({studioHomeTeam || aiStudioMatch.homeTeam}): {aiStudioData.homeProb}%</span>
                      <span>X (Empate): {aiStudioData.drawProb}%</span>
                      <span>2 ({studioAwayTeam || aiStudioMatch.awayTeam}): {aiStudioData.awayProb}%</span>
                    </div>
                    <div className="h-3 w-full bg-zinc-850 rounded-full overflow-hidden flex shadow-inner">
                      <div style={{ width: `${aiStudioData.homeProb}%` }} className="bg-emerald-500 h-full transition-all duration-500" title={`Vitória ${studioHomeTeam || aiStudioMatch.homeTeam}: ${aiStudioData.homeProb}%`}></div>
                      <div style={{ width: `${aiStudioData.drawProb}%` }} className="bg-amber-500 h-full transition-all duration-500" title={`Empate: ${aiStudioData.drawProb}%`}></div>
                      <div style={{ width: `${aiStudioData.awayProb}%` }} className="bg-cyan-500 h-full transition-all duration-500" title={`Vitória ${studioAwayTeam || aiStudioMatch.awayTeam}: ${aiStudioData.awayProb}%`}></div>
                    </div>
                  </div>

                  {/* Over 2.5 Golos */}
                  <div>
                    <div className="flex justify-between text-zinc-300 mb-1 text-[11px] font-bold">
                      <span>Mais de 2.5 Golos (Over 2.5)</span>
                      <span className="text-cyan-400">{aiStudioData.over25Prob}%</span>
                    </div>
                    <div className="h-2 w-full bg-zinc-850 rounded-full overflow-hidden">
                      <div style={{ width: `${aiStudioData.over25Prob}%` }} className="bg-cyan-400 h-full transition-all duration-500"></div>
                    </div>
                  </div>

                  {/* Ambas Marcam */}
                  <div>
                    <div className="flex justify-between text-zinc-300 mb-1 text-[11px] font-bold">
                      <span>Ambas Marcam (BTTS)</span>
                      <span className="text-emerald-400">{aiStudioData.bttsProb}%</span>
                    </div>
                    <div className="h-2 w-full bg-zinc-850 rounded-full overflow-hidden">
                      <div style={{ width: `${aiStudioData.bttsProb}%` }} className="bg-emerald-400 h-full transition-all duration-500"></div>
                    </div>
                  </div>
                </div>
              </div>

              {/* CARD 2: MELHOR APOSTA POSSÍVEL / HIPÓTESE MAIS FORTE */}
              <div className="p-4 sm:p-5 bg-gradient-to-br from-zinc-950 via-zinc-900 to-cyan-950/40 border border-cyan-500/30 rounded-2xl space-y-3 shadow-lg relative overflow-hidden flex flex-col justify-between">
                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="text-[10px] font-mono font-extrabold text-cyan-300 uppercase tracking-widest bg-cyan-500/20 px-2.5 py-0.5 rounded-md border border-cyan-500/40">
                      ⚡ HIPÓTESE MAIS FORTE / BEST BET
                    </span>
                    <span className="text-[11px] text-emerald-400 font-mono font-black">
                      {aiStudioData.expectedValue}
                    </span>
                  </div>

                  <div>
                    <label className="text-[10px] text-zinc-400 font-mono uppercase font-bold block mb-1">
                      Mercado & Seleção Sugerida pela IA:
                    </label>
                    <input
                      type="text"
                      value={aiStudioData.editorSuggestion}
                      onChange={(e) => setAiStudioData({ ...aiStudioData, editorSuggestion: e.target.value })}
                      className="w-full bg-zinc-950 border border-cyan-500/50 rounded-xl px-3 py-2 text-sm font-black text-cyan-200 font-mono focus:outline-none focus:border-cyan-400 shadow-inner"
                      placeholder="Ex: Ambas Marcam @ 1.75"
                    />
                  </div>
                </div>

                <div className="pt-2 border-t border-zinc-800/80 flex items-center justify-between text-xs font-mono text-zinc-300">
                  <span>Nível de Confiança Algorítmica:</span>
                  <span className="text-emerald-400 font-black text-sm">{aiStudioData.confidenceLevel} / 10 (+EV)</span>
                </div>
              </div>

            </div>

            {/* RELATÓRIO ANALÍTICO DE ELITE IRUNBETS SPECIALIST */}
            <div className="p-4 sm:p-5 bg-zinc-950/90 border border-zinc-800 rounded-2xl space-y-3">
              <div className="flex items-center justify-between border-b border-zinc-850 pb-2">
                <h3 className="text-xs font-black text-white uppercase tracking-wider font-mono flex items-center gap-1.5">
                  <span>📝 RELATÓRIO ANALÍTICO DE ELITE IRUNBETS SPECIALIST</span>
                </h3>
                <span className="text-[10px] text-zinc-400 font-mono">Pode editar o texto antes de publicar</span>
              </div>

              <div>
                <label className="text-[10px] text-zinc-400 font-mono uppercase font-bold block mb-1">
                  Título do Prognóstico:
                </label>
                <input
                  type="text"
                  value={aiStudioData.predictionTitle}
                  onChange={(e) => setAiStudioData({ ...aiStudioData, predictionTitle: e.target.value })}
                  className="w-full bg-zinc-900 border border-zinc-750 rounded-xl px-3 py-2 text-xs font-extrabold text-white font-mono mb-3 focus:outline-none focus:border-cyan-500"
                />
              </div>

              <div>
                <label className="text-[10px] text-zinc-400 font-mono uppercase font-bold block mb-1">
                  Texto da Análise Técnica Fundamentada:
                </label>
                <textarea
                  rows={6}
                  value={aiStudioData.predictionText}
                  onChange={(e) => setAiStudioData({ ...aiStudioData, predictionText: e.target.value })}
                  className="w-full bg-zinc-900 border border-zinc-750 rounded-xl p-3 text-xs text-zinc-200 font-sans leading-relaxed focus:outline-none focus:border-cyan-500"
                  placeholder="Gere ou escreva a análise do jogo..."
                />
              </div>
            </div>

            {/* ACTION BUTTONS TOOLBAR */}
            <div className="border-t border-zinc-800 pt-4 flex flex-col sm:flex-row items-center justify-between gap-3 flex-wrap">
              <button
                type="button"
                disabled={generatingAiId === aiStudioMatch.id}
                onClick={() => handleGenerateAiInStudio()}
                className="w-full sm:w-auto px-4 py-2.5 bg-zinc-800 hover:bg-zinc-750 text-cyan-300 border border-cyan-500/40 rounded-xl font-extrabold text-xs uppercase tracking-wider transition-all cursor-pointer inline-flex items-center justify-center gap-2 hover:scale-105 active:scale-95 disabled:opacity-50"
              >
                <span>⚡</span>
                <span>Recalcular com Gemini IA</span>
              </button>

              <div className="flex items-center gap-2.5 w-full sm:w-auto flex-wrap justify-end">
                <button
                  type="button"
                  onClick={handleSendStudioToPredictions}
                  className="w-full sm:w-auto px-5 py-2.5 bg-gradient-to-r from-cyan-500 to-blue-600 hover:from-cyan-400 hover:to-blue-500 text-black font-black text-xs uppercase tracking-wider rounded-xl shadow-lg shadow-cyan-500/20 transition-all cursor-pointer inline-flex items-center justify-center gap-2 hover:scale-105 active:scale-95"
                >
                  <span>📥</span>
                  <span>Enviar para Prognósticos</span>
                </button>

                <button
                  type="button"
                  onClick={handleSendStudioToMainHero}
                  className="w-full sm:w-auto px-5 py-2.5 bg-gradient-to-r from-amber-500 to-orange-500 hover:from-amber-400 hover:to-orange-400 text-black font-black text-xs uppercase tracking-wider rounded-xl shadow-lg shadow-amber-500/20 transition-all cursor-pointer inline-flex items-center justify-center gap-2 hover:scale-105 active:scale-95"
                >
                  <span>🌟</span>
                  <span>Enviar para Tela Principal</span>
                </button>
              </div>
            </div>

          </div>
        </div>
      )}

    </div>
  );
}
