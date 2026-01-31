from pydantic import BaseModel
from typing import Optional

class FileAnalysisResponse(BaseModel):
    filename: str
    duration: float
    label: str # REAL or FAKE
    confidence: float
    latency_ms: float

class CallStartRequest(BaseModel):
    caller_number: str
    receiver_number: str

class CallStatusResponse(BaseModel):
    session_id: str
    status: str
    caller: str
    receiver: str
    
class InferenceResponse(BaseModel):
    label: str
    confidence: float
    latency: float
