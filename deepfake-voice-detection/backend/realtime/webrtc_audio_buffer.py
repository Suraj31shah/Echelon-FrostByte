import collections
import numpy as np

class WebRTCAudioBuffer:
    def __init__(self, buffer_duration=10, sr=16000):
        self.sr = sr
        self.maxlen = int(buffer_duration * sr)
        self.buffer = collections.deque(maxlen=self.maxlen)
        
    def add_chunk(self, chunk_bytes):
        """
        Receives raw float32 bytes from frontend WebRTC tap.
        """
        try:
            data = np.frombuffer(chunk_bytes, dtype=np.float32)
            self.buffer.extend(data)
        except Exception as e:
            print(f"Buffer Error: {e}")

    def is_ready(self):
        """
        Check if we have enough data to run a meaningful inference.
        For a 10s window, we might want to start predicting 
        once we have at least 3-4 seconds of data.
        """
        # Return True if we have at least 5 seconds of audio (User Requirement)
        return len(self.buffer) >= (self.sr * 5)

    def get_buffer(self):
        return np.array(self.buffer, dtype=np.float32)
