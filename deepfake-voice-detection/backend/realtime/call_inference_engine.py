from realtime.inference_engine import DeepfakeDetector
import numpy as np

import librosa

class CallInferenceEngine:
    def __init__(self):
        # We reuse the global detector from app state if available, 
        # or import it. Ideally we grab the singleton.
        # For now, let's assume we import the class and instantiate or 
        # use the one passed to us. 
        # To avoid reloading weights, we should import the 'detector' instance from app? 
        # Or just rely on the fact that 'realtime_call_ws' creates one.
        from realtime.inference_engine import DeepfakeDetector
        self.detector = DeepfakeDetector()
        
    def process_buffer(self, audio_buffer):
        """
        Process the accumulated audio buffer (float32 numpy array).
        Returns detection result dict or None.
        """
        try:
            # PARITY FIX: Normalize audio similar to librosa.load
            # This ensures volume levels match the training conditions (and file upload pipeline)
            if len(audio_buffer) > 0 and np.max(np.abs(audio_buffer)) > 0:
                audio_buffer = librosa.util.normalize(audio_buffer)
            
            # Predict
            return self.detector.predict(audio_buffer)
        except Exception as e:
            print(f"Call Inference Error: {e}")
            return None
