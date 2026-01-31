"use client";

import { useState, useRef, useEffect, useCallback } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Mic, Square, Upload, FileAudio, Activity, Phone } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { cn } from "@/lib/utils";
import { CallDetectionPanel } from "./call-detection-panel";
import { WebSocketClient } from "@/lib/ws-client";
import { AudioRecorder } from "@/lib/audio-utils";

type InputMode = "mic" | "file" | "call";

export function LiveDetectionPanel() {
    const [activeMode, setActiveMode] = useState<InputMode>("mic");
    const [isRecording, setIsRecording] = useState(false);
    const [file, setFile] = useState<File | null>(null);
    const [prediction, setPrediction] = useState<{
        label: "REAL" | "FAKE";
        confidence: number;
        latency: number;
    } | null>(null);

    const wsClientRef = useRef<WebSocketClient | null>(null);
    const audioRecorderRef = useRef<AudioRecorder | null>(null);

    const handleWebSocketMessage = useCallback((data: any) => {
        if (data.label && data.confidence) {
            setPrediction({
                label: data.label,
                confidence: parseFloat(data.confidence),
                latency: Math.random() * 50 + 100 // Mock latency if not provided for now
            });
        }
    }, []);

    useEffect(() => {
        // initialize WebSocket Client on mount (lazy connect on record)
        wsClientRef.current = new WebSocketClient({
            url: "ws://localhost:8000/ws/audio", // Ensure backend is running
            onMessage: handleWebSocketMessage,
            onError: (e) => console.log("WS Error", e)
        });

        return () => {
            wsClientRef.current?.disconnect();
            audioRecorderRef.current?.stop();
        };
    }, [handleWebSocketMessage]);

    const startRecording = async () => {
        try {
            setIsRecording(true);
            setPrediction(null);

            wsClientRef.current?.connect();

            const recorder = new AudioRecorder((pcmData) => {
                // Send chunk
                if (wsClientRef.current) {
                    // Convert Int16Array to Blob or send directly? 
                    // wsClient supports ArrayBuffer.
                    wsClientRef.current.send(pcmData.buffer as ArrayBuffer);
                }
            });

            audioRecorderRef.current = recorder;
            await recorder.start();

        } catch (err) {
            console.error("Failed to start recording", err);
            setIsRecording(false);
        }
    };

    const stopRecording = () => {
        setIsRecording(false);
        audioRecorderRef.current?.stop();
        wsClientRef.current?.disconnect();
        setPrediction(null);
    };

    const toggleRecording = () => {
        if (isRecording) {
            stopRecording();
        } else {
            startRecording();
        }
    };

    const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
        if (e.target.files && e.target.files[0]) {
            const selectedFile = e.target.files[0];
            setFile(selectedFile);
            setPrediction(null); // Reset prev prediction

            // Send to API
            const formData = new FormData();
            formData.append("file", selectedFile);

            try {
                // Mock fetch for now, replace with actual endpoint
                // const res = await fetch("http://localhost:8000/api/analyze-file", {
                //     method: "POST",
                //     body: formData
                // });
                // const data = await res.json();

                // Simulation for UI feedback
                setTimeout(() => {
                    setPrediction({
                        label: "FAKE",
                        confidence: 98.2,
                        latency: 160,
                    });
                }, 1000);

            } catch (err) {
                console.error("Upload failed", err);
            }
        }
    };

    return (
        <section className="container mx-auto px-4 py-8">
            <Card className="w-full max-w-4xl mx-auto border-primary/20 bg-panel shadow-[0_0_50px_-12px_rgba(0,0,0,0.5)]">
                <CardHeader className="border-b border-border pb-6">
                    <div className="flex flex-col md:flex-row items-center justify-between gap-4">
                        <CardTitle className="flex items-center gap-2 text-xl">
                            <Activity className="text-primary w-5 h-5" />
                            Live Detection Analysis
                        </CardTitle>

                        <div className="flex bg-black/40 p-1 rounded-lg border border-border">
                            {(["mic", "file", "call"] as InputMode[]).map((mode) => (
                                <button
                                    key={mode}
                                    onClick={() => {
                                        if (isRecording) stopRecording();
                                        setActiveMode(mode);
                                    }}
                                    className={cn(
                                        "px-4 py-1.5 rounded-md text-sm font-medium transition-all",
                                        activeMode === mode ? "bg-primary/20 text-primary shadow-sm" : "text-gray-400 hover:text-white"
                                    )}
                                >
                                    {mode === "mic" && <span className="flex items-center gap-2"><Mic className="w-4 h-4" /> Live Mic</span>}
                                    {mode === "file" && <span className="flex items-center gap-2"><Upload className="w-4 h-4" /> Upload</span>}
                                    {mode === "call" && <span className="flex items-center gap-2"><Phone className="w-4 h-4" /> Live Call</span>}
                                </button>
                            ))}
                        </div>
                    </div>
                </CardHeader>

                <CardContent className="p-6">
                    {activeMode === "call" ? (
                        <CallDetectionPanel />
                    ) : (
                        <div className="space-y-8">
                            {/* Controls */}
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                <div className="space-y-4">
                                    <label className="text-sm text-gray-400 uppercase tracking-widest font-semibold">
                                        {activeMode === "mic" ? "Microphone Input" : "File Analysis"}
                                    </label>

                                    {activeMode === "mic" ? (
                                        <Button
                                            onClick={toggleRecording}
                                            variant={isRecording ? "destructive" : "default"}
                                            className="w-full h-12 text-base"
                                        >
                                            {isRecording ? (
                                                <>
                                                    <Square className="mr-2 w-4 h-4 fill-current" /> Stop Listening
                                                </>
                                            ) : (
                                                <>
                                                    <Mic className="mr-2 w-4 h-4" /> Start Monitoring
                                                </>
                                            )}
                                        </Button>
                                    ) : (
                                        <div className="relative w-full">
                                            <input
                                                type="file"
                                                accept=".wav,.mp3"
                                                onChange={handleFileUpload}
                                                className="absolute inset-0 w-full h-full opacity-0 cursor-pointer z-20"
                                            />
                                            <Button variant="secondary" className="w-full h-12 text-base">
                                                <Upload className="mr-2 w-4 h-4" /> {file ? "Change File" : "Select Audio File"}
                                            </Button>
                                        </div>
                                    )}

                                    {file && activeMode === "file" && (
                                        <div className="flex items-center gap-2 text-sm text-primary bg-primary/10 p-2 rounded">
                                            <FileAudio className="w-4 h-4" />
                                            <span className="truncate">{file.name}</span>
                                        </div>
                                    )}
                                </div>

                                {/* Visualizer Mock */}
                                <div className="relative rounded-lg bg-black/40 border border-border h-32 flex items-center justify-center overflow-hidden">
                                    {(isRecording || prediction) ? (
                                        <div className="flex items-center gap-1 h-full w-full justify-center px-4">
                                            {[...Array(20)].map((_, i) => (
                                                <motion.div
                                                    key={i}
                                                    className={cn(
                                                        "w-2 rounded-full",
                                                        prediction?.label === "FAKE" ? "bg-danger/60" : "bg-primary/60"
                                                    )}
                                                    animate={{
                                                        height: isRecording ? ["20%", "80%", "20%"] : "40%",
                                                    }}
                                                    transition={{
                                                        repeat: Infinity,
                                                        duration: 0.5 + Math.random() * 0.5,
                                                        delay: i * 0.05,
                                                    }}
                                                />
                                            ))}
                                        </div>
                                    ) : (
                                        <div className="text-gray-600 text-sm">Waiting for input stream...</div>
                                    )}
                                </div>
                            </div>

                            {/* Detection Output */}
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 items-center border-t border-border pt-6">
                                <div className="space-y-2">
                                    <h3 className="text-sm text-gray-400 uppercase tracking-widest font-semibold">Detection Result</h3>
                                    <div className="h-24 flex items-center">
                                        <AnimatePresence mode="wait">
                                            {prediction ? (
                                                <motion.div
                                                    key="result"
                                                    initial={{ opacity: 0, scale: 0.9 }}
                                                    animate={{ opacity: 1, scale: 1 }}
                                                    exit={{ opacity: 0, scale: 0.9 }}
                                                    className={cn(
                                                        "text-5xl font-bold tracking-tighter",
                                                        prediction.label === "REAL" ? "text-success drop-shadow-[0_0_10px_rgba(0,255,157,0.5)]" : "text-danger drop-shadow-[0_0_10px_rgba(255,42,109,0.5)]"
                                                    )}
                                                >
                                                    {prediction.label === "REAL" ? "REAL VOICE" : "SYNTHETIC"}
                                                </motion.div>
                                            ) : (
                                                <span className="text-4xl font-bold text-gray-700">--</span>
                                            )}
                                        </AnimatePresence>
                                    </div>
                                </div>

                                <div className="space-y-4">
                                    <div className="flex justify-between items-center pb-2 border-b border-border">
                                        <span className="text-gray-400">Confidence Score</span>
                                        <span className={cn(
                                            "font-mono text-xl",
                                            prediction ? "text-white" : "text-gray-600"
                                        )}>{prediction ? `${prediction.confidence.toFixed(1)}%` : "--"}</span>
                                    </div>
                                    <div className="flex justify-between items-center pb-2 border-b border-border">
                                        <span className="text-gray-400">Inference Latency</span>
                                        <span className={cn(
                                            "font-mono text-xl",
                                            prediction ? "text-primary" : "text-gray-600"
                                        )}>{prediction ? `${prediction.latency.toFixed(0)} ms` : "--"}</span>
                                    </div>
                                </div>
                            </div>
                        </div>
                    )}
                </CardContent>
            </Card>
        </section>
    );
}
