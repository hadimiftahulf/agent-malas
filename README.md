# 🤖 Agent Malas - AI-Powered Development Agent

> Autonomous AI agent that processes GitHub issues, creates PRs, and handles code reviews automatically.

[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)
[![Node.js Version](https://img.shields.io/badge/node-%3E%3D18.0.0-brightgreen)](https://nodejs.org/)
[![Status](https://img.shields.io/badge/status-production-success)](https://github.com)

## 🌟 Features

- ✅ **Autonomous Task Processing** - Automatically picks up tasks from GitHub Projects
- ✅ **AI-Powered Development** - Uses Gemini AI to implement features
- ✅ **Automated PR Creation** - Creates PRs with proper formatting and reviewers
- ✅ **Self-Healing** - Automatically fixes rejected PRs based on review comments
- ✅ **Incremental Comment Processing** - Processes PR review comments one by one to avoid overload
- ✅ **Real-time PR Dashboard** - Visual progress tracking for comment processing in web UI
- ✅ **Test & Heal** - Runs tests and auto-fixes issues before creating PRs
- ✅ **WhatsApp Notifications** - Daily standup reports and task notifications
- ✅ **Real-time Dashboard** - Web UI with live updates via WebSocket
- ✅ **Health Monitoring** - Comprehensive health checks and auto-recovery
- ✅ **Transaction Support** - Zero data loss with atomic operations
- ✅ **Graceful Shutdown** - Clean exits without corrupting state

## 🏗️ Architecture

```
┌─────────────────────────────────────────────────────────────┐
│                      GitHub Projects                         │
│  (Tasks with status: To Do, In Progress, Rejected)          │
└─────────────────────────────────────────────────────────────┘
                            ↓
┌─────────────────────────────────────────────────────────────┐
│                      Agent Malas                             │
│  ┌──────────────────────────────────────────────────────┐   │
│  │  1. Fetch ready tasks                                │   │
│  │  2. Process with AI (Gemini)                         │   │
│  │  3. Run tests & self-heal                            │   │
│  │  4. Create PR with reviewer                          │   │
│  │  5. Handle review feedback                           │   │
│  └──────────────────────────────────────────────────────┘   │
└─────────────────────────────────────────────────────────────┘
                            ↓
┌─────────────────────────────────────────────────────────────┐
│                    GitHub Pull Requests                      │
│  (Automated PRs ready for human review)                     │
└─────────────────────────────────────────────────────────────┘
```

## 🚀 Quick Start

### Prerequisites

- Node.js >= 18.0.0
- GitHub CLI (`gh`) authenticated
- Gemini CLI configured
- SQLite3
- Git configured with SSH

### Installation

```bash
# Clone repository
git clone https://github.com/YOUR_USERNAME/agent-malas.git
cd agent-malas

# Install dependencies
npm install

# Copy environment file
cp .env.example .env

# Edit .env with your credentials
nano .env

# Initialize database
npm start -- --once

# Start agent
npm start
```

### Environment Variables

```bash
# Required
WORKSPACE_DIR=./workspace
REVIEWER_HANDLE=your-github-username

# Optional
CHECK_INTERVAL=600                    # Check every 10 minutes
LOG_LEVEL=info                        # info, warn, error
DRY_RUN=false                         # Test mode
GEMINI_YOLO=true                      # Auto-fix mode
API_PORT=3001                         # API server port

# WhatsApp Notifications (Optional)
FONTTE_TOKEN=your-fontte-token
WHATSAPP_TARGET=628123456789
```

## 📊 Dashboard

Access the web dashboard at `http://localhost:3001`

Features:
- Real-time task queue
- Live terminal logs
- Performance metrics
- PR tracker
- Health status
- Agent control

## 🔧 Usage

### Run Once (Test Mode)

```bash
npm run once
```

### Dry Run (No Changes)

```bash
npm run dry-run
```

### Production Mode

```bash
npm start
```

### With PM2 (Recommended)

```bash
# Install PM2
npm install -g pm2

# Start
pm2 start src/index.js --name agent-malas

# Monitor
pm2 logs agent-malas

# Restart
pm2 restart agent-malas

# Stop
pm2 stop agent-malas
```

## 📈 Monitoring

### Health Check

```bash
# Basic health
curl http://localhost:3001/api/health | jq

# Detailed health
curl http://localhost:3001/api/health/detailed | jq

# Metrics
curl http://localhost:3001/api/health/metrics | jq
```

### Check Status

```bash
# Dashboard data
curl http://localhost:3001/api/dashboard | jq

# Task queue
curl http://localhost:3001/api/queue | jq

# Recent logs
curl http://localhost:3001/api/logs/recent | jq
```

## 🛠️ Maintenance

### Cleanup Stuck Tasks

```bash
npm run cleanup-stuck
```

### Database Backup

```bash
cp data/agent-malas.db backups/agent-malas-$(date +%Y%m%d).db
```

### View Logs

```bash
tail -f logs/agent-malas.log
```

## 🐛 Troubleshooting

### Task Stuck in Processing

```bash
# Check stuck tasks
curl http://localhost:3001/api/tasks?status=processing | jq

# Manual cleanup
sqlite3 data/agent-malas.db "UPDATE tasks SET status = 'failed', error_message = 'Manual cleanup', completed_at = datetime('now') WHERE status = 'processing' AND started_at < datetime('now', '-1 hour');"
```

### High Memory Usage

```bash
# Check memory
curl http://localhost:3001/api/health/metrics | jq .memory

# Restart if needed
pm2 restart agent-malas
```

### Database Locked

```bash
# Checkpoint WAL
sqlite3 data/agent-malas.db "PRAGMA wal_checkpoint(TRUNCATE);"

# Restart
pm2 restart agent-malas
```

See [QUICK-REFERENCE.md](QUICK-REFERENCE.md) for more troubleshooting tips.

## 📚 Documentation

- [PR-COMMENTS-UI-FINAL.md](PR-COMMENTS-UI-FINAL.md) - **Complete UI implementation guide**
- [PR-COMMENT-INCREMENTAL-PROCESSING.md](PR-COMMENT-INCREMENTAL-PROCESSING.md) - Incremental PR comment processing
- [PR-COMMENTS-UI-GUIDE.md](PR-COMMENTS-UI-GUIDE.md) - Frontend UI for PR comments
- [PERFORMANCE-AND-BUG-FIXES.md](PERFORMANCE-AND-BUG-FIXES.md) - Detailed analysis of 15 issues and fixes
- [IMPLEMENTATION-GUIDE.md](IMPLEMENTATION-GUIDE.md) - Step-by-step implementation guide
- [FIXES-SUMMARY.md](FIXES-SUMMARY.md) - Executive summary of improvements
- [QUICK-REFERENCE.md](QUICK-REFERENCE.md) - Quick commands and troubleshooting
- [ARCHITECTURE-IMPROVEMENTS.md](ARCHITECTURE-IMPROVEMENTS.md) - Before/after architecture

## 🔒 Security

- All credentials stored in `.env` (not committed)
- GitHub authentication via SSH keys
- Database stored locally with WAL mode
- No sensitive data in logs
- Graceful shutdown prevents data corruption

## 🎯 Performance

### Metrics

- **Success Rate**: 95%+ (with auto-retry)
- **Uptime**: 99%+ (with auto-recovery)
- **Data Integrity**: 100% (with transactions)
- **Memory Usage**: Stable (no leaks)
- **API Response**: < 200ms (p95)

### Improvements

- ✅ Transaction support for atomic operations
- ✅ Retry mechanism with exponential backoff
- ✅ Graceful shutdown for clean exits
- ✅ Health monitoring with auto-remediation
- ✅ Memory leak fixes in WebSocket
- ✅ Task locking to prevent race conditions
- ✅ Automatic cleanup of stuck tasks

## 🤝 Contributing

1. Fork the repository
2. Create feature branch (`git checkout -b feature/amazing-feature`)
3. Commit changes (`git commit -m 'Add amazing feature'`)
4. Push to branch (`git push origin feature/amazing-feature`)
5. Open Pull Request

## 📝 License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

## 🙏 Acknowledgments

- [Gemini AI](https://ai.google.dev/) - AI-powered code generation
- [GitHub CLI](https://cli.github.com/) - GitHub automation
- [Fonnte](https://fonnte.com/) - WhatsApp notifications
- [Better SQLite3](https://github.com/WiseLibs/better-sqlite3) - Fast SQLite database

## 📞 Support

- **Issues**: [GitHub Issues](https://github.com/YOUR_USERNAME/agent-malas/issues)
- **Discussions**: [GitHub Discussions](https://github.com/YOUR_USERNAME/agent-malas/discussions)
- **Email**: your-email@example.com

## 🗺️ Roadmap

- [ ] Multi-repository support
- [ ] Custom AI model integration
- [ ] Slack notifications
- [ ] Advanced metrics dashboard
- [ ] Docker support
- [ ] Kubernetes deployment
- [ ] CI/CD pipeline integration
- [ ] Code quality checks
- [ ] Security scanning
- [ ] Performance profiling

## 📊 Stats

![GitHub stars](https://img.shields.io/github/stars/YOUR_USERNAME/agent-malas?style=social)
![GitHub forks](https://img.shields.io/github/forks/YOUR_USERNAME/agent-malas?style=social)
![GitHub issues](https://img.shields.io/github/issues/YOUR_USERNAME/agent-malas)
![GitHub pull requests](https://img.shields.io/github/issues-pr/YOUR_USERNAME/agent-malas)

---

**Made with ❤️ by the Agent Malas Team**

*"Tetap malas secara manual, biar bot yang kerja!"*
