# 🎬 CinemInd AI

![Version](https://img.shields.io/badge/version-1.0.0-blue.svg)
![License](https://img.shields.io/badge/license-MIT-green.svg)
![Architecture](https://img.shields.io/badge/architecture-Agentic_Graph-orange.svg)
![Stack](https://img.shields.io/badge/stack-MERN_+_AI-blueviolet.svg)

**CinemInd AI** is a multi-stage vision-language pipeline that transforms raw images into genre-specific, immersive narratives. It combines structured visual extraction, semantic persona routing, agentic self-correction via LangGraph, and a three-tier model fallback network to produce consistently high-fidelity storytelling across six distinct tonal genres.

🔗 **Live Demo:** [cinemind-ashy.vercel.app](https://cinemind-ashy.vercel.app)

---

## 📸 What It Does

Upload any image. Select a tone. CinemInd extracts a factual visual inventory (subjects, environment, lighting, mood cues) from the image, routes it through a genre-specific persona prompt, generates a 3-sentence immersive narrative, validates it for genre fidelity, and self-corrects if the output drifts — all streamed live to the UI.

---

## ✨ Core Features

### 🧠 Two-Stage AI Pipeline
- **Stage 1 — Vision Extraction:** `gemini-2.5-flash` parses the image into a strict JSON schema (`caption`, `subjects`, `environment`, `lighting`, `materials`, `mood_cues`, `physical_vectors`) — no fictional interpretation, only literal observational data.
- **Stage 2 — Narrative Transmutation:** `gemini-2.5-pro` receives the factual inventory and transforms it through a genre-specific persona prompt with few-shot examples, producing exactly 3 narrative sentences.

### 🎭 Six-Genre Semantic Persona Router
Each genre is an isolated prompt config (persona + rules + 2 few-shot examples) selected by a tone normalization layer that handles natural language input:

| Genre | Persona | Edge Case Handled |
|---|---|---|
| 🐉 Fantasy | Mythic high-fantasy author | Quiet/non-combat images |
| 🤖 Sci-Fi | Hard sci-fi speculative author | Atmospheric/empty environments |
| ❤️ Romantic | Literary intimacy author | Subverts action into emotional anchor |
| 🔪 Horror | Psychological terror specialist | Zero violence — pure dread |
| 🎬 Cinematic | Action thriller scriptwriter | Static images rendered as tension |
| 📽️ Documentary | Sterile field researcher | Emotional images de-escalated to facts |

### 🛡️ Agentic Self-Correcting Validation (LangGraph)
A two-tier validation graph runs after every generation before persistence:

- **Tier 1 — Keyword Pre-filter:** Instantly rejects outputs containing genre-violating vocabulary (e.g., "triumph" in horror, "combat" in romance, "Eldoria" in any non-fantasy genre). Zero API cost, deterministic.
- **Tier 2 — Semantic Genre Judge:** `gemini-2.5-flash` evaluates the narrative against the genre's persona rules and returns a structured `{valid, reason}` judgment. Only runs if Tier 1 passes.
- **Corrective Loop:** If validation fails, a `regenerate` node calls back into Stage 2 with targeted correction feedback injected into the prompt. Maximum 2 retry attempts with a hard ceiling.
- **Fail-Open Design:** If the validation LLM call errors (429, network failure), the pipeline auto-passes and continues — validation never blocks delivery.

### 🌐 Three-Tier Model Fallback Network
Every stage has an independent fallback chain:

```
Stage 1:  Gemini 2.5 Flash → Groq Llama 4 Scout (Vision) → Local Moondream2*
Stage 2:  Gemini 2.5 Pro   → Groq llama-3.3-70b-versatile → Local Moondream2*
```
*Moondream2 is a local GPU-backed fallback (RTX 3050), not active in the cloud deployment by design — serverless environments cannot run local inference.

### 📡 Real-Time Streaming
- Narrative chunks stream token-by-token to the client via Socket.IO as they are generated.
- A `narrative-reset` event is emitted before every generation attempt (initial + retries) to prevent frontend buffer concatenation across retry loops.
- Live pipeline status events keep the UI informed at every stage (`pipeline-status`, `context-ready`, `narrative-chunk`, `narrative-complete`).

### 📊 Execution Observability
Every generation is persisted to MongoDB with:
- `executionMode` — which tier handled the final accepted output
- `executionModeHistory` — full ordered log of every tier used across initial + retry attempts
- `totalGenerationAttempts` — how many Stage 2 calls were made for this request
- `generationLatencyMs` — real model generation latency, isolated from artificial UI streaming delay
- `selfCorrected` + `retryCount` — whether the agentic loop triggered and how many times

---

## 🛠️ Tech Stack

**Frontend**
- React.js + TypeScript
- Tailwind CSS
- Socket.IO Client

**Backend**
- Node.js + Express.js (TypeScript)
- MongoDB + Mongoose
- Socket.IO
- Multer (in-memory buffer processing — no disk I/O)
- JWT Authentication

**AI / ML**
- Google Gemini API (`gemini-2.5-flash` for extraction + validation, `gemini-2.5-pro` for generation)
- Groq API (`llama-4-scout-17b` for vision fallback, `llama-3.3-70b-versatile` for generation fallback)
- LangGraph (`@langchain/langgraph`) for agentic validation orchestration
- FastAPI (Python microservice for local Moondream2 inference)
- Moondream2 (local edge fallback, GPU-backed)

**Infrastructure**
- Frontend: Vercel
- Backend: Render
- Database: MongoDB Atlas

---

## 🧠 Pipeline Architecture

```
Client Upload
     │
     ▼
┌─────────────────────────────────────┐
│  STAGE 1: Vision Extraction         │
│  Gemini Flash → Groq → Moondream2   │
│  Output: Strict JSON inventory      │
└────────────────┬────────────────────┘
                 │
                 ▼
┌─────────────────────────────────────┐
│  Tone Normalization + Router        │
│  Maps user string → genre config    │
│  Selects: persona + rules + fewshot │
└────────────────┬────────────────────┘
                 │
                 ▼
┌─────────────────────────────────────┐
│  STAGE 2: Narrative Transmutation   │
│  Gemini Pro → Groq → Moondream2     │
│  Output: 3-sentence narrative       │
└────────────────┬────────────────────┘
                 │
                 ▼
┌─────────────────────────────────────┐
│  LANGGRAPH VALIDATION GRAPH         │
│  [grounding] → [genre] → router     │
│       ↑              │              │
│       └─[regenerate]─┘ (max 2x)    │
│  Output: validated final narrative  │
└────────────────┬────────────────────┘
                 │
                 ▼
        Stream → Client
        Persist → MongoDB
```

---

## 🚀 Getting Started

### Prerequisites
- Node.js v18+
- Python 3.9+ (for local Moondream2 only)
- MongoDB URI (Atlas or local)
- API keys: Google Gemini, Groq

### Installation

```bash
# Clone the repository
git clone https://github.com/yourusername/cinemind-ai.git
cd cinemind-ai
```

```bash
# Install backend dependencies
cd server
npm install
```

```bash
# Install frontend dependencies
cd ../client
npm install
```

### Environment Setup

Create a `.env` file in `/server`:

```env
PORT=5000
MONGODB_URI=your_mongodb_connection_string
GEMINI_API_KEY=your_gemini_api_key
GROQ_API_KEY=your_groq_api_key
JWT_SECRET=your_jwt_secret
PYTHON_ENGINE_URL=http://127.0.0.1:8000  # Only needed for local Moondream2
```

### Run

```bash
# Backend (from /server)
npm run dev

# Frontend (from /client)
npm run dev
```

---

## 🐛 Known Limitations

- Moondream2 (Tier 3) is intentionally local-only — it requires a GPU and cannot run in serverless cloud environments. The deployed version operates on Gemini → Groq two-tier fallback.
- LangGraph semantic validation (Tier 2) auto-passes on Gemini 429 quota exhaustion to prevent pipeline blocking — in quota-limited environments, only the keyword pre-filter runs.

---

## 📄 License

MIT License — see [LICENSE](LICENSE) for details.