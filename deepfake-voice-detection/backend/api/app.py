from fastapi import FastAPI, UploadFile, File, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from api.websockets import websocket_endpoint
from realtime.inference_engine import DeepfakeDetector
import io
import librosa
import numpy as np

app = FastAPI()

# Initialize AI Model (Loads weights once on startup)
detector = DeepfakeDetector()

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

@app.websocket("/ws/audio") 
async def audio_socket(websocket):
    await websocket_endpoint(websocket)

@app.post("/analyze-file")
async def analyze_file(file: UploadFile = File(...)):
    """
    Endpoint to upload .wav/.mp3 files directly for analysis
    """
    try:
        # 1. Read bytes
        contents = await file.read()
        
        # 2. Convert bytes -> Audio Array (using librosa)
        # We wrap bytes in io.BytesIO so librosa treats it like a file
        audio_array, _ = librosa.load(io.BytesIO(contents), sr=16000)
        
        # 3. Predict
        # We take the first 4 seconds (or pad if shorter) to match model expectations
        if len(audio_array) > 64000: # 4s * 16000
            audio_array = audio_array[:64000]
            
        result = detector.predict(audio_array)
        
        return result

    except Exception as e:
        print(f"File Error: {e}")
        raise HTTPException(status_code=500, detail="Could not process audio file")

@app.get("/")
def health_check():
    return {"status": "Deepfake Detector Live"}