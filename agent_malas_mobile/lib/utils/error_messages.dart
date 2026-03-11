/// User-friendly error messages for the mobile app
///
/// This library provides centralized error messages that follow the guidelines:
/// - Be specific about what went wrong
/// - Provide actionable guidance
/// - Use plain language, avoid technical jargon
/// - Include context when helpful
/// - Offer alternatives when possible
library;

/// Error messages for network-related issues
class NetworkErrorMessages {
  /// Generic network error when the cause is unknown
  static const String generic = 
      'Network error: Please check your connection';
  
  /// Server is unreachable (connection refused, timeout, etc.)
  static const String serverUnreachable = 
      'Cannot reach server. Please verify the server is running and on the same network';
  
  /// Server is unreachable with specific URL
  static String serverUnreachableWithUrl(String url) =>
      'Cannot reach server at $url. Please verify the server is running and on the same network';
  
  /// Connection timeout
  static const String connectionTimeout = 
      'Connection timeout. Please check your network and try again';
  
  /// No internet connection
  static const String noConnection = 
      'No internet connection. Please check your network settings';
  
  /// Server not responding
  static const String serverNotResponding = 
      'Server not responding. Please try again later';
  
  /// DNS resolution failure
  static const String dnsFailure = 
      'Cannot find server address. Please check the URL and try again';
}

/// Error messages for QR code scanning issues
class QRCodeErrorMessages {
  /// Invalid QR code format (not valid JSON)
  static const String invalidFormat = 
      'Invalid QR code format. Please scan the QR code from the web interface';
  
  /// QR code is missing required fields
  static const String incompleteData = 
      'Incomplete server information. Please generate a new QR code from the web interface';
  
  /// QR code contains invalid URLs
  static const String invalidUrls = 
      'Invalid server URLs in QR code. Please generate a new QR code';
  
  /// Camera error during scanning
  static const String cameraError = 
      'Camera error. Please try again or use manual setup';
  
  /// QR code scan failed
  static const String scanFailed = 
      'Failed to scan QR code. Please try again or use manual setup';
}

/// Error messages for validation issues
class ValidationErrorMessages {
  /// Invalid URL format (generic)
  static const String invalidUrl = 
      'Invalid URL format. Please enter a valid HTTP or HTTPS address';
  
  /// Invalid API URL format
  static const String invalidApiUrl = 
      'Invalid API URL format. Please enter a valid HTTP or HTTPS address (e.g., http://192.168.1.50:3001)';
  
  /// Invalid WebSocket URL format
  static const String invalidWsUrl = 
      'Invalid WebSocket URL format. Please enter a valid WS or WSS address (e.g., ws://192.168.1.50:3001/ws)';
  
  /// Empty URL field
  static const String emptyUrl = 
      'URL cannot be empty. Please enter a server address';
  
  /// Missing required field
  static String missingField(String fieldName) =>
      '$fieldName is required. Please provide a value';
  
  /// Invalid configuration data
  static const String invalidConfig = 
      'Invalid configuration data. Please check your input and try again';
}

/// Error messages for permission-related issues
class PermissionErrorMessages {
  /// Camera permission denied
  static const String cameraDenied = 
      'Camera access required to scan QR codes. You can use manual setup as an alternative';
  
  /// Camera permission permanently denied
  static const String cameraPermanentlyDenied = 
      'Camera access is required to scan QR codes. Please enable it in app settings';
  
  /// Camera not available
  static const String cameraUnavailable = 
      'Camera is not available on this device. Please use manual setup';
  
  /// Permission request failed
  static const String permissionFailed = 
      'Failed to request permission. Please try again or use manual setup';
}

/// Error messages for storage-related issues
class StorageErrorMessages {
  /// Failed to save configuration
  static const String saveFailed = 
      'Failed to save configuration. Please try again';
  
  /// Failed to load configuration
  static const String loadFailed = 
      'Failed to load configuration. Please set up your connection again';
  
  /// Corrupted configuration data
  static const String corruptedData = 
      'Configuration data is corrupted. Please set up your connection again';
  
  /// Storage quota exceeded
  static const String quotaExceeded = 
      'Storage quota exceeded. Please free up some space and try again';
  
  /// Storage access denied
  static const String accessDenied = 
      'Cannot access storage. Please check app permissions';
}

/// Error messages for connection testing
class ConnectionTestErrorMessages {
  /// Connection test failed (generic)
  static const String testFailed = 
      'Connection test failed. Please check the server address and try again';
  
  /// Connection test timeout
  static const String testTimeout = 
      'Connection test timed out. Please check your network and server status';
  
  /// Invalid server response
  static const String invalidResponse = 
      'Invalid server response. Please verify the server is running correctly';
  
  /// Server returned error
  static String serverError(int statusCode) =>
      'Server error ($statusCode). Please check the server logs';
}

/// Error messages for general application issues
class GeneralErrorMessages {
  /// Unknown error occurred
  static const String unknown = 
      'An unexpected error occurred. Please try again';
  
  /// Feature not available
  static const String notAvailable = 
      'This feature is not available yet';
  
  /// Operation cancelled by user
  static const String cancelled = 
      'Operation cancelled';
  
  /// Operation in progress
  static const String inProgress = 
      'Operation already in progress. Please wait';
}

/// Helper class for creating contextual error messages
class ErrorMessageBuilder {
  /// Creates a network error message based on the exception type
  static String fromNetworkException(dynamic exception) {
    final message = exception.toString().toLowerCase();
    
    if (message.contains('timeout')) {
      return NetworkErrorMessages.connectionTimeout;
    } else if (message.contains('connection refused') || 
               message.contains('failed host lookup')) {
      return NetworkErrorMessages.serverUnreachable;
    } else if (message.contains('no internet') || 
               message.contains('network unreachable')) {
      return NetworkErrorMessages.noConnection;
    } else {
      return NetworkErrorMessages.generic;
    }
  }
  
  /// Creates a validation error message from a list of validation errors
  static String fromValidationErrors(List<String> errors) {
    if (errors.isEmpty) {
      return ValidationErrorMessages.invalidConfig;
    }
    
    // Return the first error for simplicity
    // In a more complex implementation, you might combine multiple errors
    return errors.first;
  }
  
  /// Creates a permission error message based on permission status
  static String fromPermissionStatus(String status) {
    switch (status.toLowerCase()) {
      case 'denied':
        return PermissionErrorMessages.cameraDenied;
      case 'permanentlydenied':
      case 'permanently_denied':
        return PermissionErrorMessages.cameraPermanentlyDenied;
      case 'restricted':
        return PermissionErrorMessages.cameraUnavailable;
      default:
        return PermissionErrorMessages.permissionFailed;
    }
  }
}
