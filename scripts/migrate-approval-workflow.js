#!/usr/bin/env node

/**
 * Migration script to add approval workflow columns to existing database
 */

import Database from 'better-sqlite3';
import path from 'path';
import fs from 'fs-extra';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const dbPath = path.resolve(__dirname, '../data/agent-malas.db');

console.log('🔄 Starting approval workflow migration...');
console.log(`📁 Database: ${dbPath}`);

if (!fs.existsSync(dbPath)) {
    console.error('❌ Database file not found!');
    process.exit(1);
}

const db = new Database(dbPath);

try {
    // Check if columns already exist
    const tableInfo = db.prepare("PRAGMA table_info(tasks)").all();
    const columnNames = tableInfo.map(col => col.name);

    console.log('\n📋 Current tasks table columns:', columnNames.join(', '));

    const needsMigration = !columnNames.includes('approval_status');

    if (!needsMigration) {
        console.log('\n✅ Database already has approval workflow columns. No migration needed.');
        process.exit(0);
    }

    console.log('\n🔧 Adding approval workflow columns to tasks table...');

    // Add new columns to tasks table
    db.exec(`
    ALTER TABLE tasks ADD COLUMN approval_status TEXT DEFAULT 'pending';
    ALTER TABLE tasks ADD COLUMN approved_by TEXT;
    ALTER TABLE tasks ADD COLUMN approved_at DATETIME;
    ALTER TABLE tasks ADD COLUMN rejection_reason TEXT;
  `);

    console.log('✅ Added approval workflow columns to tasks table');

    // Create approval_notifications table
    console.log('\n🔧 Creating approval_notifications table...');
    db.exec(`
    CREATE TABLE IF NOT EXISTS approval_notifications (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      task_id TEXT NOT NULL,
      notification_type TEXT NOT NULL,
      title TEXT,
      description TEXT,
      status TEXT DEFAULT 'pending',
      sent_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      responded_at DATETIME,
      response_by TEXT,
      FOREIGN KEY (task_id) REFERENCES tasks(id) ON DELETE CASCADE
    );
    
    CREATE INDEX IF NOT EXISTS idx_approval_notifications_status ON approval_notifications(status);
    CREATE INDEX IF NOT EXISTS idx_approval_notifications_task_id ON approval_notifications(task_id);
  `);

    console.log('✅ Created approval_notifications table');

    // Create mobile_devices table
    console.log('\n🔧 Creating mobile_devices table...');
    db.exec(`
    CREATE TABLE IF NOT EXISTS mobile_devices (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      device_id TEXT UNIQUE NOT NULL,
      device_name TEXT,
      ip_address TEXT,
      last_seen DATETIME DEFAULT CURRENT_TIMESTAMP,
      is_active BOOLEAN DEFAULT 1,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    );
    
    CREATE INDEX IF NOT EXISTS idx_mobile_devices_active ON mobile_devices(is_active);
  `);

    console.log('✅ Created mobile_devices table');

    // Create index for approval_status
    console.log('\n🔧 Creating indexes...');
    db.exec(`
    CREATE INDEX IF NOT EXISTS idx_tasks_approval_status ON tasks(approval_status);
  `);

    console.log('✅ Created indexes');

    // Verify migration
    console.log('\n🔍 Verifying migration...');
    const newTableInfo = db.prepare("PRAGMA table_info(tasks)").all();
    const newColumnNames = newTableInfo.map(col => col.name);

    const requiredColumns = ['approval_status', 'approved_by', 'approved_at', 'rejection_reason'];
    const allColumnsExist = requiredColumns.every(col => newColumnNames.includes(col));

    if (allColumnsExist) {
        console.log('✅ All required columns exist');
    } else {
        console.error('❌ Some columns are missing!');
        process.exit(1);
    }

    // Check tables
    const tables = db.prepare("SELECT name FROM sqlite_master WHERE type='table'").all();
    const tableNames = tables.map(t => t.name);

    console.log('\n📋 Database tables:', tableNames.join(', '));

    const requiredTables = ['approval_notifications', 'mobile_devices'];
    const allTablesExist = requiredTables.every(table => tableNames.includes(table));

    if (allTablesExist) {
        console.log('✅ All required tables exist');
    } else {
        console.error('❌ Some tables are missing!');
        process.exit(1);
    }

    console.log('\n✅ Migration completed successfully!');
    console.log('\n📊 Summary:');
    console.log('  - Added 4 columns to tasks table');
    console.log('  - Created approval_notifications table');
    console.log('  - Created mobile_devices table');
    console.log('  - Created necessary indexes');
    console.log('\n🚀 You can now start the application with: yarn start');

} catch (error) {
    console.error('\n❌ Migration failed:', error.message);
    console.error(error.stack);
    process.exit(1);
} finally {
    db.close();
}
