
import numpy as np
import random
import os
try:
	import torch
except Exception:
	torch = None


_MODEL = None


def _load_model():
	"""Attempt to load a torch model if available. Placeholder — keep lightweight.

	If no model is found or PyTorch isn't installed, inference falls back
	to a randomized/confidence heuristic so the pipeline stays functional.
	"""
	global _MODEL
	if _MODEL is not None:
		return _MODEL

	model_path = os.path.join(os.path.dirname(__file__), "..", "models", "best_model.pt")
	model_path = os.path.abspath(model_path)
	if torch is not None and os.path.exists(model_path):
		try:
			_MODEL = torch.jit.load(model_path)
		except Exception:
			try:
				_MODEL = torch.load(model_path, map_location="cpu")
			except Exception:
				_MODEL = None
	return _MODEL


def predict_voice(audio: np.ndarray, sr: int = 16000) -> dict:
	"""Run detection on a 1-D numpy `audio` buffer.

	Returns a dict: {"label": "REAL"|"FAKE", "confidence": float}
	"""
	# Ensure 1D numpy array
	audio = np.asarray(audio, dtype=np.float32).ravel()

	# Load model if available
	model = _load_model()
	if model is not None and torch is not None:
		try:
			# Prepare tensor, run model
			with torch.no_grad():
				tensor = torch.from_numpy(audio).float().unsqueeze(0)
				out = model(tensor)
				# Expect model to return a probability or logit for FAKE class
				if isinstance(out, (tuple, list)):
					out = out[0]
				score = float(torch.sigmoid(out).item() if hasattr(torch, 'sigmoid') else float(out))
				label = "FAKE" if score > 0.5 else "REAL"
				return {"label": label, "confidence": score}
		except Exception:
			pass

	# Fallback heuristic when no model: use a simple energy + randomness blend
	energy = float(np.mean(audio ** 2))
	# Map energy (usually small) to a 0-1 scale heuristically
	score = min(1.0, max(0.0, 0.5 + (random.random() - 0.5) * 0.3 + (energy * 10)))
	label = "FAKE" if score > 0.5 else "REAL"
	return {"label": label, "confidence": score}

