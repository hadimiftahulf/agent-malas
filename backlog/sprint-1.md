# Sprint 1: API Server + Database (Foundation)

> **Goal:** Backend siap menerima koneksi frontend, semua data tersimpan persisten
> **Estimasi:** 8-10 jam

---

## Task 1.1 — Database Schema & Module

**File:** `src/db.js` (NEW)
**Priority:** 🔴 Critical

### Deskripsi

Membuat modul database menggunakan `better-sqlite3` sebagai persistent state. Semua data task, PR, log, dan metrics disimpan di sini agar bisa diakses oleh API dan dashboard.

### Detail Implementasi

#### Tabel `tasks`

| Kolom           | Tipe                               | Deskripsi                                               |
| --------------- | ---------------------------------- | ------------------------------------------------------- |
| `id`            | TEXT PRIMARY KEY                   | Nomor issue GitHub                                      |
| `title`         | TEXT                               | Judul task                                              |
| `description`   | TEXT                               | Body issue                                              |
| `repo`          | TEXT                               | `owner/repo`                                            |
| `project_name`  | TEXT                               | Nama project board                                      |
| `status`        | TEXT                               | `queued` / `processing` / `done` / `failed` / `skipped` |
| `base_branch`   | TEXT                               | Branch dasar (main/dev-v2/etc)                          |
| `pr_number`     | INTEGER                            | Nomor PR yang dibuat (nullable)                         |
| `error_message` | TEXT                               | Pesan error jika gagal (nullable)                       |
| `started_at`    | DATETIME                           | Waktu mulai diproses                                    |
| `completed_at`  | DATETIME                           | Waktu selesai                                           |
| `created_at`    | DATETIME DEFAULT CURRENT_TIMESTAMP |                                                         |

#### Tabel `task_logs`

| Kolom        | Tipe                               | Deskripsi                 |
| ------------ | ---------------------------------- | ------------------------- |
| `id`         | INTEGER PRIMARY KEY AUTOINCREMENT  |                           |
| `task_id`    | TEXT                               | FK ke tasks.id            |
| `level`      | TEXT                               | `info` / `warn` / `error` |
| `message`    | TEXT                               | Isi log                   |
| `created_at` | DATETIME DEFAULT CURRENT_TIMESTAMP |                           |

#### Tabel `prs`

| Kolom             | Tipe                               | Deskripsi                                    |
| ----------------- | ---------------------------------- | -------------------------------------------- |
| `id`              | INTEGER PRIMARY KEY                | Nomor PR                                     |
| `title`           | TEXT                               | Judul PR                                     |
| `repo`            | TEXT                               | `owner/repo`                                 |
| `task_id`         | TEXT                               | FK ke tasks.id                               |
| `status`          | TEXT                               | `open` / `merged` / `closed`                 |
| `review_decision` | TEXT                               | `approved` / `changes_requested` / `pending` |
| `url`             | TEXT                               | URL ke GitHub PR                             |
| `created_at`      | DATETIME DEFAULT CURRENT_TIMESTAMP |                                              |
| `updated_at`      | DATETIME                           |                                              |

#### Tabel `daily_metrics`

| Kolom             | Tipe              | Deskripsi         |
| ----------------- | ----------------- | ----------------- |
| `date`            | TEXT PRIMARY KEY  | Format YYYY-MM-DD |
| `tasks_completed` | INTEGER DEFAULT 0 |                   |
| `tasks_failed`    | INTEGER DEFAULT 0 |                   |
| `prs_created`     | INTEGER DEFAULT 0 |                   |
| `prs_revised`     | INTEGER DEFAULT 0 |                   |

### Fungsi yang di-export

- `initDb()` — create tables if not exists
- `insertTask(task)` — insert task baru
- `updateTaskStatus(id, status, extra)` — update status + optional fields
- `getTask(id)` — get single task
- `getTasks(filters)` — get tasks with filters (status, repo, date range)
- `insertLog(taskId, level, message)` — insert log entry
- `getLogs(taskId)` — get logs for task
- `insertPR(pr)` — insert PR record
- `getPRs(filters)` — get PRs with filters
- `getDailyMetrics(days)` — get last N days metrics
- `incrementMetric(field)` — increment daily counter

### Acceptance Criteria

- [ ] Tabel otomatis dibuat saat `initDb()` dipanggil
- [ ] CRUD berfungsi untuk semua tabel
- [ ] SQLite file tersimpan di `./data/agent-malas.db`

---

## Task 1.2 — HTTP Server Setup

**File:** `src/server.js` (NEW)
**Priority:** 🔴 Critical

### Deskripsi

Express HTTP server yang menjadi tulang punggung API dan penyaji static files React.

### Detail Implementasi

- Express server di port `API_PORT` (default: `3001`)
- CORS enabled untuk development (`http://localhost:5173` — Vite default)
- JSON body parser middleware
- Serve static files dari `frontend/dist/` untuk production
- SPA fallback: semua route non-API di-redirect ke `index.html`
- Export `httpServer` instance untuk dipakai WebSocket di sprint lain

### Fungsi yang di-export

- `startServer(port)` — start Express + return `httpServer`
- `app` — Express app instance (untuk testing)

### Acceptance Criteria

- [ ] Server start di port 3001
- [ ] `GET /api/health` mengembalikan `{ status: "ok", uptime: ... }`
- [ ] CORS berfungsi dari localhost:5173

---

## Task 1.3 — REST API Endpoints

**File:** `src/routes/api.js` (NEW)
**Priority:** 🔴 Critical

### Deskripsi

Route handler untuk semua REST API endpoints. Data diambil dari `db.js`.

### Endpoints Detail

#### `GET /api/health`

Response:

```json
{
  "status": "ok",
  "agent": "running|stopped|idle",
  "uptime": 3600,
  "lastRun": "2026-03-09T10:00:00Z",
  "version": "1.0.0"
}
```

#### `GET /api/dashboard`

Response:

```json
{
  "today": {
    "tasksCompleted": 5,
    "tasksFailed": 1,
    "prsCreated": 4,
    "prsRevised": 2
  },
  "queue": { "size": 3, "currentTask": "Error: reCAPTCHA Timeout" },
  "agent": { "status": "processing", "uptime": 3600 }
}
```

#### `GET /api/tasks?status=done&repo=org/repo&limit=20&offset=0`

Response: Array of task objects + pagination

#### `GET /api/tasks/:id`

Response: Single task + logs array

#### `GET /api/prs?status=open&limit=20`

Response: Array of PR objects + pagination

#### `GET /api/queue`

Response: Array of queued tasks (current queue snapshot)

#### `GET /api/config`

Response: Current config (interval, dry-run, yolo, reviewer)

### Acceptance Criteria

- [ ] Semua GET endpoints mengembalikan data valid
- [ ] Pagination berfungsi (limit + offset)
- [ ] Filter berfungsi (status, repo, date range)

---

## Task 1.4 — Logger Upgrade (Dual Output)

**File:** `src/logger.js` (MODIFY)
**Priority:** 🟡 High

### Deskripsi

Upgrade logger agar tidak hanya output ke console, tapi juga menyimpan ke database.

### Detail Implementasi

- Import `db.js`
- Setiap `logger.info/warn/error(msg, taskId?)` → juga panggil `insertLog(taskId, level, msg)`
- Parameter `taskId` opsional — jika disediakan, log terkait task tersebut
- Backward compatible: existing calls tanpa `taskId` tetap berjalan normal

### Acceptance Criteria

- [ ] Log tersimpan di tabel `task_logs`
- [ ] Console output tetap sama seperti sebelumnya
- [ ] Tidak ada breaking change pada existing calls

---

## Task 1.5 — Integrate Server ke Main Loop

**File:** `src/index.js` (MODIFY)
**Priority:** 🟡 High

### Deskripsi

Integrate HTTP server dan database ke dalam main application loop.

### Detail Implementasi

- `initDb()` dipanggil di awal `main()`
- `startServer()` dipanggil setelah DB init
- Setiap kali `processTask()` dipanggil:
  - Insert task ke DB dengan status `processing`
  - Update status ke `done` / `failed` setelah selesai
  - Increment daily metrics
- Agent state (running/stopped/idle) disimpan di variable yang bisa diakses API
- Tambah env var `API_PORT` ke `.env.example` dan `config.js`

### Acceptance Criteria

- [ ] Server & agent loop berjalan bersamaan
- [ ] Task yang diproses tercatat di DB
- [ ] `GET /api/dashboard` menampilkan data real

---

## Sprint 1 — Definition of Done

- [ ] `yarn install` berhasil dengan dependencies baru
- [ ] `node src/index.js` → agent loop + HTTP server berjalan bersamaan
- [ ] `curl localhost:3001/api/health` → response JSON valid
- [ ] `curl localhost:3001/api/dashboard` → metrics dari DB
- [ ] `curl localhost:3001/api/tasks` → daftar task yang pernah diproses
- [ ] Log tersimpan di SQLite, bisa di-query via API
