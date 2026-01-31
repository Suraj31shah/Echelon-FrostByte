from fastapi import WebSocket, WebSocketDisconnect
from realtime.sliding_window import SlidingWindowBuffer
import random
import json
import struct

class ConnectionManager:
    def __init__(self):
        self.active_connections: list[WebSocket] = []

    async def connect(self, websocket: WebSocket):
        await websocket.accept()
        self.active_connections.append(websocket)

    def disconnect(self, websocket: WebSocket):
        self.active_connections.remove(websocket)

manager = ConnectionManager()

async def websocket_endpoint(websocket: WebSocket):
    await manager.connect(websocket)
    
    # Initialize a buffer: 3 seconds window for better context (assuming 16kHz, 16-bit mono)
    # 48000 samples * 2 bytes = 96000 bytes approx buffer size needed
    buffer = SlidingWindowBuffer(window_size_seconds=3.0) 
    
    try:
        while True:
            # 1. Receive Audio Chunk (Bytes)
            # Expecting ArrayBuffer (bytes) from client
            data = await websocket.receive_bytes()
            
            # 2. Add to Buffer
            # In a real app, verify sample rate/depth here. Assuming 16kHz PCM16.
            buffer.add_chunk(data)
            
            # 3. Predict periodically (e.g., every 0.5s or simple check)
            # For this demo, we respond slightly less frequently to avoid flooding UI
            if buffer.is_ready():
                 # --- SIMULATION LOGIC START ---
                 # Replace with: result = await inference_engine.predict(buffer.get_buffer())
                 
                 # Heuristic: if data is silence (all zeros), return silence?
                 # Ignoring for now.
                 
                 is_fake = random.random() > 0.6 # Bias towards fake for demo excitement
                 confidence = 80.0 + random.random() * 19.0
                 latency = 100 + random.random() * 50
                 
                 response = {
                    "label": "FAKE" if is_fake else "REAL",
                    "confidence": f"{confidence:.2f}",
                    "latency": f"{latency:.0f}",
                    "ts": random.randint(1000, 9999) # timestamp
                 }
                 
                 await websocket.send_text(json.dumps(response))
                 
                 # Optional: Clear buffer or slide window?
                 # Buffer implementation handles sliding usually. 
                 # Here we might just keep adding and let the internal implementation handle it
                 # if it's a circular buffer.
                 
                 # --- SIMULATION LOGIC END ---
            else:
                # If buffer not ready yet (filling up), send "Analyzing..." or nothing
                pass
                
    except WebSocketDisconnect:
        manager.disconnect(websocket)
    except Exception as e:
        print(f"WS Error: {e}")
        try:
            await websocket.close()
        except:
             pass