import asyncio
import random

class CallBridge:
    """
    Simulates a bridge between a telephony provider (e.g., Twilio) and the inference engine.
    In a real system, this would consume RTP streams.
    """
    def __init__(self):
        self.active_calls = {}

    async def start_stream(self, session_id: str, callback):
        """
        Simulate receiving audio chunks from a call.
        """
        self.active_calls[session_id] = True
        print(f"CallBridge: Stream started for {session_id}")
        
        try:
            while self.active_calls.get(session_id):
                # Simulate a packet of audio (20ms of PCM)
                # In reality, this would be data from the phone provider
                await asyncio.sleep(0.1) # Send update every 100ms
                
                # Create a mock result for this chunk
                # Randomly switch between real/fake for demo purposes
                is_fake = random.random() > 0.8
                
                result = {
                    "session_id": session_id,
                    "caller_status": "FAKE" if is_fake else "REAL",
                    "caller_confidence": 0.80 + random.random() * 0.19,
                    "receiver_status": "REAL",
                    "receiver_confidence": 0.95 + random.random() * 0.04
                }
                
                await callback(result)
                
        except Exception as e:
            print(f"CallBridge Error: {e}")

    def stop_stream(self, session_id: str):
        if session_id in self.active_calls:
            self.active_calls[session_id] = False
            print(f"CallBridge: Stream stopped for {session_id}")
