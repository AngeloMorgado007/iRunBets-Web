import React, { useState, useEffect } from 'react';
import { 
  Mail, Send, Users, CheckCircle2, AlertCircle, Copy, Download, Sparkles, 
  Eye, Edit3, Trash2, Clock, ShieldCheck, RefreshCw, Key, ExternalLink,
  Filter, CheckSquare, Square, ChevronRight, FileText
} from 'lucide-react';
import { 
  SubscriberUser, 
  NewsletterCampaign, 
  getNewsletterHistoryFromFirebase, 
  saveNewsletterCampaignToFirebase, 
  deleteNewsletterCampaignFromFirebase 
} from '../services/firebase';

interface BackofficeNewsletterProps {
  subscribers: SubscriberUser[];
  onRefreshSubscribers?: () => void;
}

const EMAIL_TEMPLATES = [
  {
    id: 'weekly_prognostics',
    name: '⚽ Boletim Semanal de Prognósticos',
    subject: '⚽ [iRunBets] Destaques & Prognósticos Quânticos para a Jornada',
    body: `Olá {NOME},

A equipa analítica da iRunBets preparou o novo boletim quantitativo com os jogos de maior valor esperado (+EV) desta semana!

📊 DESTAQUES DA JORNADA:
• Análise ao vivo com cálculo avançado de Poisson e rigor tático.
• Filtro ativo para perigo de zebra e tensão de balneário.
• Gestão estrita de banca recomendada (Stake de 1% a 2%).

Acede já à plataforma para consultar os prognósticos detalhados e as sugestões da nossa inteligência artificial desportiva!`,
    ctaText: 'Ver Prognósticos VIP Agora',
    ctaUrl: 'https://irunbets.pt'
  },
  {
    id: 'hybrid_feature',
    name: '🤖 Nova Análise Híbrida & Fator Zebra',
    subject: '🤖 [Novidade] Análise IA Híbrida & Deteção de Zebras no iRunBets!',
    body: `Olá {NOME},

Temos o prazer de anunciar uma grande atualização na plataforma iRunBets!

🚀 O QUE HÁ DE NOVO:
1. Análise Híbrida (IA + Matemática Poisson em tempo real).
2. Fator de Risco Surpresa / Zebra (0 a 5 com proteção automática de banca).
3. Avaliação de Balneário e Treinador (desgaste, chicotada psicológica e relvado).
4. Pop-up com a Melhor Aposta Única sugerida pelo algoritmo.

Testa agora mesmo estas novas ferramentas no teu painel VIP!`,
    ctaText: 'Experimentar Análise Híbrida',
    ctaUrl: 'https://irunbets.pt'
  },
  {
    id: 'vip_promo',
    name: '💎 Oportunidade Especial VIP',
    subject: '💎 [Exclusivo] Condições Especiais para Subscrição VIP iRunBets',
    body: `Olá {NOME},

Como membro registado da comunidade iRunBets, queremos oferecer-te uma oportunidade exclusiva de elevar a tua metodologia de apostas com rigor profissional.

🏆 VANTAGENS DO PLANO VIP:
• Acesso ilimitado ao motor preditivo quantitativo.
• Auditoria de Odds e Alertas Push em tempo real.
• Análise comportamental da tua carteira com o Mentor IA.
• Acompanhamento dos melhores tipsters verificados.

Garante o teu acesso prioritário com as melhores condições.`,
    ctaText: 'Garantir Acesso VIP',
    ctaUrl: 'https://irunbets.pt'
  },
  {
    id: 'bankroll_guide',
    name: '🛡️ Gestão de Banca & Filosofia',
    subject: '🛡️ [Regra de Ouro] O Segredo da Sobrevivência e Lucro a Longo Prazo',
    body: `Olá {NOME},

Uma das filosofias supremas da iRunBets é simples:
"O objetivo principal NÃO É fazer ninguém rico do dia para a noite, mas sim PREVENIR-TE de perderes o teu capital."

💡 3 REGRAS QUE NUNCA DEVES ESQUECER:
1. Nunca apostes mais de 2% a 3% da tua banca num único evento.
2. A sorte não é contínua, mas o azar também não — existe regressão à média.
3. Não tentes recuperar perdas (chasing losses) por impulso ou frustração.

Usa sempre a matemática e o rigor a teu favor!`,
    ctaText: 'Consultar Gestor de Banca',
    ctaUrl: 'https://irunbets.pt'
  }
];

export const BackofficeNewsletter: React.FC<BackofficeNewsletterProps> = ({ 
  subscribers = [],
  onRefreshSubscribers 
}) => {
  // Navigation inside Newsletter
  const [viewMode, setViewMode] = useState<'compose' | 'history' | 'settings'>('compose');
  const [previewTab, setPreviewTab] = useState<'editor' | 'preview'>('editor');

  // Form State
  const [senderName, setSenderName] = useState('iRunBets VIP');
  const [senderEmail, setSenderEmail] = useState('newsletter@irunbets.pt');
  const [subject, setSubject] = useState('⚽ [iRunBets] Destaques & Prognósticos para o Fim de Semana');
  const [contentText, setContentText] = useState(
    `Olá {NOME},\n\nAqui estão os novos prognósticos quantitativos da iRunBets com rigor tático e proteção de banca.\n\nConsulta o painel para ver as probabilidades calculadas e a melhor aposta do dia!`
  );
  const [ctaText, setCtaText] = useState('Aceder aos Prognósticos VIP');
  const [ctaUrl, setCtaUrl] = useState('https://irunbets.pt');
  const [targetGroup, setTargetGroup] = useState<'all' | 'pro' | 'free' | 'selected'>('all');
  const [selectedEmails, setSelectedEmails] = useState<string[]>([]);

  // Settings & Provider
  const [resendApiKey, setResendApiKey] = useState(() => localStorage.getItem('irunbets_resend_key') || '');
  const [saveKeySuccess, setSaveKeySuccess] = useState(false);

  // Sending Status
  const [isSending, setIsSending] = useState(false);
  const [sendSuccessMessage, setSendSuccessMessage] = useState<string | null>(null);
  const [sendErrorMessage, setSendErrorMessage] = useState<string | null>(null);

  // History State
  const [campaigns, setCampaigns] = useState<NewsletterCampaign[]>([]);
  const [loadingHistory, setLoadingHistory] = useState(false);
  const [inspectCampaign, setInspectCampaign] = useState<NewsletterCampaign | null>(null);

  // Load campaigns history
  const loadCampaigns = async () => {
    setLoadingHistory(true);
    try {
      const list = await getNewsletterHistoryFromFirebase();
      setCampaigns(list);
    } catch (e) {
      console.error(e);
    } finally {
      setLoadingHistory(false);
    }
  };

  useEffect(() => {
    loadCampaigns();
  }, []);

  // Filter subscribers according to target group
  const validSubscribers = subscribers.filter(s => s.email && s.email.includes('@'));
  
  const getFilteredRecipients = () => {
    switch (targetGroup) {
      case 'pro':
        return validSubscribers.filter(s => s.status === 'VIP Pro' || s.status === 'Subscritor Site' || s.status === 'pro' || s.status === 'site');
      case 'free':
        return validSubscribers.filter(s => s.status !== 'VIP Pro' && s.status !== 'Subscritor Site' && s.status !== 'pro' && s.status !== 'site');
      case 'selected':
        return validSubscribers.filter(s => selectedEmails.includes(s.email));
      case 'all':
      default:
        return validSubscribers;
    }
  };

  const currentRecipients = getFilteredRecipients();

  // Template selection handler
  const handleApplyTemplate = (tmpl: typeof EMAIL_TEMPLATES[0]) => {
    setSubject(tmpl.subject);
    setContentText(tmpl.body);
    setCtaText(tmpl.ctaText);
    setCtaUrl(tmpl.ctaUrl);
  };

  // Tag inserter
  const handleInsertTag = (tag: string) => {
    setContentText(prev => prev + ` ${tag} `);
  };

  // Copy BCC list
  const handleCopyBcc = () => {
    const emails = currentRecipients.map(r => r.email).join(', ');
    navigator.clipboard.writeText(emails);
    alert(`Copiados ${currentRecipients.length} emails para a área de transferência!`);
  };

  // Export CSV
  const handleExportCsv = () => {
    const rows = [
      ['Nome', 'Email', 'Plano / Estado', 'Data de Registo'],
      ...currentRecipients.map(r => [
        `"${r.displayName || ''}"`,
        `"${r.email}"`,
        `"${r.status || 'Gratuito'}"`,
        `"${r.createdAt || ''}"`
      ])
    ];
    const csvContent = 'data:text/csv;charset=utf-8,\uFEFF' + rows.map(e => e.join(';')).join('\n');
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement('a');
    link.setAttribute('href', encodedUri);
    link.setAttribute('download', `irunbets_lista_emails_${targetGroup}_${new Date().toISOString().slice(0, 10)}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  // Send Newsletter Handler
  const handleSendNewsletter = async (e: React.FormEvent) => {
    e.preventDefault();
    if (currentRecipients.length === 0) {
      alert('Selecione pelo menos um destinatário com email válido.');
      return;
    }

    if (!confirm(`Confirma o envio desta newsletter para ${currentRecipients.length} utilizadores registados?`)) {
      return;
    }

    setIsSending(true);
    setSendSuccessMessage(null);
    setSendErrorMessage(null);

    try {
      const response = await fetch('/api/send-newsletter', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          subject,
          contentText,
          senderName,
          senderEmail,
          recipients: currentRecipients.map(r => ({ email: r.email, displayName: r.displayName })),
          ctaText,
          ctaUrl,
          providerKey: resendApiKey || undefined,
          providerType: resendApiKey ? 'resend' : 'auto'
        })
      });

      const data = await response.json();

      if (response.ok && data.status === 'ok') {
        setSendSuccessMessage(`✅ Sucesso! Newsletter disparada para ${data.count || currentRecipients.length} destinatários.`);
        
        // Also save campaign directly to Firebase
        if (data.campaign) {
          await saveNewsletterCampaignToFirebase(data.campaign);
        } else {
          const fallbackCampaign: NewsletterCampaign = {
            id: 'camp_' + Date.now(),
            subject,
            senderName,
            senderEmail,
            targetGroup,
            totalRecipients: currentRecipients.length,
            recipientEmails: currentRecipients.map(r => r.email),
            contentHtml: contentText.replace(/\n/g, '<br/>'),
            contentText,
            ctaText,
            ctaUrl,
            status: 'sent',
            sentAt: new Date().toISOString(),
            providerUsed: resendApiKey ? 'Resend Cloud API' : 'iRunBets Mail Dispatcher'
          };
          await saveNewsletterCampaignToFirebase(fallbackCampaign);
        }

        await loadCampaigns();
      } else {
        setSendErrorMessage(data.message || 'Erro ao enviar a newsletter.');
      }
    } catch (err: any) {
      console.error(err);
      setSendErrorMessage('Erro de comunicação com o servidor de envio: ' + (err.message || err));
    } finally {
      setIsSending(false);
    }
  };

  // Save Resend Key
  const handleSaveResendKey = () => {
    localStorage.setItem('irunbets_resend_key', resendApiKey.trim());
    setSaveKeySuccess(true);
    setTimeout(() => setSaveKeySuccess(false), 3000);
  };

  // Delete Campaign
  const handleDeleteCampaign = async (id: string) => {
    if (!confirm('Deseja eliminar este registo de campanha do histórico?')) return;
    await deleteNewsletterCampaignFromFirebase(id);
    setCampaigns(prev => prev.filter(c => c.id !== id));
    if (inspectCampaign?.id === id) setInspectCampaign(null);
  };

  // Visual Preview generator
  const renderPreviewHtml = () => {
    const parsedText = contentText
      .replace(/{NOME}/g, 'João Silva')
      .replace(/{EMAIL}/g, 'joao.silva@exemplo.pt')
      .replace(/{ANO}/g, new Date().getFullYear().toString())
      .replace(/\n/g, '<br/>');

    return (
      <div className="bg-[#08080C] p-4 sm:p-6 rounded-2xl border border-zinc-800 text-zinc-200 font-sans shadow-2xl max-w-xl mx-auto">
        {/* Email Header */}
        <div className="bg-gradient-to-r from-[#181822] to-[#0c0c12] p-5 rounded-t-xl border-b-2 border-[#FFEF00] text-center">
          <div className="text-xl font-black tracking-widest text-white uppercase font-display">
            ⚡ <span className="text-[#FFEF00]">iRun</span>Bets
          </div>
          <p className="text-[10px] text-zinc-400 font-mono tracking-wider uppercase mt-1">
            Plataforma Quântica de Prognósticos & Apostas de Valor
          </p>
        </div>

        {/* Email Body */}
        <div className="p-6 bg-[#111116] space-y-4">
          <h2 className="text-base font-black text-white">{subject}</h2>
          <div 
            className="text-xs text-zinc-300 leading-relaxed font-normal"
            dangerouslySetInnerHTML={{ __html: parsedText }}
          />

          {ctaText && ctaUrl && (
            <div className="text-center pt-5 pb-3">
              <a 
                href={ctaUrl}
                target="_blank"
                rel="noreferrer"
                className="inline-block px-6 py-3 bg-gradient-to-r from-[#FFEF00] to-[#00F2FE] text-black font-black text-xs uppercase tracking-wider rounded-xl shadow-lg shadow-yellow-500/20 hover:scale-105 transition-transform"
              >
                {ctaText} ➔
              </a>
            </div>
          )}
        </div>

        {/* Email Footer */}
        <div className="bg-[#0A0A0E] p-4 rounded-b-xl border-t border-zinc-800 text-center text-[10px] text-zinc-500 space-y-1">
          <p>Estás a receber este e-mail porque tens conta registada no <strong className="text-zinc-400">iRunBets</strong>.</p>
          <p>© {new Date().getFullYear()} iRunBets Portugal. Gestão e proteção estrita de banca.</p>
        </div>
      </div>
    );
  };

  return (
    <div className="space-y-6">
      
      {/* Top Banner & Stats Overview */}
      <div className="bg-gradient-to-r from-[#14141E] via-[#0E0E14] to-[#121218] border border-zinc-800 rounded-3xl p-6 shadow-2xl relative overflow-hidden">
        <div className="absolute top-0 right-0 w-80 h-80 bg-gradient-to-br from-purple-600/10 to-cyan-500/10 rounded-full blur-3xl -z-0 pointer-events-none"></div>
        
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-6 relative z-10">
          <div>
            <div className="flex items-center gap-2.5 mb-2">
              <span className="p-2 bg-gradient-to-br from-yellow-400/20 to-amber-500/10 border border-yellow-400/40 rounded-xl text-[#FFEF00]">
                <Mail className="w-5 h-5" />
              </span>
              <h2 className="text-lg font-black text-white uppercase tracking-wider font-display">
                Central de Newsletter & Email Marketing
              </h2>
              <span className="text-[9px] bg-purple-500/20 text-purple-300 border border-purple-500/30 px-2 py-0.5 rounded-full font-mono uppercase">
                Em Massa
              </span>
            </div>
            <p className="text-xs text-zinc-400 font-light max-w-2xl">
              Comunique diretamente com toda a base de utilizadores registados na Firebase. Envie boletins de prognósticos, novidades da IA e comunicados VIP sem limites de envio individual do Gmail.
            </p>
          </div>

          {/* Quick Metrics */}
          <div className="flex items-center gap-3 flex-wrap">
            <div className="bg-zinc-900/80 border border-zinc-800 rounded-2xl px-4 py-3 min-w-[130px]">
              <div className="text-[10px] text-zinc-500 font-mono uppercase">Total Base</div>
              <div className="text-lg font-black text-white font-mono flex items-center gap-1.5">
                <Users className="w-4 h-4 text-cyan-400" />
                {validSubscribers.length}
              </div>
            </div>

            <div className="bg-zinc-900/80 border border-zinc-800 rounded-2xl px-4 py-3 min-w-[130px]">
              <div className="text-[10px] text-zinc-500 font-mono uppercase">Campanhas</div>
              <div className="text-lg font-black text-[#FFEF00] font-mono flex items-center gap-1.5">
                <Send className="w-4 h-4 text-yellow-400" />
                {campaigns.length}
              </div>
            </div>

            {onRefreshSubscribers && (
              <button 
                type="button"
                onClick={onRefreshSubscribers}
                className="p-3.5 bg-zinc-900 hover:bg-zinc-800 text-zinc-400 hover:text-white border border-zinc-800 rounded-2xl transition-all cursor-pointer"
                title="Recarregar base de dados"
              >
                <RefreshCw className="w-4 h-4" />
              </button>
            )}
          </div>
        </div>

        {/* View Navigation Switcher */}
        <div className="flex items-center gap-2 mt-6 pt-5 border-t border-zinc-850/80">
          <button
            type="button"
            onClick={() => setViewMode('compose')}
            className={`px-4 py-2 rounded-xl text-xs font-bold font-mono uppercase tracking-wider transition-all flex items-center gap-2 cursor-pointer ${
              viewMode === 'compose'
                ? 'bg-[#FFEF00] text-black shadow-lg shadow-yellow-500/20'
                : 'bg-zinc-900/80 text-zinc-400 hover:text-white hover:bg-zinc-800'
            }`}
          >
            <Edit3 className="w-3.5 h-3.5" />
            <span>Criar Nova Mensagem</span>
          </button>

          <button
            type="button"
            onClick={() => setViewMode('history')}
            className={`px-4 py-2 rounded-xl text-xs font-bold font-mono uppercase tracking-wider transition-all flex items-center gap-2 cursor-pointer ${
              viewMode === 'history'
                ? 'bg-[#FFEF00] text-black shadow-lg shadow-yellow-500/20'
                : 'bg-zinc-900/80 text-zinc-400 hover:text-white hover:bg-zinc-800'
            }`}
          >
            <Clock className="w-3.5 h-3.5" />
            <span>Histórico de Envios ({campaigns.length})</span>
          </button>

          <button
            type="button"
            onClick={() => setViewMode('settings')}
            className={`px-4 py-2 rounded-xl text-xs font-bold font-mono uppercase tracking-wider transition-all flex items-center gap-2 cursor-pointer ${
              viewMode === 'settings'
                ? 'bg-[#FFEF00] text-black shadow-lg shadow-yellow-500/20'
                : 'bg-zinc-900/80 text-zinc-400 hover:text-white hover:bg-zinc-800'
            }`}
          >
            <Key className="w-3.5 h-3.5" />
            <span>API & Provedor</span>
          </button>
        </div>
      </div>

      {/* ======================================================== */}
      {/* VIEW: COMPOSE NEWSLETTER */}
      {/* ======================================================== */}
      {viewMode === 'compose' && (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
          
          {/* LEFT COLUMN: FORM & TEMPLATES (7 cols) */}
          <div className="lg:col-span-7 space-y-6">
            
            {/* Quick Templates Selector */}
            <div className="bg-[#121218]/80 border border-zinc-850 rounded-2xl p-5 shadow-xl space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-white uppercase tracking-wider flex items-center gap-1.5 font-mono">
                  <Sparkles className="w-3.5 h-3.5 text-[#FFEF00]" />
                  Modelos Rápidos Pré-Definidos
                </span>
                <span className="text-[10px] text-zinc-500 font-mono">1-Clique para preencher</span>
              </div>
              
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                {EMAIL_TEMPLATES.map(tmpl => (
                  <button
                    key={tmpl.id}
                    type="button"
                    onClick={() => handleApplyTemplate(tmpl)}
                    className="text-left p-3 rounded-xl bg-zinc-900/60 hover:bg-zinc-800/80 border border-zinc-800/80 hover:border-yellow-400/50 transition-all cursor-pointer group"
                  >
                    <div className="text-xs font-bold text-zinc-200 group-hover:text-[#FFEF00] transition-colors">
                      {tmpl.name}
                    </div>
                    <div className="text-[10px] text-zinc-500 truncate mt-0.5">
                      {tmpl.subject}
                    </div>
                  </button>
                ))}
              </div>
            </div>

            {/* Target Audience Segment Selector */}
            <div className="bg-[#121218]/80 border border-zinc-850 rounded-2xl p-5 shadow-xl space-y-4">
              <div className="flex items-center justify-between flex-wrap gap-2">
                <span className="text-xs font-bold text-white uppercase tracking-wider flex items-center gap-1.5 font-mono">
                  <Filter className="w-3.5 h-3.5 text-cyan-400" />
                  Segmento de Destinatários
                </span>
                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={handleCopyBcc}
                    className="px-2.5 py-1 bg-zinc-900 hover:bg-zinc-800 border border-zinc-800 text-zinc-300 hover:text-white rounded-lg text-[10px] font-mono flex items-center gap-1 cursor-pointer"
                    title="Copiar lista de emails"
                  >
                    <Copy className="w-3 h-3" /> Copiar BCC ({currentRecipients.length})
                  </button>
                  <button
                    type="button"
                    onClick={handleExportCsv}
                    className="px-2.5 py-1 bg-zinc-900 hover:bg-zinc-800 border border-zinc-800 text-zinc-300 hover:text-white rounded-lg text-[10px] font-mono flex items-center gap-1 cursor-pointer"
                    title="Descarregar lista em CSV"
                  >
                    <Download className="w-3 h-3" /> Exportar CSV
                  </button>
                </div>
              </div>

              {/* Segment Buttons */}
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                <button
                  type="button"
                  onClick={() => setTargetGroup('all')}
                  className={`p-3 rounded-xl text-center border transition-all cursor-pointer ${
                    targetGroup === 'all'
                      ? 'bg-cyan-500/15 border-cyan-500 text-cyan-300 font-bold'
                      : 'bg-zinc-900/50 border-zinc-800 text-zinc-400 hover:text-white'
                  }`}
                >
                  <div className="text-xs font-bold">Todos</div>
                  <div className="text-[10px] font-mono mt-0.5">{validSubscribers.length} contactos</div>
                </button>

                <button
                  type="button"
                  onClick={() => setTargetGroup('pro')}
                  className={`p-3 rounded-xl text-center border transition-all cursor-pointer ${
                    targetGroup === 'pro'
                      ? 'bg-amber-500/15 border-amber-500 text-amber-300 font-bold'
                      : 'bg-zinc-900/50 border-zinc-800 text-zinc-400 hover:text-white'
                  }`}
                >
                  <div className="text-xs font-bold">Apenas VIP / Pro</div>
                  <div className="text-[10px] font-mono mt-0.5">
                    {validSubscribers.filter(s => s.status === 'VIP Pro' || s.status === 'Subscritor Site').length} contactos
                  </div>
                </button>

                <button
                  type="button"
                  onClick={() => setTargetGroup('free')}
                  className={`p-3 rounded-xl text-center border transition-all cursor-pointer ${
                    targetGroup === 'free'
                      ? 'bg-purple-500/15 border-purple-500 text-purple-300 font-bold'
                      : 'bg-zinc-900/50 border-zinc-800 text-zinc-400 hover:text-white'
                  }`}
                >
                  <div className="text-xs font-bold">Gratuitos / Trial</div>
                  <div className="text-[10px] font-mono mt-0.5">
                    {validSubscribers.filter(s => s.status !== 'VIP Pro' && s.status !== 'Subscritor Site').length} contactos
                  </div>
                </button>

                <button
                  type="button"
                  onClick={() => setTargetGroup('selected')}
                  className={`p-3 rounded-xl text-center border transition-all cursor-pointer ${
                    targetGroup === 'selected'
                      ? 'bg-[#FFEF00]/15 border-[#FFEF00] text-[#FFEF00] font-bold'
                      : 'bg-zinc-900/50 border-zinc-800 text-zinc-400 hover:text-white'
                  }`}
                >
                  <div className="text-xs font-bold">Manual</div>
                  <div className="text-[10px] font-mono mt-0.5">{selectedEmails.length} selecionados</div>
                </button>
              </div>

              {/* If Manual is selected, show checkboxes list */}
              {targetGroup === 'selected' && (
                <div className="p-3 bg-zinc-950/70 border border-zinc-850 rounded-xl space-y-2 max-h-48 overflow-y-auto">
                  <div className="flex justify-between items-center text-[10px] text-zinc-400 font-mono pb-2 border-b border-zinc-850">
                    <span>Selecione os utilizadores:</span>
                    <button
                      type="button"
                      onClick={() => {
                        if (selectedEmails.length === validSubscribers.length) {
                          setSelectedEmails([]);
                        } else {
                          setSelectedEmails(validSubscribers.map(s => s.email));
                        }
                      }}
                      className="text-cyan-400 hover:underline cursor-pointer"
                    >
                      {selectedEmails.length === validSubscribers.length ? 'Desmarcar Todos' : 'Selecionar Todos'}
                    </button>
                  </div>
                  {validSubscribers.map(sub => {
                    const isChecked = selectedEmails.includes(sub.email);
                    return (
                      <div
                        key={sub.uid || sub.email}
                        onClick={() => {
                          if (isChecked) {
                            setSelectedEmails(prev => prev.filter(e => e !== sub.email));
                          } else {
                            setSelectedEmails(prev => [...prev, sub.email]);
                          }
                        }}
                        className="flex items-center gap-2 p-1.5 rounded-lg hover:bg-zinc-900 cursor-pointer text-xs"
                      >
                        {isChecked ? (
                          <CheckSquare className="w-3.5 h-3.5 text-[#FFEF00]" />
                        ) : (
                          <Square className="w-3.5 h-3.5 text-zinc-600" />
                        )}
                        <span className="text-zinc-200">{sub.displayName || sub.email.split('@')[0]}</span>
                        <span className="text-[10px] text-zinc-500 font-mono">({sub.email})</span>
                        <span className="ml-auto text-[9px] px-2 py-0.5 bg-zinc-800 text-zinc-400 rounded-md font-mono">
                          {sub.status || 'Gratuito'}
                        </span>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>

            {/* Main Email Composer Form */}
            <form onSubmit={handleSendNewsletter} className="bg-[#121218]/80 border border-zinc-850 rounded-2xl p-6 shadow-xl space-y-5">
              
              {/* Alert Feedback */}
              {sendSuccessMessage && (
                <div className="p-4 bg-emerald-500/10 border border-emerald-500/30 text-emerald-300 rounded-xl text-xs flex items-center gap-2">
                  <CheckCircle2 className="w-4 h-4 shrink-0 text-emerald-400" />
                  <span>{sendSuccessMessage}</span>
                </div>
              )}

              {sendErrorMessage && (
                <div className="p-4 bg-red-500/10 border border-red-500/30 text-red-300 rounded-xl text-xs flex items-center gap-2">
                  <AlertCircle className="w-4 h-4 shrink-0 text-red-400" />
                  <span>{sendErrorMessage}</span>
                </div>
              )}

              {/* Sender info */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="text-[10px] uppercase font-bold tracking-wider text-zinc-400 block mb-1">
                    Nome do Remetente
                  </label>
                  <input
                    type="text"
                    required
                    value={senderName}
                    onChange={e => setSenderName(e.target.value)}
                    placeholder="iRunBets VIP"
                    className="w-full bg-zinc-900/80 border border-zinc-800 rounded-xl px-3.5 py-2.5 text-xs text-white outline-none focus:border-yellow-400 transition-colors"
                  />
                </div>
                <div>
                  <label className="text-[10px] uppercase font-bold tracking-wider text-zinc-400 block mb-1">
                    Email de Envio / Remetente
                  </label>
                  <input
                    type="text"
                    required
                    value={senderEmail}
                    onChange={e => setSenderEmail(e.target.value)}
                    placeholder="newsletter@irunbets.pt"
                    className="w-full bg-zinc-900/80 border border-zinc-800 rounded-xl px-3.5 py-2.5 text-xs text-white outline-none focus:border-yellow-400 transition-colors font-mono"
                  />
                </div>
              </div>

              {/* Subject line */}
              <div>
                <label className="text-[10px] uppercase font-bold tracking-wider text-zinc-400 block mb-1">
                  Assunto do Email (Subject)
                </label>
                <input
                  type="text"
                  required
                  value={subject}
                  onChange={e => setSubject(e.target.value)}
                  placeholder="Ex: ⚽ [iRunBets] Destaques & Melhores Prognósticos da Semana"
                  className="w-full bg-zinc-900/80 border border-zinc-800 rounded-xl px-3.5 py-2.5 text-xs text-white font-bold outline-none focus:border-yellow-400 transition-colors"
                />
              </div>

              {/* Dynamic Variables Pill Inserter */}
              <div className="space-y-1.5">
                <label className="text-[10px] uppercase font-bold tracking-wider text-zinc-400 block">
                  Tags Dinâmicas (Personalização Automática)
                </label>
                <div className="flex items-center gap-1.5 flex-wrap">
                  <button
                    type="button"
                    onClick={() => handleInsertTag('{NOME}')}
                    className="px-2.5 py-1 bg-zinc-900 hover:bg-zinc-800 border border-zinc-700 text-cyan-300 rounded-lg text-[10px] font-mono cursor-pointer"
                  >
                    + {'{NOME}'} (Nome do utilizador)
                  </button>
                  <button
                    type="button"
                    onClick={() => handleInsertTag('{EMAIL}')}
                    className="px-2.5 py-1 bg-zinc-900 hover:bg-zinc-800 border border-zinc-700 text-cyan-300 rounded-lg text-[10px] font-mono cursor-pointer"
                  >
                    + {'{EMAIL}'} (Endereço de email)
                  </button>
                  <button
                    type="button"
                    onClick={() => handleInsertTag('{ANO}')}
                    className="px-2.5 py-1 bg-zinc-900 hover:bg-zinc-800 border border-zinc-700 text-cyan-300 rounded-lg text-[10px] font-mono cursor-pointer"
                  >
                    + {'{ANO}'} ({new Date().getFullYear()})
                  </button>
                </div>
              </div>

              {/* Message Body */}
              <div>
                <label className="text-[10px] uppercase font-bold tracking-wider text-zinc-400 block mb-1">
                  Corpo da Mensagem (Texto & Parágrafos)
                </label>
                <textarea
                  required
                  rows={8}
                  value={contentText}
                  onChange={e => setContentText(e.target.value)}
                  placeholder="Escreva aqui o conteúdo da sua newsletter..."
                  className="w-full bg-zinc-900/80 border border-zinc-800 rounded-xl p-3.5 text-xs text-white outline-none focus:border-yellow-400 transition-colors leading-relaxed font-sans resize-y"
                />
              </div>

              {/* Optional Call to Action Button */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 p-4 bg-zinc-950/50 border border-zinc-850 rounded-xl">
                <div>
                  <label className="text-[10px] uppercase font-bold tracking-wider text-zinc-400 block mb-1">
                    Texto do Botão CTA (Opcional)
                  </label>
                  <input
                    type="text"
                    value={ctaText}
                    onChange={e => setCtaText(e.target.value)}
                    placeholder="Ex: Aceder aos Prognósticos VIP"
                    className="w-full bg-zinc-900/80 border border-zinc-800 rounded-xl px-3 py-2 text-xs text-white outline-none focus:border-yellow-400 font-sans"
                  />
                </div>
                <div>
                  <label className="text-[10px] uppercase font-bold tracking-wider text-zinc-400 block mb-1">
                    Link de Destino (URL)
                  </label>
                  <input
                    type="url"
                    value={ctaUrl}
                    onChange={e => setCtaUrl(e.target.value)}
                    placeholder="https://irunbets.pt"
                    className="w-full bg-zinc-900/80 border border-zinc-800 rounded-xl px-3 py-2 text-xs text-white outline-none focus:border-yellow-400 font-mono"
                  />
                </div>
              </div>

              {/* Submit Trigger Button */}
              <div className="pt-2">
                <button
                  type="submit"
                  disabled={isSending || currentRecipients.length === 0}
                  className="w-full py-4 bg-gradient-to-r from-[#FFEF00] to-yellow-500 hover:from-yellow-400 hover:to-amber-500 text-black font-black text-xs uppercase tracking-widest rounded-2xl shadow-xl shadow-yellow-500/20 hover:shadow-yellow-500/30 transition-all flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {isSending ? (
                    <>
                      <div className="w-4 h-4 border-2 border-black border-t-transparent rounded-full animate-spin"></div>
                      <span>A Disparar Newsletter em Massa...</span>
                    </>
                  ) : (
                    <>
                      <Send className="w-4 h-4" />
                      <span>Disparar Newsletter ({currentRecipients.length} Destinatários)</span>
                    </>
                  )}
                </button>
              </div>

            </form>
          </div>

          {/* RIGHT COLUMN: LIVE EMAIL PREVIEW (5 cols) */}
          <div className="lg:col-span-5 space-y-4">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold text-white uppercase tracking-wider flex items-center gap-1.5 font-mono">
                <Eye className="w-3.5 h-3.5 text-emerald-400" />
                Pré-Visualização ao Vivo na Caixa de Entrada
              </span>
              <span className="text-[10px] text-zinc-500 font-mono">Formato Responsivo</span>
            </div>

            {renderPreviewHtml()}

            <div className="p-4 rounded-2xl bg-zinc-900/50 border border-zinc-850 space-y-2 text-zinc-400 text-xs font-light">
              <div className="flex items-center gap-1.5 text-zinc-300 font-bold font-mono text-[11px]">
                <ShieldCheck className="w-3.5 h-3.5 text-emerald-400" />
                Dicas de Entregabilidade & Boas Práticas:
              </div>
              <ul className="list-disc pl-4 space-y-1 text-[11px]">
                <li>Evite palavras excessivas em MAIÚSCULAS no assunto.</li>
                <li>O template inclui rodapé automático de conformidade com link seguro.</li>
                <li>As tags como <code className="text-cyan-300">{'{NOME}'}</code> são substituídas automaticamente pelo nome real de cada destinatário.</li>
              </ul>
            </div>
          </div>

        </div>
      )}

      {/* ======================================================== */}
      {/* VIEW: CAMPAIGNS HISTORY */}
      {/* ======================================================== */}
      {viewMode === 'history' && (
        <div className="space-y-6">
          <div className="bg-[#121218]/80 border border-zinc-850 rounded-2xl p-6 shadow-xl space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="text-sm font-bold text-white uppercase tracking-wider flex items-center gap-2">
                <Clock className="w-4 h-4 text-[#FFEF00]" />
                Histórico de Campanhas Enviadas
              </h3>
              <button
                type="button"
                onClick={loadCampaigns}
                className="px-3 py-1.5 bg-zinc-900 hover:bg-zinc-800 border border-zinc-800 text-zinc-300 hover:text-white rounded-xl text-xs font-mono flex items-center gap-1 cursor-pointer"
              >
                <RefreshCw className="w-3 h-3" /> Atualizar
              </button>
            </div>

            {loadingHistory ? (
              <div className="py-16 text-center text-xs text-zinc-500 font-mono">
                A carregar histórico do Firestore...
              </div>
            ) : campaigns.length === 0 ? (
              <div className="py-16 text-center text-xs text-zinc-500 font-light bg-zinc-900/20 rounded-xl border border-zinc-900">
                Nenhuma newsletter enviada ainda pelo painel.
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-left border-collapse text-xs">
                  <thead>
                    <tr className="border-b border-zinc-850 bg-zinc-900/40 text-zinc-400 font-mono text-[9px] uppercase">
                      <th className="py-3 px-4">Data / Hora</th>
                      <th className="py-3 px-4">Assunto</th>
                      <th className="py-3 px-4">Remetente</th>
                      <th className="py-3 px-4">Destinatários</th>
                      <th className="py-3 px-4">Motor de Envio</th>
                      <th className="py-3 px-4 text-right">Ações</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-zinc-850/60">
                    {campaigns.map(camp => (
                      <tr key={camp.id} className="hover:bg-zinc-900/30 transition-colors">
                        <td className="py-3.5 px-4 font-mono text-zinc-400 text-[11px]">
                          {camp.sentAt ? new Date(camp.sentAt).toLocaleString('pt-PT') : 'N/A'}
                        </td>
                        <td className="py-3.5 px-4 font-bold text-white">
                          {camp.subject}
                        </td>
                        <td className="py-3.5 px-4 text-zinc-400">
                          {camp.senderName} <span className="text-zinc-500 text-[10px]">({camp.senderEmail})</span>
                        </td>
                        <td className="py-3.5 px-4">
                          <span className="px-2.5 py-0.5 bg-cyan-500/10 border border-cyan-500/20 text-cyan-300 rounded-full font-mono text-[10px] font-bold">
                            {camp.totalRecipients || camp.recipientEmails?.length || 0} envios
                          </span>
                        </td>
                        <td className="py-3.5 px-4 text-zinc-400 font-mono text-[10px]">
                          {camp.providerUsed || 'iRunBets Engine'}
                        </td>
                        <td className="py-3.5 px-4 text-right space-x-2">
                          <button
                            type="button"
                            onClick={() => {
                              setSubject(camp.subject);
                              setContentText(camp.contentText);
                              setSenderName(camp.senderName || 'iRunBets VIP');
                              setSenderEmail(camp.senderEmail || 'newsletter@irunbets.pt');
                              if (camp.ctaText) setCtaText(camp.ctaText);
                              if (camp.ctaUrl) setCtaUrl(camp.ctaUrl);
                              setViewMode('compose');
                            }}
                            className="p-1.5 bg-zinc-900 hover:bg-zinc-800 text-zinc-300 hover:text-[#FFEF00] rounded-lg transition-colors cursor-pointer"
                            title="Clonar / Reenviar esta campanha"
                          >
                            <Edit3 className="w-3.5 h-3.5" />
                          </button>
                          <button
                            type="button"
                            onClick={() => handleDeleteCampaign(camp.id)}
                            className="p-1.5 bg-zinc-900 hover:bg-zinc-800 text-zinc-500 hover:text-red-400 rounded-lg transition-colors cursor-pointer"
                            title="Eliminar do histórico"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>
      )}

      {/* ======================================================== */}
      {/* VIEW: SETTINGS & PROVIDER CONFIG */}
      {/* ======================================================== */}
      {viewMode === 'settings' && (
        <div className="max-w-3xl space-y-6">
          <div className="bg-[#121218]/80 border border-zinc-850 rounded-2xl p-6 shadow-xl space-y-5">
            <h3 className="text-sm font-bold text-white uppercase tracking-wider flex items-center gap-2">
              <Key className="w-4 h-4 text-[#FFEF00]" />
              Configuração de Chave API de Envio Transacional
            </h3>
            
            <p className="text-xs text-zinc-400 leading-relaxed font-light">
              Por defeito, o iRunBets utiliza o motor nativo de expedição em lote. Se pretender ligar a sua própria conta <strong>Resend</strong> (com suporte até 3.000 emails/mês gratuitos e domínio próprio verificado), basta colar a sua chave abaixo:
            </p>

            {saveKeySuccess && (
              <div className="p-3.5 bg-emerald-500/10 border border-emerald-500/30 text-emerald-300 rounded-xl text-xs flex items-center gap-2">
                <CheckCircle2 className="w-4 h-4 text-emerald-400" />
                <span>Chave API da Resend guardada com sucesso!</span>
              </div>
            )}

            <div className="space-y-2">
              <label className="text-[10px] uppercase font-bold tracking-wider text-zinc-400 block">
                Resend API Key (re_...)
              </label>
              <div className="flex gap-2">
                <input
                  type="password"
                  value={resendApiKey}
                  onChange={e => setResendApiKey(e.target.value)}
                  placeholder="re_123456789_abcdef..."
                  className="flex-1 bg-zinc-900/80 border border-zinc-800 rounded-xl px-4 py-3 text-xs text-white outline-none focus:border-yellow-400 font-mono"
                />
                <button
                  type="button"
                  onClick={handleSaveResendKey}
                  className="px-5 py-3 bg-[#FFEF00] hover:bg-yellow-400 text-black font-bold text-xs uppercase rounded-xl transition-all cursor-pointer"
                >
                  Guardar Chave
                </button>
              </div>
            </div>

            <div className="p-4 bg-zinc-950/60 border border-zinc-850 rounded-xl text-xs text-zinc-400 space-y-2">
              <div className="font-bold text-white flex items-center gap-1.5">
                <ExternalLink className="w-3.5 h-3.5 text-cyan-400" />
                Como obter uma conta gratuita na Resend?
              </div>
              <p className="text-[11px] leading-relaxed">
                Aceda a <a href="https://resend.com" target="_blank" rel="noreferrer" className="text-cyan-400 underline">resend.com</a>, crie a sua conta gratuita, gere uma API Key em <em>API Keys &gt; Create API Key</em> e cole-a acima.
              </p>
            </div>
          </div>
        </div>
      )}

    </div>
  );
};

export default BackofficeNewsletter;
