/**
 * Database transaction helpers untuk ensure data consistency
 */
import { getDb } from './db.js';

/**
 * Execute operations dalam transaction dengan automatic rollback on error
 */
export function withTransaction(callback) {
    const db = getDb();
    const transaction = db.transaction(callback);
    return transaction();
}

/**
 * Process task dengan transaction - ensure task status dan PR insert atomic
 */
export function processTaskTransaction(taskId, operations) {
    const db = getDb();

    const transaction = db.transaction(() => {
        // Update task status to processing
        db.prepare('UPDATE tasks SET status = ?, started_at = ? WHERE id = ?')
            .run('processing', new Date().toISOString(), taskId);

        try {
            // Execute the actual operations (git, AI, etc)
            const result = operations();

            if (result.success) {
                // Success: update task and insert PR atomically
                db.prepare('UPDATE tasks SET status = ?, completed_at = ?, pr_number = ? WHERE id = ?')
                    .run('done', new Date().toISOString(), result.prNumber, taskId);

                if (result.pr) {
                    db.prepare(`
            INSERT INTO prs (id, title, repo, task_id, status, review_decision, url, created_at, updated_at)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
            ON CONFLICT(url) DO UPDATE SET
              title = excluded.title,
              status = excluded.status,
              review_decision = excluded.review_decision,
              updated_at = excluded.updated_at
          `).run(
                        result.pr.id,
                        result.pr.title,
                        result.pr.repo,
                        taskId,
                        result.pr.status || 'open',
                        result.pr.reviewDecision || 'pending',
                        result.pr.url,
                        new Date().toISOString(),
                        new Date().toISOString()
                    );
                }

                return result;
            } else {
                // Failure: mark as failed with error message
                db.prepare('UPDATE tasks SET status = ?, completed_at = ?, error_message = ? WHERE id = ?')
                    .run('failed', new Date().toISOString(), result.error || 'Unknown error', taskId);

                return result;
            }
        } catch (error) {
            // Exception during operations: mark as failed
            db.prepare('UPDATE tasks SET status = ?, completed_at = ?, error_message = ? WHERE id = ?')
                .run('failed', new Date().toISOString(), error.message, taskId);

            throw error; // Re-throw to trigger rollback
        }
    });

    return transaction();
}

/**
 * Update task status dengan automatic timestamp
 */
export function updateTaskStatusAtomic(taskId, status, extra = {}) {
    const db = getDb();

    const transaction = db.transaction(() => {
        const updates = { status, id: taskId };
        const sets = ['status = @status'];

        if (extra.prNumber !== undefined) {
            sets.push('pr_number = @prNumber');
            updates.prNumber = extra.prNumber;
        }

        if (extra.errorMessage !== undefined) {
            sets.push('error_message = @errorMessage');
            updates.errorMessage = extra.errorMessage;
        }

        if (status === 'done' || status === 'failed') {
            sets.push('completed_at = @completedAt');
            updates.completedAt = new Date().toISOString();
        }

        if (status === 'processing') {
            sets.push('started_at = @startedAt');
            updates.startedAt = new Date().toISOString();
        }

        const stmt = db.prepare(`UPDATE tasks SET ${sets.join(', ')} WHERE id = @id`);
        return stmt.run(updates);
    });

    return transaction();
}

/**
 * Cleanup stuck tasks (processing for > 1 hour)
 */
export function cleanupStuckTasks() {
    const db = getDb();
    const oneHourAgo = new Date(Date.now() - 60 * 60 * 1000).toISOString();

    const transaction = db.transaction(() => {
        const result = db.prepare(`
      UPDATE tasks 
      SET status = 'failed', 
          error_message = 'Task stuck in processing state - auto-recovered',
          completed_at = ?
      WHERE status = 'processing' 
        AND started_at < ?
    `).run(new Date().toISOString(), oneHourAgo);

        return result.changes;
    });

    return transaction();
}

/**
 * Acquire lock untuk task processing (prevent concurrent processing)
 */
export function acquireTaskLock(taskId) {
    const db = getDb();

    try {
        const transaction = db.transaction(() => {
            const task = db.prepare('SELECT status FROM tasks WHERE id = ?').get(taskId);

            if (!task) {
                throw new Error('Task not found');
            }

            if (task.status === 'processing') {
                throw new Error('Task already being processed');
            }

            if (task.status === 'done' || task.status === 'failed') {
                throw new Error('Task already completed');
            }

            // Lock the task
            db.prepare('UPDATE tasks SET status = ?, started_at = ? WHERE id = ?')
                .run('processing', new Date().toISOString(), taskId);

            return true;
        });

        return transaction();
    } catch (error) {
        return false;
    }
}

/**
 * Release task lock (set back to queued)
 */
export function releaseTaskLock(taskId) {
    const db = getDb();

    const transaction = db.transaction(() => {
        db.prepare('UPDATE tasks SET status = ?, started_at = NULL WHERE id = ? AND status = ?')
            .run('queued', taskId, 'processing');
    });

    return transaction();
}
