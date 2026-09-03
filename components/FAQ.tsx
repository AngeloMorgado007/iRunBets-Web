import React, { useState } from 'react';
import { useLanguage } from '../services/LanguageContext';

interface FAQItem {
  qKey: string;
  aKey: string;
}

const FAQ_ITEMS: FAQItem[] = [
  {
    qKey: 'faq.q1',
    aKey: 'faq.a1'
  },
  {
    qKey: 'faq.q2',
    aKey: 'faq.a2'
  },
  {
    qKey: 'faq.q3',
    aKey: 'faq.a3'
  }
];

const FAQ: React.FC = () => {
  const { t } = useLanguage();
  const [openIndex, setOpenIndex] = useState<number | null>(null);

  const toggleItem = (index: number) => {
    setOpenIndex(openIndex === index ? null : index);
  };

  return (
    <section id="faq" className="relative w-full py-24 bg-[#0A0A0C] border-b border-white/5 overflow-hidden">
      
      {/* Background glow orb */}
      <div className="absolute bottom-0 left-1/2 -translate-x-1/2 w-[550px] h-[550px] glow-orb-blue pointer-events-none opacity-20"></div>

      <div className="max-w-4xl mx-auto px-6 relative z-10 text-center">
        
        {/* Badge */}
        <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-zinc-900 border border-zinc-800 text-[10px] font-bold text-zinc-400 uppercase tracking-widest mb-4">
          {t('faq.transparency')}
        </div>

        {/* Header Title */}
        <h2 className="text-3xl md:text-5xl font-bold tracking-tight text-white font-display mb-6">
          {t('faq.title')}
        </h2>
        
        <p className="text-zinc-400 font-light text-base md:text-lg max-w-2xl mx-auto mb-16 leading-relaxed">
          {t('faq.desc')}
        </p>

        {/* Accordion List */}
        <div className="space-y-4 text-left">
          {FAQ_ITEMS.map((item, index) => {
            const isOpen = openIndex === index;
            return (
              <div 
                key={index}
                className="bg-[#121216]/55 border border-zinc-800/80 rounded-2xl overflow-hidden transition-all duration-300"
              >
                {/* Accordion header button */}
                <button
                  type="button"
                  onClick={() => toggleItem(index)}
                  className="w-full flex justify-between items-center p-6 text-left focus:outline-none focus:text-sky-400 group cursor-pointer"
                >
                  <span className="text-base md:text-lg font-semibold text-zinc-100 group-hover:text-white transition-colors">
                    {t(item.qKey)}
                  </span>
                  
                  {/* Icon indicator */}
                  <span className={`text-xl font-bold ml-4 pr-1 text-[#38bdf8] transition-transform duration-300 transform ${isOpen ? 'rotate-45' : ''}`}>
                    <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2.5} stroke="currentColor" className="w-5 h-5 animate-pulse">
                      <path strokeLinecap="round" strokeLinejoin="round" d="M12 4.5v15m7.5-7.5h-15" />
                    </svg>
                  </span>
                </button>

                {/* Accordion answer body */}
                <div 
                  className={`transition-all duration-350 ease-in-out overflow-hidden ${
                    isOpen ? 'max-h-[500px] border-t border-zinc-800 opacity-100' : 'max-h-0 opacity-0 pointer-events-none'
                  }`}
                >
                  <div className="p-6 text-sm md:text-base text-zinc-400 font-light leading-relaxed">
                    {t(item.aKey)}
                  </div>
                </div>

              </div>
            );
          })}
        </div>

      </div>
    </section>
  );
};

export default FAQ;
