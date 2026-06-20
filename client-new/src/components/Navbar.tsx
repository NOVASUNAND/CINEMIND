import React, { useState, useRef, useEffect } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { Sparkles, History, LogOut, User, Settings } from 'lucide-react';
import { useAuth } from '../context/AuthContext';

const Navbar = () => {
  const location = useLocation();
  const navigate = useNavigate();
  const { user, logout } = useAuth();

  // 🚀 Control the floating menu visibility state
  const [isOpen, setIsOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  const isActive = (path: string) =>
    location.pathname === path
      ? "text-blue-500"
      : "text-slate-400";

  const handleLogout = () => {
    setIsOpen(false);
    logout();
    navigate('/auth');
  };

  // 🚀 Safely drop focus and close dropdown menu if user clicks elsewhere on screen
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // 🚀 Extract first character of profile handle or email for avatar visual matrix
  const getInitial = () => {
    if (user?.username) return user.username.charAt(0).toUpperCase();
    if (user?.email) return user.email.charAt(0).toUpperCase();
    return 'U';
  };

  const displayName = user?.username || user?.email?.split('@')[0] || 'Active Core';

  return (
    <nav className="w-full border-b border-slate-800 bg-slate-900/50 backdrop-blur-xl sticky top-0 z-50">
      <div className="max-w-6xl mx-auto px-6 h-16 flex items-center justify-between">

        {/* Branding Logo Layout */}
        <Link
          to="/forge"
          className="text-2xl font-black italic tracking-tighter text-blue-500 group"
        >
          CINE
          <span className="text-slate-100 font-light group-hover:text-blue-400 transition-colors">
            MIND
          </span>
        </Link>

        {/* Navigation & Live Account Trigger Hub */}
        <div className="flex items-center gap-8 text-xs font-mono uppercase tracking-[0.2em]">

          <Link
            to="/forge"
            className={`${isActive('/forge')} hover:text-blue-400 flex items-center gap-2 transition-colors`}
          >
            <Sparkles size={14} />
            <span className="hidden sm:inline">Forge</span>
          </Link>

          <Link
            to="/archives"
            className={`${isActive('/archives')} hover:text-blue-400 flex items-center gap-2 transition-colors`}
          >
            <History size={14} />
            <span className="hidden sm:inline">Archives</span>
          </Link>

          {/* 🚀 GOOGLE-STYLE ACCOUNT DROPDOWN ANCHOR */}
          <div className="relative inline-block text-left" ref={dropdownRef}>
            {user && (
              <button
                onClick={() => setIsOpen(!isOpen)}
                className="flex items-center justify-center w-8 h-8 rounded-full font-mono text-xs font-bold text-white bg-gradient-to-br from-blue-600 to-purple-600 border border-white/10 hover:brightness-110 shadow-lg shadow-blue-500/10 focus:outline-none transition-all duration-200 cursor-pointer"
              >
                {getInitial()}
              </button>
            )}

            {/* 🚀 POPUP PROFILE DASHBOARD BLOCK */}
            {isOpen && user && (
              <div className="absolute right-0 mt-3 w-64 bg-slate-900 border border-slate-800 rounded-2xl shadow-2xl p-4 z-50 normal-case tracking-normal animate-in fade-in slide-in-from-top-2 duration-150">
                
                {/* Meta Account Details Header */}
                <div className="flex items-center gap-3 pb-3 border-b border-slate-800">
                  <div className="flex items-center justify-center w-10 h-10 rounded-full font-mono font-bold text-sm text-white bg-gradient-to-br from-blue-600 to-purple-600 select-none flex-shrink-0">
                    {getInitial()}
                  </div>
                  <div className="overflow-hidden">
                    <p className="text-xs font-mono font-bold text-slate-200 truncate uppercase tracking-wide">
                      {displayName}
                    </p>
                    <p className="text-[10px] font-mono text-slate-500 truncate mt-0.5 lowercase">
                      {user.email}
                    </p>
                  </div>
                </div>

                {/* Sub-Panel Actions Options Link Grid */}
                <div className="py-2 space-y-1">
                  <div className="flex items-center gap-2.5 px-2.5 py-2 rounded-xl font-mono text-[11px] text-slate-400 hover:bg-slate-950 hover:text-white transition-colors cursor-pointer">
                    <User size={14} className="text-blue-500" />
                    <span>Account Profile</span>
                  </div>
                  <div className="flex items-center gap-2.5 px-2.5 py-2 rounded-xl font-mono text-[11px] text-slate-400 hover:bg-slate-950 hover:text-white transition-colors cursor-pointer">
                    <Settings size={14} className="text-purple-500" />
                    <span>Core Analytics</span>
                  </div>
                </div>

                {/* Account Signout Processing Frame */}
                <div className="pt-2 border-t border-slate-800">
                  <button
                    onClick={handleLogout}
                    className="w-full flex items-center gap-2 px-2.5 py-2 border border-red-950 bg-red-950/20 hover:bg-red-900/30 text-red-400 font-mono text-xs rounded-xl transition-all cursor-pointer"
                  >
                    <LogOut size={13} />
                    <span>Terminate Session</span>
                  </button>
                </div>

              </div>
            )}
          </div>

        </div>
      </div>
    </nav>
  );
};

export default Navbar;