import { Router } from 'express';
import os from 'os';
import { logger } from '../logger.js';

export const serverInfoRouter = Router();

/**
 * GET /api/server-info
 * Returns server IP address and port for QR code generation
 * 
 * Response format:
 * {
 *   success: true,
 *   ipAddress: "192.168.1.50",
 *   port: 3001,
 *   timestamp: 1704067200000
 * }
 */
serverInfoRouter.get('/', (req, res) => {
    try {
        const ipAddress = getLocalIPAddress();
        const port = process.env.PORT || 3001;

        if (!ipAddress) {
            throw new Error('Could not detect local IP address');
        }

        res.json({
            success: true,
            ipAddress,
            port: parseInt(port),
            timestamp: Date.now()
        });
    } catch (error) {
        logger.error(`Error getting server info: ${error.message}`);
        res.status(500).json({
            success: false,
            error: 'Failed to retrieve server information'
        });
    }
});

/**
 * Get local network IP address (not localhost)
 * Prioritizes 192.168.x.x and 10.x.x.x network ranges
 * 
 * @returns {string} Local IP address or '127.0.0.1' as fallback
 */
function getLocalIPAddress() {
    const interfaces = os.networkInterfaces();

    // Priority order: 192.168.x.x > 10.x.x.x > other private IPs
    const priorities = [
        (ip) => ip.startsWith('192.168.'),
        (ip) => ip.startsWith('10.'),
        (ip) => !ip.startsWith('127.') && !ip.startsWith('169.254.')
    ];

    for (const priority of priorities) {
        for (const name of Object.keys(interfaces)) {
            const iface = interfaces[name];
            if (!iface) continue;

            for (const details of iface) {
                // Only consider IPv4 addresses that are not internal
                if (details.family === 'IPv4' && !details.internal && priority(details.address)) {
                    return details.address;
                }
            }
        }
    }

    // Fallback to localhost if no network interface found
    return '127.0.0.1';
}

export default serverInfoRouter;
