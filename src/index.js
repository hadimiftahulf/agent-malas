import { config } from './config.js';
import { logger } from './logger.js';
import { fetchReadyTasks } from './github-project.js';
import { fetchRejectedPRs } from './github-pr.js';
import { processTask, processRejectedPR } from './worker-improved.js';
import { sendDailyStandup } from './report.js';
import { initDb, upsertQueuedTask, updateTaskStatus, insertPR, incrementMetric, getTask, resetProcessingTasks } from './db.js';
import { startServer } from './server.js';
import { setupWebSocket, broadcast } from './websocket.js';
import { setAgentStatus, setCurrentTask, setLastRun } from './agent-state.js';
import { requestTaskApproval, isTaskApproved, isTaskRejected } from './approval-helper.js';
import fs from 'fs-extra';

const metrics = { tasksCompleted: 0, prsRevised: 0 };
let standupSentToday = false;

async function run(once = false) {
  setAgentStatus('running');
  broadcast('agent:status', { status: 'running' });
  logger.info('Starting task check...');

  // Send daily standup at 15:00
  const now = new Date();
  const hour = now.getHours();

  // Reset flag after midnight
  if (hour < 1) standupSentToday = false;

  // Send report at 15:00 (only once per day)
  if (hour >= 15 && !standupSentToday) {
    await sendDailyStandup(metrics);
    metrics.tasksCompleted = 0;
    metrics.prsRevised = 0;
    standupSentToday = true;
  }

  const tasks = await fetchReadyTasks();
  const rejectedPRs = await fetchRejectedPRs();

  logger.info(`Found ${tasks.length} ready tasks and ${rejectedPRs.length} rejected PRs`);

  if (tasks.length === 0 && rejectedPRs.length === 0) {
    logger.info('No tasks or rejected PRs to process');
    setAgentStatus('idle');
    broadcast('agent:status', { status: 'idle' });
    setCurrentTask(null);
    setLastRun(new Date().toISOString());
    return;
  }

  // Handle tasks (Process only 1 task maximum per interval to maintain queue discipline)
  if (tasks.length > 0) {
    console.log('\n--- NEW TASKS PENDING ---');
    console.log(`Total: ${tasks.length} tasks in queue\n`);

    // Sync ALL pending tasks into DB as 'queued' so frontend can display the full queue
    // upsertQueuedTask will NOT overwrite tasks already in 'processing', 'done', or 'failed'
    for (const t of tasks) {
      upsertQueuedTask({
        id: String(t.id),
        title: t.title,
        description: t.description,
        repo: t.repo,
        projectName: t.projectName,
      });
    }

    let task = null;
    let taskId = null;
    let taskFromDb = null;

    for (const t of tasks) {
      const idStr = String(t.id);
      const dbTask = getTask(idStr);

      if (isTaskRejected(idStr)) {
        if (dbTask && dbTask.status !== 'skipped') {
          logger.info(`Task ${idStr} was rejected. Skipping locally...`);
          updateTaskStatus(idStr, 'skipped', {
            errorMessage: `Rejected by ${dbTask.approved_by}: ${dbTask.rejection_reason || 'No reason provided'}`
          });
        }
        continue; // Lanjut ke task berikutnya yang tidak di-reject
      }

      // Lewati task yang sudah lewat fase eksekusi atau sedang berjalan
      if (dbTask && ['done', 'failed', 'skipped', 'processing'].includes(dbTask.status)) {
        continue;
      }

      task = t;
      taskId = idStr;
      taskFromDb = dbTask;
      break;
    }

    if (task) {
      // If task is new or pending approval, request approval
      if (!taskFromDb || taskFromDb.approval_status === 'pending') {
        logger.info(`Task ${taskId} requires approval: ${task.title}`);

        // Request approval (will broadcast to frontend)
        requestTaskApproval(
          taskId,
          'issue',
          `New Task: ${task.title}`,
          `Repository: ${task.repo}\n\n${task.description || 'No description'}`
        );

        logger.info(`Waiting for approval for task ${taskId}...`);
        setAgentStatus('waiting_approval');
        broadcast('agent:status', { status: 'waiting_approval', taskId });
        setLastRun(new Date().toISOString());
        return; // Don't process this task, wait for approval, and exit loop interval!
      } else if (!isTaskApproved(taskId)) {
        // Check if task is approved
        logger.info(`Task ${taskId} is not yet approved. Waiting...`);
        setAgentStatus('waiting_approval');
        broadcast('agent:status', { status: 'waiting_approval', taskId });
        setLastRun(new Date().toISOString());
        return; // Don't process this task, exit loop interval!
      }
    }

    if (task) {
      // Task is approved, proceed with execution
      logger.info(`Task ${taskId} is approved. Processing...`);
      logger.info(`Dequeuing task: ${task.title}`);
      setCurrentTask(task.title);
      setAgentStatus('processing');
      broadcast('agent:status', { status: 'processing' });
      broadcast('queue:update', { tasks: tasks.map(t => ({ id: t.id, title: t.title, repo: t.repo })) });

      // Mark the active task as 'processing'
      updateTaskStatus(taskId, 'processing');

      const success = await processTask(task);

      if (success) {
        metrics.tasksCompleted++;
        updateTaskStatus(taskId, 'done');
        incrementMetric('tasks_completed');
        incrementMetric('prs_created');
      } else {
        updateTaskStatus(taskId, 'failed', {
          errorMessage: 'Task processing returned false',
        });
        incrementMetric('tasks_failed');
      }

      setCurrentTask(null);

      // We break here to process 1 item per loop iteration (unless once is true, then we process 1 and stop)
      if (!once) {
        logger.info('Task processed. Will check queue again next interval.');
        setAgentStatus('idle');
        broadcast('agent:status', { status: 'idle' });
        setLastRun(new Date().toISOString());
        return;
      }
    }
  }

  // Handle PR feedbacks (Process only 1 rejected PR per interval)
  if (rejectedPRs.length > 0) {
    console.log('\n--- REJECTED PRs PENDING ---');
    console.log(`Total: ${rejectedPRs.length} PRs in queue\n`);

    // Sync all rejected PRs to DB so frontend can track them
    for (const p of rejectedPRs) {
      insertPR({
        id: p.number,
        title: p.title,
        repo: p.repository?.nameWithOwner || p.repo || 'unknown/repo',
        status: 'open',
        reviewDecision: 'changes_requested',
        url: p.url,
      });
      
      upsertQueuedTask({
        id: `PR-${p.number}`,
        title: `Fix PR #${p.number}: ${p.title}`,
        description: `Rejected PR with ${p.unprocessedComments?.length || 0} comments to address`,
        repo: p.repository?.nameWithOwner || p.repo || 'unknown/repo',
        projectName: 'PR Fixes',
      });
    }

    let pr = null;
    let prTaskId = null;
    let taskFromDb = null;

    for (const p of rejectedPRs) {
      const idStr = `PR-${p.number}`;
      const dbTask = getTask(idStr);

      if (isTaskRejected(idStr)) {
        if (dbTask && dbTask.status !== 'skipped') {
          logger.info(`PR #${p.number} fix was rejected. Skipping locally...`);
          updateTaskStatus(idStr, 'skipped', {
            errorMessage: `Rejected by ${dbTask.approved_by}: ${dbTask.rejection_reason || 'No reason provided'}`
          });
        }
        continue;
      }

      if (dbTask && ['done', 'failed', 'skipped', 'processing'].includes(dbTask.status)) {
        continue;
      }

      pr = p;
      prTaskId = idStr;
      taskFromDb = dbTask;
      break;
    }

    if (pr) {
      // If PR fix needs approval
      if (!taskFromDb || taskFromDb.approval_status === 'pending') {
        logger.info(`PR #${pr.number} fix requires approval`);

        // Build comment summary
        const commentSummary = pr.unprocessedComments?.slice(0, 3).map((c, i) =>
          `${i + 1}. [${c.comment_type}] ${c.comment_body.substring(0, 100)}...`
        ).join('\n') || 'No comments';

        const totalComments = pr.unprocessedComments?.length || 0;
        const moreText = totalComments > 3 ? `\n... and ${totalComments - 3} more comments` : '';

        requestTaskApproval(
          prTaskId,
          'pr_rejected',
          `Fix Rejected PR #${pr.number}`,
          `Repository: ${pr.repository?.nameWithOwner || pr.repo}\nPR: ${pr.title}\n\nComments to address (${totalComments}):\n${commentSummary}${moreText}`
        );

        logger.info(`Waiting for approval for PR #${pr.number}...`);
        setAgentStatus('waiting_approval');
        broadcast('agent:status', { status: 'waiting_approval', taskId: prTaskId });
        setLastRun(new Date().toISOString());
        return; // Don't process this PR, wait for approval, and exit loop interval!
      } else if (!isTaskApproved(prTaskId)) {
        // Check if approved
        logger.info(`PR #${pr.number} fix is not yet approved. Waiting...`);
        setAgentStatus('waiting_approval');
        broadcast('agent:status', { status: 'waiting_approval', taskId: prTaskId });
        setLastRun(new Date().toISOString());
        return; // Don't process this PR, exit loop interval!
      }
    }

    if (pr) {
      // Approved, proceed with fixing
      logger.info(`PR #${pr.number} fix is approved. Processing...`);
      logger.info(`Dequeuing rejected PR: #${pr.number}`);
      setCurrentTask(`Fix PR #${pr.number}`);
      updateTaskStatus(prTaskId, 'processing');

      const success = await processRejectedPR(pr);
      if (success) {
        metrics.prsRevised++;
        incrementMetric('prs_revised');
        updateTaskStatus(prTaskId, 'done');
      } else {
        updateTaskStatus(prTaskId, 'failed', {
          errorMessage: 'PR fix processing returned false'
        });
      }
      setCurrentTask(null);
    }
  }

  if (once) {
    // Attempt sending metrics on exit in 'once' mode
    await sendDailyStandup(metrics);
  }

  setAgentStatus('idle');
  broadcast('agent:status', { status: 'idle' });
  setLastRun(new Date().toISOString());
  logger.info('All pending works processed');
}

async function main() {
  const once = process.argv.includes('--once');

  if (config.dryRun) {
    logger.info('Running in DRY RUN mode - no actual changes will be made');
  }

  // Initialize database
  initDb();
  logger.info('Database initialized');

  const resetCount = resetProcessingTasks();
  if (resetCount > 0) {
    logger.info(`Reset ${resetCount} stuck tasks to 'queued' state`);
  }

  // Start API server and setup WebSocket
  const httpServer = await startServer(config.apiPort);
  setupWebSocket(httpServer);
  logger.info('WebSocket server attached');

  await fs.ensureDir(config.workspaceDir);

  if (once) {
    await run(true);
  } else {
    while (true) {
      await run(false);
      logger.info(`Waiting ${config.checkInterval} seconds...`);
      await new Promise(resolve => setTimeout(resolve, config.checkInterval * 1000));
    }
  }
}

main().catch(error => {
  logger.error(error.message);
  process.exit(1);
});
