import torch
import torch.nn as nn
import time
import sys
import os

# Add project root to path
sys.path.append(os.path.abspath(os.path.join(os.path.dirname(__file__), '..')))

from models.cnn_mel import DeepfakeCNN, train_model

def verify_latency():
    print("--- Verifying Latency ---")
    model = DeepfakeCNN()
    model.eval()
    
    # Dummy input: (Batch=1, Channel=1, Mels=128, Time=300) -> approx 3-4 seconds audio
    dummy_input = torch.randn(1, 1, 128, 300)
    
    # Warmup
    for _ in range(10):
        _ = model(dummy_input)
        
    start_time = time.time()
    iterations = 100
    for _ in range(iterations):
        with torch.no_grad():
            _ = model(dummy_input)
    end_time = time.time()
    
    avg_latency = (end_time - start_time) / iterations * 1000 # in ms
    print(f"Average Latency: {avg_latency:.2f} ms")
    
    if avg_latency < 30:
        print("✅ Latency Check Passed (< 30ms)")
    else:
        print("❌ Latency Check Failed (> 30ms)")

def verify_training_step():
    print("\n--- Verifying Training Step ---")
    model = DeepfakeCNN()
    
    # Dummy Dataset
    inputs = torch.randn(4, 1, 128, 300) # Batch of 4
    labels = torch.randint(0, 2, (4,)).float() # Binary labels
    
    dataset = torch.utils.data.TensorDataset(inputs, labels)
    loader = torch.utils.data.DataLoader(dataset, batch_size=2)
    
    try:
        train_model(model, loader, None, epochs=1)
        print("✅ Training Step Passed")
    except Exception as e:
        print(f"❌ Training Step Failed: {e}")
        import traceback
        traceback.print_exc()

def verify_io():
    print("\n--- Verifying Save/Load ---")
    model = DeepfakeCNN()
    path = "temp_model.pth"
    try:
        model.save(path)
        model.load(path)
        print("✅ Save/Load Passed")
    except Exception as e:
        print(f"❌ Save/Load Failed: {e}")
    finally:
        if os.path.exists(path):
            os.remove(path)

if __name__ == "__main__":
    verify_latency()
    verify_training_step()
    verify_io()
