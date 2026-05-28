import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import Navbar from './components/Navbar';
import Forge from './pages/Forge';
import Archives from './pages/Archives';

function App() {
  return (
    <Router>
      <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col items-center">
        
        {/* Standalone Component */}
        <Navbar />

        <main className="flex-grow py-12 px-4 flex flex-col items-center w-full">
          <Routes>
            <Route path="/" element={<Forge />} />
            <Route path="/archives" element={<Archives />} />
          </Routes>
        </main>

        <footer className="w-full py-10 text-center border-t border-slate-900 mt-20 opacity-40">
          <p className="text-slate-500 text-[9px] font-mono tracking-widest uppercase">
            RTX 3050 Compute // MERN Stack // LangChain Agentic Flow
          </p>
        </footer>
      </div>
    </Router>
  );
}

export default App;