import asyncio
import numpy as np
import json
from realtime.sliding_window import SlidingWindowBuffer
from realtime.inference_engine import predict_voice


class VoIPUDPProtocol(asyncio.DatagramProtocol):
    def __init__(self, window_seconds=4.0, sr=16000, dtype="int16"):
        super().__init__()
        self.buffer = SlidingWindowBuffer(window_size_seconds=window_seconds, sr=sr)
        self.sr = sr
        self.dtype = dtype

    def datagram_received(self, data: bytes, addr):
        # Convert incoming packet to float32 PCM expected by SlidingWindowBuffer
        try:
            if self.dtype == "int16":
                arr = np.frombuffer(data, dtype=np.int16).astype(np.float32) / 32768.0
                self.buffer.add_chunk(arr.tobytes())
            else:
                # Expect float32 bytes
                self.buffer.add_chunk(data)

            if self.buffer.is_ready():
                audio = self.buffer.get_buffer()
                result = predict_voice(audio, sr=self.sr)
                asyncio.create_task(self._broadcast_result(result))
        except Exception:
            # Keep receiver alive on exceptions
            return

    async def _broadcast_result(self, result: dict):
        try:
            # Import here to avoid circular import issues at module import time
            from api.websockets import manager
            message = json.dumps({
                "source": "voip",
                "status": "processed",
                "label": result.get("label", "UNKNOWN"),
                "confidence": f"{result.get('confidence', 0.0):.2f}"
            })
            await manager.broadcast(message)
        except Exception:
            return


async def run_receiver(host: str = "0.0.0.0", port: int = 5004, dtype: str = "int16", sr: int = 16000):
    loop = asyncio.get_running_loop()
    transport, protocol = await loop.create_datagram_endpoint(
        lambda: VoIPUDPProtocol(window_seconds=4.0, sr=sr, dtype=dtype),
        local_addr=(host, port),
    )
    try:
        # Keep running until cancelled
        while True:
            await asyncio.sleep(3600)
    except asyncio.CancelledError:
        transport.close()
