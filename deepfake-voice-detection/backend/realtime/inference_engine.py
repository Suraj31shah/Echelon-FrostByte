import torch
import numpy as np
import os
import sys

# Ensure we can find the models/utils folders
sys.path.append(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from models.model import ResNetDeepFake
from utils.features import extract_log_mel_spectrogram

class DeepfakeDetector:
    def __init__(self):
        self.device = "cuda" if torch.cuda.is_available() else "cpu"
        print(f"🔌 Loading AI Model on {self.device}...")
        
        self.model = ResNetDeepFake()
        
        # Load the weights you just trained
        model_path = os.path.join("models", "weights.pth")
        
        if os.path.exists(model_path):
            try:
                self.model.load_state_dict(torch.load(model_path, map_location=self.device))
                self.model.to(self.device)
                self.model.eval() # Set to evaluation mode (freezes layers)
                print("✅ Model loaded successfully! System is LIVE.")
            except Exception as e:
                print(f"❌ Error loading weights: {e}")
                self.model = None
        else:
            print("⚠️ WARNING: weights.pth not found. Did you run train.py?")
            self.model = None

    def predict(self, audio_buffer):
        """
        Input: numpy array of audio (float32) from the Sliding Window
        Output: dict with 'label' and 'confidence'
        """
        # If model failed to load, return safe default
        if self.model is None:
            return {"label": "ERROR", "confidence": 0.0}

        try:
            # 1. Preprocess: Convert Audio Buffer -> Spectrogram Image
            # The buffer is already a float32 numpy array, so we pass it directly
            spec_tensor = extract_log_mel_spectrogram(audio_buffer).unsqueeze(0).to(self.device)
            
            # 2. Inference: Pass image through ResNet
            with torch.no_grad():
                logits = self.model(spec_tensor)
                probs = torch.nn.functional.softmax(logits, dim=1) # Convert to probabilities
                
                # prob[0] is Real, prob[1] is Fake
                fake_score = probs[0][1].item()
            
            # 3. Decision Logic
            # Threshold: 0.5 (You can tweak this to 0.7 to be stricter)
            label = "FAKE" if fake_score > 0.5 else "REAL"
            
            return {
                "label": label,
                "confidence": float(fake_score)
            }
            
        except Exception as e:
            print(f"Inference Error: {e}")
            return {"label": "REAL", "confidence": 0.0}