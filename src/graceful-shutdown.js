/**
 * Graceful shutdown handler untuk ensure clean exit
 */
import { logger } from './logger.js';
import { getDb } from './db.js';
import { setAgentStatus } from './agent-state.js';
import { broadcast } from './websocket.js';

let isShuttingDown = false;
let currentTaskPromise = null;
let shutdownCallbacks = [];

/**
 * Register callback to be called during shutdown
 */
export function onShutdown(callback) {
    shutdownCallbacks.push(callback);
}

/**
 * Set current task promise untuk wait during shutdown
 */
export function setCurrentTaskPromise(promise) {
    currentTaskPromise = promise;
}

/**
 * Clear current task promise
 */
export function clearCurrentTaskPromise() {
    currentTaskPromise = null;
}

/**
 * Check if system is shutting down
 */
export function isSystemShuttingDown() {
    return isShuttingDown;
}

/**
 * Wait for current task dengan timeout
 */
async function waitForCurrentTask(timeoutMs = 30000) {
    if (!currentTaskPromise) {
        return;
    }

    logger.info('Waiting for current task to complete...');

    try {
        await Promise.race([
            currentTaskPromise,
            new Promise((_, reject) =>
                setTimeout(() => reject(new Error('Task timeout during shutdown')), timeoutMs)
            ),
        ]);
        logger.info('Current task completed successfully');
    } catch (error) {
        logger.warn(`Current task did not complete in time: ${error.message}`);
    }
}

/**
 * Cleanup stuck tasks in database
 */
function cleanupStuckTasks() {
    try {
        const db = getDb();
        const result = db.prepare(`
      UPDATE tasks 
      SET status = 'failed', 
          error_message = 'System shutdown during processing',
          completed_at = ?
      WHERE status = 'processing'
    `).run(new Date().toISOString());

        if (result.changes > 0) {
            logger.info(`Cleaned up ${result.changes} stuck task(s)`);
        }
    } catch (error) {
        logger.error(`Failed to cleanup stuck tasks: ${error.message}`);
    }
}

/**
 * Main graceful shutdown handler
 */
export async function gracefulShutdown(signal) {
    if (isShuttingDown) {
        logger.warn('Shutdown already in progress...');
        return;
    }

    isShuttingDown = true;
    logger.info(`\n🛑 Received ${signal}. Starting graceful shutdown...`);

    try {
        // 1. Stop accepting new work
        setAgentStatus('stopping');
        broadcast('agent:status', { status: 'stopping', message: 'Shutting down...' });
        logger.info('✓ Stopped accepting new tasks');

        // 2. Wait for current task to finish (with timeout)
        await waitForCurrentTask(30000);
        logger.info('✓ Current task handled');

        // 3. Execute registered shutdown callbacks
        logger.info('Executing shutdown callbacks...');
        for (const callback of shutdownCallbacks) {
            try {
                await callback();
            } catch (error) {
                logger.error(`Shutdown callback failed: ${error.message}`);
            }
        }
        logger.info('✓ Shutdown callbacks executed');

        // 4. Cleanup stuck tasks
        cleanupStuckTasks();
        logger.info('✓ Database cleaned up');

        // 5. Close database connection
        try {
            const db = getDb();
            // Checkpoint WAL to ensure all data is written
            db.pragma('wal_checkpoint(TRUNCATE)');
            db.close();
            logger.info('✓ Database connection closed');
        } catch (error) {
            logger.error(`Failed to close database: ${error.message}`);
        }

        // 6. Notify WebSocket clients
        try {
            broadcast('agent:shutdown', { message: 'Server shutting down' });
            // Give clients time to receive the message
            await new Promise(resolve => setTimeout(resolve, 500));
            logger.info('✓ WebSocket clients notified');
        } catch (error) {
            logger.error(`Failed to notify WebSocket clients: ${error.message}`);
        }

        logger.info('✅ Graceful shutdown completed');
        process.exit(0);

    } catch (error) {
        logger.error(`Error during graceful shutdown: ${error.message}`);
        process.exit(1);
    }
}

/**
 * Setup signal handlers
 */
export function setupGracefulShutdown() {
    // Handle SIGTERM (Docker, Kubernetes, systemd)
    process.on('SIGTERM', () => gracefulShutdown('SIGTERM'));

    // Handle SIGINT (Ctrl+C)
    process.on('SIGINT', () => gracefulShutdown('SIGINT'));

    // Handle uncaught exceptions
    process.on('uncaughtException', (error) => {
        logger.error(`Uncaught Exception: ${error.message}`);
        logger.error(error.stack);
        gracefulShutdown('uncaughtException');
    });

    // Handle unhandled promise rejections
    process.on('unhandledRejection', (reason, promise) => {
        logger.error(`Unhandled Rejection at: ${promise}, reason: ${reason}`);
        gracefulShutdown('unhandledRejection');
    });

    logger.info('Graceful shutdown handlers registered');
}

/**
 * Periodic cleanup task untuk stuck tasks
 */
export function startPeriodicCleanup(intervalMs = 300000) { // 5 minutes
    const interval = setInterval(() => {
        if (isShuttingDown) {
            clearInterval(interval);
            return;
        }

        try {
            const { cleanupStuckTasks } = require('./db-transactions.js');
            const cleaned = cleanupStuckTasks();
            if (cleaned > 0) {
                logger.warn(`Periodic cleanup: recovered ${cleaned} stuck task(s)`);
                broadcast('system:cleanup', { tasksRecovered: cleaned });
            }
        } catch (error) {
            logger.error(`Periodic cleanup failed: ${error.message}`);
        }
    }, intervalMs);

    // Register cleanup on shutdown
    onShutdown(() => {
        clearInterval(interval);
    });

    return interval;
}
