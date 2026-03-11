/// Application-wide configuration constants
///
/// This class contains static constants used throughout the app for
/// configuration values like timeouts, retry limits, and app metadata.
class AppConfig {
  /// The display name of the application
  static const String appName = 'Agent Malas Mobile';

  /// The current version of the application
  static const String appVersion = '1.0.0';

  /// Connection timeout in milliseconds for HTTP requests
  static const int connectionTimeout = 5000;

  /// Maximum number of retry attempts for failed operations
  static const int maxRetries = 3;
}
