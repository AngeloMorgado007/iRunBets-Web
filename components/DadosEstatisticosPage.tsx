import React, { useState, useEffect } from 'react';
import { 
  getApisExcelConfig, 
  saveApisExcelConfig, 
  addSubscriptionRequest, 
  generateRealExcelFile, 
  incrementExcelDownloadCount,
  ApisExcelConfig, 
  ApisExcelPlan 
} from '../services/apisExcelConfig';
import { onAuthStatusChange } from '../services/firebase';
import { 
  registerWithSupabase, 
  verifyOtpCode, 
  resendOtpCode,
  signInWithSupabase,
  fetchUserSubscriptionFromSupabase,
  FOUNDER_EMAIL,
  FOUNDER_MASTER_API_KEY,
  FOUNDER_NAME
} from '../services/supabaseClient';

interface DadosEstatisticosPageProps {
  onBackToHome: () => void;
}

export const DadosEstatisticosPage: React.FC<DadosEstatisticosPageProps> = ({ onBackToHome }) => {
  const [config, setConfig] = useState<ApisExcelConfig>(getApisExcelConfig());
  const [currentUser, setCurrentUser] = useState<any>(null);
  const [isAdmin, setIsAdmin] = useState(false);
  
  // Registration & Login Form State
  const [authMode, setAuthMode] = useState<'register' | 'login'>('register');
  const [nome, setNome] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [loginEmail, setLoginEmail] = useState('');
  const [loginPassword, setLoginPassword] = useState('');
  const [showLoginPassword, setShowLoginPassword] = useState(false);
  const [isLoggingIn, setIsLoggingIn] = useState(false);
  const [selectedPlanCode, setSelectedPlanCode] = useState<string>('PRO_MAX');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [userSessionApiKey, setUserSessionApiKey] = useState<string>('');
  const [activePlanName, setActivePlanName] = useState<string>('');
  const [copiedKey, setCopiedKey] = useState(false);
  const [selectedImageModal, setSelectedImageModal] = useState<string | null>(null);
  const [notification, setNotification] = useState<{ message: string; type: 'success' | 'info' | 'error' } | null>(null);
  const [activeCodeTab, setActiveCodeTab] = useState<'curl' | 'js' | 'python' | 'excel'>('curl');

  // Multi-Step Registration & OTP Security Flow
  const [regStep, setRegStep] = useState<'form' | 'otp' | 'success'>('form');
  const [otpToken, setOtpToken] = useState('');
  const [otpCountdown, setOtpCountdown] = useState(60);
  const [isVerifyingOtp, setIsVerifyingOtp] = useState(false);
  const [isResendingOtp, setIsResendingOtp] = useState(false);
  const [demoNotice, setDemoNotice] = useState<string | null>(null);

  // Countdown timer for OTP resend
  useEffect(() => {
    let timer: any;
    if (regStep === 'otp' && otpCountdown > 0) {
      timer = setInterval(() => {
        setOtpCountdown((prev) => prev - 1);
      }, 1000);
    }
    return () => clearInterval(timer);
  }, [regStep, otpCountdown]);

  // Load config on mount and listen to updates
  useEffect(() => {
    const handleUpdate = () => {
      setConfig(getApisExcelConfig());
    };
    window.addEventListener('irunbets_apis_excel_updated', handleUpdate);
    window.addEventListener('storage', handleUpdate);
    return () => {
      window.removeEventListener('irunbets_apis_excel_updated', handleUpdate);
      window.removeEventListener('storage', handleUpdate);
    };
  }, []);

  // Check user authentication & sync with Supabase tables
  useEffect(() => {
    const unsubscribe = onAuthStatusChange(async (user, adminCheck) => {
      setCurrentUser(user);
      setIsAdmin(adminCheck);
      
      const userEmail = user?.email?.toLowerCase();

      // Immediate recognition of Founder (Ângelo Morgado)
      if (userEmail === FOUNDER_EMAIL || adminCheck) {
        setUserSessionApiKey(FOUNDER_MASTER_API_KEY);
        setActivePlanName('Plano Pro Max VIP Founder (Acesso Vitalício Supabase)');
        if (!nome) setNome(FOUNDER_NAME);
        if (!email) setEmail(FOUNDER_EMAIL);
        if (!loginEmail) setLoginEmail(FOUNDER_EMAIL);
      } else if (userEmail) {
        if (!email) setEmail(userEmail);
        if (!loginEmail) setLoginEmail(userEmail);
        if (!nome && user?.displayName) setNome(user.displayName);

        // Query Supabase tables: public.subscricoes_vendas and public.api_keys
        const sub = await fetchUserSubscriptionFromSupabase(userEmail);
        if (sub) {
          setUserSessionApiKey(sub.apiKey);
          setActivePlanName(sub.planName);
        } else {
          const existing = config.subscriptions.find(s => s.email.toLowerCase() === userEmail);
          if (existing) {
            setUserSessionApiKey(existing.apiKey);
            setActivePlanName(existing.planName);
          }
        }
      }
    });
    return () => unsubscribe();
  }, [config.subscriptions]);

  const showToast = (message: string, type: 'success' | 'info' | 'error' = 'success') => {
    setNotification({ message, type });
    setTimeout(() => setNotification(null), 4500);
  };

  const isUserActive = Boolean(
    userSessionApiKey || 
    currentUser?.email?.toLowerCase() === FOUNDER_EMAIL || 
    isAdmin
  );

  const handleRegisterSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!nome.trim() || !email.trim() || !password.trim()) {
      showToast('Por favor, preencha o Nome, Email e a Palavra-passe.', 'error');
      return;
    }
    if (!email.includes('@') || !email.includes('.')) {
      showToast('Por favor, insira um endereço de email válido.', 'error');
      return;
    }
    if (password.length < 6) {
      showToast('A palavra-passe deve conter pelo menos 6 caracteres.', 'error');
      return;
    }

    setIsSubmitting(true);
    setDemoNotice(null);

    try {
      const res = await registerWithSupabase(email, password, nome);
      setIsSubmitting(false);

      if (res.success) {
        setRegStep('otp');
        setOtpCountdown(60);
        setOtpToken('');
        if (res.isMockDemo && res.demoCode) {
          setDemoNotice(`Código de teste para validação imediata: ${res.demoCode}`);
        }
        showToast(res.message || 'Código de segurança enviado para o seu email!', 'info');
      } else {
        showToast(res.message || 'Erro ao comunicar com o serviço de autenticação.', 'error');
      }
    } catch (err) {
      console.error(err);
      setIsSubmitting(false);
      showToast('Falha no registo. Tente novamente.', 'error');
    }
  };

  const handleVerifyOtpSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!otpToken.trim() || otpToken.trim().length < 6) {
      showToast('Por favor, introduza o código de segurança de 6 dígitos.', 'error');
      return;
    }

    setIsVerifyingOtp(true);
    try {
      const res = await verifyOtpCode(email, otpToken, nome, selectedPlanCode);
      setIsVerifyingOtp(false);

      if (res.success) {
        const subKey = res.subscription?.apiKey || `irb_live_${Math.random().toString(36).substring(2, 10)}`;
        const subPlan = res.subscription?.planName || `Plano ${selectedPlanCode}`;

        setUserSessionApiKey(subKey);
        setActivePlanName(subPlan);
        setConfig(getApisExcelConfig());
        setRegStep('success');
        showToast(`Email validado! Subscrição sincronizada no Supabase e Chave API desbloqueada.`, 'success');

        setTimeout(() => {
          const dlElement = document.getElementById('excel-api-download-section');
          if (dlElement) {
            dlElement.scrollIntoView({ behavior: 'smooth' });
          }
        }, 400);
      } else {
        showToast(res.message || 'Código inválido. Verifique os 6 dígitos.', 'error');
      }
    } catch (err) {
      console.error(err);
      setIsVerifyingOtp(false);
      showToast('Erro ao validar código.', 'error');
    }
  };

  const handleLoginSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!loginEmail.trim() || !loginPassword.trim()) {
      showToast('Por favor, preencha o Email e a Palavra-passe.', 'error');
      return;
    }

    setIsLoggingIn(true);
    try {
      const res = await signInWithSupabase(loginEmail, loginPassword);
      setIsLoggingIn(false);

      if (res.success) {
        if (res.subscription) {
          setUserSessionApiKey(res.subscription.apiKey);
          setActivePlanName(res.subscription.planName);
          setNome(res.subscription.name);
          setEmail(res.subscription.email);
        }
        setRegStep('success');
        showToast(res.message || 'Sessão iniciada e Chave API ativada via Supabase!', 'success');

        setTimeout(() => {
          const dlElement = document.getElementById('excel-api-download-section');
          if (dlElement) {
            dlElement.scrollIntoView({ behavior: 'smooth' });
          }
        }, 400);
      } else {
        showToast(res.message || 'Credenciais inválidas. Tente novamente.', 'error');
      }
    } catch (err) {
      console.error(err);
      setIsLoggingIn(false);
      showToast('Falha na autenticação via Supabase.', 'error');
    }
  };

  const handleResendOtp = async () => {
    if (otpCountdown > 0 || isResendingOtp) return;
    setIsResendingOtp(true);
    try {
      const res = await resendOtpCode(email);
      setIsResendingOtp(false);
      setOtpCountdown(60);
      if (res.isMockDemo && res.demoCode) {
        setDemoNotice(`Novo código de teste: ${res.demoCode}`);
      }
      showToast(res.message || 'Novo código enviado!', 'info');
    } catch (err) {
      setIsResendingOtp(false);
      showToast('Não foi possível reenviar o código neste momento.', 'error');
    }
  };

  const handleDownloadExcel = () => {
    // Increment download statistics
    incrementExcelDownloadCount();

    if (config.settings.excelCustomUrl && config.settings.excelCustomUrl.trim().startsWith('http')) {
      window.open(config.settings.excelCustomUrl.trim(), '_blank');
      showToast('A abrir ficheiro Excel do link personalizado...', 'info');
      return;
    }
    // Generate real .xlsx file
    generateRealExcelFile(config.settings.excelFilename || 'iRunBets_Dados_Estatisticos_2026.xlsx');
    showToast('Ficheiro Excel descarregado com sucesso! Contém abas de Análises, Poisson e Instruções de API.', 'success');
  };

  const handleCopyApiKey = () => {
    const keyToCopy = userSessionApiKey || 'irb_live_morgado_7f8a92e104b';
    navigator.clipboard.writeText(keyToCopy);
    setCopiedKey(true);
    showToast('Chave de API copiada para a área de transferência!', 'success');
    setTimeout(() => setCopiedKey(false), 3000);
  };

  return (
    <div className="min-h-screen bg-[#0A0A0E] text-white pt-24 pb-20 px-4 sm:px-6 lg:px-8 font-sans selection:bg-cyan-500/30">
      
      {/* Toast Notification */}
      {notification && (
        <div className="fixed bottom-6 right-6 z-50 animate-bounce">
          <div className={`px-5 py-3.5 rounded-2xl shadow-2xl border text-xs sm:text-sm font-semibold flex items-center gap-3 backdrop-blur-xl ${
            notification.type === 'success' 
              ? 'bg-emerald-950/90 border-emerald-500/50 text-emerald-200' 
              : notification.type === 'error'
                ? 'bg-rose-950/90 border-rose-500/50 text-rose-200'
                : 'bg-cyan-950/90 border-cyan-500/50 text-cyan-200'
          }`}>
            <span>{notification.type === 'success' ? '✅' : notification.type === 'error' ? '❌' : 'ℹ️'}</span>
            <span>{notification.message}</span>
          </div>
        </div>
      )}

      <div className="max-w-7xl mx-auto space-y-12">
        
        {/* Top Breadcrumb & Navigation */}
        <div className="flex flex-wrap items-center justify-between gap-4 border-b border-zinc-800/80 pb-4">
          <div className="flex items-center gap-3">
            <button
              onClick={onBackToHome}
              className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-xl bg-zinc-900/80 hover:bg-zinc-800 text-zinc-300 hover:text-white border border-zinc-800 transition-all text-xs font-semibold cursor-pointer"
            >
              <span>← Voltar ao Início</span>
            </button>
            <span className="text-zinc-650">/</span>
            <span className="text-xs font-bold text-cyan-400 font-mono uppercase tracking-wider">
              {config.banner1.badge || 'DADOS ESTATÍSTICOS'}
            </span>
          </div>

          <div className="flex items-center gap-2">
            {isUserActive ? (
              <span className="inline-flex items-center gap-2 px-3 py-1 rounded-full text-xs font-bold bg-emerald-500/10 border border-emerald-500/30 text-emerald-400 font-mono">
                <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse"></span>
                Acesso Ativo: {currentUser?.email === 'morgado.aam@gmail.com' ? 'Admin (morgado.aam)' : (activePlanName || 'Plano Registado')}
              </span>
            ) : (
              <span className="inline-flex items-center gap-2 px-3 py-1 rounded-full text-xs font-semibold bg-amber-500/10 border border-amber-500/30 text-amber-400 font-mono">
                <span className="w-2 h-2 rounded-full bg-amber-400"></span>
                Acesso de Demonstração (Registo Disponível)
              </span>
            )}
          </div>
        </div>

        {/* =========================================================================
            BANNER 1: HERO & APRESENTAÇÃO
        ========================================================================== */}
        <div className="relative rounded-3xl overflow-hidden border border-zinc-800/90 bg-gradient-to-br from-[#0F111A] via-[#0D0E14] to-[#0A0A0E] shadow-2xl p-8 sm:p-12">
          {/* Subtle Background Pattern / Image */}
          {config.banner1.imageUrl && (
            <div 
              className="absolute inset-0 opacity-15 bg-cover bg-center pointer-events-none mix-blend-overlay"
              style={{ backgroundImage: `url(${config.banner1.imageUrl})` }}
            />
          )}
          <div className="absolute top-0 right-0 w-96 h-96 bg-cyan-500/10 rounded-full blur-3xl pointer-events-none -mr-20 -mt-20"></div>
          <div className="absolute bottom-0 left-0 w-96 h-96 bg-emerald-500/10 rounded-full blur-3xl pointer-events-none -ml-20 -mb-20"></div>

          <div className="relative z-10 max-w-4xl space-y-6 text-left">
            <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-cyan-500/15 border border-cyan-500/30 text-cyan-300 text-xs font-mono font-bold tracking-wider uppercase">
              <span>⚡</span>
              <span>{config.banner1.badge}</span>
            </div>

            <h1 className="text-3xl sm:text-5xl font-extrabold text-white tracking-tight font-display uppercase leading-tight">
              {config.banner1.title}
            </h1>

            <p className="text-sm sm:text-base text-zinc-300 font-normal leading-relaxed max-w-3xl">
              {config.banner1.subtitle}
            </p>

            <div className="flex flex-wrap items-center gap-4 pt-4">
              <a
                href="#excel-api-download-section"
                className="px-7 py-3.5 rounded-2xl bg-gradient-to-r from-cyan-500 to-blue-600 hover:from-cyan-400 hover:to-blue-500 text-black font-extrabold text-xs uppercase tracking-wider shadow-xl shadow-cyan-500/20 transition-all cursor-pointer flex items-center gap-2"
              >
                <span>📥 {config.banner1.buttonText || 'Aceder aos Dados & Download Excel'}</span>
                <span>↓</span>
              </a>

              <a
                href="#planos-section"
                className="px-6 py-3.5 rounded-2xl bg-zinc-900/90 hover:bg-zinc-800 text-white font-bold text-xs uppercase tracking-wider border border-zinc-700/80 transition-all cursor-pointer flex items-center gap-2"
              >
                <span>🏷️ Ver Planos (Free a Pro Max)</span>
              </a>

              <a
                href="#showcase-section"
                className="px-6 py-3.5 rounded-2xl bg-zinc-950/80 hover:bg-zinc-900 text-zinc-400 hover:text-white font-semibold text-xs uppercase tracking-wider border border-zinc-850 transition-all cursor-pointer flex items-center gap-2"
              >
                <span>📸 Ver Fotos & Análises</span>
              </a>
            </div>

            {/* Quick Metrics Bar */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 pt-6 border-t border-zinc-800/60 mt-8 text-left">
              <div>
                <div className="text-xl sm:text-2xl font-black text-cyan-400 font-mono">40+</div>
                <div className="text-[11px] text-zinc-400 font-medium uppercase tracking-wide">Ligas Monitorizadas</div>
              </div>
              <div>
                <div className="text-xl sm:text-2xl font-black text-emerald-400 font-mono">Poisson xG</div>
                <div className="text-[11px] text-zinc-400 font-medium uppercase tracking-wide">Modelo de Golos</div>
              </div>
              <div>
                <div className="text-xl sm:text-2xl font-black text-amber-400 font-mono">Excel .XLSX</div>
                <div className="text-[11px] text-zinc-400 font-medium uppercase tracking-wide">Exportação Direta</div>
              </div>
              <div>
                <div className="text-xl sm:text-2xl font-black text-purple-400 font-mono">&lt; 150ms</div>
                <div className="text-[11px] text-zinc-400 font-medium uppercase tracking-wide">Latência da API</div>
              </div>
            </div>
          </div>
        </div>

        {/* =========================================================================
            BANNER 2: SHOWCASE DE FOTOS & ANÁLISES
        ========================================================================== */}
        <section id="showcase-section" className="space-y-6 text-left">
          <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4">
            <div className="space-y-2">
              <span className="text-[10px] font-black uppercase tracking-wider text-purple-400 bg-purple-500/10 px-3 py-1 rounded-md font-mono border border-purple-500/20">
                {config.banner2.badge || '📸 FOTOS & ANÁLISES'}
              </span>
              <h2 className="text-2xl sm:text-3xl font-extrabold text-white tracking-tight uppercase font-display">
                {config.banner2.title}
              </h2>
              <p className="text-xs sm:text-sm text-zinc-400 font-light max-w-2xl">
                {config.banner2.subtitle}
              </p>
            </div>
            <span className="text-[11px] text-zinc-500 font-mono bg-zinc-900/60 px-3 py-1.5 rounded-lg border border-zinc-800 self-start sm:self-auto">
              ⚙️ Totalmente editável no Painel de Controlo sob "APIS & Excel"
            </span>
          </div>

          {/* Photo Grid */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {config.showcaseImages.map((img) => (
              <div 
                key={img.id}
                onClick={() => setSelectedImageModal(img.url)}
                className="group relative rounded-2xl overflow-hidden border border-zinc-800 bg-[#0E0F16] hover:border-cyan-500/50 transition-all duration-300 shadow-xl cursor-pointer flex flex-col"
              >
                <div className="relative h-52 w-full overflow-hidden bg-zinc-950">
                  {img.url && img.url.trim() !== '' ? (
                    <img 
                      src={img.url} 
                      alt={img.title}
                      referrerPolicy="no-referrer"
                      className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-105 opacity-90 group-hover:opacity-100"
                    />
                  ) : null}
                  <div className="absolute top-3 left-3 bg-black/70 backdrop-blur-md px-2.5 py-1 rounded-md text-[10px] font-bold text-cyan-300 font-mono border border-white/10 uppercase tracking-wider">
                    {img.tag}
                  </div>
                  <div className="absolute inset-0 bg-gradient-to-t from-[#0E0F16] via-transparent to-transparent opacity-80"></div>
                </div>

                <div className="p-5 space-y-2 flex-1 flex flex-col justify-between">
                  <div>
                    <h3 className="text-sm font-bold text-white group-hover:text-cyan-300 transition-colors">
                      {img.title}
                    </h3>
                    <p className="text-xs text-zinc-400 font-light leading-relaxed mt-1">
                      {img.subtitle}
                    </p>
                  </div>
                  <div className="pt-3 flex items-center justify-between text-[11px] text-zinc-500 font-mono border-t border-zinc-850/60">
                    <span>🔍 Clique para ampliar</span>
                    <span className="text-cyan-400">Ver detalhes →</span>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </section>

        {/* Modal de Zoom da Imagem */}
        {selectedImageModal && (
          <div 
            onClick={() => setSelectedImageModal(null)}
            className="fixed inset-0 z-50 bg-black/90 backdrop-blur-md flex items-center justify-center p-4 cursor-pointer"
          >
            <div className="relative max-w-4xl max-h-[90vh] rounded-2xl overflow-hidden border border-zinc-700 bg-zinc-950 p-2 shadow-2xl">
              <button
                onClick={() => setSelectedImageModal(null)}
                className="absolute top-4 right-4 bg-black/80 hover:bg-black text-white px-3 py-1.5 rounded-full text-xs font-mono font-bold border border-zinc-700"
              >
                ✕ Fechar
              </button>
              {selectedImageModal && selectedImageModal.trim() !== '' ? (
                <img 
                  src={selectedImageModal} 
                  alt="Zoom Análise"
                  referrerPolicy="no-referrer"
                  className="max-h-[82vh] w-auto object-contain rounded-xl"
                />
              ) : null}
            </div>
          </div>
        )}

        {/* =========================================================================
            ÁREA DE DOWNLOAD DO EXCEL E CHAVE API
        ========================================================================== */}
        <section id="excel-api-download-section" className="rounded-3xl border border-zinc-800 bg-gradient-to-b from-[#10121B] to-[#0B0C12] p-6 sm:p-10 space-y-8 shadow-2xl text-left">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-zinc-800/80 pb-6">
            <div className="space-y-1">
              <div className="inline-flex items-center gap-2 text-xs font-bold text-emerald-400 font-mono uppercase">
                <span>📁</span>
                <span>Ficheiros & Integrações Oficiais</span>
              </div>
              <h2 className="text-2xl sm:text-3xl font-extrabold text-white tracking-tight uppercase font-display">
                Download da Folha Excel & Chave API
              </h2>
              <p className="text-xs sm:text-sm text-zinc-400 font-light">
                {isUserActive 
                  ? 'A sua conta tem acesso aos dados oficiais. Descarregue a folha de cálculo ou integre a sua Chave de API.' 
                  : 'Preencha o formulário abaixo com o seu Nome e Email para desbloquear a sua chave e o ficheiro Excel.'}
              </p>
            </div>

            {/* Download Button */}
            <div>
              <button
                type="button"
                onClick={handleDownloadExcel}
                className="w-full sm:w-auto px-6 py-3.5 bg-gradient-to-r from-emerald-500 to-teal-600 hover:from-emerald-400 hover:to-teal-500 text-black font-black uppercase text-xs tracking-wider rounded-2xl shadow-xl shadow-emerald-500/20 transition-all cursor-pointer inline-flex items-center justify-center gap-2.5"
              >
                <span className="text-base">📊</span>
                <span>Descarregar Excel (.xlsx)</span>
                <span className="text-xs opacity-75 font-mono">[{config.settings.excelVersion}]</span>
              </button>
            </div>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
            
            {/* Left Col: Excel File Info Card */}
            <div className="lg:col-span-5 rounded-2xl border border-zinc-800/90 bg-[#0C0D14] p-6 space-y-5">
              <div className="flex items-center gap-3">
                <div className="w-12 h-12 rounded-xl bg-emerald-500/10 border border-emerald-500/30 flex items-center justify-center text-2xl text-emerald-400">
                  📑
                </div>
                <div>
                  <h3 className="text-sm font-bold text-white font-mono">
                    {config.settings.excelFilename}
                  </h3>
                  <span className="text-[11px] text-zinc-400">
                    Microsoft Excel Worksheet (.xlsx) • {config.settings.excelVersion}
                  </span>
                </div>
              </div>

              <p className="text-xs text-zinc-400 font-light leading-relaxed">
                {config.settings.excelDescription}
              </p>

              <div className="space-y-2.5 pt-2 text-xs text-zinc-300 font-mono">
                <div className="flex items-center justify-between py-1.5 border-b border-zinc-850">
                  <span className="text-zinc-500">Abas incluídas:</span>
                  <span className="text-emerald-400 font-semibold">Análises_Jogos, Modelo_Poisson, Como_Conectar</span>
                </div>
                <div className="flex items-center justify-between py-1.5 border-b border-zinc-850">
                  <span className="text-zinc-500">Fórmulas Dinâmicas:</span>
                  <span className="text-white">Sim (Poisson, Expected Value, xG)</span>
                </div>
                <div className="flex items-center justify-between py-1.5 border-b border-zinc-850">
                  <span className="text-zinc-500">Conexão Power Query:</span>
                  <span className="text-cyan-400">Pronta com a sua Chave API</span>
                </div>
              </div>

              <button
                type="button"
                onClick={handleDownloadExcel}
                className="w-full py-2.5 rounded-xl bg-zinc-800 hover:bg-zinc-700 text-white font-bold text-xs uppercase tracking-wider transition-all cursor-pointer flex items-center justify-center gap-2"
              >
                <span>💾 Baixar Ficheiro Agora</span>
              </button>
            </div>

            {/* Right Col: API Key Management & Code Samples */}
            <div className="lg:col-span-7 rounded-2xl border border-zinc-800/90 bg-[#0C0D14] p-6 space-y-5">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                <div className="flex items-center gap-2">
                  <span className="text-base">🔑</span>
                  <h3 className="text-sm font-bold text-white uppercase tracking-wide font-display">
                    Chave de Acesso API (API Key)
                  </h3>
                </div>
                <span className="text-[10px] font-mono text-cyan-400 bg-cyan-500/10 px-2.5 py-1 rounded-md border border-cyan-500/20">
                  {isUserActive ? 'STATUS: ATIVA & AUTORIZADA' : 'STATUS: PENDENTE REGISTO'}
                </span>
              </div>

              {/* API Key Box */}
              <div className="relative flex items-center">
                <input
                  type="text"
                  readOnly
                  value={userSessionApiKey || (currentUser?.email === 'morgado.aam@gmail.com' ? 'irb_live_morgado_7f8a92e104b' : 'Registe o seu Nome e Email abaixo para gerar a sua chave')}
                  className="w-full bg-[#08080C] border border-zinc-800 rounded-xl px-4 py-3 text-xs sm:text-sm font-mono text-cyan-300 focus:outline-none select-all pr-28"
                />
                <button
                  type="button"
                  onClick={handleCopyApiKey}
                  className="absolute right-2 px-3 py-1.5 rounded-lg bg-cyan-500/20 hover:bg-cyan-500/30 border border-cyan-500/40 text-cyan-300 font-mono text-xs font-bold transition-all cursor-pointer flex items-center gap-1.5"
                >
                  <span>{copiedKey ? '✓ Copiado!' : '📋 Copiar'}</span>
                </button>
              </div>

              {/* Code Integration Tabs */}
              <div className="space-y-3 pt-2">
                <div className="flex items-center justify-between">
                  <span className="text-[11px] text-zinc-400 font-mono uppercase tracking-wider">
                    Exemplo de Chamada:
                  </span>
                  <div className="flex items-center gap-1 bg-[#08080C] p-1 rounded-lg border border-zinc-850">
                    <button
                      onClick={() => setActiveCodeTab('curl')}
                      className={`px-2 py-0.5 rounded text-[10px] font-mono font-bold transition-colors ${activeCodeTab === 'curl' ? 'bg-cyan-500/20 text-cyan-300' : 'text-zinc-500 hover:text-zinc-300'}`}
                    >
                      cURL
                    </button>
                    <button
                      onClick={() => setActiveCodeTab('js')}
                      className={`px-2 py-0.5 rounded text-[10px] font-mono font-bold transition-colors ${activeCodeTab === 'js' ? 'bg-cyan-500/20 text-cyan-300' : 'text-zinc-500 hover:text-zinc-300'}`}
                    >
                      JavaScript
                    </button>
                    <button
                      onClick={() => setActiveCodeTab('python')}
                      className={`px-2 py-0.5 rounded text-[10px] font-mono font-bold transition-colors ${activeCodeTab === 'python' ? 'bg-cyan-500/20 text-cyan-300' : 'text-zinc-500 hover:text-zinc-300'}`}
                    >
                      Python
                    </button>
                    <button
                      onClick={() => setActiveCodeTab('excel')}
                      className={`px-2 py-0.5 rounded text-[10px] font-mono font-bold transition-colors ${activeCodeTab === 'excel' ? 'bg-cyan-500/20 text-cyan-300' : 'text-zinc-500 hover:text-zinc-300'}`}
                    >
                      Excel PowerQuery
                    </button>
                  </div>
                </div>

                <div className="bg-[#07070A] border border-zinc-850 rounded-xl p-3.5 font-mono text-[11px] text-zinc-300 overflow-x-auto">
                  {activeCodeTab === 'curl' && (
                    <code>
                      curl -X GET "https://irunbets.pt/api/v1/jogos" \<br />
                      &nbsp;&nbsp;-H "Authorization: Bearer {userSessionApiKey || 'irb_live_SUA_CHAVE'}" \<br />
                      &nbsp;&nbsp;-H "Accept: application/json"
                    </code>
                  )}
                  {activeCodeTab === 'js' && (
                    <code>
                      const res = await fetch("https://irunbets.pt/api/v1/jogos", &#123;<br />
                      &nbsp;&nbsp;headers: &#123; "Authorization": "Bearer {userSessionApiKey || 'irb_live_SUA_CHAVE'}" &#125;<br />
                      &#125;);<br />
                      const data = await res.json();
                    </code>
                  )}
                  {activeCodeTab === 'python' && (
                    <code>
                      import requests<br />
                      headers = &#123;"Authorization": "Bearer {userSessionApiKey || 'irb_live_SUA_CHAVE'}"&#125;<br />
                      data = requests.get("https://irunbets.pt/api/v1/jogos", headers=headers).json()
                    </code>
                  )}
                  {activeCodeTab === 'excel' && (
                    <code>
                      let<br />
                      &nbsp;&nbsp;Fonte = Json.Document(Web.Contents("https://irunbets.pt/api/v1/jogos", [Headers=[#"Authorization"="Bearer {userSessionApiKey || 'irb_live_SUA_CHAVE'}"]]))<br />
                      in<br />
                      &nbsp;&nbsp;Fonte
                    </code>
                  )}
                </div>
              </div>
            </div>

          </div>
        </section>

        {/* =========================================================================
            FORMULÁRIO DE REGISTO & AUTENTICAÇÃO SUPABASE COM CÓDIGO (OTP) OU LOGIN
        ========================================================================== */}
        <section id="registo-section" className="rounded-3xl border border-zinc-800 bg-[#0E0F17] p-8 sm:p-10 space-y-6 shadow-2xl text-left">
          
          {/* PAINEL DE SESSÃO ATIVA SE O UTILIZADOR JÁ ESTIVER RECONHECIDO OU FOR O FUNDADOR */}
          {isUserActive && userSessionApiKey && regStep !== 'otp' && (
            <div className="p-6 rounded-2xl bg-gradient-to-r from-emerald-950/40 via-[#0B1516] to-[#0E1322] border border-emerald-500/40 space-y-4 shadow-xl mb-4">
              <div className="flex flex-wrap items-center justify-between gap-3">
                <div className="flex items-center gap-2.5">
                  <span className="w-3 h-3 rounded-full bg-emerald-400 animate-pulse"></span>
                  <span className="text-[11px] font-mono font-black uppercase text-emerald-400 tracking-wider">
                    SESSÃO ATIVA NO SUPABASE (subscricoes_vendas & api_keys)
                  </span>
                </div>
                {email === FOUNDER_EMAIL && (
                  <span className="px-3 py-1 bg-amber-500/20 text-amber-300 border border-amber-500/30 rounded-lg text-[10px] font-mono font-black uppercase">
                    👑 Fundador VIP Vitalício
                  </span>
                )}
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 pt-2 text-xs font-mono">
                <div className="bg-[#08080C]/80 p-3 rounded-xl border border-zinc-800">
                  <span className="text-zinc-500 block text-[10px] uppercase">Titular da Conta:</span>
                  <span className="text-white font-bold text-sm truncate block">{nome || 'Administrador'}</span>
                </div>
                <div className="bg-[#08080C]/80 p-3 rounded-xl border border-zinc-800">
                  <span className="text-zinc-500 block text-[10px] uppercase">Email Registado:</span>
                  <span className="text-cyan-400 font-bold text-sm truncate block">{email || FOUNDER_EMAIL}</span>
                </div>
                <div className="bg-[#08080C]/80 p-3 rounded-xl border border-zinc-800">
                  <span className="text-zinc-500 block text-[10px] uppercase">Plano Ativo:</span>
                  <span className="text-emerald-400 font-bold text-sm truncate block">{activePlanName || 'Plano Pro Max VIP'}</span>
                </div>
                <div className="bg-[#08080C]/80 p-3 rounded-xl border border-zinc-800 flex items-center justify-between">
                  <div>
                    <span className="text-zinc-500 block text-[10px] uppercase">Estado:</span>
                    <span className="text-emerald-300 font-black">ATIVO • ILIMITADO</span>
                  </div>
                  <button
                    type="button"
                    onClick={handleCopyApiKey}
                    className="px-2.5 py-1.5 rounded-lg bg-zinc-800 hover:bg-zinc-700 text-[10px] text-zinc-300 transition-colors"
                  >
                    {copiedKey ? '✓ Copiado' : '📋 Copiar Key'}
                  </button>
                </div>
              </div>

              <div className="flex flex-wrap items-center justify-between gap-3 pt-2">
                <div className="text-[11px] text-zinc-400 font-mono">
                  🔑 Chave API Ativa: <code className="text-zinc-200 font-bold">{userSessionApiKey}</code>
                </div>
                <div className="flex items-center gap-2">
                  <a
                    href="#excel-api-download-section"
                    className="px-4 py-2 bg-emerald-500 hover:bg-emerald-400 text-black font-black uppercase text-[11px] tracking-wider rounded-xl transition-all shadow-md shadow-emerald-500/20"
                  >
                    Descarregar Folha Excel (.xlsx) ↓
                  </a>
                  <button
                    type="button"
                    onClick={() => {
                      setUserSessionApiKey('');
                      setRegStep('form');
                    }}
                    className="px-3 py-2 text-zinc-500 hover:text-zinc-300 text-[11px] font-mono underline"
                  >
                    Mudar de Conta
                  </button>
                </div>
              </div>
            </div>
          )}

          {/* STEP 1: FORMULÁRIO (Tabs: Registar OU Iniciar Sessão) */}
          {regStep === 'form' && (
            <div className="space-y-6">
              
              {/* Seletor de Modo: Registar ou Iniciar Sessão */}
              <div className="flex flex-wrap items-center justify-between gap-4 border-b border-zinc-850 pb-4">
                <div className="space-y-1">
                  <span className="text-[10px] font-black uppercase tracking-wider text-cyan-400 bg-cyan-500/10 px-3 py-1 rounded-md font-mono border border-cyan-500/20">
                    {authMode === 'register' ? '✍️ CRIAR CONTA & VALIDAÇÃO OTP' : '🔐 AUTENTICAÇÃO SUPABASE'}
                  </span>
                  <h2 className="text-2xl sm:text-3xl font-extrabold text-white tracking-tight uppercase font-display">
                    {authMode === 'register' ? 'Inscrição & Criação de Conta' : 'Iniciar Sessão Supabase'}
                  </h2>
                  <p className="text-xs sm:text-sm text-zinc-400 font-light max-w-3xl">
                    {authMode === 'register' 
                      ? 'Registe o seu Nome, Email e Palavra-passe. O Supabase enviará um código de 6 dígitos para validar o seu email antes de libertar a API e o ficheiro Excel.'
                      : 'Se já executou o script SQL no Supabase ou já tem conta criada, introduza as suas credenciais para recuperar a sua chave de API e subscrição.'}
                  </p>
                </div>

                <div className="flex p-1 bg-[#08080C] border border-zinc-800 rounded-2xl">
                  <button
                    type="button"
                    onClick={() => setAuthMode('register')}
                    className={`px-4 py-2 rounded-xl text-xs font-bold uppercase tracking-wider font-mono transition-all cursor-pointer ${
                      authMode === 'register'
                        ? 'bg-cyan-500 text-black shadow-md'
                        : 'text-zinc-400 hover:text-white'
                    }`}
                  >
                    Nova Inscrição
                  </button>
                  <button
                    type="button"
                    onClick={() => setAuthMode('login')}
                    className={`px-4 py-2 rounded-xl text-xs font-bold uppercase tracking-wider font-mono transition-all cursor-pointer ${
                      authMode === 'login'
                        ? 'bg-cyan-500 text-black shadow-md'
                        : 'text-zinc-400 hover:text-white'
                    }`}
                  >
                    Já Tenho Conta
                  </button>
                </div>
              </div>

              {/* MODO: LOGIN SUPABASE */}
              {authMode === 'login' && (
                <form onSubmit={handleLoginSubmit} className="space-y-6 pt-2">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                    <div className="space-y-2">
                      <label className="block text-xs font-bold uppercase tracking-wider text-zinc-300 font-mono">
                        Endereço de Email *
                      </label>
                      <input
                        type="email"
                        required
                        placeholder="Ex.: morgado.aam@gmail.com"
                        value={loginEmail}
                        onChange={(e) => setLoginEmail(e.target.value)}
                        className="w-full bg-[#08080C] border border-zinc-800 rounded-xl px-4 py-3 text-sm text-white placeholder-zinc-600 focus:outline-none focus:border-cyan-500 transition-colors font-sans"
                      />
                    </div>

                    <div className="space-y-2">
                      <label className="block text-xs font-bold uppercase tracking-wider text-zinc-300 font-mono">
                        Palavra-passe *
                      </label>
                      <div className="relative flex items-center">
                        <input
                          type={showLoginPassword ? 'text' : 'password'}
                          required
                          placeholder="A sua palavra-passe"
                          value={loginPassword}
                          onChange={(e) => setLoginPassword(e.target.value)}
                          className="w-full bg-[#08080C] border border-zinc-800 rounded-xl px-4 py-3 text-sm text-white placeholder-zinc-600 focus:outline-none focus:border-cyan-500 transition-colors font-sans pr-10"
                        />
                        <button
                          type="button"
                          onClick={() => setShowLoginPassword(!showLoginPassword)}
                          className="absolute right-3 text-zinc-500 hover:text-white transition-colors cursor-pointer text-sm"
                          title={showLoginPassword ? 'Ocultar' : 'Mostrar'}
                        >
                          {showLoginPassword ? '🙈' : '👁️'}
                        </button>
                      </div>
                    </div>
                  </div>

                  <div className="flex flex-col sm:flex-row items-center justify-between gap-4 pt-4 border-t border-zinc-850">
                    <div className="text-xs text-zinc-500 font-mono">
                      ⚡ Sincronização direta com as tabelas <code className="text-zinc-400">subscricoes_vendas</code> e <code className="text-zinc-400">api_keys</code>.
                    </div>
                    <button
                      type="submit"
                      disabled={isLoggingIn}
                      className="w-full sm:w-auto px-8 py-3.5 bg-gradient-to-r from-cyan-500 to-blue-600 hover:from-cyan-400 hover:to-blue-500 disabled:opacity-50 text-black font-black uppercase text-xs tracking-wider rounded-2xl shadow-xl shadow-cyan-500/20 transition-all cursor-pointer flex items-center justify-center gap-2"
                    >
                      {isLoggingIn ? (
                        <span>A autenticar no Supabase...</span>
                      ) : (
                        <>
                          <span>Entrar & Carregar Chave API</span>
                          <span>→</span>
                        </>
                      )}
                    </button>
                  </div>
                </form>
              )}

              {/* MODO: REGISTO COM CÓDIGO OTP */}
              {authMode === 'register' && (
                <form onSubmit={handleRegisterSubmit} className="space-y-6 pt-2">
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
                    
                    {/* Campo 1: Nome */}
                    <div className="space-y-2">
                      <label className="block text-xs font-bold uppercase tracking-wider text-zinc-300 font-mono">
                        1. Nome Completo *
                      </label>
                      <input
                        type="text"
                        required
                        placeholder="Ex.: Membro VIP"
                        value={nome}
                        onChange={(e) => setNome(e.target.value)}
                        className="w-full bg-[#08080C] border border-zinc-800 rounded-xl px-4 py-3 text-sm text-white placeholder-zinc-600 focus:outline-none focus:border-cyan-500 transition-colors font-sans"
                      />
                    </div>

                    {/* Campo 2: Email */}
                    <div className="space-y-2">
                      <label className="block text-xs font-bold uppercase tracking-wider text-zinc-300 font-mono">
                        2. Endereço de Email *
                      </label>
                      <input
                        type="email"
                        required
                        placeholder="Ex.: seu.email@exemplo.com"
                        value={email}
                        onChange={(e) => setEmail(e.target.value)}
                        className="w-full bg-[#08080C] border border-zinc-800 rounded-xl px-4 py-3 text-sm text-white placeholder-zinc-600 focus:outline-none focus:border-cyan-500 transition-colors font-sans"
                      />
                    </div>

                    {/* Campo 3: Password */}
                    <div className="space-y-2">
                      <label className="block text-xs font-bold uppercase tracking-wider text-zinc-300 font-mono">
                        3. Palavra-passe *
                      </label>
                      <div className="relative flex items-center">
                        <input
                          type={showPassword ? 'text' : 'password'}
                          required
                          minLength={6}
                          placeholder="Mínimo 6 caracteres"
                          value={password}
                          onChange={(e) => setPassword(e.target.value)}
                          className="w-full bg-[#08080C] border border-zinc-800 rounded-xl px-4 py-3 text-sm text-white placeholder-zinc-600 focus:outline-none focus:border-cyan-500 transition-colors font-sans pr-10"
                        />
                        <button
                          type="button"
                          onClick={() => setShowPassword(!showPassword)}
                          className="absolute right-3 text-zinc-500 hover:text-white transition-colors cursor-pointer text-sm"
                          title={showPassword ? 'Ocultar palavra-passe' : 'Mostrar palavra-passe'}
                        >
                          {showPassword ? '🙈' : '👁️'}
                        </button>
                      </div>
                    </div>

                  </div>

                  {/* Seleção do Plano */}
                  <div className="space-y-2">
                    <label className="block text-xs font-bold uppercase tracking-wider text-zinc-300 font-mono">
                      4. Selecione o Plano Pretendido
                    </label>
                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
                      {config.plans.filter(p => p.active !== false).map((plan) => (
                        <button
                          type="button"
                          key={plan.codigo_plano}
                          onClick={() => setSelectedPlanCode(plan.codigo_plano)}
                          className={`p-4 rounded-xl border text-left transition-all cursor-pointer flex flex-col justify-between ${
                            selectedPlanCode === plan.codigo_plano
                              ? 'bg-cyan-500/10 border-cyan-500 text-white shadow-lg shadow-cyan-500/10'
                              : 'bg-[#08080C] border-zinc-800 text-zinc-400 hover:border-zinc-700 hover:text-white'
                          }`}
                        >
                          <div className="flex items-center justify-between">
                            <span className="text-xs font-bold font-mono">{plan.nome_comercial}</span>
                            {plan.isPopular && (
                              <span className="text-[9px] font-bold uppercase bg-amber-500/20 text-amber-300 px-1.5 py-0.5 rounded">
                                Popular
                              </span>
                            )}
                          </div>
                          <div className="mt-2">
                            <span className="text-lg font-black text-white font-mono">
                              {plan.preco_mensal === 0 ? 'Grátis' : `${plan.preco_mensal.toFixed(2)} €`}
                            </span>
                            <span className="text-[11px] text-zinc-500"> / mês</span>
                          </div>
                          <div className="text-[10px] text-zinc-500 font-mono mt-1">
                            {plan.limite_requisicoes_dia.toLocaleString()} req/dia
                          </div>
                        </button>
                      ))}
                    </div>
                  </div>

                  <div className="flex flex-col sm:flex-row items-center justify-between gap-4 pt-4 border-t border-zinc-850">
                    <div className="text-xs text-zinc-500 font-mono flex items-center gap-1.5">
                      <span>🛡️</span>
                      <span>No passo seguinte receberá o código de segurança de 6 dígitos no seu email.</span>
                    </div>
                    <button
                      type="submit"
                      disabled={isSubmitting}
                      className="w-full sm:w-auto px-8 py-3.5 bg-gradient-to-r from-cyan-500 to-blue-600 hover:from-cyan-400 hover:to-blue-500 disabled:opacity-50 text-black font-black uppercase text-xs tracking-wider rounded-2xl shadow-xl shadow-cyan-500/20 transition-all cursor-pointer flex items-center justify-center gap-2"
                    >
                      {isSubmitting ? (
                        <span>A preparar código de segurança...</span>
                      ) : (
                        <>
                          <span>Continuar & Enviar Código por Email</span>
                          <span>→</span>
                        </>
                      )}
                    </button>
                  </div>
                </form>
              )}
            </div>
          )}

          {/* STEP 2: ECRÃ DE VALIDAÇÃO DO CÓDIGO DE SEGURANÇA (OTP) */}
          {regStep === 'otp' && (
            <div className="space-y-6 max-w-2xl mx-auto py-4 animate-fade-in">
              <div className="text-center space-y-2">
                <div className="w-16 h-16 rounded-2xl bg-cyan-500/10 border border-cyan-500/30 flex items-center justify-center mx-auto text-2xl text-cyan-400 mb-3 shadow-lg shadow-cyan-500/10">
                  🛡️
                </div>
                <span className="text-[10px] font-black uppercase tracking-wider text-cyan-400 bg-cyan-500/10 px-3 py-1 rounded-md font-mono border border-cyan-500/20">
                  ETAPA 2: CÓDIGO DE SEGURANÇA OTP
                </span>
                <h2 className="text-2xl sm:text-3xl font-extrabold text-white tracking-tight uppercase font-display">
                  Validar Endereço de Email
                </h2>
                <p className="text-xs sm:text-sm text-zinc-300 font-light">
                  Enviámos um código de segurança de 6 dígitos para o endereço <strong className="text-cyan-400 font-mono">{email}</strong>.
                </p>
              </div>

              {/* Demo Mode Notice */}
              {demoNotice && (
                <div className="p-3.5 bg-cyan-950/40 border border-cyan-500/40 rounded-xl text-cyan-200 text-xs font-mono text-center shadow-lg">
                  <span className="font-bold">💡 Modo de Teste:</span> {demoNotice}
                </div>
              )}

              <form onSubmit={handleVerifyOtpSubmit} className="space-y-6">
                <div className="space-y-2 text-center">
                  <label className="block text-xs font-bold uppercase tracking-wider text-zinc-400 font-mono">
                    Introduza o Código de 6 Dígitos
                  </label>
                  <input
                    type="text"
                    required
                    maxLength={6}
                    autoFocus
                    placeholder="000000"
                    value={otpToken}
                    onChange={(e) => setOtpToken(e.target.value.replace(/\D/g, '').slice(0, 6))}
                    className="w-64 mx-auto text-center tracking-[0.5em] text-3xl font-mono font-black bg-[#08080C] border-2 border-cyan-500/60 focus:border-cyan-400 rounded-2xl py-3 text-cyan-300 focus:outline-none shadow-xl shadow-cyan-500/10 transition-all block"
                  />
                  <span className="text-[11px] text-zinc-500 font-mono block pt-1">
                    Exemplo recebido na caixa de correio: 6 números
                  </span>
                </div>

                <div className="flex flex-col sm:flex-row items-center justify-center gap-3">
                  <button
                    type="submit"
                    disabled={isVerifyingOtp || otpToken.length < 6}
                    className="w-full sm:w-auto px-8 py-3.5 bg-gradient-to-r from-emerald-500 to-teal-500 hover:from-emerald-400 hover:to-teal-400 disabled:opacity-40 text-black font-black uppercase text-xs tracking-wider rounded-2xl shadow-xl shadow-emerald-500/20 transition-all cursor-pointer flex items-center justify-center gap-2"
                  >
                    {isVerifyingOtp ? (
                      <span>A validar código...</span>
                    ) : (
                      <>
                        <span>✓ Confirmar Código & Ativar Conta</span>
                        <span>→</span>
                      </>
                    )}
                  </button>

                  <button
                    type="button"
                    onClick={() => setRegStep('form')}
                    className="px-5 py-3.5 rounded-2xl border border-zinc-800 text-zinc-400 hover:text-white text-xs font-bold uppercase tracking-wider transition-colors cursor-pointer"
                  >
                    ← Corrigir Dados
                  </button>
                </div>

                {/* Resend OTP Section */}
                <div className="pt-4 border-t border-zinc-850 text-center space-y-2">
                  <p className="text-xs text-zinc-500">
                    Não recebeu o código? Verifique a pasta de <strong>Spam / Lixo eletrónico</strong>.
                  </p>
                  <div>
                    {otpCountdown > 0 ? (
                      <span className="text-xs text-zinc-500 font-mono">
                        Poderá reenviar novo código em <strong className="text-zinc-300">{otpCountdown}s</strong>
                      </span>
                    ) : (
                      <button
                        type="button"
                        onClick={handleResendOtp}
                        disabled={isResendingOtp}
                        className="text-xs font-mono font-bold text-cyan-400 hover:text-cyan-300 underline cursor-pointer"
                      >
                        {isResendingOtp ? 'A reenviar...' : 'Reenviar código de segurança agora'}
                      </button>
                    )}
                  </div>
                </div>
              </form>
            </div>
          )}

          {/* STEP 3: SUCESSO & ATIVAÇÃO COMPLETA */}
          {regStep === 'success' && (
            <div className="space-y-6 max-w-2xl mx-auto py-4 text-center animate-fade-in">
              <div className="w-16 h-16 rounded-2xl bg-emerald-500/10 border border-emerald-500/30 flex items-center justify-center mx-auto text-2xl text-emerald-400 shadow-lg shadow-emerald-500/10">
                🎉
              </div>
              <span className="text-[10px] font-black uppercase tracking-wider text-emerald-400 bg-emerald-500/10 px-3 py-1 rounded-md font-mono border border-emerald-500/20">
                EMAIL VALIDADO COM SUCESSO
              </span>
              <h2 className="text-2xl sm:text-3xl font-extrabold text-white tracking-tight uppercase font-display">
                Conta & Subscrição Ativadas!
              </h2>
              <p className="text-xs sm:text-sm text-zinc-300 font-light">
                O seu email <strong>{email}</strong> foi verificado com o código de segurança. A sua chave API foi gerada e o download da folha Excel está agora disponível.
              </p>

              <div className="p-4 bg-[#08080C] border border-zinc-800 rounded-2xl text-left space-y-2 text-xs font-mono">
                <div className="flex justify-between">
                  <span className="text-zinc-500">Utilizador:</span>
                  <span className="text-white font-bold">{nome}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-zinc-500">Email:</span>
                  <span className="text-cyan-400">{email}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-zinc-500">Plano Ativo:</span>
                  <span className="text-emerald-400 font-bold">{activePlanName || selectedPlanCode}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-zinc-500">Chave API:</span>
                  <span className="text-zinc-300 font-bold select-all">{userSessionApiKey}</span>
                </div>
              </div>

              <div className="flex flex-wrap items-center justify-center gap-3 pt-2">
                <a
                  href="#excel-api-download-section"
                  className="px-6 py-3.5 rounded-2xl bg-gradient-to-r from-emerald-500 to-teal-500 hover:from-emerald-400 hover:to-teal-400 text-black font-black uppercase text-xs tracking-wider shadow-lg shadow-emerald-500/20 transition-all cursor-pointer inline-flex items-center gap-2"
                >
                  <span>📊 Aceder ao Download do Excel (.xlsx)</span>
                  <span>↓</span>
                </a>
                <button
                  type="button"
                  onClick={() => setRegStep('form')}
                  className="px-5 py-3.5 rounded-2xl border border-zinc-800 text-zinc-400 hover:text-white text-xs font-bold uppercase tracking-wider transition-colors cursor-pointer"
                >
                  Registar Nova Conta
                </button>
              </div>
            </div>
          )}

        </section>

        {/* =========================================================================
            PLANOS & PREÇOS (CONFORME IMAGEM DO SUPABASE `planos_precos`)
        ========================================================================== */}
        <section id="planos-section" className="space-y-6 text-left">
          <div className="text-center max-w-3xl mx-auto space-y-2">
            <span className="text-[10px] font-black uppercase tracking-wider text-amber-400 bg-amber-500/10 px-3 py-1 rounded-md font-mono border border-amber-500/20">
              💎 TABELA DE PLANOS & SUBSCRIÇÕES
            </span>
            <h2 className="text-2xl sm:text-4xl font-extrabold text-white tracking-tight uppercase font-display">
              Escolha a Escala Certa Para o Seu Modelo
            </h2>
            <p className="text-xs sm:text-sm text-zinc-400 font-light">
              Os planos estão mapeados na tabela <code className="text-cyan-400 font-mono">planos_precos</code> do Supabase e são totalmente editáveis no Backoffice.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 pt-4">
            {config.plans.filter(p => p.active !== false).map((plan) => (
              <div
                key={plan.codigo_plano}
                className={`relative rounded-3xl p-6 flex flex-col justify-between transition-all duration-300 ${
                  plan.isPopular
                    ? 'bg-gradient-to-b from-[#141829] to-[#0D0F18] border-2 border-cyan-500/80 shadow-2xl shadow-cyan-500/10 scale-[1.02]'
                    : 'bg-[#0D0E15] border border-zinc-800 hover:border-zinc-700'
                }`}
              >
                {plan.isPopular && (
                  <div className="absolute -top-3.5 left-1/2 -translate-x-1/2 bg-gradient-to-r from-cyan-500 to-blue-600 text-black font-extrabold text-[10px] uppercase font-mono px-3.5 py-1 rounded-full shadow-lg">
                    ★ Mais Recomendado
                  </div>
                )}

                <div className="space-y-4">
                  <div>
                    <span className="text-[10px] font-mono text-zinc-500 font-bold uppercase">
                      CÓDIGO: {plan.codigo_plano}
                    </span>
                    <h3 className="text-lg font-bold text-white mt-1">
                      {plan.nome_comercial}
                    </h3>
                    <p className="text-xs text-zinc-400 font-light mt-1 min-h-[32px]">
                      {plan.descricao}
                    </p>
                  </div>

                  <div className="py-2 border-y border-zinc-800/80">
                    <div className="flex items-baseline gap-1">
                      <span className="text-3xl font-black text-white font-mono">
                        {plan.preco_mensal === 0 ? '0.00' : plan.preco_mensal.toFixed(2)}
                      </span>
                      <span className="text-sm font-bold text-zinc-400">€ / mês</span>
                    </div>
                    <div className="text-[11px] text-cyan-400 font-mono mt-1 font-semibold">
                      ⚡ Até {plan.limite_requisicoes_dia.toLocaleString()} requisições / dia
                    </div>
                  </div>

                  <ul className="space-y-2 text-xs text-zinc-300 font-light">
                    {plan.features.map((feat, idx) => (
                      <li key={idx} className="flex items-start gap-2">
                        <span className="text-emerald-400 font-bold">✓</span>
                        <span>{feat}</span>
                      </li>
                    ))}
                  </ul>
                </div>

                <div className="pt-6 mt-6 border-t border-zinc-850">
                  <button
                    type="button"
                    onClick={() => {
                      setSelectedPlanCode(plan.codigo_plano);
                      const regEl = document.getElementById('registo-section');
                      if (regEl) regEl.scrollIntoView({ behavior: 'smooth' });
                    }}
                    className={`w-full py-3 rounded-xl font-extrabold text-xs uppercase tracking-wider transition-all cursor-pointer ${
                      plan.isPopular
                        ? 'bg-cyan-500 hover:bg-cyan-400 text-black shadow-lg shadow-cyan-500/20'
                        : 'bg-zinc-800 hover:bg-zinc-700 text-white'
                    }`}
                  >
                    {selectedPlanCode === plan.codigo_plano ? '✓ Plano Selecionado' : 'Subscrever Este Plano'}
                  </button>
                </div>
              </div>
            ))}
          </div>
        </section>

        {/* Footer Note */}
        <div className="text-center pt-8 border-t border-zinc-850 text-xs text-zinc-500 font-mono space-y-1">
          <div>iRunBets • Portal de Dados Estatísticos & Feed de APIs 2026</div>
          <div>Preparado para sincronização em tempo real com Supabase (<code className="text-zinc-400">ksqevxtnuyzrfohkgvfw</code>)</div>
        </div>

      </div>
    </div>
  );
};
