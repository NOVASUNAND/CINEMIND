import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import Navbar from './components/Navbar';
import ProtectedRoute from './routes/ProtectedRoute';
import AuthPage from './pages/AuthPage';
import Forge from './pages/Forge';
import Archives from './pages/Archives';
import { PipelineProvider } from './context/PipelineContext'; // 🚀 FIXED: Imported your global background pipeline context provider

function App() {
  return (
    // 🚀 FIXED: Wrapped the entire Router and route layout inside the provider tree
    <PipelineProvider> 
      <Router>
        <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col items-center">

          {/* Navbar */}
          <Navbar />

          {/* Main Content */}
          <main className="flex-grow w-full px-4 py-12 flex flex-col items-center">
            <Routes>
              <Route path="/auth" element={<AuthPage />} />
              <Route path="/" element={<Navigate to="/forge" />} />

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

            </Routes>
          </main>

          {/* Footer */}
          <footer className="w-full mt-20 py-10 text-center border-t border-slate-900 opacity-40">
            <p className="text-slate-500 text-[9px] font-mono tracking-widest uppercase">
              RTX 3050 Compute // MERN Stack // LangChain Agentic Flow
            </p>
          </footer>

        </div>
      </Router>
    </PipelineProvider>
  );
}

export default App;