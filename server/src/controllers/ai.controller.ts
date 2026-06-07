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

interface TargetBody {
  imageUrl?: string;
  tone?: string;
}

export const generateNarrative = async (req: AuthenticatedRequest, res: Response) => {
  try {
    // 1. Structural Validation
    if (!req.file) {
      return res.status(400).json({ error: "Please upload an image." });
    }
    const uploadedFile = req.file;

    // Direct early sanitization of incoming text body payloads
    const bodyPayload = (req.body || {}) as TargetBody;
    const imageUrl = bodyPayload.imageUrl || "";
    const activeTone = bodyPayload.tone || "epic, widescreen cinematic screenwriting";
    
    let normalCaption = "";
    let advancedContext = "";
    let finalNarrative = "";
    let inferenceExecutionMode = "CLOUD_PRIMARY";

    // 🚀 ARCHITECTURAL FIX: Single unified try-block for the ENTIRE Cloud Pipe (Vision + Synthesis)
    try {
      console.log("☁️ [NODE]: Triggering Primary Cloud Pipeline (Gemini)...");

      if (!process.env.GEMINI_API_KEY) {
        throw new Error("Gemini API key missing from environment configurations");
      }

      const aiStudio = new GoogleGenAI({
        apiKey: process.env.GEMINI_API_KEY!,
      });

      // ---- CLOUD STAGE 1: MULTIMODAL VISION VISION ----
      const geminiVisionResponse = await aiStudio.models.generateContent({
        model: "gemini-2.5-flash",
        config: {
          responseMimeType: "application/json",
        },
        contents: [
          {
            inlineData: {
              data: uploadedFile.buffer.toString("base64"),
              mimeType: uploadedFile.mimetype,
            },
          },
          `Analyze this image. You must return a JSON object matching this schema exactly:
           {
             "literal": "Write a clear, objective standard description of the image content here.",
             "analytical": "Write a deep, contextually advanced narrative analysis here."
           }`,
        ],
      });

      const visionText = geminiVisionResponse.text || "";
      if (!visionText) {
        throw new Error("Vision response returned blank tokens");
      }

      const cleanJson = JSON.parse(visionText.trim());
      normalCaption = cleanJson.literal || "Standard visualization compiled.";
      advancedContext = cleanJson.analytical || "Advanced analysis indexed.";

      // ---- CLOUD STAGE 2: TEXT SYNTHESIS (LANGCHAIN) ----
      console.log("📝 [NODE]: Cloud Vision succeeded. Synthesizing script via LangChain...");
      
      const llm = new ChatGoogleGenerativeAI({
        model: "gemini-2.5-flash",
        apiKey: process.env.GEMINI_API_KEY,
        maxOutputTokens: 1200, // 🚀 FIXED: Doubled the token limit so expansive sentences NEVER hit the ceiling
        temperature: 0.7, 
      });

      const prompt = PromptTemplate.fromTemplate(`
        You are an elite, world-class scriptwriter. 
        
        CRUCIAL STYLE DEFINITIONS FOR THE TARGET TONE PARAMETER:
        - "dark, atmospheric, and terrifying horror": Write a tense, suspenseful, and frightening script.
        - "mythical, majestic, and high-fantasy storytelling": Use grand, magical, epic, and high-fantasy lore prose.
        - "futuristic, techno-speculative, and science-fiction": Focus on advanced tech, dystopian elements, or cosmic futures.
        - "emotionally resonant, intimate, and deeply romantic": Focus on intimate feelings, deep affection, and emotional warmth.
        - "grounded, historical, and factual observation style": Speak like a serious documentary narrator (e.g., David Attenborough). Factual, analytical, objective, and sociological. Do NOT be overly poetic or abstract.
        - "epic, widescreen cinematic screenwriting": Widescreen dramatic narrative, heavy atmosphere, and theatrical descriptions.

        INPUT DATA:
        Raw Context Analysis: {context}
        Target Narrative Tone Parameter: {toneStyle}
        
        YOUR TASK:
        Write an expansive, deeply detailed 3-sentence script based directly on the entities, actions, and environment provided in the Raw Context Analysis. You must alter the linguistic delivery to match the style rules of the Target Narrative Tone Parameter perfectly.
        
        STRICT PIPELINE LAWS:
        1. Do NOT mention structural media words like "image", "screen", "camera", "frame", "drawing", "artwork", or "character".
        2. Ground the narrative explicitly in the actual scene elements. 
        3. CRUCIAL RULE - COMPLETION: You MUST write exactly 3 complete sentences. You MUST finish your final sentence. Do NOT cut off mid-thought. Wrap up your narrative with a definitive period (.).
        4. Return ONLY the raw plain text of the 3 sentences. No quotes, no markdown wrappers, no introductory headers.
      `);

      const chain = prompt.pipe(llm);
      
      const storyResponse = await chain.invoke({ 
        context: advancedContext,
        toneStyle: activeTone
      });

      // 🚀 The ultimate fail-proof LangChain string extraction
      if (storyResponse) {
        if (typeof storyResponse === "string") {
          finalNarrative = storyResponse;
        } else if (typeof storyResponse === "object" && "content" in storyResponse) {
          const contentVal = storyResponse.content;
          if (typeof contentVal === "string") {
            finalNarrative = contentVal;
          } else if (Array.isArray(contentVal)) {
            finalNarrative = contentVal
              .map((chunk: any) => {
                if (typeof chunk === "string") return chunk;
                if (chunk.text) return chunk.text;
                if (chunk.content) return chunk.content;
                return "";
              })
              .join("");
          } else {
            finalNarrative = String(contentVal);
          }
        } else {
          finalNarrative = String(storyResponse);
        }
      }

      // Deep clean trailing artifacts and outer quotes
      finalNarrative = finalNarrative.trim().replace(/^["']+|["']+$/g, "").trim();

      if (!finalNarrative || finalNarrative.length < 10) {
        throw new Error("Generated narrative sequence collapsed into an empty token string.");
      }

      console.log("🎬 [NODE] Successfully Synthesized Dynamic Narrative:", finalNarrative);

    } catch (cloudError: any) {
      // 🚀 THE ULTIMATE FALLBACK CATCH: Catches 429 Quota errors, 503 limits, and timeouts completely!
      console.warn(`⚠️ [NODE]: Primary Cloud Pipeline Failed or Rate-Limited (${cloudError.message}).`);
      console.log(`⚙️ [NODE]: Activating Moondream2 Local Compute Core on NVIDIA RTX 3050...`);

      inferenceExecutionMode = "LOCAL_EDGE_FALLBACK";

      try {
        const formData = new FormData();
        formData.append("file", uploadedFile.buffer, {
          filename: uploadedFile.originalname,
          contentType: uploadedFile.mimetype,
        });

        // 120-second timeout to handle hardware activation completely
        const pythonResponse = await axios.post(
          `${PYTHON_ENGINE_URL}/generate-story`,
          formData,
          {
            headers: { ...formData.getHeaders() },
            timeout: 120000, 
          }
        );

        console.log("✅ Local compute nodes responded successfully:", pythonResponse.data);

        normalCaption = pythonResponse.data.normal || "Local standard caption initialized.";
        advancedContext = pythonResponse.data.advanced || "Local contextual overview compiled.";

        const toneKeyword = activeTone.split(' ')[0] || "Cinematic";
        finalNarrative = `Mapped inside a ${toneKeyword} configuration, ${advancedContext.toLowerCase()}. The scene stands preserved vividly by the resilient local execution engine.`;

      } catch (localError: any) {
        console.error("❌ [NODE]: Complete System Failure. Both Cloud and Local inference channels are offline.");
        return res.status(500).json({ 
          error: "All AI pipeline inference targets are currently offline or timing out.",
          details: localError.message 
        });
      }
    }

    // 5. Database Persistence Execution (Executes cleanly for whichever path succeeded)
    try {
      await Story.create({
        user: req.user?.id,
        imageUrl: imageUrl,
        filename: uploadedFile.originalname,
        normalCaption,
        advancedCaption: advancedContext,
        narrative: finalNarrative,
        executionMode: inferenceExecutionMode,
        createdAt: new Date()
      });
      console.log(`💾 [NODE]: Saved to MongoDB History. Mode: ${inferenceExecutionMode}`);
    } catch (dbError) {
      console.error("❌ MongoDB Save Error:", dbError);
    }

    // 6. Push real-time synchronization out over Socket pipe
    io.emit("narrative-complete", {
      normalCaption,
      advancedCaption: advancedContext,
      story: finalNarrative,
      imageUrl,
      executionMode: inferenceExecutionMode,
    });

    return res.status(200).json({
      normalCaption,
      advancedCaption: advancedContext,
      story: finalNarrative,
      imageUrl,
      executionMode: inferenceExecutionMode,
    });

  } catch (error: any) {
    console.error("❌ Global Controller Exception:", error.message);
    return res.status(500).json({ error: "Global system controller collapsed during processing stream." });
  }
};

export const getHistory = async (req: AuthenticatedRequest, res: Response) => {
  try {
    const stories = await Story.find({ user: req.user?.id })
      .sort({ createdAt: -1 })
      .limit(10);
    return res.status(200).json(stories);
  } catch (error: any) {
    return res.status(500).json({ error: error.message });
  }
};