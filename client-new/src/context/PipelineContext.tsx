import React, { createContext, useContext, useState, useEffect } from 'react';
import { socket } from '../services/socket';

interface PipelineContextType {
  loading: boolean;
  setLoading: (loading: boolean) => void;
  normalCaption: string;
  setNormalCaption: (val: string) => void;
  advancedCaption: string;
  setAdvancedCaption: (val: string) => void;
  story: string;
  setStory: (val: string) => void;
  executionMode: 'CLOUD_PRIMARY' | 'LOCAL_EDGE_FALLBACK' | null;
  setExecutionMode: (mode: 'CLOUD_PRIMARY' | 'LOCAL_EDGE_FALLBACK' | null) => void;
  // 🚀 FIXED: Global persistence states for the uploaded file and image view previews
  file: File | null;
  setFile: (file: File | null) => void;
  preview: string | null;
  setPreview: (preview: string | null) => void;
}

const PipelineContext = createContext<PipelineContextType | undefined>(undefined);

export const PipelineProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [loading, setLoading] = useState<boolean>(false);
  const [normalCaption, setNormalCaption] = useState<string>("");
  const [advancedCaption, setAdvancedCaption] = useState<string>("");
  const [story, setStory] = useState<string>("");
  const [executionMode, setExecutionMode] = useState<'CLOUD_PRIMARY' | 'LOCAL_EDGE_FALLBACK' | null>(null);
  
  // 🚀 Global state tracking definitions
  const [file, setFile] = useState<File | null>(null);
  const [preview, setPreview] = useState<string | null>(null);

  useEffect(() => {
    socket.on("narrative-complete", (data) => {
      setNormalCaption(data.normalCaption);
      setAdvancedCaption(data.advancedCaption);
      setStory(data.story);
      setExecutionMode(data.executionMode);
      setLoading(false); 
    });

    return () => {
      socket.off("narrative-complete");
    };
  }, []);

  return (
    <PipelineContext.Provider value={{
      loading, setLoading,
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