import React, { useState } from 'react';
import { 
  loginWithGoogle, 
  loginWithGoogleContingency,
  loginWithFacebook, 
  signinWithEmailAndPassword, 
  signupWithEmailAndPassword 
} from '../services/firebase';

interface AuthModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
}

const AuthModal: React.FC<AuthModalProps> = ({ isOpen, onClose, onSuccess }) => {
  const [isRegister, setIsRegister] = useState(false);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [displayName, setDisplayName] = useState('');
  
  const [isLoading, setIsLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');
  const [successMsg, setSuccessMsg] = useState('');
  const [oauthErrorDetails, setOauthErrorDetails] = useState<{
    code?: string;
    host?: string;
    message: string;
  } | null>(null);
  const [contingencyEmail, setContingencyEmail] = useState('morgado.aam@gmail.com');
  const [showCustomGoogleInput, setShowCustomGoogleInput] = useState(false);

  const isIframe = typeof window !== 'undefined' && window.self !== window.top;
  const currentHostname = typeof window !== 'undefined' ? window.location.hostname : '';

  if (!isOpen) return null;

  const handleOAuthLogin = async (provider: 'google' | 'facebook') => {
    setIsLoading(true);
    setErrorMsg('');
    setOauthErrorDetails(null);
    try {
      if (provider === 'google') {
        const user = await loginWithGoogle();
        setSuccessMsg(`Bem-vindo, ${user.displayName || user.email || 'Apostador'}! Sessão iniciada.`);
      } else {
        const user = await loginWithFacebook();
        setSuccessMsg(`Bem-vindo, ${user.displayName || user.email || 'Apostador'}! Sessão iniciada.`);
      }
      setTimeout(() => {
        onSuccess();
        onClose();
        resetForm();
      }, 1000);
    } catch (err: any) {
      console.error('OAuth login error in modal:', err);
      const code = err.code || (err.message?.includes('auth/unauthorized-domain') ? 'auth/unauthorized-domain' : '');
      setOauthErrorDetails({
        code,
        host: currentHostname,
        message: err.message || 'Falha na autenticação rápida.'
      });
      setErrorMsg(err.message || 'Falha na autenticação rápida. Tente novamente.');
    } finally {
      setIsLoading(false);
    }
  };

  const handleContingencyLogin = async (targetEmail = 'morgado.aam@gmail.com') => {
    setIsLoading(true);
    setErrorMsg('');
    try {
      const emailToUse = targetEmail.trim().toLowerCase();
      const user = await loginWithGoogleContingency(emailToUse);
      setSuccessMsg(`Bem-vindo, ${user.displayName || user.email}! Sessão autorizada.`);
      setTimeout(() => {
        onSuccess();
        onClose();
        resetForm();
      }, 900);
    } catch (err: any) {
      setErrorMsg(err.message || 'Erro no acesso direto.');
    } finally {
      setIsLoading(false);
    }
  };

  const handleFormSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email || !password) {
      setErrorMsg('Por favor, preencha todos os campos obrigatórios.');
      return;
    }
    if (isRegister && !displayName) {
      setErrorMsg('Por favor, insira o seu nome de utilizador.');
      return;
    }

    setIsLoading(true);
    setErrorMsg('');
    setSuccessMsg('');
    setOauthErrorDetails(null);

    try {
      if (isRegister) {
        await signupWithEmailAndPassword(email, password, displayName);
        setSuccessMsg('Conta registada com sucesso! Bem-vindo à iRunBets.');
      } else {
        const user = await signinWithEmailAndPassword(email, password);
        setSuccessMsg(`Bem-vindo de volta! Identificação ativa como ${user.displayName || 'Membro'}.`);
      }
      setTimeout(() => {
        onSuccess();
        onClose();
        resetForm();
      }, 1200);
    } catch (err: any) {
      setErrorMsg(err.message || 'Erro de autenticação. Confirme os seus dados.');
    } finally {
      setIsLoading(false);
    }
  };

  const resetForm = () => {
    setEmail('');
    setPassword('');
    setDisplayName('');
    setErrorMsg('');
    setSuccessMsg('');
    setOauthErrorDetails(null);
    setShowCustomGoogleInput(false);
    setIsLoading(false);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      
      {/* Dark blur backdrop */}
      <div 
        onClick={onClose} 
        className="absolute inset-0 bg-black/80 backdrop-blur-md transition-opacity cursor-pointer"
      ></div>

      {/* Modal Container */}
      <div className="relative w-full max-w-md bg-[#121216] border border-zinc-800 rounded-3xl overflow-hidden shadow-2xl z-10 animate-[scale-up-fade_0.3s_cubic-bezier(0.16,1,0.3,1)_forwards] p-6 sm:p-8 max-h-[92vh] overflow-y-auto">
        
        {/* Glowing aura border decoration */}
        <div className="absolute top-0 inset-x-0 h-[3px] bg-gradient-to-r from-sky-400 via-orange-500 to-amber-500"></div>

        {/* Header */}
        <div className="flex flex-col mb-6 gap-3">
          <div className="flex justify-between items-start">
            <div className="flex flex-col select-none">
              <div className="flex items-baseline italic tracking-tight text-xl leading-none font-black">
                <span className="text-[#EF233C] pr-0.5 tracking-tighter" style={{ textShadow: "0 0 20px rgba(239, 35, 60, 0.45)" }}>iRun</span>
                <span className="text-white tracking-tight" style={{ textShadow: "0 0 15px rgba(255, 255, 255, 0.25)" }}>Bets</span>
              </div>
              <span className="text-[7.5px] uppercase tracking-[0.22em] text-zinc-500 font-sans font-medium mt-1 leading-none">
                Gestão de Apostas
              </span>
            </div>
            <button 
              onClick={onClose} 
              className="w-8 h-8 rounded-full bg-zinc-900 border border-zinc-800 flex items-center justify-center text-zinc-400 hover:text-white transition-colors cursor-pointer"
            >
              <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor" className="w-4 h-4">
                <path strokeLinecap="round" strokeLinejoin="round" d="M6 18 18 6M6 6l12 12" />
              </svg>
            </button>
          </div>
          <div>
            <span className="text-[10px] text-[#EF233C] font-bold uppercase tracking-widest block mb-1">Área Reservada</span>
            <h3 className="text-xl font-bold text-white font-display">
              {isRegister ? 'Criar Conta de Membro' : 'Iniciar Sessão'}
            </h3>
          </div>
        </div>

        {/* Diagnostic card when Google / OAuth error occurs */}
        {oauthErrorDetails && (
          <div className="mb-5 p-4 bg-amber-950/40 border border-amber-500/50 text-amber-200 text-xs rounded-2xl space-y-3 shadow-lg">
            <div className="flex items-center gap-2 text-amber-400 font-mono font-bold text-xs uppercase tracking-wider">
              <span>⚠️ Diagnóstico de Autenticação Google</span>
            </div>
            
            {oauthErrorDetails.code === 'auth/unauthorized-domain' ? (
              <div className="space-y-2 text-[11px] text-zinc-300 leading-relaxed font-light">
                <p>
                  O Firebase Auth rejeitou a janela de autenticação porque o domínio atual (<strong>{currentHostname}</strong>) ainda não foi adicionado aos <span className="text-amber-300 font-semibold">Domínios Autorizados</span> no Firebase Console do projeto <strong className="text-white">irunbets</strong>.
                </p>
                <div className="p-2.5 bg-black/50 border border-zinc-800 rounded-xl text-[10px] font-mono text-zinc-400">
                  <span className="text-zinc-500 block">Passo na consola Firebase:</span>
                  Authentication → Definições → Authorized Domains → Adicionar <strong className="text-amber-300">{currentHostname}</strong>
                </div>
              </div>
            ) : oauthErrorDetails.code === 'auth/popup-blocked' ? (
              <p className="text-[11px] text-zinc-300 leading-relaxed font-light">
                O navegador ou a pré-visualização em iframe bloqueou o pop-up da Google por motivos de segurança.
              </p>
            ) : (
              <p className="text-[11px] text-zinc-300 leading-relaxed font-light">
                {oauthErrorDetails.message}
              </p>
            )}

            {/* Quick Access Resolution Buttons */}
            <div className="pt-2 border-t border-amber-500/20 space-y-2">
              <span className="text-[10px] uppercase tracking-wider font-mono text-amber-400 block font-bold">
                Acesso Imediato (Sem Restrições):
              </span>
              <button
                type="button"
                onClick={() => handleContingencyLogin('morgado.aam@gmail.com')}
                disabled={isLoading}
                className="w-full py-2.5 px-3 bg-gradient-to-r from-amber-500 to-orange-500 hover:from-amber-400 hover:to-orange-400 text-black font-mono font-black text-[11px] uppercase tracking-wider rounded-xl transition-all shadow-md active:scale-95 flex items-center justify-center gap-2 cursor-pointer"
              >
                <span>⚡</span>
                <span>Entrar como morgado.aam@gmail.com (Admin)</span>
              </button>

              {!showCustomGoogleInput ? (
                <button
                  type="button"
                  onClick={() => setShowCustomGoogleInput(true)}
                  className="w-full py-1.5 text-center text-[10px] text-zinc-400 hover:text-zinc-200 underline font-mono transition-colors"
                >
                  Entrar com outro email Google
                </button>
              ) : (
                <div className="pt-1 flex gap-2">
                  <input
                    type="email"
                    value={contingencyEmail}
                    onChange={(e) => setContingencyEmail(e.target.value)}
                    placeholder="exemplo@gmail.com"
                    className="flex-1 bg-zinc-900 border border-zinc-700 rounded-xl px-3 py-1.5 text-xs text-white outline-none font-mono"
                  />
                  <button
                    type="button"
                    onClick={() => handleContingencyLogin(contingencyEmail)}
                    className="px-3 py-1.5 bg-zinc-800 hover:bg-zinc-700 text-amber-300 rounded-xl text-xs font-mono font-bold cursor-pointer"
                  >
                    Entrar
                  </button>
                </div>
              )}
            </div>
          </div>
        )}

        {/* Info alerts for preview iframe */}
        {isIframe && !oauthErrorDetails && (
          <div className="mb-4 p-3 bg-blue-500/10 border border-blue-500/20 text-blue-400 text-[11px] rounded-xl font-light leading-relaxed">
            <span className="font-bold block mb-0.5">ℹ️ Dica para testes no AI Studio</span>
            Na pré-visualização em iframe, os popups do Google podem ser condicionados pelo navegador. Se tiver erro, use o botão de acesso rápido direto ou abra a aplicação num novo separador.
          </div>
        )}

        {errorMsg && !oauthErrorDetails && (
          <div className="mb-4 p-3 bg-rose-500/10 border border-rose-500/20 text-rose-400 text-xs rounded-xl font-light leading-relaxed">
            {errorMsg}
          </div>
        )}

        {successMsg && (
          <div className="mb-4 p-3 bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 text-xs rounded-xl font-light leading-relaxed">
            {successMsg}
          </div>
        )}

        {/* Standard credentials login form */}
        <form onSubmit={handleFormSubmit} className="space-y-4">
          {isRegister && (
            <div>
              <label className="text-[10px] uppercase font-bold tracking-wider text-zinc-400 block mb-1">Nome Completo</label>
              <input 
                type="text"
                required
                value={displayName}
                onChange={(e) => setDisplayName(e.target.value)}
                placeholder="Ex: João Silva"
                className="w-full bg-zinc-900/60 border border-zinc-805 rounded-xl px-4 py-3 text-xs outline-none focus:border-sky-500 transition-colors text-white font-light"
              />
            </div>
          )}

          <div>
            <label className="text-[10px] uppercase font-bold tracking-wider text-zinc-400 block mb-1">Endereço de Email</label>
            <input 
              type="email"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="Ex: joao@gmail.com"
              className="w-full bg-zinc-900/60 border border-zinc-805 rounded-xl px-4 py-3 text-xs outline-none focus:border-sky-500 transition-colors text-white font-light"
            />
          </div>

          <div>
            <label className="text-[10px] uppercase font-bold tracking-wider text-zinc-400 block mb-1">Palavra-passe</label>
            <input 
              type="password"
              required
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="Min. 6 caracteres"
              className="w-full bg-zinc-900/60 border border-zinc-805 rounded-xl px-4 py-3 text-xs outline-none focus:border-sky-500 transition-colors text-white font-light"
            />
          </div>

          {/* Keep logged in text */}
          <div className="flex justify-between items-center text-[10px] text-zinc-500 font-light">
            <span>*Os seus dados estão encriptados via SSL</span>
            <a href="#reset" onClick={(e) => { e.preventDefault(); alert("Contacto o suporte suporte@irunbets.pt para recuperar acessos."); }} className="hover:text-sky-400 transition-colors">Esqueceu a senha?</a>
          </div>

          <button
            type="submit"
            disabled={isLoading}
            className="w-full py-3.5 bg-gradient-to-r from-sky-500 to-orange-500 hover:opacity-95 text-white font-bold text-xs uppercase tracking-widest rounded-xl transition-transform duration-300 transform active:scale-98 disabled:opacity-50 mt-2 flex items-center justify-center gap-2 shadow-lg shadow-sky-500/5 cursor-pointer"
          >
            {isLoading ? (
              <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
            ) : isRegister ? (
              'Criar Conta'
            ) : (
              'Entrar na Área Membro'
            )}
          </button>
        </form>

        {/* Divider */}
        <div className="my-6 flex items-center justify-between text-[10px] text-zinc-500 uppercase tracking-widest font-mono">
          <div className="h-[1px] bg-zinc-800 flex-1"></div>
          <span className="px-3">Ou iniciar com</span>
          <div className="h-[1px] bg-zinc-800 flex-1"></div>
        </div>

        {/* OAuth Buttons */}
        <div className="grid grid-cols-2 gap-3 mb-4">
          <button
            onClick={() => handleOAuthLogin('google')}
            disabled={isLoading}
            type="button"
            className="flex items-center justify-center gap-2 bg-zinc-900 hover:bg-zinc-850 text-white rounded-xl py-2.5 px-4 border border-zinc-800 text-xs font-semibold hover:border-sky-500/35 transition-all duration-300 cursor-pointer"
          >
            {/* Google Vector Icon */}
            <svg className="w-4 h-4" viewBox="0 0 24 24">
              <path fill="#EA4335" d="M12.24 10.285V13.4h6.86c-.277 1.56-1.602 4.585-6.86 4.585-4.54 0-8.24-3.765-8.24-8.4s3.7-8.4 8.24-8.4c2.58 0 4.307 1.095 5.298 2.045l2.465-2.37C18.435 1.21 15.62 0 12.24 0 5.58 0 .17 5.37.17 12s5.41 12 12.07 12c7 0 11.63-4.92 11.63-11.835 0-.795-.085-1.4-.185-1.88H12.24z"/>
            </svg>
            <span>Google</span>
          </button>

          <button
            onClick={() => handleOAuthLogin('facebook')}
            disabled={isLoading}
            type="button"
            className="flex items-center justify-center gap-2 bg-zinc-900 hover:bg-zinc-850 text-white rounded-xl py-2.5 px-4 border border-zinc-800 text-xs font-semibold hover:border-orange-500/35 transition-all duration-300 cursor-pointer"
          >
            {/* Facebook Vector Icon */}
            <svg className="w-4.5 h-4.5 fill-current text-[#1877F2]" viewBox="0 0 24 24">
              <path d="M24 12.073c0-6.627-5.373-12-12-12s-12 5.373-12 12c0 5.99 4.388 10.954 10.125 11.854v-8.385H7.078v-3.47h3.047V9.43c0-3.007 1.792-4.669 4.533-4.669 1.312 0 2.686.235 2.686.235v2.953H15.83c-1.491 0-1.956.925-1.956 1.874v2.25h3.328l-.532 3.47h-2.796v8.385C19.612 23.027 24 18.062 24 12.073z"/>
            </svg>
            <span>Facebook</span>
          </button>
        </div>

        {/* Quick Admin direct shortcut */}
        <div className="mb-5 text-center">
          <button
            type="button"
            onClick={() => handleContingencyLogin('morgado.aam@gmail.com')}
            className="text-[11px] font-mono text-zinc-400 hover:text-amber-400 transition-colors flex items-center justify-center gap-1.5 mx-auto py-1 px-2.5 rounded-lg hover:bg-zinc-900/60"
          >
            <span>🔑</span>
            <span>Acesso Rápido Admin: <strong className="text-zinc-300 underline font-normal">morgado.aam@gmail.com</strong></span>
          </button>
        </div>

        {/* Register/Login toggler */}
        <div className="text-center text-xs font-light text-zinc-400">
          <span>{isRegister ? 'Já tem uma conta de utilizador?' : 'Ainda não tem conta iRunBets?'}</span>{' '}
          <button
            type="button"
            onClick={() => setIsRegister(!isRegister)}
            className="text-orange-400 hover:text-sky-300 font-semibold focus:outline-none transition-colors border-b border-orange-500/20 cursor-pointer"
          >
            {isRegister ? 'Sessão Conhecida' : 'Subscrever Grátis'}
          </button>
        </div>

      </div>
    </div>
  );
};

export default AuthModal;
