import { execa } from 'execa';
import { logger } from './logger.js';
import { config } from './config.js';
import {
  insertPRCommentsBatch,
  getUnprocessedComments,
  getProcessedCommentCount
} from './db.js';

/**
 * Fetch PRs created by the bot that have been rejected.
 * Skips PRs where the last comment is from the bot itself (already fixed, waiting for review).
 */
export async function fetchRejectedPRs() {
  if (config.dryRun && !config.projectId) {
    logger.info('[DRY RUN] Simulating fetch of rejected PRs...');
    return [
      {
        number: 42,
        title: 'feat: Add example functionality (TASK-1)',
        repository: { nameWithOwner: 'example/repo' },
        headRefName: 'feature/TASK-1',
        url: 'https://github.com/example/repo/pull/42',
        comments: [
          'Please extract the inline styles to a CSS file.',
          'Missing error handling in the API fetch logic.'
        ]
      }
    ];
  }

  try {
    // Get current bot username
    let botUser = '';
    try {
      const { stdout } = await execa('gh', ['api', 'user', '--jq', '.login']);
      botUser = stdout.trim();
    } catch { /* fallback: will compare by empty string */ }

    const allRejectedPRs = [];

    logger.info('Fetching open PRs authored by @me...');
    const { stdout: prsStdout } = await execa('gh', ['search', 'prs', '--state=open', '--author=@me', '--json', 'number,title,repository,url']);
    const prs = JSON.parse(prsStdout);

    for (const pr of prs) {
      const { stdout: detailJson } = await execa('gh', ['pr', 'view', pr.number.toString(), '--repo', pr.repository.nameWithOwner, '--json', 'reviewDecision,headRefName']);
      const detail = JSON.parse(detailJson);

      // Skip cleanly merged/closed ones just in case
      if (detail.state === 'MERGED' || detail.state === 'CLOSED') continue;

      // Check last activity (comments + reviews + commits) — if bot is the latest, skip
      const { stdout: prDataJson } = await execa('gh', [
        'pr', 'view', pr.number.toString(),
        '--repo', pr.repository.nameWithOwner,
        '--json', 'comments,commits',
      ]);
      const { comments: prComments, commits: prCommits } = JSON.parse(prDataJson);

      const { stdout: reviewsJson } = await execa('gh', ['api', `repos/${pr.repository.nameWithOwner}/pulls/${pr.number}/reviews`]);
      const reviews = JSON.parse(reviewsJson);

      // Merge all activities with timestamps to find the most recent one
      const activities = [];
      for (const c of (prComments || [])) {
        activities.push({ author: c.author?.login, time: new Date(c.createdAt || 0) });
      }
      for (const c of (prCommits || [])) {
        const authorLogin = c.authors?.length ? c.authors[0].login : null;
        activities.push({ author: authorLogin, time: new Date(c.committedDate || 0) });
      }
      for (const r of (reviews || [])) {
        activities.push({ author: r.user?.login, time: new Date(r.submitted_at || 0) });
      }
      activities.sort((a, b) => b.time - a.time); // newest first

      const lastActivity = activities[0];
      if (lastActivity && lastActivity.author === botUser) {
        logger.info(`Skipping PR #${pr.number} — last activity is from bot, waiting for reviewer`);
        continue;
      }

      // If we reach here, reviewer has done *something* (comment, review, etc) after our last commit
      // Get ALL actionable reviews (CHANGES_REQUESTED or COMMENTED) - not just the latest one
      const actionableReviews = reviews
        .filter(r => r.state === 'CHANGES_REQUESTED' || r.state === 'COMMENTED')
        .sort((a, b) => new Date(b.submitted_at) - new Date(a.submitted_at));

      // Also fetch ALL inline review comments (code-level suggestions)
      const { stdout: inlineJson } = await execa('gh', ['api', `repos/${pr.repository.nameWithOwner}/pulls/${pr.number}/comments`]);
      const inlineComments = JSON.parse(inlineJson);

      // Store all comments in database for incremental processing
      const commentsToStore = [];

      // Store ALL review comments (not just the latest one)
      logger.info(`Found ${actionableReviews.length} actionable reviews for PR #${pr.number}`);
      for (const review of actionableReviews) {
        if (review.body && review.body.trim()) {
          logger.info(`Adding review comment from review ID ${review.id}: "${review.body.substring(0, 100)}..."`);
          commentsToStore.push({
            prUrl: pr.url,
            commentId: `review-${review.id}`,
            commentType: 'review',
            commentBody: review.body,
            reviewId: review.id
          });
        }
      }

      // Store ALL inline comments (not filtered by review ID)
      logger.info(`Found ${inlineComments.length} inline comments for PR #${pr.number}`);
      for (const c of inlineComments) {
        if (c.body && c.body.trim()) {
          logger.info(`Adding inline comment ID ${c.id} on ${c.path}:${c.line}: "${c.body.substring(0, 100)}..."`);
          commentsToStore.push({
            prUrl: pr.url,
            commentId: `inline-${c.id}`,
            commentType: 'inline',
            commentBody: c.body,
            filePath: c.path,
            lineNumber: c.line || c.original_line,
            reviewId: c.pull_request_review_id
          });
        }
      }

      // Batch insert comments to database (will ignore duplicates due to UNIQUE constraint)
      if (commentsToStore.length > 0) {
        try {
          insertPRCommentsBatch(commentsToStore);
          logger.info(`Successfully stored ${commentsToStore.length} comments for PR #${pr.number}`);
        } catch (error) {
          logger.warn(`Some comments may already exist in database for PR #${pr.number}: ${error.message}`);
        }
      } else {
        logger.info(`No new comments found for PR #${pr.number}`);
      }

      // Get unprocessed comments count (this includes both new and existing unprocessed comments)
      const unprocessedComments = getUnprocessedComments(pr.url);
      const processedCount = getProcessedCommentCount(pr.url);
      const totalComments = unprocessedComments.length + processedCount;

      logger.info(`PR #${pr.number} comment summary: ${unprocessedComments.length} unprocessed, ${processedCount} processed, ${totalComments} total`);

      // Only add to rejected PRs if there are unprocessed comments
      if (unprocessedComments.length > 0) {
        pr.unprocessedComments = unprocessedComments;
        pr.totalComments = totalComments;
        logger.info(`✓ Added PR #${pr.number} to processing queue with ${unprocessedComments.length} comments to process`);
        pr.headRefName = detail.headRefName;
        allRejectedPRs.push(pr);
      } else if (totalComments > 0) {
        logger.info(`Skipping PR #${pr.number} — all ${totalComments} comments already processed`);
      } else {
        logger.info(`Skipping PR #${pr.number} — no comments found`);
      }
    }

    return allRejectedPRs;
  } catch (error) {
    logger.error(`Failed to fetch rejected PRs: ${error.message}`);
    return [];
  }
}


