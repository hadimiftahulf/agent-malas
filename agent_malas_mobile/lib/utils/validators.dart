/// Validation utilities for URL formats and API configuration
library;

/// Validates if a string is a properly formatted HTTP or HTTPS URL
///
/// Returns true if the URL:
/// - Starts with http:// or https://
/// - Has a valid host (not empty)
/// - Has proper URL format
///
/// Example:
/// ```dart
/// isValidHttpUrl('http://192.168.1.50:3001') // true
/// isValidHttpUrl('https://example.com') // true
/// isValidHttpUrl('ftp://example.com') // false
/// isValidHttpUrl('not a url') // false
/// ```
bool isValidHttpUrl(String url) {
  if (url.isEmpty) {
    return false;
  }

  try {
    final uri = Uri.parse(url);
    
    // Check scheme is http or https
    if (uri.scheme != 'http' && uri.scheme != 'https') {
      return false;
    }
    
    // Check host is present and not empty
    if (uri.host.isEmpty) {
      return false;
    }
    
    return true;
  } catch (e) {
    // Invalid URL format
    return false;
  }
}

/// Validates if a string is a properly formatted WebSocket URL (WS or WSS)
///
/// Returns true if the URL:
/// - Starts with ws:// or wss://
/// - Has a valid host (not empty)
/// - Has proper URL format
///
/// Example:
/// ```dart
/// isValidWsUrl('ws://192.168.1.50:3001/ws') // true
/// isValidWsUrl('wss://example.com/socket') // true
/// isValidWsUrl('http://example.com') // false
/// isValidWsUrl('not a url') // false
/// ```
bool isValidWsUrl(String url) {
  if (url.isEmpty) {
    return false;
  }

  try {
    final uri = Uri.parse(url);
    
    // Check scheme is ws or wss
    if (uri.scheme != 'ws' && uri.scheme != 'wss') {
      return false;
    }
    
    // Check host is present and not empty
    if (uri.host.isEmpty) {
      return false;
    }
    
    return true;
  } catch (e) {
    // Invalid URL format
    return false;
  }
}

/// Result of API configuration validation
///
/// Contains validation status and list of specific errors found
class ValidationResult {
  /// Whether the validation passed (no errors)
  final bool isValid;
  
  /// List of error messages describing validation failures
  final List<String> errors;
  
  ValidationResult({
    required this.isValid,
    required this.errors,
  });
  
  /// Creates a successful validation result with no errors
  ValidationResult.success() : isValid = true, errors = const [];
  
  /// Creates a failed validation result with error messages
  ValidationResult.failure(this.errors) : isValid = false;
}

/// Validator for API configuration JSON objects
///
/// Validates that a JSON object contains all required fields for API configuration
/// and that URL fields are properly formatted.
class ApiConfigValidator {
  /// Validates an API configuration JSON object
  ///
  /// Checks that the JSON contains all required fields:
  /// - apiUrl: Must be present and a valid HTTP/HTTPS URL
  /// - wsUrl: Must be present and a valid WS/WSS URL
  /// - deviceName: Must be present and non-empty
  /// - timestamp: Must be present
  ///
  /// Returns a [ValidationResult] with:
  /// - isValid: true if all validations pass, false otherwise
  /// - errors: List of specific error messages for each validation failure
  ///
  /// Example:
  /// ```dart
  /// final json = {
  ///   'apiUrl': 'http://192.168.1.50:3001',
  ///   'wsUrl': 'ws://192.168.1.50:3001/ws',
  ///   'deviceName': 'Agent Malas Server',
  ///   'timestamp': 1704067200000
  /// };
  /// final result = ApiConfigValidator.validate(json);
  /// if (result.isValid) {
  ///   print('Valid configuration');
  /// } else {
  ///   print('Errors: ${result.errors}');
  /// }
  /// ```
  static ValidationResult validate(Map<String, dynamic> json) {
    final errors = <String>[];
    
    // Check for apiUrl field
    if (!json.containsKey('apiUrl')) {
      errors.add('Missing API URL');
    } else {
      final apiUrl = json['apiUrl'];
      if (apiUrl == null || apiUrl.toString().isEmpty) {
        errors.add('API URL is empty');
      } else if (!isValidHttpUrl(apiUrl.toString())) {
        errors.add('Invalid API URL format');
      }
    }
    
    // Check for wsUrl field
    if (!json.containsKey('wsUrl')) {
      errors.add('Missing WebSocket URL');
    } else {
      final wsUrl = json['wsUrl'];
      if (wsUrl == null || wsUrl.toString().isEmpty) {
        errors.add('WebSocket URL is empty');
      } else if (!isValidWsUrl(wsUrl.toString())) {
        errors.add('Invalid WebSocket URL format');
      }
    }
    
    // Check for deviceName field
    if (!json.containsKey('deviceName')) {
      errors.add('Missing device name');
    } else {
      final deviceName = json['deviceName'];
      if (deviceName == null || deviceName.toString().trim().isEmpty) {
        errors.add('Device name is empty');
      }
    }
    
    // Check for timestamp field
    if (!json.containsKey('timestamp')) {
      errors.add('Missing timestamp');
    }
    
    return ValidationResult(
      isValid: errors.isEmpty,
      errors: errors,
    );
  }
}
