"use client";
import { useState, useRef } from "react";

export default function LiveCallStreamer() {
  const [isRecording, setIsRecording] = useState(false);
  const [status, setStatus] = useState("Idle"); // Idle -> Listening -> Analyzing -> Final Result
  const [finalVerdict, setFinalVerdict] = useState<{ label: string; confidence: number } | null>(null);
  
  const socketRef = useRef<WebSocket | null>(null);
  const audioContextRef = useRef<AudioContext | null>(null);
  const processorRef = useRef<ScriptProcessorNode | null>(null);
  const sourceRef = useRef<MediaStreamAudioSourceNode | null>(null);

  const startStream = async () => {
    setFinalVerdict(null); // Reset previous result
    try {
      socketRef.current = new WebSocket("ws://localhost:8000/ws/audio");
      
      socketRef.current.onopen = () => setStatus("Connected & Listening...");
      
      socketRef.current.onmessage = (event) => {
        const data = JSON.parse(event.data);
        
        if (data.status === "processing") {
          setStatus("Listening & Analyzing..."); // Feedback that it's working
        } 
        else if (data.status === "complete") {
          // WE GOT THE FINAL RESULT
          setFinalVerdict({ label: data.label, confidence: data.confidence });
          setStatus("Analysis Complete");
          closeResources(); // Now we safe to close
        }
      };

      // Audio Setup (Same as before)
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      audioContextRef.current = new (window.AudioContext || (window as any).webkitAudioContext)({ sampleRate: 16000 });
      sourceRef.current = audioContextRef.current.createMediaStreamSource(stream);
      processorRef.current = audioContextRef.current.createScriptProcessor(4096, 1, 1);
      
      processorRef.current.onaudioprocess = (e) => {
        if (socketRef.current?.readyState === WebSocket.OPEN && isRecording) {
          socketRef.current.send(e.inputBuffer.getChannelData(0).buffer); 
        }
      };

      sourceRef.current.connect(processorRef.current);
      processorRef.current.connect(audioContextRef.current.destination);
      
      setIsRecording(true);
      
    } catch (err) {
      console.error(err);
      setStatus("Error: Could not access Mic");
    }
  };

  const requestStop = () => {
    // 1. Stop recording flag immediately
    setIsRecording(false);
    setStatus("Finalizing Report...");

    // 2. Send STOP command to backend
    if (socketRef.current?.readyState === WebSocket.OPEN) {
      socketRef.current.send("STOP");
    } else {
        closeResources(); // If socket dead, just close
    }
  };

  const closeResources = () => {
    socketRef.current?.close();
    sourceRef.current?.disconnect();
    processorRef.current?.disconnect();
    audioContextRef.current?.close();
  };

  return (
    <div className="p-6 border border-gray-700 rounded-xl bg-gray-900/50 text-white max-w-lg mx-auto backdrop-blur-sm">
      <h2 className="text-2xl font-bold mb-6 text-center text-cyan-400">Voice Integrity Audit</h2>
      
      {/* RESULT DISPLAY AREA */}
      <div className={`h-32 flex flex-col items-center justify-center rounded-lg mb-6 transition-all duration-500
        ${finalVerdict 
            ? (finalVerdict.label === "FAKE" ? "bg-red-500/20 border-2 border-red-500" : "bg-green-500/20 border-2 border-green-500") 
            : "bg-gray-800 border-2 border-gray-700"}`}>
        
        {!finalVerdict ? (
          <div className="text-gray-400 animate-pulse text-lg font-mono">
            {status === "Idle" ? "Ready to Scan" : status}
          </div>
        ) : (
          <>
            <div className="text-sm uppercase tracking-widest text-gray-300 mb-1">Final Verdict</div>
            <div className={`text-4xl font-black ${finalVerdict.label === "FAKE" ? "text-red-500" : "text-green-400"}`}>
              {finalVerdict.label}
            </div>
            <div className="text-sm mt-2 text-gray-400">Confidence: {(finalVerdict.confidence * 100).toFixed(1)}%</div>
          </>
        )}
      </div>

      {/* CONTROLS */}
      {!isRecording ? (
        <button onClick={startStream} className="w-full bg-cyan-600 hover:bg-cyan-500 text-white py-4 rounded-lg font-bold text-lg tracking-wide shadow-lg shadow-cyan-900/50 transition-all">
          START MONITORING
        </button>
      ) : (
        <button onClick={requestStop} className="w-full bg-red-600 hover:bg-red-500 text-white py-4 rounded-lg font-bold text-lg tracking-wide shadow-lg shadow-red-900/50 transition-all animate-pulse">
          STOP & ANALYZE
        </button>
      )}
    </div>
  );
}