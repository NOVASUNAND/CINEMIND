import { useEffect, useState } from 'react';
import api from '../services/api';
import axios from 'axios';

const HistoryGallery = () => {
  const [history, setHistory] = useState<any[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  // 🚀 Real-time Filtering State Variables
  const [searchTerm, setSearchTerm] = useState<string>('');
  const [selectedMode, setSelectedMode] = useState<string>('ALL');

  const fetchHistory = async () => {
    try {
      setErrorMessage(null);
      const response =  await api.get('/ai/history');
      
      if (Array.isArray(response.data)) {
        setHistory(response.data);
      } else {
        setErrorMessage("Invalid data format received from data pipeline.");
      }
    } catch (error: any) {
      console.error("❌ Gallery Fetch Error:", error);
      setErrorMessage(error.message || "Failed to cross-reference MongoDB records.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchHistory();
  }, []);

  
const filteredHistory = history.filter((item) => {
  // 1. Text Search Matching
  const matchesSearch = 
    item.narrative?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    item.normalCaption?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    item.advancedCaption?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    item.filename?.toLowerCase().includes(searchTerm.toLowerCase());

  // 2. Safely normalize executionMode string to handle database legacy records
  const modeString = (item.executionMode || '').toUpperCase();

  const matchesMode = 
    selectedMode === 'ALL' || 
    
    (selectedMode === 'CLOUD' && (modeString.includes('CLOUD') || modeString === '' || !modeString.includes('LOCAL'))) ||
    
    (selectedMode === 'LOCAL' && modeString.includes('LOCAL'));

  return matchesSearch && matchesMode;
});

  if (loading) {
    return (
      <div className="flex justify-center items-center p-20">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-blue-500"></div>
      </div>
    );
  }

  return (
    <section className="mt-8 px-4 pb-20">
      <div className="max-w-6xl mx-auto">
        
        {/* 🚀 CONTROL PANEL: Search Bar & Dropdown Filtering Layout */}
        <div className="mb-12 flex flex-col md:flex-row gap-4 bg-zinc-900/40 p-4 border border-white/5 rounded-2xl backdrop-blur-md">
          <div className="flex-1 relative">
            <input 
              type="text"
              placeholder="Search by keyword, anime name, characters, or source file..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full bg-zinc-950 border border-white/10 rounded-xl px-4 py-3 text-sm text-zinc-200 placeholder-zinc-500 focus:outline-none focus:border-blue-500 transition-colors font-mono"
            />
          </div>
          
          <div className="w-full md:w-56">
            <select
              value={selectedMode}
              onChange={(e) => setSelectedMode(e.target.value)}
              className="w-full bg-zinc-950 border border-white/10 rounded-xl px-4 py-3 text-sm text-zinc-300 focus:outline-none focus:border-blue-500 transition-colors font-mono appearance-none cursor-pointer"
            >
              <option value="ALL">✨ All Execution Modes</option>
              <option value="CLOUD">☁️ Cloud Core (Gemini)</option>
              <option value="LOCAL">💻 Local Compute (Edge)</option>
            </select>
          </div>
        </div>

        {errorMessage && (
          <div className="mb-6 p-4 bg-red-500/10 border border-red-500/20 text-red-400 rounded-xl text-center font-mono text-xs">
            ⚠️ Network Error: {errorMessage}
          </div>
        )}

        {/* Dynamic counter displaying active query states */}
        <div className="mb-6 flex justify-between items-center px-2">
          <p className="text-xs font-mono text-zinc-500 uppercase tracking-wider">
            Showing {filteredHistory.length} of {history.length} indexed records
          </p>
        </div>

        {filteredHistory.length === 0 ? (
          <div className="text-center py-20 bg-zinc-900/10 border border-dashed border-white/5 rounded-2xl">
            <p className="text-gray-500 font-mono text-sm">No matching memories found in current index profile.</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
            {filteredHistory.map((item) => (
              <div 
                key={item._id} 
                className="group relative bg-zinc-900/50 border border-white/10 rounded-2xl backdrop-blur-xl hover:bg-zinc-800/50 transition-all duration-300 overflow-hidden shadow-xl"
              >
                {/* Persistent Image Layer */}
                <div className="h-48 w-full bg-zinc-800 overflow-hidden">
                  {item.imageUrl ? (
                    <img 
                      src={item.imageUrl} 
                      alt="Story Visual" 
                      className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-500"
                    />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center text-zinc-600 text-[10px] font-mono">
                      NO VISUAL DATA
                    </div>
                  )}
                </div>

                <div className="p-6">
                  <div className="flex justify-between items-start mb-4">
                    <span className="text-[10px] font-mono text-zinc-500 uppercase tracking-widest">
                      {item.createdAt ? new Date(item.createdAt).toLocaleDateString() : 'Recent'}
                    </span>
                    <span className={`text-[10px] font-mono px-2 py-1 rounded ${
                      item.executionMode?.includes('LOCAL') 
                        ? 'text-amber-400 bg-amber-500/10' 
                        : 'text-blue-400 bg-blue-500/10'
                    }`}>
                      {item.executionMode || 'MERN + CLOUD'}
                    </span>
                  </div>

                  <p className="text-zinc-200 leading-relaxed font-medium italic font-serif mb-4">
                    "{item.narrative}"
                  </p>
                  
                  <div className="mt-6 pt-4 border-t border-white/5 space-y-2">
                    <p className="text-[11px] text-zinc-500 line-clamp-1 italic">
                      Source: {item.filename || 'Unknown'}
                    </p>
                    <p className="text-[11px] text-zinc-600 line-clamp-2">
                      <span className="text-zinc-400 font-bold">Context:</span> {item.advancedCaption || item.normalCaption}
                    </p>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </section>
  );
};

export default HistoryGallery;