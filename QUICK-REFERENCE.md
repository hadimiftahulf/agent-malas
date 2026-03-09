# 🚀 Quick Reference - Agent Malas Fixes

## 🔥 Critical Commands

### Check System Health
```bash
# Overall health
curl http://localhost:3001/api/health | jq

# Detailed health
curl http://localhost:3001/api/health/detailed | jq

# Metrics
curl http://localhost:3001/api/health/metrics | jq
```

### Check for Issues
```bash
# Stuck tasks
curl http://localhost:3001/api/tasks?status=processing | jq

# Failed tasks today
curl http://localhost:3001/api/dashboard | jq '.today.tasksFailed'

# Queue size
curl http://localhost:3001/api/queue | jq 'length'

# Memory usage
ps aux | grep node | grep agent-malas
```

### Manual Cleanup
```bash
# Cleanup stuck tasks (SQL)
sqlite3 data/agent-malas.db "UPDATE tasks SET status = 'failed', error_message = 'Manual cleanup', completed_at = datetime('now') WHERE status = 'processing' AND started_at < datetime('now', '-1 hour');"

# Cleanup duplicate PRs
sqlite3 data/agent-malas.db "DELETE FROM prs WHERE id NOT IN (SELECT MAX(id) FROM prs GROUP BY url);"

# Checkpoint WAL
sqlite3 data/agent-malas.db "PRAGMA wal_checkpoint(TRUNCATE);"
```

### Restart Server
```bash
# PM2
pm2 restart agent-malas
pm2 logs agent-malas

# Systemd
sudo systemctl restart agent-malas
sudo journalctl -u agent-malas -f

# Manual
pkill -TERM -f "node src/index.js"
node src/index.js
```

## 📊 Monitoring Queries

### Database Queries
```bash
# Task statistics
sqlite3 data/agent-malas.db "SELECT status, COUNT(*) FROM tasks GROUP BY status;"

# Today's metrics
sqlite3 data/agent-malas.db "SELECT * FROM daily_metrics WHERE date = date('now');"

# Recent failures
sqlite3 data/agent-malas.db "SELECT id, title, error_message FROM tasks WHERE status = 'failed' ORDER BY completed_at DESC LIMIT 10;"

# PR statistics
sqlite3 data/agent-malas.db "SELECT review_decision, COUNT(*) FROM prs GROUP BY review_decision;"
```

### Log Analysis
```bash
# Recent errors
tail -100 logs/agent-malas.log | grep ERROR

# Task processing times
grep "Task.*completed" logs/agent-malas.log | tail -20

# Memory warnings
grep "Memory" logs/agent-malas.log | tail -10

# Retry attempts
grep "Retrying" logs/agent-malas.log | tail -20
```

## 🐛 Common Issues & Fixes

### Issue: Task Stuck in Processing
```bash
# Check task
curl http://localhost:3001/api/tasks/TASK_ID | jq

# Manual fix
sqlite3 data/agent-malas.db "UPDATE tasks SET status = 'failed', error_message = 'Manual recovery', completed_at = datetime('now') WHERE id = 'TASK_ID';"
```

### Issue: Memory Usage High
```bash
# Check memory
curl http://localhost:3001/api/health/metrics | jq .memory

# Restart if > 90%
pm2 restart agent-malas
```

### Issue: Database Locked
```bash
# Checkpoint WAL
sqlite3 data/agent-malas.db "PRAGMA wal_checkpoint(TRUNCATE);"

# If still locked, restart
pm2 restart agent-malas
```

### Issue: Git Operation Failed
```bash
# Check workspace
cd workspace/[repo-name]
git status

# Clean
git reset --hard
git clean -fd
git fetch origin --prune
```

### Issue: PR Not Created
```bash
# Check logs
grep "PR.*TASK_ID" logs/agent-malas.log

# Check GitHub
gh pr list --repo REPO_NAME

# Manual PR creation
cd workspace/[repo-name]
gh pr create --title "..." --body "..." --reviewer vheins
```

## 🔧 Maintenance Tasks

### Daily
```bash
# Check health
curl http://localhost:3001/api/health/detailed | jq

# Check for stuck tasks
curl http://localhost:3001/api/tasks?status=processing | jq .total

# Check today's metrics
curl http://localhost:3001/api/dashboard | jq .today
```

### Weekly
```bash
# Backup database
cp data/agent-malas.db backups/agent-malas-$(date +%Y%m%d).db

# Clean old logs
find logs/ -name "*.log" -mtime +30 -delete

# Check disk space
df -h workspace/

# Review failed tasks
sqlite3 data/agent-malas.db "SELECT COUNT(*) FROM tasks WHERE status = 'failed' AND completed_at > date('now', '-7 days');"
```

### Monthly
```bash
# Vacuum database
sqlite3 data/agent-malas.db "VACUUM;"

# Clean old workspaces
find workspace/ -type d -mtime +30 -exec rm -rf {} +

# Review metrics
sqlite3 data/agent-malas.db "SELECT date, tasks_completed, tasks_failed FROM daily_metrics WHERE date > date('now', '-30 days');"
```

## 📈 Performance Tuning

### Database Optimization
```sql
-- Add indexes
CREATE INDEX IF NOT EXISTS idx_tasks_status_started ON tasks(status, started_at);
CREATE INDEX IF NOT EXISTS idx_prs_url ON prs(url);
CREATE INDEX IF NOT EXISTS idx_task_logs_created ON task_logs(created_at);

-- Analyze
ANALYZE;

-- Checkpoint
PRAGMA wal_checkpoint(TRUNCATE);
```

### Memory Optimization
```bash
# Increase Node.js memory limit
export NODE_OPTIONS="--max-old-space-size=2048"

# Enable garbage collection logging
export NODE_OPTIONS="--max-old-space-size=2048 --expose-gc"
```

### Git Optimization
```bash
# Use shallow clones
git clone --depth 1 ...

# Prune regularly
git fetch --prune

# Clean workspace
git clean -fdx
```

## 🚨 Emergency Procedures

### System Down
```bash
# 1. Check if running
ps aux | grep "node src/index.js"

# 2. Check logs
tail -100 logs/agent-malas.log

# 3. Restart
pm2 restart agent-malas

# 4. Verify
curl http://localhost:3001/api/health
```

### Data Corruption
```bash
# 1. Stop server
pm2 stop agent-malas

# 2. Backup current state
cp data/agent-malas.db data/agent-malas.db.corrupted

# 3. Restore from backup
cp backups/agent-malas-YYYYMMDD.db data/agent-malas.db

# 4. Restart
pm2 start agent-malas

# 5. Verify
sqlite3 data/agent-malas.db "PRAGMA integrity_check;"
```

### High Memory Usage
```bash
# 1. Check memory
curl http://localhost:3001/api/health/metrics | jq .memory

# 2. If > 90%, restart
pm2 restart agent-malas

# 3. Monitor
watch -n 5 'curl -s http://localhost:3001/api/health/metrics | jq .memory'
```

### Too Many Failed Tasks
```bash
# 1. Check failure rate
curl http://localhost:3001/api/dashboard | jq '.today | {completed, failed}'

# 2. Check recent errors
sqlite3 data/agent-malas.db "SELECT error_message, COUNT(*) FROM tasks WHERE status = 'failed' AND completed_at > datetime('now', '-1 hour') GROUP BY error_message;"

# 3. Fix root cause (network, API, etc)

# 4. Retry failed tasks manually if needed
```

## 📞 Quick Contacts

### Logs Location
- Application: `logs/agent-malas.log`
- PM2: `~/.pm2/logs/`
- Systemd: `journalctl -u agent-malas`

### Database Location
- Main: `data/agent-malas.db`
- WAL: `data/agent-malas.db-wal`
- SHM: `data/agent-malas.db-shm`

### Workspace Location
- Repos: `workspace/[repo-name]/`

### Config Location
- Env: `.env`
- PM2: `ecosystem.config.js`

## 🎯 Success Indicators

### Healthy System
- ✅ Health status: "ok"
- ✅ No stuck tasks
- ✅ Memory < 75%
- ✅ Failure rate < 5%
- ✅ Queue processing normally

### Warning Signs
- ⚠️ Memory > 75%
- ⚠️ Failure rate > 10%
- ⚠️ Queue size > 50
- ⚠️ Stuck tasks > 0

### Critical Issues
- 🔴 Health status: "unhealthy"
- 🔴 Memory > 90%
- 🔴 Failure rate > 50%
- 🔴 Database locked
- 🔴 Server not responding

## 🔗 Useful Links

- GitHub: https://github.com/[your-org]/agent-malas
- Dashboard: http://localhost:3001
- API Docs: http://localhost:3001/api
- Health: http://localhost:3001/api/health

---

**Keep this file handy for quick troubleshooting!**
