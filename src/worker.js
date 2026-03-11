import { execa } from 'execa';
import path from 'path';
import fs from 'fs-extra';
import { logger } from './logger.js';
import { config } from './config.js';
import { runTestsAndHeal } from './test-runner.js';
import { updateProjectItemStatus } from './github-project.js';
import { insertPR, updateTaskStatus, markCommentProcessed } from './db.js';
import { sendTaskCompletionNotification, sendTaskFailureNotification } from './report.js';
import { notifyTaskStart, notifyTaskDone, notifyTaskError } from './notifier.js';

// Lazy-loaded WebSocket module
let _wsModule = null;
function broadcast(event, data) {
  if (_wsModule) {
    try {
      _wsModule.broadcast(event, data);
    } catch { /* WS not ready */ }
    return;
  }
  import('./websocket.js').then((ws) => {
    _wsModule = ws;
    ws.broadcast(event, data);
  }).catch(() => { });
}

export async function processTask(task) {
  logger.info(`Starting execution for task: ${task.id} - ${task.title}`, task.id);

  // Broadcast task start
  broadcast('task:start', {
    taskId: task.id,
    title: task.title,
    repo: task.repo || 'unknown/repo',
  });
  notifyTaskStart(task.id, task.title);

  const repoName = task.repo || 'unknown/repo';
  const repoDir = path.join(config.workspaceDir, repoName.replace('/', '-'));
  const branchName = `feature/${task.id}`;

  if (config.dryRun) {
    logger.info(`[DRY RUN] Would clone ${repoName} to ${repoDir}`, task.id);
    logger.info(`[DRY RUN] Would checkout branch ${branchName}`, task.id);
    logger.info(`[DRY RUN] Would ask AI to solve: ${task.description}`, task.id);
    logger.info(`[DRY RUN] Would commit, push, and create PR assigned to @${config.reviewerHandle}`, task.id);

    // Test the test-runner module logic locally during dry runs.
    await runTestsAndHeal(repoDir, config);
    broadcast('task:done', { taskId: task.id, prNumber: null });
    return true; // Assume success for metrics
  }

  try {
    // 1. Git Automation Flow
    broadcast('task:progress', { taskId: task.id, stage: 'clone' });
    logger.info(`Preparing repository ${repoName}...`, task.id);

    // Determine base branch: if project name contains "v2", use dev-v2
    const projectName = (task.projectName || '').toLowerCase();
    const isSilapiV2 = projectName.includes('silapi') && projectName.includes('v2');
    let baseBranch;

    if (await fs.pathExists(repoDir)) {
      await execa('git', ['fetch', 'origin'], { cwd: repoDir, stdio: 'inherit' });
      if (isSilapiV2) {
        baseBranch = 'dev-v2';
      } else {
        const { stdout: headRef } = await execa('git', ['symbolic-ref', 'refs/remotes/origin/HEAD'], { cwd: repoDir });
        baseBranch = headRef.trim().replace('refs/remotes/origin/', '');
      }
      await execa('git', ['checkout', baseBranch], { cwd: repoDir, stdio: 'inherit' });
      await execa('git', ['pull', 'origin', baseBranch], { cwd: repoDir, stdio: 'inherit' });
    } else {
      logger.info(`Cloning ${repoName}...`);
      await execa('git', ['clone', `git@github.com:${repoName}.git`, repoDir], { stdio: 'inherit' });
      if (isSilapiV2) {
        baseBranch = 'dev-v2';
        await execa('git', ['checkout', baseBranch], { cwd: repoDir, stdio: 'inherit' });
      } else {
        const { stdout: headRef } = await execa('git', ['symbolic-ref', 'refs/remotes/origin/HEAD'], { cwd: repoDir });
        baseBranch = headRef.trim().replace('refs/remotes/origin/', '');
      }
    }
    logger.info(`Using base branch: ${baseBranch}`, task.id);

    logger.info(`Creating or resetting branch ${branchName}...`, task.id);
    try {
      await execa('git', ['checkout', '-B', branchName], { cwd: repoDir, stdio: 'inherit' });
    } catch (e) {
      logger.error(`Failed to checkout branch ${branchName}`, task.id);
    }

    // 2. Task Execution (Core AI Processing)
    broadcast('task:progress', { taskId: task.id, stage: 'ai' });
    logger.info('Calling AI to process task...', task.id);
    const instructions = await fs.readFile('agents.md', 'utf-8');

    // Build QA feedback context from comments
    let commentContext = '';
    if (task.comments && task.comments.length > 0) {
      commentContext = '\n\nQA/Reviewer Feedback (from issue comments):\n' +
        task.comments.map(c => `- @${c.author} (${c.createdAt}): ${c.body}`).join('\n');
    }

    const prompt = `You are an AI Developer. Your task is: ${task.title}\n\nTask Description: ${task.description}${commentContext}\n\nGuidelines:\n${instructions}\n\nPlease implement this feature and modify the files directly.`;

    const geminiArgs = ['-p', prompt];
    if (config.geminiYolo) {
      geminiArgs.push('-y');
      logger.info('YOLO mode enabled - AI will auto-fix autonomously', task.id);
    }

    // Log the prompt being sent to AI
    logger.info(`\n${'─'.repeat(80)}`);
    logger.info(`🤖 SENDING TASK PROMPT TO GEMINI CLI:`);
    logger.info(`${'─'.repeat(80)}`);
    logger.info(prompt);
    logger.info(`${'─'.repeat(80)}`);
    logger.info(`📋 Gemini CLI Args: ${JSON.stringify(geminiArgs.slice(0, 2))}${geminiArgs.length > 2 ? ' + additional flags' : ''}`);
    logger.info(`${'─'.repeat(80)}\n`);

    await execa('gemini', geminiArgs, { cwd: repoDir, stdio: 'inherit' });

    // 3. PR Creation & Assignment
    broadcast('task:progress', { taskId: task.id, stage: 'test' });
    logger.info('Committing changes...', task.id);
    await execa('git', ['add', '.'], { cwd: repoDir, stdio: 'inherit' });

    // Check if there are changes
    const { stdout: status } = await execa('git', ['status', '--porcelain'], { cwd: repoDir });
    if (!status) {
      logger.info('No changes were made by AI. Skipping PR creation.', task.id);
      broadcast('task:error', { taskId: task.id, error: 'No changes made by AI' });
      return false;
    }

    await execa('git', ['commit', '-m', `feat: ${task.title} (${task.id})`], { cwd: repoDir, stdio: 'inherit' });

    // 4. Pre-PR Verification
    const verificationOk = await runTestsAndHeal(repoDir, config);
    if (!verificationOk) {
      logger.warn(`Verification failed for Task ${task.id}. Proceeding to create draft PR for human intervention...`, task.id);
    }

    broadcast('task:progress', { taskId: task.id, stage: 'pr' });
    logger.info('Pushing branch...', task.id);
    await execa('git', ['push', '-u', 'origin', branchName], { cwd: repoDir, stdio: 'inherit' });

    logger.info('Creating Pull Request...', task.id);
    const prArgs = [
      'pr', 'create',
      '--title', `feat: ${task.title} (${task.id})`,
      '--body', `Halo Kang @${config.reviewerHandle}, PR untuk task ${task.id} udah aku buatin ya.\n\n**Deskripsi:**\n${task.description}\n\nMonggo dicek dan direview ya Kang. Makasih! 🙏\n\nCloses #${task.id}`,
      '--reviewer', config.reviewerHandle,
      '--base', baseBranch,
      '--repo', repoName
    ];

    const { stdout: prOutput } = await execa('gh', prArgs, { cwd: repoDir, stdio: 'pipe' });
    const prNumber = prOutput.match(/#(\d+)/)?.[1];

    logger.info(`Successfully created PR #${prNumber} for ${task.id}`, task.id);

    // Save PR to database so frontend PRTracker can display it
    const prUrl = prOutput.trim();
    insertPR({
      id: prNumber ? parseInt(prNumber) : Date.now(),
      title: `feat: ${task.title} (${task.id})`,
      repo: repoName,
      taskId: String(task.id),
      status: 'open',
      reviewDecision: 'pending',
      url: prUrl.startsWith('http') ? prUrl : `https://github.com/${repoName}/pull/${prNumber}`,
    });

    // Move task to "Code Review" on project board
    await updateProjectItemStatus(task, 'code review');

    broadcast('task:done', { taskId: task.id, prNumber: prNumber ? parseInt(prNumber) : null });
    notifyTaskDone(task.id, task.title);

    // Send WhatsApp notification
    await sendTaskCompletionNotification(task, prNumber);

    return true; // Mark as successfully processed task

  } catch (error) {
    logger.error(`Error processing task ${task.id}: ${error.message}`, task.id);
    broadcast('task:error', { taskId: task.id, error: error.message });
    notifyTaskError(task.id, error.message);

    // Send WhatsApp failure notification
    await sendTaskFailureNotification(task, error.message);

    return false;
  }
}


export async function processRejectedPR(pr) {
  logger.info(`Starting self-fix execution for PR: #${pr.number} - ${pr.title}`);
  logger.info(`Total comments to process: ${pr.unprocessedComments?.length || 0} unprocessed out of ${pr.totalComments || 0} total`);
  notifyTaskStart(`PR-${pr.number}`, `Fixing Reject PR: ${pr.title}`);

  const repoName = pr.repository?.nameWithOwner || pr.repo || 'unknown/repo';
  const repoDir = path.join(config.workspaceDir, repoName.replace('/', '-'));
  const branchName = pr.headRefName;

  if (config.dryRun) {
    logger.info(`[DRY RUN] Would checkout PR branch ${branchName}`);
    logger.info(`[DRY RUN] Would process ${pr.unprocessedComments?.length || 0} comments one by one with atomic commits`);
    logger.info(`[DRY RUN] Would create ${pr.unprocessedComments?.length || 0} individual commits, then push all at once`);
    logger.info(`[DRY RUN] Would comment on PR #${pr.number} to request re-review`);
    return;
  }

  try {
    // 1. Git Automation Flow (Checkout branch PR)
    logger.info(`Preparing repository ${repoName}...`);
    if (await fs.pathExists(repoDir)) {
      await execa('git', ['fetch', 'origin'], { cwd: repoDir, stdio: 'inherit' });
      try {
        await execa('git', ['checkout', branchName], { cwd: repoDir, stdio: 'inherit' });
      } catch (e) {
        // If local branch doesn't exist, checkout from origin tracking branch
        await execa('git', ['checkout', '-b', branchName, `origin/${branchName}`], { cwd: repoDir, stdio: 'inherit' });
      }
      await execa('git', ['pull', 'origin', branchName], { cwd: repoDir, stdio: 'inherit' });
    } else {
      logger.info(`Cloning ${repoName}...`);
      await execa('git', ['clone', `git@github.com:${repoName}.git`, repoDir], { stdio: 'inherit' });
      await execa('git', ['checkout', branchName], { cwd: repoDir, stdio: 'inherit' });
    }

    // 2. Fetch diff to provide context for fixing
    const { stdout: diff } = await execa('gh', ['pr', 'diff', pr.number.toString(), '--repo', repoName]);

    // 3. Load instructions once
    const instructions = await fs.readFile('agents.md', 'utf-8');

    // 4. Process each unprocessed comment one by one with atomic commits
    const unprocessedComments = pr.unprocessedComments || [];
    let processedCount = 0;
    let failedCount = 0;
    const commitHashes = []; // Track commits for potential rollback

    for (let i = 0; i < unprocessedComments.length; i++) {
      const comment = unprocessedComments[i];
      const commentNum = i + 1;

      logger.info(`\n${'='.repeat(60)}`);
      logger.info(`Processing comment ${commentNum}/${unprocessedComments.length}`);
      logger.info(`Type: ${comment.comment_type}`);
      if (comment.file_path) {
        logger.info(`File: ${comment.file_path}:${comment.line_number || '?'}`);
      }
      logger.info(`${'='.repeat(60)}\n`);

      try {
        // Build context-specific prompt for this comment
        let commentContext = '';
        if (comment.comment_type === 'inline' && comment.file_path) {
          commentContext = `\n[File: ${comment.file_path}, Line: ${comment.line_number || 'N/A'}]`;
        } else if (comment.comment_type === 'review') {
          commentContext = '\n[General Review Comment]';
        }

        const prompt = `You are an AI Developer fixing a rejected Pull Request.

This is comment ${commentNum} of ${unprocessedComments.length} that needs to be addressed.

${commentContext}
Reviewer's feedback:
${comment.comment_body}

Current PR diff for context:
${diff}

Guidelines:
${instructions}

Please implement the requested changes and modify the files directly in the workspace to fix this specific issue.
Focus ONLY on addressing this particular comment. Be precise and minimal in your changes.`;

        const geminiArgs = ['-p', prompt];
        if (config.geminiYolo) {
          geminiArgs.push('-y');
        }

        // Log the prompt being sent to AI
        logger.info(`\n${'─'.repeat(80)}`);
        logger.info(`🤖 SENDING PROMPT TO GEMINI CLI:`);
        logger.info(`${'─'.repeat(80)}`);
        logger.info(prompt);
        logger.info(`${'─'.repeat(80)}`);
        logger.info(`📋 Gemini CLI Args: ${JSON.stringify(geminiArgs.slice(0, 2))}${geminiArgs.length > 2 ? ' + additional flags' : ''}`);
        logger.info(`${'─'.repeat(80)}\n`);

        logger.info(`Calling AI to fix comment ${commentNum}...`);
        await execa('gemini', geminiArgs, { cwd: repoDir, stdio: 'inherit' });

        // ATOMIC COMMIT: Commit changes for this specific comment
        logger.info(`Committing changes for comment ${commentNum}...`);
        await execa('git', ['add', '.'], { cwd: repoDir, stdio: 'inherit' });

        const { stdout: status } = await execa('git', ['status', '--porcelain'], { cwd: repoDir });
        if (status) {
          const commentType = comment.comment_type === 'inline' ? 'inline' : 'review';
          const fileInfo = comment.file_path ? ` (${comment.file_path}:${comment.line_number || '?'})` : '';
          const commitMsg = `fix: address ${commentType} comment ${commentNum}/${unprocessedComments.length}${fileInfo}

${comment.comment_body.substring(0, 200)}${comment.comment_body.length > 200 ? '...' : ''}

PR: #${pr.number}`;

          await execa('git', ['commit', '-m', commitMsg], { cwd: repoDir, stdio: 'inherit' });

          // Get commit hash for tracking
          const { stdout: commitHash } = await execa('git', ['rev-parse', 'HEAD'], { cwd: repoDir });
          commitHashes.push(commitHash.trim());

          logger.info(`✓ Comment ${commentNum} committed (${commitHash.trim().substring(0, 8)})`);
        } else {
          logger.info(`ℹ Comment ${commentNum} processed but no changes to commit`);
        }

        // Mark this comment as processed in database
        markCommentProcessed(comment.id);
        processedCount++;
        logger.info(`✓ Comment ${commentNum} processed successfully`);

      } catch (error) {
        logger.error(`✗ Failed to process comment ${commentNum}: ${error.message}`);
        failedCount++;
        // Continue with next comment even if this one fails
      }
    }

    logger.info(`\n${'='.repeat(60)}`);
    logger.info(`Processing complete: ${processedCount} succeeded, ${failedCount} failed`);
    logger.info(`Total commits created: ${commitHashes.length}`);
    logger.info(`Commit hashes: ${commitHashes.map(h => h.substring(0, 8)).join(', ')}`);
    logger.info(`${'='.repeat(60)}\n`);

    // 5. Check if we have any commits to push
    const { stdout: ahead } = await execa('git', ['status', '-sb'], { cwd: repoDir });
    if (!ahead.includes('ahead') && commitHashes.length === 0) {
      logger.info('No changes were made by AI. Nothing to push.');
      return false;
    }

    // 6. Pre-PR Verification
    const verificationOk = await runTestsAndHeal(repoDir, config);
    if (!verificationOk) {
      logger.warn(`Verification failed for fixing PR #${pr.number}. Still pushing but it may need human intervention.`);
    }

    logger.info('Pushing branch...');
    await execa('git', ['push', 'origin', branchName], { cwd: repoDir, stdio: 'inherit' });

    logger.info('Notifying reviewer...');
    await execa('gh', [
      'pr', 'ready', pr.number.toString(), '--repo', repoName
    ], { cwd: repoDir }).catch(() => { });

    // Re-request review so reviewDecision changes from CHANGES_REQUESTED
    logger.info(`Re-requesting review from ${config.reviewerHandle}...`);
    await execa('gh', [
      'pr', 'edit', pr.number.toString(),
      '--add-reviewer', config.reviewerHandle,
      '--repo', repoName
    ], { cwd: repoDir }).catch((e) => {
      logger.warn(`Failed to re-request review: ${e.message}`);
    });

    const commentBody = `Halo Kang @${config.reviewerHandle}, revisinya udah beres ya! 🚀
Total ada ${processedCount} masukan yang udah aku perbaikin. Sengaja aku bikin jadi ${commitHashes.length} commit terpisah biar akangnya ngereview lebih enak dan gampang ditrack.

Monggo dicek lagi ya update commit terbarunya. Makasih Kang! 🙏

📝 Commits: ${commitHashes.map(h => h.substring(0, 8)).join(', ')}`;
    await execa('gh', [
      'pr', 'comment', pr.number.toString(),
      '--body', commentBody,
      '--repo', repoName
    ], { cwd: repoDir, stdio: 'inherit' });

    // Mark PR as 'revised' in DB so it's skipped until new review comes in
    insertPR({
      id: pr.number,
      title: pr.title,
      repo: repoName,
      status: 'open',
      reviewDecision: 'revised',
      url: pr.url,
    });

    logger.info(`Successfully updated PR #${pr.number} and re-requested review`);
    notifyTaskDone(`PR-${pr.number}`, `PR Fix completed.`);
    return true; // Mark as successfully revised PR

  } catch (error) {
    logger.error(`Error processing rejected PR #${pr.number}: ${error.message}`);
    notifyTaskError(`PR-${pr.number}`, `Failed to fix PR: ${error.message}`);
    return false;
  }
}

