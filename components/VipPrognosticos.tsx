import React, { useState, useEffect } from 'react';
import { 
  TrendingUp, Plus, Trash2, Edit3, Check, Calendar, 
  Award, AlertCircle, X, ChevronDown, ChevronUp, Search, Sparkles, Clock, AlertTriangle, ShieldCheck
} from 'lucide-react';
import { 
  Prognostico, getPrognosticosFromFirebase, savePrognosticoToFirebase, deletePrognosticoFromFirebase 
} from '../services/firebase';

interface VipPrognosticosProps {
  language: string;
  currentUser: any;
  userPlan: string;
}

const DEFAULT_SEEDS: Prognostico[] = [
  {
    id: 'seed_belgica_senegal',
    gameName: 'Bélgica vs Senegal',
    sport: 'Futebol',
    competition: 'Mundial 2026 - Round of 32',
    date: '2026-07-01T21:00:00',
    status: 'Agendado',
    suggestedMarket: 'Ambas Equipas Marcam? Sim',
    odd: 1.96,
    suggestionText: 'Ambas as equipas marcam golo na partida (BTTS - Sim)',
    analysisText: 'O cenário mais provável para este desafio será a existência de alguns golos. É expectável que o jogo seja comandado pela seleção da Bélgica, todavia, o Senegal revela argumentos mais do que suficientes para conseguir levar perigo à defensiva adversária.\n\nDe salientar que ambos os países usufruem de jogadores bastante velozes nos seus setores mais avançados (como Jérémy Doku e Romelu Lukaku na Bélgica, Nicolas Jackson e Sadio Mané no Senegal), perfeitamente capazes de desbloquear a partida a qualquer momento através de lances individuais. Desta forma, espera-se um encontro intensamente disputado, com o surgimento de oportunidades de golo perto das duas balizas.',
    homeTeamLogo: '🇧🇪',
    awayTeamLogo: '🇸🇳'
  },
  {
    id: 'seed_inglaterra_congo',
    gameName: 'Inglaterra vs Congo RD',
    sport: 'Futebol',
    competition: 'Mundial 2026 - Round of 32',
    date: '2026-07-01T17:00:00',
    status: 'Agendado',
    suggestedMarket: 'Vitória da Inglaterra (1X2)',
    odd: 1.45,
    suggestionText: 'Vitória seca da Inglaterra nos 90 minutos regulamentares',
    analysisText: 'A seleção da Inglaterra entra nesta fase como favorita absoluta devido ao seu excelente desempenho defensivo e profundidade do plantel. O Congo RD tentará fechar os blocos defensivos num bloco extremamente baixo e estreito, mas a largura criativa inglesa e a qualidade individual deverão desbloquear o jogo na segunda parte.\n\nExcelente oportunidade para apostar a favor da vitória seca ou em mercados de Handicap -1 a favor da Inglaterra, uma vez que o Congo RD apresenta fadiga acumulada do último encontro do grupo.',
    homeTeamLogo: '🏴󠁧󠁢󠁥󠁮󠁧󠁿',
    awayTeamLogo: '🇨🇩'
  },
  {
    id: 'seed_mexico_equador',
    gameName: 'México vs Equador',
    sport: 'Futebol',
    competition: 'Mundial 2026 - Grupo B',
    date: '2026-07-01T03:00:00',
    status: 'Terminado',
    result: '2 - 0',
    isGreen: true,
    suggestedMarket: 'Vitória do México (1X2)',
    odd: 2.10,
    suggestionText: 'Vitória seca do México a jogar em casa/estádio favorável',
    analysisText: 'O México joga com forte apoio do público e grande intensidade nos minutos iniciais. O Equador tentou explorar contra-ataques mas a eficácia defensiva mexicana neutralizou os extremos equatorianos.\n\nResultado excelente de 2 a 0 com green absoluto para a nossa comunidade VIP! Ambas as linhas táticas foram cumpridas na perfeição.',
    homeTeamLogo: '🇲🇽',
    awayTeamLogo: '🇪🇨'
  },
  {
    id: 'seed_portugal_croacia',
    gameName: 'Portugal vs Croácia',
    sport: 'Futebol',
    competition: 'Mundial 2026 - Oitavos de Final',
    date: '2026-07-03T00:00:00',
    status: 'Agendado',
    suggestedMarket: 'Mais de 2.5 Golos (Over 2.5)',
    odd: 1.85,
    suggestionText: 'Mais de 2.5 golos no tempo regulamentar',
    analysisText: 'Este será um dos jogos mais espetaculares dos oitavos de final. Ambas as seleções têm enorme poder ofensivo (Portugal com Bruno Fernandes e Rafael Leão, Croácia com Modric e Kramaric) e alguma vulnerabilidade defensiva em transições rápidas.\n\nO histórico de confrontos sugere um jogo aberto, onde nenhuma das equipas se contentará em defender o empate. Esperamos pelo menos 3 golos.',
    homeTeamLogo: '🇵🇹',
    awayTeamLogo: '🇭🇷'
  }
];

export const VipPrognosticos: React.FC<VipPrognosticosProps> = ({ language, currentUser, userPlan }) => {
  const [prognosticos, setPrognosticos] = useState<Prognostico[]>([]);
  const [loading, setLoading] = useState(true);
  const [expandedId, setExpandedId] = useState<string | null>('seed_belgica_senegal');
  const [searchQuery, setSearchQuery] = useState('');
  
  // Admin Form States
  const [showAddModal, setShowAddModal] = useState(false);
  const [editingProg, setEditingProg] = useState<Prognostico | null>(null);
  
  const [formGameName, setFormGameName] = useState('');
  const [formSport, setFormSport] = useState('Futebol');
  const [formCompetition, setFormCompetition] = useState('Mundial 2026');
  const [formDate, setFormDate] = useState('');
  const [formStatus, setFormStatus] = useState<'Agendado' | 'Terminado' | 'Cancelado'>('Agendado');
  const [formSuggestedMarket, setFormSuggestedMarket] = useState('');
  const [formOdd, setFormOdd] = useState('1.80');
  const [formResult, setFormResult] = useState('');
  const [formIsGreen, setFormIsGreen] = useState<string>('pending'); // 'pending', 'green', 'red'
  const [formSuggestionText, setFormSuggestionText] = useState('');
  const [formAnalysisText, setFormAnalysisText] = useState('');
  const [formHomeLogo, setFormHomeLogo] = useState('⚽');
  const [formAwayLogo, setFormAwayLogo] = useState('⚽');

  const isAdmin = currentUser?.email === 'morgado.aam@gmail.com';

  useEffect(() => {
    loadPrognosticos();
  }, []);

  const loadPrognosticos = async () => {
    setLoading(true);
    try {
      const dbList = await getPrognosticosFromFirebase();
      if (dbList) {
        setPrognosticos(dbList);
      } else {
        setPrognosticos([]);
      }
    } catch (err) {
      console.error('Error loading predictions:', err);
      setPrognosticos([]);
    } finally {
      setLoading(false);
    }
  };

  const handleOpenAddModal = () => {
    setEditingProg(null);
    setFormGameName('');
    setFormSport('Futebol');
    setFormCompetition('Mundial 2026');
    setFormDate(new Date().toISOString().substring(0, 16));
    setFormStatus('Agendado');
    setFormSuggestedMarket('');
    setFormOdd('1.80');
    setFormResult('');
    setFormIsGreen('pending');
    setFormSuggestionText('');
    setFormAnalysisText('');
    setFormHomeLogo('⚽');
    setFormAwayLogo('⚽');
    setShowAddModal(true);
  };

  const handleOpenEditModal = (prog: Prognostico) => {
    setEditingProg(prog);
    setFormGameName(prog.gameName);
    setFormSport(prog.sport);
    setFormCompetition(prog.competition);
    setFormDate(prog.date.substring(0, 16));
    setFormStatus(prog.status);
    setFormSuggestedMarket(prog.suggestedMarket);
    setFormOdd(prog.odd.toString());
    setFormResult(prog.result || '');
    setFormIsGreen(prog.isGreen === true ? 'green' : prog.isGreen === false ? 'red' : 'pending');
    setFormSuggestionText(prog.suggestionText);
    setFormAnalysisText(prog.analysisText);
    setFormHomeLogo(prog.homeTeamLogo || '⚽');
    setFormAwayLogo(prog.awayTeamLogo || '⚽');
    setShowAddModal(true);
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formGameName.trim() || !formSuggestedMarket.trim() || !formAnalysisText.trim()) {
      alert('Por favor preencha todos os campos obrigatórios!');
      return;
    }

    const item: Prognostico = {
      id: editingProg ? editingProg.id : `prog_${Date.now()}`,
      gameName: formGameName,
      sport: formSport,
      competition: formCompetition,
      date: formDate,
      status: formStatus,
      suggestedMarket: formSuggestedMarket,
      odd: parseFloat(formOdd) || 1.80,
      suggestionText: formSuggestionText,
      analysisText: formAnalysisText,
      homeTeamLogo: formHomeLogo,
      awayTeamLogo: formAwayLogo,
      result: formResult || undefined,
      isGreen: formIsGreen === 'green' ? true : formIsGreen === 'red' ? false : null
    };

    try {
      await savePrognosticoToFirebase(item);
      alert('Prognóstico guardado com sucesso!');
      setShowAddModal(false);
      loadPrognosticos();
    } catch (err) {
      alert('Erro ao guardar prognóstico.');
    }
  };

  const handleDelete = async (id: string) => {
    if (!window.confirm('Tem a certeza que deseja eliminar este prognóstico premium?')) {
      return;
    }
    try {
      await deletePrognosticoFromFirebase(id);
      alert('Prognóstico removido com sucesso!');
      loadPrognosticos();
    } catch (err) {
      alert('Erro ao remover do Firestore.');
    }
  };

  const toggleExpand = (id: string) => {
    setExpandedId(expandedId === id ? null : id);
  };

  const filteredPrognosticos = prognosticos.filter(p => 
    p.gameName.toLowerCase().includes(searchQuery.toLowerCase()) ||
    p.competition.toLowerCase().includes(searchQuery.toLowerCase()) ||
    p.suggestedMarket.toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <div className="space-y-6 font-sans">
      
      {/* Intro info banner explaining strategic shifts */}
      <div className="bg-gradient-to-r from-[#111115] to-[#16161D] border border-zinc-850 rounded-2xl p-5 sm:p-6 shadow-xl flex flex-col md:flex-row items-start md:items-center justify-between gap-5 text-left">
        <div className="space-y-2 max-w-2xl">
          <div className="flex items-center gap-2">
            <span className="text-xs font-bold text-amber-500 bg-amber-500/10 px-2 py-0.5 rounded border border-amber-500/10 font-mono uppercase tracking-wider">
              ✨ Estratégia Inteligente iRunBets
            </span>
            <span className="h-2 w-2 rounded-full bg-emerald-500 animate-pulse"></span>
          </div>
          <h3 className="text-base sm:text-lg font-black text-white uppercase tracking-tight font-display">
            🎯 Prognósticos & Tips Premium (Hoje)
          </h3>
          <p className="text-xs text-zinc-400 font-light leading-relaxed">
            Para <strong>proteger o sistema contra custos operacionais excessivos</strong> de IA dinâmica e seguir as melhores práticas internacionais (como a prestigiada <em>Academia das Apostas</em>), oferecemos prognósticos cuidadosamente elaborados e pré-calculados. Pode ver análises completas preparadas pelos nossos especialistas e IA sem gastar os seus créditos de análise em direto!
          </p>
        </div>
        
        {isAdmin && (
          <button
            type="button"
            onClick={handleOpenAddModal}
            className="w-full md:w-auto px-5 py-3 bg-gradient-to-r from-amber-500 to-orange-550 hover:from-amber-600 hover:to-orange-600 text-white font-mono text-xs font-black uppercase tracking-widest rounded-xl transition-all shadow-lg shadow-orange-500/5 hover:scale-[1.01] active:scale-95 flex items-center justify-center gap-1.5"
          >
            <Plus size={15} />
            <span>Criar Prognóstico Premium</span>
          </button>
        )}
      </div>

      {/* Main filter & list card workspace */}
      <div className="bg-[#0E0E12] border border-zinc-850 rounded-2xl p-4 sm:p-6 shadow-2xl space-y-5 text-left">
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3 border-b border-zinc-900 pb-4">
          <div className="space-y-1">
            <h4 className="text-xs font-black text-white uppercase tracking-widest font-mono">
              ⚽ Lista de Prognósticos Ativos
            </h4>
            <p className="text-[10px] text-zinc-500">
              Clique em qualquer jogo para expandir e ler a análise tática completa.
            </p>
          </div>
          
          {/* Search Input */}
          <div className="relative w-full sm:w-64">
            <Search className="absolute left-3 top-2.5 text-zinc-650" size={14} />
            <input
              type="text"
              placeholder={language === 'pt' ? 'Pesquisar jogo ou mercado...' : 'Search match or market...'}
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full bg-zinc-950 border border-zinc-850 rounded-xl pl-9 pr-4 py-2 text-xs font-mono text-zinc-300 focus:outline-none focus:border-amber-500/50 transition-colors"
            />
          </div>
        </div>

        {loading ? (
          <div className="py-16 text-center space-y-3">
            <div className="h-8 w-8 border-2 border-amber-500 border-t-transparent rounded-full animate-spin mx-auto"></div>
            <p className="text-xs text-zinc-500 font-mono">A ler prognósticos premium do Firestore...</p>
          </div>
        ) : filteredPrognosticos.length === 0 ? (
          <div className="py-16 text-center text-xs text-zinc-500 bg-zinc-950/20 rounded-xl border border-dashed border-zinc-850">
            Nenhum prognóstico premium encontrado para os critérios de pesquisa.
          </div>
        ) : (
          <div className="space-y-3.5">
            {filteredPrognosticos.map((prog) => {
              const isExpanded = expandedId === prog.id;
              const isPending = prog.status === 'Agendado';
              const formattedDate = new Date(prog.date).toLocaleDateString(language === 'pt' ? 'pt-PT' : 'en-US', {
                day: '2-digit',
                month: '2-digit',
                year: 'numeric',
                hour: '2-digit',
                minute: '2-digit'
              });

              return (
                <div 
                  key={prog.id}
                  className={`border rounded-2xl overflow-hidden transition-all duration-300 ${
                    isExpanded 
                      ? 'bg-zinc-950/60 border-zinc-800' 
                      : 'bg-zinc-950/20 border-zinc-900 hover:border-zinc-800'
                  }`}
                >
                  {/* Card Header (always visible) */}
                  <div 
                    onClick={() => toggleExpand(prog.id)}
                    className="p-4 sm:p-5 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 cursor-pointer select-none"
                  >
                    <div className="flex items-center gap-4.5 w-full sm:w-auto">
                      {/* Logos / Avatars */}
                      <div className="flex items-center justify-center gap-1 bg-[#121216] border border-zinc-850/80 p-2 rounded-xl h-12 w-20 relative shrink-0">
                        <span className="text-xl filter drop-shadow-[0_2px_4px_rgba(0,0,0,0.5)]">{prog.homeTeamLogo || '⚽'}</span>
                        <span className="text-[10px] text-zinc-600 font-bold font-mono">VS</span>
                        <span className="text-xl filter drop-shadow-[0_2px_4px_rgba(0,0,0,0.5)]">{prog.awayTeamLogo || '⚽'}</span>
                      </div>

                      {/* Competition & Names */}
                      <div className="space-y-1 text-left min-w-0">
                        <span className="text-[9px] font-black uppercase text-amber-500 tracking-wider font-mono block">
                          🏆 {prog.competition}
                        </span>
                        <h4 className="text-sm font-black text-white font-display truncate">
                          {prog.gameName}
                        </h4>
                        <div className="flex items-center gap-2 text-[10px] text-zinc-500 font-mono">
                          <Calendar size={11} className="text-zinc-600" />
                          <span>{formattedDate}</span>
                          
                          {/* Match status badge */}
                          {prog.status === 'Terminado' ? (
                            <span className="bg-zinc-900 border border-zinc-800 text-zinc-400 px-1.5 py-0.2 rounded text-[8px] font-bold">
                              TERMINADO ({prog.result || 'FT'})
                            </span>
                          ) : prog.status === 'Cancelado' ? (
                            <span className="bg-rose-500/10 border border-rose-500/20 text-rose-450 px-1.5 py-0.2 rounded text-[8px] font-bold">
                              CANCELADO
                            </span>
                          ) : (
                            <span className="bg-emerald-500/10 border border-emerald-500/20 text-emerald-450 px-1.5 py-0.2 rounded text-[8px] font-bold flex items-center gap-1">
                              <span className="h-1 w-1 rounded-full bg-emerald-400 animate-pulse"></span>
                              AGENDADO
                            </span>
                          )}
                        </div>
                      </div>
                    </div>

                    {/* Suggested prediction right workspace */}
                    <div className="flex items-center justify-between sm:justify-end gap-3.5 w-full sm:w-auto border-t sm:border-t-0 border-zinc-900 pt-3 sm:pt-0 shrink-0">
                      
                      {/* Suggestion & Odd Display */}
                      <div className="text-left sm:text-right space-y-1">
                        <span className="text-[8px] font-bold text-zinc-500 uppercase tracking-widest font-mono block">
                          🎯 MERCADO RECOMENDADO
                        </span>
                        <div className="flex items-center gap-2">
                          <span className="text-[11.5px] font-black text-zinc-100 bg-zinc-900 px-2 py-1 rounded-md border border-zinc-850 font-mono">
                            {prog.suggestedMarket}
                          </span>
                          <span className="text-xs font-black text-black bg-amber-450 px-2.5 py-1 rounded-md font-mono shadow-md">
                            @{prog.odd.toFixed(2)}
                          </span>
                        </div>
                      </div>

                      {/* Green/Red Result Marker */}
                      {prog.status === 'Terminado' && prog.isGreen !== undefined && (
                        <div className="shrink-0">
                          {prog.isGreen === true ? (
                            <span className="bg-emerald-500/10 border border-emerald-500/30 text-emerald-400 px-3 py-1.5 rounded-xl font-mono font-black text-xs uppercase flex items-center gap-1 shadow-lg shadow-emerald-500/5">
                              <span>✅</span>
                              <span>GREEN</span>
                            </span>
                          ) : prog.isGreen === false ? (
                            <span className="bg-rose-500/10 border border-rose-500/30 text-rose-450 px-3 py-1.5 rounded-xl font-mono font-black text-xs uppercase flex items-center gap-1">
                              <span>❌</span>
                              <span>RED</span>
                            </span>
                          ) : (
                            <span className="bg-zinc-900 border border-zinc-800 text-zinc-500 px-3 py-1.5 rounded-xl font-mono font-black text-xs uppercase">
                              REVOLVIDA
                            </span>
                          )}
                        </div>
                      )}

                      {/* Expand Chevron Icon */}
                      <div className="text-zinc-600 hover:text-zinc-400 transition-colors hidden sm:block">
                        {isExpanded ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
                      </div>
                    </div>
                  </div>

                  {/* Expanded written analysis section */}
                  {isExpanded && (
                    <div className="border-t border-zinc-900 p-4 sm:p-5 bg-zinc-950/40 text-xs leading-relaxed text-zinc-300 font-sans space-y-4">
                      
                      {/* Market direct prompt summary */}
                      <div className="bg-zinc-950 border border-zinc-850 rounded-xl p-3 sm:p-4 flex items-start gap-3">
                        <span className="text-2xl filter drop-shadow-md shrink-0">💡</span>
                        <div className="space-y-1">
                          <span className="text-[9px] font-bold text-zinc-500 font-mono uppercase tracking-widest block">
                            SUGESTÃO DO EDITOR:
                          </span>
                          <p className="text-xs font-extrabold text-white">
                            {prog.suggestionText || prog.suggestedMarket}
                          </p>
                          <p className="text-[10px] text-zinc-450 leading-relaxed font-light">
                            Odd recomendada de <strong>@{prog.odd.toFixed(2)}</strong>. Jogue sempre com responsabilidade e controle emocional de banca de acordo com o seu perfil VIP.
                          </p>
                        </div>
                      </div>

                      {/* Detailed Written Analysis */}
                      <div className="space-y-2.5">
                        <span className="text-[10px] font-bold text-zinc-450 uppercase tracking-widest font-mono flex items-center gap-1.5">
                          <span>📋</span>
                          <span>Análise Tática e Previsão Baseada em Dados</span>
                        </span>
                        
                        <div className="bg-zinc-950/70 border border-zinc-900/60 p-4 rounded-xl text-zinc-300 font-sans space-y-3 whitespace-pre-line text-left leading-relaxed">
                          {prog.analysisText}
                        </div>
                      </div>

                      {/* Extra Action Buttons */}
                      <div className="flex flex-wrap items-center justify-between gap-3 pt-2.5 border-t border-zinc-900">
                        <div className="flex gap-2">
                          <button
                            type="button"
                            onClick={() => {
                              // Trigger custom event to simulate this specific match in calculations
                              const simEvent = new CustomEvent('vip_simulate_match', {
                                detail: {
                                  gameName: prog.gameName,
                                  homeLogo: prog.homeTeamLogo,
                                  awayLogo: prog.awayTeamLogo,
                                  odd: prog.odd,
                                  competition: prog.competition
                                }
                              });
                              window.dispatchEvent(simEvent);
                              alert('Partida carregada com sucesso no Simulador Matemático de Probabilidades! Vá à aba "Análise de JOGOS" para ver.');
                            }}
                            className="bg-zinc-900 border border-zinc-800 hover:border-zinc-700 text-zinc-300 px-3.5 py-2 rounded-xl font-mono text-[10px] font-bold uppercase transition-all cursor-pointer flex items-center gap-1.5 hover:text-white"
                          >
                            <span>🧮</span>
                            <span>Simular no Algoritmo</span>
                          </button>
                        </div>

                        {isAdmin && (
                          <div className="flex gap-2.5">
                            <button
                              type="button"
                              onClick={() => handleOpenEditModal(prog)}
                              className="bg-cyan-500/10 hover:bg-cyan-500/20 border border-cyan-500/30 text-cyan-400 px-3 py-1.5 rounded-xl font-mono text-[9px] font-extrabold uppercase transition-all cursor-pointer flex items-center gap-1"
                            >
                              <Edit3 size={12} />
                              <span>Editar</span>
                            </button>
                            <button
                              type="button"
                              onClick={() => handleDelete(prog.id)}
                              className="bg-rose-500/10 hover:bg-rose-500/20 border border-rose-500/30 text-rose-450 px-3 py-1.5 rounded-xl font-mono text-[9px] font-extrabold uppercase transition-all cursor-pointer flex items-center gap-1"
                            >
                              <Trash2 size={12} />
                              <span>Apagar</span>
                            </button>
                          </div>
                        )}
                      </div>

                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Admin Creation/Editing Modal Dialog */}
      {showAddModal && (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-sm z-50 flex items-center justify-center p-4 overflow-y-auto">
          <div className="bg-[#0D0D11] border border-zinc-850 rounded-2xl w-full max-w-2xl overflow-hidden shadow-2xl animate-scale-up text-left flex flex-col my-8">
            <div className="p-5 border-b border-zinc-900 flex justify-between items-center bg-zinc-950">
              <div className="space-y-1">
                <span className="text-[9px] font-bold font-mono uppercase tracking-widest text-amber-500">
                  {editingProg ? '🛠️ Editar Entrada' : '➕ Novo Registo'}
                </span>
                <h3 className="text-base font-black text-white uppercase tracking-tight font-display">
                  {editingProg ? 'Editar Prognóstico Premium' : 'Criar Novo Prognóstico Premium'}
                </h3>
              </div>
              <button 
                onClick={() => setShowAddModal(false)}
                className="p-1 text-zinc-500 hover:text-white rounded bg-zinc-900 border border-zinc-800 transition-colors"
              >
                <X size={15} />
              </button>
            </div>

            <form onSubmit={handleSave} className="p-6 space-y-4 overflow-y-auto max-h-[70vh] font-sans text-xs">
              
              {/* Game Names & Sport */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <label className="block text-[10px] font-bold text-zinc-400 uppercase tracking-wider font-mono">
                    Nome do Jogo / Confronto *
                  </label>
                  <input
                    type="text"
                    required
                    value={formGameName}
                    onChange={(e) => setFormGameName(e.target.value)}
                    placeholder="Ex: Bélgica vs Senegal"
                    className="w-full bg-zinc-950 border border-zinc-850 rounded-lg px-3 py-2 text-zinc-100 focus:outline-none focus:border-amber-500"
                  />
                </div>
                <div className="grid grid-cols-2 gap-2">
                  <div className="space-y-1.5">
                    <label className="block text-[10px] font-bold text-zinc-400 uppercase tracking-wider font-mono">
                      Desporto
                    </label>
                    <input
                      type="text"
                      value={formSport}
                      onChange={(e) => setFormSport(e.target.value)}
                      placeholder="Futebol"
                      className="w-full bg-zinc-950 border border-zinc-850 rounded-lg px-3 py-2 text-zinc-100 focus:outline-none"
                    />
                  </div>
                  <div className="space-y-1.5">
                    <label className="block text-[10px] font-bold text-zinc-400 uppercase tracking-wider font-mono">
                      Competição
                    </label>
                    <input
                      type="text"
                      value={formCompetition}
                      onChange={(e) => setFormCompetition(e.target.value)}
                      placeholder="Mundial 2026"
                      className="w-full bg-zinc-950 border border-zinc-850 rounded-lg px-3 py-2 text-zinc-100 focus:outline-none"
                    />
                  </div>
                </div>
              </div>

              {/* Date, Status, Logos */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="grid grid-cols-2 gap-2">
                  <div className="space-y-1.5">
                    <label className="block text-[10px] font-bold text-zinc-400 uppercase tracking-wider font-mono">
                      Data & Hora *
                    </label>
                    <input
                      type="datetime-local"
                      required
                      value={formDate}
                      onChange={(e) => setFormDate(e.target.value)}
                      className="w-full bg-zinc-950 border border-zinc-850 rounded-lg px-3 py-2 text-zinc-100 focus:outline-none focus:border-amber-500 font-mono text-[11px]"
                    />
                  </div>
                  <div className="space-y-1.5">
                    <label className="block text-[10px] font-bold text-zinc-400 uppercase tracking-wider font-mono">
                      Estado do Jogo
                    </label>
                    <select
                      value={formStatus}
                      onChange={(e) => setFormStatus(e.target.value as any)}
                      className="w-full bg-zinc-950 border border-zinc-850 rounded-lg px-3 py-2 text-zinc-100 focus:outline-none"
                    >
                      <option value="Agendado">Agendado</option>
                      <option value="Terminado">Terminado</option>
                      <option value="Cancelado">Cancelado</option>
                    </select>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-2">
                  <div className="space-y-1.5">
                    <label className="block text-[10px] font-bold text-zinc-400 uppercase tracking-wider font-mono">
                      Emblema Visitado (Emoji)
                    </label>
                    <input
                      type="text"
                      value={formHomeLogo}
                      onChange={(e) => setFormHomeLogo(e.target.value)}
                      placeholder="🇧🇪"
                      className="w-full bg-zinc-950 border border-zinc-850 rounded-lg px-3 py-2 text-zinc-100 focus:outline-none text-center text-lg"
                    />
                  </div>
                  <div className="space-y-1.5">
                    <label className="block text-[10px] font-bold text-zinc-400 uppercase tracking-wider font-mono">
                      Emblema Visitante (Emoji)
                    </label>
                    <input
                      type="text"
                      value={formAwayLogo}
                      onChange={(e) => setFormAwayLogo(e.target.value)}
                      placeholder="🇸🇳"
                      className="w-full bg-zinc-950 border border-zinc-850 rounded-lg px-3 py-2 text-zinc-100 focus:outline-none text-center text-lg"
                    />
                  </div>
                </div>
              </div>

              {/* Markets, Odds, Result, Greens */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <div className="space-y-1.5">
                  <label className="block text-[10px] font-bold text-zinc-400 uppercase tracking-wider font-mono">
                    Mercado Recomendado *
                  </label>
                  <input
                    type="text"
                    required
                    value={formSuggestedMarket}
                    onChange={(e) => setFormSuggestedMarket(e.target.value)}
                    placeholder="Ambas marcam? Sim"
                    className="w-full bg-zinc-950 border border-zinc-850 rounded-lg px-3 py-2 text-zinc-100 focus:outline-none"
                  />
                </div>
                <div className="grid grid-cols-2 gap-2 col-span-2">
                  <div className="space-y-1.5">
                    <label className="block text-[10px] font-bold text-zinc-400 uppercase tracking-wider font-mono">
                      Odd Mínima Recomendada
                    </label>
                    <input
                      type="number"
                      step="0.01"
                      required
                      value={formOdd}
                      onChange={(e) => setFormOdd(e.target.value)}
                      className="w-full bg-zinc-950 border border-zinc-850 rounded-lg px-3 py-2 text-zinc-100 focus:outline-none font-mono"
                    />
                  </div>
                  <div className="space-y-1.5">
                    <label className="block text-[10px] font-bold text-zinc-400 uppercase tracking-wider font-mono">
                      Resultado Final (Opcional)
                    </label>
                    <input
                      type="text"
                      value={formResult}
                      onChange={(e) => setFormResult(e.target.value)}
                      placeholder="2 - 0"
                      className="w-full bg-zinc-950 border border-zinc-850 rounded-lg px-3 py-2 text-zinc-100 focus:outline-none font-mono"
                    />
                  </div>
                </div>
              </div>

              {/* Result state tracker */}
              <div className="space-y-1.5">
                <label className="block text-[10px] font-bold text-zinc-400 uppercase tracking-wider font-mono">
                  Sinalização de Desfecho
                </label>
                <div className="flex gap-2">
                  {[
                    { id: 'pending', label: 'Pendente (Em Aberto) ⏳' },
                    { id: 'green', label: 'Resolvida como GREEN ✅' },
                    { id: 'red', label: 'Resolvida como RED ❌' }
                  ].map((item) => (
                    <button
                      key={item.id}
                      type="button"
                      onClick={() => setFormIsGreen(item.id)}
                      className={`flex-1 py-2 rounded-xl border text-[10px] font-mono font-bold uppercase transition-all cursor-pointer ${
                        formIsGreen === item.id
                          ? item.id === 'green'
                            ? 'bg-emerald-500/10 border-emerald-500 text-emerald-400'
                            : item.id === 'red'
                              ? 'bg-rose-500/10 border-rose-500 text-rose-450'
                              : 'bg-zinc-900 border-zinc-750 text-zinc-200'
                          : 'bg-[#121216] border-zinc-850 text-zinc-550'
                      }`}
                    >
                      {item.label}
                    </button>
                  ))}
                </div>
              </div>

              {/* Short summary text */}
              <div className="space-y-1.5">
                <label className="block text-[10px] font-bold text-zinc-400 uppercase tracking-wider font-mono">
                  Sugestão Direta do Editor (Uma Frase Chamativa)
                </label>
                <input
                  type="text"
                  value={formSuggestionText}
                  onChange={(e) => setFormSuggestionText(e.target.value)}
                  placeholder="Ex: Ambas as equipas marcam golo na partida (BTTS - Sim)"
                  className="w-full bg-zinc-950 border border-zinc-850 rounded-lg px-3 py-2 text-zinc-100 focus:outline-none"
                />
              </div>

              {/* Long written analysis text */}
              <div className="space-y-1.5">
                <label className="block text-[10px] font-bold text-zinc-400 uppercase tracking-wider font-mono">
                  Análise Tática Completa *
                </label>
                <textarea
                  required
                  rows={6}
                  value={formAnalysisText}
                  onChange={(e) => setFormAnalysisText(e.target.value)}
                  placeholder="Escreva a análise fundamentada do jogo aqui. Pode incluir estatísticas de xG, baixas das equipas, e histórico recente de confrontos..."
                  className="w-full bg-zinc-950 border border-zinc-850 rounded-lg px-3 py-2 text-zinc-100 focus:outline-none leading-relaxed font-sans"
                />
              </div>

              {/* Form submit button */}
              <div className="pt-4 flex gap-3.5 border-t border-zinc-900">
                <button
                  type="button"
                  onClick={() => setShowAddModal(false)}
                  className="flex-1 py-3 bg-zinc-900 hover:bg-zinc-800 text-zinc-400 hover:text-white rounded-xl transition-all cursor-pointer text-center uppercase tracking-widest font-mono text-[10px] font-bold"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  className="flex-1 py-3 bg-gradient-to-r from-amber-500 to-orange-550 hover:from-amber-600 hover:to-orange-600 text-white rounded-xl transition-all cursor-pointer text-center uppercase tracking-widest font-mono text-[10px] font-bold shadow-lg"
                >
                  Guardar Prognóstico
                </button>
              </div>

            </form>
          </div>
        </div>
      )}

    </div>
  );
};
