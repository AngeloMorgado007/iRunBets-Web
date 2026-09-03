import React, { useState } from 'react';
import { 
  loginWithGoogle, 
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

  const isIframe = typeof window !== 'undefined' && window.self !== window.top;

  if (!isOpen) return null;

  const handleOAuthLogin = async (provider: 'google' | 'facebook') => {
    setIsLoading(true);
    setErrorMsg('');
    try {
      if (provider === 'google') {
        const user = await loginWithGoogle();
        setSuccessMsg(`Bem-vindo, ${user.displayName || 'Apostador'}! Sessão iniciada.`);
      } else {
        const user = await loginWithFacebook();
        setSuccessMsg(`Bem-vindo, ${user.displayName || 'Apostador'}! Sessão iniciada.`);
      }
      setTimeout(() => {
        onSuccess();
        onClose();
        resetForm();
      }, 1000);
    } catch (err: any) {
      setErrorMsg(err.message || 'Falha na autenticação rápida. Tente novamente.');
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
      <div className="relative w-full max-w-md bg-[#121216] border border-zinc-800 rounded-3xl overflow-hidden shadow-2xl z-10 animate-[scale-up-fade_0.3s_cubic-bezier(0.16,1,0.3,1)_forwards] p-6 sm:p-8">
        
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
              className="w-8 h-8 rounded-full bg-zinc-900 border border-zinc-800 flex items-center justify-center text-zinc-400 hover:text-white transition-colors"
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

        {/* Info alerts */}
        {isIframe && (
          <div className="mb-4 p-3 bg-blue-500/10 border border-blue-500/20 text-blue-400 text-[11px] rounded-xl font-light leading-relaxed">
            <span className="font-bold block mb-0.5">ℹ️ Dica para testes no AI Studio</span>
            Como está a usar a pré-visualização integrada, os popups do Google e Facebook podem ser bloqueados pelo navegador. Use o botão <strong>Device / Abrir em Novo Separador</strong> da barra ou visite diretamente <a href="https://ais-dev-ytpzoappnzemihr7woxnfe-327183825655.europe-west1.run.app" target="_blank" rel="noreferrer" className="underline font-semibold hover:text-blue-300">este link direto</a> para entrar com a sua conta Google sem restrições.
          </div>
        )}

        {errorMsg && (
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
        <div className="grid grid-cols-2 gap-3 mb-6">
          <button
            onClick={() => handleOAuthLogin('google')}
            disabled={isLoading}
            type="button"
            className="flex items-center justify-center gap-2 bg-zinc-900 hover:bg-zinc-850 text-white rounded-xl py-2.5 px-4 border border-zinc-800 text-xs font-semibold hover:border-sky-500/35 transition-all duration-300"
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
            className="flex items-center justify-center gap-2 bg-zinc-900 hover:bg-zinc-850 text-white rounded-xl py-2.5 px-4 border border-zinc-800 text-xs font-semibold hover:border-orange-500/35 transition-all duration-300"
          >
            {/* Facebook Vector Icon */}
            <svg className="w-4.5 h-4.5 fill-current text-[#1877F2]" viewBox="0 0 24 24">
              <path d="M24 12.073c0-6.627-5.373-12-12-12s-12 5.373-12 12c0 5.99 4.388 10.954 10.125 11.854v-8.385H7.078v-3.47h3.047V9.43c0-3.007 1.792-4.669 4.533-4.669 1.312 0 2.686.235 2.686.235v2.953H15.83c-1.491 0-1.956.925-1.956 1.874v2.25h3.328l-.532 3.47h-2.796v8.385C19.612 23.027 24 18.062 24 12.073z"/>
            </svg>
            <span>Facebook</span>
          </button>
        </div>

        {/* Register/Login toggler */}
        <div className="text-center text-xs font-light text-zinc-400">
          <span>{isRegister ? 'Já tem uma conta de utilizador?' : 'Ainda não tem conta iRunBets?'}</span>{' '}
          <button
            type="button"
            onClick={() => setIsRegister(!isRegister)}
            className="text-orange-400 hover:text-sky-300 font-semibold focus:outline-none transition-colors border-b border-orange-500/20"
          >
            {isRegister ? 'Sessão Conhecida' : 'Subscrever Grátis'}
          </button>
        </div>

      </div>
    </div>
  );
};

export default AuthModal;
