import React, { useState, useEffect } from 'react';
import { 
  getApisExcelConfig, 
  saveApisExcelConfig, 
  DEFAULT_APIS_EXCEL_CONFIG,
  ApisExcelConfig, 
  ApisExcelPlan,
  ApisExcelAnalysisImage,
  ApisExcelSubscriptionRequest,
  ApisExcelNewsletter,
  incrementExcelDownloadCount,
  addNewsletterLog,
  deleteSubscription,
  updateSubscriptionStatus,
  addSubscriptionRequest
} from '../services/apisExcelConfig';

export const BackofficeApisExcelTab: React.FC = () => {
  const [config, setConfig] = useState<ApisExcelConfig>(getApisExcelConfig());
  const [activeSubTab, setActiveSubTab] = useState<'dashboard' | 'newsletters' | 'banners' | 'showcase' | 'plans' | 'excel'>('dashboard');
  const [saveToast, setSaveToast] = useState<string | null>(null);

  // Subscribers & Dashboard Filter states
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedPlanFilter, setSelectedPlanFilter] = useState('ALL');
  const [copiedEmailId, setCopiedEmailId] = useState<string | null>(null);
  const [copiedAllEmails, setCopiedAllEmails] = useState(false);
  const [editingDownloads, setEditingDownloads] = useState(false);
  const [downloadsInputValue, setDownloadsInputValue] = useState<number>(config.stats?.excelDownloads ?? 14);

  // Add Subscriber Modal State
  const [showAddSubModal, setShowAddSubModal] = useState(false);
  const [newSubName, setNewSubName] = useState('');
  const [newSubEmail, setNewSubEmail] = useState('');
  const [newSubPlanCode, setNewSubPlanCode] = useState('PRO_MAX');

  // Newsletter Sender State
  const [newsletterSubject, setNewsletterSubject] = useState('Atualização Importante: Nova Folha Excel & Modelos Estatísticos 2026');
  const [newsletterBody, setNewsletterBody] = useState(
`Olá {nome},

Temos o prazer de anunciar uma nova atualização na plataforma iRunBets!

O que há de novo:
• Nova versão da Folha Excel com fórmulas automáticas de Poisson e Expected Value (+EV).
• Novas ligas europeias e mundiais adicionadas ao modelo preditivo.
• Chaves de API de alta velocidade com menor latência para integração.

Poderá descarregar a versão mais recente e consultar a sua Chave de API acedendo ao menu "Dados Estatísticos" no nosso portal.

Se tiver qualquer dúvida, responda diretamente a este email.

Com os melhores cumprimentos,
Equipa iRunBets`
  );
  const [newsletterTarget, setNewsletterTarget] = useState<'ALL' | 'PRO_MAX' | 'PRO' | 'FREE' | 'VIP'>('ALL');
  const [isSendingNewsletter, setIsSendingNewsletter] = useState(false);
  const [newsletterFeedback, setNewsletterFeedback] = useState<string | null>(null);

  useEffect(() => {
    const loaded = getApisExcelConfig();
    setConfig(loaded);
    setDownloadsInputValue(loaded.stats?.excelDownloads ?? 14);
  }, []);

  const handleSave = () => {
    saveApisExcelConfig(config);
    setSaveToast('✓ Alterações guardadas e publicadas com sucesso!');
    setTimeout(() => setSaveToast(null), 4000);
  };

  // Plan editing helper
  const handleUpdatePlan = (index: number, field: keyof ApisExcelPlan, value: any) => {
    const updated = [...config.plans];
    updated[index] = { ...updated[index], [field]: value };
    setConfig(prev => ({ ...prev, plans: updated }));
  };

  // Features editing helper
  const handleUpdateFeatures = (index: number, rawText: string) => {
    const feats = rawText.split('\n').filter(line => line.trim().length > 0);
    handleUpdatePlan(index, 'features', feats);
  };

  // Image editing helper
  const handleUpdateImage = (index: number, field: keyof ApisExcelAnalysisImage, value: string) => {
    const updated = [...config.showcaseImages];
    updated[index] = { ...updated[index], [field]: value };
    setConfig(prev => ({ ...prev, showcaseImages: updated }));
  };

  const handleAddImage = () => {
    const newImg: ApisExcelAnalysisImage = {
      id: 'img-' + Date.now(),
      title: 'Nova Análise Estatística',
      subtitle: 'Descrição detalhada dos dados e modelo quantitativo',
      url: 'https://images.unsplash.com/photo-1551288049-bebda4e38f71?auto=format&fit=crop&w=1000&q=80',
      tag: 'Análise'
    };
    setConfig(prev => ({ ...prev, showcaseImages: [...prev.showcaseImages, newImg] }));
  };

  const handleRemoveImage = (index: number) => {
    if (config.showcaseImages.length <= 1) {
      alert('Deve manter pelo menos 1 imagem de análise no showcase.');
      return;
    }
    const updated = config.showcaseImages.filter((_, idx) => idx !== index);
    setConfig(prev => ({ ...prev, showcaseImages: updated }));
  };

  // Excel Download Counter Handlers
  const handleSaveDownloads = () => {
    const val = Number(downloadsInputValue);
    if (isNaN(val) || val < 0) return;
    const updatedConfig = {
      ...config,
      stats: {
        ...config.stats,
        excelDownloads: val,
        lastDownloadedAt: new Date().toISOString()
      }
    };
    setConfig(updatedConfig);
    saveApisExcelConfig(updatedConfig);
    setEditingDownloads(false);
    setSaveToast(`✓ Contador de downloads atualizado para ${val}.`);
    setTimeout(() => setSaveToast(null), 3000);
  };

  const handleSimulateDownload = () => {
    const newCount = incrementExcelDownloadCount();
    setConfig(getApisExcelConfig());
    setDownloadsInputValue(newCount);
    setSaveToast(`✓ Download registado! Novo total: ${newCount} downloads.`);
    setTimeout(() => setSaveToast(null), 3000);
  };

  // Filtered Subscribers
  const filteredSubscribers = (config.subscriptions || []).filter(sub => {
    const matchesSearch = 
      sub.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      sub.email.toLowerCase().includes(searchTerm.toLowerCase()) ||
      sub.planName.toLowerCase().includes(searchTerm.toLowerCase()) ||
      sub.apiKey.toLowerCase().includes(searchTerm.toLowerCase());
    
    if (!matchesSearch) return false;

    if (selectedPlanFilter === 'ALL') return true;
    if (selectedPlanFilter === 'FREE') return sub.planCode === 'FREE';
    if (selectedPlanFilter === 'PRO') return sub.planCode === 'PRO';
    if (selectedPlanFilter === 'PRO_MAX') return sub.planCode === 'PRO_MAX';
    if (selectedPlanFilter === 'EXTRA_500') return sub.planCode === 'EXTRA_500';
    return true;
  });

  // Copy single email
  const handleCopySingleEmail = (email: string, id: string) => {
    navigator.clipboard.writeText(email);
    setCopiedEmailId(id);
    setTimeout(() => setCopiedEmailId(null), 2000);
  };

  // Copy all emails (comma-separated for mailing lists)
  const handleCopyAllEmails = () => {
    const emailsList = filteredSubscribers.map(s => s.email).join(', ');
    navigator.clipboard.writeText(emailsList);
    setCopiedAllEmails(true);
    setSaveToast(`✓ ${filteredSubscribers.length} emails copiados para a área de transferência!`);
    setTimeout(() => {
      setCopiedAllEmails(false);
      setSaveToast(null);
    }, 3500);
  };

  // Delete subscriber
  const handleDeleteSubscriber = (id: string, name: string) => {
    if (window.confirm(`Tem a certeza que deseja remover o subscritor "${name}"?`)) {
      deleteSubscription(id);
      setConfig(getApisExcelConfig());
      setSaveToast(`Subscritor "${name}" removido.`);
      setTimeout(() => setSaveToast(null), 3000);
    }
  };

  // Toggle subscriber status
  const handleToggleStatus = (id: string, currentStatus: 'active' | 'pending') => {
    const nextStatus = currentStatus === 'active' ? 'pending' : 'active';
    updateSubscriptionStatus(id, nextStatus);
    setConfig(getApisExcelConfig());
    setSaveToast(`Estado atualizado para ${nextStatus === 'active' ? 'Ativo' : 'Pendente'}.`);
    setTimeout(() => setSaveToast(null), 2500);
  };

  // Add subscriber modal submit
  const handleAddSubscriberSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newSubName.trim() || !newSubEmail.trim()) {
      alert('Preencha o Nome e o Email.');
      return;
    }
    addSubscriptionRequest(newSubName, newSubEmail, newSubPlanCode);
    setConfig(getApisExcelConfig());
    setShowAddSubModal(false);
    setNewSubName('');
    setNewSubEmail('');
    setSaveToast(`✓ Novo subscritor adicionado com sucesso!`);
    setTimeout(() => setSaveToast(null), 3000);
  };

  // Newsletter target recipients calculation
  const getTargetRecipients = () => {
    const all = config.subscriptions || [];
    if (newsletterTarget === 'ALL') return all;
    if (newsletterTarget === 'PRO_MAX') return all.filter(s => s.planCode === 'PRO_MAX');
    if (newsletterTarget === 'PRO') return all.filter(s => s.planCode === 'PRO' || s.planCode === 'PRO_MAX');
    if (newsletterTarget === 'FREE') return all.filter(s => s.planCode === 'FREE');
    if (newsletterTarget === 'VIP') return all.filter(s => s.email.toLowerCase() === 'morgado.aam@gmail.com');
    return all;
  };

  const targetRecipients = getTargetRecipients();
  const recipientEmails = targetRecipients.map(r => r.email);

  // Template switch
  const handleApplyTemplate = (type: 'excel_new' | 'poisson_odds' | 'api_maintenance') => {
    if (type === 'excel_new') {
      setNewsletterSubject('Nova Versão Disponível: Folha Excel de Modelos Poisson & +EV 2026');
      setNewsletterBody(
`Olá {nome},

Acabámos de disponibilizar uma nova versão da Folha Excel no Portal de Dados Estatísticos iRunBets!

O que inclui esta versão:
• Cruzamento de probabilidades calculadas 1X2 com margens de casas de apostas.
• Tabela atualizada de Força Ofensiva e Força Defensiva das equipas.
• Fórmulas automáticas de Expected Value (+EV) prontas a usar.

Aceda agora ao menu "Dados Estatísticos" para fazer o download imediato com a sua chave pessoal: {chave_api}.

Bons prognósticos,
Equipa iRunBets`
      );
    } else if (type === 'poisson_odds') {
      setNewsletterSubject('Alertas de Valor: Distribuição de Golos e Probabilidades Atualizadas');
      setNewsletterBody(
`Olá {nome},

Os nossos algoritmos acabaram de processar as mais recentes estatísticas para os próximos jogos da Primeira Liga, Premier League e La Liga.

Lembre-se que com o seu {plano} tem acesso direto aos dados em tempo real através da nossa API e na folha Excel.

Consulte os novos números diretamente no portal.

Atenciosamente,
Equipa de Análise iRunBets`
      );
    } else {
      setNewsletterSubject('Informação Técnica: Melhorias de Velocidade na API iRunBets');
      setNewsletterBody(
`Olá {nome},

Informamos que realizámos uma otimização nos nossos servidores e na integração com o Supabase, reduzindo o tempo de resposta da API para menos de 45ms.

A sua chave de acesso continua ativa e válida: {chave_api}.

Qualquer questão técnica, estamos à disposição.

Cumprimentos,
Suporte iRunBets`
      );
    }
  };

  // Direct Newsletter Dispatch (Simulation & History Logging)
  const handleSendNewsletterDirect = () => {
    if (!newsletterSubject.trim() || !newsletterBody.trim()) {
      alert('Por favor, preencha o Assunto e o Conteúdo da Mensagem.');
      return;
    }
    if (targetRecipients.length === 0) {
      alert('Não existem subscritores para o público-alvo selecionado.');
      return;
    }

    setIsSendingNewsletter(true);
    setNewsletterFeedback(null);

    setTimeout(() => {
      addNewsletterLog({
        subject: newsletterSubject.trim(),
        body: newsletterBody.trim(),
        targetPlan: newsletterTarget,
        recipientCount: targetRecipients.length,
        recipients: recipientEmails,
        sender: 'morgado.aam@gmail.com (Admin iRunBets)'
      });

      setConfig(getApisExcelConfig());
      setIsSendingNewsletter(false);
      setNewsletterFeedback(`✓ Newsletter enviada e registada com sucesso para ${targetRecipients.length} destinatários!`);
      setTimeout(() => setNewsletterFeedback(null), 5000);
    }, 700);
  };

  // Open Gmail / Default Email Client with BCC
  const handleOpenEmailClient = () => {
    if (!newsletterSubject.trim() || !newsletterBody.trim()) {
      alert('Preencha o Assunto e a Mensagem.');
      return;
    }
    const bccList = recipientEmails.join(',');
    const sampleBody = newsletterBody
      .replace('{nome}', 'Estimado Subscritor')
      .replace('{plano}', 'Plano Ativo')
      .replace('{chave_api}', 'Sua_Chave_API');

    const mailtoUrl = `mailto:morgado.aam@gmail.com?bcc=${encodeURIComponent(bccList)}&subject=${encodeURIComponent(newsletterSubject)}&body=${encodeURIComponent(sampleBody)}`;
    
    // Log in history as well
    addNewsletterLog({
      subject: newsletterSubject.trim() + ' (Via Cliente de Email)',
      body: newsletterBody.trim(),
      targetPlan: newsletterTarget,
      recipientCount: targetRecipients.length,
      recipients: recipientEmails,
      sender: 'morgado.aam@gmail.com'
    });
    setConfig(getApisExcelConfig());

    window.open(mailtoUrl, '_blank');
    setSaveToast(`✓ Cliente de email aberto com ${targetRecipients.length} destinatários em Cópia Oculta (BCC)!`);
    setTimeout(() => setSaveToast(null), 4000);
  };

  return (
    <div className="space-y-6 text-left">
      
      {/* Toast Notification */}
      {saveToast && (
        <div className="bg-emerald-950/90 border border-emerald-500/60 text-emerald-200 px-5 py-3.5 rounded-2xl text-xs sm:text-sm font-semibold shadow-2xl flex items-center justify-between backdrop-blur-md animate-fade-in">
          <div className="flex items-center gap-2">
            <span>✅</span>
            <span>{saveToast}</span>
          </div>
          <button onClick={() => setSaveToast(null)} className="text-emerald-400 hover:text-white text-xs font-bold px-2 py-1 cursor-pointer">
            ✕ Fechar
          </button>
        </div>
      )}

      {/* Header Bar */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-zinc-900/90 p-5 rounded-2xl border border-zinc-800 shadow-xl">
        <div>
          <div className="flex items-center gap-2">
            <span className="text-xl">⚡</span>
            <h2 className="text-lg font-bold text-white uppercase tracking-wider font-display">
              Gestão APIS & Excel • Painel de Controlo
            </h2>
          </div>
          <p className="text-xs text-zinc-400 mt-1">
            Quadro de controlo de downloads do Excel, registo de subscritores e envio de newsletters com novidades.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={handleSave}
            className="px-6 py-3 bg-gradient-to-r from-emerald-500 to-teal-600 hover:from-emerald-400 hover:to-teal-500 text-black font-extrabold text-xs uppercase tracking-wider rounded-xl shadow-lg shadow-emerald-500/20 transition-all cursor-pointer flex items-center gap-2"
          >
            <span>💾 Guardar Todas as Alterações</span>
          </button>
        </div>
      </div>

      {/* Navigation Sub-Tabs */}
      <div className="flex flex-wrap gap-2 border-b border-zinc-800 pb-2">
        <button
          type="button"
          onClick={() => setActiveSubTab('dashboard')}
          className={`px-4 py-2.5 rounded-xl text-xs font-bold uppercase tracking-wider transition-colors cursor-pointer flex items-center gap-2 ${
            activeSubTab === 'dashboard' ? 'bg-cyan-500 text-black shadow-lg shadow-cyan-500/20 font-black' : 'text-zinc-400 hover:text-white bg-zinc-900/60'
          }`}
        >
          <span>📊</span>
          <span>Downloads & Subscritores ({config.subscriptions?.length || 0})</span>
        </button>

        <button
          type="button"
          onClick={() => setActiveSubTab('newsletters')}
          className={`px-4 py-2.5 rounded-xl text-xs font-bold uppercase tracking-wider transition-colors cursor-pointer flex items-center gap-2 ${
            activeSubTab === 'newsletters' ? 'bg-purple-500 text-black shadow-lg shadow-purple-500/20 font-black' : 'text-zinc-400 hover:text-white bg-zinc-900/60'
          }`}
        >
          <span>📬</span>
          <span>Enviar Newsletter & Novidades ({config.newsletters?.length || 0})</span>
        </button>

        <button
          type="button"
          onClick={() => setActiveSubTab('excel')}
          className={`px-4 py-2.5 rounded-xl text-xs font-bold uppercase tracking-wider transition-colors cursor-pointer ${
            activeSubTab === 'excel' ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/40' : 'text-zinc-400 hover:text-white bg-zinc-900/60'
          }`}
        >
          📁 Ficheiro Excel & Supabase
        </button>

        <button
          type="button"
          onClick={() => setActiveSubTab('plans')}
          className={`px-4 py-2.5 rounded-xl text-xs font-bold uppercase tracking-wider transition-colors cursor-pointer ${
            activeSubTab === 'plans' ? 'bg-amber-500/20 text-amber-300 border border-amber-500/40' : 'text-zinc-400 hover:text-white bg-zinc-900/60'
          }`}
        >
          💎 Planos & Preços (Supabase)
        </button>

        <button
          type="button"
          onClick={() => setActiveSubTab('banners')}
          className={`px-4 py-2.5 rounded-xl text-xs font-bold uppercase tracking-wider transition-colors cursor-pointer ${
            activeSubTab === 'banners' ? 'bg-zinc-700 text-white' : 'text-zinc-400 hover:text-white bg-zinc-900/60'
          }`}
        >
          🎯 Banner 1 (Hero)
        </button>

        <button
          type="button"
          onClick={() => setActiveSubTab('showcase')}
          className={`px-4 py-2.5 rounded-xl text-xs font-bold uppercase tracking-wider transition-colors cursor-pointer ${
            activeSubTab === 'showcase' ? 'bg-zinc-700 text-white' : 'text-zinc-400 hover:text-white bg-zinc-900/60'
          }`}
        >
          📸 Fotos & Showcase
        </button>
      </div>

      {/* =========================================================================
          SUB-TAB 1: QUADRO DE MÉTRICAS & LISTA DE SUBSCRITORES COM EMAILS
      ========================================================================== */}
      {activeSubTab === 'dashboard' && (
        <div className="space-y-6">
          
          {/* QUADRO DE 4 CARDS DE MÉTRICAS EM TEMPO REAL */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            
            {/* Card 1: Downloads do Excel */}
            <div className="p-5 rounded-2xl bg-gradient-to-br from-emerald-950/40 to-[#08080C] border border-emerald-500/40 shadow-xl flex flex-col justify-between">
              <div className="flex items-center justify-between">
                <span className="text-[10px] font-mono uppercase font-black tracking-wider text-emerald-400 bg-emerald-500/10 px-2.5 py-1 rounded-md border border-emerald-500/20">
                  📥 Downloads Excel
                </span>
                <span className="text-xl">📊</span>
              </div>
              
              <div className="my-3">
                {editingDownloads ? (
                  <div className="flex items-center gap-2">
                    <input
                      type="number"
                      min={0}
                      value={downloadsInputValue}
                      onChange={(e) => setDownloadsInputValue(Math.max(0, parseInt(e.target.value) || 0))}
                      className="w-24 bg-black border border-emerald-500 rounded-lg px-2 py-1 text-xl font-bold font-mono text-emerald-300"
                    />
                    <button
                      type="button"
                      onClick={handleSaveDownloads}
                      className="px-2.5 py-1 bg-emerald-500 text-black font-bold text-xs rounded-md cursor-pointer"
                    >
                      ✓
                    </button>
                    <button
                      type="button"
                      onClick={() => setEditingDownloads(false)}
                      className="px-2 py-1 bg-zinc-800 text-zinc-400 text-xs rounded-md cursor-pointer"
                    >
                      ✕
                    </button>
                  </div>
                ) : (
                  <div className="flex items-baseline gap-2">
                    <span className="text-3xl sm:text-4xl font-black font-mono text-white tracking-tight">
                      {config.stats?.excelDownloads ?? 14}
                    </span>
                    <span className="text-xs text-zinc-400">downloads</span>
                  </div>
                )}
                
                <p className="text-[11px] text-zinc-500 font-mono mt-1">
                  Último: {config.stats?.lastDownloadedAt ? new Date(config.stats.lastDownloadedAt).toLocaleDateString('pt-PT') : 'Hoje'}
                </p>
              </div>

              <div className="flex items-center gap-2 pt-2 border-t border-zinc-850">
                <button
                  type="button"
                  onClick={() => setEditingDownloads(!editingDownloads)}
                  className="text-[10px] font-mono text-emerald-400 hover:text-emerald-300 underline cursor-pointer"
                >
                  {editingDownloads ? 'Cancelar' : 'Ajustar Contador'}
                </button>
                <span className="text-zinc-600">•</span>
                <button
                  type="button"
                  onClick={handleSimulateDownload}
                  className="text-[10px] font-mono text-zinc-400 hover:text-white cursor-pointer"
                  title="Simula 1 download para testar o contador"
                >
                  +1 Teste
                </button>
              </div>
            </div>

            {/* Card 2: Total de Subscritores */}
            <div className="p-5 rounded-2xl bg-gradient-to-br from-cyan-950/40 to-[#08080C] border border-cyan-500/40 shadow-xl flex flex-col justify-between">
              <div className="flex items-center justify-between">
                <span className="text-[10px] font-mono uppercase font-black tracking-wider text-cyan-400 bg-cyan-500/10 px-2.5 py-1 rounded-md border border-cyan-500/20">
                  👥 Subscritores
                </span>
                <span className="text-xl">👤</span>
              </div>
              
              <div className="my-3">
                <div className="flex items-baseline gap-2">
                  <span className="text-3xl sm:text-4xl font-black font-mono text-white tracking-tight">
                    {config.subscriptions?.length || 0}
                  </span>
                  <span className="text-xs text-zinc-400">registados</span>
                </div>
                <p className="text-[11px] text-cyan-300/80 font-mono mt-1">
                  {config.subscriptions?.filter(s => s.planCode === 'PRO_MAX').length} Pro Max • {config.subscriptions?.filter(s => s.planCode === 'PRO').length} Pro • {config.subscriptions?.filter(s => s.planCode === 'FREE').length} Free
                </p>
              </div>

              <div className="pt-2 border-t border-zinc-850">
                <button
                  type="button"
                  onClick={() => setShowAddSubModal(true)}
                  className="text-[10px] font-mono text-cyan-400 hover:text-cyan-300 underline cursor-pointer"
                >
                  + Adicionar Subscritor Manual
                </button>
              </div>
            </div>

            {/* Card 3: Chaves de API Ativas */}
            <div className="p-5 rounded-2xl bg-gradient-to-br from-amber-950/40 to-[#08080C] border border-amber-500/40 shadow-xl flex flex-col justify-between">
              <div className="flex items-center justify-between">
                <span className="text-[10px] font-mono uppercase font-black tracking-wider text-amber-400 bg-amber-500/10 px-2.5 py-1 rounded-md border border-amber-500/20">
                  🔑 Chaves API Ativas
                </span>
                <span className="text-xl">⚡</span>
              </div>
              
              <div className="my-3">
                <div className="flex items-baseline gap-2">
                  <span className="text-3xl sm:text-4xl font-black font-mono text-white tracking-tight">
                    {config.subscriptions?.filter(s => s.status === 'active').length || 0}
                  </span>
                  <span className="text-xs text-zinc-400">operacionais</span>
                </div>
                <p className="text-[11px] text-amber-300/80 font-mono mt-1">
                  1 Chave Mestra VIP (Admin iRunBets)
                </p>
              </div>

              <div className="pt-2 border-t border-zinc-850">
                <span className="text-[10px] font-mono text-zinc-400">
                  Supabase: <code className="text-amber-300">public.api_keys</code>
                </span>
              </div>
            </div>

            {/* Card 4: Newsletters e Emails Disparados */}
            <div className="p-5 rounded-2xl bg-gradient-to-br from-purple-950/40 to-[#08080C] border border-purple-500/40 shadow-xl flex flex-col justify-between">
              <div className="flex items-center justify-between">
                <span className="text-[10px] font-mono uppercase font-black tracking-wider text-purple-400 bg-purple-500/10 px-2.5 py-1 rounded-md border border-purple-500/20">
                  📬 Newsletters Enviadas
                </span>
                <span className="text-xl">✉️</span>
              </div>
              
              <div className="my-3">
                <div className="flex items-baseline gap-2">
                  <span className="text-3xl sm:text-4xl font-black font-mono text-white tracking-tight">
                    {config.newsletters?.length || 0}
                  </span>
                  <span className="text-xs text-zinc-400">campanhas</span>
                </div>
                <p className="text-[11px] text-purple-300/80 font-mono mt-1">
                  {config.stats?.totalEmailsSent || 0} notificações enviadas
                </p>
              </div>

              <div className="pt-2 border-t border-zinc-850">
                <button
                  type="button"
                  onClick={() => setActiveSubTab('newsletters')}
                  className="text-[10px] font-mono text-purple-400 hover:text-purple-300 underline cursor-pointer"
                >
                  Compor Nova Mensagem →
                </button>
              </div>
            </div>

          </div>

          {/* TABELA DE SUBSCRITORES & GESTÃO DE EMAILS */}
          <div className="bg-zinc-900/80 border border-zinc-800 rounded-2xl p-6 space-y-5 shadow-xl">
            
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-zinc-800 pb-4">
              <div>
                <h3 className="text-sm font-bold text-white uppercase tracking-wider flex items-center gap-2">
                  <span>👥 Lista de Subscritores & Respetivos Emails</span>
                  <span className="text-xs font-mono font-normal text-zinc-400">
                    ({filteredSubscribers.length} de {config.subscriptions?.length || 0})
                  </span>
                </h3>
                <p className="text-xs text-zinc-400 mt-1">
                  Consulte os dados completos de cada utilizador, copie emails para mala direta ou envie novidades diretamente.
                </p>
              </div>

              <div className="flex flex-wrap items-center gap-2">
                {/* Botão Copiar Todos os Emails */}
                <button
                  type="button"
                  onClick={handleCopyAllEmails}
                  className="px-3.5 py-2 bg-cyan-500/10 hover:bg-cyan-500/20 border border-cyan-500/30 text-cyan-300 text-xs font-bold font-mono rounded-xl transition-all cursor-pointer flex items-center gap-1.5"
                  title="Copia todos os emails filtrados separados por vírgula para colar facilmente em qualquer cliente de correio"
                >
                  <span>📋</span>
                  <span>{copiedAllEmails ? '✓ Emails Copiados!' : 'Copiar Lista de Emails'}</span>
                </button>

                {/* Botão Enviar Newsletter a este grupo */}
                <button
                  type="button"
                  onClick={() => setActiveSubTab('newsletters')}
                  className="px-3.5 py-2 bg-purple-500/20 hover:bg-purple-500/30 border border-purple-500/40 text-purple-300 text-xs font-bold font-mono rounded-xl transition-all cursor-pointer flex items-center gap-1.5"
                >
                  <span>✉️</span>
                  <span>Criar Newsletter</span>
                </button>

                {/* Botão Novo Subscritor */}
                <button
                  type="button"
                  onClick={() => setShowAddSubModal(true)}
                  className="px-3.5 py-2 bg-emerald-500 hover:bg-emerald-400 text-black text-xs font-black uppercase font-mono rounded-xl transition-all cursor-pointer flex items-center gap-1"
                >
                  <span>+</span>
                  <span>Novo</span>
                </button>
              </div>
            </div>

            {/* BARRA DE FILTROS & PESQUISA */}
            <div className="flex flex-col sm:flex-row gap-3 items-center justify-between">
              
              {/* Campo de Pesquisa */}
              <div className="relative w-full sm:w-80">
                <span className="absolute left-3 top-2.5 text-zinc-500 text-xs">🔍</span>
                <input
                  type="text"
                  placeholder="Pesquisar por nome, email, plano ou chave..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="w-full bg-zinc-950 border border-zinc-800 rounded-xl pl-8 pr-3 py-2 text-xs text-white placeholder-zinc-500 font-mono focus:outline-none focus:border-cyan-500"
                />
                {searchTerm && (
                  <button
                    onClick={() => setSearchTerm('')}
                    className="absolute right-2.5 top-2.5 text-zinc-500 hover:text-white text-xs cursor-pointer"
                  >
                    ✕
                  </button>
                )}
              </div>

              {/* Filtro de Plano */}
              <div className="flex items-center gap-1.5 overflow-x-auto w-full sm:w-auto pb-1 sm:pb-0">
                <span className="text-[11px] text-zinc-500 font-mono mr-1">Plano:</span>
                {[
                  { key: 'ALL', label: 'Todos' },
                  { key: 'PRO_MAX', label: 'Pro Max' },
                  { key: 'PRO', label: 'Pro' },
                  { key: 'FREE', label: 'Free' }
                ].map(tab => (
                  <button
                    key={tab.key}
                    type="button"
                    onClick={() => setSelectedPlanFilter(tab.key)}
                    className={`px-3 py-1.5 rounded-lg text-xs font-mono transition-colors cursor-pointer ${
                      selectedPlanFilter === tab.key
                        ? 'bg-zinc-700 text-white font-bold'
                        : 'bg-zinc-950 text-zinc-400 hover:text-white border border-zinc-800'
                    }`}
                  >
                    {tab.label}
                  </button>
                ))}
              </div>

            </div>

            {/* TABELA RESPONSIVA */}
            <div className="overflow-x-auto rounded-xl border border-zinc-800">
              <table className="w-full text-left text-xs text-zinc-300 font-sans">
                <thead className="bg-zinc-950 text-[11px] font-mono text-zinc-400 uppercase border-b border-zinc-800">
                  <tr>
                    <th className="py-3 px-4">Nome & Titular</th>
                    <th className="py-3 px-4">Endereço de Email</th>
                    <th className="py-3 px-4">Plano Ativo</th>
                    <th className="py-3 px-4">Chave API</th>
                    <th className="py-3 px-4">Estado</th>
                    <th className="py-3 px-4">Data Registo</th>
                    <th className="py-3 px-4 text-right">Ações</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-zinc-850">
                  {filteredSubscribers.length === 0 ? (
                    <tr>
                      <td colSpan={7} className="text-center py-8 text-zinc-500 font-mono">
                        Nenhum subscritor encontrado com os critérios de pesquisa.
                      </td>
                    </tr>
                  ) : (
                    filteredSubscribers.map((sub) => {
                      const isFounder = sub.email.toLowerCase() === 'morgado.aam@gmail.com';
                      return (
                        <tr key={sub.id} className="hover:bg-zinc-950/40 transition-colors">
                          
                          {/* Nome */}
                          <td className="py-3.5 px-4 font-bold text-white">
                            <div className="flex items-center gap-2">
                              <span>{sub.name}</span>
                              {isFounder && (
                                <span className="px-1.5 py-0.5 rounded text-[9px] font-black bg-amber-500/20 text-amber-300 border border-amber-500/30 font-mono">
                                  👑 FUNDADOR
                                </span>
                              )}
                            </div>
                          </td>

                          {/* Email com botão de copiar */}
                          <td className="py-3.5 px-4 font-mono">
                            <div className="flex items-center gap-2">
                              <span className="text-cyan-300 font-medium select-all">{sub.email}</span>
                              <button
                                type="button"
                                onClick={() => handleCopySingleEmail(sub.email, sub.id)}
                                className="text-[10px] text-zinc-500 hover:text-cyan-400 transition-colors p-1 cursor-pointer"
                                title="Copiar endereço de email"
                              >
                                {copiedEmailId === sub.id ? '✓' : '📋'}
                              </button>
                            </div>
                          </td>

                          {/* Plano */}
                          <td className="py-3.5 px-4 font-mono">
                            <span className={`px-2 py-0.5 rounded text-[11px] font-bold ${
                              sub.planCode === 'PRO_MAX'
                                ? 'bg-purple-500/20 text-purple-300 border border-purple-500/30'
                                : sub.planCode === 'PRO'
                                  ? 'bg-cyan-500/20 text-cyan-300 border border-cyan-500/30'
                                  : 'bg-zinc-800 text-zinc-300'
                            }`}>
                              {sub.planName}
                            </span>
                          </td>

                          {/* Chave API */}
                          <td className="py-3.5 px-4 font-mono text-xs text-zinc-400">
                            <code className="select-all bg-black/50 px-2 py-1 rounded border border-zinc-850">
                              {sub.apiKey.length > 22 ? `${sub.apiKey.substring(0, 14)}...${sub.apiKey.substring(sub.apiKey.length - 6)}` : sub.apiKey}
                            </code>
                          </td>

                          {/* Estado */}
                          <td className="py-3.5 px-4">
                            <button
                              type="button"
                              onClick={() => handleToggleStatus(sub.id, sub.status)}
                              className={`px-2.5 py-0.5 rounded-full text-[10px] font-mono font-bold border transition-colors cursor-pointer ${
                                sub.status === 'active'
                                  ? 'bg-emerald-500/20 text-emerald-400 border-emerald-500/30 hover:bg-emerald-500/30'
                                  : 'bg-amber-500/20 text-amber-400 border-amber-500/30 hover:bg-amber-500/30'
                              }`}
                              title="Clique para alternar entre Ativo e Pendente"
                            >
                              {sub.status === 'active' ? '● ATIVA' : '○ PENDENTE'}
                            </button>
                          </td>

                          {/* Data */}
                          <td className="py-3.5 px-4 text-zinc-500 font-mono text-[11px]">
                            {new Date(sub.createdAt).toLocaleDateString('pt-PT')}
                          </td>

                          {/* Ações */}
                          <td className="py-3.5 px-4 text-right">
                            <div className="flex items-center justify-end gap-2">
                              {/* Mailto direto */}
                              <a
                                href={`mailto:${sub.email}?subject=${encodeURIComponent('iRunBets: Acesso aos Dados Estatísticos')}`}
                                className="p-1.5 rounded-lg bg-zinc-800 hover:bg-cyan-500/20 hover:text-cyan-300 text-zinc-400 transition-colors"
                                title="Enviar email direto a este subscritor"
                              >
                                ✉️
                              </a>

                              {/* Remover */}
                              {!isFounder && (
                                <button
                                  type="button"
                                  onClick={() => handleDeleteSubscriber(sub.id, sub.name)}
                                  className="p-1.5 rounded-lg bg-zinc-800 hover:bg-rose-500/20 hover:text-rose-400 text-zinc-400 transition-colors cursor-pointer"
                                  title="Remover subscritor"
                                >
                                  🗑️
                                </button>
                              )}
                            </div>
                          </td>

                        </tr>
                      );
                    })
                  )}
                </tbody>
              </table>
            </div>

            {/* Resumo de Exportação de Emails */}
            <div className="p-4 bg-zinc-950 rounded-xl border border-zinc-850 flex flex-col sm:flex-row items-center justify-between gap-3 text-xs">
              <div className="text-zinc-400 font-mono">
                💡 <strong className="text-zinc-200">Mala Direta:</strong> Pode copiar a lista completa dos emails e colá-la diretamente no campo <strong>BCC / Cópia Oculta</strong> da sua conta de correio (Gmail, Outlook) ou na aba de Newsletters abaixo.
              </div>
              <button
                type="button"
                onClick={handleCopyAllEmails}
                className="px-4 py-2 bg-zinc-800 hover:bg-zinc-700 text-white font-mono rounded-lg transition-colors cursor-pointer text-xs whitespace-nowrap"
              >
                {copiedAllEmails ? '✓ Copiados!' : `Copiar ${filteredSubscribers.length} Emails`}
              </button>
            </div>

          </div>

          {/* MODAL: ADICIONAR NOVO SUBSCRITOR MANUALMENTE */}
          {showAddSubModal && (
            <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-fade-in">
              <div className="bg-[#0E0F17] border border-zinc-800 rounded-2xl p-6 max-w-md w-full space-y-4 shadow-2xl">
                <div className="flex items-center justify-between border-b border-zinc-800 pb-3">
                  <h3 className="text-sm font-bold text-white uppercase font-display flex items-center gap-2">
                    <span>👤 Adicionar Subscritor Manualmente</span>
                  </h3>
                  <button
                    type="button"
                    onClick={() => setShowAddSubModal(false)}
                    className="text-zinc-500 hover:text-white text-xs font-bold cursor-pointer"
                  >
                    ✕
                  </button>
                </div>

                <form onSubmit={handleAddSubscriberSubmit} className="space-y-4 text-xs">
                  <div>
                    <label className="block font-bold text-zinc-300 mb-1">Nome Completo *</label>
                    <input
                      type="text"
                      required
                      placeholder="Ex.: Carlos Ferreira"
                      value={newSubName}
                      onChange={(e) => setNewSubName(e.target.value)}
                      className="w-full bg-zinc-950 border border-zinc-800 rounded-xl px-3 py-2.5 text-white font-sans focus:outline-none focus:border-cyan-500"
                    />
                  </div>

                  <div>
                    <label className="block font-bold text-zinc-300 mb-1">Endereço de Email *</label>
                    <input
                      type="email"
                      required
                      placeholder="Ex.: carlos@exemplo.com"
                      value={newSubEmail}
                      onChange={(e) => setNewSubEmail(e.target.value)}
                      className="w-full bg-zinc-950 border border-zinc-800 rounded-xl px-3 py-2.5 text-white font-mono focus:outline-none focus:border-cyan-500"
                    />
                  </div>

                  <div>
                    <label className="block font-bold text-zinc-300 mb-1">Plano a Atribuir</label>
                    <select
                      value={newSubPlanCode}
                      onChange={(e) => setNewSubPlanCode(e.target.value)}
                      className="w-full bg-zinc-950 border border-zinc-800 rounded-xl px-3 py-2.5 text-white font-mono focus:outline-none focus:border-cyan-500"
                    >
                      {config.plans.map(p => (
                        <option key={p.codigo_plano} value={p.codigo_plano}>
                          {p.nome_comercial} ({p.preco_mensal === 0 ? 'Grátis' : `${p.preco_mensal.toFixed(2)} €/mês`})
                        </option>
                      ))}
                    </select>
                  </div>

                  <div className="flex items-center justify-end gap-3 pt-3 border-t border-zinc-850">
                    <button
                      type="button"
                      onClick={() => setShowAddSubModal(false)}
                      className="px-4 py-2 rounded-xl border border-zinc-800 text-zinc-400 hover:text-white cursor-pointer"
                    >
                      Cancelar
                    </button>
                    <button
                      type="submit"
                      className="px-5 py-2 rounded-xl bg-cyan-500 hover:bg-cyan-400 text-black font-bold uppercase tracking-wider cursor-pointer"
                    >
                      Registar Subscritor
                    </button>
                  </div>
                </form>
              </div>
            </div>
          )}

        </div>
      )}

      {/* =========================================================================
          SUB-TAB 2: ENVIO DE NEWSLETTER COM NOVIDADES AOS SUBSCRITORES
      ========================================================================== */}
      {activeSubTab === 'newsletters' && (
        <div className="space-y-6">
          
          <div className="bg-zinc-900/80 border border-zinc-800 rounded-2xl p-6 space-y-6 shadow-xl">
            
            <div className="border-b border-zinc-800 pb-4">
              <span className="text-[10px] font-black uppercase tracking-wider text-purple-400 bg-purple-500/10 px-3 py-1 rounded-md font-mono border border-purple-500/20">
                📬 COMUNICAÇÃO & DISPARO DE NOVIDADES
              </span>
              <h3 className="text-xl font-extrabold text-white uppercase tracking-tight font-display mt-2">
                Enviar Newsletter para os Subscritores
              </h3>
              <p className="text-xs text-zinc-400 mt-1 max-w-3xl">
                Redija e envie comunicados sobre novas atualizações da folha Excel, melhorias nas fórmulas de Poisson, novos endpoints da API ou manutenção. Poderá disparar diretamente ou abrir no seu cliente de correio (Gmail/Outlook) com todos os destinatários em BCC (cópia oculta).
              </p>
            </div>

            {/* Notificação de Envio Realizado */}
            {newsletterFeedback && (
              <div className="p-4 bg-emerald-950/80 border border-emerald-500/60 rounded-xl text-emerald-200 text-xs font-mono flex items-center justify-between shadow-xl animate-fade-in">
                <span>{newsletterFeedback}</span>
                <button onClick={() => setNewsletterFeedback(null)} className="text-emerald-400 hover:text-white text-xs cursor-pointer">✕</button>
              </div>
            )}

            <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
              
              {/* COLUNA ESQUERDA: EDITOR DA NEWSLETTER (7 cols) */}
              <div className="lg:col-span-7 space-y-5 text-xs">
                
                {/* Seleção do Público Alvo */}
                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <label className="font-bold text-zinc-300 font-mono uppercase tracking-wider text-[11px]">
                      1. Selecionar Destinatários da Mensagem
                    </label>
                    <span className="font-mono text-purple-400 font-bold">
                      {targetRecipients.length} {targetRecipients.length === 1 ? 'destinatário' : 'destinatários'}
                    </span>
                  </div>

                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                    {[
                      { key: 'ALL', label: 'Todos os Subscritores', count: (config.subscriptions || []).length },
                      { key: 'PRO_MAX', label: 'Apenas Pro Max', count: (config.subscriptions || []).filter(s => s.planCode === 'PRO_MAX').length },
                      { key: 'PRO', label: 'Planos Pro & Max', count: (config.subscriptions || []).filter(s => s.planCode === 'PRO' || s.planCode === 'PRO_MAX').length },
                      { key: 'FREE', label: 'Apenas Free', count: (config.subscriptions || []).filter(s => s.planCode === 'FREE').length }
                    ].map(target => (
                      <button
                        key={target.key}
                        type="button"
                        onClick={() => setNewsletterTarget(target.key as any)}
                        className={`p-2.5 rounded-xl border text-left transition-all cursor-pointer ${
                          newsletterTarget === target.key
                            ? 'bg-purple-500/20 border-purple-500 text-white font-bold'
                            : 'bg-zinc-950 border-zinc-800 text-zinc-400 hover:text-white'
                        }`}
                      >
                        <div className="font-mono text-[11px] truncate">{target.label}</div>
                        <div className="text-[10px] text-zinc-500 mt-0.5">{target.count} emails</div>
                      </button>
                    ))}
                  </div>

                  {/* Resumo visual dos emails abrangidos */}
                  <div className="p-3 bg-zinc-950 rounded-xl border border-zinc-855 flex flex-wrap gap-1.5 max-h-24 overflow-y-auto">
                    {recipientEmails.map((em, idx) => (
                      <span key={idx} className="px-2 py-0.5 rounded-md bg-zinc-800 text-zinc-300 font-mono text-[10px]">
                        {em}
                      </span>
                    ))}
                  </div>
                </div>

                {/* Modelos / Templates Prontos */}
                <div className="space-y-1.5">
                  <label className="font-bold text-zinc-400 font-mono uppercase tracking-wider text-[11px]">
                    2. Sugestões de Modelos Rápidos
                  </label>
                  <div className="flex flex-wrap gap-2">
                    <button
                      type="button"
                      onClick={() => handleApplyTemplate('excel_new')}
                      className="px-3 py-1.5 rounded-lg bg-zinc-950 hover:bg-zinc-800 border border-zinc-800 text-zinc-300 hover:text-white text-[11px] font-mono transition-colors cursor-pointer"
                    >
                      📥 Nova Versão Excel
                    </button>
                    <button
                      type="button"
                      onClick={() => handleApplyTemplate('poisson_odds')}
                      className="px-3 py-1.5 rounded-lg bg-zinc-950 hover:bg-zinc-800 border border-zinc-800 text-zinc-300 hover:text-white text-[11px] font-mono transition-colors cursor-pointer"
                    >
                      ⚽ Novas Odds & Poisson
                    </button>
                    <button
                      type="button"
                      onClick={() => handleApplyTemplate('api_maintenance')}
                      className="px-3 py-1.5 rounded-lg bg-zinc-950 hover:bg-zinc-800 border border-zinc-800 text-zinc-300 hover:text-white text-[11px] font-mono transition-colors cursor-pointer"
                    >
                      ⚡ Melhorias na API
                    </button>
                  </div>
                </div>

                {/* Assunto */}
                <div className="space-y-1">
                  <label className="font-bold text-zinc-300 font-mono uppercase tracking-wider text-[11px]">
                    3. Assunto da Mensagem *
                  </label>
                  <input
                    type="text"
                    required
                    value={newsletterSubject}
                    onChange={(e) => setNewsletterSubject(e.target.value)}
                    placeholder="Ex.: Novidades iRunBets: Folha Excel e API Atualizadas"
                    className="w-full bg-zinc-950 border border-zinc-800 rounded-xl px-3.5 py-2.5 text-white font-bold text-sm focus:outline-none focus:border-purple-500"
                  />
                </div>

                {/* Corpo do Texto */}
                <div className="space-y-1">
                  <div className="flex items-center justify-between">
                    <label className="font-bold text-zinc-300 font-mono uppercase tracking-wider text-[11px]">
                      4. Conteúdo da Mensagem *
                    </label>
                    <span className="text-[10px] text-zinc-500 font-mono">
                      Variáveis aceites: <code className="text-purple-300">{'{nome}'}</code>, <code className="text-purple-300">{'{plano}'}</code>, <code className="text-purple-300">{'{chave_api}'}</code>
                    </span>
                  </div>
                  <textarea
                    rows={10}
                    required
                    value={newsletterBody}
                    onChange={(e) => setNewsletterBody(e.target.value)}
                    className="w-full bg-zinc-950 border border-zinc-800 rounded-xl px-3.5 py-3 text-zinc-200 font-sans leading-relaxed focus:outline-none focus:border-purple-500 text-xs"
                  />
                </div>

                {/* Ações de Envio */}
                <div className="flex flex-col sm:flex-row items-center gap-3 pt-3 border-t border-zinc-800">
                  
                  {/* Botão 1: Disparo Direto e Histórico */}
                  <button
                    type="button"
                    disabled={isSendingNewsletter || targetRecipients.length === 0}
                    onClick={handleSendNewsletterDirect}
                    className="w-full sm:w-auto px-6 py-3.5 bg-gradient-to-r from-purple-500 to-indigo-600 hover:from-purple-400 hover:to-indigo-500 disabled:opacity-50 text-white font-black uppercase text-xs tracking-wider rounded-xl shadow-lg shadow-purple-500/20 transition-all cursor-pointer flex items-center justify-center gap-2"
                  >
                    <span>🚀</span>
                    <span>{isSendingNewsletter ? 'A Disparar...' : `Enviar aos ${targetRecipients.length} Subscritores`}</span>
                  </button>

                  {/* Botão 2: Abrir no Cliente de Email (com BCC) */}
                  <button
                    type="button"
                    disabled={targetRecipients.length === 0}
                    onClick={handleOpenEmailClient}
                    className="w-full sm:w-auto px-5 py-3.5 bg-zinc-800 hover:bg-zinc-700 text-zinc-200 hover:text-white font-bold uppercase text-xs tracking-wider rounded-xl transition-all cursor-pointer flex items-center justify-center gap-2 border border-zinc-700"
                    title="Abre o Gmail ou Outlook com os endereços no campo BCC para envio com o seu email pessoal morgado.aam@gmail.com"
                  >
                    <span>📬</span>
                    <span>Abrir no Gmail / Email (BCC)</span>
                  </button>

                </div>

              </div>

              {/* COLUNA DIREITA: PRÉ-VISUALIZAÇÃO DO EMAIL FORMATADO (5 cols) */}
              <div className="lg:col-span-5 space-y-3">
                <div className="flex items-center justify-between">
                  <span className="text-[11px] font-mono font-bold text-zinc-400 uppercase tracking-wider">
                    👁️ Pré-Visualização do Email
                  </span>
                  <span className="text-[10px] text-zinc-500 font-mono">
                    Como o utilizador receberá
                  </span>
                </div>

                {/* Caixa simuladora de Cliente de Email */}
                <div className="rounded-2xl border border-zinc-800 bg-[#06070B] overflow-hidden shadow-2xl">
                  
                  {/* Barra de título do email */}
                  <div className="bg-zinc-950 px-4 py-3 border-b border-zinc-850 space-y-1 text-left font-mono text-[11px]">
                    <div className="flex items-center gap-1.5">
                      <span className="text-zinc-500">De:</span>
                      <span className="text-zinc-300 font-bold">iRunBets &lt;morgado.aam@gmail.com&gt;</span>
                    </div>
                    <div className="flex items-center gap-1.5">
                      <span className="text-zinc-500">Para:</span>
                      <span className="text-cyan-400">{recipientEmails[0] || 'subscritor@exemplo.com'} {recipientEmails.length > 1 ? `(+${recipientEmails.length - 1} em Cópia Oculta)` : ''}</span>
                    </div>
                    <div className="flex items-center gap-1.5">
                      <span className="text-zinc-500">Assunto:</span>
                      <span className="text-white font-bold">{newsletterSubject || '(Sem assunto)'}</span>
                    </div>
                  </div>

                  {/* Corpo estilizado do email */}
                  <div className="p-5 space-y-4 text-left font-sans text-xs text-zinc-300 bg-gradient-to-b from-[#0A0C14] to-[#06070B]">
                    
                    {/* Header do Email com Logótipo */}
                    <div className="flex items-center justify-between border-b border-zinc-800/80 pb-3">
                      <div className="flex items-center gap-2">
                        <span className="text-base">⚡</span>
                        <span className="font-extrabold text-white text-sm font-display tracking-tight">
                          iRunBets <span className="text-cyan-400 text-xs">DADOS ESTATÍSTICOS</span>
                        </span>
                      </div>
                      <span className="text-[9px] font-mono uppercase text-zinc-500">
                        {new Date().toLocaleDateString('pt-PT')}
                      </span>
                    </div>

                    {/* Mensagem convertida */}
                    <div className="whitespace-pre-line text-zinc-300 leading-relaxed font-light">
                      {newsletterBody
                        .replace('{nome}', targetRecipients[0]?.name || 'Subscritor VIP')
                        .replace('{plano}', targetRecipients[0]?.planName || 'Plano Pro Max')
                        .replace('{chave_api}', targetRecipients[0]?.apiKey || 'irun_master_eee78879c2fa3b720df7aa6321c33f46')}
                    </div>

                    {/* Botão de Chamada para Ação no Email */}
                    <div className="pt-2 text-center">
                      <div className="inline-block px-5 py-2.5 bg-gradient-to-r from-cyan-500 to-blue-600 text-black font-black uppercase text-[10px] tracking-wider rounded-xl shadow-lg shadow-cyan-500/10">
                        Aceder aos Dados & Descarregar Excel →
                      </div>
                    </div>

                    {/* Rodapé institucional */}
                    <div className="pt-4 border-t border-zinc-850 text-[10px] text-zinc-500 text-center font-mono space-y-0.5">
                      <p>iRunBets Análise Preditiva & Inteligência Artificial</p>
                      <p>Equipa de Apoio • suporte@irunbets.pt</p>
                    </div>

                  </div>

                </div>

              </div>

            </div>

          </div>

          {/* HISTÓRICO DE NEWSLETTERS ENVIADAS */}
          <div className="bg-zinc-900/80 border border-zinc-800 rounded-2xl p-6 space-y-4 shadow-xl">
            <h3 className="text-sm font-bold text-white uppercase tracking-wider flex items-center gap-2">
              <span>📜 Histórico de Newsletters & Comunicados Enviados</span>
              <span className="text-xs font-mono font-normal text-zinc-400">
                ({config.newsletters?.length || 0} registos)
              </span>
            </h3>

            {(!config.newsletters || config.newsletters.length === 0) ? (
              <p className="text-xs text-zinc-500 font-mono py-4">
                Ainda não foram enviadas newsletters.
              </p>
            ) : (
              <div className="space-y-3">
                {config.newsletters.map((item) => (
                  <div key={item.id} className="p-4 rounded-xl bg-zinc-950 border border-zinc-850 space-y-2 text-xs">
                    <div className="flex flex-wrap items-center justify-between gap-2">
                      <span className="font-bold text-white text-sm">{item.subject}</span>
                      <div className="flex items-center gap-2 text-[11px] font-mono text-zinc-400">
                        <span className="px-2 py-0.5 rounded bg-purple-500/20 text-purple-300">
                          {item.recipientCount} destinatários
                        </span>
                        <span>{new Date(item.sentAt).toLocaleString('pt-PT')}</span>
                      </div>
                    </div>
                    <p className="text-zinc-400 line-clamp-2 text-[11px] font-sans">
                      {item.body}
                    </p>
                    <div className="flex items-center justify-between pt-2 border-t border-zinc-900 text-[10px] text-zinc-500 font-mono">
                      <span>Destinatários: {item.recipients.slice(0, 3).join(', ')}{item.recipients.length > 3 ? ` e mais ${item.recipients.length - 3}...` : ''}</span>
                      <button
                        type="button"
                        onClick={() => {
                          setNewsletterSubject(item.subject);
                          setNewsletterBody(item.body);
                          setSaveToast('Texto reutilizado na caixa de composição!');
                          setTimeout(() => setSaveToast(null), 2500);
                        }}
                        className="text-cyan-400 hover:text-cyan-300 underline cursor-pointer"
                      >
                        Reutilizar Texto
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

        </div>
      )}

      {/* =========================================================================
          SUB-TAB 3: EXCEL & CONFIG SUPABASE
      ========================================================================== */}
      {activeSubTab === 'excel' && (
        <div className="bg-zinc-900/80 border border-zinc-800 rounded-2xl p-6 space-y-5">
          <div className="border-b border-zinc-800 pb-3">
            <h3 className="text-sm font-bold text-white uppercase tracking-wider">
              Configurações do Ficheiro Excel & Base de Dados Supabase
            </h3>
            <p className="text-xs text-zinc-400">
              Personalize o nome da folha Excel gerada, versão visível e ligações à API.
            </p>
          </div>

          <div className="space-y-4 text-xs">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block font-bold text-zinc-300 mb-1">Nome do Ficheiro Excel (.xlsx):</label>
                <input
                  type="text"
                  value={config.settings.excelFilename}
                  onChange={(e) => setConfig(prev => ({ ...prev, settings: { ...prev.settings, excelFilename: e.target.value } }))}
                  className="w-full bg-zinc-950 border border-zinc-800 rounded-xl px-3.5 py-2.5 text-white font-mono"
                />
              </div>

              <div>
                <label className="block font-bold text-zinc-300 mb-1">Versão do Modelo:</label>
                <input
                  type="text"
                  value={config.settings.excelVersion}
                  onChange={(e) => setConfig(prev => ({ ...prev, settings: { ...prev.settings, excelVersion: e.target.value } }))}
                  className="w-full bg-zinc-950 border border-zinc-800 rounded-xl px-3.5 py-2.5 text-white font-mono"
                />
              </div>
            </div>

            <div>
              <label className="block font-bold text-zinc-300 mb-1">
                Link Externo Personalizado para Download (Opcional):
              </label>
              <input
                type="text"
                placeholder="Se vazio, o sistema gera o ficheiro Excel oficial com modelos de Poisson automaticamente."
                value={config.settings.excelCustomUrl || ''}
                onChange={(e) => setConfig(prev => ({ ...prev, settings: { ...prev.settings, excelCustomUrl: e.target.value } }))}
                className="w-full bg-zinc-950 border border-zinc-800 rounded-xl px-3.5 py-2.5 text-white font-mono"
              />
            </div>

            <div>
              <label className="block font-bold text-zinc-300 mb-1">Descrição do Conteúdo do Excel:</label>
              <textarea
                rows={3}
                value={config.settings.excelDescription}
                onChange={(e) => setConfig(prev => ({ ...prev, settings: { ...prev.settings, excelDescription: e.target.value } }))}
                className="w-full bg-zinc-950 border border-zinc-800 rounded-xl px-3.5 py-2.5 text-zinc-200"
              />
            </div>

            {/* Supabase Connection */}
            <div className="pt-4 border-t border-zinc-800 space-y-4">
              <div className="flex items-center gap-2">
                <span className="text-base">⚡</span>
                <h4 className="text-xs font-bold uppercase tracking-wider text-cyan-400 font-mono">
                  Projeto Supabase (ksqevxtnuyzrfohkgvfw)
                </h4>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block font-bold text-zinc-300 mb-1">URL da API Supabase:</label>
                  <input
                    type="text"
                    value={config.settings.supabaseUrl || 'https://ksqevxtnuyzrfohkgvfw.supabase.co'}
                    onChange={(e) => setConfig(prev => ({ ...prev, settings: { ...prev.settings, supabaseUrl: e.target.value } }))}
                    className="w-full bg-zinc-950 border border-zinc-800 rounded-xl px-3.5 py-2.5 text-white font-mono"
                  />
                </div>

                <div>
                  <label className="block font-bold text-zinc-300 mb-1">Chave Pública (anon key):</label>
                  <input
                    type="password"
                    placeholder="Cole a sua anon key do Supabase quando quiser..."
                    value={config.settings.supabaseAnonKey || ''}
                    onChange={(e) => setConfig(prev => ({ ...prev, settings: { ...prev.settings, supabaseAnonKey: e.target.value } }))}
                    className="w-full bg-zinc-950 border border-zinc-800 rounded-xl px-3.5 py-2.5 text-white font-mono"
                  />
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* =========================================================================
          SUB-TAB 4: PLANOS & PREÇOS (SUPABASE)
      ========================================================================== */}
      {activeSubTab === 'plans' && (
        <div className="bg-zinc-900/80 border border-zinc-800 rounded-2xl p-6 space-y-5">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-zinc-800 pb-3">
            <div>
              <h3 className="text-sm font-bold text-white uppercase tracking-wider">
                Tabela de Planos de Subscrição da API & Excel
              </h3>
              <p className="text-xs text-zinc-400">
                Planos sincronizados com o Supabase: Free, Pro Data, Pro Max AI e Add-on Extra 500.
              </p>
            </div>
            <button
              type="button"
              onClick={() => {
                if (window.confirm('Tem a certeza que deseja restaurar os 4 planos originais?')) {
                  setConfig(prev => ({ ...prev, plans: DEFAULT_APIS_EXCEL_CONFIG.plans }));
                  setSaveToast('Planos restaurados para a configuração original.');
                  setTimeout(() => setSaveToast(null), 3000);
                }
              }}
              className="text-xs text-amber-400 hover:text-amber-300 underline font-mono cursor-pointer"
            >
              ↺ Restaurar Planos Padrão
            </button>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
            {config.plans.map((plan, index) => (
              <div key={plan.id} className="bg-zinc-950 border border-zinc-800 rounded-2xl p-5 space-y-4">
                <div className="flex items-center justify-between">
                  <span className="font-mono text-xs font-black uppercase text-cyan-400 bg-cyan-500/10 px-2 py-0.5 rounded">
                    Código: {plan.codigo_plano}
                  </span>
                  <label className="flex items-center gap-2 text-xs text-zinc-400 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={plan.active}
                      onChange={(e) => handleUpdatePlan(index, 'active', e.target.checked)}
                      className="rounded accent-cyan-500"
                    />
                    <span>Ativo</span>
                  </label>
                </div>

                <div className="space-y-3 text-xs">
                  <div>
                    <label className="block font-bold text-zinc-300 mb-1">Nome Comercial do Plano:</label>
                    <input
                      type="text"
                      value={plan.nome_comercial}
                      onChange={(e) => handleUpdatePlan(index, 'nome_comercial', e.target.value)}
                      className="w-full bg-zinc-900 border border-zinc-800 rounded-xl px-3 py-2 text-white font-bold"
                    />
                  </div>

                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="block font-bold text-zinc-300 mb-1">Preço Mensal (€):</label>
                      <input
                        type="number"
                        step="0.01"
                        value={plan.preco_mensal}
                        onChange={(e) => handleUpdatePlan(index, 'preco_mensal', parseFloat(e.target.value) || 0)}
                        className="w-full bg-zinc-900 border border-zinc-800 rounded-xl px-3 py-2 text-white font-mono"
                      />
                    </div>

                    <div>
                      <label className="block font-bold text-zinc-300 mb-1">Limite Req. / Dia:</label>
                      <input
                        type="number"
                        value={plan.limite_requisicoes_dia}
                        onChange={(e) => handleUpdatePlan(index, 'limite_requisicoes_dia', parseInt(e.target.value) || 0)}
                        className="w-full bg-zinc-900 border border-zinc-800 rounded-xl px-3 py-2 text-white font-mono"
                      />
                    </div>
                  </div>

                  <div>
                    <label className="block font-bold text-zinc-300 mb-1">Descrição Curta:</label>
                    <input
                      type="text"
                      value={plan.descricao || ''}
                      onChange={(e) => handleUpdatePlan(index, 'descricao', e.target.value)}
                      className="w-full bg-zinc-900 border border-zinc-800 rounded-xl px-3 py-2 text-zinc-300"
                    />
                  </div>

                  <div>
                    <label className="block font-bold text-zinc-300 mb-1">
                      Funcionalidades Incluídas (1 por linha):
                    </label>
                    <textarea
                      rows={4}
                      value={(plan.features || []).join('\n')}
                      onChange={(e) => handleUpdateFeatures(index, e.target.value)}
                      className="w-full bg-zinc-900 border border-zinc-800 rounded-xl px-3 py-2 text-zinc-300 font-mono text-xs"
                    />
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* =========================================================================
          SUB-TAB 5: BANNER 1 (HERO)
      ========================================================================== */}
      {activeSubTab === 'banners' && (
        <div className="bg-zinc-900/80 border border-zinc-800 rounded-2xl p-6 space-y-5">
          <div className="border-b border-zinc-800 pb-3">
            <h3 className="text-sm font-bold text-white uppercase tracking-wider">
              Edição do Banner 1 (Hero Principal)
            </h3>
            <p className="text-xs text-zinc-400">
              Personalize o badge, título, descrição e imagem de fundo do topo da página.
            </p>
          </div>

          <div className="space-y-4 text-xs">
            <div>
              <label className="block font-bold text-zinc-300 mb-1">Badge de Destaque:</label>
              <input
                type="text"
                value={config.banner1.badge}
                onChange={(e) => setConfig(prev => ({ ...prev, banner1: { ...prev.banner1, badge: e.target.value } }))}
                className="w-full bg-zinc-950 border border-zinc-800 rounded-xl px-3.5 py-2.5 text-white font-mono"
              />
            </div>

            <div>
              <label className="block font-bold text-zinc-300 mb-1">Título Principal:</label>
              <input
                type="text"
                value={config.banner1.title}
                onChange={(e) => setConfig(prev => ({ ...prev, banner1: { ...prev.banner1, title: e.target.value } }))}
                className="w-full bg-zinc-950 border border-zinc-800 rounded-xl px-3.5 py-2.5 text-white font-bold"
              />
            </div>

            <div>
              <label className="block font-bold text-zinc-300 mb-1">Subtítulo / Descrição Completa:</label>
              <textarea
                rows={3}
                value={config.banner1.subtitle}
                onChange={(e) => setConfig(prev => ({ ...prev, banner1: { ...prev.banner1, subtitle: e.target.value } }))}
                className="w-full bg-zinc-950 border border-zinc-800 rounded-xl px-3.5 py-2.5 text-zinc-200"
              />
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block font-bold text-zinc-300 mb-1">Texto do Botão Principal:</label>
                <input
                  type="text"
                  value={config.banner1.buttonText}
                  onChange={(e) => setConfig(prev => ({ ...prev, banner1: { ...prev.banner1, buttonText: e.target.value } }))}
                  className="w-full bg-zinc-950 border border-zinc-800 rounded-xl px-3.5 py-2.5 text-white"
                />
              </div>

              <div>
                <label className="block font-bold text-zinc-300 mb-1">URL da Imagem de Fundo (Opcional):</label>
                <input
                  type="text"
                  value={config.banner1.imageUrl || ''}
                  onChange={(e) => setConfig(prev => ({ ...prev, banner1: { ...prev.banner1, imageUrl: e.target.value } }))}
                  className="w-full bg-zinc-950 border border-zinc-800 rounded-xl px-3.5 py-2.5 text-white font-mono"
                />
              </div>
            </div>
          </div>
        </div>
      )}

      {/* =========================================================================
          SUB-TAB 6: FOTOS & SHOWCASE
      ========================================================================== */}
      {activeSubTab === 'showcase' && (
        <div className="bg-zinc-900/80 border border-zinc-800 rounded-2xl p-6 space-y-5">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-zinc-800 pb-3">
            <div>
              <h3 className="text-sm font-bold text-white uppercase tracking-wider">
                Banner 2: Galeria & Fotos de Análises
              </h3>
              <p className="text-xs text-zinc-400">
                Fotos e capturas de ecrã demonstrativas das folhas Excel e análises estatísticas.
              </p>
            </div>
            <button
              type="button"
              onClick={handleAddImage}
              className="px-4 py-2 bg-purple-500 hover:bg-purple-400 text-black font-extrabold text-xs uppercase tracking-wider rounded-xl transition-all cursor-pointer flex items-center gap-1.5 self-start sm:self-auto"
            >
              <span>+ Adicionar Imagem</span>
            </button>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
            {config.showcaseImages.map((img, index) => (
              <div key={img.id} className="bg-zinc-950 border border-zinc-800 rounded-2xl p-5 space-y-3">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-mono font-bold text-purple-400 uppercase">
                    Foto #{index + 1}
                  </span>
                  <button
                    type="button"
                    onClick={() => handleRemoveImage(index)}
                    className="text-zinc-500 hover:text-rose-400 text-xs font-bold transition-colors cursor-pointer"
                  >
                    🗑️ Remover
                  </button>
                </div>

                <div className="h-32 rounded-xl overflow-hidden bg-black/60 border border-zinc-850">
                  <img
                    src={img.url && img.url.trim() !== '' ? img.url : 'https://images.unsplash.com/photo-1551288049-bebda4e38f71?auto=format&fit=crop&w=1000&q=80'}
                    alt={img.title}
                    className="w-full h-full object-cover"
                    onError={(e) => {
                      (e.target as HTMLImageElement).src = 'https://images.unsplash.com/photo-1551288049-bebda4e38f71?auto=format&fit=crop&w=1000&q=80';
                    }}
                  />
                </div>

                <div className="space-y-2 text-xs">
                  <div>
                    <label className="block font-bold text-zinc-400 mb-1">Título da Imagem:</label>
                    <input
                      type="text"
                      value={img.title}
                      onChange={(e) => handleUpdateImage(index, 'title', e.target.value)}
                      className="w-full bg-zinc-900 border border-zinc-800 rounded-xl px-3 py-2 text-white font-bold"
                    />
                  </div>

                  <div>
                    <label className="block font-bold text-zinc-400 mb-1">Subtítulo / Descrição:</label>
                    <input
                      type="text"
                      value={img.subtitle}
                      onChange={(e) => handleUpdateImage(index, 'subtitle', e.target.value)}
                      className="w-full bg-zinc-900 border border-zinc-800 rounded-xl px-3 py-2 text-zinc-300"
                    />
                  </div>

                  <div className="grid grid-cols-2 gap-2">
                    <div>
                      <label className="block font-bold text-zinc-400 mb-1">Tag / Etiqueta:</label>
                      <input
                        type="text"
                        value={img.tag}
                        onChange={(e) => handleUpdateImage(index, 'tag', e.target.value)}
                        className="w-full bg-zinc-900 border border-zinc-800 rounded-xl px-3 py-2 text-white font-mono"
                      />
                    </div>
                    <div>
                      <label className="block font-bold text-zinc-400 mb-1">URL da Imagem:</label>
                      <input
                        type="text"
                        value={img.url}
                        onChange={(e) => handleUpdateImage(index, 'url', e.target.value)}
                        className="w-full bg-zinc-900 border border-zinc-800 rounded-xl px-3 py-2 text-white font-mono text-[10px]"
                      />
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

    </div>
  );
};
