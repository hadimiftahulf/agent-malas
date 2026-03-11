#!/usr/bin/env node

/**
 * Migration script for PR comments table
 * Run this to ensure the pr_comments table exists
 */

import Database from 'better-sqlite3';
import path from 'path';
import { fileURLToPath } from 'url';
import fs from 'fs-extra';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const dbDir = path.resolve(__dirname, '../data');
const dbPath = path.join(dbDir, 'agent-malas.db');

console.log('🔄 Starting PR comments table migration...');

// Ensure data directory exists
fs.ensureDirSync(dbDir);

// Open database
const db = new Database(dbPath);
db.pragma('journal_mode = WAL');
db.pragma('foreign_keys = ON');

try {
    // Check if table exists
    const tableExists = db.prepare(`
    SELECT name FROM sqlite_master 
    WHERE type='table' AND name='pr_comments'
  `).get();

    if (tableExists) {
        console.log('✓ Table pr_comments already exists');

        // Verify schema
        const columns = db.prepare(`PRAGMA table_info(pr_comments)`).all();
        const columnNames = columns.map(c => c.name);

        const requiredColumns = [
            'id', 'pr_url', 'comment_id', 'comment_type',
            'comment_body', 'file_path', 'line_number',
            'review_id', 'processed', 'processed_at', 'created_at'
        ];

        const missingColumns = requiredColumns.filter(col => !columnNames.includes(col));

        if (missingColumns.length > 0) {
            console.log(`⚠️  Missing columns: ${missingColumns.join(', ')}`);
            console.log('❌ Schema mismatch. Please drop the table and re-run migration.');
            process.exit(1);
        }

        console.log('✓ Schema verified');

        // Show stats
        const stats = db.prepare(`
      SELECT 
        COUNT(*) as total,
        SUM(CASE WHEN processed = 1 THEN 1 ELSE 0 END) as processed,
        SUM(CASE WHEN processed = 0 THEN 1 ELSE 0 END) as unprocessed,
        COUNT(DISTINCT pr_url) as unique_prs
      FROM pr_comments
    `).get();

        console.log('\n📊 Current stats:');
        console.log(`   Total comments: ${stats.total}`);
        console.log(`   Processed: ${stats.processed}`);
        console.log(`   Unprocessed: ${stats.unprocessed}`);
        console.log(`   Unique PRs: ${stats.unique_prs}`);

    } else {
        console.log('⚠️  Table pr_comments does not exist. Creating...');

        db.exec(`
      CREATE TABLE pr_comments (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        pr_url TEXT NOT NULL,
        comment_id TEXT NOT NULL,
        comment_type TEXT NOT NULL,
        comment_body TEXT,
        file_path TEXT,
        line_number INTEGER,
        review_id INTEGER,
        processed BOOLEAN DEFAULT 0,
        processed_at DATETIME,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        UNIQUE(pr_url, comment_id)
      );
      
      CREATE INDEX idx_pr_comments_pr_url ON pr_comments(pr_url);
      CREATE INDEX idx_pr_comments_processed ON pr_comments(processed);
    `);

        console.log('✓ Table pr_comments created successfully');
        console.log('✓ Indexes created');
    }

    console.log('\n✅ Migration completed successfully!');

} catch (error) {
    console.error('❌ Migration failed:', error.message);
    process.exit(1);
} finally {
    db.close();
}
