'use client';
import React, { createContext, useMemo, useContext } from 'react';
import { io, Socket } from 'socket.io-client';

const SocketContext = createContext<Socket | null>(null);

export const useSocket = () => {
    const socket = useContext(SocketContext);
    return socket;
};

export const SocketProvider = ({ children }: { children: React.ReactNode }) => {
    const socket = useMemo(() => io('http://localhost:8000', {
        path: '/socket.io',
        transports: ['websocket'],
    }), []);

    return (
        <SocketContext.Provider value={socket}>
            {children}
        </SocketContext.Provider>
    );
};
