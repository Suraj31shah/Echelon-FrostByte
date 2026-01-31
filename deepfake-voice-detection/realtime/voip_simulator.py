#!/usr/bin/env python3
"""Simple VoIP UDP simulator: streams a mono 16kHz s16 WAV to UDP.

Usage:
    python realtime/voip_simulator.py --file example_16k_mono_s16.wav --host 127.0.0.1 --port 5004

This sends raw s16le frames in real-time to the receiver.
"""
import argparse
import socket
import wave
import time


def stream_wav_to_udp(wav_path: str, host: str, port: int, chunk_frames: int = 1024):
    wf = wave.open(wav_path, "rb")
    if wf.getnchannels() != 1 or wf.getsampwidth() != 2 or wf.getframerate() != 16000:
        raise RuntimeError("WAV must be mono, 16-bit, 16000 Hz (s16)")

    s = socket.socket(socket.AF_INET, socket.SOCK_DGRAM)
    addr = (host, port)

    frames_per_chunk = chunk_frames
    bytes_per_chunk = frames_per_chunk * wf.getsampwidth() * wf.getnchannels()
    duration_per_chunk = frames_per_chunk / wf.getframerate()

    data = wf.readframes(frames_per_chunk)
    try:
        while data:
            s.sendto(data, addr)
            time.sleep(duration_per_chunk)
            data = wf.readframes(frames_per_chunk)
    finally:
        s.close()
        wf.close()


def main():
    p = argparse.ArgumentParser()
    p.add_argument("--file", required=True)
    p.add_argument("--host", default="127.0.0.1")
    p.add_argument("--port", type=int, default=5004)
    p.add_argument("--chunk", type=int, default=1024)
    args = p.parse_args()
    stream_wav_to_udp(args.file, args.host, args.port, chunk_frames=args.chunk)


if __name__ == "__main__":
    main()
