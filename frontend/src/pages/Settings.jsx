import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';
import { 
  Menu, User, Lock, Cpu, Palette, Save, 
  ShieldAlert, Bell, Globe, PanelLeftClose, PanelLeftOpen
} from 'lucide-react';
import Sidebar from '../components/Sidebar';

export default function Settings() {
  const navigate = useNavigate();
  
  const [isSidebarOpen, setIsSidebarOpen] = useState(window.innerWidth > 768);
  const [activeTab, setActiveTab] = useState('general');
  const [toast, setToast] = useState({ show: false, message: '', type: 'success' });
  const [isLoading, setIsLoading] = useState(false);

  const [formData, setFormData] = useState({
    prenom: '',
    nom: '',
    email: '',
    role: '',
    aiModel: '',
    syncInterval: '',
    language: '',
    notifications: true
  });

  const getAxiosConfig = () => {
    const token = localStorage.getItem('pegasus_token');
    return { headers: { Authorization: `Bearer ${token}` } };
  };

  useEffect(() => {
    const fetchSettings = async () => {
      try {
        const response = await axios.get(`${import.meta.env.VITE_API_URL}/user-settings`, getAxiosConfig());
        const data = response.data;
        
        setFormData({
          prenom: data.prenom || '',
          nom: data.nom || '',
          email: data.email || '',
          role: data.role || 'Opérateur',
          aiModel: data.ai_model || 'llama3.1-8b',
          syncInterval: data.sync_interval || '1h',
          language: data.language || 'fr',
          notifications: data.notifications !== undefined ? data.notifications : true
        });
      } catch (error) {
        console.error("Erreur de chargement des paramètres:", error);
        if (error.response && error.response.status === 401) {
          localStorage.removeItem('pegasus_token');
          navigate('/login');
        }
      }
    };
    fetchSettings();
  }, [navigate]);

  useEffect(() => {
    const handleResize = () => setIsSidebarOpen(window.innerWidth > 768);
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  const handleSave = async (e) => {
    e.preventDefault();
    setIsLoading(true);
    
    try {
      await axios.put(`${import.meta.env.VITE_API_URL}/user-settings`, formData, getAxiosConfig());
      setToast({ show: true, message: 'Configuration système mise à jour.', type: 'success' });
    } catch (error) {
      console.error("Erreur de sauvegarde:", error);
      setToast({ show: true, message: 'Échec de la sauvegarde des paramètres.', type: 'error' });
    } finally {
      setIsLoading(false);
      setTimeout(() => setToast({ show: false, message: '', type: 'success' }), 4000);
    }
  };

  const handleInputChange = (e) => {
    const { name, value, type, checked } = e.target;
    setFormData(prev => ({ ...prev, [name]: type === 'checkbox' ? checked : value }));
  };

  const tabs = [
    { id: 'general', label: 'Profil Exécutif', icon: User },
    { id: 'security', label: 'Sécurité & Accès', icon: Lock },
    { id: 'system', label: 'Moteur IA & Base', icon: Cpu },
    { id: 'appearance', label: 'Interface UI', icon: Palette }
  ];

  return (
    <div className="flex h-screen w-full overflow-hidden bg-black text-gray-200 font-sans relative selection:bg-white/20 selection:text-white">
      
      {/* GRID BACKGROUND */}
      <div className="absolute inset-0 z-0 opacity-10 pointer-events-none" 
           style={{ backgroundImage: 'linear-gradient(to right, #ffffff 1px, transparent 1px), linear-gradient(to bottom, #ffffff 1px, transparent 1px)', backgroundSize: '40px 40px' }}>
      </div>

      <Sidebar isSidebarOpen={isSidebarOpen} setIsSidebarOpen={setIsSidebarOpen} />

      <div className="flex-1 flex flex-col min-w-0 h-screen relative z-10">
        
        {/* MOBILE HEADER */}
        <header className="md:hidden flex-shrink-0 bg-black border-b border-white/10 px-6 py-4 flex justify-between items-center z-20">
          <button onClick={() => setIsSidebarOpen(!isSidebarOpen)} className="text-gray-400 hover:text-white transition-colors">
            <Menu className="h-6 w-6" />
          </button>
          <h1 className="text-xl font-serif font-bold text-white">Paramètres</h1>
        </header>

        {/* DESKTOP HEADER */}
        <div className="flex-shrink-0 border-b border-white/10 bg-black">
           <div className="p-8 hidden md:flex justify-between items-start">
             <div>
                <h1 className="text-3xl text-white font-serif tracking-tight">Configuration Système</h1>
                <p className="text-xs text-gray-500 uppercase tracking-widest mt-2 font-mono">Gestion du Profil et Télémétrie</p>
             </div>
             <button onClick={() => setIsSidebarOpen(!isSidebarOpen)} className="text-gray-500 hover:text-white transition-colors p-2 hover:bg-white/5">
                {isSidebarOpen ? <PanelLeftClose className="h-5 w-5" /> : <PanelLeftOpen className="h-5 w-5" />}
             </button>
          </div>
        </div>

        <main className="flex-1 overflow-hidden flex flex-col md:flex-row bg-black">
          
          {/* LEFT COLUMN: NAVIGATION */}
          <div className="w-full md:w-64 flex-shrink-0 border-b md:border-b-0 md:border-r border-white/10 bg-[#050505] overflow-x-auto md:overflow-y-auto custom-scrollbar">
            <div className="flex flex-row md:flex-col">
              {tabs.map((tab) => (
                <button 
                  key={tab.id}
                  type="button" 
                  onClick={() => setActiveTab(tab.id)} 
                  className={`flex items-center gap-3 px-8 py-5 text-[11px] uppercase tracking-widest font-medium transition-all whitespace-nowrap md:whitespace-normal
                    ${activeTab === tab.id 
                      ? 'text-white border-b-2 md:border-b-0 md:border-l-2 border-red-600 bg-white/[0.02]' 
                      : 'text-gray-500 hover:text-gray-300 hover:bg-white/[0.01] border-b-2 md:border-b-0 md:border-l-2 border-transparent'
                    }`}
                >
                  <tab.icon className="h-4 w-4 flex-shrink-0" /> {tab.label}
                </button>
              ))}
            </div>
          </div>

          {/* RIGHT COLUMN: FORM CONTENT */}
          <div className="flex-1 overflow-y-auto custom-scrollbar p-6 md:p-12">
            <div className="max-w-3xl animate-in fade-in duration-500">
              <form onSubmit={handleSave}>
                
                {/* --- TAB: GENERAL --- */}
                {activeTab === 'general' && (
                  <div className="space-y-10">
                    <div className="border-b border-white/10 pb-4">
                      <h2 className="text-2xl font-serif text-white tracking-tight mb-2">Profil Exécutif</h2>
                      <p className="text-[10px] uppercase tracking-widest font-mono text-gray-500">Identifiants d'opération et accès.</p>
                    </div>
                    
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                      <div className="space-y-2">
                        <label className="text-[10px] text-gray-500 uppercase tracking-widest font-mono block">Prénom</label>
                        <input type="text" name="prenom" value={formData.prenom} onChange={handleInputChange} className="w-full bg-transparent border-b border-white/20 pb-2 text-sm text-white font-mono focus:outline-none focus:border-red-600 transition-colors" />
                      </div>
                      <div className="space-y-2">
                        <label className="text-[10px] text-gray-500 uppercase tracking-widest font-mono block">Nom</label>
                        <input type="text" name="nom" value={formData.nom} onChange={handleInputChange} className="w-full bg-transparent border-b border-white/20 pb-2 text-sm text-white font-mono focus:outline-none focus:border-red-600 transition-colors" />
                      </div>
                      <div className="space-y-2 md:col-span-2">
                        <label className="text-[10px] text-gray-500 uppercase tracking-widest font-mono block">Email Professionnel</label>
                        <input type="email" name="email" value={formData.email} onChange={handleInputChange} className="w-full bg-transparent border-b border-white/20 pb-2 text-sm text-white font-mono focus:outline-none focus:border-red-600 transition-colors" />
                      </div>
                      <div className="space-y-2 md:col-span-2">
                        <label className="text-[10px] text-gray-500 uppercase tracking-widest font-mono block">Niveau d'Accès</label>
                        <input type="text" value={formData.role} disabled className="w-full bg-transparent border-b border-white/10 pb-2 text-sm text-gray-600 font-mono cursor-not-allowed" />
                      </div>
                    </div>
                  </div>
                )}

                {/* --- TAB: SECURITY --- */}
                {activeTab === 'security' && (
                  <div className="space-y-10">
                    <div className="border-b border-white/10 pb-4">
                      <h2 className="text-2xl font-serif text-white tracking-tight mb-2">Sécurité & Accès</h2>
                      <p className="text-[10px] uppercase tracking-widest font-mono text-gray-500">Chiffrement et gestion des clés.</p>
                    </div>
                    
                    <div className="space-y-8 max-w-lg">
                      <div className="space-y-2">
                        <label className="text-[10px] text-gray-500 uppercase tracking-widest font-mono block">Mot de passe actuel</label>
                        <input type="password" placeholder="••••••••" className="w-full bg-transparent border-b border-white/20 pb-2 text-sm text-white font-mono focus:outline-none focus:border-red-600 transition-colors tracking-[0.3em]" />
                      </div>
                      <div className="space-y-2">
                        <label className="text-[10px] text-gray-500 uppercase tracking-widest font-mono block">Nouveau mot de passe</label>
                        <input type="password" placeholder="••••••••" className="w-full bg-transparent border-b border-white/20 pb-2 text-sm text-white font-mono focus:outline-none focus:border-red-600 transition-colors tracking-[0.3em]" />
                      </div>
                      <div className="space-y-2">
                        <label className="text-[10px] text-gray-500 uppercase tracking-widest font-mono block">Confirmer la clé</label>
                        <input type="password" placeholder="••••••••" className="w-full bg-transparent border-b border-white/20 pb-2 text-sm text-white font-mono focus:outline-none focus:border-red-600 transition-colors tracking-[0.3em]" />
                      </div>
                    </div>

                    <div className="mt-12 p-6 border border-red-600/30 bg-[#050505] relative overflow-hidden">
                      <div className="absolute top-0 left-0 w-1 h-full bg-red-600"></div>
                      <h3 className="text-red-500 font-serif text-xl flex items-center gap-3 mb-3">
                        <ShieldAlert className="h-5 w-5" /> Protocole de Désactivation
                      </h3>
                      <p className="text-[11px] uppercase tracking-widest font-mono text-gray-500 mb-6 leading-relaxed">
                        Cette action est irréversible. L'accès au serveur local et aux données synchronisées sera définitivement révoqué.
                      </p>
                      <button type="button" className="border border-red-600 text-red-500 hover:bg-red-600 hover:text-white px-6 py-2.5 text-[10px] uppercase tracking-widest font-bold transition-colors">
                        RÉVOQUER L'ACCÈS
                      </button>
                    </div>
                  </div>
                )}

                {/* --- TAB: SYSTEM --- */}
                {activeTab === 'system' && (
                  <div className="space-y-10">
                    <div className="border-b border-white/10 pb-4">
                      <h2 className="text-2xl font-serif text-white tracking-tight mb-2">Moteur IA & Télémétrie</h2>
                      <p className="text-[10px] uppercase tracking-widest font-mono text-gray-500">Allocation des ressources et pipelines.</p>
                    </div>
                    
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-12">
                      <div className="space-y-6">
                        <h3 className="text-sm font-bold text-white uppercase tracking-widest">Processeur Neuronal</h3>
                        <div className="space-y-2">
                          <label className="text-[10px] text-gray-500 uppercase tracking-widest font-mono block">Modèle LLM Local</label>
                          <select name="aiModel" value={formData.aiModel} onChange={handleInputChange} className="w-full bg-transparent border-b border-white/20 pb-2 text-sm text-white font-mono focus:outline-none focus:border-red-600 transition-colors [&>option]:bg-[#0a0a0a]">
                            <option value="llama3.1-8b">Llama 3.1 (8B) - Opt. SQL</option>
                            <option value="mistral-nemo">Mistral Nemo (12B)</option>
                            <option value="phi3">Phi-3 Mini (3.8B)</option>
                          </select>
                        </div>
                        <div className="p-4 border border-blue-500/30 bg-[#050505] relative">
                           <div className="absolute top-0 left-0 w-1 h-full bg-blue-500"></div>
                           <p className="text-[10px] uppercase tracking-widest font-mono text-gray-400 leading-relaxed">
                             <span className="text-blue-400 font-bold block mb-1">ALLOCATION RAM ACTUELLE :</span>
                             Le modèle est monté en mémoire vive sur l'hôte Docker.
                           </p>
                        </div>
                      </div>

                      <div className="space-y-6">
                        <h3 className="text-sm font-bold text-white uppercase tracking-widest">Pipeline de Données</h3>
                        <div className="space-y-2">
                          <label className="text-[10px] text-gray-500 uppercase tracking-widest font-mono block">Fréquence MySQL</label>
                          <select name="syncInterval" value={formData.syncInterval} onChange={handleInputChange} className="w-full bg-transparent border-b border-white/20 pb-2 text-sm text-white font-mono focus:outline-none focus:border-red-600 transition-colors [&>option]:bg-[#0a0a0a]">
                            <option value="15m">Intervalle: 15 minutes</option>
                            <option value="1h">Intervalle: 1 heure</option>
                            <option value="24h">Routine Quotidienne</option>
                            <option value="manual">Mode Manuel</option>
                          </select>
                        </div>
                      </div>
                    </div>
                  </div>
                )}

                {/* --- TAB: APPEARANCE --- */}
                {activeTab === 'appearance' && (
                  <div className="space-y-10">
                    <div className="border-b border-white/10 pb-4">
                      <h2 className="text-2xl font-serif text-white tracking-tight mb-2">Interface & Alertes</h2>
                      <p className="text-[10px] uppercase tracking-widest font-mono text-gray-500">Topologie visuelle du système.</p>
                    </div>
                    
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-12">
                      <div className="space-y-8">
                        <div className="space-y-2">
                          <label className="text-[10px] text-gray-500 uppercase tracking-widest font-mono block flex items-center gap-2"><Globe className="h-3 w-3"/> Localisation</label>
                          <select name="language" value={formData.language} onChange={handleInputChange} className="w-full bg-transparent border-b border-white/20 pb-2 text-sm text-white font-mono focus:outline-none focus:border-red-600 transition-colors [&>option]:bg-[#0a0a0a]">
                            <option value="fr">Français (FR)</option>
                            <option value="en">English (US)</option>
                          </select>
                        </div>

                        <div className="flex items-center justify-between pt-4">
                          <div>
                            <p className="text-[11px] font-bold text-white uppercase tracking-widest flex items-center gap-2 mb-1"><Bell className="h-3 w-3" /> Flux d'Alertes</p>
                            <p className="text-[10px] text-gray-500 font-mono">Recevoir les logs d'erreurs par email.</p>
                          </div>
                          {/* Brutalist Toggle */}
                          <label className="relative inline-flex items-center cursor-pointer">
                            <input type="checkbox" name="notifications" checked={formData.notifications} onChange={handleInputChange} className="sr-only peer" />
                            <div className="w-10 h-5 bg-white/10 peer-focus:outline-none peer peer-checked:after:translate-x-full after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-gray-400 after:h-4 after:w-4 after:transition-all peer-checked:bg-red-600 peer-checked:after:bg-white rounded-sm after:rounded-sm"></div>
                          </label>
                        </div>
                      </div>

                      <div className="p-8 border border-white/5 bg-[#050505] flex flex-col items-center justify-center text-center">
                        <Palette className="h-6 w-6 text-gray-600 mb-4" />
                        <h3 className="text-[11px] font-bold text-white uppercase tracking-widest mb-2">Thème Verrouillé</h3>
                        <p className="text-[10px] uppercase tracking-widest font-mono text-gray-500 leading-relaxed max-w-[200px]">
                          L'interface "Cinematic Monolith" est verrouillée par l'administrateur système.
                        </p>
                      </div>
                    </div>
                  </div>
                )}

                {/* GLOBAL SAVE BUTTON */}
                <div className="mt-12 pt-6 border-t border-white/10 flex justify-end">
                  <button type="submit" disabled={isLoading} className="bg-white text-black hover:bg-gray-200 px-8 py-3 text-[11px] uppercase tracking-widest font-bold transition-colors disabled:opacity-50 flex items-center gap-2">
                    {isLoading ? (
                      <div className="w-3 h-3 border-2 border-black border-t-transparent rounded-full animate-spin"></div>
                    ) : (
                      <><Save className="h-4 w-4" /> CONFIRMER LES PARAMÈTRES</>
                    )}
                  </button>
                </div>

              </form>
            </div>
          </div>

        </main>
      </div>

      {/* STRICT CINEMATIC TOAST */}
      {toast.show && (
        <div className={`fixed bottom-8 right-8 flex items-center gap-4 px-6 py-4 border-l-4 z-50 bg-[#111] border-y border-r border-white/10 text-sm font-medium transition-all animate-fade-in-up ${
          toast.type === 'success' ? 'border-l-emerald-500 text-white' : 
          toast.type === 'error' ? 'border-l-red-500 text-red-100' : 
          'border-l-blue-500 text-white'
        }`}>
          {toast.message}
        </div>
      )}
    </div>
  );
}