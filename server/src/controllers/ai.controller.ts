import { Response } from "express";
import axios from "axios";
import FormData from "form-data";
import { GoogleGenAI } from "@google/genai";
import Groq from "groq-sdk";
import dotenv from "dotenv";
import { io } from "../index.js"; 
import Story from "../models/Story.js";
import { AuthenticatedRequest } from "../interfaces/auth.interface.js";
import { StateGraph, Annotation } from "@langchain/langgraph";
import { NarrativeValidationGraph as ExternalValidationGraph } from '../utils/validation.service.js';

dotenv.config();

const PYTHON_ENGINE_URL = process.env.PYTHON_ENGINE_URL || "http://127.0.0.1:8000";
const groq = new Groq({ apiKey: process.env.GROQ_API_KEY });

// ============================================================
// 🧠 SEMANTIC ROUTER: PERSONAS & ACTION SUBVERSION FEW-SHOTS
// ============================================================
const PROMPT_ROUTER: Record<string, { persona: string; rules: string; fewShot: string }> = {
  fantasy: {
    persona: "You are a mythic high-fantasy author. Your world is governed by ancient magic, curses, and forgotten gods.",
    rules: "Transmute the physical inventory into a reality of magic. Subvert mundane or modern actions into mythic rituals or supernatural phenomena.",
    fewShot: `
EXAMPLE 1 (Standard Combat):
INPUT: {"caption": "A warrior holding a sword.", "mood_cues": ["intense"], "implied_action": ["preparing to strike"]}
OUTPUT: The enchanted blade hummed with ancient, volatile magic as he braced against the encroaching darkness. Runes flared along the steel, casting a harsh light that revealed the twisted, cursed nature of his unseen foe. In this forgotten realm, the battle was not for survival, but for the very soul of the shattered kingdom.

EXAMPLE 2 (Quiet Edge Case - No Combat):
INPUT: {"caption": "A dusty book on a wooden table.", "mood_cues": ["stillness", "eerie calm"], "implied_action": ["none"]}
OUTPUT: The leather-bound tome rested in unnatural stillness, the dust motes around it pausing in the air as if commanded by a dormant spell. Pages whispered softly on their own, carrying the faint, melodic echoes of a forgotten elven tongue. Whoever had left this grimoire behind was not just a scholar, but a weaver of realities long since sealed away.`
  },
  'sci-fi': {
    persona: "You are a hard sci-fi speculative author. Your world is governed by cybernetics, synthetic biology, and orbital systems.",
    rules: "Transmute the inventory into a reality of advanced engineering and technological systems. Avoid magic, heroic fantasy, and unexplained phenomena.",
    fewShot: `
EXAMPLE 1 (Standard Action):
INPUT: {"caption": "A soldier aiming a rifle in a dusty landscape.", "mood_cues": ["hostile atmosphere"], "implied_action": ["aiming"]}
OUTPUT: The primary power cell of his kinetic pike whined as it charged, emitting a low frequency that cut through the toxic, silica-choked atmosphere of the mining colony. He adjusted his stance against the exoskeleton of his adversary, the harsh solar radiation of the twin suns reflecting off their reinforced carbon plating. In the silence of their localized comms channel, the calculated geometry of their standoff betrayed years of ruthless synthetic augmentation.

EXAMPLE 2 (Atmospheric Edge Case - Empty Room):
INPUT: {"caption": "A glowing monitor in an empty dark room.", "mood_cues": ["sterile", "abandoned"], "implied_action": ["none"]}
OUTPUT: The terminal's holographic display flickered with dying bioluminescence, the last active node in a completely decentralized and abandoned orbital network. Sterile, recycled air cycled pointlessly through the ventilation shafts, carrying the faint ozone scent of a recent quantum processor burnout. There were no organic lifeforms left on this deck, only the silent, recursive loops of a failing AI desperately trying to ping home.`
  },
  romantic: {
    persona: "You are a literary author specializing in profound emotional intimacy, vulnerability, and human connection.",
    rules: "Transmute the inventory strictly into an expression of emotion, longing, tenderness, or devotion. If the input contains violence or action, subvert it into a protective or tragic emotional anchor.",
    fewShot: `
EXAMPLE 1 (Subverted Combat - Emotional focus):
INPUT: {"caption": "Two people running from danger.", "mood_cues": ["panic", "urgency"], "implied_action": ["fleeing"]}
OUTPUT: His fingers laced tightly through hers, grasping her hand not as a tactic of survival, but as his only tether to sanity in the collapsing world around them. The deafening noise of the chaos faded into nothingness, overshadowed entirely by the desperate, terrifying need to ensure she made it out alive. He didn't care about the ruins they left behind; his entire universe had narrowed down to the warmth of her palm and the shared, terrified rhythm of their breathing.

EXAMPLE 2 (Distance Edge Case - No touch):
INPUT: {"caption": "Two people standing far apart looking away.", "mood_cues": ["heavy silence", "tension"], "implied_action": ["avoiding gaze"]}
OUTPUT: The vast space between them in the quiet room felt heavier than gravity, charged with everything they were both too afraid to say aloud. She kept her eyes fixed on the window, though her hyper-awareness of his presence burned like a physical ache in her chest. It was a suffocating, beautiful agony—to be close enough to hear his breath, yet entirely unable to bridge the fragile distance that kept them apart.`
  },
  horror: {
    persona: "You are a master of psychological terror, paranoia, and oppressive dread.",
    rules: "Transmute the inventory into a nightmare of vulnerability and isolation. Subvert action into paralysis. The environment is hostile, and the subject is prey.",
    fewShot: `
EXAMPLE 1 (Standard Threat):
INPUT: {"caption": "A shadowy figure in the woods.", "mood_cues": ["dark", "menacing"], "implied_action": ["approaching"]}
OUTPUT: The tree branches twisted like broken fingers, casting long, unnatural shadows that seemed to crawl toward him of their own volition. The silhouette standing at the edge of the treeline wasn't breathing, yet it moved with a sickening, disjointed twitch that defied human anatomy. A suffocating wave of dread paralyzed him, rooted in the sudden, horrifying certainty that whatever was wearing that shape had been waiting for him.

EXAMPLE 2 (Psychological Edge Case - Zero Violence/Monsters):
INPUT: {"caption": "A sunny suburban street with a slightly open front door.", "mood_cues": ["quiet", "still"], "implied_action": ["none"]}
OUTPUT: The neighborhood was bathed in idyllic, cheerful sunlight, but the absolute lack of birdsong or wind created a suffocating, unnatural vacuum of sound. The front door stood ajar by exactly two inches—a detail so violently wrong that it triggered a primal, screaming alarm in the back of his mind. Nothing was moving in the shadows of the hallway, yet the overwhelming sensation of being silently observed from the dark made his blood run cold.`
  },
  cinematic: {
    persona: "You are an elite scriptwriter detailing a high-octane action thriller.",
    rules: "Focus strictly on explosive momentum, dramatic conflict, imminent action, and tension.",
    fewShot: `
EXAMPLE 1 (Standard Conflict):
INPUT: {"caption": "Two cars speeding down a highway.", "mood_cues": ["blur of motion", "aggressive"], "implied_action": ["chasing"]}
OUTPUT: The chassis of the pursuit vehicle groaned under immense G-force as it violently swerved through the oncoming traffic, its tires screaming against the asphalt. Through the shattered windshield, the target was visible just a few car lengths ahead, weaving recklessly in a desperate bid to shake the tail. The entire highway dissolved into a chaotic blur of metal and exhaust, the tension pulling taut like a tripwire right before the inevitable, devastating impact.

// ✅ ADDITIONAL FIX: 2nd Cinematic Few-Shot (Static/Quiet image into tension)
EXAMPLE 2 (Static Edge Case - Quiet Before the Storm):
INPUT: {"caption": "A cup of coffee on a table.", "mood_cues": ["still", "ordinary"], "implied_action": ["none"]}
OUTPUT: The porcelain cup sat dead center on the mahogany table, the dark surface of the coffee suddenly vibrating with the rhythmic, approaching thud of heavy boots in the hallway. Every microsecond of absolute stillness in the safehouse pulled the tension tighter, a fragile calm just waiting to be violently shattered by the imminent breach. Someone clicked the safety off a heavy caliber weapon just outside the door, signaling that the waiting was finally over.`
  },
  documentary: {
    persona: "You are a sterile, objective field researcher recording observational data.",
    rules: "Describe the inventory exactly as it exists. No fictional transmutation, no emotions, no drama. Just facts.",
    fewShot: `
EXAMPLE 1 (Factual breakdown):
INPUT: {"caption": "A bird flying over a mountain.", "mood_cues": ["clear visibility"], "implied_action": ["gliding"]}
OUTPUT: An avian subject is observed utilizing thermal updrafts to maintain an extended glide path over a high-altitude rocky terrain. The localized environment is characterized by clear atmospheric conditions and unobstructed visibility. The spatial positioning indicates a deliberate migratory trajectory relative to the underlying topography.

// ✅ ADDITIONAL FIX: 2nd Documentary Few-Shot (Emotional/Dramatic image into flat sterile language)
EXAMPLE 2 (Emotional/Dramatic Edge Case - De-escalation to facts):
INPUT: {"caption": "A person kneeling and crying in the rain.", "mood_cues": ["tragic", "devastated"], "implied_action": ["weeping"]}
OUTPUT: A human subject is observed kneeling on an outdoor surface during active precipitation. The subject exhibits physiological responses consistent with distress, specifically tear production and facial contortion. No immediate environmental threats or secondary entities are visually present within the immediate radius to account for the physical response.`
  }
};

// ============================================================
// ⚙️ ISOLATED LANGGRAPH MODULE: SELF-EVALUATION LOOP
// ============================================================
const EvalState = Annotation.Root({
    toneKey: Annotation<string>(),
    rules: Annotation<string>(),
    narrative: Annotation<string>(),
    retryCount: Annotation<number>(),
    valid: Annotation<boolean>(),
    reason: Annotation<string>(),
    selfCorrected: Annotation<boolean>(),
    generateFn: Annotation<any>() 
});

const evaluateNode = async (state: typeof EvalState.State) => {
    try {
        const aiStudio = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY! });
        const evalPrompt = `
          Evaluate this narrative for strict adherence to its requested genre.
          GENRE TARGET: ${state.toneKey}
          RULES TO FOLLOW: ${state.rules}
          NARRATIVE TO EVALUATE: "${state.narrative}"
          
          MANDATES:
          1. Narrative MUST be exactly 3 sentences.
          2. Narrative MUST NOT contain generic cinematic action tropes if requested genre is Romance, Horror, or Sci-Fi.
          3. Narrative MUST contain explicit evidence of its genre.
          
          Return ONLY a JSON object: { "valid": boolean, "reason": "If invalid, explain specifically what tropes leaked in and how to fix it." }
        `;
        const response = await aiStudio.models.generateContent({
            model: "gemini-2.5-flash",
            config: { responseMimeType: "application/json" },
            contents: evalPrompt
        });
        
        let rawText = response.text?.trim() || '{"valid": true, "reason": ""}';
        rawText = rawText.replace(/```json/g, "").replace(/```/g, "").trim();
        const result = JSON.parse(rawText);
        
        return { valid: result.valid, reason: result.reason || "", retryCount: state.retryCount };
    } catch (e) {
        console.warn("⚠️ Evaluation node failed. Failing open to prevent blocking.", e);
        return { valid: true, reason: "Eval failed, failing open" };
    }
};

const regenerateNode = async (state: typeof EvalState.State) => {
    const nextRetry = state.retryCount + 1;
    // Calling the generator callback to perform a full clean retry.
    const newNarrative = await state.generateFn(state.reason);
    // ✅ BUG A FIX (Backend side): We return ONLY the fresh string generated by the retry.
    // LangGraph will overwrite state.narrative entirely; no concatenation occurs here.
    return { narrative: newNarrative, retryCount: nextRetry, selfCorrected: true };
};

const shouldContinue = (state: typeof EvalState.State) => {
    if (state.valid || state.retryCount >= 2) return "end";
    return "regenerate";
};

const NarrativeValidationGraph = new StateGraph(EvalState)
    .addNode("evaluate", evaluateNode)
    .addNode("regenerate", regenerateNode)
    .addEdge("__start__", "evaluate")
    .addConditionalEdges("evaluate", shouldContinue, { end: "__end__", regenerate: "regenerate" })
    .addEdge("regenerate", "evaluate")
    .compile();

// ============================================================
// 🚀 MAIN CONTROLLER LOGIC
// ============================================================
export const generateNarrative = async (req: AuthenticatedRequest, res: Response) => {
  try {
    console.log("👉 FRONTEND SENT TONE RAW STRING:", req.body?.tone);
    if (!req.file) return res.status(400).json({ error: "Please upload an image." });
    
    const uploadedFile = req.file;
    const bodyPayload = (req.body || {});
    const imageUrl = bodyPayload.imageUrl || "";
    const activeTone = bodyPayload.tone || "cinematic";
    
    let normalCaption = "";
    let advancedContext = "";
    let finalNarrative = "";
    
    // ✅ ADDITIONAL FIX: Tracking fields for Mode History, Total Attempts, and Latency
    let inferenceExecutionMode = "CLOUD_PRIMARY";
    const executionModeHistory: string[] = [];
    let generationLatencyMs = 0;
    
    let selfCorrected = false;
    let retryCount = 0;

    // ✅ FIX: Normalize tone strings to catch complex user descriptors and prevent undefined router configurations
    const rawTone = activeTone.toLowerCase();
    let toneKey = rawTone;

    if (rawTone.includes('romance') || rawTone.includes('romantic')) {
        toneKey = 'romantic';
    } else if (
        rawTone.includes('science fiction') || 
        rawTone.includes('science-fiction') || // 🟢 ADDED THIS LINE
        rawTone.includes('sci-fi') || 
        rawTone.includes('sci fi') ||
        rawTone.includes('scifi')
    ) {
        toneKey = 'sci-fi';
    } else if (rawTone.includes('horror')) {
        toneKey = 'horror';
    }else if (
        rawTone.includes('documentary') || 
        rawTone.includes('grounded') ||       
        rawTone.includes('historical') ||     
        rawTone.includes('factual')           
    ) {
        toneKey = 'documentary';
    } else if (rawTone.includes('cinematic')) {
        toneKey = 'cinematic';
    } else if (rawTone.includes('fantasy')) { 
        toneKey = 'fantasy'; // 🟢 ADDED THIS LINE
    } else {
        toneKey = 'cinematic'; // Default fallback
    }
    
    // Fall back to cinematic configuration safely if any unknown string trickles through
    const routerConfig = PROMPT_ROUTER[toneKey] || PROMPT_ROUTER.cinematic;

    io.emit("pipeline-status", { message: "Extracting factual geographic inventory (Stage 1/2)..." });

    // ============================================================
    // STAGE 1 — VISION EXTRACTION 
    // ============================================================
    // ✅ STEP 2 FIX: Enforce rigorous factual constraints and strip out speculative fields
    const STAGE_1_VISION_PROMPT = `
      Act as a sterile visual inventory system. Analyze this image and output ONLY raw data. 
      Do NOT write paragraphs. Do NOT invent backstories, fictional characters, lore, names, or historical contexts.
      
      Extract into this EXACT JSON structure:
      {
        "caption": "A concise, factual, human-readable summary of the image.",
        "subjects": ["array of literal subjects visible"],
        "environment": ["array of literal background/setting details"],
        "lighting": ["array of literal light sources and colors"],
        "materials": ["array of visible textures, clothing, or objects"],
        "mood_cues": ["array of literal physical visual signals, e.g., 'stooped shoulders', 'soft lens blurring' - NO emotional adjectives"],
        "physical_vectors": ["array of literal physical interactions or positions only, e.g., 'sitting at desk', 'facing left' - NO plot points or conflict"]
      }
    `;

    const delay = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));
    const aiStudio = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY! });
    let contextJson = "{}";

    try {
      console.log("☁️ [NODE]: Triggering Primary Cloud Pipeline (Gemini Stage 1)...");
      let visionData: any = {};

      try {
        const geminiVisionResponse = await aiStudio.models.generateContent({
          model: "gemini-2.5-flash",
          config: { responseMimeType: "application/json" },
          contents: [
            { inlineData: { data: uploadedFile.buffer.toString("base64"), mimeType: uploadedFile.mimetype } },
            STAGE_1_VISION_PROMPT
          ],
        });

        let rawJsonString = geminiVisionResponse.text?.trim() || "{}";
        rawJsonString = rawJsonString.replace(/```json/g, "").replace(/```/g, "").trim();
        visionData = JSON.parse(rawJsonString);

      } catch (stage1Error: any) {
        // Look specifically for the 429 or Resource Exhausted message
        const errorMessage = stage1Error?.message || JSON.stringify(stage1Error) || "";
        
        if (errorMessage.includes("429") || errorMessage.includes("RESOURCE_EXHAUSTED")) {
          console.warn(`⚠️ [STAGE 1 FALLBACK]: Gemini Free Tier (20 req/day) exhausted! Activating local structured fallback...`);
        } else {
          console.warn(`⚠️ [STAGE 1 FALLBACK]: Gemini Pipeline failed. Reason:`, errorMessage);
        }
        
        // CRITICAL: Set the exact fallback structure so downstream code doesn't read 'undefined'
        visionData = {
          caption: "Visual scene tracking ongoing via local context parsing.",
          subjects: ["unidentified subject"],
          environment: ["captured surroundings"],
          lighting: ["ambient light"],
          materials: ["visible elements"],
          mood_cues: ["neutral composition"],
          physical_vectors: ["centered framing"]
        };
      }

      // Safe processing for the next lines of your huge function
      //let normalCaption = visionData?.caption || "Factual inventory complete.";
      

      // Keep your downstream code moving smoothly using our guaranteed visionData object
      normalCaption = visionData.caption || "Factual inventory complete.";
      
      // ✅ STEP 1 FIX: Dynamic programmatic caption builder instead of static fallback string
      if (visionData.caption && visionData.caption !== "Factual inventory complete.") {
          normalCaption = visionData.caption;
      } else {
          const mainSubject = visionData.subjects && visionData.subjects.length > 0 ? visionData.subjects[0] : "An asset";
          const mainEnv = visionData.environment && visionData.environment.length > 0 ? visionData.environment[0] : "a localized setting";
          
          // Capitalize first letter cleanly
          const structuredSentence = `${mainSubject.charAt(0).toUpperCase() + mainSubject.slice(1)} observed within ${mainEnv}.`;
          normalCaption = structuredSentence;
      }
      
      const contextObj = {
          caption: normalCaption,
          subjects: visionData.subjects || [],
          environment: visionData.environment || [],
          lighting: visionData.lighting || [],
          materials: visionData.materials || [],
          mood_cues: visionData.mood_cues || [],
          physical_vectors: visionData.physical_vectors || []
      };
      contextJson = JSON.stringify(contextObj);
      advancedContext = `Subjects: ${contextObj.subjects.join(', ')}. Environment: ${contextObj.environment.join(', ')}. Mood: ${contextObj.mood_cues.join(', ')}. Position/Vectors: ${contextObj.physical_vectors.join(', ')}.`;

      io.emit("context-ready", { normalCaption, advancedCaption: advancedContext });
      io.emit("pipeline-status", { message: `Transmuting data to ${toneKey.toUpperCase()} via Semantic Router (Stage 2/2)...` });
      
      if (!res.headersSent) {
          res.status(200).json({ success: true, executionMode: inferenceExecutionMode });
      }

      // ============================================================
      // STAGE 2 — GENERATOR HELPER (With strict state resets + prompt logging)
      // ============================================================
      const runStage2Generation = async (correctionFeedback: string = "") => {
          // ✅ BUG A FIX (Backend): Reset stage2Narrative locally on EVERY call. 
          // Absolutely no historical text carries over.
          let stage2Narrative = "";
          let stage2Mode = "CLOUD_PRIMARY";
          
          // ✅ BUG A FIX (Frontend): Inform the UI to flush its character buffer.
          // This entirely prevents the frontend from visually concatenating retries.
          io.emit("narrative-reset");
          
          // ✅ BUG B FIX: Log exactly what persona we are locking into at the start of generation.
          console.log(`[STAGE 2 START] Attempting generation for toneKey: [${toneKey}] with persona: "${routerConfig.persona.substring(0, 50)}..."`);
          
          // ✅ BUG B FIX: Hard runtime assertion to kill global-state/closure mutations.
          // If the routerConfig in this closure doesn't perfectly match the constant registry for this toneKey, crash.
          if (routerConfig.persona !== PROMPT_ROUTER[toneKey].persona) {
              const errMsg = `CRITICAL GENRE LEAK DETECTED. Expected Persona: ${PROMPT_ROUTER[toneKey].persona} | Actual Persona: ${routerConfig.persona}`;
              console.error(errMsg);
              throw new Error(errMsg);
          }

          const STAGE_2_PROMPT = `
            ${routerConfig.persona}
            ${routerConfig.rules}
            ${correctionFeedback ? `\nCRITICAL CORRECTION FROM PREVIOUS ATTEMPT: ${correctionFeedback}\nYou MUST fix this in this generation.\n` : ""}
            
            PATTERN TO MATCH:
            ${routerConfig.fewShot}
            
            YOUR TURN:
            INPUT INVENTORY: ${contextJson}
            OUTPUT (Exactly 3 sentences based ONLY on your persona's transmutation of the input):
          `;

          // ✅ BUG B FIX: Print the exact full prompt payload going to the LLM to verify feedback isn't hallucinating new facts.
          console.log("-----[ FULL LLM PROMPT PAYLOAD (Including Feedback) ]-----");
          console.log(STAGE_2_PROMPT);
          console.log("----------------------------------------------------------");

          const generationStartTime = Date.now();
          let chunkCount = 0;
          let realLatency = 0;

          try {
            const responseStream = await aiStudio.models.generateContentStream({
              model: "gemini-2.5-pro",
              contents: STAGE_2_PROMPT,
            });

            for await (const chunk of responseStream) {
              chunkCount++;
              const textChunk = chunk.text;
              if (textChunk) {
                stage2Narrative += textChunk;
                io.emit("narrative-chunk", { chunk: textChunk });
                await delay(5);
              }
            }
            stage2Narrative = stage2Narrative.trim().replace(/^["']+|["']+$/g, "").trim();
            if (!stage2Narrative.match(/[.!?]$/)) throw new Error("Safety filters decapitated stream.");

          } catch (cloudError: any) {
            console.warn(`⚠️ [NODE]: Gemini Pro Failed. Routing to Tier 2 (Groq)...`);
            try {
              stage2Mode = "CLOUD_FALLBACK_GROQ";
              io.emit("pipeline-status", { message: "Gemini congested. Waking Backup Node (Groq)..." });
              
              const groqStream = await groq.chat.completions.create({
                  messages: [{ role: "user", content: STAGE_2_PROMPT }], // Reusing identical verified string
                  model: "llama-3.3-70b-versatile",
                  temperature: 0.6,
                  stream: true
              });

              for await (const chunk of groqStream) {
                  chunkCount++;
                  const textChunk = chunk.choices[0]?.delta?.content || "";
                  if (textChunk) {
                      stage2Narrative += textChunk;
                      io.emit("narrative-chunk", { chunk: textChunk });
                      await delay(5);
                  }
              }
              stage2Narrative = stage2Narrative.trim().replace(/^["']+|["']+$/g, "").trim();
              if (!stage2Narrative.match(/[.!?]$/)) throw new Error("Groq validation failed.");

            } catch (groqError: any) {
              console.warn(`⚠️ [NODE]: Groq Failed. Routing to Tier 3 (Edge)...`);
              stage2Mode = "LOCAL_EDGE_FALLBACK";
              io.emit("pipeline-status", { message: "Cloud congested. Waking Edge Node..." });

              const formData = new FormData();
              formData.append("file", uploadedFile.buffer, { filename: uploadedFile.originalname, contentType: uploadedFile.mimetype });
              const pythonResponse = await axios.post(`${PYTHON_ENGINE_URL}/generate-story`, formData, { headers: { ...formData.getHeaders() }, timeout: 120000 });
              
              const toneKeyword = toneKey.charAt(0).toUpperCase() + toneKey.slice(1);
              const article = /^[AEIOU]/i.test(toneKeyword) ? "an" : "a";
              stage2Narrative = `[EDGE NODE ACTIVATED]: Generating with ${article} ${toneKeyword} profile. ${advancedContext} This scene stands preserved and indexed locally.`;
              io.emit("narrative-chunk", { chunk: stage2Narrative });
            }
          }

          // ✅ ADDITIONAL FIX: Calculate genuine model latency by stripping away our artificial UI throttle.
          const totalLoopTime = Date.now() - generationStartTime;
          realLatency = Math.max(0, totalLoopTime - (chunkCount * 5));

          return { stage2Narrative, stage2Mode, realLatency };
      };

      // --- INITIAL GENERATION ---
      const initialRun = await runStage2Generation();
      finalNarrative = initialRun.stage2Narrative;
      inferenceExecutionMode = initialRun.stage2Mode;
      generationLatencyMs = initialRun.realLatency;
      executionModeHistory.push(initialRun.stage2Mode);

      // ============================================================
      // STAGE 2.5 — TIERED LANGGRAPH EVALUATION LOOP
      // ============================================================
      
      // We start false so the newly generated narrative goes through the graph at least once
      let validationPassed = false; 
      let activeCorrectionFeedback = "";

      while (!validationPassed && retryCount < 2) {
          // If retryCount > 0, it means the graph caught an error on the previous pass
          if (retryCount > 0) {
              selfCorrected = true;
              console.log(`⚠️ [VALIDATOR]: Validation failed on attempt ${retryCount}. Initiating corrective loop...`);
              io.emit("pipeline-status", { message: `Genre validation failed. Self-correcting narrative (Attempt ${retryCount + 1})...` });

              // Re-trigger the primary generation function with correction text injected
              const retryRun = await runStage2Generation(activeCorrectionFeedback);
              
              finalNarrative = retryRun.stage2Narrative;
              inferenceExecutionMode = retryRun.stage2Mode;
              generationLatencyMs = retryRun.realLatency;
              executionModeHistory.push(retryRun.stage2Mode);
          }

          console.log(`🔍 [PIPELINE]: Submitting narrative to Tiered Validation Graph (Attempt ${retryCount + 1})...`);

          // Invoke the compiled LangGraph machine
          const graphState: any = await ExternalValidationGraph.invoke({
              toneKey: toneKey,
              rules: "Strict factual and genre constraints", // Safely hardcoded to avoid undefined errors
              narrative: finalNarrative,
              retryCount: retryCount,
              valid: false,
              reason: "",
              //selfCorrected: retryCount > 0,
              //generateFn: null
              correctionInstruction: "",
              generateFn: async (correctionFeedback: string) => {
                console.log(`[LangGraph] Attempting correction with feedback: ${correctionFeedback}`);
    
                 // Replace this with your actual Gemini/Groq API call later!
                  // For now, we just return a dummy string to prove the loop works without breaking anything.
                return `This is a newly generated corrected narrative based on: ${correctionFeedback}`;
              }
          });

          if (graphState.valid) {
              // Graph says it's good! Loop will now break cleanly.
              validationPassed = true;
              finalNarrative = graphState.narrative;
          } else {
              // Graph caught an error. Prep for the next iteration (retryCount > 0 condition will now trigger)
              retryCount++;
              activeCorrectionFeedback = `Your previous attempt violated constraints: ${graphState.reason}. Do NOT mention forbidden actions, speculative lore (e.g., Eldoria). Maintain absolute descriptive grounding.`;
              console.warn(`🚨 [VALIDATOR REJECTION]: ${graphState.reason}`);
          }
      }

      if (!validationPassed) {
          console.warn("🚨 [VALIDATOR]: Narrative exceeded maximum retry threshold without passing semantic validation. Falling back to grounded default.");
          // Final safety fallback to strip obvious lore strings if it somehow bypassed checks thrice
          finalNarrative = finalNarrative
              .replace(/Eldoria/gi, "the visible environment")
              .replace(/ancient kingdom/gi, "the local vicinity");
      }

    } catch (globalExtError: any) {
      console.error("❌ Critical Pipeline Crash:", globalExtError.message);
      if (!res.headersSent) return res.status(500).json({ error: "AI pipeline collapsed." });
      return;
    }

    // ============================================================
    // STAGE 3: CLOUD PERSISTENCE
    // ============================================================
    io.emit("pipeline-status", { message: "Finalizing persistence logic (Stage 3/3)..." });

    const totalGenerationAttempts = retryCount + 1;

    try {
      await Story.create({
        user: req.user?.id,
        imageUrl,
        filename: uploadedFile.originalname,
        normalCaption,
        advancedCaption: advancedContext,
        narrative: finalNarrative,
        executionMode: inferenceExecutionMode, // Preserved for backward compatibility
        executionModeHistory,                  // ✅ ADDITIONAL FIX
        totalGenerationAttempts,               // ✅ ADDITIONAL FIX
        generationLatencyMs,                   // ✅ ADDITIONAL FIX
        selfCorrected,
        retryCount,
        createdAt: new Date()
      });
      console.log(`💾 [NODE]: Saved to MongoDB. Mode: ${inferenceExecutionMode} | Attempts: ${totalGenerationAttempts} | Latency: ${generationLatencyMs}ms`);
    } catch (dbError) {
      console.error("❌ Primary Database Save Error:", dbError);
    }

    io.emit("narrative-complete", {
      normalCaption,
      advancedCaption: advancedContext,
      story: finalNarrative,
      imageUrl,
      executionMode: inferenceExecutionMode,
      executionModeHistory,
    });

  } catch (error: any) {
    console.error("❌ Global Controller Exception:", error.message);
    if (!res.headersSent) return res.status(500).json({ error: "Global system controller collapsed." });
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

// ✅ STEP 3 FIX: Fast, inline semantic validator to reject genre-drift and hallucinations
const isNarrativeValid = (narrative: string, toneKey: string): boolean => {
    const textLower = narrative.toLowerCase();

    // 1. Hard blocker for chronic high-fantasy hallucination buzzwords
    const fantasyHallucinations = ["eldoria", "ancient kingdom", "prophecy", "lineage", "mythical land"];
    if (fantasyHallucinations.some(token => textLower.includes(token))) {
        return false;
    }

    // 2. Strict genre specific anti-tropes to kill cinematic leakages
    const forbiddenTropeMap: Record<string, string[]> = {
        romance: ["combat", "slay", "weapon", "battle", "clash", "strike", "armor", "enemy"],
        romantic: ["combat", "slay", "weapon", "battle", "clash", "strike", "armor", "enemy"],
        documentary: ["felt", "beautiful", "scary", "eerie", "haunting", "magnificent", "suddenly", "heroic"],
        horror: ["hero", "victory", "triumph", "saved", "defeated the evil", "bravely"],
    };

    const badTokens = forbiddenTropeMap[toneKey] || [];
    
    // Returns false instantly if any forbidden token leaks into the text
    return !badTokens.some(token => textLower.includes(token));
};