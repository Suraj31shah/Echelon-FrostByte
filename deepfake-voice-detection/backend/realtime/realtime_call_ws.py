from fastapi import WebSocket, WebSocketDisconnect
from realtime.webrtc_audio_buffer import WebRTCAudioBuffer
from realtime.call_inference_engine import CallInferenceEngine
import asyncio
import json
import numpy as np
import time

# Store active rooms: {room_id: {client_id: websocket}}
rooms = {}

# Initialize AI Engine once
call_engine = CallInferenceEngine()

import librosa

async def websocket_call_endpoint(websocket: WebSocket, room_id: str, sample_rate: int = 16000):
    await websocket.accept()
    
    # Simple Client ID generation based on timestamp
    client_id = str(int(time.time() * 1000))
    print(f"📞 Client {client_id} joining Room: {room_id}")
    
    if room_id not in rooms:
        rooms[room_id] = {}
    
    rooms[room_id][client_id] = websocket
    
    # Determine peers
    peers = [ws for cid, ws in rooms[room_id].items() if cid != client_id]
    
    # Audio Buffer for THIS client (incoming audio TO be analyzed)
    # NOTE: In this design, we analyze what THIS client sends? 
    # Or what the OTHER client sends?
    # Usually: Sender sends audio -> Backend analyzes Sender's audio -> Sends result to Receiver.
    # OR: Receiver receives audio -> Taps it -> Sends to Backend -> Backend analyzes -> Sends result to Receiver.
    # The requirement: "A COPY of audio must be sent to backend for AI analysis... Results are sent back to receiver UI".
    # Since WebRTC is P2P, the Receiver has the audio. 
    # Frontend logic: "Tap audio stream and send PCM frames via WebSocket".
    # Assuming Frontend sends the *Remote* audio it hears to the backend.
    
    audio_buffer = WebRTCAudioBuffer(buffer_duration=10)
    
    # Tracker for periodic analysis
    last_analysis_time = time.time()
    
    try:
        # Notify others (Optional simple signaling)
        if len(peers) > 0:
             await websocket.send_json({"type": "room_joined", "client_id": client_id, "is_initiator": False})
        else:
             await websocket.send_json({"type": "room_created", "client_id": client_id, "is_initiator": True})

        while True:
            message = await websocket.receive()
            
            # --- 1. SIGNALING (JSON) ---
            if "text" in message:
                data = json.loads(message["text"])
                msg_type = data.get("type")
                
                if msg_type in ["offer", "answer", "candidate"]:
                    # Relay to ALL other peers in room
                    # In a real app, we'd target specific peer
                    target_peers = [ws for cid, ws in rooms[room_id].items() if cid != client_id]
                    for peer in target_peers:
                        await peer.send_json(data)
                        
            # --- 2. AUDIO STREAM (BYTES) ---
            elif "bytes" in message:
                audio_data = message["bytes"]
                
                # Convert bytes to numpy float32
                audio_np = np.frombuffer(audio_data, dtype=np.float32)
                
                # RESAMPLE if needed (e.g. 48k -> 16k)
                if sample_rate != 16000:
                    try:
                        # Resample using default method (matches file upload behavior)
                        audio_np = librosa.resample(audio_np, orig_sr=sample_rate, target_sr=16000)
                    except Exception as e:
                        print(f"⚠️ Resample Error: {e}")
                        continue
                        
                audio_buffer.add_chunk(audio_np.tobytes())
                
                # Check if it's time to run inference (every 1s? 5s?)
                # Requirement: "Every 5-10 seconds"
                now = time.time()
                if now - last_analysis_time > 2.0: # Run freq closer to 2s for UI updates, buffer has 10s history
                    if audio_buffer.is_ready():
                        audio_input = audio_buffer.get_buffer()
                        result = call_engine.process_buffer(audio_input)
                        
                        if result:
                            # Send back to THIS client (Receiver)
                            response = {
                                "type": "call_inference",
                                "label": result["label"],
                                "confidence": result["confidence"],
                                "energy": result["energy"],
                                "timestamp": now
                            }
                            await websocket.send_json(response)
                            last_analysis_time = now

    except WebSocketDisconnect:
        print(f"❌ Client {client_id} disconnected from {room_id}")
        if room_id in rooms:
            if client_id in rooms[room_id]:
                del rooms[room_id][client_id]
            if not rooms[room_id]:
                del rooms[room_id]
    except Exception as e:
        print(f"🔥 Error in Call WebSocket: {e}")
