#!/usr/bin/env node

/**
 * Debug script to check PR comment detection and processing
 * Usage: node scripts/debug-pr-comments.js <PR_URL>
 */

import { execa } from 'execa';
import { logger } from '../src/logger.js';
import {
    getUnprocessedComments,
    getProcessedCommentCount,
    getAllPRComments,
    insertPRCommentsBatch
} from '../src/db.js';

const prUrl = process.argv[2];
if (!prUrl) {
    console.error('Usage: node scripts/debug-pr-comments.js <PR_URL>');
    console.error('Example: node scripts/debug-pr-comments.js https://github.com/owner/repo/pull/123');
    process.exit(1);
}

// Extract repo and PR number from URL
const urlMatch = prUrl.match(/github\.com\/([^\/]+\/[^\/]+)\/pull\/(\d+)/);
if (!urlMatch) {
    console.error('Invalid GitHub PR URL format');
    process.exit(1);
}

const [, repoName, prNumber] = urlMatch;

async function debugPRComments() {
    try {
        console.log(`🔍 Debugging PR comments for: ${prUrl}`);
        console.log(`📁 Repository: ${repoName}`);
        console.log(`🔢 PR Number: ${prNumber}`);
        console.log('');

        // 1. Check current database state
        console.log('📊 Current Database State:');
        const existingComments = getAllPRComments(prUrl);
        const unprocessedCount = getUnprocessedComments(prUrl).length;
        const processedCount = getProcessedCommentCount(prUrl);

        console.log(`   Total in DB: ${existingComments.length}`);
        console.log(`   Unprocessed: ${unprocessedCount}`);
        console.log(`   Processed: ${processedCount}`);
        console.log('');

        if (existingComments.length > 0) {
            console.log('📝 Existing Comments in Database:');
            existingComments.forEach((comment, i) => {
                console.log(`   ${i + 1}. [${comment.comment_type}] ${comment.processed ? '✅' : '⏳'} ${comment.comment_id}`);
                console.log(`      Body: "${comment.comment_body.substring(0, 100)}..."`);
                if (comment.file_path) {
                    console.log(`      File: ${comment.file_path}:${comment.line_number}`);
                }
                console.log('');
            });
        }

        // 2. Fetch fresh data from GitHub
        console.log('🔄 Fetching Fresh Data from GitHub...');

        // Get all reviews
        const { stdout: reviewsJson } = await execa('gh', ['api', `repos/${repoName}/pulls/${prNumber}/reviews`]);
        const reviews = JSON.parse(reviewsJson);

        const actionableReviews = reviews
            .filter(r => r.state === 'CHANGES_REQUESTED' || r.state === 'COMMENTED')
            .sort((a, b) => new Date(b.submitted_at) - new Date(a.submitted_at));

        console.log(`📋 Found ${reviews.length} total reviews, ${actionableReviews.length} actionable`);

        // Get all inline comments
        const { stdout: inlineJson } = await execa('gh', ['api', `repos/${repoName}/pulls/${prNumber}/comments`]);
        const inlineComments = JSON.parse(inlineJson);

        console.log(`💬 Found ${inlineComments.length} inline comments`);
        console.log('');

        // 3. Show what would be stored
        console.log('📥 Comments that would be stored:');
        const commentsToStore = [];

        // Review comments
        actionableReviews.forEach((review, i) => {
            if (review.body && review.body.trim()) {
                console.log(`   ${i + 1}. [REVIEW] review-${review.id}`);
                console.log(`      State: ${review.state}`);
                console.log(`      Body: "${review.body.substring(0, 100)}..."`);
                console.log(`      Submitted: ${review.submitted_at}`);
                console.log('');

                commentsToStore.push({
                    prUrl: prUrl,
                    commentId: `review-${review.id}`,
                    commentType: 'review',
                    commentBody: review.body,
                    reviewId: review.id
                });
            }
        });

        // Inline comments
        inlineComments.forEach((comment, i) => {
            if (comment.body && comment.body.trim()) {
                console.log(`   ${actionableReviews.length + i + 1}. [INLINE] inline-${comment.id}`);
                console.log(`      File: ${comment.path}:${comment.line || comment.original_line}`);
                console.log(`      Body: "${comment.body.substring(0, 100)}..."`);
                console.log(`      Review ID: ${comment.pull_request_review_id}`);
                console.log('');

                commentsToStore.push({
                    prUrl: prUrl,
                    commentId: `inline-${comment.id}`,
                    commentType: 'inline',
                    commentBody: comment.body,
                    filePath: comment.path,
                    lineNumber: comment.line || comment.original_line,
                    reviewId: comment.pull_request_review_id
                });
            }
        });

        console.log(`📊 Summary: ${commentsToStore.length} comments would be stored`);
        console.log('');

        // 4. Ask if user wants to store them
        if (commentsToStore.length > 0) {
            console.log('💾 Do you want to store these comments in the database? (y/N)');

            // Simple readline for confirmation
            const readline = await import('readline');
            const rl = readline.createInterface({
                input: process.stdin,
                output: process.stdout
            });

            rl.question('', (answer) => {
                if (answer.toLowerCase() === 'y' || answer.toLowerCase() === 'yes') {
                    try {
                        insertPRCommentsBatch(commentsToStore);
                        console.log(`✅ Successfully stored ${commentsToStore.length} comments`);

                        // Show updated counts
                        const newUnprocessed = getUnprocessedComments(prUrl).length;
                        const newProcessed = getProcessedCommentCount(prUrl);
                        console.log(`📊 Updated counts: ${newUnprocessed} unprocessed, ${newProcessed} processed`);
                    } catch (error) {
                        console.error(`❌ Error storing comments: ${error.message}`);
                    }
                } else {
                    console.log('❌ Skipped storing comments');
                }
                rl.close();
            });
        } else {
            console.log('ℹ️  No new comments to store');
        }

    } catch (error) {
        console.error(`❌ Error: ${error.message}`);
        process.exit(1);
    }
}

debugPRComments();