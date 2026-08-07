import React from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { 
  LayoutDashboard, Database, Bot, Settings as SettingsIcon, LogOut, X 
} from 'lucide-react';

export default function Sidebar({ isSidebarOpen, setIsSidebarOpen }) {
  const location = useLocation();
  const navigate = useNavigate();
  const currentPath = location.pathname;

  const handleLogout = () => {
    localStorage.removeItem('pegasus_token');
    navigate('/login');
  };

  // 1. Anti-Slop Link Styling (Zero border-radius, structural borders, uppercase tracking)
  const getLinkClasses = (path) => {
    const isActive = currentPath === path;
    return isActive
      ? "flex items-center gap-4 px-8 py-4 bg-white/[0.03] text-white border-l-2 border-red-600 transition-colors"
      : "flex items-center gap-4 px-8 py-4 text-gray-500 hover:bg-white/[0.02] hover:text-gray-300 border-l-2 border-transparent transition-colors group";
  };

  return (
    <>
      {/* MOBILE SIDEBAR OVERLAY (Kept dark and cinematic) */}
      {isSidebarOpen && (
        <div 
          onClick={() => setIsSidebarOpen(false)} 
          className="fixed inset-0 bg-black/80 backdrop-blur-md z-40 md:hidden transition-opacity"
        />
      )}

      {/* FIXED SIDEBAR - THE OBSIDIAN LEDGER */}
      <aside className={`fixed md:relative z-50 h-full flex-shrink-0 transition-all duration-300 ease-in-out border-r border-white/10 bg-black overflow-hidden
        ${isSidebarOpen ? 'w-64 translate-x-0' : 'w-64 -translate-x-full md:w-0 md:translate-x-0'}`}>
        
        <div className="w-64 h-full flex flex-col justify-between">
          
          <div className="flex flex-col">
            {/* Header / Logo */}
            <div className="p-8 flex justify-between items-center border-b border-white/10">
              <h2 className="text-xl font-bold text-white tracking-tight flex items-center gap-3">
                <img src="/pegasus.png" alt="Pegasus Logo" className="h-6 w-6 object-contain contrast-200" /> 
                <span className="font-serif">Pegasus</span>
              </h2>
              <button onClick={() => setIsSidebarOpen(false)} className="md:hidden text-gray-500 hover:text-white transition-colors">
                <X className="h-5 w-5" />
              </button>
            </div>
            
            {/* Navigation Directory */}
            <div className="py-6">
              <span className="block px-8 mb-4 text-[12px] text-gray-600 uppercase tracking-[0.2em] font-mono">Système Central</span>
              <nav className="flex flex-col">
                <Link to="/" className={getLinkClasses('/')}>
                  <LayoutDashboard className="h-4 w-4 flex-shrink-0" /> 
                  <span className="text-[11px] uppercase tracking-widest font-medium">Vue d'ensemble</span>
                </Link>
                
                <Link to="/datahub" className={getLinkClasses('/datahub')}>
                  <Database className="h-4 w-4 flex-shrink-0" /> 
                  <span className="text-[11px] uppercase tracking-widest font-medium">Hub Données</span>
                </Link>
                
                <Link to="/ia" className={getLinkClasses('/ia')}>
                  <Bot className="h-4 w-4 flex-shrink-0" /> 
                  <span className="text-[11px] uppercase tracking-widest font-medium">Assistant IA</span>
                </Link>
                
                <Link to="/settings" className={getLinkClasses('/settings')}>
                  <SettingsIcon className="h-4 w-4 flex-shrink-0" /> 
                  <span className="text-[11px] uppercase tracking-widest font-medium">Paramètres</span>
                </Link>
              </nav>
            </div>
          </div>
          
          {/* Footer / Logout */}
          <div className="border-t border-white/10 bg-black">
            <button 
              onClick={handleLogout} 
              className="flex items-center gap-4 w-full px-8 py-6 text-gray-500 hover:text-red-500 hover:bg-white/[0.02] transition-colors group"
            >
              <LogOut className="h-4 w-4 group-hover:scale-110 transition-transform" /> 
              <span className="text-[11px] uppercase tracking-widest font-medium">Déconnexion</span>
            </button>
          </div>

        </div>
      </aside>
    </>
  );
}