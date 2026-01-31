import librosa
import numpy as np
import torch

def feature_extraction(file_path, max_duration=5.0):
    """
    Extracts Mel-spectrogram from an audio file.
    Args:
        file_path (str): Path to the .wav file
        max_duration (float): Max duration in seconds to load (default 5s)
        
    Returns:
        torch.Tensor: Shape (1, 1, 128, time_steps) ready for CNN
    """
    try:
        # Load audio (force 16kHz mono)
        y, sr = librosa.load(file_path, sr=16000, mono=True, duration=max_duration)
        
        # Extract Mel Spectrogram
        # n_mels=128, n_fft=2048, hop_length=512 (approx 32ms window, 10ms hop?)
        # Standard: n_fft=2048 (~128ms), hop=512 (~32ms) -> roughly 31 frames/sec
        mel_spect = librosa.feature.melspectrogram(y=y, sr=sr, n_mels=128, n_fft=2048, hop_length=512)
        
        # Convert to Log-Mel
        log_mel = librosa.power_to_db(mel_spect, ref=np.max)
        
        # Normalize (optional, but good for CNNs) -> Map -80dB..0dB to 0..1 approximately
        # Simple MinMax or Z-score. Let's do simple normalization for now.
        # Assuming typical audio range.
        norm_mel = (log_mel + 80.0) / 80.0
        
        # Add Batch and Channel dimensions: (1, 1, F, T)
        mel_tensor = torch.tensor(norm_mel, dtype=torch.float32).unsqueeze(0).unsqueeze(0)
        
        return mel_tensor
    except Exception as e:
        print(f"Error processing {file_path}: {e}")
        return None
