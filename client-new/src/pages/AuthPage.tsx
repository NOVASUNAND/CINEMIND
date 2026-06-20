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
    <div className="relative min-h-screen flex flex-col items-center justify-center w-full px-4 overflow-hidden selection:bg-blue-500/30">
      
      {/* Subtle Background Glows */}
      <div className="absolute top-[-10%] left-[-5%] w-[400px] h-[400px] bg-blue-600/10 rounded-full blur-[100px] pointer-events-none" />
      <div className="absolute bottom-[-10%] right-[-5%] w-[400px] h-[400px] bg-purple-600/10 rounded-full blur-[100px] pointer-events-none" />

      <div className="relative z-10 w-full max-w-md flex flex-col items-center">
        
        {/* Branding Header */}
        <div className="text-center mb-8">
          <h1 className="text-4xl md:text-5xl font-extrabold tracking-tight text-transparent bg-clip-text bg-gradient-to-br from-white to-slate-400 mb-3">
            CINEMIND
          </h1>
          <p className="text-sm text-slate-400 tracking-wide">
            Transform Images Into Stories
          </p>
        </div>

        {/* Clean Feature Badges */}
        <div className="flex flex-wrap justify-center gap-4 mb-10 text-[11px] font-medium text-slate-500 uppercase tracking-wider">
          <span className="flex items-center gap-1.5"><span className="text-blue-500">✓</span> Gemini Vision</span>
          <span className="flex items-center gap-1.5"><span className="text-blue-500">✓</span> Live Stream</span>
          <span className="flex items-center gap-1.5"><span className="text-blue-500">✓</span> Edge Fallback</span>
        </div>

        {/* Main Authentication Card */}
        <div className="w-full bg-slate-900/80 border border-slate-800 backdrop-blur-xl rounded-2xl p-8 sm:p-10 shadow-2xl">
          
          <div className="text-center mb-8">
            <h2 className="text-2xl font-bold text-white mb-2">
              {isLogin ? 'Welcome Back' : 'Create an Account'}
            </h2>
            <p className="text-sm text-slate-400">
              {isLogin ? 'Please sign in to your account' : 'Sign up to start generating narratives'}
            </p>
          </div>

          {error && (
            <div className="mb-6 p-4 bg-red-500/10 border border-red-500/20 text-red-400 rounded-lg text-center text-sm">
              {error}
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-6">
            {!isLogin && (
              <div className="space-y-2">
                <label className="block text-sm font-medium text-slate-300">Username</label>
                <input
                  type="text"
                  required
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                  placeholder="johndoe"
                  className="w-full bg-slate-950/50 border border-slate-700 rounded-lg px-4 py-3 text-sm text-slate-100 placeholder:text-slate-600 focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500 transition-all"
                />
              </div>
            )}

            <div className="space-y-2">
              <label className="block text-sm font-medium text-slate-300">Email Address</label>
              <input
                type="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="name@example.com"
                className="w-full bg-slate-950/50 border border-slate-700 rounded-lg px-4 py-3 text-sm text-slate-100 placeholder:text-slate-600 focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500 transition-all"
              />
            </div>

            <div className="space-y-2">
              <label className="block text-sm font-medium text-slate-300">Password</label>
              <input
                type="password"
                required
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="••••••••"
                className="w-full bg-slate-950/50 border border-slate-700 rounded-lg px-4 py-3 text-sm text-slate-100 placeholder:text-slate-600 focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500 transition-all"
              />
            </div>

            <button
              type="submit"
              disabled={submitting}
              className={`w-full py-3.5 rounded-lg text-sm font-semibold tracking-wide transition-all mt-4 ${
                submitting 
                  ? 'bg-blue-600/50 text-blue-200 cursor-not-allowed' 
                  : 'bg-blue-600 hover:bg-blue-500 text-white shadow-lg shadow-blue-900/20'
              }`}
            >
              {submitting ? 'Authenticating...' : isLogin ? 'Sign In' : 'Sign Up'}
            </button>
          </form>

          {/* Clean Toggle */}
          <div className="mt-8 pt-6 border-t border-slate-800 text-center">
            <button
              onClick={() => { setIsLogin(!isLogin); setError(null); }}
              className="text-sm text-slate-400 hover:text-white transition-colors"
            >
              {isLogin ? "Don't have an account? Sign Up" : "Already have an account? Sign In"}
            </button>
          </div>
        </div>

        {/* Minimal Footer */}
        <div className="mt-10 text-center">
          <p className="text-xs text-slate-500 tracking-wider">
            CINEMIND v1.0 • Built with React & Gemini
          </p>
        </div>

      </div>
    </div>
  );
};

export default AuthPage;