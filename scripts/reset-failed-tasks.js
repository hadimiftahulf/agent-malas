#!/usr/bin/env node
/**
 * Script untuk reset failed tasks ke status 'pending'
 * Usage: node scripts/reset-failed-tasks.js [task-id]
 */

import Database from 'better-sqlite3';
import { logger } from '../src/logger.js';

const db = new Database('data/agent-malas.db');

const taskId = process.argv[2];

if (taskId) {
    // Reset specific task
    const result = db.prepare(`
    UPDATE tasks 
    SET status = 'pending', 
        error_message = NULL,
        retry_count = 0
    WHERE id = ?
  `).run(taskId);

    if (result.changes > 0) {
        logger.info(`✅ Task ${taskId} has been reset to pending`);
        console.log(`✅ Task ${taskId} has been reset to pending`);
    } else {
        logger.warn(`⚠️  Task ${taskId} not found`);
        console.log(`⚠️  Task ${taskId} not found`);
    }
} else {
    // Reset all failed tasks
    const result = db.prepare(`
    UPDATE tasks 
    SET status = 'pending', 
        error_message = NULL,
        retry_count = 0
    WHERE status = 'failed'
  `).run();

    logger.info(`✅ Reset ${result.changes} failed tasks to pending`);
    console.log(`✅ Reset ${result.changes} failed tasks to pending`);
}

db.close();
