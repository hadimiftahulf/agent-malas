# Sprint 2: React Dashboard (Core UI)

> **Goal:** Dashboard menampilkan data real dari API dengan design premium
> **Estimasi:** 10-12 jam
> **Prerequisite:** Sprint 1 selesai

---

## Task 2.1 — React App Setup (Vite + Tailwind)

**Folder:** `frontend/` (NEW)
**Priority:** 🔴 Critical

### Deskripsi

Scaffold React app menggunakan Vite dan konfigurasi Tailwind CSS.

### Detail Implementasi

- `npx -y create-vite frontend --template react`
- Install Tailwind CSS: `npm install -D tailwindcss @tailwindcss/vite`
- Konfigurasi `tailwind.config.js`:
  - Dark mode: `class`
  - Custom colors: slate/zinc palette dengan accent cyan/emerald
  - Custom fonts: Inter (Google Fonts)
- Setup proxy di `vite.config.js`:
  ```js
  server: { proxy: { '/api': 'http://localhost:3001' } }
  ```
- Hapus boilerplate files (App.css, assets, dll)

### Acceptance Criteria

- [ ] `npm run dev` → React app berjalan di localhost:5173
- [ ] Tailwind classes berfungsi
- [ ] API proxy berfungsi (`/api/health` dari React)

---

## Task 2.2 — Layout & Design System

**File:** `frontend/src/App.jsx` (NEW)
**Priority:** 🔴 Critical

### Deskripsi

Main layout dengan sidebar, header, dan content area. white mode default.

### Detail Implementasi

#### Layout Structure

```
┌──────────────────────────────────────────┐
│ Header (Agent Status + Uptime)           │
├────────┬─────────────────────────────────┤
│        │                                 │
│ Side   │    Main Content Area            │
│ bar    │    (Dashboard / Tasks / PRs)    │
│        │                                 │
│ - 📊   │                                 │
│ - 📋   │                                 │
│ - 🔀   │                                 │
│ - ⚙️   │                                 │
│ - 📺   │                                 │
└────────┴─────────────────────────────────┘
```

#### Sidebar Menu Items

| Icon | Label         | Komponen                  |
| ---- | ------------- | ------------------------- |
| 📊   | Dashboard     | `DashboardStats`          |
| 📋   | Task Queue    | `TaskQueue`               |
| 🔀   | Pull Requests | `PRTracker`               |
| ⚙️   | Settings      | `AgentControl` (Sprint 3) |
| 📺   | Live Logs     | `LiveTerminal` (Sprint 3) |

#### Design Tokens (Tailwind)

- Background: `bg-gray-950` (main), `bg-gray-900` (sidebar)
- Cards: `bg-gray-800/50 backdrop-blur-xl border border-gray-700/50 rounded-2xl`
- Text: `text-gray-100` (primary), `text-gray-400` (secondary)
- Accent: `text-cyan-400`, `text-emerald-400`
- Status: `text-green-400` (running), `text-red-400` (stopped), `text-yellow-400` (processing)

#### Header

- Kiri: Logo "🤖 Agent Malas" + status badge (🟢 Running / 🔴 Stopped / 🟡 Processing)
- Kanan: Uptime counter, last check timestamp

### Acceptance Criteria

- [ ] Sidebar collapsible (hover expand)
- [ ] Dark mode glassmorphism terlihat premium
- [ ] Responsive: sidebar jadi bottom nav di mobile
- [ ] Navigasi antar halaman berfungsi

---

## Task 2.3 — Dashboard Stats Component

**File:** `frontend/src/components/DashboardStats.jsx` (NEW)
**Priority:** 🟡 High

### Deskripsi

Halaman utama dashboard menampilkan ringkasan metrics dalam bentuk cards.

### Detail Implementasi

#### Cards Layout (Grid 2x3)

| Card            | Data Source                                 | Icon | Accent Color  |
| --------------- | ------------------------------------------- | ---- | ------------- |
| Tasks Completed | `GET /api/dashboard → today.tasksCompleted` | ✅   | `emerald-400` |
| Tasks Failed    | `today.tasksFailed`                         | ❌   | `red-400`     |
| PRs Created     | `today.prsCreated`                          | 🔀   | `cyan-400`    |
| PRs Revised     | `today.prsRevised`                          | 🔄   | `amber-400`   |
| Queue Size      | `queue.size`                                | 📋   | `violet-400`  |
| Agent Status    | `agent.status`                              | 🤖   | dynamic       |

#### Micro-animations

- Count-up animation saat angka berubah (0 → 5 dalam 500ms)
- Pulse dot pada card "Agent Status" saat processing
- Hover: card scale 1.02 + shadow glow

#### Data Fetching

- `useEffect` → fetch `/api/dashboard` on mount
- Auto-refresh setiap 30 detik
- Loading skeleton saat fetch pertama

### Acceptance Criteria

- [ ] 6 card tersusun rapi (responsive grid)
- [ ] Data real dari API
- [ ] Count-up animation berfungsi
- [ ] Auto-refresh berjalan

---

## Task 2.4 — Task Queue Component

**File:** `frontend/src/components/TaskQueue.jsx` (NEW)
**Priority:** 🟡 High

### Deskripsi

Menampilkan daftar task dalam antrian dan riwayat task yang sudah diproses.

### Detail Implementasi

#### UI Structure

- **Tab 1: Queue** — Task yang sedang menunggu/diproses
- **Tab 2: History** — Task yang sudah selesai/gagal

#### Setiap Task Item Menampilkan

- Nomor Issue + Judul (link ke GitHub)
- Repo badge (`owner/repo`)
- Project name badge
- Status badge dengan warna:
  - 🔵 `bg-blue-500/20 text-blue-400` — Queued
  - 🟡 `bg-yellow-500/20 text-yellow-400` — Processing
  - 🟢 `bg-emerald-500/20 text-emerald-400` — Done
  - 🔴 `bg-red-500/20 text-red-400` — Failed
- Timestamp (relative: "5 menit lalu")

#### Filters

- Dropdown: Filter by repo
- Dropdown: Filter by status
- Search: Cari by title

#### Data Fetching

- Queue: `GET /api/queue`
- History: `GET /api/tasks?limit=20`
- Pagination: Load more on scroll

### Acceptance Criteria

- [ ] Tab Queue dan History berfungsi
- [ ] Status badges tampil benar
- [ ] Filter dan search berfungsi
- [ ] Pagination berjalan

---

## Task 2.5 — PR Tracker Component

**File:** `frontend/src/components/PRTracker.jsx` (NEW)
**Priority:** 🟡 High

### Deskripsi

Menampilkan semua Pull Request yang dibuat oleh agent beserta status review-nya.

### Detail Implementasi

#### Setiap PR Item Menampilkan

- Nomor PR + Judul (clickable link ke GitHub)
- Repo badge
- Review status badge:
  - ✅ `Approved` — hijau
  - ❌ `Changes Requested` — merah
  - ⏳ `Pending Review` — kuning
  - 🔀 `Merged` — ungu
- Related task ID (link ke detail task)
- Created date (relative)

#### Layout

- Table/list view
- Sortable by: created date, status
- Filter by: status, repo

### Acceptance Criteria

- [ ] Semua PR tampil dengan status yang benar
- [ ] Link ke GitHub berfungsi (target \_blank)
- [ ] Filter dan sort berfungsi

---

## Task 2.6 — Custom Hook: useApi

**File:** `frontend/src/hooks/useApi.js` (NEW)
**Priority:** 🟢 Medium

### Deskripsi

Reusable hook untuk data fetching dengan loading, error, dan refetch state.

### Interface

```jsx
const { data, loading, error, refetch } = useApi("/api/dashboard", {
  interval: 30000, // auto-refresh tiap 30 detik (opsional)
  params: { status: "done", limit: 20 }, // query params (opsional)
});
```

### Acceptance Criteria

- [ ] Loading state ditampilkan saat fetch
- [ ] Error state handled gracefully
- [ ] Auto-refresh berfungsi jika interval disediakan
- [ ] Cleanup interval saat unmount

---

## Sprint 2 — Definition of Done

- [ ] `npm run dev` di folder `frontend/` → dashboard tampil
- [ ] Dashboard stats menampilkan data real dari API
- [ ] Task queue menampilkan antrian + history
- [ ] PR tracker menampilkan daftar PR
- [ ] Tampilan premium dark mode glassmorphism
- [ ] Responsive di mobile (360px) dan desktop (1920px)
- [ ] Tidak ada console error di browser
