#!/usr/bin/env node
/**
 * Script untuk delete failed tasks
 * Usage: node scripts/delete-failed-tasks.js [task-id]
 */

import Database from 'better-sqlite3';
import { logger } from '../src/logger.js';

const db = new Database('data/agent-malas.db');

const taskId = process.argv[2];

if (taskId) {
    // Delete specific task
    const result = db.prepare('DELETE FROM tasks WHERE id = ?').run(taskId);

    if (result.changes > 0) {
        logger.info(`✅ Task ${taskId} has been deleted`);
        console.log(`✅ Task ${taskId} has been deleted`);
    } else {
        logger.warn(`⚠️  Task ${taskId} not found`);
        console.log(`⚠️  Task ${taskId} not found`);
    }
} else {
    // Delete all failed tasks
    const result = db.prepare('DELETE FROM tasks WHERE status = ?').run('failed');

    logger.info(`✅ Deleted ${result.changes} failed tasks`);
    console.log(`✅ Deleted ${result.changes} failed tasks`);
}

db.close();
