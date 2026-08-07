import React, { useState, useRef, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import axios from 'axios';
import ReactMarkdown from 'react-markdown';
import html2pdf from 'html2pdf.js';
import {
  Send, Bot, User, Sparkles, LayoutDashboard, Database,
  Settings, LogOut, Menu, Paperclip, ArrowUp, Download, Copy, Check, ArrowLeft, PanelLeftClose, PanelLeftOpen
} from 'lucide-react';
import Sidebar from '../components/Sidebar';

export default function ModernAIAssistant() {
  const navigate = useNavigate();

  // States
  const [isSidebarOpen, setIsSidebarOpen] = useState(window.innerWidth > 768);
  const [input, setInput] = useState('');
  const [messages, setMessages] = useState([]);
  const [hasStartedChat, setHasStartedChat] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [copiedIndex, setCopiedIndex] = useState(null);
  const chatContainerRef = useRef(null);
  const [name, setName] = useState("Guest");

  useEffect(() => {
    const handleResize = () => setIsSidebarOpen(window.innerWidth > 768);
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  useEffect(() => {
    const fetchUserData = async () => { 
      try { 
        const token = localStorage.getItem('pegasus_token');
        const response = await axios.get(`${import.meta.env.VITE_API_URL}/user-settings`, {
          headers: { Authorization: `Bearer ${token}` }
        });
        setName(response.data.prenom || "Guest");
      } catch (error) {
        console.error("❌ THE REQUEST FAILED:", error);
      }
    }; 
    fetchUserData();
  }, []);

  // Smooth scroll fix
  useEffect(() => {
    if (hasStartedChat && chatContainerRef.current) {
      setTimeout(() => {
        chatContainerRef.current.scrollTo({
          top: chatContainerRef.current.scrollHeight,
          behavior: 'smooth'
        });
      }, 50);
    }
  }, [messages, isLoading, hasStartedChat]);

  const handleCopyText = (text, index) => {
    navigator.clipboard.writeText(text);
    setCopiedIndex(index);
    setTimeout(() => setCopiedIndex(null), 2000);
  };

  const handleExportPDF = (index) => {
    const element = document.getElementById(`ai-message-${index}`);
    const opt = {
      margin: 10,
      filename: `Analyse_Pegasus_${new Date().toISOString().slice(0, 10)}.pdf`,
      image: { type: 'jpeg', quality: 0.98 },
      html2canvas: { scale: 2 },
      jsPDF: { unit: 'mm', format: 'a4', orientation: 'portrait' }
    };
    html2pdf().set(opt).from(element).save();
  };

  const executeQuery = async (promptText) => {
    if (!promptText.trim()) return;

    setHasStartedChat(true);
    const userMessage = { role: 'user', content: promptText };
    setMessages((prev) => [...prev, userMessage]);
    setInput('');
    setIsLoading(true);

    try {
      const response = await axios.post(`${import.meta.env.VITE_API_URL}/ai-query`, { prompt: promptText });
      setMessages((prev) => [...prev, { role: 'ai', content: response.data.answer }]);
    } catch (error) {
      console.error("Erreur IA:", error);
      const errorMessage = error.response?.data?.answer || "Désolé, une erreur de connexion au processeur neuronal est survenue.";
      setMessages((prev) => [...prev, { role: 'ai', content: errorMessage }]);
    } finally {
      setIsLoading(false);
    }
  };

  const handleSend = (e) => {
    e.preventDefault();
    executeQuery(input);
  };

  return (
    <div className="flex h-screen w-full overflow-hidden bg-black text-gray-200 font-sans relative selection:bg-white/20 selection:text-white">

      {/* AMBIENT BACKGROUND: The "Living" Crimson Core */}
      <style>{`
        @keyframes pulse-core {
          0%, 100% { opacity: 0.3; transform: translate(-50%, -50%) scale(0.85); }
          50% { opacity: 0.7; transform: translate(-50%, -50%) scale(1.15); }
        }
        .animate-core {
          animation: pulse-core 6s ease-in-out infinite;
        }
      `}</style>

      {/* Grid Pattern */}
      <div className="absolute inset-0 z-0 opacity-10 pointer-events-none"
        style={{ backgroundImage: 'linear-gradient(to right, #ffffff 1px, transparent 1px), linear-gradient(to bottom, #ffffff 1px, transparent 1px)', backgroundSize: '40px 40px' }}>
      </div>

      {/* Beating Crimson Core (FIXED) */}
      <div className={`absolute left-1/2 top-1/2 w-[600px] h-[600px] bg-red-600/50 rounded-full blur-[100px] mix-blend-screen pointer-events-none transition-all duration-1000 ease-in-out z-0 ${hasStartedChat ? 'opacity-10 -translate-y-1/4 scale-75' : 'animate-core'}`}></div>

      {/* SIDEBAR */}
      <Sidebar isSidebarOpen={isSidebarOpen} setIsSidebarOpen={setIsSidebarOpen} />

      {/* MAIN CONTENT AREA */}
      <div className="flex-1 flex flex-col min-w-0 h-screen relative z-10">

        {/* TOP CONTROL BAR (Desktop & Mobile) */}
        <header className="flex-shrink-0 bg-transparent border-b border-white/5 px-6 py-4 flex justify-between items-center z-20 absolute top-0 w-full backdrop-blur-sm">
          <div className="flex items-center gap-4">
            <button onClick={() => setIsSidebarOpen(!isSidebarOpen)} className="text-gray-500 hover:text-white transition-colors p-2 hover:bg-white/5 rounded-md">
               {isSidebarOpen ? <PanelLeftClose className="h-5 w-5" /> : <PanelLeftOpen className="h-5 w-5" />}
            </button>
            {hasStartedChat && (
              <button
                onClick={() => { setHasStartedChat(false); setMessages([]); }}
                className="flex items-center gap-2 px-3 py-1.5 rounded text-[10px] uppercase tracking-widest text-gray-500 hover:text-red-500 transition-colors border border-transparent hover:border-red-500/20"
              >
                <ArrowLeft className="h-3 w-3" /> Nouvelle Analyse
              </button>
            )}
          </div>
          <div className="flex items-center gap-2">
            <span className="inline-block w-2 h-2 rounded-full bg-red-600 animate-pulse"></span>
            <span className="text-[10px] text-gray-500 uppercase tracking-widest font-mono hidden sm:inline">Pegasus Engine Actif</span>
          </div>
        </header>

        {/* --- VIEW A: HERO STATE --- */}
        {!hasStartedChat ? (
          <div className="flex-1 flex flex-col items-center justify-center px-4 md:px-8 animate-in fade-in duration-700 relative z-10">
            <div className="w-full max-w-3xl flex flex-col items-start">

              <h1 className="text-5xl md:text-6xl text-white font-serif tracking-tight mb-2">Opérateur {name}.</h1>
              <h2 className="text-2xl md:text-3xl text-gray-500 font-serif mb-12">Que puis-je analyser pour vous ?</h2>

              {/* Suggestions Data-Nodes */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-12 w-full">
                {[
                  { tag: 'Analyse Ventes', desc: 'Quel est le produit le plus vendu ce mois-ci ?' },
                  { tag: 'Performance', desc: 'Qui est notre meilleur commercial ?' },
                  { tag: 'Croissance', desc: 'Combien de clients différents avons-nous ?' }
                ].map((item, idx) => (
                  <div key={idx} onClick={() => executeQuery(item.desc)} className="bg-[#050505] border border-white/10 p-6 hover:bg-white/[0.02] hover:border-red-600/50 transition-all cursor-pointer group">
                    <span className="text-[10px] text-gray-500 group-hover:text-red-500 uppercase tracking-widest font-mono mb-3 block transition-colors">[{item.tag}]</span>
                    <p className="text-sm text-gray-300 group-hover:text-white transition-colors">{item.desc}</p>
                  </div>
                ))}
              </div>

              {/* Monolithic Input */}
              <form onSubmit={handleSend} className="w-full bg-[#050505] border border-white/20 p-2 flex items-center focus-within:border-red-600 transition-colors">
                <button type="button" className="p-3 text-gray-500 hover:text-white transition-colors">
                  <Paperclip className="h-5 w-5" />
                </button>
                <input 
                  type="text" 
                  value={input} 
                  onChange={(e) => setInput(e.target.value)} 
                  placeholder="Exécuter une requête..." 
                  className="flex-1 bg-transparent border-none text-white placeholder-gray-600 focus:outline-none text-lg px-2 font-serif" 
                />
                <button type="submit" disabled={!input.trim()} className="px-6 py-3 bg-white text-black hover:bg-gray-200 text-[11px] uppercase tracking-widest font-bold transition-colors disabled:opacity-50 disabled:cursor-not-allowed">
                  Envoyer
                </button>
              </form>
            </div>
          </div>
        ) : (

          /* --- VIEW B: CHAT STATE --- */
          <div className="flex flex-col h-full w-full max-w-4xl mx-auto pt-24 px-4 md:px-8 animate-in fade-in duration-500 relative z-10">

            {/* Messages Area */}
            <main ref={chatContainerRef} className="flex-1 overflow-y-auto custom-scrollbar pr-4 space-y-8 pb-6 min-h-0">
              {messages.map((msg, index) => (
                <div key={index} className={`flex gap-4 ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}>

                  {msg.role === 'ai' && (
                    <div className="w-8 h-8 flex items-center justify-center flex-shrink-0 mt-1">
                      <Bot className="h-6 w-6 text-red-600" />
                    </div>
                  )}

                  {msg.role === 'user' && (
                    <div className="max-w-[75%] px-6 py-4 text-sm leading-relaxed bg-white/[0.05] border border-white/10 text-white rounded-2xl rounded-tr-none">
                      <span className="whitespace-pre-wrap">{msg.content}</span>
                    </div>
                  )}

                  {msg.role === 'ai' && (
                    <div className="flex flex-col items-start max-w-[85%]">
                      <div id={`ai-message-${index}`} className="px-6 py-5 w-full text-sm leading-relaxed bg-[#0a0a0a] border border-white/10 text-gray-200 rounded-2xl rounded-tl-none prose prose-invert prose-p:leading-relaxed prose-headings:font-serif prose-headings:font-normal max-w-none [&>p]:mb-4 last:[&>p]:mb-0">
                        <ReactMarkdown>{msg.content}</ReactMarkdown>
                      </div>

                      {/* Action Bar (Copy/Export) */}
                      <div className="flex items-center gap-4 mt-2 ml-2">
                        <button onClick={() => handleCopyText(msg.content, index)} className="flex items-center gap-1.5 text-[9px] uppercase tracking-widest font-mono text-gray-500 hover:text-red-500 transition-colors">
                          {copiedIndex === index ? <><Check className="h-3 w-3 text-red-500" /> <span className="text-red-500">Copié</span></> : <><Copy className="h-3 w-3" /> Copier</>}
                        </button>
                        <button onClick={() => handleExportPDF(index)} className="flex items-center gap-1.5 text-[9px] uppercase tracking-widest font-mono text-gray-500 hover:text-red-500 transition-colors">
                          <Download className="h-3 w-3" /> Exporter PDF
                        </button>
                      </div>
                    </div>
                  )}
                </div>
              ))}

              {/* Loading Indicator */}
              {isLoading && (
                <div className="flex gap-4 justify-start">
                  <div className="w-8 h-8 flex items-center justify-center flex-shrink-0 mt-1">
                    <Bot className="h-6 w-6 text-red-600" />
                  </div>
                  <div className="bg-[#0a0a0a] border border-white/10 py-4 px-6 rounded-2xl rounded-tl-none flex items-center gap-2 h-[52px]">
                    <div className="w-1.5 h-1.5 bg-red-600 rounded-full animate-bounce" style={{ animationDelay: '0ms' }}></div>
                    <div className="w-1.5 h-1.5 bg-red-600 rounded-full animate-bounce" style={{ animationDelay: '150ms' }}></div>
                    <div className="w-1.5 h-1.5 bg-red-600 rounded-full animate-bounce" style={{ animationDelay: '300ms' }}></div>
                  </div>
                </div>
              )}
            </main>

            {/* Chat Input */}
            <div className="flex-shrink-0 py-6 bg-gradient-to-t from-black via-black to-transparent">
              <form onSubmit={handleSend} className="w-full bg-[#050505] border border-white/20 p-1 flex items-center focus-within:border-red-600 transition-colors">
                <button type="button" className="p-3 text-gray-500 hover:text-white transition-colors">
                  <Paperclip className="h-4 w-4" />
                </button>
                <input 
                  type="text" 
                  value={input} 
                  onChange={(e) => setInput(e.target.value)} 
                  placeholder="Saisir la requête..." 
                  className="flex-1 bg-transparent border-none text-gray-200 placeholder-gray-600 focus:outline-none text-sm px-2 font-serif" 
                  disabled={isLoading} 
                />
                <button type="submit" disabled={!input.trim() || isLoading} className="p-3 m-1 bg-white text-black hover:bg-gray-200 transition-colors disabled:opacity-50 disabled:cursor-not-allowed">
                  <ArrowUp className="h-4 w-4" />
                </button>
              </form>
              <p className="text-center text-[9px] uppercase tracking-widest font-mono text-gray-600 mt-4">
                Le modèle peut produire des inexactitudes. Validez les métriques clés.
              </p>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}