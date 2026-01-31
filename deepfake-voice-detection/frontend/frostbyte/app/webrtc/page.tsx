'use client';
import { useCallback, useEffect, useState, useRef } from 'react';
import { SocketProvider } from '@/context/SocketProvider';
import { PeerProvider, usePeer } from '@/context/PeerProvider';

// Helper component to play audio
const AudioPlayer = ({ stream, muted = false, label }: { stream: MediaStream, muted?: boolean, label: string }) => {
    const audioRef = useRef<HTMLAudioElement>(null);

    useEffect(() => {
        if (audioRef.current && stream) {
            audioRef.current.srcObject = stream;
        }
    }, [stream]);

    return (
        <div className="flex items-center gap-4 bg-gray-900 border border-gray-800 p-4 rounded-lg shadow-md animate-in fade-in zoom-in duration-300">
            <div className="w-10 h-10 rounded-full bg-gradient-to-br from-green-400 to-emerald-600 flex items-center justify-center shadow-lg shadow-green-900/20">
                <svg className="w-5 h-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 11a7 7 0 01-7 7m0 0a7 7 0 01-7-7m7 7v4m0 0H8m4 0h4m-4-8a3 3 0 01-3-3V5a3 3 0 116 0v6a3 3 0 01-3 3z" /></svg>
            </div>
            <div className="flex-1 min-w-0">
                <p className="text-sm font-medium text-white truncate">{label}</p>
                <p className="text-xs text-green-400 flex items-center gap-1">
                    <span className="w-2 h-2 rounded-full bg-green-500 animate-pulse"></span>
                    Connected
                </p>
            </div>
            <audio ref={audioRef} autoPlay playsInline muted={muted} controls={false} />
        </div>
    );
};

const GroupChatContent = () => {
    const { localStream, peers, remoteStreams, peerStates, joinChannel, leaveChannel, reset } = usePeer()!;
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
        <div className="min-h-screen bg-gray-950 text-white flex flex-col p-6 items-center">
            <div className="w-full max-w-3xl">
                <header className="flex justify-between items-center mb-8 pb-4 border-b border-gray-800">
                    <h1 className="text-2xl font-bold bg-gradient-to-r from-green-400 to-teal-500 bg-clip-text text-transparent">
                        Secure Audio Channel
                    </h1>

                    <div className="flex items-center gap-4">
                        {!isJoined ? (
                            <div className="flex gap-2">
                                <input
                                    type="text"
                                    value={channel}
                                    onChange={e => setChannel(e.target.value)}
                                    className="bg-gray-800 border border-gray-700 rounded px-3 py-2 text-sm focus:outline-none focus:border-green-500 transition"
                                    placeholder="Channel Name"
                                />
                                <button
                                    onClick={handleJoin}
                                    className="bg-green-600 hover:bg-green-500 px-4 py-2 rounded text-sm font-semibold transition shadow-lg shadow-green-900/20"
                                >
                                    Join Voice
                                </button>
                            </div>
                        ) : (
                            <div className="flex items-center gap-4">
                                <span className="text-gray-400 text-sm">Channel: <span className="text-white font-mono">{channel}</span></span>
                                <button
                                    onClick={handleLeave}
                                    className="bg-red-900/50 hover:bg-red-900 text-red-200 px-4 py-2 rounded text-sm font-semibold transition border border-red-800"
                                >
                                    Disconnect
                                </button>
                            </div>
                        )}
                    </div>
                </header>

                <main className="space-y-6">
                    {/* Active Participants List */}
                    <div className="bg-gray-900/50 rounded-2xl border border-gray-800 p-6 shadow-xl">
                        <h2 className="text-sm font-semibold text-gray-400 uppercase tracking-wider mb-4 border-b border-gray-800 pb-2">
                            Active Participants ({Object.keys(peers).length + (isJoined ? 1 : 0)})
                        </h2>

                        {!isJoined ? (
                            <div className="text-center py-12 text-gray-500">
                                <div className="w-12 h-12 rounded-full bg-gray-800 mx-auto mb-3 flex items-center justify-center">
                                    <svg className="w-6 h-6 text-gray-600" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 11a7 7 0 01-7 7m0 0a7 7 0 01-7-7m7 7v4m0 0H8m4 0h4m-4-8a3 3 0 01-3-3V5a3 3 0 116 0v6a3 3 0 01-3 3z" /></svg>
                                </div>
                                <p>Join a channel to start talking.</p>
                            </div>
                        ) : (
                            <div className="grid gap-4 md:grid-cols-2">
                                {/* Local User */}
                                {localStream && (
                                    <AudioPlayer stream={localStream} muted label="You" />
                                )}

                                {/* Remote Peers */}
                                {Object.keys(peers).map((peerId) => {
                                    const stream = remoteStreams[peerId];
                                    const state = peerStates[peerId];

                                    if (!stream) {
                                        return (
                                            <div key={peerId} className="flex items-center gap-4 bg-gray-900 border border-gray-800 p-4 rounded-lg shadow-md opacity-70">
                                                <div className="w-10 h-10 rounded-full bg-gray-800 flex items-center justify-center animate-pulse">
                                                    <svg className="w-5 h-5 text-gray-500" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5.121 17.804A13.937 13.937 0 0112 16c2.5 0 4.847.655 6.879 1.804M15 10a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" /></svg>
                                                </div>
                                                <div className="flex-1 min-w-0">
                                                    <p className="text-sm font-medium text-gray-400">User {peerId.substr(0, 5)}...</p>
                                                    <p className="text-xs text-yellow-500 flex items-center gap-1 uppercase">
                                                        Connecting ({state})
                                                    </p>
                                                </div>
                                            </div>
                                        );
                                    }

                                    return (
                                        <AudioPlayer key={peerId} stream={stream} label={`User ${peerId.substr(0, 5)}...`} />
                                    );
                                })}
                            </div>
                        )}
                    </div>

                    {/* Status Info */}
                    {isJoined && (
                        <div className="text-center text-xs text-gray-600 animate-pulse">
                            <span className="inline-block w-2 h-2 bg-green-500 rounded-full mr-2"></span>
                            Secure encrypted connection established
                        </div>
                    )}
                </main>
            </div>
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
