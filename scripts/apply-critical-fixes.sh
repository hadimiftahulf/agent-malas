#!/bin/bash

# Quick script untuk apply critical fixes
# Usage: bash scripts/apply-critical-fixes.sh

set -e

echo "🔧 Applying Critical Fixes to Agent Malas..."
echo ""

# Colors
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Check if running from project root
if [ ! -f "package.json" ]; then
    echo -e "${RED}❌ Error: Must run from project root${NC}"
    exit 1
fi

# Backup current state
echo -e "${YELLOW}📦 Creating backup...${NC}"
BACKUP_DIR="backups/$(date +%Y%m%d_%H%M%S)"
mkdir -p "$BACKUP_DIR"

# Backup database
if [ -f "data/agent-malas.db" ]; then
    cp data/agent-malas.db "$BACKUP_DIR/"
    cp data/agent-malas.db-wal "$BACKUP_DIR/" 2>/dev/null || true
    cp data/agent-malas.db-shm "$BACKUP_DIR/" 2>/dev/null || true
    echo -e "${GREEN}✓ Database backed up to $BACKUP_DIR${NC}"
fi

# Backup source files
cp -r src "$BACKUP_DIR/"
echo -e "${GREEN}✓ Source files backed up${NC}"

echo ""
echo -e "${YELLOW}🔍 Checking for issues...${NC}"

# Check for stuck tasks
STUCK_TASKS=$(sqlite3 data/agent-malas.db "SELECT COUNT(*) FROM tasks WHERE status = 'processing' AND started_at < datetime('now', '-1 hour');" 2>/dev/null || echo "0")
if [ "$STUCK_TASKS" -gt 0 ]; then
    echo -e "${YELLOW}⚠️  Found $STUCK_TASKS stuck task(s)${NC}"
    read -p "Clean up stuck tasks? (y/n) " -n 1 -r
    echo
    if [[ $REPLY =~ ^[Yy]$ ]]; then
        sqlite3 data/agent-malas.db "UPDATE tasks SET status = 'failed', error_message = 'Auto-recovered from stuck state', completed_at = datetime('now') WHERE status = 'processing' AND started_at < datetime('now', '-1 hour');"
        echo -e "${GREEN}✓ Cleaned up $STUCK_TASKS stuck task(s)${NC}"
    fi
fi

# Check for duplicate PRs
DUPLICATE_PRS=$(sqlite3 data/agent-malas.db "SELECT COUNT(*) - COUNT(DISTINCT url) FROM prs WHERE url IS NOT NULL;" 2>/dev/null || echo "0")
if [ "$DUPLICATE_PRS" -gt 0 ]; then
    echo -e "${YELLOW}⚠️  Found $DUPLICATE_PRS duplicate PR(s)${NC}"
    read -p "Clean up duplicates? (y/n) " -n 1 -r
    echo
    if [[ $REPLY =~ ^[Yy]$ ]]; then
        sqlite3 data/agent-malas.db "DELETE FROM prs WHERE id NOT IN (SELECT MAX(id) FROM prs GROUP BY url);"
        echo -e "${GREEN}✓ Cleaned up duplicate PRs${NC}"
    fi
fi

echo ""
echo -e "${YELLOW}🔧 Applying fixes...${NC}"

# Fix 1: Add missing indexes
echo "Adding database indexes..."
sqlite3 data/agent-malas.db << 'EOF'
CREATE INDEX IF NOT EXISTS idx_tasks_status_started ON tasks(status, started_at);
CREATE INDEX IF NOT EXISTS idx_prs_url ON prs(url);
CREATE INDEX IF NOT EXISTS idx_task_logs_created ON task_logs(created_at);
EOF
echo -e "${GREEN}✓ Database indexes added${NC}"

# Fix 2: Checkpoint WAL
echo "Checkpointing WAL..."
sqlite3 data/agent-malas.db "PRAGMA wal_checkpoint(TRUNCATE);"
echo -e "${GREEN}✓ WAL checkpointed${NC}"

# Fix 3: Update package.json scripts
echo "Updating package.json scripts..."
if ! grep -q "health-check" package.json; then
    # Add health check script
    node -e "
    const fs = require('fs');
    const pkg = JSON.parse(fs.readFileSync('package.json', 'utf8'));
    pkg.scripts['health-check'] = 'curl -s http://localhost:3001/api/health | jq';
    pkg.scripts['cleanup-stuck'] = 'node -e \"import(\\\"./src/db-transactions.js\\\").then(m => { import(\\\"./src/db.js\\\").then(d => { d.initDb(); console.log(\\\"Cleaned:\\\", m.cleanupStuckTasks()); }); })\"';
    fs.writeFileSync('package.json', JSON.stringify(pkg, null, 2));
    "
    echo -e "${GREEN}✓ Package.json updated${NC}"
fi

# Fix 4: Create logs directory
mkdir -p logs
echo -e "${GREEN}✓ Logs directory created${NC}"

# Fix 5: Update .gitignore
if [ -f ".gitignore" ]; then
    if ! grep -q "backups/" .gitignore; then
        echo "" >> .gitignore
        echo "# Backups" >> .gitignore
        echo "backups/" >> .gitignore
        echo -e "${GREEN}✓ .gitignore updated${NC}"
    fi
fi

echo ""
echo -e "${YELLOW}📊 System Status:${NC}"

# Check if server is running
if curl -s http://localhost:3001/api/health > /dev/null 2>&1; then
    echo -e "${GREEN}✓ Server is running${NC}"
    
    # Get health status
    HEALTH=$(curl -s http://localhost:3001/api/health | jq -r '.status' 2>/dev/null || echo "unknown")
    echo "  Status: $HEALTH"
    
    # Get queue size
    QUEUE_SIZE=$(curl -s http://localhost:3001/api/queue | jq 'length' 2>/dev/null || echo "unknown")
    echo "  Queue size: $QUEUE_SIZE"
    
    # Get today's metrics
    COMPLETED=$(curl -s http://localhost:3001/api/dashboard | jq -r '.today.tasksCompleted' 2>/dev/null || echo "0")
    FAILED=$(curl -s http://localhost:3001/api/dashboard | jq -r '.today.tasksFailed' 2>/dev/null || echo "0")
    echo "  Today: $COMPLETED completed, $FAILED failed"
else
    echo -e "${YELLOW}⚠️  Server is not running${NC}"
fi

echo ""
echo -e "${GREEN}✅ Critical fixes applied successfully!${NC}"
echo ""
echo "Next steps:"
echo "1. Review the changes in the new files:"
echo "   - src/db-transactions.js"
echo "   - src/retry-helper.js"
echo "   - src/graceful-shutdown.js"
echo "   - src/worker-improved.js"
echo "   - src/health-monitor.js"
echo ""
echo "2. Test the fixes:"
echo "   npm run health-check"
echo ""
echo "3. If server is running, restart it:"
echo "   pm2 restart agent-malas"
echo "   # or"
echo "   sudo systemctl restart agent-malas"
echo ""
echo "4. Monitor for issues:"
echo "   tail -f logs/agent-malas.log"
echo ""
echo "Backup location: $BACKUP_DIR"
echo ""
echo -e "${YELLOW}⚠️  Remember to integrate the new modules into src/index.js${NC}"
echo "   See IMPLEMENTATION-GUIDE.md for details"
