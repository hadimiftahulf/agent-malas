# Design Document: Mobile App Sprint 1 - Setup & QR Code Integration

## Overview

This design document specifies the technical architecture and implementation details for Sprint 1 of the Agent Malas Mobile App. The sprint establishes the foundation for a Flutter-based Android application that enables users to approve or reject Agent Malas tasks from their smartphones.

The core functionality centers on seamless server discovery through QR code scanning, eliminating manual IP address configuration. The web frontend generates a QR code containing server connection details (API URL, WebSocket URL, device name), which the mobile app scans to automatically configure itself. Once configured, the app persists the connection details locally, enabling automatic reconnection on subsequent launches.

### Key Features

- Flutter 3.x Android application with Material Design 3
- QR code-based server discovery and configuration
- Persistent configuration storage using SharedPreferences
- Connection validation before saving configuration
- Manual configuration fallback option
- Camera permission handling with user guidance
- Splash screen and initialization flow
- Backend server information endpoint for QR generation
- Web frontend QR code generator component

### Technology Stack

**Mobile App (Flutter)**
- Framework: Flutter 3.x
- State Management: Provider
- HTTP Client: dio
- WebSocket: web_socket_channel
- QR Scanner: mobile_scanner
- Storage: shared_preferences
- Notifications: flutter_local_notifications
- UI: google_fonts, Material Design 3

**Web Frontend (React)**
- QR Generation: qrcode.react
- HTTP Client: fetch API
- State Management: React hooks

**Backend (Node.js)**
- Framework: Express.js
- Database: SQLite (better-sqlite3)
- WebSocket: ws


## Architecture

### High-Level System Architecture

```
┌─────────────────────────────────────────────────────────────────┐
│                     Mobile App (Flutter)                        │
│                                                                 │
│  ┌──────────────────┐         ┌──────────────────┐            │
│  │  Splash Screen   │────────▶│  QR Scanner      │            │
│  │  (Init Check)    │         │  Screen          │            │
│  └──────────────────┘         └──────────────────┘            │
│           │                            │                        │
│           │ Config exists?             │ Scan QR               │
│           ▼                            ▼                        │
│  ┌──────────────────┐         ┌──────────────────┐            │
│  │  Dashboard       │◀────────│  Manual Setup    │            │
│  │  Screen          │         │  (Fallback)      │            │
│  └──────────────────┘         └──────────────────┘            │
│           │                            │                        │
│           └────────────────┬───────────┘                        │
│                            ▼                                    │
│                   ┌─────────────────┐                          │
│                   │ Storage Service │                          │
│                   │ (SharedPrefs)   │                          │
│                   └─────────────────┘                          │
│                            │                                    │
│                   ┌─────────────────┐                          │
│                   │   API Service   │                          │
│                   │  (HTTP + WS)    │                          │
│                   └─────────────────┘                          │
└─────────────────────────────┼───────────────────────────────────┘
                              │
                              │ HTTP/WebSocket
                              ▼
┌─────────────────────────────────────────────────────────────────┐
│                    Backend Server (Node.js)                     │
│                                                                 │
│  ┌──────────────────┐  ┌──────────────────┐  ┌──────────────┐ │
│  │  /api/server-info│  │  /api/approval/* │  │  WebSocket   │ │
│  │  (New Endpoint)  │  │  (Existing)      │  │  /ws         │ │
│  └──────────────────┘  └──────────────────┘  └──────────────┘ │
│           │                     │                     │         │
│           └─────────────────────┼─────────────────────┘         │
│                                 ▼                               │
│                        ┌─────────────────┐                     │
│                        │  SQLite Database│                     │
│                        │  (agent-malas.db)│                    │
│                        └─────────────────┘                     │
└─────────────────────────────────────────────────────────────────┘
                              ▲
                              │
┌─────────────────────────────┼───────────────────────────────────┐
│                    Web Frontend (React)                         │
│                                                                 │
│  ┌──────────────────┐         ┌──────────────────┐            │
│  │  Header          │────────▶│  QR Code Modal   │            │
│  │  (Connect Button)│         │  (New Component) │            │
│  └──────────────────┘         └──────────────────┘            │
│                                        │                        │
│                                        ▼                        │
│                               ┌─────────────────┐              │
│                               │ useServerInfo   │              │
│                               │ (New Hook)      │              │
│                               └─────────────────┘              │
└─────────────────────────────────────────────────────────────────┘
```

### Mobile App Architecture

The Flutter app follows a layered architecture pattern:

**Presentation Layer**
- Screens: UI components for different app states
- Widgets: Reusable UI components
- Theme: Centralized styling and branding

**Business Logic Layer**
- State Management: Provider for reactive state
- Models: Data structures and business entities

**Data Layer**
- Services: API communication, WebSocket, Storage
- Utils: Helper functions and constants

### Data Flow

1. **Initial Launch Flow**
   - App starts → Splash screen displays
   - Storage service checks for existing API config
   - If config exists → Navigate to dashboard
   - If no config → Navigate to QR scanner

2. **QR Code Setup Flow**
   - User opens web frontend
   - Clicks "Connect Mobile App" button
   - Frontend fetches server info from `/api/server-info`
   - QR code generated with API config JSON
   - Mobile app scans QR code
   - Parses JSON and validates structure
   - Tests connection to API URL
   - Saves config to SharedPreferences
   - Navigates to dashboard

3. **Manual Setup Flow**
   - User clicks "Manual Setup" on scanner screen
   - Enters API URL and WebSocket URL
   - App validates URL format
   - Tests connection to API URL
   - Saves config to SharedPreferences
   - Navigates to dashboard


## Components and Interfaces

### Mobile App Components

#### 1. Screens

**SplashScreen** (`lib/screens/splash_screen.dart`)
- Purpose: Display app logo during initialization
- Responsibilities:
  - Show splash screen with app branding
  - Check for existing API configuration
  - Navigate to appropriate screen based on config state
- State: Loading indicator
- Navigation:
  - If config exists → DashboardScreen
  - If no config → QRScannerScreen

**QRScannerScreen** (`lib/screens/qr_scanner_screen.dart`)
- Purpose: Scan QR codes and configure server connection
- Responsibilities:
  - Request camera permissions
  - Display camera preview for QR scanning
  - Parse and validate QR code data
  - Test connection to server
  - Save configuration
  - Provide manual setup fallback
- State:
  - Camera permission status
  - Scanning state (idle, scanning, processing)
  - Error messages
  - Loading indicator during connection test
- UI Elements:
  - Camera preview with scan overlay
  - "Manual Setup" button
  - Error message display
  - Loading indicator
  - Success feedback

**ManualSetupScreen** (`lib/screens/manual_setup_screen.dart`)
- Purpose: Allow manual entry of server connection details
- Responsibilities:
  - Display input fields for API URL and WebSocket URL
  - Validate URL formats
  - Test connection to server
  - Save configuration
- State:
  - Form input values
  - Validation errors
  - Loading state during connection test
- UI Elements:
  - Text input for API URL
  - Text input for WebSocket URL
  - "Connect" button
  - Validation error messages
  - Loading indicator

**DashboardScreen** (`lib/screens/dashboard_screen.dart`)
- Purpose: Main screen after successful configuration (placeholder for Sprint 1)
- Responsibilities:
  - Display connection status
  - Show placeholder for future approval features
  - Provide access to settings
- State:
  - Connection status
- UI Elements:
  - App bar with title and settings icon
  - Connection status indicator
  - Placeholder content

#### 2. Services

**StorageService** (`lib/services/storage_service.dart`)
- Purpose: Persist and retrieve configuration data
- Dependencies: shared_preferences package
- Interface:
```dart
class StorageService {
  static const String _configKey = 'api_config';
  
  // Save API configuration
  Future<void> saveApiConfig(ApiConfig config);
  
  // Load API configuration
  Future<ApiConfig?> getApiConfig();
  
  // Clear all stored data
  Future<void> clearAll();
  
  // Check if config exists
  Future<bool> hasConfig();
}
```

**ApiService** (`lib/services/api_service.dart`)
- Purpose: Handle HTTP communication with backend
- Dependencies: dio package
- Interface:
```dart
class ApiService {
  final Dio _dio;
  final String baseUrl;
  
  ApiService(this.baseUrl);
  
  // Test connection to server
  Future<bool> testConnection();
  
  // Get server information
  Future<ServerInfo> getServerInfo();
  
  // Future: Approval-related methods
  // Future<List<Approval>> getPendingApprovals();
  // Future<void> approveTask(String taskId, String approvedBy);
  // Future<void> rejectTask(String taskId, String rejectedBy, String reason);
}
```

**WebSocketService** (`lib/services/websocket_service.dart`)
- Purpose: Manage WebSocket connection (placeholder for Sprint 1)
- Dependencies: web_socket_channel package
- Interface:
```dart
class WebSocketService {
  IOWebSocketChannel? _channel;
  final String wsUrl;
  
  WebSocketService(this.wsUrl);
  
  // Connect to WebSocket server
  Future<void> connect();
  
  // Disconnect from server
  void disconnect();
  
  // Check connection status
  bool get isConnected;
  
  // Event stream (for future use)
  Stream<dynamic> get eventStream;
}
```

#### 3. Models

**ApiConfig** (`lib/models/api_config.dart`)
```dart
class ApiConfig {
  final String apiUrl;
  final String wsUrl;
  final String deviceName;
  final int timestamp;
  
  ApiConfig({
    required this.apiUrl,
    required this.wsUrl,
    required this.deviceName,
    required this.timestamp,
  });
  
  // Convert to JSON for storage
  Map<String, dynamic> toJson();
  
  // Create from JSON
  factory ApiConfig.fromJson(Map<String, dynamic> json);
  
  // Validate required fields
  bool isValid();
}
```

**ServerInfo** (`lib/models/server_info.dart`)
```dart
class ServerInfo {
  final String ipAddress;
  final int port;
  final int timestamp;
  
  ServerInfo({
    required this.ipAddress,
    required this.port,
    required this.timestamp,
  });
  
  factory ServerInfo.fromJson(Map<String, dynamic> json);
  Map<String, dynamic> toJson();
}
```

#### 4. Configuration

**AppConfig** (`lib/config/app_config.dart`)
```dart
class AppConfig {
  static const String appName = 'Agent Malas Mobile';
  static const String appVersion = '1.0.0';
  static const int connectionTimeout = 5000; // milliseconds
  static const int maxRetries = 3;
}
```

**ThemeConfig** (`lib/config/theme.dart`)
```dart
class AppTheme {
  static ThemeData lightTheme = ThemeData(
    useMaterial3: true,
    colorScheme: ColorScheme.fromSeed(
      seedColor: Colors.blue,
      brightness: Brightness.light,
    ),
    textTheme: GoogleFonts.interTextTheme(),
  );
  
  static ThemeData darkTheme = ThemeData(
    useMaterial3: true,
    colorScheme: ColorScheme.fromSeed(
      seedColor: Colors.blue,
      brightness: Brightness.dark,
    ),
    textTheme: GoogleFonts.interTextTheme(),
  );
}
```


### Web Frontend Components

#### QRCodeModal Component (`frontend/src/components/QRCodeModal.jsx`)

Purpose: Display QR code for mobile app setup

```jsx
import { useState, useEffect } from 'react';
import QRCode from 'qrcode.react';
import { useServerInfo } from '../hooks/useServerInfo';

export function QRCodeModal({ isOpen, onClose }) {
  const { serverInfo, loading, error, refresh } = useServerInfo();
  
  // Auto-refresh every 30 seconds
  useEffect(() => {
    if (isOpen) {
      const interval = setInterval(refresh, 30000);
      return () => clearInterval(interval);
    }
  }, [isOpen, refresh]);
  
  const qrData = serverInfo ? JSON.stringify({
    apiUrl: `http://${serverInfo.ipAddress}:${serverInfo.port}`,
    wsUrl: `ws://${serverInfo.ipAddress}:${serverInfo.port}/ws`,
    deviceName: 'Agent Malas Server',
    timestamp: serverInfo.timestamp
  }) : null;
  
  return (
    // Modal UI with QR code display
  );
}
```

Responsibilities:
- Fetch server information from backend
- Generate QR code with API configuration
- Auto-refresh QR code every 30 seconds
- Display server IP and port as text
- Provide close button

State:
- Server information (IP, port, timestamp)
- Loading state
- Error state

#### useServerInfo Hook (`frontend/src/hooks/useServerInfo.js`)

Purpose: Fetch and manage server information

```javascript
import { useState, useEffect, useCallback } from 'react';

export function useServerInfo() {
  const [serverInfo, setServerInfo] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  
  const fetchServerInfo = useCallback(async () => {
    try {
      setLoading(true);
      const response = await fetch('/api/server-info');
      if (!response.ok) throw new Error('Failed to fetch server info');
      const data = await response.json();
      setServerInfo(data);
      setError(null);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }, []);
  
  useEffect(() => {
    fetchServerInfo();
  }, [fetchServerInfo]);
  
  return {
    serverInfo,
    loading,
    error,
    refresh: fetchServerInfo
  };
}
```

#### Header Component Update (`frontend/src/components/Header.jsx`)

Add "Connect Mobile App" button to existing header:

```jsx
import { useState } from 'react';
import { QRCodeModal } from './QRCodeModal';

export function Header() {
  const [showQRModal, setShowQRModal] = useState(false);
  
  return (
    <header>
      {/* Existing header content */}
      <button onClick={() => setShowQRModal(true)}>
        📱 Connect Mobile App
      </button>
      
      <QRCodeModal 
        isOpen={showQRModal} 
        onClose={() => setShowQRModal(false)} 
      />
    </header>
  );
}
```

### Backend Components

#### Server Info Route (`src/routes/server-info.js`)

Purpose: Provide server network information for QR code generation

```javascript
import express from 'express';
import os from 'os';
import { logger } from '../logger.js';

const router = express.Router();

/**
 * GET /api/server-info
 * Returns server IP address and port for QR code generation
 */
router.get('/', (req, res) => {
  try {
    const ipAddress = getLocalIPAddress();
    const port = process.env.PORT || 3001;
    
    res.json({
      success: true,
      ipAddress,
      port,
      timestamp: Date.now()
    });
  } catch (error) {
    logger.error(`Error getting server info: ${error.message}`);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

/**
 * Get local network IP address (not localhost)
 * Prioritizes 192.168.x.x and 10.x.x.x ranges
 */
function getLocalIPAddress() {
  const interfaces = os.networkInterfaces();
  
  // Priority order: 192.168.x.x > 10.x.x.x > others
  const priorities = [
    (ip) => ip.startsWith('192.168.'),
    (ip) => ip.startsWith('10.'),
    (ip) => !ip.startsWith('127.') && !ip.startsWith('169.254.')
  ];
  
  for (const priority of priorities) {
    for (const name of Object.keys(interfaces)) {
      for (const iface of interfaces[name]) {
        if (iface.family === 'IPv4' && !iface.internal && priority(iface.address)) {
          return iface.address;
        }
      }
    }
  }
  
  // Fallback to localhost if no network interface found
  return '127.0.0.1';
}

export default router;
```

Responsibilities:
- Detect local network IP address
- Return IP, port, and timestamp
- Handle errors gracefully
- Prioritize appropriate network interfaces

#### Server Integration (`src/server.js`)

Add server-info route to existing Express app:

```javascript
import serverInfoRouter from './routes/server-info.js';

// Add to existing routes
app.use('/api/server-info', serverInfoRouter);
```


## Data Models

### API Configuration Schema

The API configuration is the core data structure exchanged between web frontend and mobile app via QR code.

**JSON Schema:**
```json
{
  "apiUrl": "http://192.168.1.50:3001",
  "wsUrl": "ws://192.168.1.50:3001/ws",
  "deviceName": "Agent Malas Server",
  "timestamp": 1704067200000
}
```

**Field Specifications:**

| Field | Type | Required | Description | Validation |
|-------|------|----------|-------------|------------|
| apiUrl | string | Yes | HTTP endpoint for REST API | Must be valid HTTP/HTTPS URL |
| wsUrl | string | Yes | WebSocket endpoint | Must be valid WS/WSS URL |
| deviceName | string | Yes | Human-readable server name | Non-empty string |
| timestamp | integer | Yes | Unix timestamp (milliseconds) | Positive integer |

**Validation Rules:**
- All fields must be present
- URLs must be properly formatted
- apiUrl must start with `http://` or `https://`
- wsUrl must start with `ws://` or `wss://`
- deviceName must not be empty or whitespace-only
- timestamp must be a positive integer

### Server Information Schema

Backend response from `/api/server-info` endpoint.

**JSON Schema:**
```json
{
  "success": true,
  "ipAddress": "192.168.1.50",
  "port": 3001,
  "timestamp": 1704067200000
}
```

**Field Specifications:**

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| success | boolean | Yes | Request success status |
| ipAddress | string | Yes | Server's local network IP |
| port | integer | Yes | Server's HTTP port |
| timestamp | integer | Yes | Unix timestamp (milliseconds) |

### Mobile Device Registration Schema

Data structure for registering mobile devices with backend (future use).

**Database Schema (mobile_devices table):**
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

**API Request Schema:**
```json
{
  "deviceId": "uuid-v4-string",
  "deviceName": "Samsung Galaxy S21",
  "ipAddress": "192.168.1.100"
}
```

### SharedPreferences Storage Schema

Mobile app stores configuration in SharedPreferences as JSON string.

**Storage Key:** `api_config`

**Stored Value:**
```json
{
  "apiUrl": "http://192.168.1.50:3001",
  "wsUrl": "ws://192.168.1.50:3001/ws",
  "deviceName": "Agent Malas Server",
  "timestamp": 1704067200000
}
```

### Error Response Schema

Standard error response format for API endpoints.

```json
{
  "success": false,
  "error": "Error message description"
}
```

## State Management

### Mobile App State Management

The mobile app uses Provider for state management with the following state structure:

**AppState** (Global application state)
```dart
class AppState extends ChangeNotifier {
  ApiConfig? _apiConfig;
  bool _isLoading = false;
  String? _errorMessage;
  
  ApiConfig? get apiConfig => _apiConfig;
  bool get isLoading => _isLoading;
  String? get errorMessage => _errorMessage;
  bool get isConfigured => _apiConfig != null;
  
  // Load configuration from storage
  Future<void> loadConfig();
  
  // Save configuration
  Future<void> saveConfig(ApiConfig config);
  
  // Clear configuration
  Future<void> clearConfig();
  
  // Set loading state
  void setLoading(bool loading);
  
  // Set error message
  void setError(String? message);
}
```

**Provider Setup** (`lib/main.dart`)
```dart
void main() {
  runApp(
    ChangeNotifierProvider(
      create: (_) => AppState(),
      child: const MyApp(),
    ),
  );
}
```

**State Access in Widgets**
```dart
// Read state
final appState = context.watch<AppState>();
final isConfigured = appState.isConfigured;

// Trigger actions
context.read<AppState>().saveConfig(config);
```

### Web Frontend State Management

The web frontend uses React hooks for local component state:

**QRCodeModal State**
- serverInfo: Server information object
- loading: Boolean loading indicator
- error: Error message string
- isOpen: Modal visibility boolean

**useServerInfo Hook State**
- serverInfo: Cached server information
- loading: Fetch in progress
- error: Error message
- Auto-refresh mechanism with 30-second interval


## Correctness Properties

*A property is a characteristic or behavior that should hold true across all valid executions of a system—essentially, a formal statement about what the system should do. Properties serve as the bridge between human-readable specifications and machine-verifiable correctness guarantees.*

### Property Reflection

After analyzing all acceptance criteria, I identified the following testable properties. I then performed a reflection to eliminate redundancy:

**Redundancy Analysis:**
- Properties 2.1 and 2.2 (QR code contains JSON, API_Config has required fields) can be combined into a single property about QR code generation producing valid, complete API_Config
- Properties 3.3 and 3.4 (invalid JSON error, missing fields error) both test validation and can be combined into a comprehensive validation property
- Properties 5.3 and 5.4 (URL validation, invalid URL error) are testing the same validation logic and can be combined
- Properties 8.3 and 8.4 (successful connection, failed connection) are complementary but test different aspects and should remain separate
- Property 6.2 (storage round-trip) subsumes the need to test save and load separately

**Final Property Set:**
After reflection, I identified 11 unique, non-redundant properties that provide comprehensive coverage of the testable requirements.

### Property 1: QR Code Generation Produces Valid API Config

*For any* server information (IP address and port), when the QR generator creates a QR code, the encoded JSON string should be parseable into a valid API_Config object containing all required fields (apiUrl, wsUrl, deviceName, timestamp).

**Validates: Requirements 2.1, 2.2**

### Property 2: Local IP Detection Excludes Localhost

*For any* network configuration, when the backend detects the local IP address, the detected IP should not be localhost (127.0.0.1 or ::1) and should be a valid IPv4 address.

**Validates: Requirements 2.3, 10.4**

### Property 3: Server Info Endpoint Returns Complete Data

*For any* GET request to `/api/server-info`, the response should be valid JSON containing all required fields (success, ipAddress, port, timestamp) with correct types.

**Validates: Requirements 2.6, 10.2, 10.3**

### Property 4: API Config Serialization Round Trip

*For any* valid API_Config object, serializing it to JSON and then deserializing back should produce an equivalent API_Config object with all fields preserved.

**Validates: Requirements 3.2**

### Property 5: API Config Validation Rejects Invalid Data

*For any* JSON object that is either not valid JSON or missing required fields (apiUrl, wsUrl, deviceName, timestamp), the validation function should return false or throw an appropriate error.

**Validates: Requirements 3.3, 3.4**

### Property 6: URL Format Validation

*For any* string input, the URL validation function should correctly identify whether it is a properly formatted HTTP/HTTPS URL (for API URL) or WS/WSS URL (for WebSocket URL), rejecting malformed URLs.

**Validates: Requirements 5.3, 5.4**

### Property 7: Storage Service Round Trip

*For any* valid API_Config object, saving it to storage and then loading it back should return an equivalent API_Config object with all fields preserved.

**Validates: Requirements 6.2**

### Property 8: Connection Test Success Recognition

*For any* HTTP response with status code in the 2xx range (200-299), the connection test function should return true (connection valid).

**Validates: Requirements 8.3**

### Property 9: Connection Test Failure Recognition

*For any* HTTP response with status code outside the 2xx range, timeout, or network error, the connection test function should return false (connection invalid).

**Validates: Requirements 8.4**

### Property 10: QR Code Data Integrity

*For any* API_Config object, if we generate a QR code from it and then scan and parse that QR code, we should get back an equivalent API_Config object (end-to-end round trip).

**Validates: Requirements 2.1, 3.2**

**Note:** This is a comprehensive integration property that validates the entire QR code generation and scanning pipeline.

### Property 11: Empty Storage Returns Null

*When* no API_Config exists in storage (fresh install or after clear), the load method should return null rather than throwing an error or returning invalid data.

**Validates: Requirements 6.3**

**Note:** This is an edge case property ensuring graceful handling of empty storage.


## Error Handling

### Error Categories

The mobile app and backend must handle several categories of errors gracefully:

#### 1. Network Errors

**Scenarios:**
- No internet connection
- Server unreachable
- Request timeout
- DNS resolution failure

**Handling Strategy:**
- Display user-friendly error messages
- Provide retry mechanism
- Suggest checking network connection
- Log errors for debugging

**Mobile App Implementation:**
```dart
try {
  final response = await dio.get(url);
  return response.data;
} on DioException catch (e) {
  if (e.type == DioExceptionType.connectionTimeout) {
    throw NetworkException('Connection timeout. Please check your network.');
  } else if (e.type == DioExceptionType.receiveTimeout) {
    throw NetworkException('Server not responding. Please try again.');
  } else if (e.type == DioExceptionType.connectionError) {
    throw NetworkException('Cannot reach server. Check your connection.');
  } else {
    throw NetworkException('Network error: ${e.message}');
  }
}
```

#### 2. Validation Errors

**Scenarios:**
- Invalid QR code format
- Missing required fields in API_Config
- Malformed URLs
- Invalid JSON

**Handling Strategy:**
- Validate data before processing
- Display specific error messages
- Provide guidance for correction
- Prevent invalid data from being saved

**Mobile App Implementation:**
```dart
class ApiConfigValidator {
  static ValidationResult validate(Map<String, dynamic> json) {
    final errors = <String>[];
    
    if (!json.containsKey('apiUrl')) {
      errors.add('Missing API URL');
    } else if (!_isValidHttpUrl(json['apiUrl'])) {
      errors.add('Invalid API URL format');
    }
    
    if (!json.containsKey('wsUrl')) {
      errors.add('Missing WebSocket URL');
    } else if (!_isValidWsUrl(json['wsUrl'])) {
      errors.add('Invalid WebSocket URL format');
    }
    
    if (!json.containsKey('deviceName') || json['deviceName'].toString().trim().isEmpty) {
      errors.add('Missing device name');
    }
    
    if (!json.containsKey('timestamp')) {
      errors.add('Missing timestamp');
    }
    
    return ValidationResult(
      isValid: errors.isEmpty,
      errors: errors,
    );
  }
}
```

#### 3. Permission Errors

**Scenarios:**
- Camera permission denied
- Camera permission permanently denied
- Camera not available

**Handling Strategy:**
- Request permissions with clear explanation
- Provide fallback options (manual setup)
- Guide users to app settings if needed
- Handle permission denial gracefully

**Mobile App Implementation:**
```dart
Future<bool> requestCameraPermission() async {
  final status = await Permission.camera.request();
  
  if (status.isGranted) {
    return true;
  } else if (status.isPermanentlyDenied) {
    // Show dialog to open settings
    showPermissionDialog(
      'Camera access is required to scan QR codes. '
      'Please enable it in app settings.',
      canOpenSettings: true,
    );
    return false;
  } else {
    showPermissionDialog(
      'Camera access is required to scan QR codes. '
      'You can use manual setup as an alternative.',
      canOpenSettings: false,
    );
    return false;
  }
}
```

#### 4. Storage Errors

**Scenarios:**
- Storage write failure
- Storage read failure
- Corrupted data in storage
- Storage quota exceeded

**Handling Strategy:**
- Catch storage exceptions
- Provide fallback behavior
- Clear corrupted data
- Log errors for debugging

**Mobile App Implementation:**
```dart
Future<ApiConfig?> loadConfig() async {
  try {
    final prefs = await SharedPreferences.getInstance();
    final jsonString = prefs.getString(_configKey);
    
    if (jsonString == null) {
      return null;
    }
    
    final json = jsonDecode(jsonString);
    return ApiConfig.fromJson(json);
  } on FormatException catch (e) {
    logger.error('Corrupted config data: $e');
    // Clear corrupted data
    await clearConfig();
    return null;
  } catch (e) {
    logger.error('Failed to load config: $e');
    return null;
  }
}
```

#### 5. Backend Errors

**Scenarios:**
- Server internal error (5xx)
- Invalid request (4xx)
- Service unavailable
- Rate limiting

**Handling Strategy:**
- Parse error responses
- Display appropriate messages
- Implement retry logic for transient errors
- Log errors for monitoring

**Backend Implementation:**
```javascript
// Error handling middleware
app.use((err, req, res, next) => {
  logger.error(`Error: ${err.message}`, { stack: err.stack });
  
  res.status(err.status || 500).json({
    success: false,
    error: err.message || 'Internal server error',
    ...(process.env.NODE_ENV === 'development' && { stack: err.stack })
  });
});

// Route-specific error handling
router.get('/server-info', (req, res) => {
  try {
    const ipAddress = getLocalIPAddress();
    const port = process.env.PORT || 3001;
    
    if (!ipAddress) {
      throw new Error('Could not detect local IP address');
    }
    
    res.json({
      success: true,
      ipAddress,
      port,
      timestamp: Date.now()
    });
  } catch (error) {
    logger.error(`Server info error: ${error.message}`);
    res.status(500).json({
      success: false,
      error: 'Failed to retrieve server information'
    });
  }
});
```

### Error Message Guidelines

**Principles:**
1. Be specific about what went wrong
2. Provide actionable guidance
3. Use plain language, avoid technical jargon
4. Include context when helpful
5. Offer alternatives when possible

**Examples:**

| Scenario | Bad Message | Good Message |
|----------|-------------|--------------|
| Invalid QR code | "Error parsing QR" | "Invalid QR code format. Please scan the QR code from the web interface." |
| Network error | "Request failed" | "Cannot reach server. Please check your network connection and try again." |
| Permission denied | "Permission error" | "Camera access required to scan QR codes. You can use manual setup as an alternative." |
| Invalid URL | "Invalid input" | "Invalid URL format. Please enter a valid HTTP or HTTPS address." |
| Server unreachable | "Connection failed" | "Cannot reach server at http://192.168.1.50:3001. Please verify the server is running and on the same network." |

### Error Recovery Strategies

**Automatic Recovery:**
- Retry transient network errors (with exponential backoff)
- Clear corrupted storage data
- Fallback to default values when appropriate

**User-Initiated Recovery:**
- Provide "Retry" buttons for failed operations
- Offer "Manual Setup" as fallback for QR scanning
- Include "Open Settings" for permission issues
- Allow configuration reset in settings

**Graceful Degradation:**
- Continue with cached data if network unavailable
- Disable features that require unavailable permissions
- Show placeholder content during loading/errors


## Testing Strategy

### Dual Testing Approach

This project requires both unit tests and property-based tests to ensure comprehensive coverage:

**Unit Tests:** Verify specific examples, edge cases, error conditions, and integration points
**Property Tests:** Verify universal properties across all inputs through randomization

Both testing approaches are complementary and necessary. Unit tests catch concrete bugs in specific scenarios, while property tests verify general correctness across a wide range of inputs.

### Property-Based Testing

#### Framework Selection

**Mobile App (Flutter/Dart):**
- Library: `test` package with custom property-based testing utilities
- Alternative: `faker` for generating random test data
- Minimum iterations: 100 per property test

**Backend (Node.js):**
- Library: `fast-check` (JavaScript property-based testing)
- Minimum iterations: 100 per property test

**Web Frontend (React/JavaScript):**
- Library: `fast-check` with Jest
- Minimum iterations: 100 per property test

#### Property Test Implementation

Each correctness property must be implemented as a property-based test with appropriate generators:

**Example: Property 4 - API Config Serialization Round Trip**

```dart
// test/models/api_config_test.dart
import 'package:test/test.dart';
import 'package:agent_malas_mobile/models/api_config.dart';

void main() {
  group('ApiConfig Property Tests', () {
    test('Property 4: Serialization round trip preserves data', () {
      // Feature: mobile-app-sprint-1-setup-qr
      // Property 4: For any valid API_Config object, serializing to JSON 
      // and deserializing back should produce an equivalent object
      
      for (int i = 0; i < 100; i++) {
        // Generate random API config
        final original = generateRandomApiConfig();
        
        // Round trip: object -> JSON -> object
        final json = original.toJson();
        final deserialized = ApiConfig.fromJson(json);
        
        // Verify equivalence
        expect(deserialized.apiUrl, equals(original.apiUrl));
        expect(deserialized.wsUrl, equals(original.wsUrl));
        expect(deserialized.deviceName, equals(original.deviceName));
        expect(deserialized.timestamp, equals(original.timestamp));
      }
    });
  });
}

ApiConfig generateRandomApiConfig() {
  final random = Random();
  final ip = '${random.nextInt(256)}.${random.nextInt(256)}.'
             '${random.nextInt(256)}.${random.nextInt(256)}';
  final port = 3000 + random.nextInt(9000);
  
  return ApiConfig(
    apiUrl: 'http://$ip:$port',
    wsUrl: 'ws://$ip:$port/ws',
    deviceName: 'Test Server ${random.nextInt(1000)}',
    timestamp: DateTime.now().millisecondsSinceEpoch + random.nextInt(10000),
  );
}
```

**Example: Property 6 - URL Format Validation**

```dart
// test/utils/validators_test.dart
import 'package:test/test.dart';
import 'package:agent_malas_mobile/utils/validators.dart';

void main() {
  group('URL Validation Property Tests', () {
    test('Property 6: Valid HTTP URLs are accepted', () {
      // Feature: mobile-app-sprint-1-setup-qr
      // Property 6: For any properly formatted HTTP/HTTPS URL, 
      // validation should return true
      
      final validPrefixes = ['http://', 'https://'];
      
      for (int i = 0; i < 100; i++) {
        final prefix = validPrefixes[Random().nextInt(validPrefixes.length)];
        final url = generateRandomValidUrl(prefix);
        
        expect(isValidHttpUrl(url), isTrue,
          reason: 'Valid URL should pass validation: $url');
      }
    });
    
    test('Property 6: Invalid URLs are rejected', () {
      // Feature: mobile-app-sprint-1-setup-qr
      // Property 6: For any malformed URL, validation should return false
      
      for (int i = 0; i < 100; i++) {
        final invalidUrl = generateRandomInvalidUrl();
        
        expect(isValidHttpUrl(invalidUrl), isFalse,
          reason: 'Invalid URL should fail validation: $invalidUrl');
      }
    });
  });
}
```

**Example: Backend Property Test with fast-check**

```javascript
// test/routes/server-info.test.js
const fc = require('fast-check');
const request = require('supertest');
const app = require('../src/server');

describe('Server Info Endpoint Property Tests', () => {
  test('Property 3: Server info endpoint returns complete data', async () => {
    // Feature: mobile-app-sprint-1-setup-qr
    // Property 3: For any GET request to /api/server-info, 
    // response should contain all required fields
    
    await fc.assert(
      fc.asyncProperty(fc.nat(), async (seed) => {
        const response = await request(app)
          .get('/api/server-info')
          .expect(200);
        
        // Verify response structure
        expect(response.body).toHaveProperty('success', true);
        expect(response.body).toHaveProperty('ipAddress');
        expect(response.body).toHaveProperty('port');
        expect(response.body).toHaveProperty('timestamp');
        
        // Verify types
        expect(typeof response.body.ipAddress).toBe('string');
        expect(typeof response.body.port).toBe('number');
        expect(typeof response.body.timestamp).toBe('number');
        
        // Verify IP is not localhost
        expect(response.body.ipAddress).not.toBe('127.0.0.1');
        expect(response.body.ipAddress).not.toBe('::1');
      }),
      { numRuns: 100 }
    );
  });
});
```

### Unit Testing

Unit tests focus on specific examples, edge cases, and integration points:

#### Mobile App Unit Tests

**Storage Service Tests**
```dart
// test/services/storage_service_test.dart
void main() {
  group('StorageService', () {
    late StorageService storageService;
    
    setUp(() {
      storageService = StorageService();
    });
    
    test('returns null when no config exists', () async {
      await storageService.clearAll();
      final config = await storageService.getApiConfig();
      expect(config, isNull);
    });
    
    test('saves and loads config successfully', () async {
      final config = ApiConfig(
        apiUrl: 'http://192.168.1.50:3001',
        wsUrl: 'ws://192.168.1.50:3001/ws',
        deviceName: 'Test Server',
        timestamp: DateTime.now().millisecondsSinceEpoch,
      );
      
      await storageService.saveApiConfig(config);
      final loaded = await storageService.getApiConfig();
      
      expect(loaded, isNotNull);
      expect(loaded!.apiUrl, equals(config.apiUrl));
      expect(loaded.wsUrl, equals(config.wsUrl));
    });
    
    test('clears config successfully', () async {
      final config = ApiConfig(/* ... */);
      await storageService.saveApiConfig(config);
      await storageService.clearAll();
      
      final loaded = await storageService.getApiConfig();
      expect(loaded, isNull);
    });
  });
}
```

**API Service Tests**
```dart
// test/services/api_service_test.dart
void main() {
  group('ApiService', () {
    test('connection test succeeds with 200 response', () async {
      final mockDio = MockDio();
      when(mockDio.get(any)).thenAnswer((_) async => Response(
        statusCode: 200,
        data: {'success': true},
        requestOptions: RequestOptions(path: ''),
      ));
      
      final apiService = ApiService('http://test.com', dio: mockDio);
      final result = await apiService.testConnection();
      
      expect(result, isTrue);
    });
    
    test('connection test fails with timeout', () async {
      final mockDio = MockDio();
      when(mockDio.get(any)).thenThrow(
        DioException(
          type: DioExceptionType.connectionTimeout,
          requestOptions: RequestOptions(path: ''),
        ),
      );
      
      final apiService = ApiService('http://test.com', dio: mockDio);
      final result = await apiService.testConnection();
      
      expect(result, isFalse);
    });
  });
}
```

**Validation Tests**
```dart
// test/utils/validators_test.dart
void main() {
  group('URL Validators', () {
    test('accepts valid HTTP URLs', () {
      expect(isValidHttpUrl('http://192.168.1.50:3001'), isTrue);
      expect(isValidHttpUrl('https://example.com'), isTrue);
      expect(isValidHttpUrl('http://10.0.0.1:8080'), isTrue);
    });
    
    test('rejects invalid HTTP URLs', () {
      expect(isValidHttpUrl('not-a-url'), isFalse);
      expect(isValidHttpUrl('ftp://example.com'), isFalse);
      expect(isValidHttpUrl(''), isFalse);
      expect(isValidHttpUrl('http://'), isFalse);
    });
    
    test('accepts valid WebSocket URLs', () {
      expect(isValidWsUrl('ws://192.168.1.50:3001/ws'), isTrue);
      expect(isValidWsUrl('wss://example.com/socket'), isTrue);
    });
    
    test('rejects invalid WebSocket URLs', () {
      expect(isValidWsUrl('http://example.com'), isFalse);
      expect(isValidWsUrl('not-a-url'), isFalse);
      expect(isValidWsUrl(''), isFalse);
    });
  });
  
  group('ApiConfig Validators', () {
    test('accepts valid API config', () {
      final json = {
        'apiUrl': 'http://192.168.1.50:3001',
        'wsUrl': 'ws://192.168.1.50:3001/ws',
        'deviceName': 'Test Server',
        'timestamp': 1704067200000,
      };
      
      final result = ApiConfigValidator.validate(json);
      expect(result.isValid, isTrue);
      expect(result.errors, isEmpty);
    });
    
    test('rejects config with missing fields', () {
      final json = {
        'apiUrl': 'http://192.168.1.50:3001',
        // Missing wsUrl, deviceName, timestamp
      };
      
      final result = ApiConfigValidator.validate(json);
      expect(result.isValid, isFalse);
      expect(result.errors.length, equals(3));
    });
    
    test('rejects config with invalid URLs', () {
      final json = {
        'apiUrl': 'not-a-url',
        'wsUrl': 'also-not-a-url',
        'deviceName': 'Test',
        'timestamp': 1704067200000,
      };
      
      final result = ApiConfigValidator.validate(json);
      expect(result.isValid, isFalse);
      expect(result.errors, contains('Invalid API URL format'));
      expect(result.errors, contains('Invalid WebSocket URL format'));
    });
  });
}
```

#### Backend Unit Tests

```javascript
// test/routes/server-info.test.js
describe('Server Info Endpoint', () => {
  test('GET /api/server-info returns server information', async () => {
    const response = await request(app)
      .get('/api/server-info')
      .expect(200);
    
    expect(response.body.success).toBe(true);
    expect(response.body).toHaveProperty('ipAddress');
    expect(response.body).toHaveProperty('port');
    expect(response.body).toHaveProperty('timestamp');
  });
  
  test('IP address is not localhost', async () => {
    const response = await request(app)
      .get('/api/server-info')
      .expect(200);
    
    expect(response.body.ipAddress).not.toBe('127.0.0.1');
    expect(response.body.ipAddress).not.toBe('::1');
  });
  
  test('handles errors gracefully', async () => {
    // Mock network interface failure
    jest.spyOn(os, 'networkInterfaces').mockImplementation(() => ({}));
    
    const response = await request(app)
      .get('/api/server-info')
      .expect(500);
    
    expect(response.body.success).toBe(false);
    expect(response.body).toHaveProperty('error');
  });
});
```

#### Web Frontend Unit Tests

```javascript
// test/hooks/useServerInfo.test.js
import { renderHook, waitFor } from '@testing-library/react';
import { useServerInfo } from '../src/hooks/useServerInfo';

describe('useServerInfo', () => {
  test('fetches server info on mount', async () => {
    global.fetch = jest.fn(() =>
      Promise.resolve({
        ok: true,
        json: () => Promise.resolve({
          success: true,
          ipAddress: '192.168.1.50',
          port: 3001,
          timestamp: Date.now()
        })
      })
    );
    
    const { result } = renderHook(() => useServerInfo());
    
    await waitFor(() => {
      expect(result.current.loading).toBe(false);
    });
    
    expect(result.current.serverInfo).toBeDefined();
    expect(result.current.serverInfo.ipAddress).toBe('192.168.1.50');
    expect(result.current.error).toBeNull();
  });
  
  test('handles fetch errors', async () => {
    global.fetch = jest.fn(() => Promise.reject(new Error('Network error')));
    
    const { result } = renderHook(() => useServerInfo());
    
    await waitFor(() => {
      expect(result.current.loading).toBe(false);
    });
    
    expect(result.current.serverInfo).toBeNull();
    expect(result.current.error).toBeDefined();
  });
});
```

### Integration Testing

Integration tests verify the interaction between components:

**Mobile App Integration Tests**
- QR scanner flow: Scan QR → Parse → Validate → Test connection → Save → Navigate
- Manual setup flow: Enter URLs → Validate → Test connection → Save → Navigate
- Initialization flow: Launch → Check storage → Navigate to appropriate screen

**End-to-End Tests**
- Generate QR code in web frontend → Scan with mobile app → Verify configuration saved
- Manual configuration → Verify connection to backend → Verify dashboard loads

### Test Coverage Goals

- Unit test coverage: >80% for business logic
- Property test coverage: All 11 correctness properties implemented
- Integration test coverage: All critical user flows
- Edge case coverage: All identified edge cases tested

### Continuous Integration

Tests should run automatically on:
- Every commit (unit tests, property tests)
- Pull requests (full test suite including integration tests)
- Pre-release (full test suite + manual testing)


## UI/UX Design Guidelines

### Design Principles

1. **Simplicity First:** Minimize cognitive load with clear, focused screens
2. **Immediate Feedback:** Provide instant visual feedback for all user actions
3. **Error Prevention:** Validate inputs and guide users before errors occur
4. **Graceful Degradation:** Offer alternatives when primary features unavailable
5. **Consistency:** Maintain uniform patterns across all screens

### Visual Design System

#### Color Palette

**Primary Colors:**
- Primary: Blue (#2196F3) - Actions, links, active states
- Primary Variant: Dark Blue (#1976D2) - App bar, emphasis
- Secondary: Teal (#009688) - Accents, success states
- Secondary Variant: Dark Teal (#00796B) - Hover states

**Semantic Colors:**
- Success: Green (#4CAF50) - Successful operations
- Warning: Orange (#FF9800) - Warnings, caution
- Error: Red (#F44336) - Errors, destructive actions
- Info: Light Blue (#03A9F4) - Informational messages

**Neutral Colors:**
- Background: White (#FFFFFF) / Dark (#121212)
- Surface: Light Gray (#F5F5F5) / Dark Gray (#1E1E1E)
- Text Primary: Dark Gray (#212121) / White (#FFFFFF)
- Text Secondary: Medium Gray (#757575) / Light Gray (#B0B0B0)

#### Typography

**Font Family:** Google Fonts - Inter
- Display: Inter Bold, 24-32sp
- Headline: Inter SemiBold, 20-24sp
- Title: Inter Medium, 16-20sp
- Body: Inter Regular, 14-16sp
- Caption: Inter Regular, 12-14sp

**Text Hierarchy:**
- Screen titles: Headline
- Section headers: Title
- Body text: Body
- Helper text: Caption
- Button text: Title (uppercase)

#### Spacing System

**Base Unit:** 8dp (density-independent pixels)

**Spacing Scale:**
- xs: 4dp (0.5 units)
- sm: 8dp (1 unit)
- md: 16dp (2 units)
- lg: 24dp (3 units)
- xl: 32dp (4 units)
- xxl: 48dp (6 units)

**Application:**
- Screen padding: lg (24dp)
- Card padding: md (16dp)
- Element spacing: sm-md (8-16dp)
- Section spacing: lg-xl (24-32dp)

#### Component Specifications

**Buttons:**
- Height: 48dp (minimum touch target)
- Padding: 16dp horizontal, 12dp vertical
- Border radius: 8dp
- Elevation: 2dp (raised), 0dp (flat)
- States: Default, Hover, Pressed, Disabled

**Cards:**
- Border radius: 12dp
- Elevation: 2dp
- Padding: 16dp
- Margin: 8dp between cards

**Input Fields:**
- Height: 56dp
- Border radius: 8dp
- Border: 1dp solid (outline style)
- Padding: 16dp horizontal
- Label: Floating label style

**Icons:**
- Size: 24dp (standard), 20dp (small), 32dp (large)
- Color: Inherit from context
- Style: Material Icons (outlined)

### Screen Designs

#### Splash Screen

**Layout:**
```
┌─────────────────────────────────┐
│                                 │
│                                 │
│          [App Logo]             │
│                                 │
│       Agent Malas Mobile        │
│                                 │
│      [Loading Indicator]        │
│                                 │
│                                 │
└─────────────────────────────────┘
```

**Elements:**
- Centered app logo (128x128dp)
- App name below logo (Headline style)
- Circular progress indicator
- Solid background color (Primary)
- White text and icons

**Behavior:**
- Display for minimum 1 second
- Check for existing configuration
- Navigate to appropriate screen
- Fade transition to next screen

#### QR Scanner Screen

**Layout:**
```
┌─────────────────────────────────┐
│  ← Back          QR Scanner     │
├─────────────────────────────────┤
│                                 │
│    ┌─────────────────────┐     │
│    │                     │     │
│    │   Camera Preview    │     │
│    │                     │     │
│    │   [Scan Overlay]    │     │
│    │                     │     │
│    └─────────────────────┘     │
│                                 │
│  Scan QR code from web app      │
│                                 │
│  [Manual Setup Button]          │
│                                 │
└─────────────────────────────────┘
```

**Elements:**
- App bar with back button and title
- Full-width camera preview
- Scan overlay (rounded square with corners)
- Instruction text below camera
- Manual setup button (outlined style)
- Error snackbar (when needed)

**States:**
- Loading: Show progress indicator
- Scanning: Active camera with overlay
- Processing: Show loading overlay
- Error: Display error message
- Success: Show success message and navigate

**Interactions:**
- Tap anywhere to focus camera
- Scan QR code automatically
- Tap manual setup for alternative
- Swipe down to dismiss (if modal)

#### Manual Setup Screen

**Layout:**
```
┌─────────────────────────────────┐
│  ← Back       Manual Setup      │
├─────────────────────────────────┤
│                                 │
│  Enter server connection details│
│                                 │
│  API URL                        │
│  ┌───────────────────────────┐ │
│  │ http://192.168.1.50:3001  │ │
│  └───────────────────────────┘ │
│                                 │
│  WebSocket URL                  │
│  ┌───────────────────────────┐ │
│  │ ws://192.168.1.50:3001/ws │ │
│  └───────────────────────────┘ │
│                                 │
│  [Connect Button]               │
│                                 │
│  Need help? Scan QR code instead│
│                                 │
└─────────────────────────────────┘
```

**Elements:**
- App bar with back button and title
- Instruction text
- Two text input fields (outlined style)
- Connect button (filled, primary color)
- Helper text with link to QR scanner
- Validation error messages (inline)

**Validation:**
- Real-time URL format validation
- Show error icon and message for invalid input
- Disable connect button until valid
- Clear error on input change

**Interactions:**
- Auto-focus first field on load
- Tab between fields
- Tap connect to test and save
- Show loading indicator during test
- Navigate on success

#### Dashboard Screen (Placeholder)

**Layout:**
```
┌─────────────────────────────────┐
│  Agent Malas      [Settings] ⚙  │
├─────────────────────────────────┤
│                                 │
│  ┌───────────────────────────┐ │
│  │  Connection Status        │ │
│  │  ● Connected              │ │
│  │  192.168.1.50:3001        │ │
│  └───────────────────────────┘ │
│                                 │
│  ┌───────────────────────────┐ │
│  │  Coming Soon              │ │
│  │                           │ │
│  │  Approval features will   │ │
│  │  be available in Sprint 2 │ │
│  │                           │ │
│  └───────────────────────────┘ │
│                                 │
└─────────────────────────────────┘
```

**Elements:**
- App bar with title and settings icon
- Connection status card
- Placeholder content card
- Bottom navigation (future)

### Web Frontend QR Modal Design

**Layout:**
```
┌─────────────────────────────────────────┐
│  Connect Mobile App              [×]    │
├─────────────────────────────────────────┤
│                                         │
│         ┌─────────────────┐            │
│         │                 │            │
│         │    QR Code      │            │
│         │   256x256px     │            │
│         │                 │            │
│         └─────────────────┘            │
│                                         │
│  Server: 192.168.1.50:3001             │
│                                         │
│  1. Open Agent Malas Mobile app        │
│  2. Scan this QR code                  │
│  3. Start approving tasks!             │
│                                         │
│  [Close]                                │
│                                         │
└─────────────────────────────────────────┘
```

**Elements:**
- Modal overlay (semi-transparent background)
- Modal card (elevated, centered)
- Close button (top right)
- QR code (centered, 256x256px)
- Server information text
- Step-by-step instructions
- Close button (bottom)

**Behavior:**
- Auto-refresh QR every 30 seconds
- Show loading state during refresh
- Display error if server info unavailable
- Close on overlay click or close button
- Keyboard shortcut: ESC to close

### Animations and Transitions

**Screen Transitions:**
- Duration: 300ms
- Easing: Ease-in-out
- Type: Fade + slide (platform default)

**Button Press:**
- Duration: 100ms
- Effect: Scale down to 0.95
- Ripple effect on tap

**Loading States:**
- Circular progress indicator
- Shimmer effect for content loading
- Skeleton screens for complex layouts

**Success/Error Feedback:**
- Snackbar slide up from bottom
- Duration: 3-5 seconds
- Auto-dismiss or tap to dismiss
- Icon + message + optional action

**QR Scan Success:**
- Haptic feedback (vibration)
- Success icon animation (checkmark)
- Brief pause before navigation
- Fade transition to dashboard

### Accessibility

**Touch Targets:**
- Minimum size: 48x48dp
- Spacing between targets: 8dp minimum

**Contrast Ratios:**
- Normal text: 4.5:1 minimum
- Large text: 3:1 minimum
- UI components: 3:1 minimum

**Screen Reader Support:**
- Semantic labels for all interactive elements
- Announce state changes
- Describe images and icons
- Logical focus order

**Keyboard Navigation:**
- Tab order follows visual layout
- Focus indicators visible
- Enter/Space activates buttons
- ESC dismisses modals

**Text Scaling:**
- Support system font size settings
- Test with 200% text scale
- Avoid fixed heights for text containers

### Responsive Design

**Mobile Breakpoints:**
- Small: 360dp width (minimum)
- Medium: 400dp width (typical)
- Large: 600dp width (tablets)

**Adaptations:**
- Scale spacing proportionally
- Adjust font sizes for readability
- Maintain touch target sizes
- Stack elements on narrow screens


## Security Considerations

### Data Security

#### Configuration Storage

**Threat:** Sensitive server URLs stored in plain text
**Mitigation:**
- Store configuration in app-private storage (SharedPreferences)
- Android automatically encrypts app data on devices with encryption enabled
- Consider using `flutter_secure_storage` for enhanced security in future sprints
- Never log sensitive configuration data

**Implementation:**
```dart
// Use app-private storage
final prefs = await SharedPreferences.getInstance();
// Data is automatically protected by Android's app sandbox
```

#### Network Communication

**Threat:** Man-in-the-middle attacks on local network
**Mitigation:**
- Support HTTPS/WSS for encrypted communication
- Validate SSL certificates (don't disable certificate validation)
- Use certificate pinning for production deployments (future)
- Implement request signing for API calls (future)

**Current Scope:**
- Sprint 1 uses HTTP/WS for local network simplicity
- Document security implications for users
- Plan HTTPS/WSS support for production

#### QR Code Security

**Threat:** Malicious QR codes with harmful URLs
**Mitigation:**
- Validate QR code structure before processing
- Verify URL schemes (only allow http/https/ws/wss)
- Test connection before saving configuration
- Display server details for user confirmation
- Implement URL allowlist for known safe patterns (future)

**Implementation:**
```dart
bool isValidUrl(String url) {
  final uri = Uri.tryParse(url);
  if (uri == null) return false;
  
  // Only allow specific schemes
  final allowedSchemes = ['http', 'https', 'ws', 'wss'];
  if (!allowedSchemes.contains(uri.scheme)) return false;
  
  // Validate host is not empty
  if (uri.host.isEmpty) return false;
  
  return true;
}
```

### Authentication and Authorization

**Current Scope (Sprint 1):**
- No authentication required for initial setup
- Server discovery is open on local network
- Focus on establishing connection

**Future Considerations:**
- Device registration with unique ID
- Token-based authentication for API calls
- Biometric authentication for app access
- Session management and token refresh
- Role-based access control

### Privacy

#### Data Collection

**Principle:** Collect only necessary data
**Current Data:**
- Server IP and port (for connection)
- Device name (user-provided, optional)
- Timestamp (for QR code freshness)

**Not Collected:**
- Personal information
- Location data
- Usage analytics (unless explicitly enabled)
- Device identifiers (beyond app-generated UUID)

#### Data Retention

- Configuration stored locally on device only
- No data sent to third-party services
- User can clear data at any time
- Uninstalling app removes all data

### Input Validation

#### QR Code Parsing

**Validation Steps:**
1. Verify QR code contains valid UTF-8 text
2. Verify text is valid JSON
3. Verify JSON contains required fields
4. Verify field types match schema
5. Verify URLs are properly formatted
6. Verify URLs use allowed schemes

**Example:**
```dart
ApiConfig? parseQRCode(String qrData) {
  try {
    // Step 1 & 2: Parse JSON
    final json = jsonDecode(qrData);
    
    // Step 3: Check required fields
    if (!json.containsKey('apiUrl') || 
        !json.containsKey('wsUrl') ||
        !json.containsKey('deviceName') ||
        !json.containsKey('timestamp')) {
      throw ValidationException('Missing required fields');
    }
    
    // Step 4 & 5 & 6: Validate types and formats
    final validator = ApiConfigValidator.validate(json);
    if (!validator.isValid) {
      throw ValidationException(validator.errors.join(', '));
    }
    
    return ApiConfig.fromJson(json);
  } catch (e) {
    logger.error('QR code parsing failed: $e');
    return null;
  }
}
```

#### Manual URL Input

**Validation:**
- Sanitize input (trim whitespace)
- Validate URL format
- Check for common typos (htp://, ws://)
- Prevent injection attacks
- Limit URL length (max 2048 characters)

### Network Security

#### Connection Testing

**Security Measures:**
- Set reasonable timeout (5 seconds)
- Limit retry attempts (max 3)
- Validate response structure
- Check response status codes
- Handle redirects carefully

**Implementation:**
```dart
Future<bool> testConnection(String apiUrl) async {
  try {
    final response = await dio.get(
      apiUrl,
      options: Options(
        sendTimeout: Duration(seconds: 5),
        receiveTimeout: Duration(seconds: 5),
        followRedirects: false, // Don't follow redirects
        validateStatus: (status) => status != null && status < 500,
      ),
    );
    
    // Only accept 2xx responses
    return response.statusCode != null && 
           response.statusCode! >= 200 && 
           response.statusCode! < 300;
  } catch (e) {
    logger.error('Connection test failed: $e');
    return false;
  }
}
```

#### Rate Limiting

**Client-Side:**
- Limit QR scan attempts (prevent spam)
- Debounce manual input validation
- Throttle connection tests

**Server-Side:**
- Rate limit `/api/server-info` endpoint
- Implement IP-based throttling
- Monitor for abuse patterns

### Error Handling Security

**Principle:** Don't leak sensitive information in errors

**Bad Example:**
```dart
// DON'T: Exposes internal details
throw Exception('Database connection failed: user=admin, password=...');
```

**Good Example:**
```dart
// DO: Generic user-facing message, detailed logging
logger.error('Database connection failed: ${e.toString()}');
throw Exception('Unable to connect to server. Please try again.');
```

### Permissions

#### Camera Permission

**Best Practices:**
- Request permission only when needed (just-in-time)
- Explain why permission is needed
- Provide alternative (manual setup) if denied
- Handle permission denial gracefully
- Don't repeatedly request if permanently denied

**Implementation:**
```dart
Future<bool> requestCameraPermission() async {
  final status = await Permission.camera.status;
  
  if (status.isGranted) {
    return true;
  }
  
  if (status.isPermanentlyDenied) {
    // Don't request again, guide to settings
    showPermissionDialog();
    return false;
  }
  
  // Request permission with context
  final result = await Permission.camera.request();
  return result.isGranted;
}
```

### Backend Security

#### Server Info Endpoint

**Security Measures:**
- No authentication required (local network only)
- Rate limiting to prevent abuse
- Input validation (though no user input)
- Error handling without information leakage
- CORS configuration for web frontend

**Implementation:**
```javascript
// Rate limiting
const rateLimit = require('express-rate-limit');

const serverInfoLimiter = rateLimit({
  windowMs: 1 * 60 * 1000, // 1 minute
  max: 30, // 30 requests per minute
  message: 'Too many requests, please try again later'
});

router.get('/server-info', serverInfoLimiter, (req, res) => {
  try {
    const ipAddress = getLocalIPAddress();
    const port = process.env.PORT || 3001;
    
    res.json({
      success: true,
      ipAddress,
      port,
      timestamp: Date.now()
    });
  } catch (error) {
    // Log detailed error internally
    logger.error(`Server info error: ${error.message}`, { stack: error.stack });
    
    // Return generic error to client
    res.status(500).json({
      success: false,
      error: 'Unable to retrieve server information'
    });
  }
});
```

### Security Checklist

**Before Release:**
- [ ] All user inputs validated
- [ ] Error messages don't leak sensitive info
- [ ] HTTPS/WSS supported (or documented limitation)
- [ ] Permissions requested appropriately
- [ ] Rate limiting implemented
- [ ] Security testing completed
- [ ] Dependencies scanned for vulnerabilities
- [ ] Code review for security issues
- [ ] Documentation includes security considerations

**Future Enhancements:**
- [ ] Implement authentication
- [ ] Add certificate pinning
- [ ] Encrypt local storage
- [ ] Add request signing
- [ ] Implement device registration
- [ ] Add audit logging
- [ ] Security monitoring and alerts

## Performance Considerations

### Mobile App Performance

#### Startup Time

**Target:** App ready in <2 seconds

**Optimizations:**
- Minimize splash screen duration
- Lazy load non-critical dependencies
- Cache configuration in memory
- Use async initialization
- Defer heavy operations until after first render

#### QR Scanning Performance

**Target:** Scan detection in <1 second

**Optimizations:**
- Use hardware acceleration for camera
- Optimize QR detection algorithm
- Process frames at appropriate rate (not every frame)
- Cancel processing when QR detected
- Use native QR scanner (mobile_scanner package)

#### Network Performance

**Target:** Connection test completes in <5 seconds

**Optimizations:**
- Set appropriate timeouts
- Use connection pooling (dio)
- Implement request caching where appropriate
- Compress request/response data (future)
- Use WebSocket for real-time updates (future)

#### Storage Performance

**Target:** Config save/load in <100ms

**Optimizations:**
- Use SharedPreferences (fast key-value storage)
- Cache loaded config in memory
- Batch storage operations
- Avoid unnecessary reads/writes

### Backend Performance

#### Server Info Endpoint

**Target:** Response time <100ms

**Optimizations:**
- Cache network interface detection
- Minimize computation per request
- Use efficient IP detection algorithm
- Implement response caching (short TTL)

**Implementation:**
```javascript
// Cache IP address for 30 seconds
let cachedIP = null;
let cacheTime = 0;
const CACHE_TTL = 30000; // 30 seconds

function getLocalIPAddress() {
  const now = Date.now();
  
  if (cachedIP && (now - cacheTime) < CACHE_TTL) {
    return cachedIP;
  }
  
  // Detect IP address
  const ip = detectIPAddress();
  
  // Update cache
  cachedIP = ip;
  cacheTime = now;
  
  return ip;
}
```

### Web Frontend Performance

#### QR Code Generation

**Target:** QR code renders in <200ms

**Optimizations:**
- Use efficient QR library (qrcode.react)
- Memoize QR data to prevent unnecessary re-renders
- Lazy load QR modal component
- Optimize QR code size (256x256 is sufficient)

**Implementation:**
```jsx
import { memo, useMemo } from 'react';

const QRCodeDisplay = memo(({ serverInfo }) => {
  const qrData = useMemo(() => {
    if (!serverInfo) return null;
    return JSON.stringify({
      apiUrl: `http://${serverInfo.ipAddress}:${serverInfo.port}`,
      wsUrl: `ws://${serverInfo.ipAddress}:${serverInfo.port}/ws`,
      deviceName: 'Agent Malas Server',
      timestamp: serverInfo.timestamp
    });
  }, [serverInfo]);
  
  if (!qrData) return <LoadingSpinner />;
  
  return <QRCode value={qrData} size={256} />;
});
```

### Memory Management

**Mobile App:**
- Dispose controllers and streams properly
- Cancel pending requests on screen exit
- Clear image caches when appropriate
- Monitor memory usage in development

**Backend:**
- Limit cache sizes
- Clean up expired cache entries
- Monitor memory usage
- Use streaming for large responses (future)

### Battery Optimization

**Mobile App:**
- Stop camera when not in use
- Minimize background processing
- Use efficient polling intervals (future)
- Batch network requests
- Optimize WebSocket reconnection logic (future)

## Deployment and Configuration

### Mobile App Deployment

#### Build Configuration

**Debug Build:**
```bash
flutter build apk --debug
```

**Release Build:**
```bash
flutter build apk --release
flutter build appbundle --release  # For Play Store
```

#### App Signing

**Generate Keystore:**
```bash
keytool -genkey -v -keystore ~/agent-malas-mobile.jks \
  -keyalg RSA -keysize 2048 -validity 10000 \
  -alias agent-malas-mobile
```

**Configure in `android/key.properties`:**
```properties
storePassword=<password>
keyPassword=<password>
keyAlias=agent-malas-mobile
storeFile=<path-to-keystore>
```

#### Version Management

**pubspec.yaml:**
```yaml
version: 1.0.0+1  # version+buildNumber
```

Update for each release:
- Major: Breaking changes
- Minor: New features
- Patch: Bug fixes
- Build number: Increment for each build

### Backend Deployment

#### Environment Configuration

**Production `.env`:**
```env
NODE_ENV=production
PORT=3001
LOG_LEVEL=info
DATABASE_PATH=./data/agent-malas.db
```

#### Server Info Endpoint

No additional configuration needed. Endpoint automatically detects local IP.

### Web Frontend Deployment

#### Build Configuration

```bash
npm run build
```

#### Environment Variables

```env
VITE_API_URL=http://localhost:3001
```

### Installation Instructions

#### Mobile App Installation

**For Users:**
1. Download APK from release page
2. Enable "Install from Unknown Sources" in Android settings
3. Open APK file to install
4. Grant necessary permissions when prompted

**For Developers:**
```bash
# Install on connected device
flutter install

# Or use ADB
adb install build/app/outputs/flutter-apk/app-release.apk
```

#### Backend Setup

```bash
# Install dependencies
npm install

# Initialize database
npm run db:init

# Start server
npm start
```

#### Web Frontend Setup

```bash
# Install dependencies
npm install

# Start development server
npm run dev

# Build for production
npm run build
```

### Configuration Management

#### Mobile App Configuration

Stored in `lib/config/app_config.dart`:
```dart
class AppConfig {
  static const String appName = 'Agent Malas Mobile';
  static const String appVersion = '1.0.0';
  static const int connectionTimeout = 5000;
  static const int maxRetries = 3;
  
  // Environment-specific (can be overridden)
  static String get apiUrl => _apiUrl ?? 'http://localhost:3001';
  static String? _apiUrl;
  
  static void setApiUrl(String url) {
    _apiUrl = url;
  }
}
```

#### Backend Configuration

Managed through environment variables and `src/config.js`.

#### Web Frontend Configuration

Managed through Vite environment variables.

## Conclusion

This design document provides a comprehensive blueprint for implementing Sprint 1 of the Agent Malas Mobile App. The design emphasizes:

- **Simplicity:** QR code-based setup eliminates manual configuration complexity
- **Reliability:** Comprehensive validation and error handling ensure robust operation
- **Security:** Input validation and secure storage protect user data
- **Testability:** Property-based testing ensures correctness across all inputs
- **Maintainability:** Clear architecture and component boundaries enable future enhancements
- **User Experience:** Intuitive UI and helpful error messages guide users through setup

The implementation should follow this design closely while remaining flexible for necessary adjustments discovered during development. All 11 correctness properties must be implemented as property-based tests to ensure the system behaves correctly across all valid inputs.

Sprint 1 establishes the foundation for future sprints that will add approval workflow functionality, real-time updates, and enhanced features.

