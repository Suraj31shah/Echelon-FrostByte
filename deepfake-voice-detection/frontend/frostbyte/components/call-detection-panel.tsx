"use client";

import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Phone, PhoneOff, User, ArrowRight } from "lucide-react";
import { motion } from "framer-motion";
import { Card, CardContent } from "@/components/ui/card";
import { cn } from "@/lib/utils";

export function CallDetectionPanel() {
    const [callState, setCallState] = useState<"idle" | "calling" | "connected">("idle");
    const [callerNumber, setCallerNumber] = useState("+1 (555) 012-3456");
    const [receiverNumber, setReceiverNumber] = useState("");
    const [duration, setDuration] = useState(0);

    // Mock detection states for demo
    const [callerStatus, setCallerStatus] = useState<"real" | "fake" | "analyzing">("analyzing");
    const [receiverStatus, setReceiverStatus] = useState<"real" | "fake" | "analyzing">("analyzing");

    useEffect(() => {
        let interval: NodeJS.Timeout;
        if (callState === "connected") {
            interval = setInterval(() => {
                setDuration((prev) => prev + 1);
                // Random mock updates
                if (Math.random() > 0.8) setCallerStatus(Math.random() > 0.9 ? "fake" : "real");
                if (Math.random() > 0.8) setReceiverStatus("real");
            }, 1000);
        } else {
            setDuration(0);
            setCallerStatus("analyzing");
            setReceiverStatus("analyzing");
        }
        return () => clearInterval(interval);
    }, [callState]);

    const handleCall = () => {
        if (callState === "idle") {
            setCallState("calling");
            setTimeout(() => setCallState("connected"), 2000);
        } else {
            setCallState("idle");
        }
    };

    const formatTime = (secs: number) => {
        const min = Math.floor(secs / 60);
        const sec = secs % 60;
        return `${min}:${sec.toString().padStart(2, "0")}`;
    };

    return (
        <div className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-8 items-center justify-center p-4">
                {/* Caller Input */}
                <div className="space-y-2">
                    <label className="text-xs text-gray-500 uppercase font-semibold tracking-wider">Caller (Simulated)</label>
                    <div className="flex items-center gap-3 p-4 rounded-xl bg-black/40 border border-border/50">
                        <div className="h-10 w-10 rounded-full bg-primary/20 flex items-center justify-center text-primary">
                            <User className="h-5 w-5" />
                        </div>
                        <input
                            type="text"
                            value={callerNumber}
                            onChange={(e) => setCallerNumber(e.target.value)}
                            disabled={callState !== "idle"}
                            className="bg-transparent border-none text-lg font-mono text-white focus:ring-0 w-full outline-none"
                            placeholder="+1 (555)..."
                        />
                    </div>
                    {callState === "connected" && (
                        <div className={cn(
                            "text-xs font-bold px-3 py-1 rounded-full w-fit flex items-center gap-2",
                            callerStatus === "fake" ? "bg-red-500/20 text-red-400" : callerStatus === "real" ? "bg-green-500/20 text-green-400" : "bg-gray-800 text-gray-400"
                        )}>
                            {callerStatus === "fake" ? "DETECTED: FAKE" : callerStatus === "real" ? "VERIFIED: REAL" : "ANALYZING..."}
                        </div>
                    )}
                </div>

                {/* Connection Animation */}
                <div className="flex flex-col items-center justify-center space-y-4">
                    {callState === "idle" ? (
                        <ArrowRight className="text-gray-600 w-8 h-8" />
                    ) : (
                        <div className="relative">
                            <div className="absolute inset-0 bg-primary/20 blur-xl animate-pulse rounded-full" />
                            <div className="h-12 w-1 bg-gradient-to-b from-transparent via-primary to-transparent animate-spin-slow" />
                        </div>
                    )}
                </div>

                {/* Receiver Input */}
                <div className="space-y-2">
                    <label className="text-xs text-gray-500 uppercase font-semibold tracking-wider">Receiver</label>
                    <div className="flex items-center gap-3 p-4 rounded-xl bg-black/40 border border-border/50">
                        <div className="h-10 w-10 rounded-full bg-secondary/20 flex items-center justify-center text-secondary">
                            <User className="h-5 w-5" />
                        </div>
                        <input
                            type="text"
                            value={receiverNumber}
                            onChange={(e) => setReceiverNumber(e.target.value)}
                            disabled={callState !== "idle"}
                            className="bg-transparent border-none text-lg font-mono text-white focus:ring-0 w-full outline-none"
                            placeholder="Enter number..."
                        />
                    </div>
                    {callState === "connected" && (
                        <div className={cn(
                            "text-xs font-bold px-3 py-1 rounded-full w-fit flex items-center gap-2",
                            receiverStatus === "fake" ? "bg-red-500/20 text-red-400" : receiverStatus === "real" ? "bg-green-500/20 text-green-400" : "bg-gray-800 text-gray-400"
                        )}>
                            {receiverStatus === "fake" ? "DETECTED: FAKE" : receiverStatus === "real" ? "VERIFIED: REAL" : "ANALYZING..."}
                        </div>
                    )}
                </div>
            </div>

            <div className="flex justify-center pt-4">
                {callState === "idle" ? (
                    <Button size="lg" className="h-14 px-8 text-lg rounded-full shadow-[0_0_20px_rgba(0,240,255,0.3)]" onClick={handleCall}>
                        <Phone className="mr-2 w-5 h-5" /> Initiate Secure Call
                    </Button>
                ) : (
                    <div className="flex flex-col items-center gap-4">
                        <div className="font-mono text-xl text-white tracking-widest">{formatTime(duration)}</div>
                        <Button variant="destructive" size="lg" className="h-14 px-8 text-lg rounded-full" onClick={handleCall}>
                            <PhoneOff className="mr-2 w-5 h-5" /> End Call
                        </Button>
                        {callState === "calling" && <span className="text-sm text-primary animate-pulse">Connecting secure line...</span>}
                    </div>
                )}
            </div>
        </div>
    );
}
