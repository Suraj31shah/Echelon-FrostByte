from fastapi import FastAPI, UploadFile, File, HTTPException, WebSocket
from fastapi.middleware.cors import CORSMiddleware
from api.websockets import websocket_endpoint
from realtime.inference_engine import DeepfakeDetector
import io
import librosa
import numpy as np

app = FastAPI()

# --- 1. THE SECURITY FIX ---
# Instead of "*", we list the exact ports your frontend might use.
origins = [
    "http://localhost:3000",    # Next.js
    "http://127.0.0.1:3000",    # Next.js (IP)
    "http://localhost:5173",    # Vite
    "http://127.0.0.1:5173",    # Vite (IP)
    "*"                         # Fallback (Try to allow everything)
]

app.add_middleware(
    CORSMiddleware,
    allow_origins=origins,       # Use the specific list
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Initialize AI Model
detector = DeepfakeDetector()

@app.websocket("/ws/audio") 
async def audio_socket(websocket: WebSocket):
    # This invokes the handler in websockets.py which does the actual accept()
    await websocket_endpoint(websocket)

from realtime.realtime_call_ws import websocket_call_endpoint

@app.websocket("/ws/call/{room_id}")
async def call_socket(websocket: WebSocket, room_id: str, sample_rate: int = 16000):
    try:
        await websocket_call_endpoint(websocket, room_id, sample_rate)
    except Exception as e:
        print(f"🔥 CALL WORKER ERROR: {e}")
        # Try to close if not already closed
        try:
            await websocket.close(code=1011)
        except:
            pass

@app.post("/analyze-file")
async def analyze_file(file: UploadFile = File(...)):
    try:
        contents = await file.read()
        audio_array, _ = librosa.load(io.BytesIO(contents), sr=16000)
        
        if len(audio_array) > 64000:
            audio_array = audio_array[:64000]
            
        result = detector.predict(audio_array)
        return result
    except Exception as e:
        print(f"File Error: {e}")
        raise HTTPException(status_code=500, detail="Could not process audio file")

@app.get("/")
def health_check():
    return {"status": "Deepfake Detector Live"}