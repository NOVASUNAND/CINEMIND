import React, { useEffect, useState } from 'react';
import axios from 'axios';

// 🚀 1. Updated Interface to include the Cloudinary URL
interface StoryRecord {
  _id: string;
  filename: string;
  normalCaption: string;
  advancedCaption: string;
  narrative: string;
  imageUrl?: string; // Added this field
  createdAt: string;
}

const HistoryGallery: React.FC = () => {
  const [history, setHistory] = useState<StoryRecord[]>([]);
  const [loading, setLoading] = useState<boolean>(true);

  const fetchHistory = async () => {
    try {
      const response = await axios.get('http://localhost:5000/api/ai/history');
      setHistory(response.data);
    } catch (error) {
      console.error("❌ Gallery Fetch Error:", error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchHistory();
  }, []);

  if (loading) {
    return (
      <div className="flex justify-center items-center p-20">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-blue-500"></div>
      </div>
    );
  }

  return (
    <section className="mt-16 px-4 pb-20">
      <div className="max-w-6xl mx-auto">
        <h2 className="text-4xl font-black mb-10 text-white tracking-tighter italic text-center">
          ARCHIVED <span className="text-blue-500">NARRATIVES</span>
        </h2>

        {history.length === 0 ? (
          <p className="text-gray-500 font-mono text-center">No data found in MongoDB cluster.</p>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
            {history.map((item) => (
              <div 
                key={item._id} 
                className="group relative bg-zinc-900/50 border border-white/10 rounded-2xl backdrop-blur-xl hover:bg-zinc-800/50 transition-all duration-300 overflow-hidden shadow-xl"
              >
                {/* 🚀 2. Persistent Image Layer */}
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
                  {/* Visual Accent */}
                  <div className="absolute top-48 left-10 w-20 h-[2px] bg-gradient-to-r from-transparent via-blue-500 to-transparent opacity-0 group-hover:opacity-100 transition-opacity"></div>
                  
                  <div className="flex justify-between items-start mb-4">
                    <span className="text-[10px] font-mono text-zinc-500 uppercase tracking-widest">
                      {new Date(item.createdAt).toLocaleDateString()}
                    </span>
                    <span className="text-[10px] font-mono text-blue-400 bg-blue-500/10 px-2 py-1 rounded">
                      MERN + CLOUD
                    </span>
                  </div>

                  <p className="text-zinc-200 leading-relaxed font-medium italic font-serif mb-4">
                    "{item.narrative}"
                  </p>
                  
                  <div className="mt-6 pt-4 border-t border-white/5 space-y-2">
                    <p className="text-[11px] text-zinc-500 line-clamp-1 italic">
                      Source: {item.filename}
                    </p>
                    <p className="text-[11px] text-zinc-600 line-clamp-2">
                      <span className="text-zinc-400 font-bold">Context:</span> {item.advancedCaption}
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