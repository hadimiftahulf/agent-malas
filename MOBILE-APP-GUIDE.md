# Mobile App Integration Guide

## Overview

Sistem ini mendukung approval workflow dimana setiap task (issue project atau PR rejected) memerlukan approval dari user sebelum dieksekusi oleh AI. Approval bisa dilakukan melalui:
1. Web Frontend (React)
2. Mobile App (Android/iOS)

## Architecture

```
┌─────────────────┐
│  GitHub Issues  │
│  GitHub PRs     │
└────────┬────────┘
         │
         ▼
┌─────────────────┐      ┌──────────────────┐
│  Agent Backend  │◄────►│  SQLite Database │
│  (Node.js)      │      │  (Approval Queue)│
└────────┬────────┘      └──────────────────┘
         │
         ├──────────────┬──────────────┐
         ▼              ▼              ▼
┌─────────────┐  ┌─────────────┐  ┌─────────────┐
│ Web Frontend│  │ Mobile App  │  │ Mobile App  │
│  (React)    │  │  (Android)  │  │   (iOS)     │
└─────────────┘  └─────────────┘  └─────────────┘
```

## Workflow

### 1. Task Discovery
- Agent menemukan task baru (issue atau PR rejected)
- Task disimpan ke database dengan status `approval_status = 'pending'`
- Notification dibuat di tabel `approval_notifications`

### 2. Real-time Notification
- WebSocket broadcast event `approval:request` ke semua connected clients
- Web frontend dan mobile app menerima notifikasi real-time
- Notification berisi:
  - Task ID
  - Task title & description
  - Repository info
  - Notification type (issue/pr_rejected)

### 3. User Approval
User bisa approve atau reject melalui:

**Web Frontend:**
```javascript
// Approve
POST /api/approval/task/:taskId/approve
Body: { approvedBy: "username", deviceId: "web-client" }

// Reject
POST /api/approval/task/:taskId/reject
Body: { rejectedBy: "username", reason: "Not needed", deviceId: "web-client" }
```

**Mobile App:**
```javascript
// Approve
POST /api/approval/task/:taskId/approve
Body: { approvedBy: "username", deviceId: "android-device-123" }

// Reject
POST /api/approval/task/:taskId/reject
Body: { rejectedBy: "username", reason: "Not needed", deviceId: "android-device-123" }
```

### 4. Task Execution
- Jika approved: Agent mengeksekusi task
- Jika rejected: Task di-skip dan di-label sebagai rejected
- WebSocket broadcast `approval:response` untuk update UI

## API Endpoints

### Mobile Device Management

#### Register Device
```http
POST /api/mobile/register
Content-Type: application/json

{
  "deviceId": "android-device-123",
  "deviceName": "Samsung Galaxy S21",
  "ipAddress": "192.168.1.100"  // Optional, auto-detected
}

Response:
{
  "success": true,
  "message": "Device registered successfully",
  "device": {
    "deviceId": "android-device-123",
    "deviceName": "Samsung Galaxy S21",
    "ipAddress": "192.168.1.100"
  }
}
```

#### Heartbeat (Keep-alive)
```http
POST /api/mobile/heartbeat
Content-Type: application/json

{
  "deviceId": "android-device-123",
  "deviceName": "Samsung Galaxy S21"
}

Response:
{
  "success": true,
  "message": "Heartbeat received"
}
```

#### Get Server Info
```http
GET /api/mobile/server-info

Response:
{
  "success": true,
  "data": {
    "serverUrl": "http://192.168.1.50:3000",
    "wsUrl": "ws://192.168.1.50:3000",
    "version": "1.0.0",
    "features": {
      "approvalWorkflow": true,
      "realTimeNotifications": true,
      "taskManagement": true
    }
  }
}
```

### Approval Management

#### Get Pending Approvals
```http
GET /api/approval/pending

Response:
{
  "success": true,
  "data": [
    {
      "id": 1,
      "task_id": "TASK-123",
      "notification_type": "issue",
      "title": "New feature request",
      "description": "Implement user authentication",
      "status": "pending",
      "sent_at": "2024-01-15T10:30:00Z",
      "task": {
        "id": "TASK-123",
        "title": "feat: Add user authentication",
        "description": "...",
        "repo": "owner/repo",
        "status": "queued",
        "approval_status": "pending"
      }
    }
  ]
}
```

#### Approve Task
```http
POST /api/approval/task/:taskId/approve
Content-Type: application/json

{
  "approvedBy": "john_doe",
  "deviceId": "android-device-123"
}

Response:
{
  "success": true,
  "message": "Task approved successfully",
  "taskId": "TASK-123"
}
```

#### Reject Task
```http
POST /api/approval/task/:taskId/reject
Content-Type: application/json

{
  "rejectedBy": "john_doe",
  "reason": "Duplicate task",
  "deviceId": "android-device-123"
}

Response:
{
  "success": true,
  "message": "Task rejected successfully",
  "taskId": "TASK-123"
}
```

## WebSocket Events

### Connection
```javascript
const ws = new WebSocket('ws://192.168.1.50:3000/ws');

ws.onopen = () => {
  console.log('Connected to server');
};

ws.onmessage = (event) => {
  const message = JSON.parse(event.data);
  handleMessage(message);
};
```

### Event Types

#### approval:request
Dikirim saat ada task baru yang memerlukan approval
```json
{
  "type": "approval:request",
  "data": {
    "notificationId": 1,
    "taskId": "TASK-123",
    "notificationType": "issue",
    "title": "New feature request",
    "description": "Implement user authentication",
    "task": {
      "id": "TASK-123",
      "title": "feat: Add user authentication",
      "description": "...",
      "repo": "owner/repo",
      "status": "queued"
    },
    "timestamp": "2024-01-15T10:30:00Z"
  },
  "timestamp": 1705318200000
}
```

#### approval:response
Dikirim saat task di-approve atau di-reject
```json
{
  "type": "approval:response",
  "data": {
    "taskId": "TASK-123",
    "status": "approved",
    "by": "john_doe",
    "task": {
      "id": "TASK-123",
      "title": "feat: Add user authentication",
      "repo": "owner/repo"
    },
    "timestamp": "2024-01-15T10:35:00Z"
  },
  "timestamp": 1705318500000
}
```

## Mobile App Implementation

### Android (React Native / Flutter / Native)

#### 1. Setup
```javascript
// React Native Example
import { io } from 'socket.io-client';

const SERVER_URL = 'http://192.168.1.50:3000';
const WS_URL = 'ws://192.168.1.50:3000/ws';

// Register device
async function registerDevice() {
  const deviceId = await DeviceInfo.getUniqueId();
  const deviceName = await DeviceInfo.getDeviceName();
  
  const response = await fetch(`${SERVER_URL}/api/mobile/register`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ deviceId, deviceName })
  });
  
  return response.json();
}
```

#### 2. WebSocket Connection
```javascript
const ws = new WebSocket(WS_URL);

ws.onopen = () => {
  console.log('Connected to server');
  // Start heartbeat
  setInterval(() => sendHeartbeat(), 30000);
};

ws.onmessage = (event) => {
  const message = JSON.parse(event.data);
  
  if (message.type === 'approval:request') {
    // Show notification
    showNotification(message.data);
  }
};

function sendHeartbeat() {
  fetch(`${SERVER_URL}/api/mobile/heartbeat`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ 
      deviceId: deviceId,
      deviceName: deviceName 
    })
  });
}
```

#### 3. Handle Approval
```javascript
async function approveTask(taskId) {
  const response = await fetch(
    `${SERVER_URL}/api/approval/task/${taskId}/approve`,
    {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        approvedBy: username,
        deviceId: deviceId
      })
    }
  );
  
  return response.json();
}

async function rejectTask(taskId, reason) {
  const response = await fetch(
    `${SERVER_URL}/api/approval/task/${taskId}/reject`,
    {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        rejectedBy: username,
        reason: reason,
        deviceId: deviceId
      })
    }
  );
  
  return response.json();
}
```

#### 4. Push Notifications (Optional)
```javascript
// Using Firebase Cloud Messaging (FCM)
import messaging from '@react-native-firebase/messaging';

async function requestPermission() {
  const authStatus = await messaging().requestPermission();
  const enabled =
    authStatus === messaging.AuthorizationStatus.AUTHORIZED ||
    authStatus === messaging.AuthorizationStatus.PROVISIONAL;

  if (enabled) {
    console.log('Authorization status:', authStatus);
  }
}

messaging().onMessage(async remoteMessage => {
  console.log('Notification received:', remoteMessage);
  // Show local notification
  showLocalNotification(remoteMessage);
});
```

## Local Network Access

### Setup untuk Local Network

1. **Cari IP Address Server:**
```bash
# Linux/Mac
ifconfig | grep "inet "

# Windows
ipconfig
```

2. **Update Mobile App Config:**
```javascript
// Ganti localhost dengan IP address server
const SERVER_URL = 'http://192.168.1.50:3000';  // IP server di local network
```

3. **Pastikan Firewall Allow:**
```bash
# Linux (ufw)
sudo ufw allow 3000/tcp

# Windows
# Buka Windows Firewall > Inbound Rules > New Rule > Port 3000
```

### Remote Access (Ngrok/Tunnel)

Untuk akses dari luar network (internet):

```bash
# Install ngrok
npm install -g ngrok

# Start tunnel
ngrok http 3000

# Output:
# Forwarding https://abc123.ngrok.io -> http://localhost:3000
```

Update mobile app:
```javascript
const SERVER_URL = 'https://abc123.ngrok.io';
const WS_URL = 'wss://abc123.ngrok.io/ws';
```

## Database Schema

### Tables

#### tasks
```sql
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
```

#### approval_notifications
```sql
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
```

#### mobile_devices
```sql
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

## Testing

### Test dengan cURL

```bash
# Register device
curl -X POST http://localhost:3000/api/mobile/register \
  -H "Content-Type: application/json" \
  -d '{"deviceId":"test-device","deviceName":"Test Device"}'

# Get pending approvals
curl http://localhost:3000/api/approval/pending

# Approve task
curl -X POST http://localhost:3000/api/approval/task/TASK-123/approve \
  -H "Content-Type: application/json" \
  -d '{"approvedBy":"tester","deviceId":"test-device"}'

# Reject task
curl -X POST http://localhost:3000/api/approval/task/TASK-123/reject \
  -H "Content-Type: application/json" \
  -d '{"rejectedBy":"tester","reason":"Not needed","deviceId":"test-device"}'
```

### Test WebSocket

```javascript
// Node.js test script
const WebSocket = require('ws');

const ws = new WebSocket('ws://localhost:3000/ws');

ws.on('open', () => {
  console.log('Connected');
});

ws.on('message', (data) => {
  const message = JSON.parse(data);
  console.log('Received:', message);
});
```

## Security Considerations

1. **Authentication**: Implement JWT atau API key untuk production
2. **HTTPS/WSS**: Gunakan SSL/TLS untuk production
3. **Rate Limiting**: Implement rate limiting untuk API endpoints
4. **Device Verification**: Verify device ID sebelum approve/reject
5. **IP Whitelist**: Whitelist IP addresses yang diizinkan

## Next Steps

1. ✅ Database schema updated
2. ✅ API endpoints created
3. ✅ WebSocket events implemented
4. ⏳ Update main loop untuk approval workflow
5. ⏳ Frontend UI untuk approval
6. ⏳ Mobile app development (React Native/Flutter)
7. ⏳ Push notification integration
8. ⏳ Security implementation

## Resources

- [WebSocket API](https://developer.mozilla.org/en-US/docs/Web/API/WebSocket)
- [React Native](https://reactnative.dev/)
- [Flutter](https://flutter.dev/)
- [Firebase Cloud Messaging](https://firebase.google.com/docs/cloud-messaging)
- [Ngrok](https://ngrok.com/)
