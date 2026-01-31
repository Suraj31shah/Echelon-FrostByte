"use client";
import { useState, useRef, useEffect } from "react";

export default function LiveCallStreamer() {
  const [isRecording, setIsRecording] = useState(false);
  const [status, setStatus] = useState("Idle");
  const [verdict, setVerdict] = useState<"REAL" | "FAKE" | null>(null);
  
  const socketRef = useRef<WebSocket | null>(null);
  const audioContextRef = useRef<AudioContext | null>(null);
  const processorRef = useRef<ScriptProcessorNode | null>(null);
  const sourceRef = useRef<MediaStreamAudioSourceNode | null>(null);

  const startStream = async () => {
    try {
      // 1. Connect to WebSocket
      socketRef.current = new WebSocket("ws://localhost:8000/ws/audio");
      
      socketRef.current.onopen = () => setStatus("Connected to Server");
      
      socketRef.current.onmessage = (event) => {
        const data = JSON.parse(event.data);
        setVerdict(data.label); // "REAL" or "FAKE"
      };

      // 2. Access Microphone
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      audioContextRef.current = new (window.AudioContext || (window as any).webkitAudioContext)({
        sampleRate: 16000, // MANDATORY: Match backend sample rate
      });

      sourceRef.current = audioContextRef.current.createMediaStreamSource(stream);
      
      // 3. Process Audio (Buffer size 4096 is standard for this)
      processorRef.current = audioContextRef.current.createScriptProcessor(4096, 1, 1);
      
      processorRef.current.onaudioprocess = (e) => {
        if (socketRef.current?.readyState === WebSocket.OPEN) {
          // Get float32 data
          const inputData = e.inputBuffer.getChannelData(0);
          // Send raw bytes to backend
          socketRef.current.send(inputData.buffer); 
        }
      };

      sourceRef.current.connect(processorRef.current);
      processorRef.current.connect(audioContextRef.current.destination);
      
      setIsRecording(true);
      setStatus("Monitoring Call...");
      
    } catch (err) {
      console.error("Error accessing mic:", err);
      setStatus("Error: Could not access Mic");
    }
  };

  const stopStream = () => {
    socketRef.current?.close();
    sourceRef.current?.disconnect();
    processorRef.current?.disconnect();
    audioContextRef.current?.close();
    setIsRecording(false);
    setStatus("Call Ended");
    setVerdict(null);
  };

  return (
    <div className="p-4 border rounded-lg bg-gray-900 text-white max-w-md mx-auto">
      <h2 className="text-xl font-bold mb-4">Deepfake Voice Guard</h2>
      
      <div className={`h-24 flex items-center justify-center text-3xl font-bold rounded-md mb-4 
        ${verdict === "FAKE" ? "bg-red-600 animate-pulse" : verdict === "REAL" ? "bg-green-600" : "bg-gray-700"}`}>
        {verdict || "Waiting for Audio..."}
      </div>

      <div className="text-sm text-gray-400 mb-4">Status: {status}</div>

      {!isRecording ? (
        <button onClick={startStream} className="w-full bg-blue-600 hover:bg-blue-500 py-2 rounded text-white font-semibold">
          Start Call Simulation
        </button>
      ) : (
        <button onClick={stopStream} className="w-full bg-red-600 hover:bg-red-500 py-2 rounded text-white font-semibold">
          End Call
        </button>
      )}
    </div>
  );
}