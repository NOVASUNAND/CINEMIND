import { Request, Response } from "express";
import axios from "axios";
import FormData from "form-data";
import { ChatGoogleGenerativeAI } from "@langchain/google-genai";
import { PromptTemplate } from "@langchain/core/prompts";
import { GoogleGenAI } from "@google/genai";
import dotenv from "dotenv";
import { io } from "../index.js"; // Ensure this matches your server file location
import Story from "../models/Story.js";
import { AuthenticatedRequest } from "../interfaces/auth.interface.js";

dotenv.config();

const PYTHON_ENGINE_URL = process.env.PYTHON_ENGINE_URL || "http://127.0.0.1:8000";

export const generateNarrative = async (req: AuthenticatedRequest, res: Response) => {
  try {
    // 1. Validate File
    if (!req.file) {
      return res.status(400).json({ error: "Please upload an image." });
    }

    const { imageUrl } = req.body;
    
    // Core pipeline state variables
    let normalCaption = "";
    let advancedContext = "";
    let finalNarrative = "";
    let inferenceExecutionMode = "CLOUD_PRIMARY";

    // 2. STAGE 1: Primary Cloud Multimodal Path
    try {
      console.log("☁️ [NODE]: Triggering Primary Cloud Pipeline (Gemini)...");

      if (!process.env.GEMINI_API_KEY) {
        throw new Error("Gemini API key missing");
      }

      const aiStudio = new GoogleGenAI({
        apiKey: process.env.GEMINI_API_KEY!,
      });

      const geminiVisionResponse = await aiStudio.models.generateContent({
        model: "gemini-2.5-flash",
        contents: [
          {
            inlineData: {
              data: req.file.buffer.toString("base64"),
              mimeType: req.file.mimetype,
            },
          },
          `Analyze this image and return a JSON object with two fields exactly. 
           Do not wrap in markdown blocks. 
           Format: {"literal": "...", "analytical": "..."}`,
        ],
      });

      const visionText = geminiVisionResponse.text || "";
      if (!visionText) {
        throw new Error("Vision response returned no text content");
      }

      let cleanJson = JSON.parse(visionText.replace(/```json|```/g, "").trim());
      normalCaption = cleanJson.literal;
      advancedContext = cleanJson.analytical;

    } catch (cloudError: any) {
      // 3. STAGE 2: Local Edge Fallback (NVIDIA RTX 3050 Processing Core)
      console.warn(`⚠️ [NODE]: Primary Cloud Pipeline Failed (${cloudError.message}).`);
      console.log(`⚙️ [NODE]: Activating Local Fallback on NVIDIA RTX 3050...`);

      inferenceExecutionMode = "LOCAL_EDGE_FALLBACK";

      try {
        const formData = new FormData();
        formData.append("file", req.file.buffer, {
          filename: req.file.originalname,
          contentType: req.file.mimetype,
        });

        const pythonResponse = await axios.post(
          `${PYTHON_ENGINE_URL}/generate-story`,
          formData,
          {
            headers: { ...formData.getHeaders() },
            timeout: 45000,
          }
        );

        console.log("✅ Local fallback response:", pythonResponse.data);

        normalCaption = pythonResponse.data.normal;
        advancedContext = pythonResponse.data.advanced;

        // Generate the local narrative script block cleanly
        finalNarrative = `In a tranquil moment, ${advancedContext.toLowerCase()}. The scene radiates natural harmony, captured vividly by the resilient local engine.`;

        // 🚀 FIXED: Save with uniform schema fields matching model parameters
        await Story.create({
          filename: req.file.originalname,
          narrative: finalNarrative,
          normalCaption,
          advancedCaption: advancedContext,
          imageUrl: imageUrl || "",
          executionMode: inferenceExecutionMode, // Saved explicitly
          createdAt: new Date(),
        });

        console.log(`💾 [NODE]: Saved to MongoDB History. Mode: ${inferenceExecutionMode}`);
        console.log("🎬 [NODE] Emitting real-time payload via Socket channel...");

        // 🚀 FIXED: Using advancedCaption key to match frontend listeners perfectly
        io.emit("narrative-complete", {
          normalCaption,
          advancedCaption: advancedContext,
          story: finalNarrative,
          imageUrl,
          executionMode: inferenceExecutionMode,
        });

        return res.status(200).json({
          success: true,
          normalCaption,
          advancedCaption: advancedContext,
          story: finalNarrative,
          imageUrl,
          executionMode: inferenceExecutionMode,
        });

      } catch (localError: any) {
        console.error("❌ [NODE]: Both Cloud and Local inference paths failed.");
        return res.status(500).json({ error: "Complete system pipeline failure." });
      }
    }

    // 4. Cloud Story Synthesis Core (Executes only if Cloud Vision succeeded)
    const llm = new ChatGoogleGenerativeAI({
      model: "gemini-2.5-flash",
      apiKey: process.env.GEMINI_API_KEY,
      maxOutputTokens: 1000,
      temperature: 0.5,
    });

    const prompt = PromptTemplate.fromTemplate(`
      You are a master cinematic screenwriter.
      Raw Context Analysis: "{context}"
      
      Task: Write a compelling, fully completed 3-sentence cinematic narrative.
      
      STRICT PIPELINE RULES:
      1. Do NOT mention images, screens, or camera framing.
      2. Sentence 1: Establish the environmental atmosphere.
      3. Sentence 2: Reveal the underlying emotional or narrative tone.
      4. Sentence 3: End with a definitive cinematic observation.
      5. CRUCIAL: You must complete all 3 sentences.
      
      Cinematic Narrative:
    `);

    const chain = prompt.pipe(llm);
    const storyResponse = await chain.invoke({ context: advancedContext });

    if (typeof storyResponse.content === "string") {
      finalNarrative = storyResponse.content.trim();
    } else if (Array.isArray(storyResponse.content)) {
      finalNarrative = storyResponse.content
        .map((chunk: any) => typeof chunk === "string" ? chunk : chunk.text || "")
        .join("")
        .trim();
    } else {
      finalNarrative = String(storyResponse.content).trim();
    }

    console.log("🎬 [NODE] Successfully Synthesized Narrative:", finalNarrative);

    // 5. Cloud Database Persistence Execution
    try {
      await Story.create({
        user: req.user?.id,
        imageUrl: imageUrl || "",
        filename: req.file.originalname,
        normalCaption,
        advancedCaption: advancedContext,
        narrative: finalNarrative,
        executionMode: inferenceExecutionMode, // 🚀 FIXED: Added to cloud tracking model path
        createdAt: new Date()
      });
      console.log(`💾 [NODE]: Saved to MongoDB History. Mode: ${inferenceExecutionMode}`);
    } catch (dbError) {
      console.error("❌ MongoDB Save Error:", dbError);
    }

    console.log("🎬 [NODE] Emitting real-time payload via Socket channel...");

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
    console.error("❌ Global Controller Error:", error.message);
    return res.status(500).json({ error: "Pipeline failed completely." });
  }
};

export const getHistory = async (req: AuthenticatedRequest, res: Response) => {
  try {
    const stories = await Story.find({
      user: req.user?.id
    })
      .sort({ createdAt: -1 })
      .limit(10);

    return res.status(200).json(stories);
  } catch (error: any) {
    return res.status(500).json({ error: error.message });
  }
};