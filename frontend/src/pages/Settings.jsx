import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';
import { 
  Menu, X, User, Lock, Cpu, Palette, Save, CheckCircle2, 
  AlertCircle, ShieldAlert, Bell, Globe
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
          role: data.role || 'Utilisateur',
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
    const handleResize = () => {
      if (window.innerWidth <= 768) setIsSidebarOpen(false);
      else setIsSidebarOpen(true);
    };
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  const handleSave = async (e) => {
    e.preventDefault();
    setIsLoading(true);
    
    try {
      await axios.put(`${import.meta.env.VITE_API_URL}/user-settings`, formData, getAxiosConfig());
      setToast({ show: true, message: 'Paramètres sauvegardés avec succès.', type: 'success' });
    } catch (error) {
      console.error("Erreur de sauvegarde:", error);
      setToast({ show: true, message: 'Erreur lors de la sauvegarde.', type: 'error' });
    } finally {
      setIsLoading(false);
      setTimeout(() => setToast({ show: false, message: '', type: 'success' }), 3000);
    }
  };

  const handleInputChange = (e) => {
    const { name, value, type, checked } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: type === 'checkbox' ? checked : value
    }));
  };

  return (
    <div className="flex h-screen w-full overflow-hidden bg-[#050914] text-gray-200 font-sans relative">
      
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
        .animate-chaotic { animation: chaotic-drift 20s ease-in-out infinite; }
        .animate-chaotic-reverse { animation: chaotic-drift-reverse 25s ease-in-out infinite reverse; }
      `}</style>

      <div className="absolute inset-0 z-0 opacity-10 pointer-events-none" 
           style={{ backgroundImage: 'linear-gradient(to right, #ffffff 1px, transparent 1px), linear-gradient(to bottom, #ffffff 1px, transparent 1px)', backgroundSize: '40px 40px' }}>
      </div>

      <div className="absolute left-1/2 top-1/2 z-0 pointer-events-none opacity-40">
        <div className="absolute w-[600px] h-[600px] bg-gradient-to-r from-red-800 via-rose-900 to-purple-900 rounded-full blur-[120px] mix-blend-screen animate-chaotic"></div>
        <div className="absolute w-[500px] h-[500px] bg-gradient-to-tr from-amber-800 via-red-900 to-yellow-800 rounded-full blur-[100px] mix-blend-screen animate-chaotic-reverse" style={{ animationDelay: '-5s' }}></div>
      </div>

      <Sidebar isSidebarOpen={isSidebarOpen} setIsSidebarOpen={setIsSidebarOpen} />

      <div className="flex-1 flex flex-col min-w-0 h-screen relative z-10">
        
        <header className="flex-shrink-0 bg-[#0f1524]/60 backdrop-blur-2xl border-b border-white/10 px-6 md:px-8 py-4 flex justify-between items-center z-20">
          <div className="flex items-center gap-4">
            <button onClick={() => setIsSidebarOpen(!isSidebarOpen)} className="p-2 rounded-xl bg-white/5 border border-white/10 text-gray-300 hover:bg-white/10 transition-colors">
              <Menu className="h-5 w-5" />
            </button>
            <h1 className="text-xl md:text-2xl font-bold text-white tracking-tight">Paramètres</h1>
          </div>
        </header>

        <main className="flex-1 overflow-y-auto p-4 md:p-8 custom-scrollbar">
          
          <div className="max-w-5xl mx-auto flex flex-col md:flex-row gap-8">
            
            <div className="w-full md:w-64 flex-shrink-0">
              <div className="bg-[#0f1524]/70 backdrop-blur-3xl p-3 rounded-3xl shadow-[0_8px_32px_rgba(0,0,0,0.4)] border border-white/10 sticky top-0 flex flex-row md:flex-col gap-2 overflow-x-auto md:overflow-visible">
                <button type="button" onClick={() => setActiveTab('general')} className={`flex items-center gap-3 px-4 py-3 rounded-2xl text-sm font-semibold transition-all whitespace-nowrap ${activeTab === 'general' ? 'bg-red-600/10 text-red-500 border border-red-500/20' : 'text-gray-400 hover:text-white hover:bg-white/5 border border-transparent'}`}>
                  <User className="h-4 w-4" /> Profil Général
                </button>
                <button type="button" onClick={() => setActiveTab('security')} className={`flex items-center gap-3 px-4 py-3 rounded-2xl text-sm font-semibold transition-all whitespace-nowrap ${activeTab === 'security' ? 'bg-red-600/10 text-red-500 border border-red-500/20' : 'text-gray-400 hover:text-white hover:bg-white/5 border border-transparent'}`}>
                  <Lock className="h-4 w-4" /> Sécurité
                </button>
                <button type="button" onClick={() => setActiveTab('system')} className={`flex items-center gap-3 px-4 py-3 rounded-2xl text-sm font-semibold transition-all whitespace-nowrap ${activeTab === 'system' ? 'bg-red-600/10 text-red-500 border border-red-500/20' : 'text-gray-400 hover:text-white hover:bg-white/5 border border-transparent'}`}>
                  <Cpu className="h-4 w-4" /> IA & Base de Données
                </button>
                <button type="button" onClick={() => setActiveTab('appearance')} className={`flex items-center gap-3 px-4 py-3 rounded-2xl text-sm font-semibold transition-all whitespace-nowrap ${activeTab === 'appearance' ? 'bg-red-600/10 text-red-500 border border-red-500/20' : 'text-gray-400 hover:text-white hover:bg-white/5 border border-transparent'}`}>
                  <Palette className="h-4 w-4" /> Préférences App
                </button>
              </div>
            </div>

            <div className="flex-1">
              <form onSubmit={handleSave} className="bg-[#0f1524]/70 backdrop-blur-3xl p-6 md:p-8 rounded-3xl shadow-[0_8px_32px_rgba(0,0,0,0.4)] border border-white/10 animate-in fade-in slide-in-from-bottom-4 duration-500">
                
                {activeTab === 'general' && (
                  <div className="space-y-6">
                    <div>
                      <h2 className="text-xl font-bold text-white tracking-tight mb-1">Profil Général</h2>
                      <p className="text-sm text-gray-400">Mettez à jour vos informations personnelles et publiques.</p>
                    </div>
                    <div className="h-[1px] w-full bg-white/10"></div>
                    
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                      <div className="space-y-2">
                        <label className="text-xs font-semibold text-gray-400 uppercase tracking-wider">Prénom</label>
                        <input type="text" name="prenom" value={formData.prenom} onChange={handleInputChange} className="w-full bg-[#050914]/50 border border-white/10 rounded-xl px-4 py-3 text-sm text-white focus:outline-none focus:border-red-500/50 transition-colors" />
                      </div>
                      <div className="space-y-2">
                        <label className="text-xs font-semibold text-gray-400 uppercase tracking-wider">Nom</label>
                        <input type="text" name="nom" value={formData.nom} onChange={handleInputChange} className="w-full bg-[#050914]/50 border border-white/10 rounded-xl px-4 py-3 text-sm text-white focus:outline-none focus:border-red-500/50 transition-colors" />
                      </div>
                      <div className="space-y-2 md:col-span-2">
                        <label className="text-xs font-semibold text-gray-400 uppercase tracking-wider">Email Professionnel</label>
                        <input type="email" name="email" value={formData.email} onChange={handleInputChange} className="w-full bg-[#050914]/50 border border-white/10 rounded-xl px-4 py-3 text-sm text-white focus:outline-none focus:border-red-500/50 transition-colors" />
                      </div>
                      <div className="space-y-2 md:col-span-2">
                        <label className="text-xs font-semibold text-gray-400 uppercase tracking-wider">Rôle (Lecture seule)</label>
                        <input type="text" value={formData.role} disabled className="w-full bg-white/5 border border-white/5 rounded-xl px-4 py-3 text-sm text-gray-500 cursor-not-allowed" />
                      </div>
                    </div>
                  </div>
                )}

                {activeTab === 'security' && (
                  <div className="space-y-6">
                    <div>
                      <h2 className="text-xl font-bold text-white tracking-tight mb-1">Sécurité du Compte</h2>
                      <p className="text-sm text-gray-400">Gérez votre mot de passe et l'authentification à deux facteurs.</p>
                    </div>
                    <div className="h-[1px] w-full bg-white/10"></div>
                    
                    <div className="space-y-4">
                      <div className="space-y-2">
                        <label className="text-xs font-semibold text-gray-400 uppercase tracking-wider">Mot de passe actuel</label>
                        <input type="password" placeholder="••••••••" className="w-full max-w-md bg-[#050914]/50 border border-white/10 rounded-xl px-4 py-3 text-sm text-white focus:outline-none focus:border-red-500/50 transition-colors" />
                      </div>
                      <div className="space-y-2">
                        <label className="text-xs font-semibold text-gray-400 uppercase tracking-wider">Nouveau mot de passe</label>
                        <input type="password" placeholder="••••••••" className="w-full max-w-md bg-[#050914]/50 border border-white/10 rounded-xl px-4 py-3 text-sm text-white focus:outline-none focus:border-red-500/50 transition-colors" />
                      </div>
                      <div className="space-y-2">
                        <label className="text-xs font-semibold text-gray-400 uppercase tracking-wider">Confirmer le mot de passe</label>
                        <input type="password" placeholder="••••••••" className="w-full max-w-md bg-[#050914]/50 border border-white/10 rounded-xl px-4 py-3 text-sm text-white focus:outline-none focus:border-red-500/50 transition-colors" />
                      </div>
                    </div>

                    <div className="mt-8 p-5 rounded-2xl bg-red-500/5 border border-red-500/20">
                      <h3 className="text-red-400 font-bold flex items-center gap-2 mb-2"><ShieldAlert className="h-5 w-5" /> Zone de Danger</h3>
                      <p className="text-sm text-gray-400 mb-4">La désactivation de votre compte coupera immédiatement l'accès au serveur IA local.</p>
                      <button type="button" className="px-4 py-2 bg-red-600/20 text-red-500 hover:bg-red-600/40 rounded-xl text-sm font-semibold transition-colors border border-red-500/30">
                        Désactiver le compte
                      </button>
                    </div>
                  </div>
                )}

                {activeTab === 'system' && (
                  <div className="space-y-6">
                    <div>
                      <h2 className="text-xl font-bold text-white tracking-tight mb-1">Moteur IA & Base de Données</h2>
                      <p className="text-sm text-gray-400">Configurez le modèle Ollama local et la fréquence de synchronisation.</p>
                    </div>
                    <div className="h-[1px] w-full bg-white/10"></div>
                    
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                      <div className="space-y-4">
                        <h3 className="text-sm font-bold text-white">Serveur IA (Ollama)</h3>
                        <div className="space-y-2">
                          <label className="text-xs font-semibold text-gray-400 uppercase tracking-wider">Modèle de Langage</label>
                          <select name="aiModel" value={formData.aiModel} onChange={handleInputChange} className="w-full bg-[#050914]/50 border border-white/10 rounded-xl px-4 py-3 text-sm text-white focus:outline-none focus:border-red-500/50 transition-colors appearance-none">
                            <option value="llama3.1-8b">Llama 3.1 (8B) - Optimisé Text-to-SQL</option>
                            <option value="mistral-nemo">Mistral Nemo (12B)</option>
                            <option value="phi3">Phi-3 Mini (3.8B) - Faible conso</option>
                          </select>
                        </div>
                        <div className="p-4 rounded-xl bg-blue-500/10 border border-blue-500/20 text-sm text-blue-400">
                          <strong>Information :</strong> Le modèle Llama 3.1 est actuellement chargé en mémoire vive (RAM) sur le conteneur Docker hôte.
                        </div>
                      </div>

                      <div className="space-y-4">
                        <h3 className="text-sm font-bold text-white">Base de Données MySQL</h3>
                        <div className="space-y-2">
                          <label className="text-xs font-semibold text-gray-400 uppercase tracking-wider">Fréquence de Sync. Auto</label>
                          <select name="syncInterval" value={formData.syncInterval} onChange={handleInputChange} className="w-full bg-[#050914]/50 border border-white/10 rounded-xl px-4 py-3 text-sm text-white focus:outline-none focus:border-red-500/50 transition-colors appearance-none">
                            <option value="15m">Toutes les 15 minutes</option>
                            <option value="1h">Toutes les heures</option>
                            <option value="24h">Une fois par jour</option>
                            <option value="manual">Manuelle uniquement</option>
                          </select>
                        </div>
                      </div>
                    </div>
                  </div>
                )}

                {activeTab === 'appearance' && (
                  <div className="space-y-6">
                    <div>
                      <h2 className="text-xl font-bold text-white tracking-tight mb-1">Préférences de l'Application</h2>
                      <p className="text-sm text-gray-400">Personnalisez votre interface et vos notifications.</p>
                    </div>
                    <div className="h-[1px] w-full bg-white/10"></div>
                    
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                      <div className="space-y-4">
                        <div className="space-y-2">
                          <label className="text-xs font-semibold text-gray-400 uppercase tracking-wider flex items-center gap-2"><Globe className="h-4 w-4"/> Langue de l'Interface</label>
                          <select name="language" value={formData.language} onChange={handleInputChange} className="w-full bg-[#050914]/50 border border-white/10 rounded-xl px-4 py-3 text-sm text-white focus:outline-none focus:border-red-500/50 transition-colors appearance-none">
                            <option value="fr">Français (France)</option>
                            <option value="en">English (US)</option>
                          </select>
                        </div>

                        <div className="pt-4 flex items-center justify-between">
                          <div>
                            <p className="text-sm font-bold text-white flex items-center gap-2"><Bell className="h-4 w-4" /> Notifications Emails</p>
                            <p className="text-xs text-gray-400 mt-1">Recevoir un rapport des requêtes échouées.</p>
                          </div>
                          <label className="relative inline-flex items-center cursor-pointer">
                            <input type="checkbox" name="notifications" checked={formData.notifications} onChange={handleInputChange} className="sr-only peer" />
                            <div className="w-11 h-6 bg-white/10 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-red-500"></div>
                          </label>
                        </div>
                      </div>

                      <div className="p-5 rounded-2xl bg-white/5 border border-white/10 text-center flex flex-col items-center justify-center">
                        <Palette className="h-8 w-8 text-gray-400 mb-3" />
                        <h3 className="text-sm font-bold text-white mb-1">Thème Verrouillé</h3>
                        <p className="text-xs text-gray-400">Le mode sombre "Energy Core" est verrouillé par l'administrateur pour garantir l'uniformité visuelle.</p>
                      </div>
                    </div>
                  </div>
                )}

                <div className="mt-8 pt-6 border-t border-white/10 flex justify-end">
                  <button type="submit" disabled={isLoading} className="flex items-center gap-2 bg-red-600 hover:bg-red-500 text-white px-6 py-2.5 rounded-xl text-sm font-semibold transition-colors shadow-[0_0_15px_rgba(220,38,38,0.4)] disabled:opacity-50">
                    {isLoading ? (
                      <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                    ) : (
                      <><Save className="h-4 w-4" /> Enregistrer les modifications</>
                    )}
                  </button>
                </div>

              </form>
            </div>

          </div>
        </main>
      </div>

      {toast.show && (
        <div className={`fixed bottom-8 right-8 flex items-center gap-3 px-6 py-4 rounded-2xl shadow-[0_8px_32px_rgba(0,0,0,0.6)] border text-sm font-bold z-50 transition-all animate-fade-in-up ${
          toast.type === 'success' ? 'bg-emerald-500/10 border-emerald-500/30 text-emerald-400 backdrop-blur-3xl' : 'bg-red-500/10 border-red-500/30 text-red-400 backdrop-blur-3xl'
        }`}>
          {toast.type === 'success' ? <CheckCircle2 className="h-5 w-5" /> : <AlertCircle className="h-5 w-5" />}
          {toast.message}
        </div>
      )}
    </div>
  );
}