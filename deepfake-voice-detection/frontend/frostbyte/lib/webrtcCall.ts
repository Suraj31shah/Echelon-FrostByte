
// WebRTCCallManager Class
// Handles P2P Connection + Signaling via WebSocket + Audio Tapping for AI Analysis

export type CallState = "idle" | "joining" | "connected" | "ended" | "error";

interface DetectionResult {
    type: "call_inference";
    label: string;
    confidence: number;
    energy: number;
    timestamp: number;
}

export class WebRTCCallManager {
    private signalingSocket: WebSocket | null = null;
    private peerConnection: RTCPeerConnection | null = null;
    private localStream: MediaStream | null = null;
    private remoteAudioRef: React.RefObject<HTMLAudioElement> | null = null;

    // Callbacks
    public onStateChange: (state: CallState) => void;
    public onDetectionResult: (result: DetectionResult) => void;

    // Audio Analysis Context
    private audioContext: AudioContext | null = null;
    private scriptProcessor: ScriptProcessorNode | null = null;
    private sourceNode: MediaStreamAudioSourceNode | null = null;
    private roomId: string = "";
    private clientId: string = "";

    // ICE Buffering
    private candidateQueue: RTCIceCandidate[] = [];

    constructor(
        onStateChange: (state: CallState) => void,
        onDetectionResult: (result: DetectionResult) => void
    ) {
        this.onStateChange = onStateChange;
        this.onDetectionResult = onDetectionResult;
    }

    // --- 1. INITIALIZE & JOIN ROOM ---
    public async joinRoom(roomId: string) {
        this.roomId = roomId;
        this.onStateChange("joining");

        try {
            // Get Mic - RELAXED PROCESSING
            this.localStream = await navigator.mediaDevices.getUserMedia({
                audio: {
                    echoCancellation: true,  // Re-enabled to prevent feedback loops (False Positives)
                    noiseSuppression: false, // Keep disabled to preserve deepfake artifacts
                    autoGainControl: false,
                    channelCount: 1,
                    sampleRate: 16000 // Request 16k if possible
                },
                video: false
            });

            // Connect Signaling Socket with Sample Rate Query
            const sampleRate = Math.round(this.audioContext?.sampleRate || 48000);
            this.signalingSocket = new WebSocket(`ws://localhost:8000/ws/call/${roomId}?sample_rate=${sampleRate}`);

            this.signalingSocket.onopen = () => {
                console.log(`Connected to Signaling Server (SR: ${sampleRate}Hz)`);
            };

            this.signalingSocket.onmessage = async (event) => {
                const data = JSON.parse(event.data);
                await this.handleSignalingMessage(data);
            };

            this.signalingSocket.onclose = (event) => {
                console.log(`Signaling Closed: ${event.code} - ${event.reason}`);
                if (event.code !== 1000) {
                    this.onStateChange("error");
                }
            };

            this.signalingSocket.onerror = (e) => {
                console.error("Signaling Error Event:", e);
                // Note: WebSocket error events give very little info in JS. 
                // Rely on onclose for codes.
                this.onStateChange("error");
            };

        } catch (err) {
            console.error("Failed to access mic or connect", err);
            this.onStateChange("error");
        }
    }

    // --- 2. SIGNALING HANDLER ---
    private async handleSignalingMessage(data: any) {
        switch (data.type) {
            case "room_created":
                console.log("Room Created, waiting for peer...");
                this.clientId = data.client_id;
                // WAITER: Wait for the other person to join and send an offer.
                await this.setupPeerConnection(false);
                break;

            case "room_joined":
                console.log("Peer Joined Room, initiating call...");
                this.clientId = data.client_id;
                // INITIATOR: Since we just joined and know someone is there, we start.
                await this.setupPeerConnection(true);
                break;

            case "offer":
                if (!this.peerConnection) await this.setupPeerConnection(false);
                await this.peerConnection?.setRemoteDescription(new RTCSessionDescription(data));

                // Process queued candidates
                while (this.candidateQueue.length > 0) {
                    const candidate = this.candidateQueue.shift();
                    await this.peerConnection?.addIceCandidate(candidate!);
                }

                const answer = await this.peerConnection?.createAnswer();
                await this.peerConnection?.setLocalDescription(answer!);
                this.sendSignaling({ type: "answer", sdp: answer?.sdp });
                break;

            case "answer":
                await this.peerConnection?.setRemoteDescription(new RTCSessionDescription(data));
                break;

            case "candidate":
                if (data.candidate) {
                    const candidate = new RTCIceCandidate(data.candidate);
                    if (this.peerConnection?.remoteDescription) {
                        await this.peerConnection.addIceCandidate(candidate);
                    } else {
                        console.log("Buffering ICE candidate (no remote desc yet)");
                        this.candidateQueue.push(candidate);
                    }
                }
                break;

            case "call_inference":
                // This is the AI Result from Backend!
                this.onDetectionResult(data);
                break;
        }
    }

    // --- 3. PEER CONNECTION SETUP ---
    private async setupPeerConnection(isInitiator: boolean) {
        const config = { iceServers: [{ urls: "stun:stun.l.google.com:19302" }] };
        this.peerConnection = new RTCPeerConnection(config);

        // Add Local Tracks
        this.localStream?.getTracks().forEach(track => {
            this.peerConnection?.addTrack(track, this.localStream!);
        });

        // Handle Remote Stream (Play Audio)
        this.peerConnection.ontrack = (event) => {
            console.log("Receiving Remote Audio Track");
            const remoteStream = event.streams[0];

            // Create a hidden audio element to play
            const audioEl = new Audio();
            audioEl.srcObject = remoteStream;
            audioEl.autoplay = true;
            audioEl.play().catch(e => console.error("Auto-play blocked", e));

            this.onStateChange("connected");

            // ⚡ TAP REMOTE AUDIO FOR ANALYSIS ⚡
            // We want to analyze what we Are HEARING (The caller)
            this.tapAudioForAnalysis(remoteStream);
        };

        // ICE Candidates
        this.peerConnection.onicecandidate = (event) => {
            if (event.candidate) {
                this.sendSignaling({ type: "candidate", candidate: event.candidate });
            }
        };

        if (isInitiator) {
            const offer = await this.peerConnection.createOffer();
            await this.peerConnection.setLocalDescription(offer);
            this.sendSignaling({ type: "offer", sdp: offer.sdp });
        }
    }

    // --- 4. AUDIO TAPPING (Security Stream) ---
    private tapAudioForAnalysis(stream: MediaStream) {
        if (!this.signalingSocket) return;

        // Use AudioContext to tap
        const AudioContextClass = window.AudioContext || (window as any).webkitAudioContext;
        this.audioContext = new AudioContextClass();

        this.sourceNode = this.audioContext.createMediaStreamSource(stream);
        this.scriptProcessor = this.audioContext.createScriptProcessor(4096, 1, 1);

        const inputRate = this.audioContext.sampleRate;

        this.scriptProcessor.onaudioprocess = (e) => {
            if (this.signalingSocket?.readyState === WebSocket.OPEN) {
                const rawData = e.inputBuffer.getChannelData(0);
                // SEND RAW DATA (Let Backend Resample)
                this.signalingSocket.send(rawData.buffer);
            }
        };

        this.sourceNode.connect(this.scriptProcessor);
        // Connect to destination via Gain(0) to keep processor alive without echo
        const muteGain = this.audioContext.createGain();
        muteGain.gain.value = 0;
        this.scriptProcessor.connect(muteGain);
        muteGain.connect(this.audioContext.destination);
    }

    private downsampleBuffer(buffer: Float32Array, inputRate: number, outputRate: number) {
        if (outputRate >= inputRate) return buffer;
        const ratio = inputRate / outputRate;
        const newLength = Math.round(buffer.length / ratio);
        const result = new Float32Array(newLength);
        for (let i = 0; i < newLength; i++) {
            result[i] = buffer[Math.round(i * ratio)];
        }
        return result;
    }

    private sendSignaling(msg: any) {
        if (this.signalingSocket?.readyState === WebSocket.OPEN) {
            this.signalingSocket.send(JSON.stringify(msg));
        }
    }

    public cleanup() {
        this.localStream?.getTracks().forEach(t => t.stop());
        this.peerConnection?.close();
        this.signalingSocket?.close();
        this.audioContext?.close();

        this.peerConnection = null;
        this.signalingSocket = null;
        this.onStateChange("ended");
    }
}
