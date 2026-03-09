import { config } from './config.js';
import { logger } from './logger.js';
import { fetchReadyTasks } from './github-project.js';
import { fetchRejectedPRs } from './github-pr.js';
import { processTask, processRejectedPR } from './worker.js';
import { sendDailyStandup } from './report.js';
import { initDb, insertTask, upsertQueuedTask, updateTaskStatus, insertPR, incrementMetric } from './db.js';
import { startServer } from './server.js';
import { setupWebSocket, broadcast } from './websocket.js';
import { setAgentStatus, setCurrentTask, setLastRun } from './agent-state.js';
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

    // Pick the first task to process
    const task = tasks[0];
    logger.info(`Dequeuing task: ${task.title}`);
    setCurrentTask(task.title);
    setAgentStatus('processing');
    broadcast('agent:status', { status: 'processing' });
    broadcast('queue:update', { tasks: tasks.map(t => ({ id: t.id, title: t.title, repo: t.repo })) });

    // Mark the active task as 'processing'
    updateTaskStatus(String(task.id), 'processing');

    const success = await processTask(task);

    if (success) {
      metrics.tasksCompleted++;
      updateTaskStatus(String(task.id), 'done');
      incrementMetric('tasks_completed');
      incrementMetric('prs_created');
    } else {
      updateTaskStatus(String(task.id), 'failed', {
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
    }

    const pr = rejectedPRs[0];
    logger.info(`Dequeuing rejected PR: #${pr.number}`);
    setCurrentTask(`Fix PR #${pr.number}`);

    const success = await processRejectedPR(pr);
    if (success) {
      metrics.prsRevised++;
      incrementMetric('prs_revised');
    }
    setCurrentTask(null);
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
