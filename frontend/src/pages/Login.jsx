import React, { useState } from 'react';
import { Lock, User, ChevronRight, Sparkles } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';

export default function Login() {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [errorMsg, setErrorMsg] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const navigate = useNavigate();

  const handleLogin = async (e) => {
    e.preventDefault();
    setErrorMsg('');
    setIsLoading(true);

    try {
      const response = await axios.post(`${import.meta.env.VITE_API_URL}/login`, { 
        username, 
        password 
      });

      localStorage.setItem('pegasus_token', response.data.token);
      navigate('/'); 

    } catch (error) {
      if (error.response && error.response.status === 401) {
        setErrorMsg("Identifiant ou mot de passe incorrect.");
      } else {
        setErrorMsg("Erreur de connexion au serveur.");
      }
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="relative flex min-h-screen items-center justify-center bg-[#050914] overflow-hidden text-gray-200 font-sans px-4">
      
      {/* 1. BACKGROUND GRID */}
      <div className="absolute inset-0 z-0 opacity-10 pointer-events-none" 
           style={{ backgroundImage: 'linear-gradient(to right, #ffffff 1px, transparent 1px), linear-gradient(to bottom, #ffffff 1px, transparent 1px)', backgroundSize: '40px 40px' }}>
      </div>

      {/* 2. ORGANIC DRIFTING ENERGY ORBS (Siri-like Background Effect) */}
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

      <div className="absolute left-1/2 top-1/2 z-0 pointer-events-none opacity-60">
        <div className="absolute w-[500px] h-[500px] bg-gradient-to-r from-red-700 via-rose-900 to-purple-900 rounded-full mix-blend-screen animate-chaotic"></div>
        <div className="absolute w-[450px] h-[450px] bg-gradient-to-tr from-amber-800 via-red-900 to-yellow-800 rounded-full mix-blend-screen animate-chaotic-reverse" style={{ animationDelay: '-3s' }}></div>
      </div>

      {/* 3. LOGIN CARD CONTAINER (Glassmorphism) */}
      <div className="relative z-10 w-full max-w-md bg-[#0f1524]/70 backdrop-blur-3xl p-8 md:p-10 rounded-3xl shadow-[0_8px_32px_rgba(0,0,0,0.6)] border border-white/10 animate-in fade-in slide-in-from-bottom-6 duration-700">
        
        {/* Header */}
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-12 h-12 rounded-2xl bg-red-500/10 border border-red-500/20 mb-4 shadow-[0_0_15px_rgba(239,68,68,0.15)]">
            <Sparkles className="h-6 w-6 text-red-500" />
          </div>
          <h1 className="text-3xl font-bold text-white tracking-tight">Pegasus</h1>
          <p className="text-xs text-gray-400 mt-2 uppercase tracking-widest font-medium">Portail d'Administration SEHI</p>
        </div>

        {/* Error Message */}
        {errorMsg && (
          <div className="mb-6 p-3 bg-red-500/10 text-red-400 text-xs text-center rounded-xl border border-red-500/20 backdrop-blur-md animate-shake">
            {errorMsg}
          </div>
        )}

        {/* Form */}
        <form onSubmit={handleLogin} className="space-y-5">
          <div className="relative">
            <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
              <User className="h-4 w-4 text-gray-500" />
            </div>
            <input
              type="text"
              className="block w-full pl-11 pr-4 py-3 bg-white/[0.03] border border-white/10 rounded-xl text-sm text-gray-200 placeholder-gray-500 focus:outline-none focus:border-red-500/50 focus:bg-white/[0.06] transition-all"
              placeholder="Identifiant"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              required
            />
          </div>

          <div className="relative">
            <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
              <Lock className="h-4 w-4 text-gray-500" />
            </div>
            <input
              type="password"
              className="block w-full pl-11 pr-4 py-3 bg-white/[0.03] border border-white/10 rounded-xl text-sm text-gray-200 placeholder-gray-500 focus:outline-none focus:border-red-500/50 focus:bg-white/[0.06] transition-all"
              placeholder="Mot de passe"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
            />
          </div>

          <button
            type="submit"
            disabled={isLoading}
            className="w-full flex items-center justify-center gap-2 bg-red-600 hover:bg-red-500 text-white py-3 px-4 rounded-xl transition-all duration-300 focus:outline-none focus:ring-2 focus:ring-red-500/50 font-medium shadow-[0_0_20px_rgba(220,38,38,0.3)] disabled:opacity-50 disabled:cursor-not-allowed group cursor-pointer"
          >
            {isLoading ? (
              <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
            ) : (
              <>
                Se connecter
                <ChevronRight className="h-4 w-4 group-hover:translate-x-1 transition-transform" />
              </>
            )}
          </button>
        </form>

        {/* Premium Copyright Footer */}
        <div className="mt-8 pt-6 border-t border-white/5 text-center">
          <p className="text-[11px] text-gray-500 tracking-wide">
            © {new Date().getFullYear()} SEHI Pegasus. All rights reserved.
          </p>
        </div>

      </div>
    </div>
  );
}