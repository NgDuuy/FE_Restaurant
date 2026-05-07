/**
 * Hook to automatically manage WebSocket connection lifecycle
 * Connects on mount, disconnects on unmount
 */

import { useEffect, useCallback } from 'react';
import { useOrder } from '../contexts/OrderContext';

interface UseWebSocketOptions {
    /**
     * Whether to connect automatically on mount
     * @default true
     */
    autoConnect?: boolean;

    /**
     * Called when WebSocket connects
     */
    onConnect?: () => void;

    /**
     * Called when WebSocket disconnects
     */
    onDisconnect?: () => void;

    /**
     * Called when WebSocket encounters an error
     */
    onError?: (error: Error) => void;
}

interface UseWebSocketReturn {
    isConnected: boolean;
    connect: () => Promise<void>;
    disconnect: () => void;
}

/**
 * Hook for managing WebSocket connection lifecycle
 * @param options Configuration options
 * @returns Connection state and control methods
 */
export function useWebSocket(options: UseWebSocketOptions = {}): UseWebSocketReturn {
    const {
        autoConnect = true,
        onConnect,
        onDisconnect,
        onError,
    } = options;

    const { wsConnected, connectWebSocket, disconnectWebSocket } = useOrder();

    // Auto-connect on mount
    useEffect(() => {
        if (autoConnect && !wsConnected) {
            connectWebSocket().catch((error) => {
                console.error('WebSocket auto-connect failed:', error);
                onError?.(error instanceof Error ? error : new Error(String(error)));
            });
        }

        return () => {
            // Optional: disconnect on unmount
            // disconnectWebSocket();
        };
    }, [autoConnect, wsConnected, connectWebSocket, disconnectWebSocket, onError]);

    // Notify when connected
    useEffect(() => {
        if (wsConnected) {
            onConnect?.();
        } else {
            onDisconnect?.();
        }
    }, [wsConnected, onConnect, onDisconnect]);

    const connect = useCallback(async () => {
        await connectWebSocket();
    }, [connectWebSocket]);

    const disconnect = useCallback(() => {
        disconnectWebSocket();
    }, [disconnectWebSocket]);

    return {
        isConnected: wsConnected,
        connect,
        disconnect,
    };
}
