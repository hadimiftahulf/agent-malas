import { Router } from 'express';
import { config } from '../config.js';
import {
  getTasks, getTask, getLogs, getRecentLogs,
  getPRs, getDailyMetrics, getTodayMetrics,
  getUnprocessedComments, getProcessedCommentCount,
  getAllPRComments, getPRCommentStats
} from '../db.js';
import { getAgentState } from '../agent-state.js';
import approvalRouter from './approval.js';
import mobileRouter from './mobile.js';
import serverInfoRouter from './server-info.js';

export const apiRouter = Router();

// Mount sub-routers
apiRouter.use('/approval', approvalRouter);
apiRouter.use('/mobile', mobileRouter);
apiRouter.use('/server-info', serverInfoRouter);

const startTime = Date.now();

// ─── GET /api/health ─────────────────────────────────────

apiRouter.get('/health', (req, res) => {
  const state = getAgentState();
  res.json({
    status: 'ok',
    agent: state.status,
    uptime: Math.floor((Date.now() - startTime) / 1000),
    lastRun: state.lastRun,
    version: '1.0.0',
  });
});

// ─── GET /api/dashboard ──────────────────────────────────

apiRouter.get('/dashboard', (req, res) => {
  const state = getAgentState();
  const today = getTodayMetrics();

  // Get queued tasks count
  const queueResult = getTasks({ status: 'queued', limit: 100 });

  // Recent activity — last 5 tasks regardless of status
  const recentTasks = getTasks({ limit: 5 });

  // Sparkline — daily tasks_completed for last 7 days
  const sparkline = getDailyMetrics(7);

  // PR stats summary
  const allPRs = getPRs({ limit: 200 });
  const prStats = { open: 0, merged: 0, closed: 0, changesRequested: 0, approved: 0 };
  (allPRs.data || []).forEach(pr => {
    if (pr.status === 'open') prStats.open++;
    if (pr.status === 'merged') prStats.merged++;
    if (pr.status === 'closed') prStats.closed++;
    if (pr.review_decision === 'changes_requested') prStats.changesRequested++;
    if (pr.review_decision === 'approved') prStats.approved++;
  });

  res.json({
    today: {
      tasksCompleted: today.tasks_completed,
      tasksFailed: today.tasks_failed,
      prsCreated: today.prs_created,
      prsRevised: today.prs_revised,
    },
    queue: {
      size: queueResult.total,
      currentTask: state.currentTask,
    },
    agent: {
      status: state.status,
      uptime: Math.floor((Date.now() - startTime) / 1000),
    },
    recentTasks: (recentTasks.data || []).map(t => ({
      id: t.id,
      title: t.title,
      status: t.status,
      repo: t.repo,
      createdAt: t.created_at,
      completedAt: t.completed_at,
    })),
    sparkline: sparkline.map(d => ({
      date: d.date,
      completed: d.tasks_completed,
      failed: d.tasks_failed,
    })),
    prStats,
  });
});

// ─── GET /api/tasks ──────────────────────────────────────

apiRouter.get('/tasks', (req, res) => {
  const { status, repo, limit, offset } = req.query;
  const result = getTasks({ status, repo, limit, offset });
  res.json(result);
});

// ─── GET /api/tasks/:id ──────────────────────────────────

apiRouter.get('/tasks/:id', (req, res) => {
  const task = getTask(req.params.id);
  if (!task) {
    return res.status(404).json({ error: 'Task not found' });
  }
  const logs = getLogs(req.params.id);
  res.json({ ...task, logs });
});

// ─── GET /api/logs/recent ────────────────────────────────

apiRouter.get('/logs/recent', (req, res) => {
  const limit = parseInt(req.query.limit) || 100;
  const logs = getRecentLogs(limit);
  res.json(logs.map(l => ({
    level: l.level,
    message: l.message,
    taskId: l.task_id,
    timestamp: l.created_at,
  })));
});

// ─── GET /api/dashboard/metrics ──────────────────────────

apiRouter.get('/dashboard/metrics', (req, res) => {
  const days = parseInt(req.query.days) || 7;
  const metrics = getDailyMetrics(days);
  res.json({ data: metrics, days });
});

// ─── GET /api/reports ────────────────────────────────────

apiRouter.get('/reports', (req, res) => {
  const days = parseInt(req.query.days) || 30;
  const metrics = getDailyMetrics(days);
  res.json({ data: metrics, days });
});

// ─── GET /api/prs ────────────────────────────────────────

apiRouter.get('/prs', (req, res) => {
  try {
    const { status, limit, offset } = req.query;
    const result = getPRs({ status, limit, offset });

    // Enrich PRs with comment stats
    const enrichedPRs = result.data.map(pr => {
      if (pr.url) {
        try {
          const unprocessedComments = getUnprocessedComments(pr.url);
          const processedCount = getProcessedCommentCount(pr.url);
          const totalComments = unprocessedComments.length + processedCount;

          return {
            ...pr,
            commentStats: {
              total: totalComments,
              processed: processedCount,
              unprocessed: unprocessedComments.length,
              progress: totalComments > 0 ? Math.round((processedCount / totalComments) * 100) : 0
            }
          };
        } catch (commentError) {
          console.error(`Error getting comment stats for PR ${pr.id}:`, commentError);
          return pr; // Return PR without commentStats if error
        }
      }
      return pr;
    });

    res.json({ ...result, data: enrichedPRs });
  } catch (error) {
    console.error('Error in /api/prs:', error);
    res.status(500).json({ error: error.message });
  }
});

// ─── GET /api/prs/:prId/comments ─────────────────────────

apiRouter.get('/prs/:prId/comments', (req, res) => {
  const { prId } = req.params;

  // Find PR by ID to get URL
  const allPRs = getPRs({ limit: 1000 });
  const pr = allPRs.data.find(p => p.id == prId);

  if (!pr || !pr.url) {
    return res.status(404).json({ error: 'PR not found or no URL available' });
  }

  try {
    // Get all comments and stats using helper functions
    const comments = getAllPRComments(pr.url);
    const stats = getPRCommentStats(pr.url);

    res.json({
      pr: {
        id: pr.id,
        title: pr.title,
        url: pr.url,
        repo: pr.repo
      },
      stats,
      comments: comments.map(c => ({
        id: c.id,
        commentId: c.comment_id,
        type: c.comment_type,
        body: c.comment_body,
        filePath: c.file_path,
        lineNumber: c.line_number,
        reviewId: c.review_id,
        processed: Boolean(c.processed),
        processedAt: c.processed_at,
        createdAt: c.created_at
      }))
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// ─── GET /api/prs/stats ──────────────────────────────────

apiRouter.get('/prs/stats', (req, res) => {
  const all = getPRs({ limit: 1000 });
  const stats = { approved: 0, changes_requested: 0, pending: 0, merged: 0 };
  for (const pr of all.data) {
    if (pr.status === 'merged') stats.merged++;
    else if (pr.review_decision === 'approved') stats.approved++;
    else if (pr.review_decision === 'changes_requested') stats.changes_requested++;
    else stats.pending++;
  }
  res.json(stats);
});

// ─── GET /api/queue ──────────────────────────────────────

apiRouter.get('/queue', (req, res) => {
  const result = getTasks({ status: 'queued', limit: 50 });
  res.json(result.data);
});

// ─── GET /api/config ─────────────────────────────────────

apiRouter.get('/config', (req, res) => {
  res.json({
    checkInterval: config.checkInterval,
    dryRun: config.dryRun,
    geminiYolo: config.geminiYolo,
    reviewerHandle: config.reviewerHandle,
    logLevel: config.logLevel,
  });
});

// ─── POST /api/config ────────────────────────────────────

apiRouter.post('/config', (req, res) => {
  const updates = req.body;
  if (updates.checkInterval !== undefined) config.checkInterval = parseInt(updates.checkInterval) || 600;
  if (updates.dryRun !== undefined) config.dryRun = Boolean(updates.dryRun);
  if (updates.geminiYolo !== undefined) config.geminiYolo = Boolean(updates.geminiYolo);
  if (updates.logLevel !== undefined) config.logLevel = updates.logLevel;
  res.json({ success: true, config: { checkInterval: config.checkInterval, dryRun: config.dryRun, geminiYolo: config.geminiYolo } });
});

// ─── POST /api/agent/start ───────────────────────────────

apiRouter.post('/agent/start', (req, res) => {
  // This is a placeholder - actual implementation would need to manage the agent loop
  res.json({ success: true, message: 'Agent start requested (requires restart)' });
});

// ─── POST /api/agent/stop ────────────────────────────────

apiRouter.post('/agent/stop', (req, res) => {
  // This is a placeholder - actual implementation would need to manage the agent loop
  res.json({ success: true, message: 'Agent stop requested (requires restart)' });
});

// ─── POST /api/agent/run-once ────────────────────────────

apiRouter.post('/agent/run-once', async (req, res) => {
  try {
    // Import run function dynamically to avoid circular dependency
    const { runOnce } = await import('../index.js');

    // Trigger one cycle in background
    runOnce().catch(err => {
      console.error('Error in run-once:', err);
    });

    res.json({ success: true, message: 'Agent cycle triggered' });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// ─── POST /api/config ────────────────────────────────────

apiRouter.post('/config', (req, res) => {
  const { checkInterval, dryRun, geminiYolo } = req.body;

  if (checkInterval !== undefined) {
    config.checkInterval = parseInt(checkInterval);
  }
  if (dryRun !== undefined) {
    config.dryRun = Boolean(dryRun);
  }
  if (geminiYolo !== undefined) {
    config.geminiYolo = Boolean(geminiYolo);
  }

  res.json({
    success: true,
    config: {
      checkInterval: config.checkInterval,
      dryRun: config.dryRun,
      geminiYolo: config.geminiYolo,
    },
  });
});

// ─── POST /api/queue/:id/skip ────────────────────────────

apiRouter.post('/queue/:id/skip', async (req, res) => {
  try {
    const { updateTaskStatus } = await import('../db.js');
    updateTaskStatus(req.params.id, 'skipped');
    res.json({ success: true, message: 'Task skipped' });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// ─── POST /api/queue/:id/priority ────────────────────────

apiRouter.post('/queue/:id/priority', (req, res) => {
  // This would require a priority field in the database
  // For now, just return success
  res.json({ success: true, message: 'Task prioritized (not implemented yet)' });
});

// ─── POST /api/tasks/:id/retry ───────────────────────────

apiRouter.post('/tasks/:id/retry', async (req, res) => {
  try {
    const { updateTaskStatus } = await import('../db.js');
    const taskId = req.params.id;

    // Get task to verify it exists and is failed
    const task = getTask(taskId);
    if (!task) {
      return res.status(404).json({ error: 'Task not found' });
    }

    if (task.status !== 'failed') {
      return res.status(400).json({ error: `Task is not in failed status (current: ${task.status})` });
    }

    // Reset task to pending status
    updateTaskStatus(taskId, 'pending');

    res.json({
      success: true,
      message: `Task ${taskId} has been reset to pending and will be retried`,
      task: {
        id: taskId,
        title: task.title,
        status: 'pending'
      }
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// ─── POST /api/tasks/retry-all-failed ────────────────────

apiRouter.post('/tasks/retry-all-failed', async (req, res) => {
  try {
    const Database = (await import('better-sqlite3')).default;
    const db = new Database('data/agent-malas.db');

    const result = db.prepare(`
      UPDATE tasks 
      SET status = 'pending'
      WHERE status = 'failed'
    `).run();

    db.close();

    res.json({
      success: true,
      message: `${result.changes} failed tasks have been reset to pending`,
      count: result.changes
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});
