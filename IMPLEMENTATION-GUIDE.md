# Implementation Guide - Agent Malas Improvements

## 📋 Overview

Dokumen ini berisi langkah-langkah implementasi untuk memperbaiki performance dan bug di Agent Malas system.

## 🎯 Goals

1. ✅ Zero data loss saat error
2. ✅ Zero stuck tasks (auto-recovery)
3. ✅ Proper error handling dengan retry mechanism
4. ✅ Memory leak fixes
5. ✅ Graceful shutdown
6. ✅ Health monitoring

## 📦 New Files Created

1. `src/db-transactions.js` - Database transaction helpers
2. `src/retry-helper.js` - Retry mechanism dengan exponential backoff
3. `src/graceful-shutdown.js` - Graceful shutdown handler
4. `src/worker-improved.js` - Improved worker dengan proper error handling
5. `src/health-monitor.js` - Health monitoring system
6. `PERFORMANCE-AND-BUG-FIXES.md` - Detailed analysis

## 🔧 Implementation Steps

### Phase 1: Critical Fixes (Week 1)

#### Step 1: Integrate Transaction Support

**File**: `src/index.js`

```javascript
// Add import
import { acquireTaskLock, releaseTaskLock, cleanupStuckTasks } from './db-transactions.js';

// In main() function, after initDb():
// Cleanup stuck tasks on startup
const cleaned = cleanupStuckTasks();
if (cleaned > 0) {
  logger.info(`Cleaned up ${cleaned} stuck task(s) on startup`);
}
```

#### Step 2: Replace Worker with Improved Version

**Option A: Gradual Migration**
```bash
# Rename old worker
mv src/worker.js src/worker-old.js

# Use new worker
mv src/worker-improved.js src/worker.js
```

**Option B: Side-by-side Testing**
```javascript
// In src/index.js
import { processTask as processTaskOld } from './worker-old.js';
import { processTask as processTaskNew } from './worker-improved.js';

// Use feature flag
const useNewWorker = process.env.USE_NEW_WORKER === 'true';
const processTask = useNewWorker ? processTaskNew : processTaskOld;
```

#### Step 3: Add Graceful Shutdown

**File**: `src/index.js`

```javascript
// Add imports
import { 
  setupGracefulShutdown, 
  setCurrentTaskPromise, 
  clearCurrentTaskPromise,
  startPeriodicCleanup,
  onShutdown
} from './graceful-shutdown.js';

// In main() function, before the loop:
setupGracefulShutdown();
startPeriodicCleanup(300000); // 5 minutes

// Register WebSocket cleanup
onShutdown(async () => {
  if (wss) {
    wss.close();
    logger.info('WebSocket server closed');
  }
});

// In run() function, wrap task processing:
if (tasks.length > 0) {
  const task = tasks[0];
  
  // Set current task promise for graceful shutdown
  const taskPromise = processTask(task);
  setCurrentTaskPromise(taskPromise);
  
  const success = await taskPromise;
  clearCurrentTaskPromise();
  
  // ... rest of the code
}
```

#### Step 4: Add Health Monitoring

**File**: `src/index.js`

```javascript
// Add import
import { healthMonitor } from './health-monitor.js';

// In main() function, after server start:
healthMonitor.start();
logger.info('Health monitor started');

// Register cleanup on shutdown
onShutdown(async () => {
  healthMonitor.stop();
});
```

**File**: `src/routes/api.js`

```javascript
// Add import
import { healthMonitor } from '../health-monitor.js';

// Add new endpoint
apiRouter.get('/health/detailed', async (req, res) => {
  const status = await healthMonitor.getHealthStatus();
  res.json(status);
});

apiRouter.get('/health/metrics', (req, res) => {
  const metrics = healthMonitor.getMetrics();
  res.json(metrics);
});

apiRouter.post('/health/alerts/:id/acknowledge', (req, res) => {
  healthMonitor.acknowledgeAlert(req.params.id);
  res.json({ success: true });
});
```

#### Step 5: Fix WebSocket Memory Leak

**File**: `src/websocket.js`

```javascript
// Update setupWebSocket function
export function setupWebSocket(httpServer) {
    wss = new WebSocketServer({ server: httpServer, path: '/ws' });

    wss.on('connection', (ws, req) => {
        const clientId = `${req.socket.remoteAddress}:${req.socket.remotePort}`;
        logger.info(`[WS] Client connected: ${clientId}`);
        clients.add(ws);

        // Heartbeat mechanism
        ws.isAlive = true;
        ws.on('pong', () => {
            ws.isAlive = true;
        });

        ws.on('message', (data) => {
            try {
                const msg = JSON.parse(data.toString());
                if (msg.type === 'ping') {
                    ws.send(JSON.stringify({ type: 'pong', timestamp: Date.now() }));
                }
            } catch (err) {
                logger.warn(`[WS] Invalid message from ${clientId}: ${err.message}`);
            }
        });

        ws.on('close', () => {
            logger.info(`[WS] Client disconnected: ${clientId}`);
            clients.delete(ws);
            ws.removeAllListeners(); // FIX: Remove all listeners
        });

        ws.on('error', (err) => {
            logger.error(`[WS] Client error ${clientId}: ${err.message}`);
            clients.delete(ws);
            ws.removeAllListeners(); // FIX: Remove all listeners
        });

        // Send initial connection success
        ws.send(JSON.stringify({ type: 'connected', timestamp: Date.now() }));
    });

    // Heartbeat interval - ping every 30 seconds
    const heartbeatInterval = setInterval(() => {
        clients.forEach((ws) => {
            if (ws.isAlive === false) {
                clients.delete(ws);
                ws.removeAllListeners(); // FIX: Remove all listeners
                return ws.terminate();
            }
            ws.isAlive = false;
            ws.ping();
        });
    }, 30000);

    wss.on('close', () => {
        clearInterval(heartbeatInterval);
        // FIX: Cleanup all clients
        clients.forEach(ws => {
            ws.removeAllListeners();
            ws.terminate();
        });
        clients.clear();
    });

    logger.info('[WS] WebSocket server initialized');
    return wss;
}

// Update broadcast function
export function broadcast(event, data) {
    if (!wss || clients.size === 0) return;

    const message = JSON.stringify({
        type: event,
        data,
        timestamp: Date.now(),
    });

    let sent = 0;
    let failed = 0;
    
    // FIX: Use Array.from to avoid iterator issues
    Array.from(clients).forEach((ws) => {
        if (ws.readyState === 1) { // OPEN
            try {
                ws.send(message);
                sent++;
            } catch (error) {
                failed++;
                clients.delete(ws); // Remove failed connection
                ws.removeAllListeners();
            }
        } else if (ws.readyState === 3) { // CLOSED
            clients.delete(ws); // Remove closed connection
            ws.removeAllListeners();
        }
    });

    // Only log important events
    if (event === 'task:start' || event === 'task:done' || event === 'task:error') {
        console.log(`[WS] Broadcast ${event} to ${sent} client(s)${failed > 0 ? `, ${failed} failed` : ''}`);
    }
}
```

### Phase 2: Testing & Validation

#### Test 1: Transaction Rollback

```bash
# Create test script
cat > test-transaction.js << 'EOF'
import { processTaskTransaction } from './src/db-transactions.js';
import { initDb } from './src/db.js';

initDb();

// Test successful transaction
try {
  const result = processTaskTransaction('test-1', () => {
    return { success: true, prNumber: 123, pr: { id: 123, title: 'Test', repo: 'test/repo', url: 'http://test' } };
  });
  console.log('✅ Success transaction:', result);
} catch (error) {
  console.error('❌ Failed:', error.message);
}

// Test failed transaction (should rollback)
try {
  const result = processTaskTransaction('test-2', () => {
    throw new Error('Simulated error');
  });
  console.log('❌ Should not reach here');
} catch (error) {
  console.log('✅ Transaction rolled back:', error.message);
}
EOF

node test-transaction.js
```

#### Test 2: Retry Mechanism

```bash
# Create test script
cat > test-retry.js << 'EOF'
import { retryWithBackoff, retryGitOperation } from './src/retry-helper.js';

// Test successful retry
let attempt = 0;
retryWithBackoff(async () => {
  attempt++;
  if (attempt < 3) {
    throw new Error('Temporary failure');
  }
  return 'Success!';
}, { maxRetries: 5 }).then(result => {
  console.log('✅ Retry succeeded:', result, 'after', attempt, 'attempts');
}).catch(error => {
  console.error('❌ Retry failed:', error.message);
});

// Test git retry
retryGitOperation(async () => {
  throw new Error('Network timeout');
}, 'test git operation').then(() => {
  console.log('✅ Git operation succeeded');
}).catch(error => {
  console.log('✅ Git operation failed as expected:', error.message);
});
EOF

node test-retry.js
```

#### Test 3: Graceful Shutdown

```bash
# Start server
npm start &
SERVER_PID=$!

# Wait for startup
sleep 5

# Send SIGTERM
kill -TERM $SERVER_PID

# Check logs for graceful shutdown messages
# Should see:
# - "Received SIGTERM. Starting graceful shutdown..."
# - "Stopped accepting new tasks"
# - "Database cleaned up"
# - "Graceful shutdown completed"
```

#### Test 4: Memory Leak Check

```bash
# Install clinic.js for profiling
npm install -g clinic

# Run with memory profiling
clinic doctor -- node src/index.js

# Let it run for 10 minutes with some load
# Check the generated report for memory leaks
```

### Phase 3: Deployment

#### Step 1: Backup Database

```bash
# Backup current database
cp data/agent-malas.db data/agent-malas.db.backup.$(date +%Y%m%d_%H%M%S)

# Backup with WAL files
cp data/agent-malas.db-wal data/agent-malas.db-wal.backup.$(date +%Y%m%d_%H%M%S) 2>/dev/null || true
cp data/agent-malas.db-shm data/agent-malas.db-shm.backup.$(date +%Y%m%d_%H%M%S) 2>/dev/null || true
```

#### Step 2: Update Dependencies

```bash
# No new dependencies needed, but ensure all are up to date
npm install
```

#### Step 3: Deploy with Zero Downtime

```bash
# Option A: Using PM2
pm2 start src/index.js --name agent-malas
pm2 reload agent-malas  # Graceful reload

# Option B: Using systemd
sudo systemctl reload agent-malas

# Option C: Manual
# 1. Start new instance on different port
API_PORT=3002 node src/index.js &
NEW_PID=$!

# 2. Wait for health check
sleep 10
curl http://localhost:3002/api/health

# 3. Stop old instance gracefully
kill -TERM $OLD_PID

# 4. Update port in config
# 5. Restart with correct port
```

#### Step 4: Monitor After Deployment

```bash
# Watch logs
tail -f logs/agent-malas.log

# Monitor health endpoint
watch -n 5 'curl -s http://localhost:3001/api/health/detailed | jq'

# Monitor memory
watch -n 10 'curl -s http://localhost:3001/api/health/metrics | jq .memory'

# Check for stuck tasks
watch -n 60 'curl -s http://localhost:3001/api/tasks?status=processing | jq .total'
```

### Phase 4: Rollback Plan

If issues occur, rollback steps:

```bash
# 1. Stop new version
pm2 stop agent-malas
# or
sudo systemctl stop agent-malas

# 2. Restore database backup
cp data/agent-malas.db.backup.YYYYMMDD_HHMMSS data/agent-malas.db

# 3. Revert code changes
git revert HEAD
# or
git checkout main  # if on feature branch

# 4. Restart old version
pm2 start src/index.js --name agent-malas
# or
sudo systemctl start agent-malas

# 5. Verify
curl http://localhost:3001/api/health
```

## 📊 Success Metrics

Monitor these metrics after deployment:

### Week 1
- [ ] Zero stuck tasks
- [ ] No memory leaks (stable memory usage)
- [ ] All shutdowns are graceful (no corrupted state)
- [ ] Retry mechanism working (check logs for retry attempts)

### Week 2
- [ ] < 5% task failure rate
- [ ] All failures have proper error messages
- [ ] No data loss incidents
- [ ] Health checks all green

### Week 3
- [ ] API response time < 200ms (p95)
- [ ] Zero duplicate PRs
- [ ] 100% task status accuracy
- [ ] Workspace cleanup working

### Week 4
- [ ] System stable for 7 days continuous operation
- [ ] No manual interventions needed
- [ ] All alerts acknowledged and resolved
- [ ] Performance metrics within targets

## 🐛 Troubleshooting

### Issue: Tasks stuck in "processing"

```bash
# Check for stuck tasks
curl http://localhost:3001/api/tasks?status=processing

# Manual cleanup
node -e "
import { cleanupStuckTasks } from './src/db-transactions.js';
import { initDb } from './src/db.js';
initDb();
const cleaned = cleanupStuckTasks();
console.log('Cleaned:', cleaned);
"
```

### Issue: Memory usage increasing

```bash
# Check memory metrics
curl http://localhost:3001/api/health/metrics | jq .memory

# Force garbage collection (if --expose-gc flag used)
curl -X POST http://localhost:3001/api/system/gc

# Restart if needed
pm2 restart agent-malas
```

### Issue: Database locked

```bash
# Check for long-running queries
sqlite3 data/agent-malas.db "PRAGMA wal_checkpoint(TRUNCATE);"

# If still locked, restart
pm2 restart agent-malas
```

### Issue: Git operations failing

```bash
# Check workspace state
cd workspace/[repo-name]
git status

# Clean workspace
git reset --hard
git clean -fd

# Re-fetch
git fetch origin --prune
```

## 📝 Configuration

### Environment Variables

Add to `.env`:

```bash
# Retry configuration
MAX_RETRIES=3
RETRY_DELAY=2000

# Health monitoring
HEALTH_CHECK_INTERVAL=30000
CLEANUP_INTERVAL=300000

# Graceful shutdown
SHUTDOWN_TIMEOUT=30000

# Memory limits
NODE_OPTIONS="--max-old-space-size=2048"
```

### PM2 Configuration

Create `ecosystem.config.js`:

```javascript
module.exports = {
  apps: [{
    name: 'agent-malas',
    script: './src/index.js',
    instances: 1,
    exec_mode: 'fork',
    max_memory_restart: '2G',
    env: {
      NODE_ENV: 'production',
      API_PORT: 3001,
    },
    error_file: './logs/error.log',
    out_file: './logs/out.log',
    log_date_format: 'YYYY-MM-DD HH:mm:ss Z',
    merge_logs: true,
    kill_timeout: 30000, // 30s for graceful shutdown
  }]
};
```

## ✅ Checklist

Before deploying to production:

- [ ] All tests passing
- [ ] Database backup created
- [ ] Rollback plan documented
- [ ] Monitoring configured
- [ ] Alerts configured
- [ ] Team notified
- [ ] Documentation updated
- [ ] Health checks passing
- [ ] Memory profiling done
- [ ] Load testing done

## 📞 Support

If issues occur:

1. Check logs: `tail -f logs/agent-malas.log`
2. Check health: `curl http://localhost:3001/api/health/detailed`
3. Check metrics: `curl http://localhost:3001/api/health/metrics`
4. If critical: Execute rollback plan
5. Report issue with logs and metrics

---

**Last Updated**: ${new Date().toISOString()}
**Version**: 2.0.0
**Status**: Ready for Implementation
