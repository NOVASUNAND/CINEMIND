import React, { useState } from 'react';
import { useAuth } from '../context/AuthContext';
import { useNavigate } from 'react-router-dom';

const AuthPage = () => {
  const [isLogin, setIsLogin] = useState<boolean>(true);
  const [username, setUsername] = useState<string>('');
  const [email, setEmail] = useState<string>('');
  const [password, setPassword] = useState<string>('');
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState<boolean>(false);

  const { login, register } = useAuth();
  const navigate = useNavigate();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setSubmitting(true);

    try {
      if (isLogin) {
        await login(email, password);
      } else {
        await register(username, email, password);
      }
      navigate('/forge'); 
    } catch (err: any) {
      setError(err.response?.data?.error || 'An error occurred during authentication.');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="min-h-[85vh] flex items-center justify-center px-4">
      <div className="w-full max-w-md bg-zinc-900/40 border border-white/5 backdrop-blur-xl rounded-3xl p-8 shadow-2xl">
        
        {/* Simple & Clear Headers */}
        <div className="text-center mb-8">
          <h2 className="text-3xl font-bold tracking-tight font-mono text-white uppercase">
            {isLogin ? 'Sign In' : 'Sign Up'}
          </h2>
          <p className="text-xs font-mono text-zinc-500 mt-2">
            {isLogin ? 'ACCESS YOUR INSTANCE PROFILE' : 'INITIALIZE NEW USER CORE'}
          </p>
        </div>

        {error && (
          <div className="mb-6 p-4 bg-red-500/10 border border-red-500/20 text-red-400 rounded-xl text-center font-mono text-xs">
            ⚠️ {error}
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-5">
          {!isLogin && (
            <div>
              <label className="block text-[10px] font-mono text-zinc-400 uppercase tracking-widest mb-2">Username</label>
              <input
                type="text"
                required
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                placeholder="developer_core"
                className="w-full bg-zinc-950 border border-white/10 rounded-xl px-4 py-3 text-sm text-zinc-200 focus:outline-none focus:border-blue-500 transition-colors font-mono"
              />
            </div>
          )}

          <div>
            <label className="block text-[10px] font-mono text-zinc-400 uppercase tracking-widest mb-2">Email Address</label>
            <input
              type="email"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="name@domain.com"
              className="w-full bg-zinc-950 border border-white/10 rounded-xl px-4 py-3 text-sm text-zinc-200 focus:outline-none focus:border-blue-500 transition-colors font-mono"
            />
          </div>

          <div>
            <label className="block text-[10px] font-mono text-zinc-400 uppercase tracking-widest mb-2">Password</label>
            <input
              type="password"
              required
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="••••••••"
              className="w-full bg-zinc-950 border border-white/10 rounded-xl px-4 py-3 text-sm text-zinc-200 focus:outline-none focus:border-blue-500 transition-colors font-mono"
            />
          </div>

          {/* Action Buttons using classic nomenclature */}
          <button
            type="submit"
            disabled={submitting}
            className="w-full bg-blue-600 hover:bg-blue-500 disabled:bg-zinc-800 text-white font-mono text-xs uppercase tracking-widest py-4 rounded-xl transition-all font-bold mt-4 shadow-lg shadow-blue-600/10"
          >
            {submitting ? 'CONNECTING...' : isLogin ? 'Sign In' : 'Sign Up'}
          </button>
        </form>

        {/* Clean Toggles */}
        <div className="mt-8 pt-6 border-t border-white/5 text-center">
          <button
            onClick={() => { setIsLogin(!isLogin); setError(null); }}
            className="text-xs font-mono text-zinc-400 hover:text-blue-400 transition-colors"
          >
            {isLogin ? "Don't have an account? Sign Up here →" : "Already have an account? Sign In here →"}
          </button>
        </div>

      </div>
    </div>
  );
};

export default AuthPage;