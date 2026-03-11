# Agent Malas Mobile App

> Flutter-based Android application for approving and managing Agent Malas tasks from your smartphone.

[![Flutter](https://img.shields.io/badge/Flutter-3.10.8-blue.svg)](https://flutter.dev/)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)

## 🌟 Features

- ✅ **QR Code Setup** - Scan QR code from web interface for instant configuration
- ✅ **Manual Setup** - Alternative manual server configuration
- ✅ **Persistent Storage** - Automatic reconnection on app restart
- ✅ **Connection Validation** - Tests server connectivity before saving
- ✅ **Material Design 3** - Modern, polished UI with Google Fonts
- ✅ **Error Handling** - Clear, actionable error messages
- ✅ **Camera Permissions** - Guided permission requests with fallback options

## 📋 Prerequisites

Before you begin, ensure you have the following installed:

- **Flutter SDK** >= 3.10.8 ([Installation Guide](https://docs.flutter.dev/get-started/install))
- **Android Studio** or **VS Code** with Flutter extensions
- **Android SDK** (API level 21 or higher)
- **Physical Android device** or **Android Emulator**
- **Git** for version control

### Verify Flutter Installation

```bash
flutter doctor
```

Ensure all checkmarks are green for Android development.

## 🚀 Quick Start

### 1. Clone and Setup

```bash
# Navigate to mobile app directory
cd agent_malas_mobile

# Install dependencies
flutter pub get

# Verify setup
flutter doctor
```

### 2. Configure Android Permissions

The app requires camera and internet permissions. These are already configured in `android/app/src/main/AndroidManifest.xml`:

```xml
<uses-permission android:name="android.permission.INTERNET" />
<uses-permission android:name="android.permission.CAMERA" />
<uses-permission android:name="android.permission.VIBRATE" />
```

### 3. Run the App

#### On Physical Device

```bash
# Enable USB debugging on your Android device
# Connect device via USB
# Run the app
flutter run
```

#### On Emulator

```bash
# Start an Android emulator from Android Studio
# Or use command line:
flutter emulators --launch <emulator_id>

# Run the app
flutter run
```

### 4. Connect to Backend Server

The mobile app needs to connect to the Agent Malas backend server. You have two options:

#### Option A: QR Code Setup (Recommended)

1. Start the backend server (see Backend Setup section below)
2. Open the web frontend at `http://localhost:3001`
3. Click the **"📱 Connect Mobile App"** button in the header
4. Open the mobile app and scan the displayed QR code
5. The app will automatically configure and connect

#### Option B: Manual Setup

1. Start the backend server
2. Find your server's local IP address (see Backend Setup section)
3. Open the mobile app
4. Tap **"Manual Setup"**
5. Enter:
   - **API URL**: `http://YOUR_IP:3001`
   - **WebSocket URL**: `ws://YOUR_IP:3001/ws`
6. Tap **"Connect"**

## 🔧 Backend Setup

The mobile app requires the Agent Malas backend server to be running with the server-info endpoint.

### 1. Start Backend Server

```bash
# From project root directory
cd ..

# Install dependencies (if not already done)
npm install

# Start the server
npm start
```

The server will start on port 3001 by default.

### 2. Find Your Local IP Address

The mobile app needs to connect to your computer's local network IP address (not localhost).

#### On Linux/Mac:

```bash
# Find your local IP
ifconfig | grep "inet " | grep -v 127.0.0.1

# Or use:
hostname -I
```

#### On Windows:

```bash
# Find your local IP
ipconfig

# Look for "IPv4 Address" under your active network adapter
```

Your IP address will typically be in the format:
- `192.168.x.x` (most common for home networks)
- `10.x.x.x` (common for corporate networks)

### 3. Verify Server-Info Endpoint

Test that the backend server-info endpoint is working:

```bash
# Replace YOUR_IP with your actual IP address
curl http://YOUR_IP:3001/api/server-info

# Expected response:
# {
#   "success": true,
#   "ipAddress": "192.168.1.50",
#   "port": 3001,
#   "timestamp": 1704067200000
# }
```

### 4. Configure Firewall (if needed)

If the mobile app cannot connect, ensure your firewall allows connections on port 3001:

#### Linux (ufw):
```bash
sudo ufw allow 3001/tcp
```

#### Windows:
1. Open Windows Defender Firewall
2. Click "Advanced settings"
3. Click "Inbound Rules" → "New Rule"
4. Select "Port" → Next
5. Enter port 3001 → Next
6. Allow the connection → Finish

#### macOS:
```bash
# macOS firewall typically allows local network connections by default
# If needed, go to System Preferences → Security & Privacy → Firewall
```

## 🌐 Web Frontend Setup

The web frontend provides the QR code generator for easy mobile app setup.

### 1. Install Frontend Dependencies

```bash
# From project root
cd frontend

# Install dependencies
npm install
```

### 2. Start Frontend Development Server

```bash
# Start the frontend (if not already running)
npm run dev

# Or if using the integrated setup:
cd ..
npm start
```

### 3. Access QR Code Generator

1. Open browser to `http://localhost:3001`
2. Click the **"📱 Connect Mobile App"** button in the header
3. A modal will display with:
   - QR code containing server connection details
   - Server IP address and port
   - Setup instructions

The QR code auto-refreshes every 30 seconds to keep the timestamp current.

## 📱 Mobile App Architecture

### Project Structure

```
agent_malas_mobile/
├── lib/
│   ├── config/           # App configuration and theme
│   │   ├── app_config.dart
│   │   └── theme.dart
│   ├── models/           # Data models
│   │   ├── api_config.dart
│   │   └── server_info.dart
│   ├── providers/        # State management (Provider)
│   │   └── app_state.dart
│   ├── screens/          # UI screens
│   │   ├── splash_screen.dart
│   │   ├── qr_scanner_screen.dart
│   │   ├── manual_setup_screen.dart
│   │   └── dashboard_screen.dart
│   ├── services/         # Business logic services
│   │   ├── storage_service.dart
│   │   ├── api_service.dart
│   │   └── websocket_service.dart
│   ├── utils/            # Utilities and helpers
│   │   ├── validators.dart
│   │   ├── error_messages.dart
│   │   ├── constants.dart
│   │   └── helpers.dart
│   ├── widgets/          # Reusable UI components
│   └── main.dart         # App entry point
├── test/                 # Unit and integration tests
├── assets/               # Images and icons
├── android/              # Android-specific configuration
└── pubspec.yaml          # Dependencies and configuration
```

### Key Dependencies

| Package | Version | Purpose |
|---------|---------|---------|
| provider | ^6.1.2 | State management |
| dio | ^5.7.0 | HTTP client for API calls |
| web_socket_channel | ^3.0.1 | WebSocket communication |
| mobile_scanner | ^5.2.3 | QR code scanning |
| permission_handler | ^11.3.1 | Camera permissions |
| shared_preferences | ^2.3.3 | Local data persistence |
| flutter_local_notifications | ^18.0.1 | Push notifications |
| google_fonts | ^6.2.1 | Typography (Inter font) |
| logger | ^2.5.0 | Logging and debugging |

### App Flow

```
┌─────────────────┐
│  Splash Screen  │ ← App Launch
└────────┬────────┘
         │
         ├─── Config exists? ───┐
         │                      │
         ▼ No                   ▼ Yes
┌─────────────────┐    ┌─────────────────┐
│  QR Scanner     │    │   Dashboard     │
│  Screen         │    │   Screen        │
└────────┬────────┘    └─────────────────┘
         │
         ├─── Scan QR ───┐
         │               │
         ▼               ▼
┌─────────────────┐    Parse & Validate
│  Manual Setup   │    Test Connection
│  Screen         │    Save Config
└─────────────────┘    Navigate to Dashboard
```

## 🧪 Testing

### Run Unit Tests

```bash
# Run all tests
flutter test

# Run specific test file
flutter test test/services/storage_service_test.dart

# Run with coverage
flutter test --coverage
```

### Run Integration Tests

```bash
# Run integration tests
flutter test integration_test/

# Run on specific device
flutter test integration_test/ -d <device_id>
```

### Manual Testing Checklist

- [ ] QR code scanning works correctly
- [ ] Manual setup validates URLs properly
- [ ] Connection test succeeds with valid server
- [ ] Connection test fails gracefully with invalid server
- [ ] Configuration persists across app restarts
- [ ] Camera permission request works
- [ ] Error messages are clear and helpful
- [ ] Loading indicators display during operations
- [ ] App handles network errors gracefully

## 🐛 Troubleshooting

### Issue: "Camera permission denied"

**Solution:**
1. Go to Android Settings → Apps → Agent Malas Mobile → Permissions
2. Enable Camera permission
3. Restart the app
4. Alternatively, use Manual Setup option

### Issue: "Cannot reach server"

**Possible causes and solutions:**

1. **Server not running**
   ```bash
   # Start the backend server
   cd /path/to/agent-malas
   npm start
   ```

2. **Wrong IP address**
   - Verify your computer's local IP address
   - Ensure you're using the local network IP (192.168.x.x), not localhost
   - Update the configuration in the app

3. **Firewall blocking connection**
   - Allow port 3001 in your firewall (see Backend Setup section)
   - Temporarily disable firewall to test

4. **Different networks**
   - Ensure mobile device and computer are on the same WiFi network
   - Corporate networks may block device-to-device communication

### Issue: "Invalid QR code format"

**Solution:**
1. Ensure backend server is running
2. Refresh the QR code in the web interface
3. Ensure good lighting when scanning
4. Try Manual Setup as alternative

### Issue: "App crashes on startup"

**Solution:**
1. Clear app data:
   ```bash
   flutter clean
   flutter pub get
   flutter run
   ```

2. Check logs:
   ```bash
   flutter logs
   ```

3. Reinstall the app:
   ```bash
   flutter run --uninstall-first
   ```

### Issue: "Build fails"

**Solution:**
1. Update Flutter:
   ```bash
   flutter upgrade
   ```

2. Clean and rebuild:
   ```bash
   flutter clean
   flutter pub get
   flutter run
   ```

3. Check Flutter doctor:
   ```bash
   flutter doctor -v
   ```

### Issue: "QR code not scanning"

**Solution:**
1. Ensure camera permission is granted
2. Check lighting conditions (avoid glare)
3. Hold phone steady and at proper distance
4. Try Manual Setup as alternative
5. Verify QR code is displayed correctly in web interface

## 🔒 Security Considerations

### Current Implementation (Development)

- HTTP and WebSocket connections (not encrypted)
- No authentication required
- Suitable for local network use only

### Production Recommendations

1. **Use HTTPS/WSS**
   - Configure SSL/TLS certificates
   - Update URLs to use `https://` and `wss://`

2. **Implement Authentication**
   - Add JWT token-based authentication
   - Require login before accessing features

3. **API Key Protection**
   - Store sensitive data in secure storage
   - Use Android Keystore for encryption

4. **Network Security**
   - Implement certificate pinning
   - Add request signing
   - Use rate limiting on backend

## 📦 Building for Release

### Generate Release APK

```bash
# Build release APK
flutter build apk --release

# Output location:
# build/app/outputs/flutter-apk/app-release.apk
```

### Generate App Bundle (for Play Store)

```bash
# Build app bundle
flutter build appbundle --release

# Output location:
# build/app/outputs/bundle/release/app-release.aab
```

### Configure Signing (Required for Release)

1. Create a keystore:
   ```bash
   keytool -genkey -v -keystore ~/agent-malas-key.jks -keyalg RSA -keysize 2048 -validity 10000 -alias agent-malas
   ```

2. Create `android/key.properties`:
   ```properties
   storePassword=<your-store-password>
   keyPassword=<your-key-password>
   keyAlias=agent-malas
   storeFile=<path-to-keystore>/agent-malas-key.jks
   ```

3. Update `android/app/build.gradle` (already configured in project)

**⚠️ Important:** Never commit `key.properties` or keystore files to version control!

## 📚 Additional Resources

### Flutter Documentation
- [Flutter Official Docs](https://docs.flutter.dev/)
- [Flutter Cookbook](https://docs.flutter.dev/cookbook)
- [Dart Language Tour](https://dart.dev/guides/language/language-tour)

### Package Documentation
- [Provider State Management](https://pub.dev/packages/provider)
- [Dio HTTP Client](https://pub.dev/packages/dio)
- [Mobile Scanner](https://pub.dev/packages/mobile_scanner)
- [Shared Preferences](https://pub.dev/packages/shared_preferences)

### Agent Malas Documentation
- [Main README](../README.md) - Backend server documentation
- [Mobile App Guide](../MOBILE-APP-GUIDE.md) - Integration architecture
- [API Documentation](../MOBILE-APP-GUIDE.md#api-endpoints) - API endpoints reference

## 🤝 Contributing

1. Fork the repository
2. Create a feature branch (`git checkout -b feature/amazing-feature`)
3. Make your changes
4. Run tests (`flutter test`)
5. Commit your changes (`git commit -m 'Add amazing feature'`)
6. Push to the branch (`git push origin feature/amazing-feature`)
7. Open a Pull Request

## 📝 License

This project is licensed under the MIT License - see the [LICENSE](../LICENSE) file for details.

## 🙏 Acknowledgments

- [Flutter Team](https://flutter.dev/) - Amazing cross-platform framework
- [Material Design 3](https://m3.material.io/) - Modern design system
- [Google Fonts](https://fonts.google.com/) - Beautiful typography

---

**Made with ❤️ by the Agent Malas Team**

*"Approve tasks on the go, stay productive anywhere!"*
