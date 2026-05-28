import { Request, Response } from 'express';
import axios from 'axios';
import FormData from 'form-data';
import { ChatGoogleGenerativeAI } from "@langchain/google-genai";
import { PromptTemplate } from "@langchain/core/prompts";
import { GoogleGenAI } from "@google/genai"; // Native SDK for the Gemini Vision primary step
import dotenv from 'dotenv';
import Story from '../models/Story.js'; 

dotenv.config();

const PYTHON_ENGINE_URL = process.env.PYTHON_ENGINE_URL || "http://127.0.0.1:8000";

export const generateNarrative = async (req: Request, res: Response) => {
  try {
    // 1. Validate File
    if (!req.file) {
      return res.status(400).json({ error: 'Please upload an image.' });
    }

    const { imageUrl } = req.body; 
    if (!imageUrl) {
      console.warn("⚠️ [NODE]: No imageUrl received in request body.");
    }

    // Variables to hold pipeline states
    let normalCaption = "";
    let advancedContext = "";
    let finalNarrative = "";
    let inferenceExecutionMode = "CLOUD_PRIMARY";

    // 2. STAGE 1: Attempt Cloud-Native Multimodal Execution (Primary Path)
    try {
      console.log("☁️ [NODE]: Triggering Primary Cloud Pipeline (Gemini)...");

      // We use the native SDK style or LangChain directly for Vision. 
      // For clean prompt integration in one step, let's call Gemini directly via the GoogleGenAI instance
      const aiStudio = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY! });
      
      const geminiVisionResponse = await aiStudio.models.generateContent({
        model: 'gemini-2.5-flash',
        contents: [
          {
            inlineData: {
              data: req.file.buffer.toString("base64"),
              mimeType: req.file.mimetype,
            },
          },
          `Analyze this image and return a JSON object with two fields exactly. 
           Do not wrap in markdown blocks. 
           Format: {"literal": "a brief clear description of what is in the image", "analytical": "a deeper structural analysis of the compositions, elements, and context"}`
        ],
      });

      const visionText = geminiVisionResponse.text || "";
      if (!visionText) {
        throw new Error("Vision response returned no text content");
      }
      
      const cleanJson = JSON.parse(visionText.replace(/```json|```/g, "").trim());
      
      normalCaption = cleanJson.literal;
      advancedContext = cleanJson.analytical;

    } catch (cloudError: any) {
      
      console.warn(`⚠️ [NODE]: Primary Cloud Pipeline Failed (${cloudError.message}).`);
      console.log(`⚙️ [NODE]: Activating Local Fallback on NVIDIA RTX 3050...`);
      
      inferenceExecutionMode = "LOCAL_EDGE_FALLBACK";

      try {
        const formData = new FormData();
        formData.append('file', req.file.buffer, {
          filename: req.file.originalname,
          contentType: req.file.mimetype,
        });

        const pythonResponse = await axios.post(`${PYTHON_ENGINE_URL}/generate-story`, formData, {
          headers: { ...formData.getHeaders() },
          timeout: 45000 // Slightly tighter timeout for local response
        });

        normalCaption = pythonResponse.data.normal;
        advancedContext = pythonResponse.data.advanced;
      } catch (localError: any) {
        console.error("❌ [NODE]: Both Cloud and Local inference paths failed.");
        return res.status(500).json({ error: "Complete system pipeline failure. Unreachable compute cores." });
      }
    }

    
    const llm = new ChatGoogleGenerativeAI({
      model: "gemini-2.5-flash", 
      apiKey: process.env.GEMINI_API_KEY, 
      maxOutputTokens: 1200,
      temperature: 0.8, 
    });

    const prompt = PromptTemplate.fromTemplate(`
        You are a master cinematic screenwriter.
        Raw Caption: "{context}"
        Write a compelling 3-sentence cinematic narrative based on this scene.
        STRICT RULES:
        1. Do NOT mention images, cameras, or descriptions.
        2. Sentence 1: Establish the atmosphere.
        3. Sentence 2: Reveal the emotional tone.
        4. Sentence 3: End with a subtle cinematic observation.
        Cinematic Narrative:
    `);

    const chain = prompt.pipe(llm);
    const storyResponse = await chain.invoke({ context: advancedContext });
    finalNarrative = typeof storyResponse.content === 'string' 
        ? storyResponse.content 
        : JSON.stringify(storyResponse.content);

    // 5. Database Persistence
    try {
        await Story.create({
            imageUrl: imageUrl || "", 
            filename: req.file.originalname,
            normalCaption: normalCaption,
            advancedCaption: advancedContext,
            narrative: finalNarrative
        });
        console.log(`💾 [NODE]: Saved to MongoDB History. Mode: ${inferenceExecutionMode}`);
    } catch (dbError) {
        console.error("❌ MongoDB Save Error:", dbError);
    }

    // 6. Return Structured Response including the Mode flag for frontend updates
    return res.status(200).json({
      normalCaption,
      advancedCaption: advancedContext,
      story: finalNarrative,
      imageUrl,
      executionMode: inferenceExecutionMode
    });

  } catch (error: any) {
    console.error("❌ Global Controller Error:", error.message);
    return res.status(500).json({ error: "Pipeline failed completely." });
  }
};

export const getHistory = async (req: Request, res: Response) => {
  try {
    const stories = await Story.find().sort({ createdAt: -1 }).limit(10);
    return res.status(200).json(stories);
  } catch (error: any) {
    return res.status(500).json({ error: error.message });
  }
};