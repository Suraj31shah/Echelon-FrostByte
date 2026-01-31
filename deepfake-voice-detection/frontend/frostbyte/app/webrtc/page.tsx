'use client';
import { useCallback, useEffect, useState, useRef } from 'react';
import { SocketProvider } from '@/context/SocketProvider';
import { PeerProvider, usePeer } from '@/context/PeerProvider';

// Helper component to render video from MediaStream
const VideoPlayer = ({ stream, muted = false, label }: { stream: MediaStream, muted?: boolean, label: string }) => {
    const videoRef = useRef<HTMLVideoElement>(null);

    useEffect(() => {
        if (videoRef.current && stream) {
            videoRef.current.srcObject = stream;
        }
    }, [stream]);

    return (
        <div className="relative bg-gray-900 rounded-lg overflow-hidden aspect-video border border-gray-800 shadow-lg">
            <video
                ref={videoRef}
                autoPlay
                playsInline
                muted={muted}
                className="w-full h-full object-cover transform scale-x-[-1]" // Mirror effect
            />
            <div className="absolute bottom-2 left-2 bg-black/60 px-2 py-1 rounded text-xs text-white">
                {label}
            </div>
        </div>
    );
};

const GroupChatContent = () => {
    const { localStream, remoteStreams, joinChannel, leaveChannel, reset } = usePeer()!;
    const [channel, setChannel] = useState('lobby');
    const [isJoined, setIsJoined] = useState(false);

    const handleJoin = useCallback(() => {
        if (!channel) return;
        joinChannel(channel, { name: 'User-' + Math.floor(Math.random() * 1000) });
        setIsJoined(true);
    }, [channel, joinChannel]);

    const handleLeave = useCallback(() => {
        leaveChannel(channel);
        setIsJoined(false);
    }, [channel, leaveChannel]);

    return (
        <div className="min-h-screen bg-gray-950 text-white flex flex-col p-6">
            <header className="flex justify-between items-center mb-8 pb-4 border-b border-gray-800">
                <h1 className="text-2xl font-bold bg-gradient-to-r from-purple-400 to-pink-500 bg-clip-text text-transparent">
                    Echelon Group Chat
                </h1>
                <div className="flex items-center gap-4">
                    {!isJoined ? (
                        <div className="flex gap-2">
                            <input
                                type="text"
                                value={channel}
                                onChange={e => setChannel(e.target.value)}
                                className="bg-gray-800 border border-gray-700 rounded px-3 py-2 text-sm focus:outline-none focus:border-purple-500"
                                placeholder="Channel Name"
                            />
                            <button
                                onClick={handleJoin}
                                className="bg-purple-600 hover:bg-purple-500 px-4 py-2 rounded text-sm font-semibold transition"
                            >
                                Join Channel
                            </button>
                        </div>
                    ) : (
                        <div className="flex items-center gap-4">
                            <span className="text-gray-400 text-sm">Active in: <span className="text-white font-mono">{channel}</span></span>
                            <button
                                onClick={handleLeave}
                                className="bg-red-900/50 hover:bg-red-900 text-red-200 px-4 py-2 rounded text-sm font-semibold transition border border-red-800"
                            >
                                Leave
                            </button>
                        </div>
                    )}
                </div>
            </header>

            <main className="flex-1">
                {/* Grid Layout */}
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
                    {/* Local Stream */}
                    {localStream && (
                        <VideoPlayer stream={localStream} muted label="You (Local)" />
                    )}

                    {/* Remote Streams */}
                    {Object.entries(remoteStreams).map(([peerId, stream]) => (
                        <VideoPlayer key={peerId} stream={stream} label={`Peer ${peerId.substr(0, 5)}...`} />
                    ))}

                    {/* Placeholder if empty */}
                    {isJoined && Object.keys(remoteStreams).length === 0 && (
                        <div className="col-span-full flex items-center justify-center h-64 border-2 border-dashed border-gray-800 rounded-xl text-gray-500">
                            Waiting for others to join {channel}...
                        </div>
                    )}
                </div>

                {!isJoined && (
                    <div className="flex flex-col items-center justify-center h-96 text-center text-gray-500 space-y-4">
                        <div className="w-16 h-16 bg-gray-900 rounded-full flex items-center justify-center">
                            <svg className="w-8 h-8 text-gray-600" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" /></svg>
                        </div>
                        <p>Enter a channel name and join to start a group video chat.</p>
                    </div>
                )}
            </main>
        </div>
    );
};

export default function Page() {
    return (
        <SocketProvider>
            <PeerProvider>
                <GroupChatContent />
            </PeerProvider>
        </SocketProvider>
    );
}
