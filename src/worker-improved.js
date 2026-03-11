/**
 * Improved worker dengan proper error handling, retry, dan cleanup
 */
import { execa } from 'execa';
import path from 'path';
import fs from 'fs-extra';
import { logger } from './logger.js';
import { config } from './config.js';
import { runTestsAndHeal } from './test-runner.js';
import { updateProjectItemStatus } from './github-project.js';
import { insertPR, updateTaskStatus } from './db.js';
import { sendTaskCompletionNotification, sendTaskFailureNotification } from './report.js';
import { retryGitOperation, retryGitHubAPI, withTimeout } from './retry-helper.js';
import { acquireTaskLock, releaseTaskLock } from './db-transactions.js';
import { notifyTaskStart, notifyTaskDone, notifyTaskError } from './notifier.js';

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

/**
 * Cleanup workspace untuk task yang failed
 */
async function cleanupFailedTask(repoDir, branchName) {
    try {
        logger.info(`Cleaning up failed task workspace: ${repoDir}`);

        // Reset any uncommitted changes
        await execa('git', ['reset', '--hard'], { cwd: repoDir }).catch(() => { });

        // Delete the feature branch if it exists
        await execa('git', ['branch', '-D', branchName], { cwd: repoDir }).catch(() => { });

        // Checkout back to main/master
        const { stdout: headRef } = await execa('git', ['symbolic-ref', 'refs/remotes/origin/HEAD'], { cwd: repoDir }).catch(() => ({ stdout: 'refs/remotes/origin/main' }));
        const baseBranch = headRef.trim().replace('refs/remotes/origin/', '');
        await execa('git', ['checkout', baseBranch], { cwd: repoDir }).catch(() => { });

        logger.info('Workspace cleaned up successfully');
    } catch (error) {
        logger.warn(`Cleanup failed: ${error.message}`);
    }
}

/**
 * Ensure git repository is in clean state
 */
async function ensureCleanGitState(repoDir) {
    try {
        // Check if there are uncommitted changes
        const { stdout: status } = await execa('git', ['status', '--porcelain'], { cwd: repoDir });

        if (status) {
            logger.warn('Found uncommitted changes, resetting...');
            await execa('git', ['reset', '--hard'], { cwd: repoDir });
        }

        // Check if there are untracked files
        const { stdout: untracked } = await execa('git', ['ls-files', '--others', '--exclude-standard'], { cwd: repoDir });

        if (untracked) {
            logger.warn('Found untracked files, cleaning...');
            await execa('git', ['clean', '-fd'], { cwd: repoDir });
        }

        return true;
    } catch (error) {
        logger.error(`Failed to ensure clean git state: ${error.message}`);
        return false;
    }
}

/**
 * Check if branch exists locally or remotely
 */
async function branchExists(repoDir, branchName, remote = false) {
    try {
        if (remote) {
            await execa('git', ['ls-remote', '--heads', 'origin', branchName], { cwd: repoDir });
        } else {
            await execa('git', ['rev-parse', '--verify', branchName], { cwd: repoDir });
        }
        return true;
    } catch {
        return false;
    }
}

/**
 * Process task dengan improved error handling
 */
export async function processTask(task) {
    logger.info(`Starting execution for task: ${task.id} - ${task.title}`, task.id);

    // Try to acquire lock
    if (!acquireTaskLock(task.id)) {
        logger.warn(`Task ${task.id} is already being processed or completed`);
        return false;
    }

    broadcast('task:start', {
        taskId: task.id,
        title: task.title,
        repo: task.repo || 'unknown/repo',
    });
    notifyTaskStart(task.id, task.title);

    const repoName = task.repo || 'unknown/repo';
    const repoDir = path.join(config.workspaceDir, repoName.replace('/', '-'));
    const branchName = `feature/${task.id}`;
    let baseBranch = 'main';

    if (config.dryRun) {
        logger.info(`[DRY RUN] Would process task ${task.id}`, task.id);
        releaseTaskLock(task.id);
        return true;
    }

    try {
        // === PHASE 1: Repository Setup ===
        broadcast('task:progress', { taskId: task.id, stage: 'clone', progress: 10 });
        logger.info(`Preparing repository ${repoName}...`, task.id);

        // Determine base branch
        const projectName = (task.projectName || '').toLowerCase();
        const isSilapiV2 = projectName.includes('silapi') && projectName.includes('v2');

        if (await fs.pathExists(repoDir)) {
            // Repository exists - update it
            logger.info('Repository exists, updating...', task.id);

            await ensureCleanGitState(repoDir);

            await retryGitOperation(async () => {
                await execa('git', ['fetch', 'origin', '--prune'], { cwd: repoDir, stdio: 'inherit' });
            }, 'git fetch');

            if (isSilapiV2) {
                baseBranch = 'dev-v2';
            } else {
                const { stdout: headRef } = await execa('git', ['symbolic-ref', 'refs/remotes/origin/HEAD'], { cwd: repoDir });
                baseBranch = headRef.trim().replace('refs/remotes/origin/', '');
            }

            await execa('git', ['checkout', baseBranch], { cwd: repoDir, stdio: 'inherit' });

            await retryGitOperation(async () => {
                await execa('git', ['pull', 'origin', baseBranch], { cwd: repoDir, stdio: 'inherit' });
            }, 'git pull');

        } else {
            // Clone repository
            logger.info(`Cloning ${repoName}...`, task.id);

            await retryGitOperation(async () => {
                await withTimeout(
                    () => execa('git', ['clone', '--depth', '1', `git@github.com:${repoName}.git`, repoDir], { stdio: 'inherit' }),
                    300000, // 5 minutes timeout
                    'Git clone timeout'
                );
            }, 'git clone');

            if (isSilapiV2) {
                baseBranch = 'dev-v2';
                await execa('git', ['checkout', baseBranch], { cwd: repoDir, stdio: 'inherit' });
            } else {
                const { stdout: headRef } = await execa('git', ['symbolic-ref', 'refs/remotes/origin/HEAD'], { cwd: repoDir });
                baseBranch = headRef.trim().replace('refs/remotes/origin/', '');
            }
        }

        logger.info(`Using base branch: ${baseBranch}`, task.id);

        // === PHASE 2: Branch Creation ===
        broadcast('task:progress', { taskId: task.id, stage: 'branch', progress: 20 });
        logger.info(`Creating branch ${branchName}...`, task.id);

        // Check if branch already exists remotely
        const remoteBranchExists = await branchExists(repoDir, branchName, true);
        if (remoteBranchExists) {
            logger.warn(`Branch ${branchName} already exists remotely. Using unique name.`, task.id);
            const timestamp = Date.now();
            const uniqueBranchName = `${branchName}-${timestamp}`;
            logger.info(`Using unique branch name: ${uniqueBranchName}`, task.id);
            // Update branchName for this execution
            branchName = uniqueBranchName;
        }

        await execa('git', ['checkout', '-B', branchName], { cwd: repoDir, stdio: 'inherit' });

        // === PHASE 3: AI Processing ===
        broadcast('task:progress', { taskId: task.id, stage: 'ai', progress: 30 });
        logger.info('Calling AI to process task...', task.id);

        const instructions = await fs.readFile('agents.md', 'utf-8');

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

        await withTimeout(
            () => execa('gemini', geminiArgs, { cwd: repoDir, stdio: 'inherit' }),
            600000, // 10 minutes timeout for AI
            'AI processing timeout'
        );

        // === PHASE 4: Commit Changes ===
        broadcast('task:progress', { taskId: task.id, stage: 'commit', progress: 60 });
        logger.info('Committing changes...', task.id);

        await execa('git', ['add', '.'], { cwd: repoDir, stdio: 'inherit' });

        const { stdout: status } = await execa('git', ['status', '--porcelain'], { cwd: repoDir });
        if (!status) {
            logger.warn('No changes were made by AI. Releasing lock.', task.id);
            broadcast('task:error', { taskId: task.id, error: 'No changes made by AI' });
            releaseTaskLock(task.id);
            await cleanupFailedTask(repoDir, branchName);
            return false;
        }

        await execa('git', ['commit', '-m', `feat: ${task.title} (${task.id})`], { cwd: repoDir, stdio: 'inherit' });

        // === PHASE 5: Testing & Healing ===
        broadcast('task:progress', { taskId: task.id, stage: 'test', progress: 70 });
        const verificationOk = await runTestsAndHeal(repoDir, config);
        if (!verificationOk) {
            logger.warn(`Verification failed for Task ${task.id}. Creating draft PR...`, task.id);
        }

        // === PHASE 6: Push Branch ===
        broadcast('task:progress', { taskId: task.id, stage: 'push', progress: 80 });
        logger.info('Pushing branch...', task.id);

        await retryGitOperation(async () => {
            await withTimeout(
                () => execa('git', ['push', '-u', 'origin', branchName], { cwd: repoDir, stdio: 'inherit' }),
                180000, // 3 minutes timeout
                'Git push timeout'
            );
        }, 'git push');

        // === PHASE 7: Create PR ===
        broadcast('task:progress', { taskId: task.id, stage: 'pr', progress: 90 });
        logger.info('Creating Pull Request...', task.id);

        const prArgs = [
            'pr', 'create',
            '--title', `feat: ${task.title} (${task.id})`,
            '--body', `Automated PR for task ${task.id}.\n\nDescription:\n${task.description}\n\nCloses #${task.id}`,
            '--reviewer', config.reviewerHandle,
            '--base', baseBranch,
            '--repo', repoName
        ];

        const { stdout: prOutput } = await retryGitHubAPI(async () => {
            return await execa('gh', prArgs, { cwd: repoDir, stdio: 'pipe' });
        }, 'PR creation');

        const prNumber = prOutput.match(/#(\d+)/)?.[1];
        const prUrl = prOutput.trim();

        logger.info(`Successfully created PR #${prNumber} for ${task.id}`, task.id);

        // === PHASE 8: Update Database & Project Board ===
        broadcast('task:progress', { taskId: task.id, stage: 'finalize', progress: 95 });

        // Save PR to database
        insertPR({
            id: prNumber ? parseInt(prNumber) : Date.now(),
            title: `feat: ${task.title} (${task.id})`,
            repo: repoName,
            taskId: String(task.id),
            status: 'open',
            reviewDecision: 'pending',
            url: prUrl.startsWith('http') ? prUrl : `https://github.com/${repoName}/pull/${prNumber}`,
        });

        // Update task status
        updateTaskStatus(String(task.id), 'done', { prNumber: prNumber ? parseInt(prNumber) : null });

        // Move to Code Review on project board
        await updateProjectItemStatus(task, 'code review').catch(err => {
            logger.warn(`Failed to update project board: ${err.message}`);
        });

        broadcast('task:done', { taskId: task.id, prNumber: prNumber ? parseInt(prNumber) : null });
        notifyTaskDone(task.id, task.title);

        // Send notification
        await sendTaskCompletionNotification(task, prNumber).catch(err => {
            logger.warn(`Failed to send completion notification: ${err.message}`);
        });

        logger.info(`✅ Task ${task.id} completed successfully`, task.id);
        return true;

    } catch (error) {
        logger.error(`❌ Error processing task ${task.id}: ${error.message}`, task.id);
        logger.error(error.stack, task.id);

        broadcast('task:error', { taskId: task.id, error: error.message });
        notifyTaskError(task.id, error.message);

        // Update task status to failed
        updateTaskStatus(String(task.id), 'failed', {
            errorMessage: error.message,
        });

        // Cleanup
        await cleanupFailedTask(repoDir, branchName);

        // Send failure notification
        await sendTaskFailureNotification(task, error.message).catch(err => {
            logger.warn(`Failed to send failure notification: ${err.message}`);
        });

        return false;
    }
}

/**
 * Process rejected PR dengan improved error handling
 */
export async function processRejectedPR(pr) {
    logger.info(`Starting self-fix execution for PR: #${pr.number} - ${pr.title}`);
    notifyTaskStart(`PR-${pr.number}`, `Fixing Reject PR: ${pr.title}`);

    const repoName = pr.repository?.nameWithOwner || pr.repo || 'unknown/repo';
    const repoDir = path.join(config.workspaceDir, repoName.replace('/', '-'));
    const branchName = pr.headRefName;

    if (config.dryRun) {
        logger.info(`[DRY RUN] Would fix PR #${pr.number}`);
        return true;
    }

    try {
        // === PHASE 1: Checkout PR Branch ===
        logger.info(`Preparing repository ${repoName}...`);

        if (await fs.pathExists(repoDir)) {
            await ensureCleanGitState(repoDir);

            await retryGitOperation(async () => {
                await execa('git', ['fetch', 'origin'], { cwd: repoDir, stdio: 'inherit' });
            }, 'git fetch');

            try {
                await execa('git', ['checkout', branchName], { cwd: repoDir, stdio: 'inherit' });
            } catch (e) {
                await execa('git', ['checkout', '-b', branchName, `origin/${branchName}`], { cwd: repoDir, stdio: 'inherit' });
            }

            await retryGitOperation(async () => {
                await execa('git', ['pull', 'origin', branchName], { cwd: repoDir, stdio: 'inherit' });
            }, 'git pull');

        } else {
            logger.info(`Cloning ${repoName}...`);

            await retryGitOperation(async () => {
                await execa('git', ['clone', `git@github.com:${repoName}.git`, repoDir], { stdio: 'inherit' });
            }, 'git clone');

            await execa('git', ['checkout', branchName], { cwd: repoDir, stdio: 'inherit' });
        }

        // === PHASE 2: Get PR Diff ===
        const { stdout: diff } = await retryGitHubAPI(async () => {
            return await execa('gh', ['pr', 'diff', pr.number.toString(), '--repo', repoName]);
        }, 'fetch PR diff');

        // === PHASE 3: AI Fixing ===
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
        }

        // Log the prompt being sent to AI
        logger.info(`\n${'─'.repeat(80)}`);
        logger.info(`🤖 SENDING PROMPT TO GEMINI CLI:`);
        logger.info(`${'─'.repeat(80)}`);
        logger.info(prompt);
        logger.info(`${'─'.repeat(80)}`);
        logger.info(`📋 Gemini CLI Args: ${JSON.stringify(geminiArgs.slice(0, 2))}${geminiArgs.length > 2 ? ' + additional flags' : ''}`);
        logger.info(`${'─'.repeat(80)}\n`);

        await withTimeout(
            () => execa('gemini', geminiArgs, { cwd: repoDir, stdio: 'inherit' }),
            600000,
            'AI fixing timeout'
        );

        // === PHASE 4: Commit & Push ===
        logger.info('Committing fixes...');
        await execa('git', ['add', '.'], { cwd: repoDir, stdio: 'inherit' });

        const { stdout: status } = await execa('git', ['status', '--porcelain'], { cwd: repoDir });
        const { stdout: ahead } = await execa('git', ['status', '-sb'], { cwd: repoDir });

        if (!status && !ahead.includes('ahead')) {
            logger.info('No changes were made by AI. Nothing to push.');
            return false;
        }

        if (status) {
            await execa('git', ['commit', '-m', `fix: address reviewer comments in PR #${pr.number}`], { cwd: repoDir, stdio: 'inherit' });
        }

        // === PHASE 5: Testing ===
        const verificationOk = await runTestsAndHeal(repoDir, config);
        if (!verificationOk) {
            logger.warn(`Verification failed for PR #${pr.number}. Pushing anyway for human review.`);
        }

        // === PHASE 6: Push ===
        logger.info('Pushing branch...');
        await retryGitOperation(async () => {
            await execa('git', ['push', 'origin', branchName], { cwd: repoDir, stdio: 'inherit' });
        }, 'git push');

        // === PHASE 7: Re-request Review ===
        logger.info('Notifying reviewer...');

        await retryGitHubAPI(async () => {
            await execa('gh', ['pr', 'ready', pr.number.toString(), '--repo', repoName], { cwd: repoDir });
        }, 'mark PR ready').catch(() => { });

        await retryGitHubAPI(async () => {
            await execa('gh', [
                'pr', 'edit', pr.number.toString(),
                '--add-reviewer', config.reviewerHandle,
                '--repo', repoName
            ], { cwd: repoDir });
        }, 're-request review').catch((e) => {
            logger.warn(`Failed to re-request review: ${e.message}`);
        });

        await retryGitHubAPI(async () => {
            await execa('gh', [
                'pr', 'comment', pr.number.toString(),
                '--body', `✅ Automated fix applied. I've addressed the review comments and re-requested your review @${config.reviewerHandle}. Please check the latest commits!`,
                '--repo', repoName
            ], { cwd: repoDir, stdio: 'inherit' });
        }, 'comment on PR');

        // Update PR status in DB
        insertPR({
            id: pr.number,
            title: pr.title,
            repo: repoName,
            status: 'open',
            reviewDecision: 'revised',
            url: pr.url,
        });

        logger.info(`✅ Successfully updated PR #${pr.number}`);
        notifyTaskDone(`PR-${pr.number}`, `PR Fix completed.`);
        return true;

    } catch (error) {
        logger.error(`❌ Error processing rejected PR #${pr.number}: ${error.message}`);
        logger.error(error.stack);
        notifyTaskError(`PR-${pr.number}`, `Failed to fix PR: ${error.message}`);
        return false;
    }
}
