import os
import sys
import torch
import glob
import time

# Add backend to sys.path
sys.path.append(os.path.dirname(os.path.abspath(__file__)))

from models.cnn_mel import DeepfakeCNN
from features.mel_spectogram import feature_extraction

def verify_real_audio():
    output_file = "verification_results.txt"
    with open(output_file, "w", encoding='utf-8') as f:
        f.write("--- Real Audio Verification ---\n")
        print("--- Real Audio Verification ---")
        
        # 1. Load Model
        try:
            model = DeepfakeCNN()
            model.eval()
            f.write("Model loaded.\n")
            print("Model loaded.")
        except Exception as e:
            f.write(f"Error loading model: {e}\n")
            print(f"Error loading model: {e}")
            return
        
        # 2. Locate Files
        data_dir = os.path.join(os.path.dirname(__file__), "data", "raw")
        wav_files = glob.glob(os.path.join(data_dir, "*.wav"))
        
        if not wav_files:
            f.write(f"No WAV files found in {data_dir}\n")
            print(f"No WAV files found in {data_dir}")
            return

        # Limit to first 5 files
        sample_files = wav_files[:5]
        msg = f"Found {len(wav_files)} files. Testing first {len(sample_files)}...\n"
        f.write(msg)
        print(msg.strip())
        f.write("-" * 40 + "\n")
        
        for wav_path in sample_files:
            filename = os.path.basename(wav_path)
            
            # 3. Extract Features
            start_time = time.time()
            try:
                features = feature_extraction(wav_path)
            except Exception as e:
                f.write(f"Feature extraction failed for {filename}: {e}\n")
                continue
            
            if features is None:
                f.write(f"Feature extraction returned None for {filename}\n")
                continue
                
            # 4. Inference
            try:
                with torch.no_grad():
                    prob = model.predict(features)
            except Exception as e:
                f.write(f"Inference failed for {filename}: {e}\n")
                continue
                
            end_time = time.time()
            latency_ms = (end_time - start_time) * 1000
            
            # 5. Output
            classification = "Synthetic" if prob > 0.5 else "Human"
            
            f.write(f"File: {filename}\n")
            f.write(f"Deepfake Probability: {prob:.4f}\n")
            f.write(f"Classification: {classification}\n")
            f.write(f"Latency (End-to-End): {latency_ms:.2f} ms\n")
            f.write("-" * 20 + "\n")
            
            # Print to stdout as well
            print(f"File: {filename}")
            print(f"Deepfake Probability: {prob:.4f}")
            print(f"Classification: {classification}")
            print("-" * 20)

    print(f"Verification complete. Results saved to {output_file}")

if __name__ == "__main__":
    verify_real_audio()
