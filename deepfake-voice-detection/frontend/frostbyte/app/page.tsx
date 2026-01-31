import { HeroSection } from "@/components/hero-section";
import LiveCallStreamer from "@/components/LiveCallStreamer";
import { DetectionTimeline } from "@/components/detection-timeline";
import { SystemStrengths } from "@/components/system-strengths";

export default function Home() {
  return (
    <main className="flex min-h-screen flex-col items-center justify-between">
      <HeroSection />

      <div className="w-full bg-gradient-to-b from-background to-panel/50 pt-10 pb-20">
        <div id="detection-panel" className="scroll-mt-20 container mx-auto px-4">
          
          {/* Header for the section */}
          <div className="mb-10 text-center">
            <h2 className="text-3xl font-bold tracking-tight text-white sm:text-4xl">
              Live Voice Analysis
            </h2>
            <p className="mt-4 text-lg text-gray-400">
              Test the system in real-time. Start the simulation and speak into your microphone.
            </p>
          </div>

          {/* THE WORKING COMPONENT IS HERE */}
          <LiveCallStreamer /> 
          
        </div>

        <DetectionTimeline />

        <div id="system-strengths" className="scroll-mt-20">
          <SystemStrengths />
        </div>
      </div>

      <footer className="w-full py-8 border-t border-border mt-auto bg-panel/30">
        <div className="container mx-auto px-4 text-center text-gray-500 text-sm">
          <p>© 2024 Echelon-FrostByte. Real-Time Deepfake Detection System.</p>
        </div>
      </footer>
    </main>
  );
}