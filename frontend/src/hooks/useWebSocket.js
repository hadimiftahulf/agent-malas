import { useState, useEffect, useRef, useCallback } from 'react';

const MAX_LOGS = 500;

// Connect directly to backend — bypass Vite proxy to avoid ECONNRESET
const BACKEND_PORT = 3001;
const isProduction = window.location.port === String(BACKEND_PORT);
const WS_URL = isProduction
  ? `${window.location.protocol === 'https:' ? 'wss:' : 'ws:'}//${window.location.host}/ws`
  : `ws://localhost:${BACKEND_PORT}/ws`;

/**
 * WebSocket hook with auto-reconnect and log buffer
 * @returns {{ connected: boolean, lastEvent: object, logs: array, clearLogs: function }}
 */
export function useWebSocket() {
    const [connected, setConnected] = useState(false);
    const [lastEvent, setLastEvent] = useState(null);
    const [logs, setLogs] = useState([]);

    const wsRef = useRef(null);
    const reconnectTimeoutRef = useRef(null);
    const reconnectDelayRef = useRef(1000);

    const clearLogs = useCallback(() => {
        setLogs([]);
    }, []);

    const connect = useCallback(() => {
        if (wsRef.current?.readyState === WebSocket.OPEN) return;

        try {
            const ws = new WebSocket(WS_URL);
            wsRef.current = ws;

            ws.onopen = () => {
                console.log('[WS] Connected');
                setConnected(true);
                reconnectDelayRef.current = 1000; // Reset backoff
            };

            ws.onmessage = (event) => {
                try {
                    const message = JSON.parse(event.data);

                    // Handle different event types
                    if (message.type === 'log') {
                        setLogs((prev) => {
                            const newLogs = [...prev, message.data];
                            // Keep only last MAX_LOGS entries (ring buffer)
                            return newLogs.slice(-MAX_LOGS);
                        });
                    }

                    // Update last event for all types
                    setLastEvent(message);
                } catch (err) {
                    console.error('[WS] Failed to parse message:', err);
                }
            };

            ws.onerror = (error) => {
                console.error('[WS] Error:', error);
            };

            ws.onclose = () => {
                console.log('[WS] Disconnected');
                setConnected(false);
                wsRef.current = null;

                // Exponential backoff reconnect
                const delay = Math.min(reconnectDelayRef.current, 30000);
                console.log(`[WS] Reconnecting in ${delay}ms...`);

                reconnectTimeoutRef.current = setTimeout(() => {
                    reconnectDelayRef.current = Math.min(delay * 2, 30000);
                    connect();
                }, delay);
            };
        } catch (err) {
            console.error('[WS] Connection failed:', err);
            setConnected(false);
        }
    }, []);

    useEffect(() => {
        connect();

        return () => {
            if (reconnectTimeoutRef.current) {
                clearTimeout(reconnectTimeoutRef.current);
            }
            if (wsRef.current) {
                wsRef.current.close();
            }
        };
    }, [connect]);

    return { connected, lastEvent, logs, clearLogs };
}
