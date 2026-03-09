import { WebSocketServer } from 'ws';
import { logger } from './logger.js';

let wss = null;
const clients = new Set();

/**
 * Setup WebSocket server attached to HTTP server
 * @param {import('http').Server} httpServer
 */
export function setupWebSocket(httpServer) {
    wss = new WebSocketServer({ server: httpServer, path: '/ws' });

    wss.on('connection', (ws, req) => {
        const clientId = `${req.socket.remoteAddress}:${req.socket.remotePort}`;
        logger.info(`[WS] Client connected: ${clientId}`);
        clients.add(ws);

        // Heartbeat mechanism
        ws.isAlive = true;
        ws.on('pong', () => {
            ws.isAlive = true;
        });

        ws.on('message', (data) => {
            try {
                const msg = JSON.parse(data.toString());
                if (msg.type === 'ping') {
                    ws.send(JSON.stringify({ type: 'pong', timestamp: Date.now() }));
                }
            } catch (err) {
                logger.warn(`[WS] Invalid message from ${clientId}: ${err.message}`);
            }
        });

        ws.on('close', () => {
            logger.info(`[WS] Client disconnected: ${clientId}`);
            clients.delete(ws);
        });

        ws.on('error', (err) => {
            logger.error(`[WS] Client error ${clientId}: ${err.message}`);
            clients.delete(ws);
        });

        // Send initial connection success
        ws.send(JSON.stringify({ type: 'connected', timestamp: Date.now() }));
    });

    // Heartbeat interval - ping every 30 seconds
    const heartbeatInterval = setInterval(() => {
        clients.forEach((ws) => {
            if (ws.isAlive === false) {
                clients.delete(ws);
                return ws.terminate();
            }
            ws.isAlive = false;
            ws.ping();
        });
    }, 30000);

    wss.on('close', () => {
        clearInterval(heartbeatInterval);
    });

    logger.info('[WS] WebSocket server initialized');
    return wss;
}

/**
 * Broadcast event to all connected clients
 * @param {string} event - Event type
 * @param {object} data - Event payload
 */
export function broadcast(event, data) {
    if (!wss || clients.size === 0) return;

    const message = JSON.stringify({
        type: event,
        data,
        timestamp: Date.now(),
    });

    let sent = 0;
    clients.forEach((ws) => {
        if (ws.readyState === 1) { // OPEN
            ws.send(message);
            sent++;
        }
    });

    // Don't log broadcasts to avoid infinite loop and spam
    // Only log important events
    if (event === 'task:start' || event === 'task:done' || event === 'task:error') {
        console.log(`[WS] Broadcast ${event} to ${sent} client(s)`);
    }
}

/**
 * Get number of connected clients
 * @returns {number}
 */
export function getConnectedClients() {
    return clients.size;
}
