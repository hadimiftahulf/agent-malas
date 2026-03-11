import express from 'express';
import {
    registerMobileDevice,
    getActiveMobileDevices
} from '../db.js';
import { logger } from '../logger.js';

const router = express.Router();

/**
 * POST /api/mobile/register
 * Register or update a mobile device
 */
router.post('/register', (req, res) => {
    try {
        const { deviceId, deviceName, ipAddress } = req.body;

        if (!deviceId) {
            return res.status(400).json({
                success: false,
                error: 'deviceId is required'
            });
        }

        // Use client IP if not provided
        const clientIp = ipAddress || req.ip || req.connection.remoteAddress;

        registerMobileDevice(deviceId, deviceName || 'Unknown Device', clientIp);

        logger.info(`Mobile device registered: ${deviceId} (${deviceName}) from ${clientIp}`);

        res.json({
            success: true,
            message: 'Device registered successfully',
            device: {
                deviceId,
                deviceName: deviceName || 'Unknown Device',
                ipAddress: clientIp
            }
        });
    } catch (error) {
        logger.error(`Error registering mobile device: ${error.message}`);
        res.status(500).json({
            success: false,
            error: error.message
        });
    }
});

/**
 * GET /api/mobile/devices
 * Get all active mobile devices
 */
router.get('/devices', (req, res) => {
    try {
        const devices = getActiveMobileDevices();

        res.json({
            success: true,
            data: devices
        });
    } catch (error) {
        logger.error(`Error fetching mobile devices: ${error.message}`);
        res.status(500).json({
            success: false,
            error: error.message
        });
    }
});

/**
 * POST /api/mobile/heartbeat
 * Update device last seen timestamp
 */
router.post('/heartbeat', (req, res) => {
    try {
        const { deviceId, deviceName } = req.body;

        if (!deviceId) {
            return res.status(400).json({
                success: false,
                error: 'deviceId is required'
            });
        }

        const clientIp = req.ip || req.connection.remoteAddress;

        registerMobileDevice(deviceId, deviceName || 'Unknown Device', clientIp);

        res.json({
            success: true,
            message: 'Heartbeat received'
        });
    } catch (error) {
        logger.error(`Error processing heartbeat: ${error.message}`);
        res.status(500).json({
            success: false,
            error: error.message
        });
    }
});

/**
 * GET /api/mobile/server-info
 * Get server information for mobile app configuration
 */
router.get('/server-info', (req, res) => {
    try {
        const serverInfo = {
            serverUrl: `http://${req.hostname}:${process.env.PORT || 3000}`,
            wsUrl: `ws://${req.hostname}:${process.env.PORT || 3000}`,
            version: '1.0.0',
            features: {
                approvalWorkflow: true,
                realTimeNotifications: true,
                taskManagement: true
            }
        };

        res.json({
            success: true,
            data: serverInfo
        });
    } catch (error) {
        logger.error(`Error fetching server info: ${error.message}`);
        res.status(500).json({
            success: false,
            error: error.message
        });
    }
});

export default router;
