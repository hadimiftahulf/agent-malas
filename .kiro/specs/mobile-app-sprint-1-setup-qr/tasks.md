# Implementation Plan: Mobile App Sprint 1 - Setup & QR Code Integration

## Overview

This implementation plan breaks down Sprint 1 of the Agent Malas Mobile App into discrete, actionable coding tasks. The sprint establishes the foundation for a Flutter-based Android application with QR code-based server discovery, persistent configuration storage, and basic API connectivity.

The implementation follows an incremental approach: Flutter project setup → Backend server-info endpoint → Web frontend QR generator → Mobile QR scanner → Storage and API services → Manual setup fallback → Splash screen and navigation → Theme configuration → Testing.

Each task builds on previous work and includes specific file references, acceptance criteria, and requirements traceability.

## Tasks

- [x] 1. Initialize Flutter project structure and dependencies
  - Create new Flutter project with command: `flutter create agent_malas_mobile`
  - Configure `pubspec.yaml` with all required dependencies (provider, dio, web_socket_channel, mobile_scanner, shared_preferences, flutter_local_notifications, google_fonts, intl, logger)
  - Set up folder structure: config/, models/, services/, screens/, widgets/, utils/
  - Configure Android permissions in `AndroidManifest.xml` (camera, internet, vibration)
  - Create placeholder files for all folders to establish structure
  - Test that app runs successfully on Android device/emulator
  - _Requirements: 1.1, 1.2, 1.3, 1.4, 1.5_
  - _Files to create: `agent_malas_mobile/pubspec.yaml`, `agent_malas_mobile/android/app/src/main/AndroidManifest.xml`, placeholder files in lib/ subdirectories_
  - _Estimate: 2 hours_

- [ ] 2. Implement backend server-info endpoint
  - [x] 2.1 Create server-info route with IP detection logic
    - Create `src/routes/server-info.js` with GET endpoint at `/api/server-info`
    - Implement `getLocalIPAddress()` function to detect local network IP (not localhost)
    - Prioritize 192.168.x.x and 10.x.x.x network ranges
    - Return JSON response with ipAddress, port, timestamp fields
    - Add error handling with appropriate status codes
    - _Requirements: 2.6, 10.1, 10.2, 10.3, 10.4, 10.5_
    - _Files to create: `src/routes/server-info.js`_
    - _Estimate: 2 hours_
  
  - [ ]* 2.2 Write property test for server-info endpoint
    - **Property 3: Server Info Endpoint Returns Complete Data**
    - **Validates: Requirements 2.6, 10.2, 10.3**
    - Use fast-check to verify response structure across multiple requests
    - Verify all required fields present with correct types
    - Verify IP address is not localhost
    - _Files to create: `test/routes/server-info.test.js`_
    - _Estimate: 1 hour_
  
  - [ ]* 2.3 Write property test for local IP detection
    - **Property 2: Local IP Detection Excludes Localhost**
    - **Validates: Requirements 2.3, 10.4**
    - Verify detected IP is valid IPv4 format
    - Verify IP is not 127.0.0.1 or ::1
    - _Files to modify: `test/routes/server-info.test.js`_
    - _Estimate: 1 hour_

  - [-] 2.4 Integrate server-info route into Express app
    - Import and mount server-info router in `src/index.js` or `src/server.js`
    - Add route: `app.use('/api/server-info', serverInfoRouter)`
    - Test endpoint manually with curl or browser
    - _Requirements: 10.1_
    - _Files to modify: `src/index.js`_
    - _Estimate: 0.5 hours_

- [ ] 3. Implement web frontend QR code generator
  - [~] 3.1 Create useServerInfo hook
    - Create `frontend/src/hooks/useServerInfo.js` hook
    - Fetch server info from `/api/server-info` endpoint
    - Implement auto-refresh mechanism
    - Handle loading and error states
    - Return serverInfo, loading, error, and refresh function
    - _Requirements: 2.6, 11.6_
    - _Files to create: `frontend/src/hooks/useServerInfo.js`_
    - _Estimate: 1.5 hours_
  
  - [~] 3.2 Create QRCodeModal component
    - Install qrcode.react dependency: `npm install qrcode.react`
    - Create `frontend/src/components/QRCodeModal.jsx` component
    - Use useServerInfo hook to fetch server information
    - Generate QR code with API_Config JSON (apiUrl, wsUrl, deviceName, timestamp)
    - Display QR code at 256x256 pixels minimum
    - Show server IP and port as text below QR code
    - Implement auto-refresh every 30 seconds
    - Add close button and modal overlay
    - _Requirements: 2.1, 2.2, 11.3, 11.4, 11.5, 11.6_
    - _Files to create: `frontend/src/components/QRCodeModal.jsx`_
    - _Estimate: 2 hours_
  
  - [ ]* 3.3 Write property test for QR code generation
    - **Property 1: QR Code Generation Produces Valid API Config**
    - **Validates: Requirements 2.1, 2.2**
    - Use fast-check to generate random server info
    - Verify QR data is valid JSON
    - Verify parsed JSON contains all required fields
    - _Files to create: `frontend/src/components/__tests__/QRCodeModal.test.jsx`_
    - _Estimate: 1 hour_
  
  - [~] 3.4 Add "Connect Mobile App" button to Header
    - Modify `frontend/src/components/Header.jsx` to add button
    - Add state to control QRCodeModal visibility
    - Render QRCodeModal component with isOpen and onClose props
    - Style button appropriately
    - _Requirements: 2.5, 11.1, 11.2_
    - _Files to modify: `frontend/src/components/Header.jsx`_
    - _Estimate: 1 hour_

- [ ] 4. Implement mobile app data models
  - [~] 4.1 Create ApiConfig model
    - Create `lib/models/api_config.dart` with ApiConfig class
    - Add fields: apiUrl, wsUrl, deviceName, timestamp
    - Implement toJson() and fromJson() methods
    - Implement isValid() validation method
    - _Requirements: 3.2_
    - _Files to create: `lib/models/api_config.dart`_
    - _Estimate: 1 hour_
  
  - [ ]* 4.2 Write property test for ApiConfig serialization
    - **Property 4: API Config Serialization Round Trip**
    - **Validates: Requirements 3.2**
    - Generate random ApiConfig objects
    - Verify toJson() → fromJson() preserves all fields
    - Run 100 iterations with varied data
    - _Files to create: `test/models/api_config_test.dart`_
    - _Estimate: 1 hour_
  
  - [~] 4.3 Create ServerInfo model
    - Create `lib/models/server_info.dart` with ServerInfo class
    - Add fields: ipAddress, port, timestamp
    - Implement toJson() and fromJson() methods
    - _Requirements: 10.3_
    - _Files to create: `lib/models/server_info.dart`_
    - _Estimate: 0.5 hours_

- [ ] 5. Implement mobile app configuration and theme
  - [~] 5.1 Create AppConfig
    - Create `lib/config/app_config.dart` with app constants
    - Define appName, appVersion, connectionTimeout, maxRetries
    - _Requirements: 12.1_
    - _Files to create: `lib/config/app_config.dart`_
    - _Estimate: 0.5 hours_
  
  - [~] 5.2 Create ThemeConfig
    - Create `lib/config/theme.dart` with Material Design 3 theme
    - Configure lightTheme and darkTheme using ColorScheme.fromSeed
    - Use Google Fonts (Inter) for text theme
    - Define primary color (Blue #2196F3) and secondary color (Teal #009688)
    - _Requirements: 12.1, 12.2_
    - _Files to create: `lib/config/theme.dart`_
    - _Estimate: 1 hour_

- [ ] 6. Implement mobile storage service
  - [~] 6.1 Create StorageService class
    - Create `lib/services/storage_service.dart` with StorageService class
    - Implement saveApiConfig() method using SharedPreferences
    - Implement getApiConfig() method that returns ApiConfig or null
    - Implement hasConfig() method to check if config exists
    - Implement clearAll() method to clear stored data
    - Store API_Config as JSON string with key 'api_config'
    - _Requirements: 6.1, 6.2, 6.3, 6.4, 6.5, 6.6_
    - _Files to create: `lib/services/storage_service.dart`_
    - _Estimate: 2 hours_
  
  - [ ]* 6.2 Write property test for storage round trip
    - **Property 7: Storage Service Round Trip**
    - **Validates: Requirements 6.2**
    - Generate random ApiConfig objects
    - Verify save → load preserves all data
    - Test with 100 different configurations
    - _Files to create: `test/services/storage_service_test.dart`_
    - _Estimate: 1 hour_
  
  - [ ]* 6.3 Write unit tests for storage edge cases
    - Test that getApiConfig() returns null when no config exists
    - Test that clearAll() removes stored configuration
    - Test handling of corrupted JSON data
    - _Files to modify: `test/services/storage_service_test.dart`_
    - _Estimate: 1 hour_
  
  - [ ]* 6.4 Write property test for empty storage
    - **Property 11: Empty Storage Returns Null**
    - **Validates: Requirements 6.3**
    - Verify fresh storage returns null
    - Verify storage after clearAll() returns null
    - _Files to modify: `test/services/storage_service_test.dart`_
    - _Estimate: 0.5 hours_

- [ ] 7. Implement mobile API service
  - [~] 7.1 Create ApiService class with connection testing
    - Create `lib/services/api_service.dart` with ApiService class
    - Initialize Dio client with baseUrl
    - Implement testConnection() method that sends GET request to baseUrl
    - Set timeout to 5 seconds
    - Return true for 2xx responses, false otherwise
    - Handle DioException for timeout, connection errors
    - _Requirements: 8.1, 8.2, 8.3, 8.4_
    - _Files to create: `lib/services/api_service.dart`_
    - _Estimate: 2 hours_
  
  - [ ]* 7.2 Write property test for connection test success
    - **Property 8: Connection Test Success Recognition**
    - **Validates: Requirements 8.3**
    - Mock Dio to return various 2xx status codes
    - Verify testConnection() returns true for all 2xx responses
    - _Files to create: `test/services/api_service_test.dart`_
    - _Estimate: 1 hour_
  
  - [ ]* 7.3 Write property test for connection test failure
    - **Property 9: Connection Test Failure Recognition**
    - **Validates: Requirements 8.4**
    - Mock Dio to return non-2xx responses, timeouts, errors
    - Verify testConnection() returns false for all failure cases
    - _Files to modify: `test/services/api_service_test.dart`_
    - _Estimate: 1 hour_
  
  - [~] 7.4 Create WebSocketService placeholder
    - Create `lib/services/websocket_service.dart` with WebSocketService class
    - Add placeholder methods: connect(), disconnect(), isConnected getter
    - Add TODO comments for Sprint 2 implementation
    - _Requirements: None (preparation for future sprints)_
    - _Files to create: `lib/services/websocket_service.dart`_
    - _Estimate: 0.5 hours_

- [ ] 8. Implement mobile validation utilities
  - [~] 8.1 Create URL validators
    - Create `lib/utils/validators.dart` with validation functions
    - Implement isValidHttpUrl() to validate HTTP/HTTPS URLs
    - Implement isValidWsUrl() to validate WS/WSS URLs
    - Check URL scheme, host presence, and format
    - _Requirements: 5.3, 5.4_
    - _Files to create: `lib/utils/validators.dart`_
    - _Estimate: 1 hour_
  
  - [ ]* 8.2 Write property test for URL validation
    - **Property 6: URL Format Validation**
    - **Validates: Requirements 5.3, 5.4**
    - Generate random valid HTTP/HTTPS URLs and verify acceptance
    - Generate random invalid URLs and verify rejection
    - Test WS/WSS URL validation similarly
    - _Files to create: `test/utils/validators_test.dart`_
    - _Estimate: 1.5 hours_
  
  - [~] 8.3 Create ApiConfigValidator
    - Add ApiConfigValidator class to `lib/utils/validators.dart`
    - Implement validate() method that checks JSON structure
    - Verify all required fields present (apiUrl, wsUrl, deviceName, timestamp)
    - Validate URL formats using isValidHttpUrl() and isValidWsUrl()
    - Return ValidationResult with isValid flag and error list
    - _Requirements: 3.3, 3.4_
    - _Files to modify: `lib/utils/validators.dart`_
    - _Estimate: 1 hour_
  
  - [ ]* 8.4 Write property test for ApiConfig validation
    - **Property 5: API Config Validation Rejects Invalid Data**
    - **Validates: Requirements 3.3, 3.4**
    - Generate invalid JSON objects (missing fields, wrong types, bad URLs)
    - Verify validator correctly rejects all invalid inputs
    - Generate valid configs and verify acceptance
    - _Files to modify: `test/utils/validators_test.dart`_
    - _Estimate: 1 hour_

- [~] 9. Checkpoint - Ensure all tests pass
  - Run all unit tests and property tests
  - Verify backend server-info endpoint works
  - Verify web frontend QR code displays correctly
  - Fix any failing tests or issues
  - Ask the user if questions arise

- [ ] 10. Implement QR scanner screen
  - [~] 10.1 Create QRScannerScreen with camera preview
    - Create `lib/screens/qr_scanner_screen.dart` with QRScannerScreen widget
    - Use mobile_scanner package for camera preview
    - Add MobileScanner widget with onDetect callback
    - Display scan overlay (rounded square with corner markers)
    - Add instruction text: "Scan QR code from web app"
    - Add "Manual Setup" button at bottom
    - _Requirements: 3.1, 4.3_
    - _Files to create: `lib/screens/qr_scanner_screen.dart`_
    - _Estimate: 3 hours_
  
  - [~] 10.2 Implement QR code parsing and validation
    - In QRScannerScreen, parse QR code data as JSON
    - Use ApiConfigValidator to validate parsed data
    - Display error snackbar for invalid QR codes with specific messages
    - Handle JSON parsing errors gracefully
    - _Requirements: 3.2, 3.3, 3.4_
    - _Files to modify: `lib/screens/qr_scanner_screen.dart`_
    - _Estimate: 1.5 hours_
  
  - [~] 10.3 Implement connection testing and config saving
    - After successful QR parse, call ApiService.testConnection()
    - Show loading indicator during connection test
    - Display error if connection fails with server URL
    - On success, save config using StorageService
    - Display success snackbar with device name
    - Navigate to dashboard screen
    - Add haptic feedback on success
    - _Requirements: 3.5, 3.6, 3.7, 3.8, 3.9, 8.5, 8.6_
    - _Files to modify: `lib/screens/qr_scanner_screen.dart`_
    - _Estimate: 2 hours_
  
  - [~] 10.4 Implement camera permission handling
    - Request camera permission when screen loads
    - Show permission dialog if denied with explanation
    - Provide button to open app settings if permanently denied
    - Show "Manual Setup" as alternative when permission denied
    - _Requirements: 4.1, 4.2, 4.3, 4.4_
    - _Files to modify: `lib/screens/qr_scanner_screen.dart`_
    - _Estimate: 1.5 hours_
  
  - [ ]* 10.5 Write integration test for QR scanner flow
    - Test complete flow: scan → parse → validate → test → save → navigate
    - Mock camera input with valid QR code
    - Verify navigation to dashboard on success
    - Test error handling for invalid QR codes
    - _Files to create: `integration_test/qr_scanner_test.dart`_
    - _Estimate: 2 hours_

- [ ] 11. Implement manual setup screen
  - [~] 11.1 Create ManualSetupScreen with input fields
    - Create `lib/screens/manual_setup_screen.dart` with ManualSetupScreen widget
    - Add TextFormField for API URL with label and hint
    - Add TextFormField for WebSocket URL with label and hint
    - Add "Connect" button (filled, primary color)
    - Add helper text with link back to QR scanner
    - Style with Material Design 3 outlined text fields
    - _Requirements: 5.1, 5.2_
    - _Files to create: `lib/screens/manual_setup_screen.dart`_
    - _Estimate: 2 hours_
  
  - [~] 11.2 Implement URL validation and connection testing
    - Add real-time validation using isValidHttpUrl() and isValidWsUrl()
    - Display inline error messages for invalid URLs
    - Disable Connect button until both URLs are valid
    - On Connect tap, test connection using ApiService
    - Show loading indicator during test
    - Display error snackbar if connection fails
    - _Requirements: 5.3, 5.4, 5.5_
    - _Files to modify: `lib/screens/manual_setup_screen.dart`_
    - _Estimate: 2 hours_
  
  - [~] 11.3 Implement config saving and navigation
    - Create ApiConfig from validated URLs
    - Save config using StorageService
    - Navigate to dashboard on success
    - Display success snackbar
    - _Requirements: 5.6, 5.7_
    - _Files to modify: `lib/screens/manual_setup_screen.dart`_
    - _Estimate: 1 hour_
  
  - [ ]* 11.4 Write integration test for manual setup flow
    - Test complete flow: enter URLs → validate → test → save → navigate
    - Test validation error handling
    - Test connection failure handling
    - _Files to create: `integration_test/manual_setup_test.dart`_
    - _Estimate: 1.5 hours_

- [ ] 12. Implement splash screen and initialization flow
  - [~] 12.1 Create SplashScreen
    - Create `lib/screens/splash_screen.dart` with SplashScreen widget
    - Display app logo (centered, 128x128dp)
    - Display app name below logo (Headline style)
    - Show circular progress indicator
    - Use primary color background with white text
    - _Requirements: 7.4, 12.4_
    - _Files to create: `lib/screens/splash_screen.dart`_
    - _Estimate: 1.5 hours_
  
  - [~] 12.2 Implement initialization logic
    - In SplashScreen initState, check for existing config using StorageService
    - If config exists, navigate to DashboardScreen
    - If no config, navigate to QRScannerScreen
    - Display splash for minimum 1 second
    - Use fade transition for navigation
    - _Requirements: 7.1, 7.2, 7.3_
    - _Files to modify: `lib/screens/splash_screen.dart`_
    - _Estimate: 1 hour_
  
  - [~] 12.3 Create DashboardScreen placeholder
    - Create `lib/screens/dashboard_screen.dart` with DashboardScreen widget
    - Add AppBar with title "Agent Malas" and settings icon
    - Display connection status card showing server URL
    - Add placeholder card with "Coming Soon" message for Sprint 2
    - _Requirements: 7.2_
    - _Files to create: `lib/screens/dashboard_screen.dart`_
    - _Estimate: 1.5 hours_
  
  - [ ]* 12.4 Write integration test for initialization flow
    - Test navigation to dashboard when config exists
    - Test navigation to QR scanner when no config
    - Verify splash screen displays for minimum duration
    - _Files to create: `integration_test/initialization_test.dart`_
    - _Estimate: 1 hour_

- [ ] 13. Wire up main app with Provider and routing
  - [~] 13.1 Create AppState provider
    - Create `lib/providers/app_state.dart` with AppState class extending ChangeNotifier
    - Add fields: _apiConfig, _isLoading, _errorMessage
    - Implement loadConfig(), saveConfig(), clearConfig() methods
    - Implement setLoading() and setError() methods
    - Call notifyListeners() on state changes
    - _Requirements: 6.1, 6.2, 6.4_
    - _Files to create: `lib/providers/app_state.dart`_
    - _Estimate: 1.5 hours_
  
  - [~] 13.2 Configure main.dart with Provider and theme
    - Modify `lib/main.dart` to wrap app with ChangeNotifierProvider
    - Configure MaterialApp with ThemeConfig.lightTheme and darkTheme
    - Set home to SplashScreen
    - Configure app title and theme mode
    - _Requirements: 12.1, 12.2, 12.5_
    - _Files to modify: `lib/main.dart`_
    - _Estimate: 1 hour_
  
  - [~] 13.3 Implement navigation between screens
    - Add navigation from SplashScreen to QRScannerScreen or DashboardScreen
    - Add navigation from QRScannerScreen to ManualSetupScreen
    - Add navigation from QRScannerScreen to DashboardScreen on success
    - Add navigation from ManualSetupScreen to DashboardScreen on success
    - Use Navigator.pushReplacement for one-way flows
    - Use Navigator.push for reversible flows
    - _Requirements: 7.2, 7.3, 3.8, 5.7_
    - _Files to modify: `lib/screens/splash_screen.dart`, `lib/screens/qr_scanner_screen.dart`, `lib/screens/manual_setup_screen.dart`_
    - _Estimate: 1 hour_

- [~] 14. Checkpoint - Ensure all tests pass
  - Run all unit tests, property tests, and integration tests
  - Test complete user flows manually on device
  - Verify QR code scanning works end-to-end
  - Verify manual setup works end-to-end
  - Verify initialization flow works correctly
  - Fix any issues or bugs discovered
  - Ask the user if questions arise

- [ ] 15. Implement error handling and user feedback
  - [~] 15.1 Create error message utilities
    - Create `lib/utils/error_messages.dart` with user-friendly error messages
    - Define messages for network errors, validation errors, permission errors
    - Follow error message guidelines from design (specific, actionable, plain language)
    - _Requirements: 9.1, 9.2, 9.3, 9.4, 9.5_
    - _Files to create: `lib/utils/error_messages.dart`_
    - _Estimate: 1 hour_
  
  - [~] 15.2 Add error handling to QRScannerScreen
    - Display specific error messages for invalid QR codes
    - Display network error messages for connection failures
    - Display permission error messages with guidance
    - Auto-dismiss error snackbars after 5 seconds
    - _Requirements: 9.1, 9.2, 9.3_
    - _Files to modify: `lib/screens/qr_scanner_screen.dart`_
    - _Estimate: 1 hour_
  
  - [~] 15.3 Add error handling to ManualSetupScreen
    - Display validation error messages inline
    - Display network error messages for connection failures
    - Provide actionable guidance in error messages
    - _Requirements: 9.1, 9.2, 9.3, 9.5_
    - _Files to modify: `lib/screens/manual_setup_screen.dart`_
    - _Estimate: 1 hour_
  
  - [~] 15.4 Add loading indicators
    - Show loading indicator during connection tests in QRScannerScreen
    - Show loading indicator during connection tests in ManualSetupScreen
    - Disable user interaction during loading states
    - _Requirements: 8.5, 8.6_
    - _Files to modify: `lib/screens/qr_scanner_screen.dart`, `lib/screens/manual_setup_screen.dart`_
    - _Estimate: 1 hour_

- [ ] 16. Add app branding and polish
  - [~] 16.1 Create app icon and splash assets
    - Design or obtain app icon (512x512 minimum)
    - Generate Android launcher icons using flutter_launcher_icons
    - Configure splash screen assets
    - Update AndroidManifest.xml with icon references
    - _Requirements: 12.3, 12.4_
    - _Files to create: `assets/icon.png`, `android/app/src/main/res/mipmap-*/ic_launcher.png`_
    - _Estimate: 2 hours_
  
  - [~] 16.2 Add constants and helper utilities
    - Create `lib/utils/constants.dart` with app-wide constants
    - Create `lib/utils/helpers.dart` with helper functions
    - Add any reusable utility functions discovered during implementation
    - _Requirements: None (code organization)_
    - _Files to create: `lib/utils/constants.dart`, `lib/utils/helpers.dart`_
    - _Estimate: 1 hour_

- [ ] 17. Write comprehensive unit tests
  - [ ]* 17.1 Write unit tests for ApiConfig model
    - Test toJson() and fromJson() methods
    - Test isValid() method with valid and invalid data
    - Test edge cases (empty strings, null values)
    - _Files to modify: `test/models/api_config_test.dart`_
    - _Estimate: 1 hour_
  
  - [ ]* 17.2 Write unit tests for validators
    - Test isValidHttpUrl() with various valid and invalid URLs
    - Test isValidWsUrl() with various valid and invalid URLs
    - Test ApiConfigValidator with complete and incomplete configs
    - Test edge cases (empty strings, special characters, very long URLs)
    - _Files to modify: `test/utils/validators_test.dart`_
    - _Estimate: 1.5 hours_
  
  - [ ]* 17.3 Write unit tests for StorageService
    - Test saveApiConfig() and getApiConfig() methods
    - Test hasConfig() method
    - Test clearAll() method
    - Test handling of corrupted data
    - Test null return when no config exists
    - _Files to modify: `test/services/storage_service_test.dart`_
    - _Estimate: 1.5 hours_
  
  - [ ]* 17.4 Write unit tests for ApiService
    - Test testConnection() with successful responses
    - Test testConnection() with various error conditions
    - Test timeout handling
    - Mock Dio for all tests
    - _Files to modify: `test/services/api_service_test.dart`_
    - _Estimate: 1.5 hours_

- [ ] 18. Write backend and frontend tests
  - [~]* 18.1 Write backend unit tests for server-info endpoint
    - Test GET /api/server-info returns correct structure
    - Test IP address is not localhost
    - Test error handling when network interfaces unavailable
    - Test response includes all required fields
    - _Files to create/modify: `test/routes/server-info.test.js`_
    - _Estimate: 1.5 hours_
  
  - [ ]* 18.2 Write frontend unit tests for useServerInfo hook
    - Test hook fetches server info on mount
    - Test loading and error states
    - Test refresh functionality
    - Mock fetch API for all tests
    - _Files to create: `frontend/src/hooks/__tests__/useServerInfo.test.js`_
    - _Estimate: 1 hour_
  
  - [ ]* 18.3 Write frontend unit tests for QRCodeModal
    - Test modal renders QR code when server info available
    - Test modal shows loading state
    - Test modal shows error state
    - Test auto-refresh mechanism
    - Test close functionality
    - _Files to modify: `frontend/src/components/__tests__/QRCodeModal.test.jsx`_
    - _Estimate: 1.5 hours_

- [ ] 19. End-to-end integration testing
  - [ ]* 19.1 Write end-to-end test for QR code flow
    - Start backend server
    - Open web frontend and generate QR code
    - Simulate mobile app scanning QR code
    - Verify config saved correctly
    - Verify navigation to dashboard
    - _Files to create: `integration_test/e2e_qr_flow_test.dart`_
    - _Estimate: 2 hours_
  
  - [ ]* 19.2 Write end-to-end test for manual setup flow
    - Start backend server
    - Open mobile app manual setup screen
    - Enter valid URLs
    - Verify connection test succeeds
    - Verify config saved correctly
    - Verify navigation to dashboard
    - _Files to create: `integration_test/e2e_manual_setup_test.dart`_
    - _Estimate: 1.5 hours_
  
  - [ ]* 19.3 Write end-to-end test for initialization flow
    - Test app launch with existing config
    - Test app launch without config
    - Verify correct screen displayed in each case
    - _Files to modify: `integration_test/initialization_test.dart`_
    - _Estimate: 1 hour_

- [~] 20. Final checkpoint and polish
  - Run complete test suite (unit, property, integration, e2e)
  - Verify all 11 correctness properties pass
  - Test on multiple Android devices/emulators
  - Test with different screen sizes
  - Verify error messages are clear and helpful
  - Verify loading states work correctly
  - Verify animations and transitions are smooth
  - Check accessibility (touch targets, contrast, screen reader)
  - Review code for security issues
  - Ensure all requirements are met
  - Ask the user if questions arise

- [ ] 21. Documentation and build preparation
  - [~] 21.1 Update README with setup instructions
    - Document Flutter project setup
    - Document backend setup for server-info endpoint
    - Document web frontend setup for QR code generator
    - Add troubleshooting section
    - _Requirements: None (documentation)_
    - _Files to modify: `README.md` or create `agent_malas_mobile/README.md`_
    - _Estimate: 1 hour_
  
  - [~] 21.2 Configure release build settings
    - Create keystore for app signing (development)
    - Configure `android/key.properties` (template only, not committed)
    - Update `android/app/build.gradle` for release signing
    - Set version in `pubspec.yaml` to 1.0.0+1
    - _Requirements: None (build preparation)_
    - _Files to modify: `android/app/build.gradle`, `pubspec.yaml`_
    - _Estimate: 1 hour_
  
  - [~] 21.3 Test release build
    - Build release APK: `flutter build apk --release`
    - Install on physical device
    - Test complete user flows on release build
    - Verify performance is acceptable
    - Verify no debug artifacts present
    - _Requirements: 1.4_
    - _Estimate: 1 hour_

## Notes

- Tasks marked with `*` are optional testing tasks and can be skipped for faster MVP delivery
- Each task references specific requirements for traceability
- Checkpoints (tasks 9, 14, 20) ensure incremental validation and provide opportunities for user feedback
- Property tests validate universal correctness properties across randomized inputs
- Unit tests validate specific examples, edge cases, and error conditions
- Integration tests validate complete user flows
- The implementation follows an incremental approach where each task builds on previous work
- All code should be tested before moving to the next task
- Estimated total time: ~70 hours for full implementation including all optional tests
- Estimated MVP time (skipping optional tests): ~45 hours

## Requirements Coverage

All 12 requirements from the requirements document are covered by implementation tasks:

- Requirement 1 (Flutter Project Initialization): Tasks 1, 5, 16
- Requirement 2 (QR Code Generation): Tasks 2, 3
- Requirement 3 (QR Scanning and Validation): Tasks 4, 8, 10
- Requirement 4 (Camera Permissions): Task 10.4
- Requirement 5 (Manual Configuration): Tasks 8, 11
- Requirement 6 (Configuration Storage): Tasks 6, 13
- Requirement 7 (Initialization Flow): Tasks 12, 13
- Requirement 8 (Connection Testing): Tasks 7, 10, 11, 15
- Requirement 9 (Error Feedback): Task 15
- Requirement 10 (Backend Server Info): Task 2
- Requirement 11 (QR Component Integration): Task 3
- Requirement 12 (Theme and Branding): Tasks 5, 16

## Property Test Coverage

All 11 correctness properties from the design document are implemented:

- Property 1: QR Code Generation Produces Valid API Config (Task 3.3)
- Property 2: Local IP Detection Excludes Localhost (Task 2.3)
- Property 3: Server Info Endpoint Returns Complete Data (Task 2.2)
- Property 4: API Config Serialization Round Trip (Task 4.2)
- Property 5: API Config Validation Rejects Invalid Data (Task 8.4)
- Property 6: URL Format Validation (Task 8.2)
- Property 7: Storage Service Round Trip (Task 6.2)
- Property 8: Connection Test Success Recognition (Task 7.2)
- Property 9: Connection Test Failure Recognition (Task 7.3)
- Property 10: QR Code Data Integrity (Covered by integration test 19.1)
- Property 11: Empty Storage Returns Null (Task 6.4)
