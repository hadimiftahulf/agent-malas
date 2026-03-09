# Sprint 4: Metrics, Notifications & Polish

> **Goal:** Dashboard production-ready dengan chart, notification, dan UX polish
> **Estimasi:** 6-8 jam
> **Prerequisite:** Sprint 1, 2, & 3 selesai

---

## Task 4.1 — Metrics Chart Component

**File:** `frontend/src/components/MetricsChart.jsx` (NEW)
**Priority:** 🟡 High

### Deskripsi

Chart interaktif menampilkan tren metrics agent dalam 7-30 hari terakhir.

### Detail Implementasi (menggunakan `recharts`)

#### Chart 1: Daily Activity (Bar Chart)

- X-axis: Tanggal (7 hari terakhir)
- Y-axis: Jumlah
- Bars: Tasks Completed (hijau), Tasks Failed (merah)
- Tooltip: Detail angka saat hover

#### Chart 2: Success Rate (Area Chart)

- X-axis: Tanggal
- Y-axis: Persentase (0-100%)
- Area: `tasksCompleted / (tasksCompleted + tasksFailed) * 100`
- Gradient fill: hijau → transparan

#### Chart 3: PR Status (Pie/Donut Chart)

- Segments: Approved, Changes Requested, Pending, Merged
- Warna sesuai status badge
- Center text: Total PR count

#### Date Range Selector

- Preset buttons: 7 hari, 14 hari, 30 hari
- Data source: `GET /api/dashboard/metrics?days=7`

### Acceptance Criteria

- [ ] 3 chart menampilkan data real
- [ ] Tooltip interaktif berfungsi
- [ ] Date range selector mengubah data
- [ ] Responsif di berbagai layar

---

## Task 4.2 — Dashboard Report Integration

**File:** `src/report.js` (MODIFY)
**Priority:** 🟢 Medium

### Deskripsi

Simpan daily report ke database selain kirim ke WhatsApp.

### Detail Implementasi

- Sebelum kirim ke Fontte, simpan ke `daily_metrics` table di DB
- Tambah endpoint: `GET /api/reports?days=30` — riwayat report
- Response termasuk: date, tasks_completed, prs_revised, message_sent (boolean)

### Acceptance Criteria

- [ ] Report tersimpan ke DB setiap hari
- [ ] API endpoint mengembalikan riwayat report

---

## Task 4.3 — Browser & In-App Notifications

**Priority:** 🟢 Medium

### 4.3.1 Browser Notifications

**File:** `frontend/src/hooks/useNotification.js` (NEW)

- Request permission saat pertama kali
- Trigger saat WebSocket event `task:done` atau `task:error`
- Hanya aktif jika tab tidak aktif (document.hidden)
- Notification body: "✅ Task #820 selesai!" atau "❌ Task #820 gagal"

### 4.3.2 In-App Toast

**File:** `frontend/src/hooks/useToast.js` (NEW)

- Toast container di pojok kanan bawah
- Tipe: success (hijau), error (merah), info (biru), warning (kuning)
- Auto-dismiss setelah 5 detik
- Animasi slide-in dari kanan
- Stack max 3 toast bersamaan

### Acceptance Criteria

- [ ] Browser notification muncul saat tab inactive
- [ ] Toast notification muncul saat event terjadi
- [ ] Auto-dismiss berfungsi
- [ ] Tidak spam (debounce)

---

## Task 4.4 — UX Polish & Edge Cases

**Priority:** 🟢 Medium

### 4.4.1 Loading Skeletons

- Semua komponen menampilkan skeleton saat loading pertama
- Skeleton pulse animation menggunakan Tailwind `animate-pulse`
- Komponen: DashboardStats, TaskQueue, PRTracker, MetricsChart

### 4.4.2 Empty States

- TaskQueue kosong: "🎉 Tidak ada task dalam antrian"
- PRTracker kosong: "Belum ada PR yang dibuat"
- MetricsChart kosong: "Belum ada data metrics"
- Ilustrasi/icon + pesan deskriptif

### 4.4.3 Error States

- API gagal: Retry button + pesan error
- WebSocket disconnect: Banner "Koneksi terputus, reconnecting..."
- React Error Boundary: Fallback UI global

### 4.4.4 Micro-interactions

- Button hover: scale 1.05 + glow shadow
- Card hover: subtle border glow
- Toggle switch: smooth transition
- Page transition: fade-in animation
- Status badge: pulse animation saat processing

### 4.4.5 Keyboard Shortcuts

| Shortcut | Aksi              |
| -------- | ----------------- |
| `Ctrl+K` | Focus search      |
| `Ctrl+L` | Toggle Live Logs  |
| `Escape` | Close modal/panel |

### Acceptance Criteria

- [ ] Semua komponen punya loading skeleton
- [ ] Empty states informatif
- [ ] Error states graceful (tidak blank screen)
- [ ] Animasi smooth tanpa jank
- [ ] Keyboard shortcuts berfungsi

---

## Sprint 4 — Definition of Done

- [ ] Chart metrics menampilkan data 7/14/30 hari
- [ ] Browser notification aktif saat task selesai (tab inactive)
- [ ] Toast muncul saat event real-time
- [ ] Semua komponen: loading, empty, error state lengkap
- [ ] UI smooth dan premium
- [ ] Tidak ada console warning/error di browser
