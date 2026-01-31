from fastapi import FastAPI, WebSocket
from fastapi.middleware.cors import CORSMiddleware
from api.websockets import websocket_endpoint
import asyncio
from realtime.voip_receiver import run_receiver

app = FastAPI()

# Allow Next.js to connect
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"], # In production, change to your Next.js URL
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

@app.websocket("/ws/audio") 
async def audio_socket(websocket: WebSocket):
    await websocket_endpoint(websocket)

@app.get("/")
def health_check():
    return {"status": "Deepfake Detector Live"}


@app.on_event("startup")
async def start_voip_receiver():
    """Start background UDP VoIP receiver for incoming calls.

    Listens on UDP 5004 by default and broadcasts inference results to
    connected websocket clients.
    """
    # Run the receiver in the background so FastAPI stays responsive
    app.state._voip_task = asyncio.create_task(run_receiver(host="0.0.0.0", port=5004, dtype="int16"))


@app.on_event("shutdown")
async def stop_voip_receiver():
    task = getattr(app.state, "_voip_task", None)
    if task:
        task.cancel()