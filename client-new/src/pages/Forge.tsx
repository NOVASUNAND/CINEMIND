import { useState } from 'react';
import { useEffect } from 'react';
import type { ChangeEvent } from 'react';
import axios from 'axios';
import { socket } from '../services/socket';
import api from '../services/api';
import { Upload, ImageIcon, Loader2, Sparkles, Cpu } from 'lucide-react';

const Forge = () => {
  const [file, setFile] = useState<File | null>(null);
  const [preview, setPreview] = useState<string | null>(null);
  const [normalCaption, setNormalCaption] = useState<string>("");
  const [advancedCaption, setAdvancedCaption] = useState<string>("");
  const [story, setStory] = useState<string>(""); 
  const [loading, setLoading] = useState<boolean>(false);
  const [executionMode, setExecutionMode] = useState<'CLOUD_PRIMARY' | 'LOCAL_EDGE_FALLBACK' | null>(null);

  useEffect((): void | (() => void)  => {
    socket.on("narrative-complete", (data) => {
      setNormalCaption(data.normalCaption);
      setAdvancedCaption(data.advancedCaption);
      setStory(data.story);
      setExecutionMode(data.executionMode);
      setLoading(false); // Drop loading instantly when event arrives
    });

    return () => {
      socket.off("narrative-complete"); // cleanup to avoid memory leaks
    };
  }, []);

  const handleFileChange = (e: ChangeEvent<HTMLInputElement>) => {
    const selectedFile = e.target.files?.[0];
    if (selectedFile) {
      setFile(selectedFile);
      setPreview(URL.createObjectURL(selectedFile));
      setNormalCaption(""); 
      setAdvancedCaption("");
      setStory("");
      setExecutionMode(null); // Clear mode status on new upload
    }
  };

  
  const generateNarrative = async () => {
    if (!file) return;
    
    setLoading(true);
    setExecutionMode(null); // Clear previous status
    const cloudName = import.meta.env.VITE_CLOUDINARY_CLOUD_NAME;
    const uploadPreset = import.meta.env.VITE_CLOUDINARY_UPLOAD_PRESET;

    try {
      // 🚀 STAGE 1: CLOUDINARY UPLOAD
      const cloudData = new FormData();
      cloudData.append('file', file);
      cloudData.append('upload_preset', uploadPreset);

      const cloudRes = await axios.post(
        `https://api.cloudinary.com/v1_1/${cloudName}/image/upload`,
        cloudData
      );
      const imageUrl = cloudRes.data.secure_url;

      // 🚀 STAGE 2: BACKEND AI PROCESSING (Resilient Hybrid Path)
      const formData = new FormData();
      formData.append('image', file); // Raw file for local fallback
      formData.append('imageUrl', imageUrl); // Cloud link for MongoDB storage

      const response = await api.post('/ai/generate', formData, {
        headers: { 'Content-Type': 'multipart/form-data' },
        timeout: 60000 
      });
      
      setNormalCaption(response.data.normalCaption);
      setAdvancedCaption(response.data.advancedCaption);
      setStory(response.data.story); 
      setExecutionMode(response.data.executionMode); // Capture 'CLOUD_PRIMARY' or 'LOCAL_EDGE_FALLBACK'

    } catch (error: any) {
      console.error("Pipeline Error:", error);
      alert("Pipeline failed. Check if .env keys are correct and Backend is running.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="w-full max-w-4xl bg-slate-900 border border-slate-800 rounded-3xl p-8 shadow-2xl">
      {/* Header Inside Page */}
      <div className="text-center mb-10">
        <h2 className="text-3xl font-extrabold italic text-blue-500 mb-2">THE <span className="text-slate-100">FORGE</span></h2>
        <p className="text-slate-500 text-xs font-mono tracking-widest uppercase">Visual-Semantic Synthesis Engine</p>
      </div>

      {/* Upload Section */}
      <div className="flex flex-col items-center justify-center border-2 border-dashed border-slate-700 rounded-2xl p-10 hover:border-blue-500 transition-colors group cursor-pointer relative mb-8">
        <input 
          type="file" 
          className="absolute inset-0 opacity-0 cursor-pointer" 
          onChange={handleFileChange}
          accept="image/*"
        />
        {preview ? (
          <img src={preview} alt="Preview" className="max-h-80 rounded-lg object-contain shadow-lg" />
        ) : (
          <div className="text-center">
            <Upload className="mx-auto w-12 h-12 text-slate-500 group-hover:text-blue-400 mb-4" />
            <p className="text-slate-400 font-mono text-xs text-center">DROP IMAGE TO BEGIN RECONSTRUCTION</p>
          </div>
        )}
      </div>

      {/* Action Button */}
      <button 
        onClick={generateNarrative}
        disabled={!file || loading}
        className="w-full bg-blue-600 hover:bg-blue-700 disabled:bg-slate-800 disabled:text-slate-500 text-white font-bold py-4 rounded-xl transition-all flex items-center justify-center gap-2 mb-4"
      >
        {loading ? (
          <> <Loader2 className="animate-spin" /> Orchestrating Multimodal Pipelines... </>
        ) : (
          <> <ImageIcon size={20} /> Generate AI Narratives </>
        )}
      </button>

      {/* Execution Environment Engine Metric Badge */}
      {executionMode && (
        <div className="flex items-center justify-center gap-2 mb-8 animate-in fade-in zoom-in-95 duration-300">
          <span className="text-[10px] font-mono uppercase tracking-widest text-slate-500">Inference Architecture:</span>
          <span className={`px-3 py-1 rounded-full text-xs font-bold font-mono tracking-wide flex items-center gap-1.5 ${
            executionMode === 'CLOUD_PRIMARY' 
              ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20' 
              : 'bg-amber-500/10 text-amber-400 border border-amber-500/20 animate-pulse'
          }`}>
            {executionMode === 'CLOUD_PRIMARY' ? (
              <><span>☁️</span> Cloud Engine (Gemini)</>
            ) : (
              <><span>⚡</span> Resilient Edge Node (RTX 3050)</>
            )}
          </span>
        </div>
      )}

      {/* Results Comparison Grid */}
      {(normalCaption || advancedCaption) && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 animate-in fade-in slide-in-from-bottom-4">
          <div className="p-6 bg-slate-950 rounded-2xl border border-slate-800">
            <div className="flex items-center gap-2 mb-3">
              <Cpu size={16} className="text-slate-500" />
              <h3 className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Standard Model</h3>
            </div>
            <p className="text-lg text-slate-400 leading-relaxed">{normalCaption}</p>
          </div>

          <div className="p-6 bg-slate-950 rounded-2xl border-l-4 border-blue-500 border-y border-r border-slate-800">
            <div className="flex items-center gap-2 mb-3">
              <Sparkles size={16} className="text-blue-400" />
              <h3 className="text-xs font-semibold text-blue-400 uppercase tracking-wider">Advanced Context</h3>
            </div>
            <p className="text-xl italic text-slate-100 leading-relaxed font-serif">"{advancedCaption}"</p>
          </div>
        </div>
      )}

      {/* Agentic Narrative Output */}
      {story && (
        <div className="mt-8 p-10 bg-slate-950 rounded-3xl border border-purple-500/30 relative overflow-hidden animate-in fade-in slide-in-from-bottom-6 shadow-[0_0_40px_rgba(168,85,247,0.1)]">
          <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-purple-600 via-blue-600 to-purple-600"></div>
          <div className="flex items-center gap-2 mb-4">
            <Sparkles className="text-purple-400" size={18} />
            <h3 className="text-xs font-bold text-purple-400 uppercase tracking-widest">Agentic Narrative</h3>
          </div>
          <p className="text-2xl italic text-slate-100 leading-relaxed font-serif">"{story}"</p>
        </div>
      )}
    </div>
  );
};

export default Forge;