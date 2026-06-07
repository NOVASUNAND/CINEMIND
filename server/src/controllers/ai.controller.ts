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

      // 🚀 UX STATUS EMIT: Push visual context immediately so screen isn't blank during generation
      io.emit("context-ready", { normalCaption, advancedCaption: advancedContext });
      io.emit("pipeline-status", { message: "Synthesizing agentic narrative (Stage 2/3)..." });
      
      const llm = new ChatGoogleGenerativeAI({
        model: "gemini-2.5-flash",
        apiKey: process.env.GEMINI_API_KEY,
        maxOutputTokens: 1200, // Ample token headroom to prevent cutoff at final words
        temperature: 0.7, 
      });

      const prompt = PromptTemplate.fromTemplate(`
        You are an elite, world-class scriptwriter and cinematic narrator. 
        Target Tone: {toneStyle}
        Raw Context: {context}
        
        YOUR TASK:
        Write an expansive, deeply detailed 3-sentence theatrical script based directly on the entities, actions, and landscape provided in the Raw Context. You must alter the linguistic delivery to match the style rules of the Target Tone perfectly.
        
        STRICT PIPELINE LAWS:
        1. Do NOT mention structural media words like "image", "screen", "camera", "frame", "drawing", "artwork", or "character".
        2. Ground the narrative explicitly in the actual scene elements.
        3. CRUCIAL MANDATE - SENTENCE LENGTH & PACING: While each of the 3 sentences must be rich, dramatic, and multi-clause, you must strictly limit each individual sentence to a maximum of 35 words. Pace your vocabulary carefully so that your thoughts are concise yet epic.
        4. CRUCIAL MANDATE - COMPLETION: You must write EXACTLY 3 complete sentences. The third sentence MUST conclude with absolute narrative finality. Do NOT leave the thought dangling, do NOT exceed your token budget, and ensure the final character is a definitive period (.).
        5. Return ONLY the raw plain text of the 3 sentences. No quotes, no markdown wrappers, no introductory headers.
      `);

      const chain = prompt.pipe(llm);
      
      // 🚀 TOKEN STREAMING ENGINE: Slices cloud responses into live websocket packets
      const stream = await chain.stream({ 
        context: advancedContext,
        toneStyle: activeTone
      });

      for await (const chunk of stream) {
        const textChunk = chunk.content;
        if (typeof textChunk === "string" && textChunk) {
          finalNarrative += textChunk;
          io.emit("narrative-chunk", { chunk: textChunk });
        }
      }

      finalNarrative = finalNarrative.trim().replace(/^["']+|["']+$/g, "").trim();

    } catch (cloudError: any) {
      console.warn(`⚠️ [NODE]: Cloud Pipeline Bypassed/Failed (${cloudError.message}). Rerouting execution flow...`);
      
      // 🚀 UX STATUS EMIT: Notify client interface that fallback routing is engaging
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

        // 🚀 STRING REPAIR FIX: Sanitize style text strings cleanly to prevent trailing grammar commas
        const rawTone = activeTone.split(' ')[0].replace(/,/g, '') || "Cinematic";
        const toneKeyword = rawTone.charAt(0).toUpperCase() + rawTone.slice(1);
        const article = /^[AEIOU]/i.test(toneKeyword) ? "an" : "a";

        finalNarrative = `[EDGE NODE ACTIVATED]: Generating with ${article} ${toneKeyword} profile. ${advancedContext} This scene stands preserved and indexed locally.`;
        
        // Push full fallback array chunk over to animate typewriter
        io.emit("narrative-chunk", { chunk: finalNarrative });

        // Execute local channel persistence tracking safely within independent block
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

        // 🚀 THE ULTIMATE STRUCTURAL REPAIR: Instantly exit the controller thread upon local completion
        return res.status(200).json({ success: true, executionMode: "LOCAL_EDGE_FALLBACK" });

      } catch (localError: any) {
        console.error("❌ Both inference targets are dead:", localError.message);
        return res.status(500).json({ error: "All AI pipeline inference targets are currently offline or timing out." });
      }
    }

    // 🚀 STAGE 3: CLOUD DISPATCH PERSISTENCE (Runs only if Cloud Primary finishes smoothly)
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