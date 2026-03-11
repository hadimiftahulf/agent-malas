/// Application-wide constants
///
/// This library provides centralized constants used throughout the mobile app
/// for UI dimensions, durations, colors, and other reusable values.
library;

/// UI dimension constants
class UIDimensions {
  /// Standard padding for screen edges
  static const double screenPadding = 24.0;
  
  /// Standard spacing between elements
  static const double standardSpacing = 16.0;
  
  /// Small spacing between related elements
  static const double smallSpacing = 8.0;
  
  /// Large spacing between sections
  static const double largeSpacing = 32.0;
  
  /// Button padding (horizontal)
  static const double buttonPaddingHorizontal = 32.0;
  
  /// Button padding (vertical)
  static const double buttonPaddingVertical = 16.0;
  
  /// Border radius for rounded corners
  static const double borderRadius = 8.0;
  
  /// Border radius for cards
  static const double cardBorderRadius = 12.0;
  
  /// Icon size for large icons
  static const double largeIconSize = 80.0;
  
  /// Icon size for standard icons
  static const double standardIconSize = 24.0;
  
  /// App logo size on splash screen
  static const double splashLogoSize = 128.0;
  
  /// QR scanner overlay size (as fraction of screen width)
  static const double scanAreaSizeFraction = 0.7;
  
  /// QR scanner corner marker length
  static const double scanCornerLength = 30.0;
  
  /// QR scanner corner radius
  static const double scanCornerRadius = 12.0;
  
  /// QR scanner corner stroke width
  static const double scanCornerStrokeWidth = 4.0;
  
  /// QR scanner border stroke width
  static const double scanBorderStrokeWidth = 2.0;
}

/// Duration constants for animations and delays
class AppDurations {
  /// Minimum splash screen display duration
  static const Duration splashMinDuration = Duration(seconds: 1);
  
  /// Error message auto-dismiss duration
  static const Duration errorMessageDuration = Duration(seconds: 5);
  
  /// Success message auto-dismiss duration
  static const Duration successMessageDuration = Duration(seconds: 3);
  
  /// Delay before resetting processing state
  static const Duration processingResetDelay = Duration(milliseconds: 500);
  
  /// Delay before navigation after success
  static const Duration navigationDelay = Duration(milliseconds: 500);
  
  /// QR code refresh interval in web frontend
  static const Duration qrRefreshInterval = Duration(seconds: 30);
  
  /// Connection test timeout
  static const Duration connectionTimeout = Duration(seconds: 5);
}

/// Opacity constants for overlays and effects
class AppOpacity {
  /// Semi-transparent overlay opacity
  static const double overlay = 0.5;
  
  /// Dark overlay opacity
  static const double darkOverlay = 0.7;
  
  /// Scan border opacity
  static const double scanBorder = 0.5;
}

/// Storage keys for SharedPreferences
class StorageKeys {
  /// Key for storing API configuration
  static const String apiConfig = 'api_config';
  
  /// Key for storing user preferences (future use)
  static const String userPreferences = 'user_preferences';
  
  /// Key for storing theme mode (future use)
  static const String themeMode = 'theme_mode';
}

/// API endpoint paths
class ApiEndpoints {
  /// Server information endpoint
  static const String serverInfo = '/api/server-info';
  
  /// Approval endpoints (future use)
  static const String approvals = '/api/approval';
  static const String pendingApprovals = '/api/approval/pending';
  
  /// WebSocket endpoint path
  static const String websocket = '/ws';
}

/// Default values
class DefaultValues {
  /// Default device name for server
  static const String deviceName = 'Agent Malas Server';
  
  /// Default connection timeout in milliseconds
  static const int connectionTimeoutMs = 5000;
  
  /// Default max retry attempts
  static const int maxRetries = 3;
}

/// Regular expressions for validation
class ValidationPatterns {
  /// IPv4 address pattern
  static final RegExp ipv4Pattern = RegExp(
    r'^(\d{1,3}\.){3}\d{1,3}$',
  );
  
  /// Port number pattern
  static final RegExp portPattern = RegExp(
    r'^([1-9][0-9]{0,4}|[1-5][0-9]{4}|6[0-4][0-9]{3}|65[0-4][0-9]{2}|655[0-2][0-9]|6553[0-5])$',
  );
  
  /// HTTP/HTTPS URL scheme pattern
  static final RegExp httpSchemePattern = RegExp(
    r'^https?://',
    caseSensitive: false,
  );
  
  /// WebSocket URL scheme pattern
  static final RegExp wsSchemePattern = RegExp(
    r'^wss?://',
    caseSensitive: false,
  );
}

/// Text constants for UI labels and messages
class UIText {
  /// App name
  static const String appName = 'Agent Malas Mobile';
  
  /// Screen titles
  static const String qrScannerTitle = 'QR Scanner';
  static const String manualSetupTitle = 'Manual Setup';
  static const String dashboardTitle = 'Agent Malas';
  
  /// Button labels
  static const String manualSetupButton = 'Manual Setup';
  static const String connectButton = 'Connect';
  static const String openSettingsButton = 'Open Settings';
  static const String tryAgainButton = 'Try Again';
  static const String closeButton = 'Close';
  
  /// Instruction text
  static const String scanInstruction = 'Scan QR code from web app';
  static const String testingConnection = 'Testing connection...';
  
  /// Permission messages
  static const String cameraAccessRequired = 'Camera Access Required';
  static const String cameraAccessMessage = 
      'Camera access is required to scan QR codes. You can use manual setup as an alternative.';
  
  /// Form labels
  static const String apiUrlLabel = 'API URL';
  static const String wsUrlLabel = 'WebSocket URL';
  static const String apiUrlHint = 'http://192.168.1.50:3001';
  static const String wsUrlHint = 'ws://192.168.1.50:3001/ws';
  
  /// Status messages
  static const String comingSoon = 'Coming Soon';
  static const String connectionStatus = 'Connection Status';
  static const String connected = 'Connected';
  static const String disconnected = 'Disconnected';
}
