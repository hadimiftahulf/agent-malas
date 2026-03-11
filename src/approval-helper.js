import { createApprovalNotification, getTask, hasPendingNotification } from './db.js';
import { broadcast } from './websocket.js';
import { logger } from './logger.js';

/**
 * Request approval for a task
 * Creates notification and broadcasts to all connected clients
 * @param {string} taskId - Task ID
 * @param {string} notificationType - Type of notification (issue, pr_rejected, etc)
 * @param {string} title - Notification title
 * @param {string} description - Notification description
 * @returns {object} Created notification
 */
export function requestTaskApproval(taskId, notificationType, title, description) {
    try {
        // Check if there's already a pending notification for this task
        if (hasPendingNotification(taskId)) {
            logger.info(`Task ${taskId} already has a pending notification, skipping duplicate`);
            return { notificationId: null, taskId, success: true, skipped: true };
        }

        // Create notification in database
        const result = createApprovalNotification(taskId, notificationType, title, description);

        // Get task details
        const task = getTask(taskId);

        // Broadcast to all connected clients (web + mobile)
        broadcast('approval:request', {
            notificationId: result.lastInsertRowid,
            taskId,
            notificationType,
            title,
            description,
            task: {
                id: task.id,
                title: task.title,
                description: task.description,
                repo: task.repo,
                status: task.status
            },
            timestamp: new Date().toISOString()
        });

        logger.info(`Approval requested for task ${taskId}: ${title}`);

        return {
            notificationId: result.lastInsertRowid,
            taskId,
            success: true
        };
    } catch (error) {
        logger.error(`Error requesting approval for task ${taskId}: ${error.message}`);
        throw error;
    }
}

/**
 * Notify approval response (approved/rejected)
 * @param {string} taskId - Task ID
 * @param {string} status - 'approved' or 'rejected'
 * @param {string} by - Who approved/rejected
 */
export function notifyApprovalResponse(taskId, status, by) {
    try {
        const task = getTask(taskId);

        broadcast('approval:response', {
            taskId,
            status,
            by,
            task: {
                id: task.id,
                title: task.title,
                repo: task.repo
            },
            timestamp: new Date().toISOString()
        });

        logger.info(`Task ${taskId} ${status} by ${by}`);
    } catch (error) {
        logger.error(`Error notifying approval response: ${error.message}`);
    }
}

/**
 * Check if task is approved and ready to execute
 * @param {string} taskId - Task ID
 * @returns {boolean} True if approved, false otherwise
 */
export function isTaskApproved(taskId) {
    try {
        const task = getTask(taskId);
        return task && task.approval_status === 'approved';
    } catch (error) {
        logger.error(`Error checking task approval: ${error.message}`);
        return false;
    }
}

/**
 * Check if task is rejected
 * @param {string} taskId - Task ID
 * @returns {boolean} True if rejected, false otherwise
 */
export function isTaskRejected(taskId) {
    try {
        const task = getTask(taskId);
        return task && task.approval_status === 'rejected';
    } catch (error) {
        logger.error(`Error checking task rejection: ${error.message}`);
        return false;
    }
}

/**
 * Wait for task approval with timeout
 * @param {string} taskId - Task ID
 * @param {number} timeoutMs - Timeout in milliseconds (default: 5 minutes)
 * @returns {Promise<boolean>} True if approved, false if rejected or timeout
 */
export async function waitForApproval(taskId, timeoutMs = 300000) {
    return new Promise((resolve) => {
        const startTime = Date.now();

        const checkInterval = setInterval(() => {
            const task = getTask(taskId);

            if (task.approval_status === 'approved') {
                clearInterval(checkInterval);
                resolve(true);
            } else if (task.approval_status === 'rejected') {
                clearInterval(checkInterval);
                resolve(false);
            } else if (Date.now() - startTime > timeoutMs) {
                clearInterval(checkInterval);
                logger.warn(`Approval timeout for task ${taskId}`);
                resolve(false);
            }
        }, 1000); // Check every second
    });
}
