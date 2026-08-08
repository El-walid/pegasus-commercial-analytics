import React, { useState, useRef, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';
import ReactMarkdown from 'react-markdown';
import html2pdf from 'html2pdf.js';

import {
  Bot, Paperclip, ArrowUp, Download, Copy, Check, ArrowLeft, 
  PanelLeftClose, PanelLeftOpen, Bookmark, Pin, Trash2, X, FileText
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
  const [pinnedIndex, setPinnedIndex] = useState(null);
  const [showPinnedDrawer, setShowPinnedDrawer] = useState(false);
  const [isExporting, setIsExporting] = useState(false);
  
  // Storage local pour le Pinboard
  const [pinnedCards, setPinnedCards] = useState(() => {
    const saved = localStorage.getItem('pegasus_pinned_cards');
    return saved ? JSON.parse(saved) : [];
  });

  const chatContainerRef = useRef(null);
  const [name, setName] = useState("Guest");

  // Suggestions statiques
  const staticSuggestions = [
    { tag: 'PERFORMANCE', desc: 'Qui est notre meilleur commercial ce mois-ci ?' },
    { tag: 'TENDANCE', desc: 'Générer un résumé du chiffre d\'affaires par division.' },
    { tag: 'CLIENTS', desc: 'Quel est notre top 5 des clients en volume MAD ?' }
  ];

  useEffect(() => {
    localStorage.setItem('pegasus_pinned_cards', JSON.stringify(pinnedCards));
  }, [pinnedCards]);

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
        console.error("Erreur de chargement utilisateur:", error);
      }
    };
    fetchUserData();
  }, []);

  useEffect(() => {
    if (hasStartedChat && chatContainerRef.current) {
      setTimeout(() => {
        chatContainerRef.current.scrollTo({ top: chatContainerRef.current.scrollHeight, behavior: 'smooth' });
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
      filename: `Analyse_Unitaire_${new Date().toISOString().slice(0, 10)}.pdf`,
      image: { type: 'jpeg', quality: 0.98 },
      html2canvas: { scale: 2 },
      jsPDF: { unit: 'mm', format: 'a4', orientation: 'portrait' }
    };
    html2pdf().set(opt).from(element).save();
  };

  // NOUVEAU : Exporter tout le Canvas en Rapport PDF Exécutif
  const handleExportCanvasPDF = () => {
    setIsExporting(true);
    const element = document.getElementById('canvas-export-container');
    const opt = {
      margin: [15, 15],
      filename: `Rapport_Pegasus_${new Date().toISOString().slice(0, 10)}.pdf`,
      image: { type: 'jpeg', quality: 0.98 },
      html2canvas: { scale: 2, useCORS: true , windowWidth: 700},
      jsPDF: { unit: 'mm', format: 'a4', orientation: 'portrait' }
    };

    html2pdf().set(opt).from(element).save().then(() => {
      setIsExporting(false);
    });
  };

  const handlePinMessage = (msg, index) => {
    const newCard = {
      id: Date.now(),
      prompt: msg.originalPrompt,
      content: msg.content,
      date: new Date().toLocaleDateString('fr-FR', { day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit' })
    };
    
    setPinnedCards(prev => [newCard, ...prev]);
    setPinnedIndex(index);
    setTimeout(() => setPinnedIndex(null), 2000);
  };

  const handleRemovePinned = (id) => {
    setPinnedCards(prev => prev.filter(card => card.id !== id));
  };

  const executeQuery = async (promptText) => {
    if (!promptText.trim()) return;

    setHasStartedChat(true);
    const userMessage = { role: 'user', content: promptText };
    setMessages(prev => [...prev, userMessage]);
    setInput('');
    setIsLoading(true);

    try {
      const response = await axios.post(`${import.meta.env.VITE_API_URL}/ai-query`, { prompt: promptText });
      setMessages(prev => [...prev, { 
        role: 'ai', 
        content: response.data.answer,
        originalPrompt: promptText
      }]);
    } catch (error) {
      const errorMessage = error.response?.data?.answer || "Désolé, une erreur de connexion au processeur neuronal est survenue.";
      setMessages(prev => [...prev, { 
        role: 'ai', 
        content: errorMessage, 
        originalPrompt: promptText 
      }]);
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

      {/* AMBIENT BACKGROUND */}
      <style>{`
        @keyframes pulse-core {
          0%, 100% { opacity: 0.3; transform: translate(-50%, -50%) scale(0.85); }
          50% { opacity: 0.7; transform: translate(-50%, -50%) scale(1.15); }
        }
        .animate-core { animation: pulse-core 6s ease-in-out infinite; }
      `}</style>

      <div className="absolute inset-0 z-0 opacity-10 pointer-events-none" style={{ backgroundImage: 'linear-gradient(to right, #ffffff 1px, transparent 1px), linear-gradient(to bottom, #ffffff 1px, transparent 1px)', backgroundSize: '40px 40px' }}></div>
      <div className={`absolute left-1/2 top-1/2 w-[600px] h-[600px] bg-red-600/50 rounded-full blur-[100px] mix-blend-screen pointer-events-none transition-all duration-1000 ease-in-out z-0 ${hasStartedChat ? 'opacity-10 -translate-y-1/4 scale-75' : 'animate-core'}`}></div>

      <Sidebar isSidebarOpen={isSidebarOpen} setIsSidebarOpen={setIsSidebarOpen} />

      <div className="flex-1 flex flex-col min-w-0 h-screen relative z-10">

        {/* TOP CONTROL BAR */}
        <header className="flex-shrink-0 bg-transparent border-b border-white/5 px-6 py-4 flex justify-between items-center z-20 absolute top-0 w-full backdrop-blur-sm">
          <div className="flex items-center gap-4">
            <button onClick={() => setIsSidebarOpen(!isSidebarOpen)} className="text-gray-500 hover:text-white transition-colors p-2 hover:bg-white/5 rounded-md">
              {isSidebarOpen ? <PanelLeftClose className="h-5 w-5" /> : <PanelLeftOpen className="h-5 w-5" />}
            </button>
            {hasStartedChat && (
              <button onClick={() => { setHasStartedChat(false); setMessages([]); }} className="flex items-center gap-2 px-3 py-1.5 rounded text-[10px] uppercase tracking-widest text-gray-500 hover:text-red-500 transition-colors border border-transparent hover:border-red-500/20">
                <ArrowLeft className="h-3 w-3" /> Nouvelle Analyse
              </button>
            )}
          </div>

          <div className="flex items-center gap-4">
            <button 
              onClick={() => setShowPinnedDrawer(true)}
              className="flex items-center gap-2 px-3 py-1.5 bg-white/5 border border-white/10 hover:border-white/30 text-gray-300 hover:text-white text-[10px] uppercase tracking-widest transition-colors font-mono"
            >
              <Bookmark className="h-3.5 w-3.5 text-red-500" />
              <span>Épingles ({pinnedCards.length})</span>
            </button>

            <div className="hidden sm:flex items-center gap-2 border-l border-white/10 pl-4">
              <span className="inline-block w-2 h-2 rounded-full bg-red-600 animate-pulse"></span>
              <span className="text-[10px] text-gray-500 uppercase tracking-widest font-mono">Pegasus Engine Actif</span>
            </div>
          </div>
        </header>

        {/* HERO VIEW */}
        {!hasStartedChat ? (
          <div className="flex-1 flex flex-col items-center justify-center px-4 md:px-8 animate-in fade-in duration-700 relative z-10">
            <div className="w-full max-w-3xl flex flex-col items-start">
              <h1 className="text-5xl md:text-6xl text-white font-serif tracking-tight mb-2">Opérateur {name}.</h1>
              <h2 className="text-2xl md:text-3xl text-gray-500 font-serif mb-12">Que puis-je analyser pour vous ?</h2>

              {/* STATIC SUGGESTIONS */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-12 w-full">
                {staticSuggestions.map((item, idx) => (
                  <div key={idx} onClick={() => executeQuery(item.desc)} className="bg-[#050505] border border-white/10 p-6 hover:bg-white/[0.02] hover:border-red-600/50 transition-all cursor-pointer group flex flex-col justify-between">
                    <div>
                      <span className="text-[10px] text-gray-500 group-hover:text-red-500 uppercase tracking-widest font-mono mb-3 block transition-colors">[{item.tag}]</span>
                      <p className="text-sm text-gray-300 group-hover:text-white transition-colors line-clamp-3">{item.desc}</p>
                    </div>
                  </div>
                ))}
              </div>

              <form onSubmit={handleSend} className="w-full bg-[#050505] border border-white/20 p-2 flex items-center focus-within:border-red-600 transition-colors">
                <button type="button" className="p-3 text-gray-500 hover:text-white transition-colors">
                  <Paperclip className="h-5 w-5" />
                </button>
                <input type="text" value={input} onChange={(e) => setInput(e.target.value)} placeholder="Exécuter une requête..." className="flex-1 bg-transparent border-none text-white placeholder-gray-600 focus:outline-none text-lg px-2 font-serif" />
                <button type="submit" disabled={!input.trim()} className="px-6 py-3 bg-white text-black hover:bg-gray-200 text-[11px] uppercase tracking-widest font-bold transition-colors disabled:opacity-50 disabled:cursor-not-allowed">Envoyer</button>
              </form>
            </div>
          </div>
        ) : (

          /* CHAT VIEW */
          <div className="flex flex-col h-full w-full max-w-4xl mx-auto pt-24 px-4 md:px-8 animate-in fade-in duration-500 relative z-10">
            
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
                    <div className="flex flex-col items-start w-full max-w-[90%] md:max-w-[85%]">
                      <div id={`ai-message-${index}`} className="px-6 py-5 w-full text-sm leading-relaxed bg-[#0a0a0a] border border-white/10 text-gray-200 rounded-2xl rounded-tl-none prose prose-invert prose-p:leading-relaxed prose-headings:font-serif prose-headings:font-normal max-w-none [&>p]:mb-4 last:[&>p]:mb-0">
                        <ReactMarkdown>{msg.content}</ReactMarkdown>
                      </div>

                      <div className="flex items-center gap-4 mt-2 ml-2">
                        <button onClick={() => handleCopyText(msg.content, index)} className="flex items-center gap-1.5 text-[9px] uppercase tracking-widest font-mono text-gray-500 hover:text-red-500 transition-colors">
                          {copiedIndex === index ? <><Check className="h-3 w-3 text-red-500" /> <span className="text-red-500">Copié</span></> : <><Copy className="h-3 w-3" /> Copier</>}
                        </button>

                        <button onClick={() => handleExportPDF(index)} className="flex items-center gap-1.5 text-[9px] uppercase tracking-widest font-mono text-gray-500 hover:text-red-500 transition-colors">
                          <Download className="h-3 w-3" /> Exporter PDF
                        </button>

                        <span className="text-white/10">|</span>

                        <button onClick={() => handlePinMessage(msg, index)} className="flex items-center gap-1.5 text-[9px] uppercase tracking-widest font-mono text-gray-500 hover:text-amber-400 transition-colors">
                          {pinnedIndex === index ? <><Check className="h-3 w-3 text-amber-400" /> <span className="text-amber-400">Épinglé</span></> : <><Pin className="h-3 w-3" /> Épingler au Canvas</>}
                        </button>
                      </div>
                    </div>
                  )}
                </div>
              ))}

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

            <div className="flex-shrink-0 py-6 bg-gradient-to-t from-black via-black to-transparent">
              <form onSubmit={handleSend} className="w-full bg-[#050505] border border-white/20 p-1 flex items-center focus-within:border-red-600 transition-colors">
                <button type="button" className="p-3 text-gray-500 hover:text-white transition-colors"><Paperclip className="h-4 w-4" /></button>
                <input type="text" value={input} onChange={(e) => setInput(e.target.value)} placeholder="Saisir la requête..." className="flex-1 bg-transparent border-none text-gray-200 placeholder-gray-600 focus:outline-none text-sm px-2 font-serif" disabled={isLoading} />
                <button type="submit" disabled={!input.trim() || isLoading} className="p-3 m-1 bg-white text-black hover:bg-gray-200 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"><ArrowUp className="h-4 w-4" /></button>
              </form>
            </div>
          </div>
        )}
      </div>

      {/* ========================================== */}
      {/* TIROIR DU CANVAS DE BORD (PINBOARD DRAWER) */}
      {/* ========================================== */}
      {showPinnedDrawer && (
        <div className="fixed inset-0 z-50 flex justify-end bg-black/80 backdrop-blur-md animate-in fade-in duration-300">
          <div className="w-full max-w-2xl bg-[#050505] border-l border-white/10 h-full flex flex-col p-6 md:p-8 relative">
            
            {/* Drawer Header */}
            <div className="flex justify-between items-center pb-6 border-b border-white/10">
              <div>
                <h2 className="text-2xl font-serif text-white flex items-center gap-3">
                  <Bookmark className="h-6 w-6 text-red-600" /> Canvas d'Analyses
                </h2>
                <p className="text-[10px] uppercase tracking-widest font-mono text-gray-500 mt-1">Analyses & Extractions Épinglées</p>
              </div>
              <button onClick={() => setShowPinnedDrawer(false)} className="p-2 text-gray-500 hover:text-white transition-colors">
                <X className="h-6 w-6" />
              </button>
            </div>

            {/* Pinned Items List */}
            <div className="flex-1 overflow-y-auto custom-scrollbar py-6 space-y-6">
              {pinnedCards.length === 0 ? (
                <div className="h-full flex flex-col items-center justify-center text-center p-8 border border-dashed border-white/10">
                  <Pin className="h-8 w-8 text-gray-600 mb-4" />
                  <p className="text-sm font-serif text-white mb-1">Aucune analyse épinglée</p>
                  <p className="text-[10px] uppercase tracking-widest font-mono text-gray-500">Cliquez sur "Épingler au Canvas" pour la conserver ici.</p>
                </div>
              ) : (
                pinnedCards.map((card) => (
                  <div key={card.id} className="bg-[#0a0a0a] border border-white/10 p-6 relative group">
                    <div className="flex justify-between items-start mb-4 pb-3 border-b border-white/5">
                      <div>
                        <span className="text-[9px] uppercase tracking-widest font-mono text-red-500 block mb-1">[{card.date}]</span>
                        <h3 className="text-sm font-serif text-white font-bold">{card.prompt}</h3>
                      </div>
                      <button onClick={() => handleRemovePinned(card.id)} className="text-gray-600 hover:text-red-500 transition-colors p-1" title="Supprimer">
                        <Trash2 className="h-4 w-4" />
                      </button>
                    </div>
                    
                    <div className="text-xs leading-relaxed text-gray-300 prose prose-invert max-w-none prose-p:mb-2 font-sans">
                      <ReactMarkdown>{card.content}</ReactMarkdown>
                    </div>
                  </div>
                ))
              )}
            </div>

            {/* Footer with Actions */}
            {pinnedCards.length > 0 && (
              <div className="pt-6 border-t border-white/10 flex flex-col gap-5">
                
                {/* GRAND BOUTON DE TÉLÉCHARGEMENT */}
                <button 
                  onClick={handleExportCanvasPDF} 
                  disabled={isExporting}
                  className="w-full bg-white text-black hover:bg-gray-200 px-6 py-4 text-[11px] uppercase tracking-widest font-bold transition-colors flex items-center justify-center gap-2 disabled:opacity-50"
                >
                  {isExporting ? (
                    <div className="w-4 h-4 border-2 border-black border-t-transparent rounded-full animate-spin"></div>
                  ) : (
                    <><FileText className="h-4 w-4" /> Générer Rapport PDF Exécutif</>
                  )}
                </button>

                <div className="flex justify-between items-center">
                  <span className="text-[10px] uppercase tracking-widest font-mono text-gray-500">{pinnedCards.length} élément(s) conservé(s)</span>
                  <button onClick={() => setPinnedCards([])} className="text-[10px] uppercase tracking-widest font-mono text-red-500 hover:text-red-400">
                    Vider le Canvas
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {/* ========================================== */}
      {/* HIDDEN CONTAINER FOR PDF GENERATION        */}
      {/* ========================================== */}
      <div style={{ position: 'absolute', left: '-9999px', top: '-9999px' }}>
        <div id="canvas-export-container" className="bg-white text-black p-8 w-[700px] min-h-[1122px] font-sans break-words">
          
          {/* En-tête du document PDF */}
          <div className="border-b-4 border-red-600 pb-6 mb-10">
            <h1 className="text-4xl font-serif font-bold text-black tracking-tight uppercase">Rapport d'Analyses Stratégiques</h1>
            <p className="text-xs font-mono text-gray-500 mt-2 uppercase tracking-widest">
              Pegasus Engine // Généré le {new Date().toLocaleDateString('fr-FR')} par Opérateur {name}
            </p>
          </div>

          {/* Corps du document */}
          <div className="space-y-12">
            {pinnedCards.map((card) => (
              <div key={card.id} className="border border-gray-300 p-8" style={{ pageBreakInside: 'avoid' }}>
                <div className="text-[10px] font-mono text-red-600 tracking-widest uppercase mb-3">
                  [{card.date}]
                </div>
                <h2 className="text-2xl font-serif font-bold text-black mb-6 border-b border-gray-100 pb-4">
                  Demande : "{card.prompt}"
                </h2>
                
                {/* Le contenu Markdown, stylisé pour du texte noir sur fond blanc */}
                <div className="prose prose-sm max-w-none text-gray-800 prose-p:leading-relaxed prose-headings:font-serif prose-headings:text-black">
                  <ReactMarkdown>{card.content}</ReactMarkdown>
                </div>
              </div>
            ))}
          </div>
          
          {/* Pied de page du document */}
          <div className="mt-16 pt-6 border-t border-gray-200 text-center">
            <p className="text-[9px] font-mono text-gray-400 uppercase tracking-widest">
              Document généré automatiquement par SEHI Pegasus Hub - Confidentiel
            </p>
          </div>

        </div>
      </div>

    </div>
  );
}