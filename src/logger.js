import chalk from 'chalk';
import { config } from './config.js';

const levels = { info: 0, warn: 1, error: 2 };
const currentLevel = levels[config.logLevel] || 0;

// Cached DB module reference
let _dbModule = null;

function logToDb(taskId, level, msg) {
  if (!taskId) return;

  if (_dbModule) {
    try {
      _dbModule.insertLog(taskId, level, typeof msg === 'string' ? msg : String(msg));
    } catch { /* DB not ready */ }
    return;
  }

  import('./db.js').then((db) => {
    _dbModule = db;
    db.insertLog(taskId, level, typeof msg === 'string' ? msg : String(msg));
  }).catch(() => { });
}

// Cached reference — resolved lazily to avoid circular dep with websocket.js
let _wsBroadcast = null;

function broadcastLog(level, msg, taskId) {
  const msgStr = typeof msg === 'string' ? msg : String(msg);
  // Prevent infinite loop on WS-related log messages
  if (msgStr.includes('[WS]')) return;

  const payload = {
    level,
    message: msgStr,
    taskId: taskId || null,
    timestamp: new Date().toISOString(),
  };

  if (_wsBroadcast) {
    try { _wsBroadcast('log', payload); } catch { /* WS not ready */ }
    return;
  }

  // First call: resolve and cache the broadcast function
  import('./websocket.js').then((ws) => {
    _wsBroadcast = ws.broadcast;
    ws.broadcast('log', payload);
  }).catch((err) => {
    console.error('[Logger] Failed to load websocket module:', err.message);
  });
}

export const logger = {
  info: (msg, taskId) => {
    if (currentLevel <= 0) console.log(chalk.blue('[INFO]'), msg);
    logToDb(taskId, 'info', msg);
    broadcastLog('info', msg, taskId);
  },
  warn: (msg, taskId) => {
    if (currentLevel <= 1) console.log(chalk.yellow('[WARN]'), msg);
    logToDb(taskId, 'warn', msg);
    broadcastLog('warn', msg, taskId);
  },
  error: (msg, taskId) => {
    if (currentLevel <= 2) console.log(chalk.red('[ERROR]'), msg);
    logToDb(taskId, 'error', msg);
    broadcastLog('error', msg, taskId);
  },
};
