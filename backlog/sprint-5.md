# Sprint 5: Production & Deployment (Opsional)

> **Goal:** Agent + Dashboard siap deploy di server
> **Estimasi:** 3-4 jam
> **Prerequisite:** Sprint 1-4 selesai

---

## Task 5.1 — Docker Setup

**Files:** `Dockerfile`, `docker-compose.yml` (NEW)
**Priority:** 🔵 Nice-to-have

### Deskripsi

Containerize seluruh aplikasi (backend + frontend) agar mudah di-deploy.

### Detail Implementasi

#### Dockerfile (Multi-stage)

```
Stage 1: Build React frontend
  - FROM node:20-alpine AS frontend
  - WORKDIR /app/frontend
  - npm install + npm run build

Stage 2: Runtime
  - FROM node:20-alpine
  - COPY backend files + frontend/dist
  - Install production deps only
  - EXPOSE 3001
  - CMD ["node", "src/index.js"]
```

#### docker-compose.yml

```yaml
services:
  agent-malas:
    build: .
    ports:
      - "3001:3001"
    volumes:
      - ./workspace:/app/workspace # Persist workspace
      - ./data:/app/data # Persist SQLite DB
      - ~/.ssh:/root/.ssh:ro # SSH keys untuk git
    env_file: .env
    restart: unless-stopped
```

### Acceptance Criteria

- [ ] `docker compose up -d` → agent + dashboard berjalan
- [ ] Data persist setelah container restart
- [ ] Git operations berfungsi dalam container

---

## Task 5.2 — Authentication

**File:** `src/middleware/auth.js` (NEW)
**Priority:** 🔵 Nice-to-have

### Deskripsi

Simple authentication untuk melindungi dashboard dari akses publik.

### Detail Implementasi

- Environment variable: `DASHBOARD_PASSWORD`
- Jika diset: semua route `/api/*` dan `/*` memerlukan auth
- Method: Simple token-based
  - `POST /api/auth/login` → body `{ password }` → response `{ token }`
  - Subsequent requests: `Authorization: Bearer <token>`
- Token: JWT sederhana atau random string disimpan di memory
- Frontend: Login page → simpan token di `localStorage`
- Jika `DASHBOARD_PASSWORD` tidak diset: bypass auth (development mode)

### Acceptance Criteria

- [ ] Dashboard terlindungi jika password diset
- [ ] Login page tampil jika belum auth
- [ ] Token persist di localStorage
- [ ] Development mode (tanpa password) tetap berfungsi

---

## Task 5.3 — Build & Deploy Script

**File:** `scripts/build.sh`, update `package.json` (NEW)
**Priority:** 🔵 Nice-to-have

### package.json scripts

```json
{
  "scripts": {
    "start": "node src/index.js",
    "dev": "node src/index.js",
    "build": "cd frontend && npm run build",
    "deploy": "npm run build && pm2 restart agent-malas",
    "once": "node src/index.js --once"
  }
}
```

### PM2 Ecosystem File (`ecosystem.config.cjs`)

```js
module.exports = {
  apps: [
    {
      name: "agent-malas",
      script: "src/index.js",
      env: { NODE_ENV: "production" },
      max_memory_restart: "500M",
      log_date_format: "YYYY-MM-DD HH:mm:ss",
    },
  ],
};
```

### Acceptance Criteria

- [ ] `npm run build` → frontend siap production
- [ ] PM2 menjaga proses tetap running
- [ ] Auto-restart jika crash

---

## Sprint 5 — Definition of Done

- [ ] Docker build berhasil
- [ ] `docker compose up` → semua berjalan
- [ ] Authentication berfungsi jika password diset
- [ ] PM2 menjaga proses tetap hidup
- [ ] Dokumentasi deploy tersedia di README
