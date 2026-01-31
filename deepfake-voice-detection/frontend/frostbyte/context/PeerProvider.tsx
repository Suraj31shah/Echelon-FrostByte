'use client';
import React, { createContext, useContext, useEffect, useState, useRef, useCallback } from 'react';
import { useSocket } from './SocketProvider';

interface PeerContextType {
    localStream: MediaStream | null;
    peers: Record<string, RTCPeerConnection>; // Map peerId -> RTCPeerConnection
    remoteStreams: Record<string, MediaStream>; // Map peerId -> MediaStream
    joinChannel: (channel: string, userdata: any) => void;
    leaveChannel: (channel: string) => void;
    reset: () => void;
}

const PeerContext = createContext<PeerContextType | null>(null);

export const usePeer = () => useContext(PeerContext);

export const PeerProvider = ({ children }: { children: React.ReactNode }) => {
    const socket = useSocket();
    const [localStream, setLocalStream] = useState<MediaStream | null>(null);
    const [peers, setPeers] = useState<Record<string, RTCPeerConnection>>({});
    const [remoteStreams, setRemoteStreams] = useState<Record<string, MediaStream>>({});

    // Refs to access latest state in callbacks/effects without triggering re-runs
    const peersRef = useRef<Record<string, RTCPeerConnection>>({});
    const localStreamRef = useRef<MediaStream | null>(null);

    const ICE_SERVERS = [
        { urls: "stun:stun.l.google.com:19302" },
        { urls: "stun:global.stun.twilio.com:3478" }
    ];

    // Initialize local media
    useEffect(() => {
        const initMedia = async () => {
            try {
                const stream = await navigator.mediaDevices.getUserMedia({ audio: true, video: true });
                setLocalStream(stream);
                localStreamRef.current = stream;
            } catch (err) {
                console.error("Failed to get local media", err);
            }
        };
        initMedia();

        return () => {
            if (localStreamRef.current) {
                localStreamRef.current.getTracks().forEach(track => track.stop());
                localStreamRef.current = null;
                setLocalStream(null);
            }
        };
    }, []);

    const createPeerConnection = useCallback((peerId: string, shouldCreateOffer: boolean) => {
        if (peersRef.current[peerId]) {
            console.log(`Already connected to peer ${peerId}`);
            return;
        }

        console.log(`Creating RTC peer connection for ${peerId}`);
        const pc = new RTCPeerConnection({ iceServers: ICE_SERVERS });
        peersRef.current[peerId] = pc;
        // Update state for UI
        setPeers(prev => ({ ...prev, [peerId]: pc }));

        // Handle ICE Candidates
        pc.onicecandidate = (event) => {
            if (event.candidate) {
                socket?.emit('relayICECandidate', {
                    peer_id: peerId,
                    ice_candidate: {
                        sdpMLineIndex: event.candidate.sdpMLineIndex,
                        candidate: event.candidate.candidate
                    }
                });
            }
        };

        // Handle Track Event (Remote Stream)
        pc.ontrack = (event) => {
            console.log(`Received remote track from ${peerId}`, event.streams[0]);
            setRemoteStreams(prev => ({ ...prev, [peerId]: event.streams[0] }));
        };

        // Add Local Stream
        if (localStreamRef.current) {
            localStreamRef.current.getTracks().forEach(track => {
                pc.addTrack(track, localStreamRef.current!);
            });
        }

        // Create Offer if needed
        if (shouldCreateOffer) {
            pc.createOffer()
                .then(desc => pc.setLocalDescription(desc))
                .then(() => {
                    socket?.emit('relaySessionDescription', {
                        peer_id: peerId,
                        session_description: pc.localDescription
                    });
                })
                .catch(err => console.error("Error sending offer", err));
        }

    }, [socket]);

    const handleAddPeer = useCallback((config: any) => {
        console.log('Signaling server said to add peer:', config);
        const { peer_id, should_create_offer } = config;
        createPeerConnection(peer_id, should_create_offer);
    }, [createPeerConnection]);

    const handleSessionDescription = useCallback(async (config: any) => {
        const { peer_id, session_description } = config;
        const pc = peersRef.current[peer_id];
        if (!pc) {
            console.warn(`Peer connection not found for ${peer_id} during session description`);
            return;
        }

        const desc = new RTCSessionDescription(session_description);
        await pc.setRemoteDescription(desc);

        if (session_description.type === 'offer') {
            const answer = await pc.createAnswer();
            await pc.setLocalDescription(answer);
            socket?.emit('relaySessionDescription', {
                peer_id: peer_id,
                session_description: pc.localDescription
            });
        }
    }, [socket]);

    const handleIceCandidate = useCallback((config: any) => {
        const { peer_id, ice_candidate } = config;
        const pc = peersRef.current[peer_id];
        if (pc) {
            pc.addIceCandidate(new RTCIceCandidate(ice_candidate)).catch(err => console.error(err));
        }
    }, []);

    const handleRemovePeer = useCallback((config: any) => {
        const { peer_id } = config;
        console.log('Removing peer:', peer_id);
        const pc = peersRef.current[peer_id];
        if (pc) {
            pc.close();
            delete peersRef.current[peer_id];
            setPeers(prev => {
                const newPeers = { ...prev };
                delete newPeers[peer_id];
                return newPeers;
            });
            setRemoteStreams(prev => {
                const newStreams = { ...prev };
                delete newStreams[peer_id];
                return newStreams;
            });
        }
    }, []);

    useEffect(() => {
        if (!socket) return;

        socket.on('addPeer', handleAddPeer);
        socket.on('sessionDescription', handleSessionDescription);
        socket.on('iceCandidate', handleIceCandidate);
        socket.on('removePeer', handleRemovePeer);

        return () => {
            socket.off('addPeer', handleAddPeer);
            socket.off('sessionDescription', handleSessionDescription);
            socket.off('iceCandidate', handleIceCandidate);
            socket.off('removePeer', handleRemovePeer);
        };
    }, [socket, handleAddPeer, handleSessionDescription, handleIceCandidate, handleRemovePeer]);


    const joinChannel = useCallback((channel: string, userdata: any) => {
        socket?.emit('join', { channel, userdata });
    }, [socket]);

    const leaveChannel = useCallback((channel: string) => {
        socket?.emit('part', channel);
        // Cleanup all peers
        Object.values(peersRef.current).forEach(pc => pc.close());
        peersRef.current = {};
        setPeers({});
        setRemoteStreams({});
    }, [socket]);

    const reset = useCallback(() => {
        Object.values(peersRef.current).forEach(pc => pc.close());
        peersRef.current = {};
        setPeers({});
        setRemoteStreams({});
    }, []);

    return (
        <PeerContext.Provider value={{
            localStream,
            peers,
            remoteStreams,
            joinChannel,
            leaveChannel,
            reset
        }}>
            {children}
        </PeerContext.Provider>
    );
};
