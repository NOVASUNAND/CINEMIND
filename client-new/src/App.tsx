import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import Navbar from './components/Navbar';
import ProtectedRoute from './routes/ProtectedRoute';
import AuthPage from './pages/AuthPage';
import Forge from './pages/Forge';
import Archives from './pages/Archives';
import { PipelineProvider } from './context/PipelineContext';
import { useAuth } from './context/AuthContext'; // 🚀 ADDED: Import your auth hook to check user sessions

function AppContent() {
  const { user } = useAuth(); // 🚀 FETCH THE LIVE USER DATA MATRIX

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col items-center">

      {/* 🚀 FIXED: Navbar now only mounts if a user is actively authenticated! */}
      {user && <Navbar />}

      {/* Main Content */}
      <main className="flex-grow w-full px-4 py-12 flex flex-col items-center justify-center">
        <Routes>
          {/* Public Auth Route */}
          <Route path="/auth" element={!user ? <AuthPage /> : <Navigate to="/forge" />} />
          
          {/* Catch-all root fallback */}
          <Route path="/" element={<Navigate to="/forge" />} />

          {/* Protected Routes */}
          <Route
            path="/forge"
            element={
              <ProtectedRoute>
                <Forge />
              </ProtectedRoute>
            }
          />

          <Route
            path="/archives"
            element={
              <ProtectedRoute>
                <Archives />
              </ProtectedRoute>
            }
          />

          {/* 🚀 SAFEGUARD: Redirects any unknown or broken path back to where it belongs */}
          <Route path="*" element={<Navigate to={user ? "/forge" : "/auth"} />} />
        </Routes>
      </main>

      {/* Footer */}
      <footer className="w-full mt-20 py-10 text-center border-t border-slate-900 opacity-40">
        <p className="text-slate-500 text-[9px] font-mono tracking-widest uppercase">
          RTX 3050 Compute // MERN Stack // LangChain Agentic Flow
        </p>
      </footer>

    </div>
  );
}

function App() {
  return (
    // 🚀 Wrapped perfectly inside providers so AppContent can access useAuth safely
    <PipelineProvider>
      <Router>
        <AppContent />
      </Router>
    </PipelineProvider>
  );
}

export default App;