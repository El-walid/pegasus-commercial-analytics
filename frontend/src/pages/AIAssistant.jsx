import React, { useState, useRef, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import axios from 'axios';
import ReactMarkdown from 'react-markdown';
import html2pdf from 'html2pdf.js';
import { 
  Send, Bot, User, Sparkles, LayoutDashboard, Database, 
  Settings, LogOut, Menu, Paperclip, ArrowUp, Download, Copy, Check, ArrowLeft 
} from 'lucide-react';

export default function ModernAIAssistant() {
  const navigate = useNavigate();
  
  // States
  const [isSidebarOpen, setIsSidebarOpen] = useState(true);
  const [input, setInput] = useState('');
  const [messages, setMessages] = useState([]);
  const [hasStartedChat, setHasStartedChat] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [copiedIndex, setCopiedIndex] = useState(null);
  
  const chatContainerRef = useRef(null);

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

  const handleLogout = () => {
    localStorage.removeItem('pegasus_token');
    navigate('/login');
  };

  const handleCopyText = (text, index) => {
    navigator.clipboard.writeText(text);
    setCopiedIndex(index);
    setTimeout(() => setCopiedIndex(null), 2000);
  };

  const handleExportPDF = (index) => {
    const element = document.getElementById(`ai-message-${index}`);
    const opt = {
      margin: 10,
      filename: `Analyse_Pegasus_${new Date().toISOString().slice(0,10)}.pdf`,
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
      const response = await axios.post(`${import.meta.env.VITE_API_URL}/ai-query`, {
        prompt: promptText
      });
      setMessages((prev) => [...prev, { role: 'ai', content: response.data.answer }]);
    } catch (error) {
      console.error("Erreur IA:", error);
      const errorMessage = error.response?.data?.answer || "Désolé, une erreur est survenue lors de la communication avec le serveur IA local.";
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
    <div className="relative flex h-screen w-screen bg-[#050914] overflow-hidden text-gray-200 font-sans">
      
      {/* ADVANCED ORGANIC BLOB & HUE-SHIFT ANIMATIONS */}
      <style>{`
        @keyframes chaotic-drift {
          0% { transform: translate(-50%, -50%) translate(0px, 0px) scale(1); }
          25% { transform: translate(-50%, -50%) translate(80px, -120px) scale(1.2); }
          50% { transform: translate(-50%, -50%) translate(-100px, 60px) scale(0.85); }
          75% { transform: translate(-50%, -50%) translate(60px, 100px) scale(1.1); }
          100% { transform: translate(-50%, -50%) translate(0px, 0px) scale(1); }
        }
        @keyframes chaotic-drift-reverse {
          0% { transform: translate(-50%, -50%) translate(0px, 0px) scale(1); }
          25% { transform: translate(-50%, -50%) translate(-90px, 110px) scale(0.9); }
          50% { transform: translate(-50%, -50%) translate(110px, -70px) scale(1.25); }
          75% { transform: translate(-50%, -50%) translate(-70px, -90px) scale(0.95); }
          100% { transform: translate(-50%, -50%) translate(0px, 0px) scale(1); }
        }
        @keyframes color-morph {
          0% { filter: hue-rotate(0deg) blur(120px); }
          33% { filter: hue-rotate(50deg) blur(140px); }
          66% { filter: hue-rotate(100deg) blur(130px); }
          100% { filter: hue-rotate(0deg) blur(120px); }
        }
        .animate-chaotic {
          animation: chaotic-drift 18s ease-in-out infinite, color-morph 25s linear infinite;
        }
        .animate-chaotic-reverse {
          animation: chaotic-drift-reverse 22s ease-in-out infinite, color-morph 30s linear infinite reverse;
        }
      `}</style>

      {/* 1. BACKGROUND GRID */}
      <div className="absolute inset-0 z-0 opacity-10 pointer-events-none" 
           style={{ backgroundImage: 'linear-gradient(to right, #ffffff 1px, transparent 1px), linear-gradient(to bottom, #ffffff 1px, transparent 1px)', backgroundSize: '40px 40px' }}>
      </div>

      {/* 2. RANDOM DRIFTING, COLOR-CHANGING "BREATHING" ORBS */}
      <div className={`absolute z-0 pointer-events-none transition-all duration-1000 ease-in-out left-1/2 top-1/2 ${hasStartedChat ? 'opacity-40 scale-125 translate-x-[20%] -translate-y-[20%]' : 'opacity-80 scale-100'}`}>
        {/* Primary Drifting Blob: Red to Crimson to Deep Purple */}
        <div className="absolute w-[600px] h-[600px] bg-gradient-to-r from-red-700 via-rose-900 to-purple-900 rounded-full mix-blend-screen animate-chaotic"></div>
        
        {/* Secondary Drifting Blob: Orange to Brown to Crimson */}
        <div className="absolute w-[500px] h-[500px] bg-gradient-to-tr from-amber-800 via-red-900 to-yellow-800 rounded-full mix-blend-screen animate-chaotic-reverse" style={{ animationDelay: '-3s' }}></div>
        
        {/* Breathing Core Glow */}
        <div className="absolute w-[350px] h-[350px] bg-red-600/30 rounded-full blur-[100px] mix-blend-screen animate-[pulse_5s_ease-in-out_infinite]" style={{ transform: 'translate(-50%, -50%)' }}></div>
      </div>

      {/* 3. GLASSMORPHIC SIDEBAR */}
      <aside className={`relative z-30 flex-shrink-0 transition-all duration-300 ease-in-out border-r border-white/10 bg-[#0a0f1c]/80 backdrop-blur-3xl ${isSidebarOpen ? 'w-64' : 'w-0 overflow-hidden'}`}>
        <div className="w-64 h-full flex flex-col justify-between">
          <div className="p-6">
            <h2 className="text-2xl font-bold text-white tracking-tight mb-8 flex items-center gap-2">
              <Sparkles className="h-6 w-6 text-red-500" /> Pegasus
            </h2>
            <nav className="space-y-2">
              <Link to="/" className="flex items-center gap-3 px-4 py-3 text-gray-400 hover:bg-white/5 hover:text-white rounded-xl transition-colors">
                <LayoutDashboard className="h-5 w-5" /> Vue d'ensemble
              </Link>
              <Link to="/datahub" className="flex items-center gap-3 px-4 py-3 text-gray-400 hover:bg-white/5 hover:text-white rounded-xl transition-colors">
                <Database className="h-5 w-5" /> Hub de Données
              </Link>
              <Link to="/ia" className="flex items-center gap-3 px-4 py-3 bg-red-500/10 text-red-500 border border-red-500/20 rounded-xl transition-colors shadow-[0_0_15px_rgba(239,68,68,0.1)]">
                <Bot className="h-5 w-5" /> Assistant IA
              </Link>
              <Link to="/settings" className="flex items-center gap-3 px-4 py-3 text-gray-400 hover:bg-white/5 hover:text-white rounded-xl transition-colors">
                <Settings className="h-5 w-5" /> Paramètres
              </Link>
            </nav>
          </div>
          <div className="p-6 border-t border-white/10">
            <button onClick={handleLogout} className="flex items-center gap-3 w-full px-4 py-3 text-red-400 hover:bg-red-500/10 rounded-xl transition-colors">
              <LogOut className="h-5 w-5" /> Déconnexion
            </button>
          </div>
        </div>
      </aside>

      {/* 4. MAIN CONTENT AREA */}
      <div className="relative z-20 flex-1 flex flex-col min-w-0 h-screen">
        
        {/* Top Control Bar (Sidebar Toggle + Exit Chat Button) */}
        <div className="absolute top-6 left-6 z-40 flex items-center gap-3">
          <button onClick={() => setIsSidebarOpen(!isSidebarOpen)} className="p-2 rounded-lg bg-white/5 border border-white/10 text-gray-400 hover:text-white hover:bg-white/10 backdrop-blur-md transition-colors shadow-lg">
            <Menu className="h-5 w-5" />
          </button>

          {/* EXIT CHAT BUTTON (Appears only when inside a conversation) */}
          {hasStartedChat && (
            <button 
              onClick={() => { setHasStartedChat(false); setMessages([]); }} 
              className="flex items-center gap-2 px-3 py-2 rounded-lg bg-white/5 border border-white/10 text-gray-300 hover:text-white hover:bg-white/10 backdrop-blur-md transition-colors shadow-lg text-xs font-medium"
            >
              <ArrowLeft className="h-4 w-4" /> Retour au menu
            </button>
          )}
        </div>

        {/* --- VIEW A: HERO STATE --- */}
        {!hasStartedChat ? (
          <div className="flex-1 flex flex-col items-center justify-center px-4 md:px-8 animate-in fade-in slide-in-from-bottom-4 duration-700">
            <div className="w-full max-w-3xl flex flex-col items-start z-20">
              
              <h1 className="text-5xl md:text-6xl font-semibold mb-2 text-white">Hey! El Walid</h1>
              <h2 className="text-3xl md:text-4xl text-gray-400 mb-12">Que puis-je analyser pour vous ?</h2>

              {/* Suggestions */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-10 w-full">
                <div onClick={() => executeQuery("Quel est le produit le plus vendu ?")} className="bg-white/[0.03] border border-white/[0.05] p-5 rounded-2xl hover:bg-white/[0.08] hover:border-orange-500/30 transition-all cursor-pointer group backdrop-blur-xl">
                  <span className="inline-block px-3 py-1 bg-orange-500/10 text-orange-400 text-xs font-medium rounded-md mb-3 border border-orange-500/20">Analyse de Ventes</span>
                  <p className="text-sm text-gray-400 group-hover:text-gray-200">Quel est le produit le plus vendu ce mois-ci ?</p>
                </div>
                <div onClick={() => executeQuery("Qui est notre meilleur commercial ?")} className="bg-white/[0.03] border border-white/[0.05] p-5 rounded-2xl hover:bg-white/[0.08] hover:border-red-500/30 transition-all cursor-pointer group backdrop-blur-xl">
                  <span className="inline-block px-3 py-1 bg-red-500/10 text-red-400 text-xs font-medium rounded-md mb-3 border border-red-500/20">Performance</span>
                  <p className="text-sm text-gray-400 group-hover:text-gray-200">Qui est notre meilleur commercial ?</p>
                </div>
                <div onClick={() => executeQuery("Combien de clients différents avons-nous ?")} className="bg-white/[0.03] border border-white/[0.05] p-5 rounded-2xl hover:bg-white/[0.08] hover:border-rose-500/30 transition-all cursor-pointer group backdrop-blur-xl">
                  <span className="inline-block px-3 py-1 bg-rose-500/10 text-rose-400 text-xs font-medium rounded-md mb-3 border border-rose-500/20">Croissance</span>
                  <p className="text-sm text-gray-400 group-hover:text-gray-200">Combien de clients différents avons-nous ?</p>
                </div>
              </div>

              {/* Hero Input */}
              <form onSubmit={handleSend} className="w-full bg-[#0f1524]/80 backdrop-blur-3xl border border-white/10 rounded-3xl p-2 shadow-[0_8px_32px_rgba(0,0,0,0.5)] focus-within:border-red-500/50 transition-colors">
                <div className="flex items-center px-4 pt-3 pb-2">
                  <Sparkles className="h-5 w-5 text-red-500 mr-3" />
                  <input type="text" value={input} onChange={(e) => setInput(e.target.value)} placeholder="Demandez moi n'importe quoi..." className="w-full bg-transparent border-none text-gray-200 placeholder-gray-500 focus:outline-none text-lg" />
                </div>
                <div className="h-[1px] w-full bg-gradient-to-r from-transparent via-white/10 to-transparent my-2"></div>
                <div className="flex justify-between items-center px-2 pb-1">
                  <button type="button" className="flex items-center gap-2 px-4 py-2 bg-white/5 hover:bg-white/10 rounded-xl text-sm text-gray-400 transition-colors">
                    <Paperclip className="h-4 w-4" /> Joindre un fichier
                  </button>
                  <button type="submit" disabled={!input.trim()} className="p-3 bg-red-600 hover:bg-red-500 text-white rounded-xl transition-colors disabled:opacity-50 disabled:cursor-not-allowed shadow-[0_0_15px_rgba(220,38,38,0.4)]">
                    <ArrowUp className="h-5 w-5" />
                  </button>
                </div>
              </form>
            </div>
          </div>
        ) : (

          /* --- VIEW B: CHAT STATE --- */
          <div className="flex flex-col h-full w-full max-w-5xl mx-auto pt-20 px-4 md:px-8 animate-in fade-in duration-500">
            
            {/* Messages Area */}
            <main ref={chatContainerRef} className="flex-1 overflow-y-auto custom-scrollbar pr-4 space-y-6 pb-6 min-h-0">
              {messages.map((msg, index) => (
                <div key={index} className={`flex gap-4 ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}>
                  
                  {msg.role === 'ai' && (
                    <div className="w-10 h-10 rounded-full bg-gradient-to-br from-red-500 to-orange-600 flex items-center justify-center flex-shrink-0 shadow-lg mt-1 border border-white/10">
                      <Bot className="h-5 w-5 text-white" />
                    </div>
                  )}

                  {msg.role === 'user' && (
                    <div className="max-w-[75%] p-4 rounded-3xl text-sm leading-relaxed shadow-[0_4px_20px_rgba(0,0,0,0.3)] bg-white/10 border border-white/10 text-white rounded-tr-sm backdrop-blur-md">
                      <span className="whitespace-pre-wrap">{msg.content}</span>
                    </div>
                  )}

                  {msg.role === 'ai' && (
                    <div className="flex flex-col items-start max-w-[75%]">
                      <div id={`ai-message-${index}`} className="p-5 w-full rounded-3xl text-sm leading-relaxed shadow-[0_4px_20px_rgba(0,0,0,0.3)] bg-[#0f1524]/80 backdrop-blur-xl border border-white/10 text-gray-200 rounded-tl-sm prose prose-invert max-w-none [&>p]:mb-3">
                        <ReactMarkdown>{msg.content}</ReactMarkdown>
                      </div>
                      
                      <div className="flex items-center gap-4 mt-3 ml-2">
                        <button onClick={() => handleCopyText(msg.content, index)} className="flex items-center gap-1.5 text-[11px] font-medium text-gray-500 hover:text-red-500 transition-colors">
                          {copiedIndex === index ? <><Check className="h-3 w-3 text-red-500" /> <span className="text-red-500">Copié</span></> : <><Copy className="h-3 w-3" /> Copier</>}
                        </button>
                        <button onClick={() => handleExportPDF(index)} className="flex items-center gap-1.5 text-[11px] font-medium text-gray-500 hover:text-red-500 transition-colors">
                          <Download className="h-3 w-3" /> Exporter PDF
                        </button>
                      </div>
                    </div>
                  )}
                  
                  {msg.role === 'user' && (
                    <div className="w-10 h-10 rounded-full bg-white/10 border border-white/10 flex items-center justify-center flex-shrink-0 mt-1 backdrop-blur-md">
                      <User className="h-5 w-5 text-gray-300" />
                    </div>
                  )}
                </div>
              ))}

              {isLoading && (
                <div className="flex gap-4 justify-start">
                  <div className="w-10 h-10 rounded-full bg-gradient-to-br from-red-500 to-orange-600 flex items-center justify-center flex-shrink-0 shadow-lg border border-white/10">
                    <Bot className="h-5 w-5 text-white" />
                  </div>
                  <div className="bg-[#0f1524]/80 backdrop-blur-xl border border-white/10 py-4 px-5 rounded-3xl rounded-tl-sm shadow-[0_4px_20px_rgba(0,0,0,0.3)] flex items-center gap-2 h-[52px]">
                    <div className="w-2 h-2 bg-red-500 rounded-full animate-bounce" style={{ animationDelay: '0ms' }}></div>
                    <div className="w-2 h-2 bg-red-500 rounded-full animate-bounce" style={{ animationDelay: '150ms' }}></div>
                    <div className="w-2 h-2 bg-red-500 rounded-full animate-bounce" style={{ animationDelay: '300ms' }}></div>
                  </div>
                </div>
              )}
            </main>

            {/* Chat Input */}
            <div className="flex-shrink-0 py-4 bg-[#050914]/50 backdrop-blur-sm">
              <form onSubmit={handleSend} className="w-full bg-[#0f1524]/90 backdrop-blur-3xl border border-white/10 rounded-2xl p-1 shadow-[0_8px_32px_rgba(0,0,0,0.5)] flex items-center focus-within:border-red-500/50 transition-colors">
                <button type="button" className="p-3 text-gray-500 hover:text-white transition-colors">
                  <Paperclip className="h-5 w-5" />
                </button>
                <input type="text" value={input} onChange={(e) => setInput(e.target.value)} placeholder="Posez votre question..." className="flex-1 bg-transparent border-none text-gray-200 placeholder-gray-500 focus:outline-none text-sm px-2" disabled={isLoading} />
                <button type="submit" disabled={!input.trim() || isLoading} className="p-2.5 m-1 bg-red-600 hover:bg-red-500 text-white rounded-xl transition-colors disabled:opacity-50 disabled:cursor-not-allowed shadow-[0_0_10px_rgba(220,38,38,0.3)]">
                  <ArrowUp className="h-4 w-4" />
                </button>
              </form>
              <p className="text-center text-[10px] text-gray-500 mt-3">L'IA peut faire des erreurs. Vérifiez toujours les données critiques.</p>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}