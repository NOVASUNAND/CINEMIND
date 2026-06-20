import { useState, useEffect } from 'react';
import type { ChangeEvent } from 'react';
import axios from 'axios';
import api from '../services/api';
import { usePipeline } from '../context/PipelineContext'; 
import { useAuth } from '../context/AuthContext'; 
import { Upload, ImageIcon, Loader2, Sparkles, Cpu, Activity, Clock, Zap } from 'lucide-react';

// 🚀 ENHANCED CATCH-UP TYPEWRITER ENGINE
const TypewriterText = ({ text }: { text: string }) => {
  const [displayedText, setDisplayedText] = useState("");

  // Sync state instantly if component remounts with pre-existing background text
  useEffect(() => {
    if (displayedText === "" && text.length > 0) {
      setDisplayedText(text);
    }
  }, [text]);

  useEffect(() => {
    if (!text) { setDisplayedText(""); return; }
    if (displayedText.length < text.length) {
      const timer = setTimeout(() => {
        setDisplayedText(text.slice(0, displayedText.length + 1));
      }, 10);
      return () => clearTimeout(timer);
    }
  }, [text, displayedText]);

  return (
    <>
      {displayedText}
      {displayedText.length < text.length && (
        <span className="inline-block w-2 h-6 ml-1 bg-purple-500 animate-pulse align-middle"></span>
      )}
    </>
  );
};

const Forge = () => {
  const {
    loading, setLoading,
    loadingMessage, setLoadingMessage,
    normalCaption, setNormalCaption,
    advancedCaption, setAdvancedCaption,
    story, setStory,
    executionMode, setExecutionMode,
    file, setFile,
    preview, setPreview,
    latencyTime, setLatencyTime,
    tokenCount, setTokenCount
  } = usePipeline();

  const { user } = useAuth(); 
  
  const [selectedTone, setSelectedTone] = useState<string>('epic, widescreen cinematic screenwriting');

  // 🚀 FIXED: FAIL-SAFE STATE GUARD
  // Will ONLY wipe the data context if the user session objects turn null (logout/switch account)
  useEffect(() => {
    if (user) return; 

    setNormalCaption("");
    setAdvancedCaption("");
    setStory("");
    setFile(null);
    setPreview("");
    setExecutionMode(null);
    setLatencyTime(0);
    setTokenCount(0);
    setLoading(false);
    setLoadingMessage("");
  }, [user, setNormalCaption, setAdvancedCaption, setStory, setFile, setPreview, setExecutionMode, setLatencyTime, setTokenCount, setLoading, setLoadingMessage]);

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
      setLatencyTime(0);
      setTokenCount(0);
    }
  };

  const generateNarrative = async () => {
    if (!file) return;
    
    setStory(""); 
    setNormalCaption("");
    setAdvancedCaption("");
    setExecutionMode(null);
    setTokenCount(0);
    setLatencyTime(0);
    setLoadingMessage("Connecting to inference nodes..."); 
    setLoading(true); 

    const startTime = performance.now();

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

      await api.post('/ai/generate', formData, {
        headers: { 'Content-Type': 'multipart/form-data' },
        timeout: 120000 
      });

      const endTime = performance.now();
      const executionDurationSeconds = (endTime - startTime) / 1000;
      setLatencyTime(parseFloat(executionDurationSeconds.toFixed(2)));

    } catch (error: any) {
      console.error("Pipeline Error:", error);
      
      if (error.response?.status === 401) {
        alert("Your session has expired or is invalid. Logging out directly...");
        localStorage.clear(); 
        window.location.href = '/auth';
        return;
      }

      alert(`Pipeline failed: ${error.response?.data?.error || "Inference connection expired."}`);
      setLoading(false); 
    }
  };

  const handleExportLog = () => {
    let formattedScript = "";

    if (executionMode === 'LOCAL_EDGE_FALLBACK') {
      const sentences = advancedCaption
        .replace(/\[EDGE NODE ACTIVATED\]:?/i, '') 
        .replace(/This scene stands preserved.*/i, '') 
        .split(/[.!?]+/) 
        .map(sentence => sentence.trim().toUpperCase())
        .filter(sentence => sentence.length > 5); 

      formattedScript = [
        `[EDGE NODE RECONSTRUCTION SYSTEM ACTIVATED]`,
        `EXT. VISIONARY HORIZON - SCENE GENERATION`,
        ...sentences.map(s => `${s}.`), 
        `THIS DATA BLOCK STANDS SECURED AND INDEXED LOCALLY.`
      ].join('\n\n'); 

    } else {
      formattedScript = story
        .split('\n')
        .map(line => line.trim().toUpperCase())
        .filter(Boolean)
        .join('\n\n');
    }

    const fileContent = 
`===================================================================
                  THE FORGE // VISUAL SYNTHESIS LOG
===================================================================
TIMESTAMP: ${new Date().toLocaleString()}
CONFIGURATION PROFILE: ${selectedTone.toUpperCase()}
INFERENCE PIPELINE: ${executionMode === 'CLOUD_PRIMARY' ? 'CLOUD ENGINE (GEMINI)' : 'EDGE NODE (RTX 3050)'}
TOTAL ROUND-TRIP TIME: ${latencyTime} SECONDS

[SCENE SOURCE LITERAL]
${normalCaption}

[VISUAL SEMANTIC ANALYSIS]
${advancedCaption}

-------------------------------------------------------------------
                  SCREENPLAY TRANSCRIPT
-------------------------------------------------------------------
${formattedScript}

===================================================================
          TRANSCRIPT END // ARCHIVAL DATA BLOCK SECURED
===================================================================`;
    
    const element = document.createElement("a");
    const fileBlob = new Blob([fileContent], { type: 'text/plain;charset=utf-8' });
    element.href = URL.createObjectURL(fileBlob);
    element.download = `FORGE_LOG_${Date.now()}.txt`;
    document.body.appendChild(element);
    element.click();
    document.body.removeChild(element);
  };
  
  return (
    <div className="w-full max-w-4xl bg-slate-900 border border-slate-800 rounded-3xl p-8 shadow-2xl mx-auto">
      {/* Page Header Layout */}
      <div className="text-center mb-10">
        <h2 className="text-3xl font-extrabold italic text-blue-500 mb-2">THE <span className="text-slate-100">FORGE</span></h2>
        <p className="text-slate-500 text-xs font-mono tracking-widest uppercase">Visual-Semantic Synthesis Engine</p>
      </div>

      {/* Accessible Upload Frame Zone */}
      <div className="flex flex-col items-center justify-center border-2 border-dashed border-slate-700 rounded-2xl p-10 hover:border-blue-500 transition-colors group cursor-pointer relative mb-8">
        <input 
          type="file" 
          aria-label="Upload an image to begin reconstruction" 
          title="Upload an image" 
          className="absolute inset-0 opacity-0 cursor-pointer" 
          onChange={handleFileChange}
          accept="image/*"
          disabled={loading}
        />
        {preview ? (
          <img src={preview} alt="Preview Matrix" className="max-h-80 rounded-lg object-contain shadow-lg" />
        ) : (
          <div className="text-center">
            <Upload className="mx-auto w-12 h-12 text-slate-500 group-hover:text-blue-400 mb-4" />
            <p className="text-slate-400 font-mono text-xs text-center">DROP IMAGE TO BEGIN RECONSTRUCTION</p>
          </div>
        )}
      </div>

      {/* Tone Selection Hub */}
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

      {/* Primary Execution Engine Trigger */}
      <button 
        onClick={generateNarrative}
        disabled={!file || loading}
        className={`w-full font-bold py-4 rounded-xl transition-all flex items-center justify-center gap-3 mb-4 ${
          loading 
            ? "bg-slate-800 text-cyan-400 cursor-not-allowed opacity-90 shadow-[0_0_20px_rgba(34,211,238,0.2)]" 
            : !file
              ? "bg-slate-800 text-slate-600 cursor-not-allowed"
              : "bg-blue-600 hover:bg-blue-700 text-white shadow-lg shadow-blue-600/10"
        }`}
      >
        {loading ? (
          <> 
            <Loader2 className="animate-spin text-cyan-400" size={20} /> 
            <span className="tracking-wide font-mono text-sm uppercase">{loadingMessage}</span> 
          </>
        ) : (
          <> <ImageIcon size={20} /> Generate AI Narratives </>
        )}
      </button>

      {/* TELEMETRY ANALYTICS INTEGRATION PANEL */}
      {(executionMode || loading) && (
        <div className="grid grid-cols-3 gap-4 mb-8 bg-slate-950 border border-slate-800 p-4 rounded-xl font-mono text-xs text-slate-400">
          
          <div className="flex flex-col items-center justify-center border-r border-slate-800 p-2 text-center">
            <div className="flex items-center gap-1.5 text-slate-500 mb-1">
              <Activity size={14} />
              <span className="text-[10px] uppercase tracking-wider font-bold">INF ROUTING</span>
            </div>
            {loading && !executionMode ? (
              <span className="text-cyan-400 animate-pulse text-[11px]">NEGOTIATING...</span>
            ) : (
              <span className={`font-bold text-[11px] ${executionMode === 'CLOUD_PRIMARY' ? 'text-emerald-400' : 'text-amber-400'}`}>
                {executionMode === 'CLOUD_PRIMARY' ? "☁️ CLOUD_PIPE" : "⚡ EDGE_NODE"}
              </span>
            )}
          </div>

          <div className="flex flex-col items-center justify-center border-r border-slate-800 p-2 text-center">
            <div className="flex items-center gap-1.5 text-slate-500 mb-1">
              <Clock size={14} />
              <span className="text-[10px] uppercase tracking-wider font-bold">LATENCY RTT</span>
            </div>
            {loading && latencyTime === 0 ? (
              <span className="text-cyan-400 animate-pulse text-[11px]">LIVE CLOCK...</span>
            ) : (
              <span className="text-slate-200 font-bold text-[11px]">{latencyTime}s</span>
            )}
          </div>

          <div className="flex flex-col items-center justify-center p-2 text-center">
            <div className="flex items-center gap-1.5 text-slate-500 mb-1">
              <Zap size={14} />
              <span className="text-[10px] uppercase tracking-wider font-bold">STREAM VOLUME</span>
            </div>
            <span className="text-purple-400 font-bold text-[11px]">
              {tokenCount} TOKENS
            </span>
          </div>

        </div>
      )}

      {/* Visual Analytics Metric Blocks */}
      {(normalCaption || advancedCaption) && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div className="p-6 bg-slate-950 rounded-2xl border border-slate-800">
            <div className="flex items-center gap-2 mb-3"><Cpu size={16} className="text-slate-500" /><h3 className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Standard Model</h3></div>
            <div className="text-lg text-slate-400 leading-relaxed">
              {normalCaption ? <TypewriterText text={normalCaption} /> : ""}
            </div>
          </div>
          <div className="p-6 bg-slate-950 rounded-2xl border-l-4 border-blue-500 border-y border-r border-slate-800">
            <div className="flex items-center gap-2 mb-3"><Sparkles size={16} className="text-blue-400" /><h3 className="text-xs font-semibold text-blue-400 uppercase tracking-wider">Advanced Context</h3></div>
            <div className="text-xl italic text-slate-100 leading-relaxed font-serif">
              " {advancedCaption ? <TypewriterText text={advancedCaption} /> : ""} "
            </div>
          </div>
        </div>
      )}

      {/* Continuous Stream Output Interface Terminal */}
      {story && (
        <div className="mt-8 p-10 bg-slate-950 rounded-3xl border border-purple-500/30 relative overflow-hidden shadow-[0_0_40px_rgba(168,85,247,0.1)]">
          <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-purple-600 via-blue-600 to-purple-600"></div>
          
          <div className="flex items-center justify-between gap-2 mb-4">
            <div className="flex items-center gap-2">
              <Sparkles className="text-purple-400" size={18} />
              <h3 className="text-xs font-bold text-purple-400 uppercase tracking-widest">Agentic Narrative</h3>
            </div>
            
            <button
              onClick={handleExportLog}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-purple-500/30 bg-purple-500/10 hover:bg-purple-500/20 text-purple-300 font-mono text-[10px] uppercase tracking-wider transition-all"
            >
              💾 Export Log
            </button>
          </div>
          
          <div className="text-2xl italic text-slate-100 leading-relaxed font-serif relative whitespace-pre-line">
            " {story ? <TypewriterText text={story} /> : ""} "
          </div>
        </div>
      )}
    </div>
  );
};

export default Forge;