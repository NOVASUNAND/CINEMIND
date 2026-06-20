import { Response } from "express";
import axios from "axios";
import FormData from "form-data";
import { ChatGoogleGenerativeAI } from "@langchain/google-genai";
import { PromptTemplate } from "@langchain/core/prompts";
import { GoogleGenAI } from "@google/genai";
import dotenv from "dotenv";
import { io } from "../index.js"; 
import Story from "../models/Story.js";
import { AuthenticatedRequest } from "../interfaces/auth.interface.js";

dotenv.config();

const PYTHON_ENGINE_URL = process.env.PYTHON_ENGINE_URL || "http://127.0.0.1:8000";

export const generateNarrative = async (req: AuthenticatedRequest, res: Response) => {
  try {
    if (!req.file) return res.status(400).json({ error: "Please upload an image." });
    
    const uploadedFile = req.file;
    const bodyPayload = (req.body || {});
    const imageUrl = bodyPayload.imageUrl || "";
    const activeTone = bodyPayload.tone || "epic, widescreen cinematic screenwriting";
    
    let normalCaption = "";
    let advancedContext = "";
    let finalNarrative = "";
    let inferenceExecutionMode = "CLOUD_PRIMARY";

    // 🚀 UX STATUS EMIT: Announce pipeline start
    io.emit("pipeline-status", { message: "Extracting visual data (Stage 1/3)..." });

    try {
      console.log("☁️ [NODE]: Triggering Primary Cloud Pipeline (Gemini)...");

      if (!process.env.GEMINI_API_KEY) throw new Error("API key missing from environment configurations");

      // STAGE 1: Vision Extraction
      const aiStudio = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY! });

      const geminiVisionResponse = await aiStudio.models.generateContent({
        model: "gemini-2.5-flash",
        config: { responseMimeType: "application/json" },
        contents: [
          {
            inlineData: {
              data: uploadedFile.buffer.toString("base64"),
              mimeType: uploadedFile.mimetype,
            },
          },
          `Analyze this image. You must return a JSON object matching this schema exactly:
           {
             "literal": "Write a clear, objective standard description.",
             "analytical": "Write a deep, contextually advanced analysis."
           }`,
        ],
      });

      const cleanJson = JSON.parse(geminiVisionResponse.text?.trim() || "{}");
      normalCaption = cleanJson.literal || "Standard visualization compiled.";
      advancedContext = cleanJson.analytical || "Advanced analysis indexed.";

      // 🚀 UX STATUS EMIT: Push visual context immediately so screen isn't blank
      io.emit("context-ready", { normalCaption, advancedCaption: advancedContext });
      io.emit("pipeline-status", { message: "Synthesizing agentic narrative (Stage 2/3)..." });
      
      // STAGE 2: Narrative Generation
      const llm = new ChatGoogleGenerativeAI({
        model: "gemini-2.5-pro", // Heavy-duty reasoning engine
        apiKey: process.env.GEMINI_API_KEY,
        maxOutputTokens: 1200, 
        temperature: 0.7, 
        
        safetySettings: [
          { category: "HARM_CATEGORY_DANGEROUS_CONTENT", threshold: "BLOCK_NONE" },
          { category: "HARM_CATEGORY_DANGEROUS_HOSTS", threshold: "BLOCK_NONE" },
          { category: "HARM_CATEGORY_DANGEROUS_EVENTS", threshold: "BLOCK_NONE" },
          { category: "HARM_CATEGORY_DANGEROUS_MEMES", threshold: "BLOCK_NONE" },
          { category: "HARM_CATEGORY_VIOLENCE", threshold: "BLOCK_NONE" },
        ] as any
      });

      // 🚀 THE ULTIMATE MULTI-TONE PROMPT ARCHITECTURE
      const prompt = PromptTemplate.fromTemplate(`
        You are an elite, world-class scriptwriter and cinematic narrator. 
        Target Tone: {toneStyle}
        Raw Context: {context}
        
        YOUR TASK:
        Write an expansive, deeply detailed 3-sentence theatrical script based directly on the entities, actions, and landscape provided in the Raw Context. You must alter the linguistic delivery to match the style rules of the Target Tone perfectly.
        
        STRICT PIPELINE LAWS:
        1. TONE-SPECIFIC OVERRIDES (CRITICAL):
           - If "Documentary": Act like a clinical military historian or nature narrator. Completely ignore any dramatic/fantasy hype words in the Raw Context. Focus strictly on tactical observation and factual scale. Ban all fantasy adjectives.
           - If "Horror": Focus on atmospheric tension, dread, and shadows. DO NOT use explicit gore words (e.g., charnel, slaughter, blood) to prevent system censorship.
           - If "Romance", "Sci-Fi", "Fantasy", or "Cinematic": Lean entirely into the atmospheric, emotional, and thematic aesthetics unique to those genres.
        2. Do NOT mention structural media words like "image", "screen", "camera", "frame", "drawing", "artwork", or "character".
        3. Ground the narrative explicitly in the actual scene elements.
        4. PACING & STRUCTURE: Write EXACTLY 3 sentences. Make them rich, dramatic, and multi-clause, but keep them reasonably concise. Avoid massive run-on paragraphs. 
        5. NARRATIVE FINALITY: The third sentence MUST conclude the thought completely and end with a definitive period (.). Do not leave the final thought dangling.
        6. Return ONLY the raw plain text of the 3 sentences. No quotes, no markdown wrappers, no introductory headers.
      `);

      const chain = prompt.pipe(llm);
      
      const stream = await chain.stream({ 
        context: advancedContext,
        toneStyle: activeTone
      });

      // Stream chunks over WebSockets
      // 🚀 BACKPRESSURE FIX: Micro-delay helper to prevent WebSocket chunk congestion
      const delay = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

      for await (const chunk of stream) {
        const textChunk = chunk.content;
        if (typeof textChunk === "string" && textChunk) {
          finalNarrative += textChunk;
          io.emit("narrative-chunk", { chunk: textChunk });
          
          // 🚀 THE TRIPWIRE CURE: Give the event loop 5ms to clear the WebSocket buffer queue 
          // before snapping up the next incoming packet from the Gemini stream.
          await delay(5);
        }
      }

      finalNarrative = finalNarrative.trim().replace(/^["']+|["']+$/g, "").trim();

      // 🚀 THE MANUAL TRIPWIRE (CIRCUIT BREAKER)
      // If the stream was severed mid-sentence, throw error to force edge fallback
      if (!finalNarrative || !finalNarrative.match(/[.!?]$/)) {
        throw new Error("Cloud stream was decapitated by API safety filters. Forcing edge node routing.");
      }

    } catch (cloudError: any) {
      console.warn(`⚠️ [NODE]: Cloud Pipeline Bypassed/Failed (${cloudError.message}). Rerouting execution flow...`);
      
      io.emit("pipeline-status", { message: "Cloud congested. Waking Edge Node (RTX 3050)..." });

      inferenceExecutionMode = "LOCAL_EDGE_FALLBACK";

      try {
        const formData = new FormData();
        formData.append("file", uploadedFile.buffer, {
          filename: uploadedFile.originalname,
          contentType: uploadedFile.mimetype,
        });

        const pythonResponse = await axios.post(`${PYTHON_ENGINE_URL}/generate-story`, formData, {
          headers: { ...formData.getHeaders() },
          timeout: 120000, 
        });

        normalCaption = pythonResponse.data.normal || "Local description compiled.";
        advancedContext = pythonResponse.data.advanced || "Local context compiled.";
        
        io.emit("context-ready", { normalCaption, advancedCaption: advancedContext });
        io.emit("pipeline-status", { message: "Edge Node compiling fallback narrative..." });

        const rawTone = activeTone.split(' ')[0].replace(/,/g, '') || "Cinematic";
        const toneKeyword = rawTone.charAt(0).toUpperCase() + rawTone.slice(1);
        const article = /^[AEIOU]/i.test(toneKeyword) ? "an" : "a";

        finalNarrative = `[EDGE NODE ACTIVATED]: Generating with ${article} ${toneKeyword} profile. ${advancedContext} This scene stands preserved and indexed locally.`;
        
        io.emit("narrative-chunk", { chunk: finalNarrative });

        try {
          await Story.create({
            user: req.user?.id,
            imageUrl,
            filename: uploadedFile.originalname,
            normalCaption,
            advancedCaption: advancedContext,
            narrative: finalNarrative,
            executionMode: inferenceExecutionMode,
            createdAt: new Date()
          });
          console.log(`💾 [NODE]: Saved to MongoDB History. Mode: ${inferenceExecutionMode}`);
        } catch (dbErr: any) {
          console.error("❌ Fallback Database Save Error:", dbErr.message);
        }

        io.emit("narrative-complete", {
          normalCaption,
          advancedCaption: advancedContext,
          story: finalNarrative,
          imageUrl,
          executionMode: inferenceExecutionMode,
        });

        return res.status(200).json({ success: true, executionMode: "LOCAL_EDGE_FALLBACK" });

      } catch (localError: any) {
        console.error("❌ Both inference targets are dead:", localError.message);
        return res.status(500).json({ error: "All AI pipeline inference targets are currently offline or timing out." });
      }
    }

    // STAGE 3: Cloud Persistence
    io.emit("pipeline-status", { message: "Finalizing persistence logic (Stage 3/3)..." });

    try {
      await Story.create({
        user: req.user?.id,
        imageUrl,
        filename: uploadedFile.originalname,
        normalCaption,
        advancedCaption: advancedContext,
        narrative: finalNarrative,
        executionMode: inferenceExecutionMode,
        createdAt: new Date()
      });
      console.log(`💾 [NODE]: Saved to MongoDB History. Mode: ${inferenceExecutionMode}`);
    } catch (dbError) {
      console.error("❌ Primary Database Save Error:", dbError);
    }

    io.emit("narrative-complete", {
      normalCaption,
      advancedCaption: advancedContext,
      story: finalNarrative,
      imageUrl,
      executionMode: inferenceExecutionMode,
    });

    return res.status(200).json({ success: true, executionMode: "CLOUD_PRIMARY" });

  } catch (error: any) {
    console.error("❌ Global Controller Exception:", error.message);
    return res.status(500).json({ error: "Global system controller collapsed during processing stream." });
  }
};

export const getHistory = async (req: AuthenticatedRequest, res: Response) => {
  try {
    const stories = await Story.find({ user: req.user?.id }).sort({ createdAt: -1 }).limit(10);
    return res.status(200).json(stories);
  } catch (error: any) {
    return res.status(500).json({ error: error.message });
  }
};