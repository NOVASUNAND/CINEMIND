from fastapi import FastAPI, File, UploadFile, HTTPException
from fastapi.middleware.cors import CORSMiddleware
import torch
from PIL import Image, UnidentifiedImageError
import io
from transformers import AutoModelForCausalLM, AutoTokenizer

# ---------------------------------------------------------
# FastAPI App Init
# ---------------------------------------------------------
app = FastAPI(title="Moondream2 Visual Reasoning Engine")

# Enable CORS for frontend (React / Next / etc.)
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],   # tighten later in production
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# ---------------------------------------------------------
# 1. Hardware Check & Model Loading
# ---------------------------------------------------------
device = "cuda" if torch.cuda.is_available() else "cpu"
model_id = "vikhyatk/moondream2"
revision = "2024-05-20"

print(f"🚀 Booting Moondream2 Visual Reasoning Engine on {device.upper()}...")

# Load model (optimized for RTX 3050)
model = AutoModelForCausalLM.from_pretrained(
    model_id,
    trust_remote_code=True,
    revision=revision,
    torch_dtype=torch.float16 if device == "cuda" else torch.float32
).to(device)

tokenizer = AutoTokenizer.from_pretrained(
    model_id,
    revision=revision
)

model.eval()
print("✅ Moondream2 loaded successfully.")


# ---------------------------------------------------------
# Health Check Route
# ---------------------------------------------------------
@app.get("/")
async def root():
    return {
        "status": "ok",
        "message": "Moondream2 FastAPI Engine Running"
    }


# ---------------------------------------------------------
# Main Inference Route
# ---------------------------------------------------------
@app.post("/generate-story")
async def generate_story(file: UploadFile = File(...)):
    try:
        # ---------------------------------------------------------
        # STEP 1: Validate File
        # ---------------------------------------------------------
        if not file.content_type or not file.content_type.startswith("image/"):
            raise HTTPException(status_code=400, detail="Uploaded file must be an image.")

        contents = await file.read()

        if not contents:
            raise HTTPException(status_code=400, detail="Empty file uploaded.")

        try:
            image = Image.open(io.BytesIO(contents)).convert("RGB")
        except UnidentifiedImageError:
            raise HTTPException(status_code=400, detail="Invalid image file.")

        print("\n⚙️ [PIPELINE]: Image received. Encoding for visual reasoning...")

        with torch.inference_mode():
            # ---------------------------------------------------------
            # STEP 2: Encode Image Once
            # ---------------------------------------------------------
            image_embeds = model.encode_image(image)

            # ---------------------------------------------------------
            # STAGE 1: STANDARD CAPTION (Literal Perception)
            # ---------------------------------------------------------
            standard_caption = model.answer_question(
                image_embeds,
                "Describe this image in one short sentence.",
                tokenizer
            ).strip()

            print(f"✅ [STAGE 1 - Literal]: {standard_caption}")

            # ---------------------------------------------------------
            # STAGE 2: ADVANCED CONTEXT (Semantic Visual Reasoning)
            # ---------------------------------------------------------
            advanced_query = (
             "Describe the environment, lighting, scene composition, and overall mood of this image "
             "in 2 clear factual sentences. Focus on contextual scene details, not object repetition."
            )

            advanced_caption = model.answer_question(
                image_embeds,
                advanced_query,
                tokenizer
            ).strip()

            print(f"🔬 [STAGE 2 - Analytical]: {advanced_caption}")

        # ---------------------------------------------------------
        # RESPONSE
        # ---------------------------------------------------------
        return {
            "normal": standard_caption,
            "advanced": advanced_caption
        }

    except HTTPException as http_err:
        raise http_err

    except Exception as e:
        print(f"❌ Python Pipeline Error: {e}")
        raise HTTPException(status_code=500, detail=str(e))


# ---------------------------------------------------------
# Run Server
# ---------------------------------------------------------
if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8000)