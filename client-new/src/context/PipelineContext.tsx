import React, { createContext, useContext, useState, useEffect } from 'react';
import { socket } from '../services/socket';

interface PipelineContextType {
  loading: boolean;
  setLoading: (loading: boolean) => void;
  // 🚀 NEW: Tracks the dynamic button message
  loadingMessage: string;
  setLoadingMessage: (msg: string) => void;
  
  normalCaption: string;
  setNormalCaption: (val: string) => void;
  advancedCaption: string;
  setAdvancedCaption: (val: string) => void;
  story: string;
  setStory: (val: string | ((prev: string) => string)) => void; // Updated for appending
  executionMode: 'CLOUD_PRIMARY' | 'LOCAL_EDGE_FALLBACK' | null;
  setExecutionMode: (mode: 'CLOUD_PRIMARY' | 'LOCAL_EDGE_FALLBACK' | null) => void;
  file: File | null;
  setFile: (file: File | null) => void;
  preview: string | null;
  setPreview: (preview: string | null) => void;
}

const PipelineContext = createContext<PipelineContextType | undefined>(undefined);

export const PipelineProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [loading, setLoading] = useState<boolean>(false);
  const [loadingMessage, setLoadingMessage] = useState<string>("Initializing Pipeline...");
  
  const [normalCaption, setNormalCaption] = useState<string>("");
  const [advancedCaption, setAdvancedCaption] = useState<string>("");
  const [story, setStory] = useState<string>("");
  const [executionMode, setExecutionMode] = useState<'CLOUD_PRIMARY' | 'LOCAL_EDGE_FALLBACK' | null>(null);
  
  const [file, setFile] = useState<File | null>(null);
  const [preview, setPreview] = useState<string | null>(null);

  useEffect(() => {
    // 1. Dynamic Button Text Updater
    socket.on("pipeline-status", (data) => {
      setLoadingMessage(data.message);
    });

    // 2. Early Context Loading (Shows context before story finishes!)
    socket.on("context-ready", (data) => {
      setNormalCaption(data.normalCaption);
      setAdvancedCaption(data.advancedCaption);
    });

    // 3. ChatGPT Streaming Typewriter Effect
    socket.on("narrative-chunk", (data) => {
      setStory((prev) => prev + data.chunk);
    });

    // 4. Final Cleanup
    socket.on("narrative-complete", (data) => {
      setExecutionMode(data.executionMode);
      setLoadingMessage("Sequence Complete.");
      setTimeout(() => setLoading(false), 800); // Tiny delay so user reads "Complete"
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
      preview, setPreview
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