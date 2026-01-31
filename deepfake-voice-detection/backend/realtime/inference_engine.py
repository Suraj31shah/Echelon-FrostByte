import random

class DeepfakeDetector:
    def __init__(self):
        # Load your model here later
        # self.model = torch.load("models/weights.pth")
        print("Deepfake Detector Loaded (Mock Mode)")

    def predict(self, audio_buffer):
        """
        Input: numpy array of audio (float32)
        Output: dict with 'label' and 'confidence'
        """
        # --- MOCK LOGIC (Replace with real model later) ---
        # Simulate processing time
        fake_probability = random.random() 
        
        return {
            "label": "FAKE" if fake_probability > 0.6 else "REAL",
            "confidence": f"{fake_probability:.2f}",
            "is_silent": False
        }