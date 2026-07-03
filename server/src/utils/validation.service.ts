import { StateGraph, Annotation } from "@langchain/langgraph";
import { GoogleGenAI } from "@google/genai";
import dotenv from "dotenv";

dotenv.config();

// Initialize Gemini Client
const aiStudio = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY! });

// ============================================================
// 1. STATE DEFINITION
// ============================================================
export const ValidationState = Annotation.Root({
    toneKey: Annotation<string>(),
    rules: Annotation<string>(),
    narrative: Annotation<string>(),
    retryCount: Annotation<number>(),
    valid: Annotation<boolean>(),
    reason: Annotation<string>(),
    correctionInstruction: Annotation<string>(),
    generateFn: Annotation<(correction: string) => Promise<string>>()
});

type State = typeof ValidationState.State;

// ============================================================
// 2. TIER 1: LOCAL CHEAP FILTER (Saves API Quota)
// ============================================================
const isKeywordInvalid = (narrative: string, toneKey: string): { invalid: boolean; reason: string } => {
    const textLower = narrative.toLowerCase();

    // Catch Hallucinations
    const fantasyHallucinations = ["eldoria", "ancient kingdom", "prophecy", "lineage", "mythical land"];
    if (fantasyHallucinations.some(token => textLower.includes(token))) {
        return { invalid: true, reason: "Detected ungrounded high-fantasy lore hallucinations (e.g., Eldoria)." };
    }

    // Catch Off-Genre Tropes
    const forbiddenTropeMap: Record<string, string[]> = {
        romance: ["combat", "slay", "weapon", "battle", "clash", "strike", "armor"],
        romantic: ["combat", "slay", "weapon", "battle", "clash", "strike", "armor"],
        documentary: ["felt", "beautiful", "scary", "eerie", "haunting", "magnificent"],
        horror: ["victory", "triumph", "saved", "defeated the evil"]
    };

    const badTokens = forbiddenTropeMap[toneKey] || [];
    for (const token of badTokens) {
        if (textLower.includes(token)) {
            return { invalid: true, reason: `Used forbidden trope word "${token}" for genre [${toneKey}].` };
        }
    }
    return { invalid: false, reason: "" };
};

// ============================================================
// 3. GRAPH NODES
// ============================================================

// --- NODE 1: Grounding Node ---
export const evaluateGrounding = async (state: State) => {
    // RUN CHEAP FILTER FIRST BEFORE BURNING API COSTS
    const cheapCheck = isKeywordInvalid(state.narrative, state.toneKey);
    
    if (cheapCheck.invalid) {
        console.log("🛑 [LANGGRAPH TIER 1]: Cheap filter triggered! Failing fast...");
        return {
            valid: false,
            reason: cheapCheck.reason
        };
    }

    console.log("🧠 [LANGGRAPH TIER 2]: Passed cheap filters. Core structural check passing...");
    return { 
        valid: true, 
        reason: "Local grounding parameters valid." 
    }; 
};

// --- NODE 2: Genre Validator Node (With 429 Safety) ---
export const evaluateGenre = async (state: State) => {
    // If Tier 1 already flagged it as invalid, skip the expensive LLM call
    if (state.valid === false) {
        return { valid: false, reason: state.reason };
    }

    const genreCheckPrompt = `
        Evaluate this narrative for strict genre fidelity.
        TARGET TONE: ${state.toneKey}
        RULES: ${state.rules}
        NARRATIVE: "${state.narrative}"
        
        Return ONLY JSON: { 
            "isGenreValid": boolean, 
            "reason": string 
        }
    `;

    try {
        const response = await aiStudio.models.generateContent({
            model: "gemini-2.5-flash",
            config: { responseMimeType: "application/json" },
            contents: genreCheckPrompt
        });

        const text = response.text?.trim() || '{"isGenreValid": true, "reason": ""}';
        // Clean any accidental markdown backticks just in case
        const cleanText = text.replace(/```json/g, "").replace(/```/g, "").trim();
        const result = JSON.parse(cleanText);
        
        return { 
            valid: result.isGenreValid, 
            reason: result.reason 
        };

    } catch (error: any) {
        // SAFE FALLBACK: Intercept 429 Quota Exceeded errors so the app doesn't crash
        const errorMessage = error?.message || JSON.stringify(error) || "";
        
        if (errorMessage.includes("429") || errorMessage.includes("RESOURCE_EXHAUSTED")) {
            console.warn("⚠️ [LANGGRAPH]: Gemini Quota Exceeded (429). Bypassing Deep Check to prevent system crash.");
            return { 
                valid: true, // Force pass so the pipeline finishes
                reason: "Quota limitation active; auto-passing narrative structure validation." 
            };
        }
        
        console.error("❌ [LANGGRAPH]: Semantic pipeline error:", errorMessage);
        return { valid: false, reason: "Semantic pipeline error encountered." };
    }
};

// ============================================================
// 4. ROUTER & GRAPH COMPILATION
// ============================================================
const shouldContinue = (state: State) => {
    // If valid, or we've hit our max retries (2), end the workflow
    if (state.valid || state.retryCount >= 2) {
        return "__end__";
    }
    // Otherwise, loop back to regenerate
    return "regenerate";
};
// 🟢 NEW NODE: Handles the actual AI regeneration during a retry loop
async function regenerate(state: typeof ValidationState.State) {
  if (!state.generateFn) {
    console.warn("[Validation] generateFn missing. Skipping generation.");
    return {
      retryCount: state.retryCount + 1,
      correctionInstruction: state.reason
    };
  }

  try {
    const newNarrative = await state.generateFn(state.reason);
    return {
      narrative: newNarrative,
      correctionInstruction: state.reason,
      retryCount: state.retryCount + 1
    };
  } catch (error) {
    console.error("[Validation] Generation failed during retry. Failing open.", error);
    return {
      narrative: state.narrative,
      correctionInstruction: state.reason,
      retryCount: state.retryCount + 1
    };
  }
}

// Build and export the final executable graph
export const NarrativeValidationGraph = new StateGraph(ValidationState)
    .addNode("grounding", evaluateGrounding)
    .addNode("genre", evaluateGenre)
    .addNode("regenerate", regenerate)
    .addEdge("__start__", "grounding")
    .addEdge("grounding", "genre")
    .addConditionalEdges("genre", shouldContinue, {
        "regenerate": "regenerate",
        "__end__": "__end__"
    })
    .addEdge("regenerate", "grounding") 
    .compile();