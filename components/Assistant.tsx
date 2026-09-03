import React, { useState, useRef, useEffect } from 'react';
import { ChatMessage } from '../types';
import { sendMessageToGemini } from '../services/geminiService';

const Assistant: React.FC = () => {
  const [isOpen, setIsOpen] = useState(false);
  const [messages, setMessages] = useState<ChatMessage[]>([
    { role: 'model', text: 'Bem-vindo à iRunBets. Sou o teu assistente de inteligências analíticas desportivas. Como te posso ajudar hoje com as tuas estatísticas e matemática de futebol?', timestamp: Date.now() }
  ]);
  const [inputValue, setInputValue] = useState('');
  const [isThinking, setIsThinking] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages, isOpen]);

  const handleSend = async () => {
    if (!inputValue.trim()) return;

    const userMsg: ChatMessage = { role: 'user', text: inputValue, timestamp: Date.now() };
    setMessages(prev => [...prev, userMsg]);
    setInputValue('');
    setIsThinking(true);

    try {
      const history = messages.map(m => ({ role: m.role, text: m.text }));
      const responseText = await sendMessageToGemini(history, userMsg.text);
      
      const aiMsg: ChatMessage = { role: 'model', text: responseText, timestamp: Date.now() };
      setMessages(prev => [...prev, aiMsg]);
    } catch (error) {
       // handled in service
    } finally {
      setIsThinking(false);
    }
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  return (
    <div className="fixed bottom-8 right-8 z-50 flex flex-col items-end font-sans">
      {isOpen && (
        <div className="bg-[#121216] rounded-2xl shadow-2xl shadow-black/80 w-[90vw] sm:w-[380px] h-[550px] mb-6 flex flex-col overflow-hidden border border-zinc-800 animate-slide-up-fade">
          {/* Header */}
          <div className="bg-[#18181F] p-5 border-b border-zinc-800/80 flex justify-between items-center">
            <div className="flex items-center gap-3">
                <div className="w-2.5 h-2.5 bg-orange-500 rounded-full animate-pulse"></div>
                <span className="font-semibold text-zinc-100 text-sm tracking-wide font-display">iRunBets Specialist</span>
            </div>
            <button onClick={() => setIsOpen(false)} className="text-zinc-500 hover:text-white transition-colors">
              <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-5 h-5">
                <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>

          {/* Chat Area */}
          <div className="flex-1 overflow-y-auto p-5 space-y-6 bg-[#0E0E12]" ref={scrollRef}>
            {messages.map((msg, idx) => (
              <div key={idx} className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}>
                <div 
                  className={`max-w-[85%] px-4.5 py-3 rounded-2xl text-xs leading-relaxed ${
                    msg.role === 'user' 
                      ? 'bg-gradient-to-tr from-sky-600 to-sky-500 text-white rounded-br-none shadow-lg' 
                      : 'bg-[#181820] border border-zinc-800 text-zinc-300 rounded-bl-none shadow-sm'
                  }`}
                >
                  {msg.text}
                </div>
              </div>
            ))}
            {isThinking && (
               <div className="flex justify-start">
                 <div className="bg-[#181820] border border-zinc-800 py-3 px-4.5 rounded-2xl rounded-bl-none flex gap-1.5 items-center shadow-sm">
                   <div className="w-1.5 h-1.5 bg-zinc-500 rounded-full animate-bounce"></div>
                   <div className="w-1.5 h-1.5 bg-zinc-500 rounded-full animate-bounce delay-75"></div>
                   <div className="w-1.5 h-1.5 bg-zinc-500 rounded-full animate-bounce delay-150"></div>
                 </div>
               </div>
            )}
          </div>

          {/* Input Area */}
          <div className="p-4 bg-[#121216] border-t border-zinc-800/80">
            <div className="flex gap-2 relative">
              <input 
                type="text" 
                value={inputValue}
                onChange={(e) => setInputValue(e.target.value)}
                onKeyDown={handleKeyPress}
                placeholder="Discutir estatística de jogo..." 
                className="flex-1 bg-[#1A1A22] border border-zinc-800 focus:border-orange-500 rounded-xl px-4 py-2.5 text-xs outline-none transition-colors placeholder-zinc-500 text-white font-light"
              />
              <button 
                onClick={handleSend}
                disabled={!inputValue.trim() || isThinking}
                className="bg-orange-500 text-white w-9 h-9 rounded-xl hover:bg-orange-400 transition-colors disabled:opacity-50 flex items-center justify-center flex-shrink-0"
                aria-label="Send Message"
              >
                <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor" className="w-4 h-4">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M6 12 3.269 3.125A59.769 59.769 0 0 1 21.485 12 59.768 59.768 0 0 1 3.27 20.875L5.999 12Zm0 0h7.5" />
                </svg>
              </button>
            </div>
          </div>
        </div>
      )}

      <button 
        onClick={() => setIsOpen(!isOpen)}
        className="bg-gradient-to-tr from-orange-500 to-amber-500 text-white w-14 h-14 flex items-center justify-center rounded-full shadow-2xl hover:scale-105 transition-all duration-300 z-50 focus:outline-none"
        aria-label="Toggle Assistant"
      >
        {isOpen ? (
             <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-6 h-6">
                <path strokeLinecap="round" strokeLinejoin="round" d="M19.5 8.25l-7.5 7.5-7.5-7.5" />
             </svg>
        ) : (
            <div className="relative flex items-center justify-center">
              <span className="font-bold text-xs tracking-widest uppercase font-display">IA</span>
              <span className="absolute -top-1 -right-1 w-2.5 h-2.5 rounded-full bg-sky-300 animate-ping"></span>
              <span className="absolute -top-1 -right-1 w-2.5 h-2.5 rounded-full bg-sky-400"></span>
            </div>
        )}
      </button>
    </div>
  );
};

export default Assistant;