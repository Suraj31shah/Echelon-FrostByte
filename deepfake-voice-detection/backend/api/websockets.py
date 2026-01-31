# api/websockets.py (Final Correct Version)
from fastapi import WebSocket, WebSocketDisconnect
from realtime.sliding_window import SlidingWindowBuffer
from realtime.inference_engine import DeepfakeDetector
import json
import numpy as np

detector = DeepfakeDetector()

# In api/websockets.py

async def websocket_endpoint(websocket: WebSocket):
    await websocket.accept()
    
    # ⚡ FIX 1: Reduce window from 4.0 to 2.5 seconds
    # This ensures it triggers even if the clip is short
    buffer = SlidingWindowBuffer(window_size_seconds=2.5) 
    
    session_scores = [] 
    chunks_received = 0 # Debug counter
    
    try:
        while True:
            message = await websocket.receive()

            if "bytes" in message:
                data = message["bytes"]
                buffer.add_chunk(data)
                chunks_received += 1
                
                # ⚡ FIX 2: Debug Print every 10 chunks (Check your terminal!)
                if chunks_received % 10 == 0:
                    print(f"🎤 Received Chunk #{chunks_received} | Buffer: {len(buffer.buffer)}/{buffer.window_size}")

                if buffer.is_ready():
                    audio_input = buffer.get_buffer()
                    result = detector.predict(audio_input)
                    
                    # Store verdict
                    is_fake = 1 if result["label"] == "FAKE" else 0
                    session_scores.append(is_fake)
                    
                    await websocket.send_json({"status": "processing"})

            elif "text" in message:
                if message["text"] == "STOP":
                    print(f"🛑 Call Ended. Total Predictions Made: {len(session_scores)}")
                    
                    if not session_scores:
                        # ⚡ FIX 3: If no predictions, warn the user why
                        print("⚠️ WARNING: Audio was too short! No predictions were made.")
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
                    
                    await websocket.send_json(final_verdict)
                    break 

    except WebSocketDisconnect:
        print("Client disconnected")
    except WebSocketDisconnect:
        print("Client disconnected abruptly")