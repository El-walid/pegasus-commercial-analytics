import { useState, useEffect } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { LayoutDashboard, Database, Bot, Settings, LogOut, Menu, Sun, Moon, RefreshCw, HardDrive, FileUp, CheckCircle2, AlertCircle } from 'lucide-react';

export default function DataHub() {
  const navigate = useNavigate();
  const [isSidebarOpen, setIsSidebarOpen] = useState(true);
  const [isDarkMode, setIsDarkMode] = useState(false);

  useEffect(() => {
    if (isDarkMode) {
      document.documentElement.classList.add('dark');
    } else {
      document.documentElement.classList.remove('dark');
    }
  }, [isDarkMode]);

  const handleLogout = () => {
    localStorage.removeItem('pegasus_token');
    navigate('/login');
  };

  return (
    <div className="flex h-screen w-full overflow-hidden bg-gray-50 dark:bg-gray-950 transition-colors duration-300">
      
      {/* SIDEBAR */}
      <aside className={`flex-shrink-0 transition-all duration-300 ease-in-out border-r border-gray-200 dark:border-gray-800 bg-white dark:bg-gray-900 ${isSidebarOpen ? 'w-64' : 'w-0 overflow-hidden'}`}>
        <div className="w-64 h-full flex flex-col justify-between">
          <div className="p-6">
            <h2 className="text-2xl font-bold text-gray-900 dark:text-white tracking-tight mb-8">Pegasus</h2>
            <nav className="space-y-2">
              <Link to="/" className="flex items-center gap-3 px-4 py-3 text-gray-500 dark:text-gray-400 hover:bg-gray-50 dark:hover:bg-gray-800 hover:text-gray-900 dark:hover:text-white rounded-xl font-medium transition-colors">
                <LayoutDashboard className="h-5 w-5" /> Vue d'ensemble
              </Link>
              <Link to="/datahub" className="flex items-center gap-3 px-4 py-3 bg-gray-100 dark:bg-gray-800 text-gray-900 dark:text-white rounded-xl font-medium transition-colors">
                <Database className="h-5 w-5" /> Hub de Données
              </Link>
              <Link to="/ia" className="flex items-center gap-3 px-4 py-3 text-gray-500 dark:text-gray-400 hover:bg-gray-50 dark:hover:bg-gray-800 hover:text-gray-900 dark:hover:text-white rounded-xl font-medium transition-colors">
                <Bot className="h-5 w-5" /> Assistant IA
              </Link>
              <Link to="/settings" className="flex items-center gap-3 px-4 py-3 text-gray-500 dark:text-gray-400 hover:bg-gray-50 dark:hover:bg-gray-800 hover:text-gray-900 dark:hover:text-white rounded-xl font-medium transition-colors">
                <Settings className="h-5 w-5" /> Paramètres
              </Link>
            </nav>
          </div>
          <div className="p-6 border-t border-gray-100 dark:border-gray-800">
            <button onClick={handleLogout} className="flex items-center gap-3 w-full px-4 py-3 text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-xl font-medium transition-colors">
              <LogOut className="h-5 w-5" /> Déconnexion
            </button>
          </div>
        </div>
      </aside>

      {/* COLONNE CENTRALE */}
      <div className="flex-1 flex flex-col min-w-0 h-screen">
        
        {/* TOP NAVBAR */}
        <header className="flex-shrink-0 bg-white dark:bg-gray-900 border-b border-gray-200 dark:border-gray-800 px-8 py-4 flex justify-between items-center z-10 transition-colors duration-300">
          <div className="flex items-center gap-4">
            <button onClick={() => setIsSidebarOpen(!isSidebarOpen)} className="p-2 rounded-lg bg-gray-50 dark:bg-gray-800 text-gray-600 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors">
              <Menu className="h-5 w-5" />
            </button>
            <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Hub de Données</h1>
          </div>
          <button onClick={() => setIsDarkMode(!isDarkMode)} className="p-2 rounded-lg bg-gray-50 dark:bg-gray-800 text-gray-600 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors">
            {isDarkMode ? <Sun className="h-5 w-5" /> : <Moon className="h-5 w-5" />}
          </button>
        </header>

        {/* CONTENU DATA HUB */}
        <main className="flex-1 overflow-y-auto p-8 custom-scrollbar">
          
          {/* Section 1 : État des Connexions */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
            <div className="bg-white dark:bg-gray-900 p-6 rounded-3xl shadow-sm border border-gray-100 dark:border-gray-800">
              <div className="flex items-center justify-between mb-4">
                <div className="flex items-center gap-3">
                  <div className="p-3 bg-blue-50 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400 rounded-xl"><HardDrive className="h-5 w-5" /></div>
                  <h3 className="font-bold text-gray-900 dark:text-white">Base de données</h3>
                </div>
                <CheckCircle2 className="h-5 w-5 text-emerald-500" />
              </div>
              <p className="text-sm text-gray-500 dark:text-gray-400">Pegasus_DB (MySQL) est connectée et synchronisée.</p>
            </div>

            <div className="bg-white dark:bg-gray-900 p-6 rounded-3xl shadow-sm border border-gray-100 dark:border-gray-800">
              <div className="flex items-center justify-between mb-4">
                <div className="flex items-center gap-3">
                  <div className="p-3 bg-purple-50 dark:bg-purple-900/30 text-purple-600 dark:text-purple-400 rounded-xl"><RefreshCw className="h-5 w-5" /></div>
                  <h3 className="font-bold text-gray-900 dark:text-white">Dernière Synchro</h3>
                </div>
              </div>
              <p className="text-2xl font-bold text-gray-900 dark:text-white mb-1">Il y a 2 heures</p>
              <p className="text-sm text-gray-500 dark:text-gray-400">Automatisée via script d'extraction SEHI.</p>
            </div>

            <div className="bg-white dark:bg-gray-900 p-6 rounded-3xl shadow-sm border border-gray-100 dark:border-gray-800">
               <div className="flex items-center justify-between mb-4">
                <div className="flex items-center gap-3">
                  <div className="p-3 bg-amber-50 dark:bg-amber-900/30 text-amber-600 dark:text-amber-400 rounded-xl"><AlertCircle className="h-5 w-5" /></div>
                  <h3 className="font-bold text-gray-900 dark:text-white">Anomalies</h3>
                </div>
              </div>
              <p className="text-2xl font-bold text-gray-900 dark:text-white mb-1">0 Rejets</p>
              <p className="text-sm text-gray-500 dark:text-gray-400">Aucune erreur de formatage détectée.</p>
            </div>
          </div>

          {/* Section 2 : Zone d'Importation Manuelle */}
          <div className="bg-white dark:bg-gray-900 p-8 rounded-3xl shadow-sm border border-gray-100 dark:border-gray-800 flex flex-col items-center justify-center text-center">
            <div className="w-16 h-16 bg-gray-50 dark:bg-gray-800 rounded-full flex items-center justify-center mb-4">
              <FileUp className="h-8 w-8 text-gray-400 dark:text-gray-500" />
            </div>
            <h3 className="text-lg font-bold text-gray-900 dark:text-white mb-2">Importation Manuelle</h3>
            <p className="text-gray-500 dark:text-gray-400 mb-6 max-w-md">
              Déposez vos fichiers Excel d'objectifs ou de clients manquants pour mettre à jour la base de données Pegasus instantanément.
            </p>
            <button className="bg-gray-900 dark:bg-white text-white dark:text-gray-900 px-6 py-3 rounded-xl font-medium hover:bg-gray-800 dark:hover:bg-gray-100 transition-colors shadow-sm">
              Sélectionner un fichier
            </button>
          </div>
          
        </main>
      </div>
    </div>
  );
}