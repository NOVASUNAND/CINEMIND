import { Link, useLocation, useNavigate } from 'react-router-dom';
import { Sparkles, History, LogOut } from 'lucide-react';
import { useAuth } from '../context/AuthContext';

const Navbar = () => {
  const location = useLocation();
  const navigate = useNavigate();
  const { logout } = useAuth();

  const isActive = (path: string) =>
    location.pathname === path
      ? "text-blue-500"
      : "text-slate-400";

  const handleLogout = () => {
    logout();
    navigate('/auth');
  };

  return (
    <nav className="w-full border-b border-slate-800 bg-slate-900/50 backdrop-blur-xl sticky top-0 z-50">
      <div className="max-w-6xl mx-auto px-6 h-16 flex items-center justify-between">

        <Link
          to="/forge"
          className="text-2xl font-black italic tracking-tighter text-blue-500 group"
        >
          CINE
          <span className="text-slate-100 font-light group-hover:text-blue-400 transition-colors">
            MIND
          </span>
        </Link>

        <div className="flex items-center gap-8 text-xs font-mono uppercase tracking-[0.2em]">

          <Link
            to="/forge"
            className={`${isActive('/forge')} hover:text-blue-400 flex items-center gap-2 transition-colors`}
          >
            <Sparkles size={14} />
            Forge
          </Link>

          <Link
            to="/archives"
            className={`${isActive('/archives')} hover:text-blue-400 flex items-center gap-2 transition-colors`}
          >
            <History size={14} />
            Archives
          </Link>

          <button
            onClick={handleLogout}
            className="text-slate-400 hover:text-red-400 flex items-center gap-2 transition-colors"
          >
            <LogOut size={14} />
            Logout
          </button>

        </div>
      </div>
    </nav>
  );
};

export default Navbar;