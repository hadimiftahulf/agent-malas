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
import { insertPR, updateTaskStatus, markCommentProcessed, updateTaskPrompt } from './db.js';
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
            let combinedComments = task.comments.map(c => `- @${c.author} (${c.createdAt}): ${c.body}`).join('\n');
            if (combinedComments.length > 5000) {
                combinedComments = combinedComments.substring(0, 5000) + '\n... [COMMENTS TRUNCATED due to length limit]';
            }
            commentContext = '\n\nQA/Reviewer Feedback (from issue comments):\n' + combinedComments;
        }

        let taskDesc = task.description || '';
        if (taskDesc.length > 15000) {
            taskDesc = taskDesc.substring(0, 15000) + '\n\n... [DESCRIPTION TRUNCATED due to length limit] ...';
        }

        const prompt = `You are an AI Developer. Your task is: ${task.title}\n\nTask Description: ${taskDesc}${commentContext}\n\nGuidelines:\n${instructions}\n\nPlease implement this feature and modify the files directly.`;

        const geminiArgs = ['-p', prompt, '-y'];

        // Save AI Prompt to DB
        updateTaskPrompt(String(task.id), prompt);

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
            '--body', `Halo Kang @${config.reviewerHandle}, PR untuk task ${task.id} udah aku buatin ya.\n\n**Deskripsi:**\n${task.description}\n\nMonggo dicek dan direview ya Kang. Makasih! 🙏\n\nCloses #${task.id}`,
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
        logger.info(`[DRY RUN] Would process PR #${pr.number} with atomic commits`);
        logger.info(`[DRY RUN] Would create ${pr.unprocessedComments?.length || 0} individual commits, then push all at once`);
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

        // === PHASE 3: AI Fixing with Atomic Commits ===
        logger.info('Processing comments with atomic commits...');
        const instructions = await fs.readFile('agents.md', 'utf-8');

        // Process each unprocessed comment one by one with atomic commits
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

                // Truncate diff if it's too long
                const MAX_DIFF_LENGTH = 15000;
                let diffContext = diff || '';
                if (diffContext.length > MAX_DIFF_LENGTH) {
                    diffContext = diffContext.substring(0, MAX_DIFF_LENGTH) + '\n\n... [DIFF TRUNCATED due to length limit. Please rely on your file reading tools if you need more context] ...';
                }

                const prompt = `You are an AI Developer fixing a rejected Pull Request.

This is comment ${commentNum} of ${unprocessedComments.length} that needs to be addressed.

${commentContext}
Reviewer's feedback:
${comment.comment_body}

Current PR diff for context:
${diffContext}

Guidelines:
${instructions}

CRITICAL INSTRUCTIONS:
1. You MUST use your file editing capabilities (tools) to implement the requested changes directly in this workspace.
2. If you don't edit any files, this task will be marked as FAILED.
3. Focus ONLY on addressing this particular comment. Be precise and minimal in your changes. 
4. DO NOT just explain how to fix it, actually write the code modifications.`;

                // ALWAYS use YOLO (-y) mode for non-interactive worker execution.
                // Otherwise `gemini` will hang waiting for "[Y/n]" stdin input.
                const geminiArgs = ['-p', prompt, '-y'];

                // Save PR AI Prompt to DB (menggunakan PR Task ID)
                updateTaskPrompt(`PR-${pr.number}`, prompt);

                // Log the prompt being sent to AI
                logger.info(`\n${'─'.repeat(80)}`);
                logger.info(`🤖 SENDING PROMPT TO GEMINI CLI:`);
                logger.info(`${'─'.repeat(80)}`);
                logger.info(prompt);
                logger.info(`${'─'.repeat(80)}`);
                logger.info(`📋 Gemini CLI Args: ${JSON.stringify(geminiArgs.slice(0, 2))}${geminiArgs.length > 2 ? ' + additional flags' : ''}`);
                logger.info(`${'─'.repeat(80)}\n`);

                logger.info(`Calling AI to fix comment ${commentNum}...`);

                // Capture stdout and stderr for better debugging
                const aiResult = await withTimeout(
                    () => execa('gemini', geminiArgs, {
                        cwd: repoDir,
                        stdio: 'pipe',  // Changed from 'inherit' to capture output
                        all: true
                    }),
                    900000,  // Increased to 15 minutes per comment
                    'AI fixing timeout'
                );

                // Log AI output for debugging
                if (aiResult.stdout) {
                    logger.info(`\n📤 AI STDOUT:\n${aiResult.stdout.substring(0, 1000)}${aiResult.stdout.length > 1000 ? '...(truncated)' : ''}`);
                }
                if (aiResult.stderr) {
                    logger.warn(`\n⚠️  AI STDERR:\n${aiResult.stderr.substring(0, 1000)}${aiResult.stderr.length > 1000 ? '...(truncated)' : ''}`);
                }
                if (aiResult.all) {
                    logger.info(`\n📋 AI COMBINED OUTPUT:\n${aiResult.all.substring(0, 1000)}${aiResult.all.length > 1000 ? '...(truncated)' : ''}`);
                }

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
                    logger.warn(`⚠️  Comment ${commentNum} processed but AI made no changes. Trying simplified prompt...`);

                    // RETRY with simplified prompt
                    const simplePrompt = `CRITICAL: You are retrying a failed attempt to fix this issue. Please try a different approach.

Feedback to address:
${comment.comment_body}

${comment.file_path ? `Target File: ${comment.file_path}` : 'No specific file mentioned.'}

INSTRUCTIONS:
1. First, read the target file (if provided) or search the codebase to find where this issue occurs.
2. Then, make the MINIMAL code change necessary to address this specific feedback using your file editing tools.
3. DO NOT just explain the fix; YOU MUST MODIFY THE CODE directly.
4. If you fail to modify any files, the system will consider this a failure. Be direct and specific.`;

                    try {
                        const retryArgs = ['-p', simplePrompt];
                        if (config.geminiYolo) {
                            retryArgs.push('-y');
                        }

                        // Save retry prompt to DB
                        updateTaskPrompt(`PR-${pr.number}`, simplePrompt);

                        logger.info(`🔄 Retry attempt with simplified prompt...`);
                        await withTimeout(
                            () => execa('gemini', retryArgs, {
                                cwd: repoDir,
                                stdio: 'pipe',
                                all: true
                            }),
                            600000,  // 10 minutes for retry
                            'AI retry timeout'
                        );

                        // Check again for changes
                        const { stdout: retryStatus } = await execa('git', ['status', '--porcelain'], { cwd: repoDir });
                        if (retryStatus) {
                            await execa('git', ['add', '.'], { cwd: repoDir, stdio: 'inherit' });
                            const commitMsg = `fix: address comment ${commentNum} (retry with simplified prompt)

${comment.comment_body.substring(0, 150)}...

PR: #${pr.number}`;
                            await execa('git', ['commit', '-m', commitMsg], { cwd: repoDir, stdio: 'inherit' });
                            const { stdout: commitHash } = await execa('git', ['rev-parse', 'HEAD'], { cwd: repoDir });
                            commitHashes.push(commitHash.trim());
                            logger.info(`✓ Comment ${commentNum} fixed on retry (${commitHash.trim().substring(0, 8)})`);
                        } else {
                            logger.warn(`⚠️  Retry also produced no changes. Comment ${commentNum} needs manual review.`);
                            failedCount++;
                            // Don't mark as processed so it can be retried later
                            continue;
                        }
                    } catch (retryError) {
                        logger.error(`Retry failed for comment ${commentNum}: ${retryError.message}`);
                        failedCount++;
                        continue;
                    }
                }

                // Mark this comment as processed in database
                markCommentProcessed(comment.id);
                processedCount++;
                logger.info(`✓ Comment ${commentNum} processed successfully`);

            } catch (error) {
                logger.error(`✗ Failed to process comment ${commentNum}: ${error.message}`);
                logger.error(`Error stack: ${error.stack}`);

                // Log detailed error info
                const errorDetails = {
                    commentNum,
                    commentId: comment.id,
                    commentType: comment.comment_type,
                    filePath: comment.file_path,
                    errorMessage: error.message,
                    errorType: error.name,
                    timestamp: new Date().toISOString()
                };

                logger.error(`Error details: ${JSON.stringify(errorDetails, null, 2)}`);

                failedCount++;
                // Continue with next comment even if this one fails
            }
        }

        logger.info(`\n${'='.repeat(60)}`);
        logger.info(`Processing complete: ${processedCount} succeeded, ${failedCount} failed`);
        logger.info(`Total commits created: ${commitHashes.length}`);
        logger.info(`Commit hashes: ${commitHashes.map(h => h.substring(0, 8)).join(', ')}`);
        logger.info(`${'='.repeat(60)}\n`);

        // === PHASE 4: Check if we have any commits to push ===
        const { stdout: ahead } = await execa('git', ['status', '-sb'], { cwd: repoDir });

        // Check for uncommitted changes
        const { stdout: uncommittedStatus } = await execa('git', ['status', '--porcelain'], { cwd: repoDir });

        // NEW LOGIC: Don't fail if we have ANY progress
        const hasProgress = commitHashes.length > 0 || uncommittedStatus;
        const allCommentsFailed = failedCount === unprocessedComments.length;

        if (!ahead.includes('ahead') && !hasProgress) {
            const errorMsg = `AI tidak membuat perubahan apapun setelah memproses ${unprocessedComments.length} comments. ` +
                `Berhasil: ${processedCount}, Gagal: ${failedCount}. ` +
                `Kemungkinan penyebab:\n` +
                `1. AI tidak memahami feedback reviewer\n` +
                `2. Comments terlalu kompleks/vague\n` +
                `3. AI mengalami error saat processing\n` +
                `4. Perubahan yang diminta sudah ada di code\n\n` +
                `Solusi:\n` +
                `- Cek logs di atas untuk melihat output AI\n` +
                `- Coba retry dengan prompt yang lebih spesifik\n` +
                `- Atau handle manual jika memang butuh human intervention`;

            logger.warn(errorMsg);

            // Only fail if ALL comments failed AND no progress at all
            if (allCommentsFailed) {
                updateTaskStatus(`PR-${pr.number}`, 'failed', {
                    errorMessage: errorMsg
                });
                return false;
            }
        }

        // If there are uncommitted changes, commit them
        if (uncommittedStatus) {
            logger.info('Found uncommitted changes. Creating final commit...');
            await execa('git', ['add', '.'], { cwd: repoDir, stdio: 'inherit' });
            await execa('git', ['commit', '-m', `fix: remaining changes from AI processing\n\nPR: #${pr.number}`], { cwd: repoDir, stdio: 'inherit' });
            const { stdout: commitHash } = await execa('git', ['rev-parse', 'HEAD'], { cwd: repoDir });
            commitHashes.push(commitHash.trim());
        }

        // If we have some commits but also failures, warn about partial completion
        if (failedCount > 0 && commitHashes.length > 0) {
            logger.warn(`⚠️  Partial completion: ${processedCount} comments fixed, ${failedCount} failed. Pushing partial changes...`);
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
            let commentBody = `Halo Kang @${config.reviewerHandle}, revisinya udah beres ya! 🚀\n\n`;

            if (failedCount > 0) {
                commentBody += `⚠️  **Status: Partial Completion**\n\n`;
                commentBody += `📊 **Summary:**\n`;
                commentBody += `- ✅ Berhasil diperbaiki: ${processedCount} comments\n`;
                commentBody += `- ❌ Perlu manual review: ${failedCount} comments\n`;
                commentBody += `- 📝 Total commits: ${commitHashes.length}\n\n`;

                if (processedCount > 0) {
                    commentBody += `Yang udah diperbaiki silakan dicek dulu ya Kang. `;
                    commentBody += `Untuk yang gagal, kemungkinan:\n`;
                    commentBody += `- Terlalu kompleks untuk AI handle otomatis\n`;
                    commentBody += `- Butuh context atau keputusan arsitektur\n`;
                    commentBody += `- Atau memang udah bener tapi AI bingung �\n\n`;
                    commentBody += `Bisa di-retry lagi atau aku handle manual ya Kang. Makasih! 🙏\n`;
                } else {
                    commentBody += `Maaf Kang, AI belum bisa handle comments-nya secara otomatis. `;
                    commentBody += `Sepertinya butuh manual intervention atau prompt yang lebih spesifik. `;
                    commentBody += `Aku coba handle manual ya atau bisa kasih guidance lebih detail. 🙏\n`;
                }
            } else {
                commentBody += `✅ **Status: All Comments Addressed**\n\n`;
                commentBody += `Total ada ${processedCount} masukan yang udah aku perbaikin. `;
                commentBody += `Sengaja aku bikin jadi ${commitHashes.length} commit terpisah biar akangnya ngereview lebih enak dan gampang ditrack.\n\n`;
                commentBody += `Monggo dicek lagi ya update commit terbarunya. Makasih Kang! 🙏\n`;
            }

            if (commitHashes.length > 0) {
                commentBody += `\n📝 **Commits:** ${commitHashes.map(h => h.substring(0, 8)).join(', ')}`;
            }

            await execa('gh', [
                'pr', 'comment', pr.number.toString(),
                '--body', commentBody,
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

        // Update task status with appropriate message
        if (failedCount > 0 && processedCount > 0) {
            // Partial success - mark as done but with warning
            updateTaskStatus(`PR-${pr.number}`, 'done', {
                errorMessage: `Partial completion: ${processedCount} comments fixed, ${failedCount} need manual review`
            });
            logger.info(`⚠️  Partial success: PR #${pr.number} - ${processedCount} fixed, ${failedCount} need manual review`);
        } else if (failedCount > 0) {
            // All failed but we're not marking as failed (has some progress)
            updateTaskStatus(`PR-${pr.number}`, 'done', {
                errorMessage: `Completed with issues: ${failedCount} comments need manual review`
            });
            logger.info(`⚠️  Completed with issues: PR #${pr.number} - ${failedCount} comments need manual review`);
        } else {
            // Full success
            logger.info(`✅ Successfully updated PR #${pr.number} - all ${processedCount} comments addressed`);
        }

        notifyTaskDone(`PR-${pr.number}`, `PR Fix completed: ${processedCount} fixed, ${failedCount} need manual review`);
        return true;

    } catch (error) {
        logger.error(`❌ Error processing rejected PR #${pr.number}: ${error.message}`);
        logger.error(error.stack);
        notifyTaskError(`PR-${pr.number}`, `Failed to fix PR: ${error.message}`);
        return false;
    }
}
