import notifier from 'node-notifier';
import { logger } from './logger.js';

export function notifyTaskStart(taskId, title) {
    try {
        notifier.notify({
            title: `Task #${taskId} Started`,
            message: title || 'AI is now working on a new task.',
            sound: true,
            wait: false
        });
    } catch (e) {
        logger.warn(`Failed to send desktop notification: ${e.message}`);
    }
}

export function notifyTaskDone(taskId, title) {
    try {
        notifier.notify({
            title: `Task #${taskId} Completed`,
            message: title || 'AI has finished the task.',
            sound: true,
            wait: false
        });
    } catch (e) {
        logger.warn(`Failed to send desktop notification: ${e.message}`);
    }
}

export function notifyTaskError(taskId, error) {
    try {
        notifier.notify({
            title: `Task #${taskId} Failed`,
            message: error || 'An error occurred during execution.',
            sound: true,
            wait: false
        });
    } catch (e) {
        logger.warn(`Failed to send desktop notification: ${e.message}`);
    }
}
