# Approval Workflow Implementation

## Overview

Sistem approval workflow telah diimplementasikan untuk memastikan setiap task (issue project atau PR rejected) memerlukan persetujuan user sebelum dieksekusi oleh AI agent.

## What's Implemented

### 1. Backend Changes

#### Database Schema
- **tasks table**: Ditambahkan kolom `approval_status`, `approved_by`, `approved_at`, `rejection_reason`
- **approval_notifications table**: Tabel baru untuk tracking approval requests
- **mobile_devices table**: Tabel untuk registrasi mobile devices (future use)

#### API Endpoints
- `GET /api/approval/pending` - Get pending approvals
- `GET /api/approval/tasks` - Get tasks pending approval
- `POST /api/approval/task/:taskId/approve` - Approve task
- `POST /api/approval/task/:taskId/reject` - Reject task
- `POST /api/mobile/register` - Register mobile device
- `POST /api/mobile/heartbeat` - Keep-alive

#### WebSocket Events
- `approval:request` - Broadcast saat ada task baru yang perlu approval
- `approval:response` - Broadcast saat task di-approve/reject
- `agent:status` - Update status agent (termasuk `waiting_approval`)

#### Main Loop Changes (`src/index.js`)
- Setiap task baru akan request approval terlebih dahulu
- Agent akan wait sampai task di-approve
- Jika rejected, task akan di-skip
- Jika approved, task akan dieksekusi seperti biasa

### 2. Frontend Changes

#### New Component: `ApprovalNotifications.jsx`
- Menampilkan list pending approvals
- Real-time update via WebSocket
- Approve/Reject buttons
- Browser notifications (jika diizinkan)
- Auto-refresh saat ada approval baru

#### Updated Components:
- **App.jsx**: Menambahkan route untuk approvals page
- **Sidebar.jsx**: Menambahkan menu "Approvals" dengan icon CheckCircle
- **WebSocket handling**: Menambahkan handler untuk `approval:request` dan `approval:response`

## How It Works

### Flow Diagram

```
┌─────────────────────────────────────────────────────────────┐
│  1. Agent menemukan task baru (issue/PR rejected)          │
└────────────────────┬────────────────────────────────────────┘
                     │
                     ▼
┌─────────────────────────────────────────────────────────────┐
│  2. Task disimpan ke DB dengan approval_status='pending'    │
│     Notification dibuat di approval_notifications table     │
└────────────────────┬────────────────────────────────────────┘
                     │
                     ▼
┌─────────────────────────────────────────────────────────────┐
│  3. WebSocket broadcast 'approval:request' ke frontend      │
│     Agent status = 'waiting_approval'                       │
└────────────────────┬────────────────────────────────────────┘
                     │
                     ▼
┌─────────────────────────────────────────────────────────────┐
│  4. Frontend menampilkan notification di Approvals page     │
│     Browser notification (jika enabled)                     │
│     Toast notification                                      │
└────────────────────┬────────────────────────────────────────┘
                     │
                     ▼
┌─────────────────────────────────────────────────────────────┐
│  5. User klik Approve atau Reject                           │
└────────────────────┬────────────────────────────────────────┘
                     │
         ┌───────────┴───────────┐
         │                       │
         ▼                       ▼
    ┌─────────┐            ┌─────────┐
    │ APPROVE │            │ REJECT  │
    └────┬────┘            └────┬────┘
         │                      │
         ▼                      ▼
┌─────────────────┐    ┌─────────────────┐
│ approval_status │    │ approval_status │
│ = 'approved'    │    │ = 'rejected'    │
└────┬────────────┘    └────┬────────────┘
     │                      │
     ▼                      ▼
┌─────────────────┐    ┌─────────────────┐
│ WebSocket       │    │ WebSocket       │
│ broadcast       │    │ broadcast       │
│ 'approval:      │    │ 'approval:      │
│  response'      │    │  response'      │
└────┬────────────┘    └────┬────────────┘
     │                      │
     ▼                      ▼
┌─────────────────┐    ┌─────────────────┐
│ Agent eksekusi  │    │ Task di-skip    │
│ task            │    │ status='skipped'│
└─────────────────┘    └─────────────────┘
```

## Usage

### 1. Start Backend
```bash
npm start
```

### 2. Start Frontend
```bash
cd frontend
npm run dev
```

### 3. Navigate to Approvals Page
- Klik menu "Approvals" di sidebar
- Atau langsung ke `http://localhost:5173/` dan pilih Approvals

### 4. Approve/Reject Tasks
- Lihat list pending approvals
- Klik "✓ Approve" untuk approve task
- Klik "✗ Reject" untuk reject task (akan diminta reason)

### 5. Monitor Agent
- Agent akan otomatis eksekusi task yang di-approve
- Task yang di-reject akan di-skip
- Status agent bisa dilihat di Dashboard

## Features

### Real-time Notifications
- WebSocket connection untuk instant updates
- Browser notifications (perlu permission)
- Toast notifications di dalam app
- Auto-refresh approval list

### Task Information
- Task title dan description
- Repository info
- Notification type (issue/pr_rejected)
- Timestamp
- Comment summary (untuk PR rejected)

### Approval Actions
- Approve: Task akan dieksekusi oleh agent
- Reject: Task akan di-skip dengan reason

### Visual Indicators
- Color-coded notifications (blue untuk issue, orange untuk PR)
- Icons untuk setiap notification type
- Processing state saat approve/reject
- Empty state saat tidak ada pending approvals

## Configuration

### Enable/Disable Approval Workflow
Untuk sementara approval workflow selalu aktif. Jika ingin disable, bisa tambahkan config:

```javascript
// src/config.js
export const config = {
  // ... existing config
  requireApproval: true, // Set false untuk disable approval workflow
};
```

Kemudian update `src/index.js`:
```javascript
// Check if approval is required
if (config.requireApproval && (!taskFromDb || taskFromDb.approval_status === 'pending')) {
  // Request approval
  requestTaskApproval(...);
  return;
}
```

### Browser Notifications
Browser notifications akan otomatis request permission saat pertama kali buka Approvals page. User bisa allow/deny.

## Testing

### Test Approval Flow
1. Create issue di GitHub project dengan status "Ready"
2. Agent akan detect dan request approval
3. Check Approvals page di frontend
4. Approve atau reject task
5. Monitor agent execution di Dashboard atau Logs

### Test PR Rejected Flow
1. Create PR dan request review
2. Reviewer reject dengan comments
3. Agent akan detect dan request approval untuk fix
4. Check Approvals page
5. Approve untuk auto-fix atau reject untuk skip

### Test WebSocket
```javascript
// Browser console
const ws = new WebSocket('ws://localhost:3000/ws');
ws.onmessage = (e) => console.log(JSON.parse(e.data));
```

## Troubleshooting

### Approval tidak muncul di frontend
- Check WebSocket connection (lihat console)
- Refresh page
- Check backend logs untuk error
- Verify database: `SELECT * FROM approval_notifications WHERE status='pending'`

### Task tidak dieksekusi setelah approve
- Check agent status di Dashboard
- Check task approval_status di database
- Check backend logs untuk error
- Verify agent loop is running

### Browser notification tidak muncul
- Check browser permission (Settings > Site Settings > Notifications)
- Allow notifications untuk localhost
- Refresh page dan allow permission prompt

## Next Steps

1. ✅ Backend approval workflow implemented
2. ✅ Frontend approval UI implemented
3. ✅ Real-time WebSocket notifications
4. ✅ Atomic commits for PR fixes
5. ⏳ Mobile app development (Android/iOS)
6. ⏳ Push notifications via FCM
7. ⏳ User authentication
8. ⏳ Multi-user approval workflow
9. ⏳ Approval history and audit log
10. ⏳ Approval rules and automation

## API Reference

See `MOBILE-APP-GUIDE.md` for complete API documentation.

## Database Schema

```sql
-- Tasks table (updated)
CREATE TABLE tasks (
  id TEXT PRIMARY KEY,
  title TEXT,
  description TEXT,
  repo TEXT,
  project_name TEXT,
  status TEXT DEFAULT 'queued',
  approval_status TEXT DEFAULT 'pending',  -- NEW
  approved_by TEXT,                         -- NEW
  approved_at DATETIME,                     -- NEW
  rejection_reason TEXT,                    -- NEW
  ...
);

-- Approval notifications table (new)
CREATE TABLE approval_notifications (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  task_id TEXT NOT NULL,
  notification_type TEXT NOT NULL,
  title TEXT,
  description TEXT,
  status TEXT DEFAULT 'pending',
  sent_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  responded_at DATETIME,
  response_by TEXT,
  FOREIGN KEY (task_id) REFERENCES tasks(id)
);

-- Mobile devices table (new)
CREATE TABLE mobile_devices (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  device_id TEXT UNIQUE NOT NULL,
  device_name TEXT,
  ip_address TEXT,
  last_seen DATETIME DEFAULT CURRENT_TIMESTAMP,
  is_active BOOLEAN DEFAULT 1,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP
);
```

## Files Changed

### Backend
- `src/db.js` - Database schema and functions
- `src/index.js` - Main loop with approval workflow
- `src/approval-helper.js` - Approval helper functions (NEW)
- `src/routes/approval.js` - Approval API endpoints (NEW)
- `src/routes/mobile.js` - Mobile device API endpoints (NEW)
- `src/routes/api.js` - Mount approval and mobile routers
- `src/worker.js` - Atomic commits for PR fixes
- `src/worker-improved.js` - Atomic commits for PR fixes

### Frontend
- `frontend/src/App.jsx` - Add approvals route and WebSocket handlers
- `frontend/src/components/Sidebar.jsx` - Add Approvals menu
- `frontend/src/components/ApprovalNotifications.jsx` - Approval UI component (NEW)

### Documentation
- `MOBILE-APP-GUIDE.md` - Complete mobile app integration guide (NEW)
- `APPROVAL-WORKFLOW-IMPLEMENTATION.md` - This file (NEW)

## Support

For issues or questions, check:
- Backend logs: `npm start` output
- Frontend console: Browser DevTools
- Database: SQLite browser or `sqlite3 data/agent-malas.db`
- WebSocket: Browser DevTools > Network > WS tab
