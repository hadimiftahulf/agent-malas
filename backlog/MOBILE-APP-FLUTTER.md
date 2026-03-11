# Mobile App Flutter - Sprint Plan

## Overview
Implementasi mobile app Android menggunakan Flutter untuk Agent Malas approval workflow. App akan connect ke backend via QR code scan yang berisi API URL (local network).

## Architecture
```
┌─────────────────────────────────────────────────────────────┐
│  Mobile App (Flutter)                                       │
│  ┌─────────────────┐  ┌─────────────────┐                 │
│  │  QR Scanner     │  │  Dashboard      │                 │
│  │  (First Launch) │→ │  (Approvals)    │                 │
│  └─────────────────┘  └─────────────────┘                 │
│           ↓                     ↓                           │
│  ┌──────────────────────────────────────┐                 │
│  │  API Service (HTTP + WebSocket)      │                 │
│  └──────────────────────────────────────┘                 │
└─────────────────────────────────────────────────────────────┘
                        ↓
┌─────────────────────────────────────────────────────────────┐
│  Backend API (Node.js)                                      │
│  - REST API: /api/approval/*                                │
│  - WebSocket: ws://localhost:3001/ws                        │
│  - Mobile API: /api/mobile/*                                │
└─────────────────────────────────────────────────────────────┘
```

## Tech Stack
- **Framework**: Flutter 3.x
- **State Management**: Provider / Riverpod
- **HTTP Client**: dio
- **WebSocket**: web_socket_channel
- **QR Scanner**: mobile_scanner
- **QR Generator**: qr_flutter (for web)
- **Local Storage**: shared_preferences
- **Notifications**: flutter_local_notifications

---

## Sprint 1: Project Setup & QR Code Integration

### Task 1.1: Flutter Project Initialization
**Priority**: High  
**Estimate**: 2 hours

**Acceptance Criteria**:
- [ ] Create new Flutter project: `flutter create agent_malas_mobile`
- [ ] Configure `pubspec.yaml` with required dependencies
- [ ] Setup folder structure:
  ```
  lib/
  ├── main.dart
  ├── config/
  │   ├── app_config.dart
  │   └── theme.dart
  ├── models/
  │   ├── approval.dart
  │   ├── task.dart
  │   └── api_config.dart
  ├── services/
  │   ├── api_service.dart
  │   ├── websocket_service.dart
  │   └── storage_service.dart
  ├── screens/
  │   ├── splash_screen.dart
  │   ├── qr_scanner_screen.dart
  │   └── dashboard_screen.dart
  ├── widgets/
  │   └── approval_card.dart
  └── utils/
      ├── constants.dart
      └── helpers.dart
  ```
- [ ] Configure Android permissions in `AndroidManifest.xml`:
  - Camera permission
  - Internet permission
  - Vibration permission
- [ ] Setup app icons and splash screen
- [ ] Test app runs on Android device/emulator

**Dependencies**:
```yaml
dependencies:
  flutter:
    sdk: flutter
  
  # State Management
  provider: ^6.1.1
  
  # HTTP & WebSocket
  dio: ^5.4.0
  web_socket_channel: ^2.4.0
  
  # QR Code
  mobile_scanner: ^3.5.5
  
  # Storage
  shared_preferences: ^2.2.2
  
  # Notifications
  flutter_local_notifications: ^16.3.0
  
  # UI
  google_fonts: ^6.1.0
  flutter_svg: ^2.0.9
  
  # Utils
  intl: ^0.18.1
  logger: ^2.0.2
```

---

### Task 1.2: Backend - QR Code Generator (Web Frontend)
**Priority**: High  
**Estimate**: 3 hours

**Acceptance Criteria**:
- [ ] Create QR Code component in web frontend
- [ ] QR Code contains JSON data:
  ```json
  {
    "apiUrl": "http://192.168.1.50:3001",
    "wsUrl": "ws://192.168.1.50:3001/ws",
    "deviceName": "Agent Malas Server",
    "timestamp": 1234567890
  }
  ```
- [ ] Auto-detect server IP address (local network)
- [ ] Display QR code in Settings page or modal
- [ ] Add "Connect Mobile App" button in web UI
- [ ] QR code updates when server IP changes
- [ ] Add instructions for mobile app setup

**Implementation**:
```typescript
// frontend/src/components/MobileQRCode.tsx
- Install: npm install qrcode.react
- Get local IP from backend API
- Generate QR with server info
- Display with instructions
```

**Files to Create**:
- `frontend/src/components/MobileQRCode.jsx`
- `frontend/src/hooks/useServerInfo.js`
- `src/routes/server-info.js` (backend endpoint)

---

### Task 1.3: Mobile - QR Scanner Screen
**Priority**: High  
**Estimate**: 4 hours

**Acceptance Criteria**:
- [ ] Create QR scanner screen with camera preview
- [ ] Scan QR code and parse JSON data
- [ ] Validate QR code format and data
- [ ] Test connection to API URL
- [ ] Save API config to local storage
- [ ] Show success/error feedback
- [ ] Handle camera permissions
- [ ] Add manual input option (fallback)
- [ ] Navigate to dashboard after successful scan

**Implementation Details**:
```dart
// lib/screens/qr_scanner_screen.dart
class QRScannerScreen extends StatefulWidget {
  // - Use mobile_scanner package
  // - Parse QR data
  // - Validate API URL
  // - Test connection
  // - Save to SharedPreferences
  // - Navigate to dashboard
}
```

**Edge Cases**:
- Invalid QR code format
- Network unreachable
- API URL not responding
- Camera permission denied
- Manual URL input validation

---

### Task 1.4: Mobile - Storage Service
**Priority**: High  
**Estimate**: 2 hours

**Acceptance Criteria**:
- [ ] Create `StorageService` class
- [ ] Save/load API configuration
- [ ] Save/load device info
- [ ] Save/load user preferences
- [ ] Clear storage on logout
- [ ] Encrypt sensitive data (optional)

**Implementation**:
```dart
// lib/services/storage_service.dart
class StorageService {
  Future<void> saveApiConfig(ApiConfig config);
  Future<ApiConfig?> getApiConfig();
  Future<void> saveDeviceInfo(String deviceId, String deviceName);
  Future<String?> getDeviceId();
  Future<void> clearAll();
}
```

---

## Sprint 2: API Integration & Authentication

### Task 2.1: Mobile - API Service
**Priority**: High  
**Estimate**: 4 hours

**Acceptance Criteria**:
- [ ] Create `ApiService` class with Dio
- [ ] Implement HTTP methods (GET, POST, PUT, DELETE)
- [ ] Add request/response interceptors
- [ ] Handle authentication headers
- [ ] Implement error handling
- [ ] Add retry logic for failed requests
- [ ] Add request timeout configuration
- [ ] Log all API calls (debug mode)

**API Endpoints to Implement**:
```dart
// Approval APIs
Future<List<Approval>> getPendingApprovals();
Future<void> approveTask(String taskId, String approvedBy);
Future<void> rejectTask(String taskId, String rejectedBy, String reason);

// Mobile Device APIs
Future<void> registerDevice(String deviceId, String deviceName);
Future<void> sendHeartbeat(String deviceId);
Future<ServerInfo> getServerInfo();

// Health Check
Future<bool> checkConnection();
```

**Error Handling**:
- Network timeout
- Server unreachable
- Invalid response
- Authentication failed
- Rate limiting

---

### Task 2.2: Mobile - WebSocket Service
**Priority**: High  
**Estimate**: 4 hours

**Acceptance Criteria**:
- [ ] Create `WebSocketService` class
- [ ] Connect to WebSocket server
- [ ] Handle connection lifecycle (connect, disconnect, reconnect)
- [ ] Listen for approval events
- [ ] Implement auto-reconnect on disconnect
- [ ] Handle connection errors
- [ ] Broadcast events to app
- [ ] Add connection status indicator

**WebSocket Events**:
```dart
// Listen for events
- approval:request  // New approval needed
- approval:response // Approval processed
- agent:status      // Agent status update
- task:start        // Task started
- task:done         // Task completed
- task:error        // Task failed
```

**Implementation**:
```dart
// lib/services/websocket_service.dart
class WebSocketService {
  Stream<dynamic> get eventStream;
  Future<void> connect(String wsUrl);
  void disconnect();
  bool get isConnected;
}
```

---

### Task 2.3: Mobile - Device Registration
**Priority**: Medium  
**Estimate**: 2 hours

**Acceptance Criteria**:
- [ ] Generate unique device ID
- [ ] Register device with backend on first launch
- [ ] Send device info (name, model, OS version)
- [ ] Send heartbeat every 30 seconds
- [ ] Update device info on app resume
- [ ] Handle registration errors

**Device Info to Send**:
```dart
{
  "deviceId": "uuid-v4",
  "deviceName": "Samsung Galaxy S21",
  "deviceModel": "SM-G991B",
  "osVersion": "Android 13",
  "appVersion": "1.0.0",
  "ipAddress": "192.168.1.100"
}
```

---

## Sprint 3: Dashboard & Approval UI

### Task 3.1: Mobile - Dashboard Screen
**Priority**: High  
**Estimate**: 6 hours

**Acceptance Criteria**:
- [ ] Create dashboard layout with AppBar
- [ ] Show connection status indicator
- [ ] Display pending approvals count
- [ ] Show agent status (running/idle/processing)
- [ ] Add refresh button
- [ ] Implement pull-to-refresh
- [ ] Show empty state when no approvals
- [ ] Add settings button
- [ ] Show last sync time

**Dashboard Sections**:
1. **Header**
   - App title
   - Connection status
   - Settings icon

2. **Status Card**
   - Agent status
   - Pending count
   - Last update time

3. **Approvals List**
   - Scrollable list
   - Pull to refresh
   - Empty state

**UI Design**:
- Material Design 3
- Premium card design
- Gradient accents
- Smooth animations

---

### Task 3.2: Mobile - Approval Card Widget
**Priority**: High  
**Estimate**: 4 hours

**Acceptance Criteria**:
- [ ] Create `ApprovalCard` widget
- [ ] Display approval information:
  - Title
  - Description
  - Task info
  - Repository
  - Timestamp
  - Type (issue/pr_rejected)
- [ ] Add Approve/Reject buttons
- [ ] Show loading state during processing
- [ ] Add swipe actions (optional)
- [ ] Implement card animations
- [ ] Add gradient accent based on type

**Card Design**:
```dart
ApprovalCard(
  approval: approval,
  onApprove: () => handleApprove(approval.taskId),
  onReject: () => handleReject(approval.taskId),
  isProcessing: processingId == approval.id,
)
```

**Features**:
- Gradient top border
- Icon badge (issue/PR)
- Expandable description
- Action buttons
- Processing indicator

---

### Task 3.3: Mobile - Approval Actions
**Priority**: High  
**Estimate**: 3 hours

**Acceptance Criteria**:
- [ ] Implement approve action
- [ ] Implement reject action with reason dialog
- [ ] Show confirmation dialog
- [ ] Display success/error snackbar
- [ ] Update UI after action
- [ ] Handle API errors gracefully
- [ ] Add haptic feedback
- [ ] Disable buttons during processing

**Approve Flow**:
1. User taps Approve button
2. Show confirmation dialog (optional)
3. Call API to approve
4. Show loading indicator
5. Display success message
6. Remove card from list
7. Play haptic feedback

**Reject Flow**:
1. User taps Reject button
2. Show reason input dialog
3. Call API to reject with reason
4. Show loading indicator
5. Display success message
6. Remove card from list
7. Play haptic feedback

---

## Sprint 4: Notifications & Real-time Updates

### Task 4.1: Mobile - Push Notifications Setup
**Priority**: High  
**Estimate**: 4 hours

**Acceptance Criteria**:
- [ ] Setup `flutter_local_notifications`
- [ ] Configure Android notification channels
- [ ] Request notification permissions
- [ ] Show notification when app in background
- [ ] Show notification when app closed
- [ ] Add notification sound
- [ ] Add notification icon
- [ ] Handle notification tap (open app)
- [ ] Add notification actions (Approve/Reject)

**Notification Types**:
1. **New Approval Request**
   - Title: "🔔 New Task Approval Required"
   - Body: Task title
   - Actions: Approve, Reject, View

2. **Approval Processed**
   - Title: "✅ Task Approved" / "❌ Task Rejected"
   - Body: Task title

---

### Task 4.2: Mobile - Real-time Updates
**Priority**: High  
**Estimate**: 3 hours

**Acceptance Criteria**:
- [ ] Listen to WebSocket events
- [ ] Update UI when new approval arrives
- [ ] Show notification for new approval
- [ ] Play notification sound
- [ ] Update badge count
- [ ] Refresh list automatically
- [ ] Show connection status
- [ ] Handle reconnection

**WebSocket Integration**:
```dart
// Listen to approval:request event
websocketService.eventStream.listen((event) {
  if (event.type == 'approval:request') {
    // Update UI
    // Show notification
    // Play sound
  }
});
```

---

### Task 4.3: Mobile - Notification Sound & Vibration
**Priority**: Medium  
**Estimate**: 2 hours

**Acceptance Criteria**:
- [ ] Add notification sound asset
- [ ] Play sound on new approval
- [ ] Add vibration pattern
- [ ] Respect system settings
- [ ] Add sound toggle in settings
- [ ] Test on different Android versions

---

## Sprint 5: Settings & Polish

### Task 5.1: Mobile - Settings Screen
**Priority**: Medium  
**Estimate**: 4 hours

**Acceptance Criteria**:
- [ ] Create settings screen
- [ ] Show current API URL
- [ ] Add "Scan New QR Code" button
- [ ] Show device info
- [ ] Add notification settings toggle
- [ ] Add sound settings toggle
- [ ] Add vibration settings toggle
- [ ] Add "Disconnect" button
- [ ] Show app version
- [ ] Add about section

**Settings Options**:
- Server URL (read-only, with rescan option)
- Device Name
- Notifications (on/off)
- Sound (on/off)
- Vibration (on/off)
- Theme (light/dark) - optional
- About & Version

---

### Task 5.2: Mobile - Error Handling & Offline Mode
**Priority**: Medium  
**Estimate**: 3 hours

**Acceptance Criteria**:
- [ ] Show error messages for API failures
- [ ] Handle network disconnection
- [ ] Show offline indicator
- [ ] Cache last known state
- [ ] Retry failed requests
- [ ] Show connection lost dialog
- [ ] Auto-reconnect when online
- [ ] Queue actions when offline (optional)

---

### Task 5.3: Mobile - UI Polish & Animations
**Priority**: Low  
**Estimate**: 4 hours

**Acceptance Criteria**:
- [ ] Add loading animations
- [ ] Add card animations (slide in)
- [ ] Add button press animations
- [ ] Add pull-to-refresh animation
- [ ] Add empty state illustration
- [ ] Add success/error animations
- [ ] Polish color scheme
- [ ] Add gradient backgrounds
- [ ] Improve typography
- [ ] Add micro-interactions

---

## Sprint 6: Testing & Build

### Task 6.1: Unit Tests
**Priority**: Medium  
**Estimate**: 4 hours

**Acceptance Criteria**:
- [ ] Write tests for `ApiService`
- [ ] Write tests for `WebSocketService`
- [ ] Write tests for `StorageService`
- [ ] Write tests for models
- [ ] Write tests for utilities
- [ ] Achieve >70% code coverage

---

### Task 6.2: Integration Tests
**Priority**: Medium  
**Estimate**: 3 hours

**Acceptance Criteria**:
- [ ] Test QR scanner flow
- [ ] Test approval flow
- [ ] Test WebSocket connection
- [ ] Test offline mode
- [ ] Test notification handling

---

### Task 6.3: Build & Release
**Priority**: High  
**Estimate**: 4 hours

**Acceptance Criteria**:
- [ ] Configure app signing
- [ ] Generate release keystore
- [ ] Update `build.gradle` for release
- [ ] Build APK: `flutter build apk --release`
- [ ] Build App Bundle: `flutter build appbundle --release`
- [ ] Test release build on device
- [ ] Create release notes
- [ ] Document installation steps

**Build Commands**:
```bash
# Debug APK
flutter build apk --debug

# Release APK
flutter build apk --release

# Release App Bundle (for Play Store)
flutter build appbundle --release

# Install on device
flutter install
```

---

## Additional Features (Future Sprints)

### Task 7.1: Biometric Authentication
- [ ] Add fingerprint authentication
- [ ] Add face unlock
- [ ] Secure storage for credentials

### Task 7.2: Multi-Server Support
- [ ] Support multiple server connections
- [ ] Switch between servers
- [ ] Manage server list

### Task 7.3: Dark Mode
- [ ] Implement dark theme
-