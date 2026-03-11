#!/usr/bin/env node

/**
 * Cleanup duplicate notifications and update status for approved tasks
 */

import Database from 'better-sqlite3';
import path from 'path';
import fs from 'fs-extra';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const dbPath = path.resolve(__dirname, '../data/agent-malas.db');

console.log('🔄 Cleaning up duplicate notifications...');
console.log(`📁 Database: ${dbPath}`);

if (!fs.existsSync(dbPath)) {
    console.error('❌ Database file not found!');
    process.exit(1);
}

const db = new Database(dbPath);

try {
    // Update all notifications for approved tasks
    console.log('\n🔧 Updating notifications for approved tasks...');
    const result1 = db.prepare(`
    UPDATE approval_notifications 
    SET status = 'approved', 
        responded_at = CURRENT_TIMESTAMP,
        response_by = 'system-cleanup'
    WHERE task_id IN (
      SELECT id FROM tasks WHERE approval_status = 'approved'
    ) AND status = 'pending'
  `).run();

    console.log(`✅ Updated ${result1.changes} notifications for approved tasks`);

    // Update all notifications for rejected tasks
    console.log('\n🔧 Updating notifications for rejected tasks...');
    const result2 = db.prepare(`
    UPDATE approval_notifications 
    SET status = 'rejected', 
        responded_at = CURRENT_TIMESTAMP,
        response_by = 'system-cleanup'
    WHERE task_id IN (
      SELECT id FROM tasks WHERE approval_status = 'rejected'
    ) AND status = 'pending'
  `).run();

    console.log(`✅ Updated ${result2.changes} notifications for rejected tasks`);

    // Show remaining pending notifications
    const pending = db.prepare(`
    SELECT COUNT(*) as count FROM approval_notifications WHERE status = 'pending'
  `).get();

    console.log(`\n📊 Remaining pending notifications: ${pending.count}`);

    if (pending.count > 0) {
        const pendingList = db.prepare(`
      SELECT task_id, COUNT(*) as count 
      FROM approval_notifications 
      WHERE status = 'pending' 
      GROUP BY task_id
    `).all();

        console.log('\n📋 Pending notifications by task:');
        pendingList.forEach(item => {
            console.log(`  - ${item.task_id}: ${item.count} notification(s)`);
        });
    }

    console.log('\n✅ Cleanup completed successfully!');

} catch (error) {
    console.error('\n❌ Cleanup failed:', error.message);
    console.error(error.stack);
    process.exit(1);
} finally {
    db.close();
}
