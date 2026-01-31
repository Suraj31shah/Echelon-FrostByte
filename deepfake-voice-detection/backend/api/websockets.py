# api/websockets.py (Final Correct Version)
from fastapi import WebSocket, WebSocketDisconnect
from realtime.sliding_window import SlidingWindowBuffer
from realtime.inference_engine import DeepfakeDetector
import json
import numpy as np

detector = DeepfakeDetector()

async def websocket_endpoint(websocket: WebSocket):
    await websocket.accept()
    buffer = SlidingWindowBuffer(window_size_seconds=4.0)
    session_scores = [] 
    
    try:
        while True:
            # We need to handle both Bytes (Audio) and Text (Commands)
            # FastAPI doesn't let you wait for both easily, so we usually check the type
            message = await websocket.receive()

            if "bytes" in message:
                # Process Audio
                data = message["bytes"]
                buffer.add_chunk(data)
                
                if buffer.is_ready():
                    audio_input = buffer.get_buffer()
                    result = detector.predict(audio_input)
                    
                    # Store verdict (1=Fake, 0=Real)
                    # Use the raw probability from your model if available for better precision
                    is_fake = 1 if result["label"] == "FAKE" else 0
                    session_scores.append(is_fake)
                    
                    # Send heartbeat so UI shows "Processing..."
                    await websocket.send_json({"status": "processing"})

            elif "text" in message:
                if message["text"] == "STOP":
                    # --- CALCULATE FINAL RESULT ---
                    if not session_scores:
                        final_verdict = {"status": "complete", "label": "INCONCLUSIVE", "confidence": 0}
                    else:
                        avg_score = np.mean(session_scores)
                        label = "FAKE" if avg_score > 0.5 else "REAL"
                        conf = avg_score if label == "FAKE" else (1.0 - avg_score)
                        
                        final_verdict = {
                            "status": "complete", 
                            "label": label, 
                            "confidence": round(conf, 2)
                        }
                    
                    # Send Final Result
                    await websocket.send_json(final_verdict)
                    break # Exit loop to close connection

    except WebSocketDisconnect:
        print("Client disconnected abruptly")