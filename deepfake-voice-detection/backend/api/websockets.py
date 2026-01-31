from fastapi import WebSocket, WebSocketDisconnect
from realtime.sliding_window import SlidingWindowBuffer
from realtime.inference_engine import predict_voice
import json

class ConnectionManager:
    def __init__(self):
        self.active_connections: list[WebSocket] = []

    async def connect(self, websocket: WebSocket):
        await websocket.accept()
        self.active_connections.append(websocket)

    def disconnect(self, websocket: WebSocket):
        self.active_connections.remove(websocket)

    async def broadcast(self, message: str):
        """Send `message` to all connected websockets."""
        to_remove = []
        for ws in list(self.active_connections):
            try:
                await ws.send_text(message)
            except Exception:
                to_remove.append(ws)
        for ws in to_remove:
            if ws in self.active_connections:
                self.active_connections.remove(ws)

manager = ConnectionManager()

async def websocket_endpoint(websocket: WebSocket):
    await manager.connect(websocket)
    
    # Initialize a buffer specifically for THIS caller
    buffer = SlidingWindowBuffer(window_size_seconds=4.0)
    
    try:
        while True:
            # 1. Receive Audio Chunk (Bytes)
            data = await websocket.receive_bytes()

            # 2. Add to Buffer
            buffer.add_chunk(data)

            # 3. Check if we can predict
            if buffer.is_ready():
                audio_input = buffer.get_buffer()

                # Run inference (model-agnostic wrapper)
                result = predict_voice(audio_input)

                response = {
                    "status": "processed",
                    "label": result.get("label", "UNKNOWN"),
                    "confidence": f"{result.get('confidence', 0.0):.2f}"
                }

                # Send result back to this websocket client
                await websocket.send_text(json.dumps(response))

    except WebSocketDisconnect:
        manager.disconnect(websocket)