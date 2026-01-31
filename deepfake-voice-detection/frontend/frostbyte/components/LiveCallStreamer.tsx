"use client";
import { useState, useRef } from "react";

export default function LiveCallStreamer() {
  const [mode, setMode] = useState<"live" | "upload">("live"); // Toggle modes
  const [isRecording, setIsRecording] = useState(false);
  const [status, setStatus] = useState("Idle");
  const [finalVerdict, setFinalVerdict] = useState<{ label: string; confidence: number } | null>(null);
  const [chunksSent, setChunksSent] = useState(0); 

  // --- LIVE REFS ---
  const socketRef = useRef<WebSocket | null>(null);
  const audioContextRef = useRef<AudioContext | null>(null);
  const processorRef = useRef<ScriptProcessorNode | null>(null);
  const sourceRef = useRef<MediaStreamAudioSourceNode | null>(null);

  // --- UPLOAD HANDLER ---
  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setStatus("Uploading & Analyzing...");
    setFinalVerdict(null);

    const formData = new FormData();
    formData.append("file", file);

    try {
      const res = await fetch("http://localhost:8000/analyze-file", {
        method: "POST",
        body: formData,
      });
      
      const data = await res.json();
      setFinalVerdict({ label: data.label, confidence: data.confidence });
      setStatus("Analysis Complete");
    } catch (err) {
      console.error(err);
      setStatus("Error: Upload Failed");
    }
  };

  // --- LIVE STREAM HANDLERS (Existing Code) ---
  const startStream = async () => {
    setFinalVerdict(null);
    setChunksSent(0);
    try {
      setStatus("Requesting Mic Access...");
      const stream = await navigator.mediaDevices.getUserMedia({ audio: { channelCount: 1, sampleRate: 16000 } });

      setStatus("Connecting...");
      socketRef.current = new WebSocket("ws://localhost:8000/ws/audio");
      
      socketRef.current.onopen = async () => {
        setStatus("Connected! Speak now...");
        audioContextRef.current = new (window.AudioContext || (window as any).webkitAudioContext)({ sampleRate: 16000 });
        if (audioContextRef.current?.state === "suspended") await audioContextRef.current.resume();

        sourceRef.current = audioContextRef.current.createMediaStreamSource(stream);
        processorRef.current = audioContextRef.current.createScriptProcessor(4096, 1, 1);
        
        processorRef.current.onaudioprocess = (e) => {
          if (socketRef.current?.readyState === WebSocket.OPEN) {
            socketRef.current.send(e.inputBuffer.getChannelData(0).buffer);
            setChunksSent(prev => prev + 1);
          }
        };

        sourceRef.current.connect(processorRef.current);
        processorRef.current.connect(audioContextRef.current.destination);
        setIsRecording(true);
      };
      
      socketRef.current.onmessage = (event) => {
        const data = JSON.parse(event.data);
        if (data.status === "complete") {
          setFinalVerdict({ label: data.label, confidence: data.confidence });
          setStatus("Analysis Complete");
          closeResources();
        }
      };
    } catch (err) { setStatus("Error: Mic Permission Denied"); }
  };

  const requestStop = () => {
    setIsRecording(false);
    setStatus("Finalizing...");
    if (socketRef.current?.readyState === WebSocket.OPEN) socketRef.current.send("STOP");
    else closeResources();
  };

  const closeResources = () => {
    socketRef.current?.close();
    sourceRef.current?.disconnect();
    processorRef.current?.disconnect();
    audioContextRef.current?.close();
  };

  return (
    <div className="p-6 border border-gray-700 rounded-xl bg-gray-900/50 text-white max-w-lg mx-auto backdrop-blur-sm">
      <div className="flex justify-center gap-4 mb-6">
        <button onClick={() => setMode("live")} className={`px-4 py-2 rounded-lg font-bold ${mode === "live" ? "bg-cyan-600" : "bg-gray-800 text-gray-400"}`}>Live Call</button>
        <button onClick={() => setMode("upload")} className={`px-4 py-2 rounded-lg font-bold ${mode === "upload" ? "bg-cyan-600" : "bg-gray-800 text-gray-400"}`}>Upload File</button>
      </div>

      <h2 className="text-2xl font-bold mb-6 text-center text-cyan-400">
        {mode === "live" ? "Live Voice Guard" : "File Forensics"}
      </h2>
      
      {/* RESULT DISPLAY */}
      <div className={`h-32 flex flex-col items-center justify-center rounded-lg mb-6 transition-all duration-500
        ${finalVerdict 
            ? (finalVerdict.label === "FAKE" ? "bg-red-500/20 border-2 border-red-500" : "bg-green-500/20 border-2 border-green-500") 
            : "bg-gray-800 border-2 border-gray-700"}`}>
        
        {!finalVerdict ? (
          <div className="flex flex-col items-center">
            <div className="text-gray-400 animate-pulse text-lg font-mono mb-2">{status}</div>
            {mode === "live" && isRecording && <div className="text-xs text-gray-500">Chunks: {chunksSent}</div>}
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
      {mode === "live" ? (
        !isRecording ? (
          <button onClick={startStream} className="w-full bg-cyan-600 hover:bg-cyan-500 text-white py-4 rounded-lg font-bold text-lg shadow-lg">START MONITORING</button>
        ) : (
          <button onClick={requestStop} className="w-full bg-red-600 hover:bg-red-500 text-white py-4 rounded-lg font-bold text-lg animate-pulse">STOP & ANALYZE</button>
        )
      ) : (
        <div className="relative w-full">
            <input type="file" accept=".wav,.mp3" onChange={handleFileUpload} className="hidden" id="file-upload" />
            <label htmlFor="file-upload" className="w-full flex items-center justify-center bg-gray-700 hover:bg-gray-600 text-white py-4 rounded-lg font-bold text-lg cursor-pointer border-2 border-dashed border-gray-500">
                Select Audio File
            </label>
        </div>
      )}
    </div>
  );
}