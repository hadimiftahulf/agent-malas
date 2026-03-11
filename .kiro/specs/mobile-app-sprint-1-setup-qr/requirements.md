# Requirements Document

## Introduction

This document specifies the requirements for Sprint 1 of the Agent Malas Mobile App, a Flutter-based Android application that enables users to approve or reject Agent Malas tasks from their smartphones. Sprint 1 focuses on project initialization, QR code-based server discovery, and persistent configuration storage to establish the foundation for mobile-server communication.

The mobile app connects to the existing Node.js backend server over the local network. To simplify setup and eliminate manual IP address entry, the web frontend generates a QR code containing server connection details, which the mobile app scans to automatically configure itself.

## Glossary

- **Mobile_App**: The Flutter Android application that scans QR codes and connects to the backend server
- **Web_Frontend**: The existing React-based web interface that generates QR codes for mobile setup
- **Backend_Server**: The existing Node.js Express server with SQLite database
- **QR_Generator**: The React component in the Web_Frontend that creates QR codes with server information
- **QR_Scanner**: The mobile screen that uses the device camera to scan and parse QR codes
- **Storage_Service**: The Flutter service that persists configuration data using SharedPreferences
- **API_Config**: JSON object containing apiUrl, wsUrl, deviceName, and timestamp for server connection
- **Server_Info_Endpoint**: Backend API route that provides server network information for QR code generation
- **Connection_Test**: HTTP request to verify the API URL is reachable before saving configuration

## Requirements

### Requirement 1: Flutter Project Initialization

**User Story:** As a developer, I want a properly structured Flutter project with all necessary dependencies, so that I can build the mobile app on a solid foundation.

#### Acceptance Criteria

1. THE Mobile_App SHALL be created as a new Flutter 3.x project with the specified folder structure (main.dart, config/, models/, services/, screens/, widgets/, utils/)
2. THE Mobile_App SHALL include the following dependencies in pubspec.yaml: provider, dio, web_socket_channel, mobile_scanner, shared_preferences, flutter_local_notifications, google_fonts, intl, logger
3. THE Mobile_App SHALL configure Android permissions for camera, internet, and vibration in AndroidManifest.xml
4. THE Mobile_App SHALL run successfully on an Android device or emulator without errors
5. THE Mobile_App SHALL include placeholder files for all specified folders to establish the project structure

### Requirement 2: QR Code Generation in Web Frontend

**User Story:** As a user, I want the web interface to display a QR code with server connection details, so that I can easily configure the mobile app without manual data entry.

#### Acceptance Criteria

1. THE QR_Generator SHALL create a QR code containing API_Config as a JSON string
2. THE API_Config SHALL include fields: apiUrl, wsUrl, deviceName, and timestamp
3. THE QR_Generator SHALL auto-detect the Backend_Server local network IP address for the apiUrl and wsUrl fields
4. WHEN the Backend_Server IP address changes, THE QR_Generator SHALL update the QR code automatically
5. THE Web_Frontend SHALL display a "Connect Mobile App" button or settings option that shows the QR_Generator
6. THE Server_Info_Endpoint SHALL provide the current server IP address and port to the QR_Generator

### Requirement 3: QR Code Scanning and Validation

**User Story:** As a mobile user, I want to scan a QR code to automatically configure my app, so that I can connect to the server without typing IP addresses.

#### Acceptance Criteria

1. THE QR_Scanner SHALL display a camera preview for scanning QR codes
2. WHEN a QR code is detected, THE QR_Scanner SHALL parse the JSON data into an API_Config object
3. WHEN the parsed data is not valid JSON, THE QR_Scanner SHALL display an error message "Invalid QR code format"
4. WHEN the API_Config is missing required fields (apiUrl, wsUrl, deviceName, timestamp), THE QR_Scanner SHALL display an error message "Incomplete server information"
5. WHEN a valid API_Config is parsed, THE QR_Scanner SHALL perform a Connection_Test to the apiUrl
6. IF the Connection_Test fails, THEN THE QR_Scanner SHALL display an error message "Cannot reach server at [apiUrl]"
7. WHEN the Connection_Test succeeds, THE QR_Scanner SHALL save the API_Config using the Storage_Service
8. WHEN the API_Config is successfully saved, THE QR_Scanner SHALL navigate to the dashboard screen
9. WHEN the API_Config is successfully saved, THE QR_Scanner SHALL display a success message "Connected to [deviceName]"

### Requirement 4: Camera Permission Handling

**User Story:** As a mobile user, I want clear guidance when camera permissions are needed, so that I understand why the app needs camera access and can grant it easily.

#### Acceptance Criteria

1. WHEN the QR_Scanner screen is opened and camera permission is not granted, THE Mobile_App SHALL request camera permission from the user
2. IF camera permission is denied, THEN THE QR_Scanner SHALL display a message "Camera access required to scan QR codes" with a button to open app settings
3. WHEN camera permission is granted, THE QR_Scanner SHALL activate the camera preview
4. THE QR_Scanner SHALL provide a "Manual Setup" button as an alternative to camera scanning

### Requirement 5: Manual Configuration Input

**User Story:** As a mobile user, I want to manually enter server details if QR scanning fails, so that I can still configure the app when the camera is unavailable or QR code is not readable.

#### Acceptance Criteria

1. THE QR_Scanner SHALL provide a "Manual Setup" option accessible from the scanner screen
2. WHEN "Manual Setup" is selected, THE Mobile_App SHALL display input fields for API URL and WebSocket URL
3. WHEN manual URLs are entered, THE Mobile_App SHALL validate that both URLs are properly formatted HTTP/HTTPS and WS/WSS URLs
4. IF URL validation fails, THEN THE Mobile_App SHALL display an error message "Invalid URL format"
5. WHEN valid URLs are entered, THE Mobile_App SHALL perform a Connection_Test to the API URL
6. WHEN the Connection_Test succeeds, THE Mobile_App SHALL save the API_Config using the Storage_Service
7. WHEN manual configuration is saved, THE Mobile_App SHALL navigate to the dashboard screen

### Requirement 6: Configuration Storage Service

**User Story:** As a developer, I want a storage service that persists configuration data, so that users don't need to reconfigure the app every time they open it.

#### Acceptance Criteria

1. THE Storage_Service SHALL provide a method to save API_Config to local storage using SharedPreferences
2. THE Storage_Service SHALL provide a method to load API_Config from local storage
3. WHEN no API_Config exists in local storage, THE Storage_Service load method SHALL return null
4. THE Storage_Service SHALL provide a method to clear all stored configuration data
5. THE Storage_Service SHALL persist data across app restarts
6. THE Storage_Service SHALL store API_Config as a JSON string in SharedPreferences

### Requirement 7: Application Initialization Flow

**User Story:** As a mobile user, I want the app to automatically connect to the server if I've already configured it, so that I don't need to scan the QR code every time I open the app.

#### Acceptance Criteria

1. WHEN the Mobile_App launches, THE Mobile_App SHALL check if API_Config exists in local storage using the Storage_Service
2. IF API_Config exists in local storage, THEN THE Mobile_App SHALL navigate directly to the dashboard screen
3. IF API_Config does not exist in local storage, THEN THE Mobile_App SHALL navigate to the QR_Scanner screen
4. THE Mobile_App SHALL display a splash screen during the initialization check

### Requirement 8: Connection Testing

**User Story:** As a mobile user, I want the app to verify the server is reachable before saving configuration, so that I don't save invalid connection details.

#### Acceptance Criteria

1. THE Mobile_App SHALL perform a Connection_Test by sending an HTTP GET request to the apiUrl before saving API_Config
2. THE Connection_Test SHALL have a timeout of 5 seconds
3. WHEN the Connection_Test receives a successful response (HTTP 2xx), THE Mobile_App SHALL consider the connection valid
4. WHEN the Connection_Test times out or receives an error response, THE Mobile_App SHALL consider the connection invalid
5. THE Mobile_App SHALL display a loading indicator during the Connection_Test
6. WHEN the Connection_Test is in progress, THE Mobile_App SHALL disable user interaction with configuration controls

### Requirement 9: Error Feedback and User Guidance

**User Story:** As a mobile user, I want clear error messages when something goes wrong, so that I can understand the problem and take corrective action.

#### Acceptance Criteria

1. WHEN an error occurs during QR scanning, THE Mobile_App SHALL display an error message describing the specific problem
2. WHEN a network error occurs during Connection_Test, THE Mobile_App SHALL display "Network error: Please check your connection"
3. WHEN the server is unreachable during Connection_Test, THE Mobile_App SHALL display "Cannot reach server. Please verify the server is running and on the same network"
4. THE Mobile_App SHALL dismiss error messages after 5 seconds or when the user taps them
5. THE Mobile_App SHALL provide actionable guidance in error messages (e.g., "Try manual setup" or "Check server address")

### Requirement 10: Backend Server Information Endpoint

**User Story:** As a developer, I want a backend endpoint that provides server network information, so that the QR code generator can access current connection details.

#### Acceptance Criteria

1. THE Backend_Server SHALL provide a Server_Info_Endpoint at the route /api/server-info
2. WHEN the Server_Info_Endpoint receives a GET request, THE Backend_Server SHALL return a JSON response with the server's local IP address and port
3. THE Server_Info_Endpoint response SHALL include fields: ipAddress, port, and timestamp
4. THE Backend_Server SHALL detect the local network IP address (not localhost or 127.0.0.1)
5. WHEN multiple network interfaces exist, THE Backend_Server SHALL prioritize the primary local network interface (typically 192.168.x.x or 10.x.x.x)

### Requirement 11: QR Code Component Integration

**User Story:** As a user, I want easy access to the QR code in the web interface, so that I can quickly set up my mobile device.

#### Acceptance Criteria

1. THE Web_Frontend SHALL include a "Connect Mobile App" button in the header or settings area
2. WHEN the "Connect Mobile App" button is clicked, THE Web_Frontend SHALL display a modal or page containing the QR_Generator
3. THE QR_Generator modal SHALL display the QR code with a minimum size of 256x256 pixels for easy scanning
4. THE QR_Generator modal SHALL display the server IP address and port as text below the QR code
5. THE QR_Generator modal SHALL include a "Close" button to dismiss the modal
6. THE QR_Generator SHALL refresh the QR code every 30 seconds to ensure the timestamp is current

### Requirement 12: Mobile App Theme and Branding

**User Story:** As a mobile user, I want the app to have a consistent and professional appearance, so that it feels polished and trustworthy.

#### Acceptance Criteria

1. THE Mobile_App SHALL define a theme configuration in config/theme.dart with primary and secondary colors
2. THE Mobile_App SHALL use Google Fonts for typography
3. THE Mobile_App SHALL include an app icon configured in the Android manifest
4. THE Mobile_App SHALL display a splash screen with the app logo during initialization
5. THE Mobile_App SHALL use consistent spacing, colors, and typography across all screens

