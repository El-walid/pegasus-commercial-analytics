import React from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { 
  LayoutDashboard, Database, Bot, Settings as SettingsIcon, LogOut, X, Sparkles 
} from 'lucide-react';

export default function Sidebar({ isSidebarOpen, setIsSidebarOpen }) {
  const location = useLocation();
  const navigate = useNavigate();
  const currentPath = location.pathname;

  const handleLogout = () => {
    localStorage.removeItem('pegasus_token');
    navigate('/login');
  };

  // Helper function to determine if a link is active
  const getLinkClasses = (path) => {
    const isActive = currentPath === path;
    return isActive
      ? "flex items-center gap-3 px-4 py-3 bg-red-500/10 text-red-500 border border-red-500/20 rounded-xl font-medium shadow-[0_0_15px_rgba(239,68,68,0.1)] transition-colors"
      : "flex items-center gap-3 px-4 py-3 text-gray-400 hover:bg-white/5 hover:text-white rounded-xl font-medium transition-colors";
  };

  return (
    <>
      {/* MOBILE SIDEBAR OVERLAY */}
      {isSidebarOpen && (
        <div 
          onClick={() => setIsSidebarOpen(false)} 
          className="fixed inset-0 bg-black/60 backdrop-blur-sm z-40 md:hidden transition-opacity"
        />
      )}

      {/* FIXED SIDEBAR */}
      <aside className={`fixed md:relative z-50 h-full flex-shrink-0 transition-all duration-300 ease-in-out border-r border-white/10 bg-[#0a0f1c]/90 backdrop-blur-3xl overflow-hidden
        ${isSidebarOpen ? 'w-64 translate-x-0' : 'w-64 -translate-x-full md:w-0 md:translate-x-0'}`}>
        <div className="w-64 h-full flex flex-col justify-between">
          
          <div className="p-6">
            {/* Header / Logo */}
            <div className="flex justify-between items-center mb-8">
              <h2 className="text-2xl font-bold text-white tracking-tight flex items-center gap-3">
                {/* 1. Point directly to the png in your public folder */}
                <img src="/pegasus.png" alt="Pegasus Logo" className="h-8 w-8 object-contain" /> 
                Pegasus Hub
              </h2>
              <button onClick={() => setIsSidebarOpen(false)} className="md:hidden text-gray-400 hover:text-white">
                <X className="h-6 w-6" />
              </button>
            </div>
            
            {/* Navigation Links */}
            <nav className="space-y-2">
              <Link to="/" className={getLinkClasses('/')}>
                <LayoutDashboard className="h-5 w-5" /> Vue d'ensemble
              </Link>
              <Link to="/datahub" className={getLinkClasses('/datahub')}>
                <Database className="h-5 w-5" /> Hub de Données
              </Link>
              <Link to="/ia" className={getLinkClasses('/ia')}>
                <Bot className="h-5 w-5" /> Assistant IA
              </Link>
              <Link to="/settings" className={getLinkClasses('/settings')}>
                <SettingsIcon className="h-5 w-5" /> Paramètres
              </Link>
            </nav>
          </div>
          
          {/* Footer / Logout */}
          <div className="p-6 border-t border-white/10">
            <button onClick={handleLogout} className="flex items-center gap-3 w-full px-4 py-3 text-red-400 hover:bg-red-500/10 rounded-xl font-medium transition-colors border border-transparent hover:border-red-500/20">
              <LogOut className="h-5 w-5" /> Déconnexion
            </button>
          </div>

        </div>
      </aside>
    </>
  );
}