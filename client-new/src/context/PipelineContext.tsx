import React, { createContext, useContext, useState, useEffect } from 'react';
import { socket } from '../services/socket';

interface PipelineContextType {
  loading: boolean;
  setLoading: (loading: boolean) => void;
  loadingMessage: string;
  setLoadingMessage: (msg: string) => void;
  
  normalCaption: string;
  setNormalCaption: (val: string) => void;
  advancedCaption: string;
  setAdvancedCaption: (val: string) => void;
  story: string;
  setStory: (val: string | ((prev: string) => string)) => void; 
  executionMode: null | 'CLOUD_PRIMARY' | 'CLOUD_FALLBACK_GROQ' | 'LOCAL_EDGE_FALLBACK';
  setExecutionMode: (mode: null | 'CLOUD_PRIMARY' | 'CLOUD_FALLBACK_GROQ' | 'LOCAL_EDGE_FALLBACK') => void;
  
  file: File | null;
  setFile: (file: File | null) => void;
  preview: string | null;
  setPreview: (preview: string | null) => void;

  // 🚀 Telemetry Engine Metrics
  latencyTime: number;
  setLatencyTime: (time: number) => void;
  tokenCount: number;
  setTokenCount: (count: number | ((prev: number) => number)) => void;
}

const PipelineContext = createContext<PipelineContextType | undefined>(undefined);

export const PipelineProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [loading, setLoading] = useState<boolean>(false);
  const [loadingMessage, setLoadingMessage] = useState<string>("Initializing Pipeline...");
  
  const [normalCaption, setNormalCaption] = useState<string>("");
  const [advancedCaption, setAdvancedCaption] = useState<string>("");
  const [story, setStory] = useState<string>("");
  const [executionMode, setExecutionMode] = useState<null | 'CLOUD_PRIMARY' | 'CLOUD_FALLBACK_GROQ' | 'LOCAL_EDGE_FALLBACK'>(null);
  
  const [file, setFile] = useState<File | null>(null);
  const [preview, setPreview] = useState<string | null>(null);

  const [latencyTime, setLatencyTime] = useState<number>(0);
  const [tokenCount, setTokenCount] = useState<number>(0);

  // 🚀 BULLETPROOF TELEMETRY SYNC: Automatically tracks word/token metrics
  // whenever the story text changes, completely bypassing socket event race conditions.
  useEffect(() => {
    if (!story) {
      setTokenCount(0);
      return;
    }
    const cleanWords = story.trim().split(/\s+/).filter(Boolean);
    setTokenCount(cleanWords.length);
  }, [story]);

  useEffect(() => {
    socket.on("pipeline-status", (data) => {
      setLoadingMessage(data.message);
    });

    socket.on("context-ready", (data) => {
      setNormalCaption(data.normalCaption);
      setAdvancedCaption(data.advancedCaption);
    });

    // Cleaned up backpressure trap: Just append the raw string chunk instantly
    socket.on("narrative-chunk", (data) => {
      setStory((prev) => prev + data.chunk);
    });

    socket.on("narrative-complete", (data) => {
      setExecutionMode(data.executionMode);
      setLoadingMessage("Sequence Complete.");
      setTimeout(() => setLoading(false), 800); 
    });

    return () => {
      socket.off("pipeline-status");
      socket.off("context-ready");
      socket.off("narrative-chunk");
      socket.off("narrative-complete");
    };
  }, []);

  return (
    <PipelineContext.Provider value={{
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
    }}>
      {children}
    </PipelineContext.Provider>
  );
};

export const usePipeline = () => {
  const context = useContext(PipelineContext);
  if (!context) throw new Error("usePipeline must be used within a PipelineProvider");
  return context;
};