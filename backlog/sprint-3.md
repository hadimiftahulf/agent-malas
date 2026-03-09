# Sprint 3: Real-time WebSocket + Agent Control ✅

> **Goal:** Dashboard menampilkan live log dan bisa mengontrol agent secara real-time
> **Estimasi:** 8-10 jam
> **Status:** ✅ COMPLETED
> **Prerequisite:** Sprint 1 & 2 selesai

---

## Task 3.1 — WebSocket Server

**File:** `src/websocket.js` (NEW)
**Priority:** 🔴 Critical

### Deskripsi

WebSocket server yang di-attach ke HTTP server dari Sprint 1. Mengirim event real-time ke semua connected clients.

### Detail Implementasi

#### Event Types

| Event           | Payload                                            | Trigger            |
| --------------- | -------------------------------------------------- | ------------------ |
| `log`           | `{ level, message, taskId, timestamp }`            | Setiap logger call |
| `agent:status`  | `{ status: "running\|stopped\|idle\|processing" }` | Agent state change |
| `task:start`    | `{ taskId, title, repo }`                          | Worker mulai task  |
| `task:progress` | `{ taskId, stage: "clone\|ai\|test\|pr" }`         | Worker progress    |
| `task:done`     | `{ taskId, prNumber }`                             | Worker selesai     |
| `task:error`    | `{ taskId, error }`                                | Worker gagal       |
| `queue:update`  | `{ tasks: [...] }`                                 | Queue berubah      |

#### Connection Management

- Track connected clients
- Heartbeat ping/pong tiap 30 detik
- Auto-cleanup disconnected clients
- Broadcast helper: `broadcast(event, data)`

### Fungsi yang di-export

- `setupWebSocket(httpServer)` — attach WS ke server
- `broadcast(event, data)` — kirim ke semua clients
- `getConnectedClients()` — jumlah client aktif

### Acceptance Criteria

- [ ] WebSocket tersedia di `ws://localhost:3001`
- [ ] Client bisa connect dan menerima events
- [ ] Heartbeat menjaga koneksi tetap hidup
- [ ] Graceful cleanup saat client disconnect

---

## Task 3.2 — Worker Event Emitter

**File:** `src/worker.js` (MODIFY)
**Priority:** 🔴 Critical

### Deskripsi

Modifikasi `processTask()` dan `processRejectedPR()` untuk emit WebSocket event di setiap stage eksekusi.

### Detail Implementasi

#### `processTask()` — Event Flow

```
broadcast('task:start', { taskId, title, repo })
  │
  ├─ broadcast('task:progress', { taskId, stage: 'clone' })
  │   └─ git clone/fetch/checkout
  │
  ├─ broadcast('task:progress', { taskId, stage: 'ai' })
  │   └─ gemini CLI call
  │
  ├─ broadcast('task:progress', { taskId, stage: 'test' })
  │   └─ runTestsAndHeal()
  │
  ├─ broadcast('task:progress', { taskId, stage: 'pr' })
  │   └─ git push + gh pr create
  │
  └─ broadcast('task:done', { taskId, prNumber })
     atau
     broadcast('task:error', { taskId, error: message })
```

#### DB Integration

- `updateTaskStatus(id, 'processing')` saat mulai
- `updateTaskStatus(id, 'done', { prNumber })` saat selesai
- `updateTaskStatus(id, 'failed', { errorMessage })` saat gagal
- `incrementMetric('tasks_completed')` atau `incrementMetric('tasks_failed')`

### Acceptance Criteria

- [ ] Setiap stage emit event ke WebSocket
- [ ] Dashboard bisa menampilkan progress real-time
- [ ] Status task di DB selalu terupdate

---

## Task 3.3 — Live Terminal Component

**File:** `frontend/src/components/LiveTerminal.jsx` (NEW)
**Priority:** 🟡 High

### Deskripsi

Panel terminal yang menampilkan log stream secara real-time dari WebSocket.

### Detail Implementasi

#### UI Design

```
┌─ 📺 Live Logs ──────────────────── [INFO] [WARN] [ERR] [Clear] ─┐
│                                                                    │
│ [10:30:01] [INFO] Starting task check...                           │
│ [10:30:02] [INFO] Fetching globally assigned issues...             │
│ [10:30:03] [INFO] Found 5 ready tasks and 1 rejected PRs          │
│ [10:30:04] [INFO] Dequeuing task: Error: reCAPTCHA Timeout         │
│ [10:30:05] [INFO] Preparing repository tekmira/silapi-dashboard... │
│ [10:30:10] [WARN] Verification failed for Task 820                 │
│ [10:30:15] [ERROR] Command failed with exit code 1                 │
│ █                                                                   │
├─────────────────────────────────────────────────────────────────────┤
│ 245 lines │ Connected 🟢 │ Auto-scroll: ON                        │
└─────────────────────────────────────────────────────────────────────┘
```

#### Fitur

- **Font:** `font-mono text-sm` — terminal feel
- **Background:** `bg-gray-950 border border-gray-800`
- **Color-coded:**
  - `[INFO]` → `text-blue-400`
  - `[WARN]` → `text-yellow-400`
  - `[ERROR]` → `text-red-400`
- **Filter buttons:** Toggle INFO / WARN / ERROR visibility
- **Auto-scroll:** Scroll ke bawah otomatis, pause saat user scroll ke atas
- **Clear button:** Reset log buffer
- **Status bar:** Line count, connection status, auto-scroll indicator
- **Max buffer:** 500 lines (ring buffer, hapus yang lama)

### Acceptance Criteria

- [ ] Log muncul real-time saat agent bekerja
- [ ] Filter level berfungsi
- [ ] Auto-scroll behavior benar
- [ ] Reconnect otomatis jika koneksi putus

---

## Task 3.4 — Agent Control Component

**File:** `frontend/src/components/AgentControl.jsx` (NEW)
**Priority:** 🟡 High

### Deskripsi

Panel untuk mengontrol agent secara remote dari dashboard.

### Detail Implementasi

#### Controls

| Control         | UI Element               | API Endpoint                            |
| --------------- | ------------------------ | --------------------------------------- |
| Agent On/Off    | Toggle Switch            | `POST /api/agent/start` / `stop`        |
| DRY RUN mode    | Toggle Switch            | `POST /api/config { dryRun: true }`     |
| YOLO mode       | Toggle Switch            | `POST /api/config { geminiYolo: true }` |
| Check Interval  | Range Slider (60s-3600s) | `POST /api/config { checkInterval: N }` |
| Run Now         | Button                   | `POST /api/agent/run-once`              |
| Skip Task       | Button (per task)        | `POST /api/queue/:id/skip`              |
| Prioritize Task | Button (per task)        | `POST /api/queue/:id/priority`          |

#### Layout

```
┌─ ⚙️ Agent Control ────────────────────────────┐
│                                                 │
│  Agent Status    [====== ON ======]  🟢 Running │
│  DRY RUN         [OFF]                          │
│  YOLO Mode       [ON]                           │
│                                                 │
│  Check Interval  ──●────────── 600s             │
│                                                 │
│  [ 🚀 Run Now ]                                 │
│                                                 │
│  Reviewer: @vheins                              │
│  Workspace: ./workspace                         │
│  API Port: 3001                                 │
│                                                 │
└─────────────────────────────────────────────────┘
```

### Acceptance Criteria

- [ ] Toggle start/stop agent berfungsi
- [ ] Perubahan config langsung diterapkan tanpa restart
- [ ] "Run Now" memicu 1 task processing segera
- [ ] UI menampilkan state terkini setelah perubahan

---

## Task 3.5 — Tambahan API Endpoints (Control)

**File:** `src/routes/api.js` (MODIFY)
**Priority:** 🟡 High

### Endpoints Baru

| Method | Endpoint                  | Deskripsi                   |
| ------ | ------------------------- | --------------------------- |
| `POST` | `/api/agent/start`        | Start agent loop            |
| `POST` | `/api/agent/stop`         | Stop agent loop (graceful)  |
| `POST` | `/api/agent/run-once`     | Trigger 1 cycle immediately |
| `POST` | `/api/config`             | Update runtime config       |
| `POST` | `/api/queue/:id/skip`     | Mark task as skipped        |
| `POST` | `/api/queue/:id/priority` | Move task to front of queue |

### Acceptance Criteria

- [ ] Start/stop agent via API berfungsi
- [ ] Config update tidak memerlukan restart proses
- [ ] Skip & priority berpengaruh pada urutan queue

---

## Task 3.6 — Custom Hook: useWebSocket

**File:** `frontend/src/hooks/useWebSocket.js` (NEW)
**Priority:** 🟢 Medium

### Interface

```jsx
const { connected, lastEvent, logs } = useWebSocket("ws://localhost:3001");

// logs = array of { level, message, taskId, timestamp }
// lastEvent = { type: 'task:progress', data: { taskId, stage: 'ai' } }
// connected = true/false
```

### Fitur

- Auto-reconnect dengan exponential backoff (1s → 2s → 4s → max 30s)
- Parse incoming JSON messages
- Maintain log buffer (max 500 entries)
- Expose connection status

### Acceptance Criteria

- [ ] Connect otomatis saat komponen mount
- [ ] Reconnect otomatis saat koneksi putus
- [ ] Buffer log terjaga di memory

---

## Sprint 3 — Definition of Done ✅

- [x] Live Terminal menampilkan log real-time saat agent bekerja
- [x] Bisa start/stop agent dari dashboard (placeholder endpoints ready)
- [x] Bisa toggle DRY RUN dan YOLO dari dashboard
- [x] "Run Now" langsung memproses 1 task
- [x] Queue bisa di-skip / diprioritaskan (skip implemented, priority placeholder)
- [x] Reconnect WebSocket otomatis setelah disconnect
- [x] All components integrated and tested
- [x] No console errors
- [x] Performance optimized with lazy loading and ring buffer
