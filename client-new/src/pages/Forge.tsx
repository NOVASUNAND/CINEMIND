import { useState, useEffect } from 'react';
import type { ChangeEvent } from 'react';
import axios from 'axios';
import api from '../services/api';
import { usePipeline } from '../context/PipelineContext'; 
import { Upload, ImageIcon, Loader2, Sparkles, Cpu } from 'lucide-react';

const Forge = () => {
  // 🚀 FIXED: Consuming file and preview states globally so page switching won't clear your image views
  const {
    loading, setLoading,
    normalCaption, setNormalCaption,
    advancedCaption, setAdvancedCaption,
    story, setStory,
    executionMode, setExecutionMode,
    file, setFile,
    preview, setPreview
  } = usePipeline();
  
  const [selectedTone, setSelectedTone] = useState<string>('epic, widescreen cinematic screenwriting');

  const tones = [
    { name: 'Horror 😈', value: 'dark, atmospheric, and terrifying horror' },
    { name: 'Fantasy 🏰', value: 'mythical, majestic, and high-fantasy storytelling' },
    { name: 'Sci-Fi 🚀', value: 'futuristic, techno-speculative, and science-fiction' },
    { name: 'Romantic ❤️', value: 'emotionally resonant, intimate, and deeply romantic' },
    { name: 'Documentary 🎥', value: 'grounded, historical, and factual observation style' },
    { name: 'Cinematic 🎬', value: 'epic, widescreen cinematic screenwriting' }
  ];

  const handleFileChange = (e: ChangeEvent<HTMLInputElement>) => {
    const selectedFile = e.target.files?.[0];
    if (selectedFile) {
      setFile(selectedFile);
      setPreview(URL.createObjectURL(selectedFile));
      setNormalCaption(""); 
      setAdvancedCaption("");
      setStory("");
      setExecutionMode(null);
    }
  };

  const generateNarrative = async () => {
    if (!file) return;
    
    setLoading(true); 
    setExecutionMode(null);
    const cloudName = import.meta.env.VITE_CLOUDINARY_CLOUD_NAME;
    const uploadPreset = import.meta.env.VITE_CLOUDINARY_UPLOAD_PRESET;

    try {
      const cloudData = new FormData();
      cloudData.append('file', file);
      cloudData.append('upload_preset', uploadPreset);

      const cloudRes = await axios.post(
        `https://api.cloudinary.com/v1_1/${cloudName}/image/upload`,
        cloudData
      );
      const imageUrl = cloudRes.data.secure_url;

      const formData = new FormData();
      formData.append('image', file);
      formData.append('imageUrl', imageUrl);
      formData.append('tone', selectedTone);

      const response = await api.post('/ai/generate', formData, {
        headers: { 'Content-Type': 'multipart/form-data' },
        timeout: 120000 
      });
      
      setNormalCaption(response.data.normalCaption);
      setAdvancedCaption(response.data.advancedCaption);
      setStory(response.data.story); 
      setExecutionMode(response.data.executionMode);

    } catch (error: any) {
      console.error("Pipeline Error:", error);
      alert(`Pipeline failed: ${error.response?.data?.error || "Inference execution connection expired."}`);
      setLoading(false); 
    }
  };

  return (
    <div className="w-full max-w-4xl bg-slate-900 border border-slate-800 rounded-3xl p-8 shadow-2xl mx-auto">
      {/* Header Inside Page */}
      <div className="text-center mb-10">
        <h2 className="text-3xl font-extrabold italic text-blue-500 mb-2">THE <span className="text-slate-100">FORGE</span></h2>
        <p className="text-slate-500 text-xs font-mono tracking-widest uppercase">Visual-Semantic Synthesis Engine</p>
      </div>

      {/* Upload Section Frame */}
      <div className="flex flex-col items-center justify-center border-2 border-dashed border-slate-700 rounded-2xl p-10 hover:border-blue-500 transition-colors group cursor-pointer relative mb-8">
        <input 
          type="file" 
          className="absolute inset-0 opacity-0 cursor-pointer" 
          onChange={handleFileChange}
          accept="image/*"
          disabled={loading}
        />
        {preview ? (
          // 🚀 FIXED: Keeps the visual preview rendered beautifully even after moving tabs
          <img src={preview} alt="Preview" className="max-h-80 rounded-lg object-contain shadow-lg" />
        ) : (
          <div className="text-center">
            <Upload className="mx-auto w-12 h-12 text-slate-500 group-hover:text-blue-400 mb-4" />
            <p className="text-slate-400 font-mono text-xs text-center">DROP IMAGE TO BEGIN RECONSTRUCTION</p>
          </div>
        )}
      </div>

      {/* Tone Selector Grid */}
      <div className="mb-8">
        <label className="block text-[10px] font-mono text-slate-500 uppercase tracking-widest mb-4 text-center">
          Configure Narrative Tone Frequency
        </label>
        <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
          {tones.map((t) => (
            <button
              key={t.name}
              type="button"
              disabled={loading}
              onClick={() => setSelectedTone(t.value)}
              className={`px-4 py-3 rounded-xl border text-xs font-mono transition-all duration-200 text-left ${
                selectedTone === t.value
                  ? 'bg-blue-600/10 border-blue-500 text-blue-400 font-bold shadow-md shadow-blue-500/5'
                  : 'bg-slate-950 border-slate-800 text-slate-500 hover:border-slate-700 hover:bg-slate-900'
              } ${loading ? 'opacity-40 cursor-not-allowed' : ''}`}
            >
              {t.name}
            </button>
          ))}
        </div>
      </div>

      {/* Action Button Control */}
      <button 
        onClick={generateNarrative}
        disabled={!file || loading}
        className={`w-full font-bold py-4 rounded-xl transition-all flex items-center justify-center gap-2 mb-4 ${
          loading 
            ? "bg-slate-800 text-slate-500 cursor-not-allowed opacity-60 animate-pulse" 
            : !file
              ? "bg-slate-800 text-slate-600 cursor-not-allowed"
              : "bg-blue-600 hover:bg-blue-700 text-white shadow-lg shadow-blue-600/10"
        }`}
      >
        {loading ? (
          <> <Loader2 className="animate-spin" /> Background Pipeline Orchestrating... </>
        ) : (
          <> <ImageIcon size={20} /> Generate AI Narratives </>
        )}
      </button>

      {/* Execution Environment Metric Badge */}
      {executionMode && (
        <div className="flex items-center justify-center gap-2 mb-8">
          <span className="text-[10px] font-mono uppercase tracking-widest text-slate-500">Inference Architecture:</span>
          <span className={`px-3 py-1 rounded-full text-xs font-bold font-mono tracking-wide flex items-center gap-1.5 ${
            executionMode === 'CLOUD_PRIMARY' ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20' : 'bg-amber-500/10 text-amber-400 border border-amber-500/20'
          }`}>
            {executionMode === 'CLOUD_PRIMARY' ? <><span>☁️</span> Cloud Engine (Gemini)</> : <><span>⚡</span> Resilient Edge Node (RTX 3050)</>}
          </span>
        </div>
      )}

      {/* Results Comparison Grid */}
      {(normalCaption || advancedCaption) && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div className="p-6 bg-slate-950 rounded-2xl border border-slate-800">
            <div className="flex items-center gap-2 mb-3"><Cpu size={16} className="text-slate-500" /><h3 className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Standard Model</h3></div>
            <p className="text-lg text-slate-400 leading-relaxed">{normalCaption}</p>
          </div>
          <div className="p-6 bg-slate-950 rounded-2xl border-l-4 border-blue-500 border-y border-r border-slate-800">
            <div className="flex items-center gap-2 mb-3"><Sparkles size={16} className="text-blue-400" /><h3 className="text-xs font-semibold text-blue-400 uppercase tracking-wider">Advanced Context</h3></div>
            <p className="text-xl italic text-slate-100 leading-relaxed font-serif">"{advancedCaption}"</p>
          </div>
        </div>
      )}

      {/* Agentic Narrative Output */}
      {story && (
        <div className="mt-8 p-10 bg-slate-950 rounded-3xl border border-purple-500/30 relative overflow-hidden shadow-[0_0_40px_rgba(168,85,247,0.1)]">
          <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-purple-600 via-blue-600 to-purple-600"></div>
          <div className="flex items-center gap-2 mb-4"><Sparkles className="text-purple-400" size={18} /><h3 className="text-xs font-bold text-purple-400 uppercase tracking-widest">Agentic Narrative</h3></div>
          <p className="text-2xl italic text-slate-100 leading-relaxed font-serif">"{story}"</p>
        </div>
      )}
    </div>
  );
};

export default Forge;