"use client";

import { motion } from "framer-motion";
import { useEffect, useState } from "react";

interface TimelineProps {
    history: number[]; // 0 for Real, 1 for Fake
}

export function DetectionTimeline({ history }: TimelineProps) {
    const [mounted, setMounted] = useState(false);

    useEffect(() => {
        setMounted(true);
    }, []);

    if (!mounted) {
        return null; // or a skeleton loading state
    }
    // Mock data for the timeline
    const timelineData = Array.from({ length: 20 }, (_, i) => ({
        id: i,
        status: Math.random() > 0.8 ? "fake" : "real",
        timestamp: new Date(Date.now() - (20 - i) * 1000).toISOString(),
        confidence: 85 + Math.random() * 15,
    }));

    return (
        <section className="container mx-auto px-4 py-8 mb-12">
            <div className="flex items-center justify-between mb-4">
                <h3 className="text-sm text-gray-400 uppercase tracking-widest font-semibold">
                    Detection Timeline (Last 20s)
                </h3>
                <div className="flex gap-4 text-xs">
                    <div className="flex items-center gap-2">
                        <div className="w-3 h-3 bg-success rounded-sm"></div>
                        <span className="text-gray-400">Real</span>
                    </div>
                    <div className="flex items-center gap-2">
                        <div className="w-3 h-3 bg-danger rounded-sm"></div>
                        <span className="text-gray-400">Synthetic</span>
                    </div>
                </div>
            </div>

            <div className="relative w-full h-16 bg-black/50 rounded-lg overflow-hidden flex border border-border">
                {timelineData.map((segment, i) => (
                    <motion.div
                        key={segment.id}
                        initial={{ opacity: 0, scaleY: 0 }}
                        animate={{ opacity: 1, scaleY: 1 }}
                        transition={{ delay: i * 0.05 }}
                        className={`flex-1 h-full border-r border-black/20 relative group cursor-pointer ${segment.status === "real" ? "bg-success/20 hover:bg-success/40" : "bg-danger/20 hover:bg-danger/40"
                            }`}
                    >
                        {/* Timeline bar height indicator of confidence maybe? just full height for now */}
                        <div className={`absolute bottom-0 left-0 right-0 ${segment.status === "real" ? "bg-success" : "bg-danger"
                            }`} style={{ height: "4px" }} />

                        {/* Tooltip */}
                        <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 p-2 bg-panel border border-border rounded shadow-xl text-xs whitespace-nowrap opacity-0 group-hover:opacity-100 transition-opacity z-10 pointer-events-none">
                            <p className="font-bold text-white">{segment.status === "real" ? "REAL" : "FAKE"}</p>
                            <p className="text-gray-400">Conf: {segment.confidence.toFixed(1)}%</p>
                            <p className="text-gray-500 text-[10px]">Model: XP-Voice-v2</p>
                        </div>
                    </motion.div>
                ))}
                {/* Scanning line */}
                <div className="absolute top-0 bottom-0 w-[2px] bg-primary shadow-[0_0_10px_#00f0ff] animate-[scan_4s_linear_infinite]" style={{ right: 0 }} />
            </div>
        </section>
    );
}
