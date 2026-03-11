import Database from 'better-sqlite3';
import path from 'path';
import fs from 'fs-extra';

let db;
const stmtCache = {};

/**
 * Initialize database — create tables if not exists.
 * SQLite file stored at ./data/agent-malas.db
 */
export function initDb() {
  const dbDir = path.resolve('./data');
  fs.ensureDirSync(dbDir);

  db = new Database(path.join(dbDir, 'agent-malas.db'));
  db.pragma('journal_mode = WAL');
  db.pragma('foreign_keys = ON');

  // Migration: Add unique constraint to prs.url if not exists
  const tableInfo = db.prepare("SELECT sql FROM sqlite_master WHERE type='table' AND name='prs'").get();
  if (tableInfo && !tableInfo.sql.includes('url TEXT UNIQUE')) {
    console.log('Migrating prs table to add unique constraint on url...');
    db.exec(`
      -- Create new table with unique constraint
      CREATE TABLE IF NOT EXISTS prs_new (
        id INTEGER PRIMARY KEY,
        title TEXT,
        repo TEXT,
        task_id TEXT,
        status TEXT DEFAULT 'open',
        review_decision TEXT DEFAULT 'pending',
        url TEXT UNIQUE,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        updated_at DATETIME,
        FOREIGN KEY (task_id) REFERENCES tasks(id) ON DELETE SET NULL
      );

      -- Copy data, keeping only the latest record for each URL
      INSERT INTO prs_new (id, title, repo, task_id, status, review_decision, url, created_at, updated_at)
      SELECT id, title, repo, task_id, status, review_decision, url, created_at, updated_at
      FROM prs
      WHERE id IN (
        SELECT MAX(id) FROM prs GROUP BY url
      );

      -- Replace old table
      DROP TABLE prs;
      ALTER TABLE prs_new RENAME TO prs;

      -- Recreate indexes
      CREATE INDEX IF NOT EXISTS idx_prs_status ON prs(status);
      CREATE INDEX IF NOT EXISTS idx_prs_task_id ON prs(task_id);
    `);
    console.log('Migration completed successfully.');
  }

  db.exec(`
    CREATE TABLE IF NOT EXISTS tasks (
      id TEXT PRIMARY KEY,
      title TEXT,
      description TEXT,
      repo TEXT,
      project_name TEXT,
      status TEXT DEFAULT 'queued',
      base_branch TEXT,
      pr_number INTEGER,
      error_message TEXT,
      started_at DATETIME,
      completed_at DATETIME,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      approval_status TEXT DEFAULT 'pending',
      approved_by TEXT,
      approved_at DATETIME,
      rejection_reason TEXT
    );

    CREATE TABLE IF NOT EXISTS task_logs (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      task_id TEXT,
      level TEXT,
      message TEXT,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (task_id) REFERENCES tasks(id) ON DELETE CASCADE
    );

    CREATE TABLE IF NOT EXISTS prs (
      id INTEGER PRIMARY KEY,
      title TEXT,
      repo TEXT,
      task_id TEXT,
      status TEXT DEFAULT 'open',
      review_decision TEXT DEFAULT 'pending',
      url TEXT UNIQUE,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      updated_at DATETIME,
      FOREIGN KEY (task_id) REFERENCES tasks(id) ON DELETE SET NULL
    );

    CREATE TABLE IF NOT EXISTS daily_metrics (
      date TEXT PRIMARY KEY,
      tasks_completed INTEGER DEFAULT 0,
      tasks_failed INTEGER DEFAULT 0,
      prs_created INTEGER DEFAULT 0,
      prs_revised INTEGER DEFAULT 0
    );

    CREATE TABLE IF NOT EXISTS pr_comments (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      pr_url TEXT NOT NULL,
      comment_id TEXT NOT NULL,
      comment_type TEXT NOT NULL,
      comment_body TEXT,
      file_path TEXT,
      line_number INTEGER,
      review_id INTEGER,
      processed BOOLEAN DEFAULT 0,
      processed_at DATETIME,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      UNIQUE(pr_url, comment_id)
    );

    CREATE TABLE IF NOT EXISTS mobile_devices (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      device_id TEXT UNIQUE NOT NULL,
      device_name TEXT,
      ip_address TEXT,
      last_seen DATETIME DEFAULT CURRENT_TIMESTAMP,
      is_active BOOLEAN DEFAULT 1,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    );

    CREATE TABLE IF NOT EXISTS approval_notifications (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      task_id TEXT NOT NULL,
      notification_type TEXT NOT NULL,
      title TEXT,
      description TEXT,
      status TEXT DEFAULT 'pending',
      sent_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      responded_at DATETIME,
      response_by TEXT,
      FOREIGN KEY (task_id) REFERENCES tasks(id) ON DELETE CASCADE
    );

    -- Performance indexes
    CREATE INDEX IF NOT EXISTS idx_tasks_status ON tasks(status);
    CREATE INDEX IF NOT EXISTS idx_tasks_repo ON tasks(repo);
    CREATE INDEX IF NOT EXISTS idx_tasks_created_at ON tasks(created_at);
    CREATE INDEX IF NOT EXISTS idx_tasks_approval_status ON tasks(approval_status);
    CREATE INDEX IF NOT EXISTS idx_task_logs_task_id ON task_logs(task_id);
    CREATE INDEX IF NOT EXISTS idx_prs_status ON prs(status);
    CREATE INDEX IF NOT EXISTS idx_prs_task_id ON prs(task_id);
    CREATE INDEX IF NOT EXISTS idx_pr_comments_pr_url ON pr_comments(pr_url);
    CREATE INDEX IF NOT EXISTS idx_pr_comments_processed ON pr_comments(processed);
    CREATE INDEX IF NOT EXISTS idx_approval_notifications_status ON approval_notifications(status);
    CREATE INDEX IF NOT EXISTS idx_approval_notifications_task_id ON approval_notifications(task_id);
    CREATE INDEX IF NOT EXISTS idx_mobile_devices_active ON mobile_devices(is_active);
  `);

  // Pre-compile frequently used prepared statements
  stmtCache.insertTask = db.prepare(`
    INSERT OR IGNORE INTO tasks (id, title, description, repo, project_name, status, base_branch, started_at, approval_status)
    VALUES (@id, @title, @description, @repo, @projectName, @status, @baseBranch, @startedAt, 'pending')
  `);
  stmtCache.upsertQueuedTask = db.prepare(`
    INSERT INTO tasks (id, title, description, repo, project_name, status, started_at, approval_status)
    VALUES (@id, @title, @description, @repo, @projectName, 'queued', @startedAt, 'pending')
    ON CONFLICT(id) DO UPDATE SET
      title = @title,
      description = @description,
      repo = @repo,
      project_name = @projectName
    WHERE status NOT IN ('processing', 'done', 'failed')
  `);
  stmtCache.getTask = db.prepare('SELECT * FROM tasks WHERE id = ?');
  stmtCache.insertLog = db.prepare('INSERT INTO task_logs (task_id, level, message) VALUES (@taskId, @level, @message)');
  stmtCache.getLogs = db.prepare('SELECT * FROM task_logs WHERE task_id = ? ORDER BY created_at ASC');
  stmtCache.upsertPR = db.prepare(`
    INSERT INTO prs (id, title, repo, task_id, status, review_decision, url, created_at, updated_at)
    VALUES (@id, @title, @repo, @taskId, @status, @reviewDecision, @url, COALESCE(@createdAt, CURRENT_TIMESTAMP), @updatedAt)
    ON CONFLICT(url) DO UPDATE SET
      title = @title,
      status = @status,
      review_decision = @reviewDecision,
      updated_at = @updatedAt
  `);
  stmtCache.getPRByUrl = db.prepare('SELECT * FROM prs WHERE url = ?');
  stmtCache.getDailyMetrics = db.prepare('SELECT * FROM daily_metrics ORDER BY date DESC LIMIT ?');
  stmtCache.getTodayMetrics = db.prepare('SELECT * FROM daily_metrics WHERE date = ?');
  stmtCache.insertPRComment = db.prepare(`
    INSERT OR IGNORE INTO pr_comments (pr_url, comment_id, comment_type, comment_body, file_path, line_number, review_id)
    VALUES (@prUrl, @commentId, @commentType, @commentBody, @filePath, @lineNumber, @reviewId)
  `);
  stmtCache.getUnprocessedComments = db.prepare('SELECT * FROM pr_comments WHERE pr_url = ? AND processed = 0 ORDER BY created_at ASC');
  stmtCache.markCommentProcessed = db.prepare('UPDATE pr_comments SET processed = 1, processed_at = CURRENT_TIMESTAMP WHERE id = ?');
  stmtCache.getProcessedCommentCount = db.prepare('SELECT COUNT(*) as count FROM pr_comments WHERE pr_url = ? AND processed = 1');

  // Approval workflow statements
  stmtCache.createApprovalNotification = db.prepare(`
    INSERT INTO approval_notifications (task_id, notification_type, title, description)
    VALUES (@taskId, @notificationType, @title, @description)
  `);
  stmtCache.getPendingApprovals = db.prepare(`
    SELECT * FROM approval_notifications WHERE status = 'pending' ORDER BY sent_at DESC
  `);
  stmtCache.updateApprovalStatus = db.prepare(`
    UPDATE approval_notifications 
    SET status = @status, responded_at = CURRENT_TIMESTAMP, response_by = @responseBy
    WHERE id = @id
  `);
  stmtCache.updateTaskApproval = db.prepare(`
    UPDATE tasks 
    SET approval_status = @approvalStatus, approved_by = @approvedBy, approved_at = CURRENT_TIMESTAMP, rejection_reason = @rejectionReason
    WHERE id = @taskId
  `);
  stmtCache.registerMobileDevice = db.prepare(`
    INSERT INTO mobile_devices (device_id, device_name, ip_address, last_seen)
    VALUES (@deviceId, @deviceName, @ipAddress, CURRENT_TIMESTAMP)
    ON CONFLICT(device_id) DO UPDATE SET
      device_name = @deviceName,
      ip_address = @ipAddress,
      last_seen = CURRENT_TIMESTAMP,
      is_active = 1
  `);
  stmtCache.getActiveMobileDevices = db.prepare(`
    SELECT * FROM mobile_devices WHERE is_active = 1 ORDER BY last_seen DESC
  `);

  return db;
}

/**
 * Get raw db instance (for advanced queries)
 */
export function getDb() {
  return db;
}

// ─── Tasks ───────────────────────────────────────────────

export function insertTask(task) {
  return stmtCache.insertTask.run({
    id: task.id,
    title: task.title || null,
    description: task.description || null,
    repo: task.repo || null,
    projectName: task.projectName || null,
    status: task.status || 'queued',
    baseBranch: task.baseBranch || null,
    startedAt: task.startedAt || new Date().toISOString(),
  });
}

/**
 * Insert task as queued, or update metadata if already queued.
 * Does NOT overwrite tasks that are processing/done/failed.
 */
export function upsertQueuedTask(task) {
  return stmtCache.upsertQueuedTask.run({
    id: task.id,
    title: task.title || null,
    description: task.description || null,
    repo: task.repo || null,
    projectName: task.projectName || null,
    startedAt: new Date().toISOString(),
  });
}

export function updateTaskStatus(id, status, extra = {}) {
  const sets = ['status = @status'];
  const params = { id, status };

  if (extra.prNumber !== undefined) {
    sets.push('pr_number = @prNumber');
    params.prNumber = extra.prNumber;
  }
  if (extra.errorMessage !== undefined) {
    sets.push('error_message = @errorMessage');
    params.errorMessage = extra.errorMessage;
  }
  if (status === 'done' || status === 'failed') {
    sets.push('completed_at = @completedAt');
    params.completedAt = new Date().toISOString();
  }

  // Dynamic query — can't be fully cached due to variable SET clauses
  const stmt = db.prepare(`UPDATE tasks SET ${sets.join(', ')} WHERE id = @id`);
  return stmt.run(params);
}

export function getTask(id) {
  return stmtCache.getTask.get(id);
}

export function getTasks(filters = {}) {
  const conditions = [];
  const params = {};

  if (filters.status) {
    conditions.push('status = @status');
    params.status = filters.status;
  }
  if (filters.repo) {
    conditions.push('repo = @repo');
    params.repo = filters.repo;
  }

  const where = conditions.length ? `WHERE ${conditions.join(' AND ')}` : '';
  const limit = parseInt(filters.limit) || 20;
  const offset = parseInt(filters.offset) || 0;

  // Dynamic query — WHERE clause varies by filter combination
  const rows = db.prepare(`SELECT * FROM tasks ${where} ORDER BY created_at DESC LIMIT @limit OFFSET @offset`).all({ ...params, limit, offset });
  const total = db.prepare(`SELECT COUNT(*) as count FROM tasks ${where}`).get(params);

  return { data: rows, total: total.count, limit, offset };
}

// ─── Task Logs ───────────────────────────────────────────

export function insertLog(taskId, level, message) {
  return stmtCache.insertLog.run({ taskId: taskId || null, level, message });
}

export function getLogs(taskId) {
  return stmtCache.getLogs.all(taskId);
}

export function getRecentLogs(limit = 100) {
  return db.prepare('SELECT * FROM task_logs ORDER BY created_at DESC LIMIT ?').all(limit).reverse();
}

// ─── PRs ─────────────────────────────────────────────────

/**
 * Insert or update PR. Uses URL as unique key to prevent duplicates.
 * If PR with same URL exists, updates status and review_decision.
 */
export function insertPR(pr) {
  return stmtCache.upsertPR.run({
    id: pr.id || pr.number,
    title: pr.title || null,
    repo: pr.repo || null,
    taskId: pr.taskId || null,
    status: pr.status || 'open',
    reviewDecision: pr.reviewDecision || 'pending',
    url: pr.url || null,
    createdAt: pr.createdAt || null,
    updatedAt: new Date().toISOString(),
  });
}

export function getPRByUrl(url) {
  return stmtCache.getPRByUrl.get(url);
}

export function getPRs(filters = {}) {
  const conditions = [];
  const params = {};

  if (filters.status) {
    conditions.push('status = @status');
    params.status = filters.status;
  }

  const where = conditions.length ? `WHERE ${conditions.join(' AND ')}` : '';
  const limit = parseInt(filters.limit) || 20;
  const offset = parseInt(filters.offset) || 0;

  const rows = db.prepare(`SELECT * FROM prs ${where} ORDER BY created_at DESC LIMIT @limit OFFSET @offset`).all({ ...params, limit, offset });
  const total = db.prepare(`SELECT COUNT(*) as count FROM prs ${where}`).get(params);

  return { data: rows, total: total.count, limit, offset };
}

// ─── Daily Metrics ───────────────────────────────────────

export function getDailyMetrics(days = 7) {
  return stmtCache.getDailyMetrics.all(days);
}

export function incrementMetric(field) {
  const today = new Date().toISOString().split('T')[0];
  const validFields = ['tasks_completed', 'tasks_failed', 'prs_created', 'prs_revised'];

  if (!validFields.includes(field)) {
    throw new Error(`Invalid metric field: ${field}`);
  }

  db.prepare(`
    INSERT INTO daily_metrics (date, ${field})
    VALUES (@today, 1)
    ON CONFLICT(date) DO UPDATE SET ${field} = ${field} + 1
  `).run({ today });
}

export function getTodayMetrics() {
  const today = new Date().toISOString().split('T')[0];
  return stmtCache.getTodayMetrics.get(today) || {
    date: today,
    tasks_completed: 0,
    tasks_failed: 0,
    prs_created: 0,
    prs_revised: 0,
  };
}

// ─── PR Comments Management ───────────────────────────────────────

/**
 * Insert a new PR comment into the database
 * @param {Object} comment - Comment object
 * @param {string} comment.prUrl - PR URL
 * @param {string} comment.commentId - Unique comment ID
 * @param {string} comment.commentType - Type: 'review' | 'inline' | 'general'
 * @param {string} comment.commentBody - Comment text
 * @param {string} [comment.filePath] - File path for inline comments
 * @param {number} [comment.lineNumber] - Line number for inline comments
 * @param {number} [comment.reviewId] - Review ID
 */
export function insertPRComment(comment) {
  return stmtCache.insertPRComment.run({
    prUrl: comment.prUrl,
    commentId: comment.commentId,
    commentType: comment.commentType,
    commentBody: comment.commentBody,
    filePath: comment.filePath || null,
    lineNumber: comment.lineNumber || null,
    reviewId: comment.reviewId || null
  });
}

/**
 * Get all unprocessed comments for a PR
 * @param {string} prUrl - PR URL
 * @returns {Array} Array of unprocessed comments
 */
export function getUnprocessedComments(prUrl) {
  return stmtCache.getUnprocessedComments.all(prUrl);
}

/**
 * Mark a comment as processed
 * @param {number} commentId - Comment database ID
 */
export function markCommentProcessed(commentId) {
  return stmtCache.markCommentProcessed.run(commentId);
}

/**
 * Get count of processed comments for a PR
 * @param {string} prUrl - PR URL
 * @returns {number} Count of processed comments
 */
export function getProcessedCommentCount(prUrl) {
  const result = stmtCache.getProcessedCommentCount.get(prUrl);
  return result?.count || 0;
}

/**
 * Batch insert multiple PR comments
 * @param {Array} comments - Array of comment objects
 */
export function insertPRCommentsBatch(comments) {
  const insertMany = db.transaction((comments) => {
    for (const comment of comments) {
      insertPRComment(comment);
    }
  });
  return insertMany(comments);
}
/**
 * Get all comments for a PR URL
 * @param {string} prUrl - PR URL
 * @returns {Array} Array of all comments
 */
export function getAllPRComments(prUrl) {
  return db.prepare(`
    SELECT 
      id,
      comment_id,
      comment_type,
      comment_body,
      file_path,
      line_number,
      review_id,
      processed,
      processed_at,
      created_at
    FROM pr_comments 
    WHERE pr_url = ? 
    ORDER BY created_at ASC
  `).all(prUrl);
}

/**
 * Get comment statistics for a PR URL
 * @param {string} prUrl - PR URL
 * @returns {Object} Statistics object
 */
export function getPRCommentStats(prUrl) {
  const result = db.prepare(`
    SELECT 
      COUNT(*) as total,
      SUM(CASE WHEN processed = 1 THEN 1 ELSE 0 END) as processed,
      SUM(CASE WHEN processed = 0 THEN 1 ELSE 0 END) as unprocessed
    FROM pr_comments 
    WHERE pr_url = ?
  `).get(prUrl);

  return {
    total: result.total || 0,
    processed: result.processed || 0,
    unprocessed: result.unprocessed || 0,
    progress: result.total > 0 ? Math.round(((result.processed || 0) / result.total) * 100) : 0
  };
}

// ─── Approval Workflow ───────────────────────────────────────────

/**
 * Create approval notification for a task
 */
export function createApprovalNotification(taskId, notificationType, title, description) {
  return stmtCache.createApprovalNotification.run({
    taskId,
    notificationType,
    title,
    description
  });
}

/**
 * Get all pending approval notifications
 */
export function getPendingApprovals() {
  return stmtCache.getPendingApprovals.all();
}

/**
 * Update approval notification status
 */
export function updateApprovalStatus(id, status, responseBy) {
  return stmtCache.updateApprovalStatus.run({
    id,
    status,
    responseBy
  });
}

/**
 * Update task approval status
 */
export function updateTaskApproval(taskId, approvalStatus, approvedBy, rejectionReason = null) {
  return stmtCache.updateTaskApproval.run({
    taskId,
    approvalStatus,
    approvedBy,
    rejectionReason
  });
}

/**
 * Register or update mobile device
 */
export function registerMobileDevice(deviceId, deviceName, ipAddress) {
  return stmtCache.registerMobileDevice.run({
    deviceId,
    deviceName,
    ipAddress
  });
}

/**
 * Get all active mobile devices
 */
export function getActiveMobileDevices() {
  return stmtCache.getActiveMobileDevices.all();
}

/**
 * Get tasks pending approval
 */
export function getTasksPendingApproval() {
  return db.prepare(`
    SELECT * FROM tasks 
    WHERE approval_status = 'pending' 
    ORDER BY created_at DESC
  `).all();
}

/**
 * Get approval notification by task ID
 */
export function getApprovalNotificationByTaskId(taskId) {
  return db.prepare(`
    SELECT * FROM approval_notifications 
    WHERE task_id = ? 
    ORDER BY sent_at DESC 
    LIMIT 1
  `).get(taskId);
}

/**
 * Check if there's already a pending notification for a task
 */
export function hasPendingNotification(taskId) {
  const result = db.prepare(`
    SELECT COUNT(*) as count 
    FROM approval_notifications 
    WHERE task_id = ? AND status = 'pending'
  `).get(taskId);
  return result.count > 0;
}
