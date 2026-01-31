from fastapi import FastAPI, WebSocket, UploadFile, File
from fastapi.middleware.cors import CORSMiddleware
from api.websockets import websocket_endpoint
from api.schemas import FileAnalysisResponse, CallStartRequest, CallStatusResponse
import random
import uuid
import time

app = FastAPI()

# Allow Next.js to connect
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"], 
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

@app.websocket("/ws/audio") 
async def audio_socket(websocket: WebSocket):
    await websocket_endpoint(websocket)

@app.post("/api/analyze-file", response_model=FileAnalysisResponse)
async def analyze_file(file: UploadFile = File(...)):
    # Mock analysis logic for file upload
    # In real world: save file, run inference engine, return result
    time.sleep(1.5) # Simulate processing
    
    is_fake = random.random() > 0.3
    confidence = 0.85 + random.random() * 0.14
    
    return {
        "filename": file.filename,
        "duration": 5.2, # Mock
        "label": "FAKE" if is_fake else "REAL",
        "confidence": round(confidence * 100, 2),
        "latency_ms": round(120 + random.random() * 50, 2)
    }

@app.post("/api/start-call", response_model=CallStatusResponse)
async def start_call(request: CallStartRequest):
    session_id = str(uuid.uuid4())
    return {
        "session_id": session_id,
        "status": "connected",
        "caller": request.caller_number,
        "receiver": request.receiver_number
    }

@app.post("/api/end-call")
async def end_call(session_id: str):
    return {"status": "ended", "session_id": session_id}

@app.get("/")
def health_check():
    return {"status": "Deepfake Detector Live"}