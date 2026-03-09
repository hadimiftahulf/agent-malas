import { execa } from 'execa';
import path from 'path';
import fs from 'fs-extra';
import { logger } from './logger.js';
import { config } from './config.js';
import { runTestsAndHeal } from './test-runner.js';
import { updateProjectItemStatus } from './github-project.js';
import { insertPR, updateTaskStatus } from './db.js';
import { sendTaskCompletionNotification, sendTaskFailureNotification } from './report.js';

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
      '--body', `Automated PR for task ${task.id}.\n\nDescription:\n${task.description}\n\nCloses #${task.id}`,
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

    // Send WhatsApp notification
    await sendTaskCompletionNotification(task, prNumber);

    return true; // Mark as successfully processed task

  } catch (error) {
    logger.error(`Error processing task ${task.id}: ${error.message}`, task.id);
    broadcast('task:error', { taskId: task.id, error: error.message });

    // Send WhatsApp failure notification
    await sendTaskFailureNotification(task, error.message);

    return false;
  }
}


export async function processRejectedPR(pr) {
  logger.info(`Starting self-fix execution for PR: #${pr.number} - ${pr.title}`);

  const repoName = pr.repository?.nameWithOwner || pr.repo || 'unknown/repo';
  const repoDir = path.join(config.workspaceDir, repoName.replace('/', '-'));
  const branchName = pr.headRefName;

  if (config.dryRun) {
    logger.info(`[DRY RUN] Would checkout PR branch ${branchName}`);
    logger.info(`[DRY RUN] Would ask AI to fix issues based on comments: \n${pr.comments.join('\n')}`);
    logger.info(`[DRY RUN] Would commit, push, and comment on PR #${pr.number} to request re-review`);
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

    // 3. Task Execution (Self-fixing AI Processing)
    logger.info('Calling AI to fix PR issues...');
    const instructions = await fs.readFile('agents.md', 'utf-8');

    const combinedComments = pr.comments.join('\n---\n');
    const prompt = `You are an AI Developer fixing a rejected Pull Request.
    
The reviewer has requested the following changes:
${combinedComments}

Here is the current diff of the PR:
${diff}

Guidelines:
${instructions}

Please implement the requested changes and modify the files directly in the workspace to fix the issues requested by the reviewers.`;

    const geminiArgs = ['-p', prompt];
    if (config.geminiYolo) {
      geminiArgs.push('-y');
      logger.info('YOLO mode enabled - AI will auto-fix autonomously');
    }
    await execa('gemini', geminiArgs, { cwd: repoDir, stdio: 'inherit' });

    // 4. PR Update (Commit, Push, Comment)
    logger.info('Committing fixes...');
    await execa('git', ['add', '.'], { cwd: repoDir, stdio: 'inherit' });

    const { stdout: status } = await execa('git', ['status', '--porcelain'], { cwd: repoDir });
    const { stdout: ahead } = await execa('git', ['status', '-sb'], { cwd: repoDir });

    // Proceed if there are uncommitted changes OR if branch is ahead of origin (already committed)
    if (!status && !ahead.includes('ahead')) {
      logger.info('No changes were made by AI. Nothing to push.');
      return false;
    }

    if (status) {
      await execa('git', ['commit', '-m', `fix: address reviewer comments in PR #${pr.number}`], { cwd: repoDir, stdio: 'inherit' });
    }

    // 5. Pre-PR Verification
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

    await execa('gh', [
      'pr', 'comment', pr.number.toString(),
      '--body', `✅ Automated fix applied. I've addressed the review comments and re-requested your review @${config.reviewerHandle}. Please check the latest commits!`,
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
    return true; // Mark as successfully revised PR

  } catch (error) {
    logger.error(`Error processing rejected PR #${pr.number}: ${error.message}`);
    return false;
  }
}

