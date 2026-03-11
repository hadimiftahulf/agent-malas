#!/usr/bin/env node

/**
 * Script to create test PR comments for UI testing
 */

import {
    initDb,
    insertPR,
    insertPRCommentsBatch
} from '../src/db.js';

console.log('🧪 Creating test PR comments for UI testing...\n');

// Initialize database
initDb();

const testPrUrl = 'https://github.com/test/repo/pull/123';

// Create test PR
console.log('1️⃣  Creating test PR...');
try {
    insertPR({
        id: 123,
        title: 'feat: [LP-004-6.3] Redesign ID Card (115)',
        repo: 'idsolutions-id-pemuda-hijrah-project',
        taskId: 'TASK-115',
        status: 'open',
        reviewDecision: 'changes_requested',
        url: testPrUrl,
    });
    console.log('   ✓ Test PR created');
} catch (error) {
    console.log('   ℹ️  PR already exists or error:', error.message);
}

// Create test comments
console.log('\n2️⃣  Creating test comments...');
try {
    const comments = [
        {
            prUrl: testPrUrl,
            commentId: 'review-001',
            commentType: 'review',
            commentBody: 'Please improve the error handling in the authentication flow. The current implementation doesn\'t handle edge cases properly.',
            filePath: null,
            lineNumber: null,
            reviewId: 456
        },
        {
            prUrl: testPrUrl,
            commentId: 'inline-002',
            commentType: 'inline',
            commentBody: 'Add null check here before accessing user properties',
            filePath: 'src/components/AuthCard.jsx',
            lineNumber: 45,
            reviewId: 456
        },
        {
            prUrl: testPrUrl,
            commentId: 'inline-003',
            commentType: 'inline',
            commentBody: 'Use const instead of let for this variable since it\'s never reassigned',
            filePath: 'src/utils/validation.js',
            lineNumber: 12,
            reviewId: 456
        },
        {
            prUrl: testPrUrl,
            commentId: 'review-004',
            commentType: 'review',
            commentBody: 'The component structure looks good, but please add proper TypeScript types for better maintainability.',
            filePath: null,
            lineNumber: null,
            reviewId: 457
        },
        {
            prUrl: testPrUrl,
            commentId: 'inline-005',
            commentType: 'inline',
            commentBody: 'This function is too complex. Consider breaking it down into smaller functions.',
            filePath: 'src/hooks/useAuth.js',
            lineNumber: 78,
            reviewId: 457
        },
        {
            prUrl: testPrUrl,
            commentId: 'inline-006',
            commentType: 'inline',
            commentBody: 'Missing error boundary for this component',
            filePath: 'src/components/IDCard.jsx',
            lineNumber: 23,
            reviewId: 457
        },
        {
            prUrl: testPrUrl,
            commentId: 'review-007',
            commentType: 'review',
            commentBody: 'Great work on the responsive design! Just a few minor issues to address.',
            filePath: null,
            lineNumber: null,
            reviewId: 458
        },
        {
            prUrl: testPrUrl,
            commentId: 'inline-008',
            commentType: 'inline',
            commentBody: 'Consider using CSS Grid instead of Flexbox for this layout',
            filePath: 'src/styles/card.css',
            lineNumber: 34,
            reviewId: 458
        }
    ];

    insertPRCommentsBatch(comments);
    console.log(`   ✓ Created ${comments.length} test comments`);
} catch (error) {
    console.error('   ✗ Failed to create comments:', error.message);
}

// Mark some comments as processed to show progress
console.log('\n3️⃣  Marking some comments as processed...');
try {
    const { getDb } = await import('../src/db.js');
    const db = getDb();

    // Mark first 3 comments as processed
    const result = db.prepare(`
    UPDATE pr_comments 
    SET processed = 1, processed_at = datetime('now') 
    WHERE pr_url = ? AND id IN (
      SELECT id FROM pr_comments WHERE pr_url = ? ORDER BY created_at LIMIT 3
    )
  `).run(testPrUrl, testPrUrl);

    console.log(`   ✓ Marked 3 comments as processed`);
} catch (error) {
    console.error('   ✗ Failed to mark comments:', error.message);
}

// Show final stats
console.log('\n📊 Final stats:');
try {
    const { getDb } = await import('../src/db.js');
    const db = getDb();

    const stats = db.prepare(`
    SELECT 
      COUNT(*) as total,
      SUM(CASE WHEN processed = 1 THEN 1 ELSE 0 END) as processed,
      SUM(CASE WHEN processed = 0 THEN 1 ELSE 0 END) as unprocessed
    FROM pr_comments 
    WHERE pr_url = ?
  `).get(testPrUrl);

    console.log(`   Total: ${stats.total}`);
    console.log(`   Processed: ${stats.processed}`);
    console.log(`   Unprocessed: ${stats.unprocessed}`);
    console.log(`   Progress: ${Math.round((stats.processed / stats.total) * 100)}%`);
} catch (error) {
    console.error('   ✗ Failed to get stats:', error.message);
}

console.log('\n✅ Test data created successfully!');
console.log('\n🎯 Next steps:');
console.log('   1. Start the application: npm start');
console.log('   2. Open browser: http://localhost:3001');
console.log('   3. Go to Pull Requests tab');
console.log('   4. Look for PR #123 with progress bar');
console.log('   5. Click "View Comments" to see the modal');
console.log('\n🧹 To clean up test data:');
console.log(`   sqlite3 data/agent-malas.db "DELETE FROM pr_comments WHERE pr_url = '${testPrUrl}'"`);
console.log(`   sqlite3 data/agent-malas.db "DELETE FROM prs WHERE url = '${testPrUrl}'"`);