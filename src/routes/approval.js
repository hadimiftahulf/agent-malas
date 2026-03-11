import express from 'express';
import {
    createApprovalNotification,
    getPendingApprovals,
    updateApprovalStatus,
    updateTaskApproval,
    getTasksPendingApproval,
    getApprovalNotificationByTaskId,
    getTask,
    getDb
} from '../db.js';
import { logger } from '../logger.js';
import { notifyApprovalResponse } from '../approval-helper.js';

const router = express.Router();

/**
 * GET /api/approval/pending
 * Get all pending approval notifications
 */
router.get('/pending', (req, res) => {
    try {
        const pendingApprovals = getPendingApprovals();

        // Enrich with task details
        const enrichedApprovals = pendingApprovals.map(approval => {
            const task = getTask(approval.task_id);
            return {
                ...approval,
                task
            };
        });

        res.json({
            success: true,
            data: enrichedApprovals
        });
    } catch (error) {
        logger.error(`Error fetching pending approvals: ${error.message}`);
        res.status(500).json({
            success: false,
            error: error.message
        });
    }
});

/**
 * GET /api/approval/tasks
 * Get all tasks pending approval
 */
router.get('/tasks', (req, res) => {
    try {
        const tasks = getTasksPendingApproval();

        // Enrich with notification details
        const enrichedTasks = tasks.map(task => {
            const notification = getApprovalNotificationByTaskId(task.id);
            return {
                ...task,
                notification
            };
        });

        res.json({
            success: true,
            data: enrichedTasks
        });
    } catch (error) {
        logger.error(`Error fetching tasks pending approval: ${error.message}`);
        res.status(500).json({
            success: false,
            error: error.message
        });
    }
});

/**
 * POST /api/approval/:notificationId/approve
 * Approve a task
 */
router.post('/:notificationId/approve', (req, res) => {
    try {
        const { notificationId } = req.params;
        const { approvedBy, deviceId } = req.body;

        // Get notification to find task
        const notifications = getPendingApprovals();
        const notification = notifications.find(n => n.id === parseInt(notificationId));

        if (!notification) {
            return res.status(404).json({
                success: false,
                error: 'Notification not found'
            });
        }

        // Update notification status
        updateApprovalStatus(notificationId, 'approved', approvedBy || deviceId || 'unknown');

        // Update task approval status
        updateTaskApproval(notification.task_id, 'approved', approvedBy || deviceId || 'unknown');

        // Notify via WebSocket
        notifyApprovalResponse(notification.task_id, 'approved', approvedBy || deviceId || 'unknown');

        logger.info(`Task ${notification.task_id} approved by ${approvedBy || deviceId}`);

        res.json({
            success: true,
            message: 'Task approved successfully',
            taskId: notification.task_id
        });
    } catch (error) {
        logger.error(`Error approving task: ${error.message}`);
        res.status(500).json({
            success: false,
            error: error.message
        });
    }
});

/**
 * POST /api/approval/:notificationId/reject
 * Reject a task
 */
router.post('/:notificationId/reject', (req, res) => {
    try {
        const { notificationId } = req.params;
        const { rejectedBy, reason, deviceId } = req.body;

        // Get notification to find task
        const notifications = getPendingApprovals();
        const notification = notifications.find(n => n.id === parseInt(notificationId));

        if (!notification) {
            return res.status(404).json({
                success: false,
                error: 'Notification not found'
            });
        }

        // Update notification status
        updateApprovalStatus(notificationId, 'rejected', rejectedBy || deviceId || 'unknown');

        // Update task approval status
        updateTaskApproval(notification.task_id, 'rejected', rejectedBy || deviceId || 'unknown', reason);

        // Notify via WebSocket
        notifyApprovalResponse(notification.task_id, 'rejected', rejectedBy || deviceId || 'unknown');

        logger.info(`Task ${notification.task_id} rejected by ${rejectedBy || deviceId}: ${reason || 'No reason provided'}`);

        res.json({
            success: true,
            message: 'Task rejected successfully',
            taskId: notification.task_id
        });
    } catch (error) {
        logger.error(`Error rejecting task: ${error.message}`);
        res.status(500).json({
            success: false,
            error: error.message
        });
    }
});

/**
 * POST /api/approval/task/:taskId/approve
 * Approve a task directly by task ID
 */
router.post('/task/:taskId/approve', (req, res) => {
    try {
        const { taskId } = req.params;
        const { approvedBy, deviceId } = req.body;

        const task = getTask(taskId);
        if (!task) {
            return res.status(404).json({
                success: false,
                error: 'Task not found'
            });
        }

        // Update task approval status
        updateTaskApproval(taskId, 'approved', approvedBy || deviceId || 'unknown');

        // Update ALL notifications for this task (not just one)
        const db = getDb();
        db.prepare(`
            UPDATE approval_notifications 
            SET status = 'approved', 
                responded_at = CURRENT_TIMESTAMP, 
                response_by = ?
            WHERE task_id = ? AND status = 'pending'
        `).run(approvedBy || deviceId || 'unknown', taskId);

        // Notify via WebSocket
        notifyApprovalResponse(taskId, 'approved', approvedBy || deviceId || 'unknown');

        logger.info(`Task ${taskId} approved by ${approvedBy || deviceId}`);

        res.json({
            success: true,
            message: 'Task approved successfully',
            taskId
        });
    } catch (error) {
        logger.error(`Error approving task: ${error.message}`);
        res.status(500).json({
            success: false,
            error: error.message
        });
    }
});

/**
 * POST /api/approval/task/:taskId/reject
 * Reject a task directly by task ID
 */
router.post('/task/:taskId/reject', (req, res) => {
    try {
        const { taskId } = req.params;
        const { rejectedBy, reason, deviceId } = req.body;

        const task = getTask(taskId);
        if (!task) {
            return res.status(404).json({
                success: false,
                error: 'Task not found'
            });
        }

        // Update task approval status
        updateTaskApproval(taskId, 'rejected', rejectedBy || deviceId || 'unknown', reason);

        // Update ALL notifications for this task (not just one)
        const db = getDb();
        db.prepare(`
            UPDATE approval_notifications 
            SET status = 'rejected', 
                responded_at = CURRENT_TIMESTAMP, 
                response_by = ?
            WHERE task_id = ? AND status = 'pending'
        `).run(rejectedBy || deviceId || 'unknown', taskId);

        // Notify via WebSocket
        notifyApprovalResponse(taskId, 'rejected', rejectedBy || deviceId || 'unknown');

        logger.info(`Task ${taskId} rejected by ${rejectedBy || deviceId}: ${reason || 'No reason provided'}`);

        res.json({
            success: true,
            message: 'Task rejected successfully',
            taskId
        });
    } catch (error) {
        logger.error(`Error rejecting task: ${error.message}`);
        res.status(500).json({
            success: false,
            error: error.message
        });
    }
});

export default router;
