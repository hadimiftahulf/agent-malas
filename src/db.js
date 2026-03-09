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
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP
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

    -- Performance indexes
    CREATE INDEX IF NOT EXISTS idx_tasks_status ON tasks(status);
    CREATE INDEX IF NOT EXISTS idx_tasks_repo ON tasks(repo);
    CREATE INDEX IF NOT EXISTS idx_tasks_created_at ON tasks(created_at);
    CREATE INDEX IF NOT EXISTS idx_task_logs_task_id ON task_logs(task_id);
    CREATE INDEX IF NOT EXISTS idx_prs_status ON prs(status);
    CREATE INDEX IF NOT EXISTS idx_prs_task_id ON prs(task_id);
  `);

  // Pre-compile frequently used prepared statements
  stmtCache.insertTask = db.prepare(`
    INSERT OR IGNORE INTO tasks (id, title, description, repo, project_name, status, base_branch, started_at)
    VALUES (@id, @title, @description, @repo, @projectName, @status, @baseBranch, @startedAt)
  `);
  stmtCache.upsertQueuedTask = db.prepare(`
    INSERT INTO tasks (id, title, description, repo, project_name, status, started_at)
    VALUES (@id, @title, @description, @repo, @projectName, 'queued', @startedAt)
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
