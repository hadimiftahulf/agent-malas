# 🖥️ Agent Malas — Frontend Dashboard

> **Stack:** React.js + Tailwind CSS (via Vite) | Express API | SQLite | WebSocket

## Sprint Overview

| Sprint | File                         | Fokus                               | Estimasi  |
| ------ | ---------------------------- | ----------------------------------- | --------- |
| 1      | [sprint-1.md](./sprint-1.md) | API Server + Database               | 8-10 jam  |
| 2      | [sprint-2.md](./sprint-2.md) | React Dashboard (Core UI)           | 10-12 jam |
| 3      | [sprint-3.md](./sprint-3.md) | Real-time WebSocket + Agent Control | 8-10 jam  |
| 4      | [sprint-4.md](./sprint-4.md) | Metrics, Notifications & Polish     | 6-8 jam   |
| 5      | [sprint-5.md](./sprint-5.md) | Production & Deployment (Opsional)  | 3-4 jam   |

**Total Estimasi: ~35-44 jam kerja**

## Arsitektur Target

```
agent-malas/
├── src/                    # Backend (existing + new)
│   ├── index.js            # Entry point + agent loop
│   ├── server.js           # [NEW] Express HTTP server
│   ├── db.js               # [NEW] SQLite persistent state
│   ├── websocket.js        # [NEW] WebSocket real-time
│   ├── routes/api.js       # [NEW] REST API endpoints
│   ├── worker.js           # [MODIFY] + event emitter
│   ├── logger.js           # [MODIFY] + DB write
│   ├── github-project.js   # Existing
│   ├── github-pr.js        # Existing
│   ├── config.js           # Existing
│   ├── report.js           # Existing
│   └── test-runner.js      # Existing
├── frontend/               # [NEW] React SPA
│   ├── src/
│   │   ├── App.jsx
│   │   ├── components/
│   │   │   ├── DashboardStats.jsx
│   │   │   ├── TaskQueue.jsx
│   │   │   ├── PRTracker.jsx
│   │   │   ├── LiveTerminal.jsx
│   │   │   ├── AgentControl.jsx
│   │   │   └── MetricsChart.jsx
│   │   └── hooks/
│   │       ├── useApi.js
│   │       ├── useWebSocket.js
│   │       └── useToast.js
│   ├── tailwind.config.js
│   └── vite.config.js
└── backlog/
    ├── FRONTEND.md          # ← Anda di sini
    ├── sprint-1.md
    ├── sprint-2.md
    ├── sprint-3.md
    ├── sprint-4.md
    └── sprint-5.md
```

## Dependencies Baru

### Backend (`package.json`)

| Package          | Fungsi            |
| ---------------- | ----------------- |
| `express`        | HTTP server       |
| `better-sqlite3` | Embedded database |
| `ws`             | WebSocket server  |

### Frontend (`frontend/package.json`)

| Package               | Fungsi               |
| --------------------- | -------------------- |
| `react` + `react-dom` | Via Vite template    |
| `tailwindcss`         | Utility-first CSS    |
| `recharts`            | Chart/grafik metrics |
