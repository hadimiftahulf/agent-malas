import { execa } from 'execa';
import { logger } from './logger.js';
import { config } from './config.js';

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
      // Determine what to address. We'll find the latest relevant review (CHANGES_REQUESTED or COMMENTED)
      const actionableReviews = reviews
        .filter(r => r.state === 'CHANGES_REQUESTED' || r.state === 'COMMENTED')
        .sort((a, b) => new Date(b.submitted_at) - new Date(a.submitted_at));
      
      const latestReview = actionableReviews[0];

      // Also fetch inline review comments (code-level suggestions)
      const { stdout: inlineJson } = await execa('gh', ['api', `repos/${pr.repository.nameWithOwner}/pulls/${pr.number}/comments`]);
      const inlineComments = JSON.parse(inlineJson);

      // Find the latest review ID that actually has inline comments
      const reviewIdsWithComments = [...new Set(inlineComments.map(c => c.pull_request_review_id).filter(id => id))];
      const latestReviewIdWithComments = reviewIdsWithComments.length > 0 
        ? Math.max(...reviewIdsWithComments) 
        : null;

      const relevantInline = latestReviewIdWithComments
        ? inlineComments.filter(c => c.pull_request_review_id === latestReviewIdWithComments)
        : inlineComments.slice(-5); // fallback: last 5

      const parts = [];
      if (latestReview?.body) parts.push(`Review General Comment:\n${latestReview.body}\n`);
      for (const c of relevantInline) {
        parts.push(`[File: ${c.path}, Line: ${c.line || c.original_line}]\n${c.body}`);
      }
      pr.comments = parts;

      logger.info(`Found rejected PR #${pr.number} in ${pr.repository.nameWithOwner}`);
      pr.headRefName = detail.headRefName;
      allRejectedPRs.push(pr);
    }

    return allRejectedPRs;
  } catch (error) {
    logger.error(`Failed to fetch rejected PRs: ${error.message}`);
    return [];
  }
}


