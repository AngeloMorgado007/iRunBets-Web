import React, { useState, useEffect } from 'react';
import { useLanguage } from '../services/LanguageContext';
import { getSocialLinks, SocialConfig } from '../services/firebase';

const NitensLogo: React.FC<{ className?: string }> = ({ className = 'w-5 h-5' }) => (
  <svg 
    viewBox="0 0 100 100" 
    className={`${className} select-none overflow-visible`} 
    fill="none" 
    xmlns="http://www.w3.org/2000/svg"
  >
    <defs>
      <linearGradient id="nitens-grad-left" x1="0" y1="0" x2="100" y2="100">
        <stop offset="0%" stopColor="#00f2fe" />
        <stop offset="50%" stopColor="#0072ff" />
        <stop offset="100%" stopColor="#7f00ff" />
      </linearGradient>
      <linearGradient id="nitens-grad-right" x1="100" y1="0" x2="0" y2="100">
        <stop offset="0%" stopColor="#ec008c" />
        <stop offset="50%" stopColor="#7f00ff" />
        <stop offset="100%" stopColor="#00f2fe" />
      </linearGradient>
      <filter id="nitens-core-glow" x="-20%" y="-20%" width="140%" height="140%">
        <feGaussianBlur stdDeviation="3.5" result="blur" />
        <feComposite in="SourceGraphic" in2="blur" operator="over" />
      </filter>
    </defs>
    
    <circle cx="50" cy="50" r="30" fill="#00f2fe" opacity="0.12" filter="blur(8px)" />
    
    <g filter="url(#nitens-core-glow)" strokeWidth="5" strokeLinecap="round" strokeLinejoin="round">
      <path 
        d="M28,72 C28,50 35,34 45,34 C50,34 50,44 45,55 C40,66 35,72 55,72 C65,72 72,55 72,28" 
        stroke="url(#nitens-grad-left)" 
        fill="none"
      />
      <path 
        d="M28,28 C28,55 35,66 45,66 C50,66 50,56 55,45 C60,34 65,28 72,28 C72,50 65,66 55,66" 
        stroke="url(#nitens-grad-right)" 
        fill="none"
      />
    </g>

    <g transform="translate(50, 48)">
      <circle cx="0" cy="0" r="4" fill="#ffffff" filter="blur(0.5px)" />
      <path d="M0,-14 L0,14" stroke="#ffffff" strokeWidth="2.2" strokeLinecap="round" />
      <path d="M-14,0 L16,0" stroke="#ffffff" strokeWidth="2.2" strokeLinecap="round" />
      <path d="M-6,0 Q0,0 0,-6 Q0,0 6,0 Q0,0 0,6 Q0,0 -6,0 Z" fill="#ffffff" />
    </g>
  </svg>
);

interface FooterProps {
  onLinkClick: (e: React.MouseEvent<HTMLAnchorElement>, targetId: string) => void;
}

const Footer: React.FC<FooterProps> = ({ onLinkClick }) => {
  const { language } = useLanguage();
  
  const [socials, setSocials] = useState<SocialConfig>({
    whatsapp: '',
    facebook: '',
    x: '',
    telegram: '',
    instagram: ''
  });

  useEffect(() => {
    const loadSocialData = async () => {
      const data = await getSocialLinks();
      setSocials(data);
    };
    loadSocialData();

    const handleSocialUpdate = () => {
      loadSocialData();
    };
    window.addEventListener('irunbets_socials_updated', handleSocialUpdate);
    return () => {
      window.removeEventListener('irunbets_socials_updated', handleSocialUpdate);
    };
  }, []);

  const labelsMap = {
    pt: {
      desc: 'A tua vantagem matemática e gestão inteligente da banca no futebol através de inteligência artificial de alta precisão. Analisa desvios estatísticos de mercado automaticamente.',
      navigation: 'Navegação',
      navHome: 'Início',
      navPurifier: 'Purificador de Odds',
      navRadar: 'Radar de Favoritas',
      navPush: 'Notificações Push',
      navFaq: 'Perguntas Frequentes',
      contact: 'Contato Oficial',
      contactDesc: 'Tens alguma pergunta ou proposta de parceria? Fala diretamente com os nossos analistas.',
      developed: 'Desenvolvido pela Nitens'
    },
    en: {
      desc: 'Your mathematical edge and smart bankroll management in football through high-precision artificial intelligence. Analyze market statistical variances automatically.',
      navigation: 'Navigation',
      navHome: 'Home',
      navPurifier: 'Odds Purifier',
      navRadar: 'Favorites Radar',
      navPush: 'Push Notifications',
      navFaq: 'Frequently Asked Questions',
      contact: 'Official Contact',
      contactDesc: 'Have any questions or partnership proposals? Reach out directly to our math analysts.',
      developed: 'Developed by Nitens'
    },
    fr: {
      desc: 'Votre avantage mathématique et gestion intelligente de bankroll au football grâce à une intelligence artificielle de haute précision.',
      navigation: 'Navigation',
      navHome: 'Accueil',
      navPurifier: 'Purificateur de Cotes',
      navRadar: 'Radar des Favorites',
      navPush: 'Notifications Push',
      navFaq: 'Questions Fréquentes',
      contact: 'Contact Officiel',
      contactDesc: 'Une question ou une proposition de partenariat ? Contactez directement nos analystes.',
      developed: 'Développé par Nitens'
    },
    it: {
      desc: 'Il tuo vantaggio matematico e gestione intelligente del bankroll nel calcio con l\'intelligenza artificiale ad alta precisione.',
      navigation: 'Navigazione',
      navHome: 'Home',
      navPurifier: 'Purificatore Quote',
      navRadar: 'Radar Preferiti',
      navPush: 'Notifiche Push',
      navFaq: 'Domande Frequenti',
      contact: 'Contatto Ufficiale',
      contactDesc: 'Hai domande o proposte di partnership? Contatta direttamente i nostri analisti matematici.',
      developed: 'Sviluppato da Nitens'
    },
    de: {
      desc: 'Dein mathematischer Vorteil und intelligentes Bankroll-Management im Fußball durch hochpräzise Künstliche Intelligenz.',
      navigation: 'Navigation',
      navHome: 'Startseite',
      navPurifier: 'Analyser',
      navRadar: 'Favoriten-Radar',
      navPush: 'Push-Meldungen',
      navFaq: 'Häufig gestellte Fragen',
      contact: 'Offizieller Kontakt',
      contactDesc: 'Fragen oder Partnerschaftsanfragen? Sprich direkt mit unseren mathematischen Analysten.',
      developed: 'Entwickelt von Nitens'
    }
  };
  const labels = labelsMap[language] || labelsMap.pt;

  return (
    <footer className="bg-[#0A0A0C] border-t border-white/5 pt-16 pb-12 px-6 text-zinc-500">
      <div className="max-w-7xl mx-auto grid grid-cols-1 md:grid-cols-12 gap-12 items-start">
        
        {/* Left column */}
        <div className="md:col-span-5">
          <div className="flex flex-col select-none mb-4">
            <div className="flex items-baseline italic tracking-tight text-2xl leading-none font-black">
              <span className="text-[#EF233C] pr-0.5 tracking-tighter" style={{ textShadow: "0 0 20px rgba(239, 35, 60, 0.45)" }}>iRun</span>
              <span className="text-white tracking-tight" style={{ textShadow: "0 0 15px rgba(255, 255, 255, 0.25)" }}>Bets</span>
            </div>
            <span className="text-[8.5px] uppercase tracking-[0.22em] text-zinc-500 font-sans font-medium mt-1.5 leading-none">
              Gestão de Apostas
            </span>
          </div>
          <p className="max-w-sm font-light text-sm text-zinc-400 leading-relaxed mb-6">
            {labels.desc}
          </p>
          <div className="text-xs font-mono text-zinc-600 mb-4">
            Powered by iR-Engine Pro v3.5
          </div>
          
          {/* Canais Sociais do iRunBets */}
          <div className="flex items-center gap-3">
            <a
              href={socials.whatsapp || '#'}
              target="_blank"
              rel="noopener noreferrer"
              className="w-8 h-8 rounded-full bg-zinc-950 border border-zinc-850/80 flex items-center justify-center text-zinc-400 hover:text-emerald-400 hover:border-emerald-500/30 transition-all hover:scale-110"
              title="WhatsApp"
            >
              <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="w-3.5 h-3.5"><path d="M21 11.5a8.38 8.38 0 0 1-.9 3.8 8.5 8.5 0 0 1-7.6 4.7 8.38 8.38 0 0 1-7.6-4.7 8.38 8.38 0 0 1 .9-3.8L3 21l1.9-5.7a8.38 8.38 0 0 1-.9-3.8 8.5 8.5 0 0 1 4.7-7.6 8.38 8.38 0 0 1 3.8-.9h.5a8.48 8.48 0 0 1 8 8v.5z"/></svg>
            </a>
            <a
              href={socials.telegram || '#'}
              target="_blank"
              rel="noopener noreferrer"
              className="w-8 h-8 rounded-full bg-zinc-950 border border-zinc-850/80 flex items-center justify-center text-zinc-400 hover:text-sky-400 hover:border-sky-500/30 transition-all hover:scale-110"
              title="Telegram"
            >
              <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="w-3.5 h-3.5 mr-0.5"><line x1="22" y1="2" x2="11" y2="13"/><polygon points="22 2 15 22 11 13 2 9 22 2"/></svg>
            </a>
            <a
              href={socials.instagram || '#'}
              target="_blank"
              rel="noopener noreferrer"
              className="w-8 h-8 rounded-full bg-zinc-950 border border-zinc-850/80 flex items-center justify-center text-zinc-400 hover:text-pink-400 hover:border-pink-500/30 transition-all hover:scale-110"
              title="Instagram"
            >
              <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="w-3.5 h-3.5"><rect x="2" y="2" width="20" height="20" rx="5" ry="5"/><path d="M16 11.37A4 4 0 1 1 12.63 8 4 4 0 0 1 16 11.37z"/><line x1="17.5" y1="6.5" x2="17.51" y2="6.5"/></svg>
            </a>
            <a
              href={socials.facebook || '#'}
              target="_blank"
              rel="noopener noreferrer"
              className="w-8 h-8 rounded-full bg-zinc-950 border border-zinc-850/80 flex items-center justify-center text-zinc-400 hover:text-blue-500 hover:border-blue-500/30 transition-all hover:scale-110"
              title="Facebook"
            >
              <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="w-3.5 h-3.5"><path d="M18 2h-3a5 5 0 0 0-5 5v3H7v4h3v8h4v-8h3l1-4h-4V7a1 1 0 0 1 1-1h3z"/></svg>
            </a>
            <a
              href={socials.x || '#'}
              target="_blank"
              rel="noopener noreferrer"
              className="w-8 h-8 rounded-full bg-zinc-950 border border-zinc-850/80 flex items-center justify-center text-zinc-400 hover:text-white hover:border-zinc-550 transition-all hover:scale-110"
              title="X (Twitter)"
            >
              <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" className="w-3.5 h-3.5"><path d="M4 4l11.733 16h4.267l-11.733 -16z" /><path d="M4 20l6.768 -6.768m2.46 -2.46l6.772 -6.772" /></svg>
            </a>
          </div>
        </div>

        {/* Center column */}
        <div className="md:col-span-3">
          <h4 className="font-semibold text-zinc-300 mb-4 tracking-wider text-xs uppercase font-display">{labels.navigation}</h4>
          <ul className="space-y-3 text-xs font-light">
            <li><a href="#hero" onClick={(e) => onLinkClick(e, '')} className="hover:text-white transition-colors">{labels.navHome}</a></li>
            <li><a href="#purificador" onClick={(e) => onLinkClick(e, 'purificador')} className="hover:text-white transition-colors">{labels.navPurifier}</a></li>
            <li><a href="#radar" onClick={(e) => onLinkClick(e, 'radar')} className="hover:text-white transition-colors">{labels.navRadar}</a></li>
            <li><a href="#notificacoes" onClick={(e) => onLinkClick(e, 'notificacoes')} className="hover:text-white transition-colors">{labels.navPush}</a></li>
            <li><a href="#faq" onClick={(e) => onLinkClick(e, 'faq')} className="hover:text-white transition-colors">{labels.navFaq}</a></li>
          </ul>
        </div>
        
        {/* Right column */}
        <div className="md:col-span-4 flex flex-col items-start md:items-end">
          <h4 className="font-semibold text-zinc-300 mb-4 tracking-wider text-xs uppercase font-display">{labels.contact}</h4>
          <p className="text-sm font-light text-zinc-400 mb-3 text-left md:text-right max-w-xs">
            {labels.contactDesc}
          </p>
          <a 
            href="mailto:suporte@irunbets.pt" 
            className="text-[#38bdf8] hover:text-orange-500 text-sm font-semibold tracking-wide border-b border-[#38bdf8]/20 hover:border-orange-500/20 pb-0.5 transition-colors font-mono"
          >
            suporte@irunbets.pt
          </a>
        </div>

      </div>

      {/* Copyright footer bar */}
      <div className="max-w-7xl mx-auto mt-16 pt-8 border-t border-white/5 flex flex-col sm:flex-row justify-between items-center text-xs uppercase tracking-widest text-zinc-650 opacity-60">
        <p className="mb-4 sm:mb-0">Copyright iRunBets 2026</p>
        <div className="flex items-center gap-1.5 hover:opacity-100 transition-opacity">
          <span>{labels.developed}</span>
          <div className="flex items-center justify-center p-0.5 bg-zinc-950/40 border border-zinc-900 rounded-lg shadow-inner">
            <NitensLogo className="w-3.5 h-3.5 md:w-4 md:h-4 text-cyan-400" />
          </div>
        </div>
      </div>
    </footer>
  );
};

export default Footer;
