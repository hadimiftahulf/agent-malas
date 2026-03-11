/// Helper utility functions for common operations
///
/// This library provides reusable helper functions for UI operations,
/// data formatting, and other common tasks throughout the app.
library;

import 'package:flutter/material.dart';
import 'package:intl/intl.dart';

/// Helper functions for displaying snackbar messages
class SnackbarHelper {
  /// Show an error snackbar with red background
  ///
  /// [context] - BuildContext for showing the snackbar
  /// [message] - Error message to display
  /// [duration] - Optional duration (defaults to 5 seconds)
  static void showError(
    BuildContext context,
    String message, {
    Duration duration = const Duration(seconds: 5),
  }) {
    if (!context.mounted) return;

    ScaffoldMessenger.of(context).showSnackBar(
      SnackBar(
        content: Text(message),
        backgroundColor: Colors.red,
        duration: duration,
        behavior: SnackBarBehavior.floating,
      ),
    );
  }

  /// Show a success snackbar with green background
  ///
  /// [context] - BuildContext for showing the snackbar
  /// [message] - Success message to display
  /// [duration] - Optional duration (defaults to 3 seconds)
  static void showSuccess(
    BuildContext context,
    String message, {
    Duration duration = const Duration(seconds: 3),
  }) {
    if (!context.mounted) return;

    ScaffoldMessenger.of(context).showSnackBar(
      SnackBar(
        content: Text(message),
        backgroundColor: Colors.green,
        duration: duration,
        behavior: SnackBarBehavior.floating,
      ),
    );
  }

  /// Show an info snackbar with default theme color
  ///
  /// [context] - BuildContext for showing the snackbar
  /// [message] - Info message to display
  /// [duration] - Optional duration (defaults to 3 seconds)
  static void showInfo(
    BuildContext context,
    String message, {
    Duration duration = const Duration(seconds: 3),
  }) {
    if (!context.mounted) return;

    ScaffoldMessenger.of(context).showSnackBar(
      SnackBar(
        content: Text(message),
        duration: duration,
        behavior: SnackBarBehavior.floating,
      ),
    );
  }

  /// Show a warning snackbar with orange background
  ///
  /// [context] - BuildContext for showing the snackbar
  /// [message] - Warning message to display
  /// [duration] - Optional duration (defaults to 4 seconds)
  static void showWarning(
    BuildContext context,
    String message, {
    Duration duration = const Duration(seconds: 4),
  }) {
    if (!context.mounted) return;

    ScaffoldMessenger.of(context).showSnackBar(
      SnackBar(
        content: Text(message),
        backgroundColor: Colors.orange,
        duration: duration,
        behavior: SnackBarBehavior.floating,
      ),
    );
  }
}

/// Helper functions for date and time formatting
class DateTimeHelper {
  /// Format timestamp to human-readable date string
  ///
  /// Example: 1704067200000 -> "Jan 1, 2024"
  static String formatDate(int timestamp) {
    final date = DateTime.fromMillisecondsSinceEpoch(timestamp);
    return DateFormat('MMM d, y').format(date);
  }

  /// Format timestamp to human-readable date and time string
  ///
  /// Example: 1704067200000 -> "Jan 1, 2024 12:00 PM"
  static String formatDateTime(int timestamp) {
    final date = DateTime.fromMillisecondsSinceEpoch(timestamp);
    return DateFormat('MMM d, y h:mm a').format(date);
  }

  /// Format timestamp to time string
  ///
  /// Example: 1704067200000 -> "12:00 PM"
  static String formatTime(int timestamp) {
    final date = DateTime.fromMillisecondsSinceEpoch(timestamp);
    return DateFormat('h:mm a').format(date);
  }

  /// Get relative time string (e.g., "2 hours ago", "just now")
  static String getRelativeTime(int timestamp) {
    final date = DateTime.fromMillisecondsSinceEpoch(timestamp);
    final now = DateTime.now();
    final difference = now.difference(date);

    if (difference.inSeconds < 60) {
      return 'just now';
    } else if (difference.inMinutes < 60) {
      final minutes = difference.inMinutes;
      return '$minutes ${minutes == 1 ? 'minute' : 'minutes'} ago';
    } else if (difference.inHours < 24) {
      final hours = difference.inHours;
      return '$hours ${hours == 1 ? 'hour' : 'hours'} ago';
    } else if (difference.inDays < 7) {
      final days = difference.inDays;
      return '$days ${days == 1 ? 'day' : 'days'} ago';
    } else {
      return formatDate(timestamp);
    }
  }

  /// Check if timestamp is today
  static bool isToday(int timestamp) {
    final date = DateTime.fromMillisecondsSinceEpoch(timestamp);
    final now = DateTime.now();
    return date.year == now.year &&
        date.month == now.month &&
        date.day == now.day;
  }

  /// Get current timestamp in milliseconds
  static int getCurrentTimestamp() {
    return DateTime.now().millisecondsSinceEpoch;
  }
}

/// Helper functions for URL manipulation
class UrlHelper {
  /// Extract host from URL
  ///
  /// Example: "http://192.168.1.50:3001" -> "192.168.1.50"
  static String? extractHost(String url) {
    try {
      final uri = Uri.parse(url);
      return uri.host;
    } catch (e) {
      return null;
    }
  }

  /// Extract port from URL
  ///
  /// Example: "http://192.168.1.50:3001" -> 3001
  static int? extractPort(String url) {
    try {
      final uri = Uri.parse(url);
      return uri.port;
    } catch (e) {
      return null;
    }
  }

  /// Extract scheme from URL
  ///
  /// Example: "http://192.168.1.50:3001" -> "http"
  static String? extractScheme(String url) {
    try {
      final uri = Uri.parse(url);
      return uri.scheme;
    } catch (e) {
      return null;
    }
  }

  /// Build URL from components
  ///
  /// Example: buildUrl('http', '192.168.1.50', 3001, '/api') -> "http://192.168.1.50:3001/api"
  static String buildUrl(
    String scheme,
    String host, {
    int? port,
    String? path,
  }) {
    final buffer = StringBuffer();
    buffer.write('$scheme://');
    buffer.write(host);

    if (port != null) {
      buffer.write(':$port');
    }

    if (path != null && path.isNotEmpty) {
      if (!path.startsWith('/')) {
        buffer.write('/');
      }
      buffer.write(path);
    }

    return buffer.toString();
  }

  /// Check if URL is localhost
  static bool isLocalhost(String url) {
    final host = extractHost(url);
    if (host == null) return false;

    return host == 'localhost' ||
        host == '127.0.0.1' ||
        host == '::1' ||
        host == '0.0.0.0';
  }

  /// Check if URL is local network address
  static bool isLocalNetwork(String url) {
    final host = extractHost(url);
    if (host == null) return false;

    return host.startsWith('192.168.') ||
        host.startsWith('10.') ||
        host.startsWith('172.16.') ||
        host.startsWith('172.17.') ||
        host.startsWith('172.18.') ||
        host.startsWith('172.19.') ||
        host.startsWith('172.20.') ||
        host.startsWith('172.21.') ||
        host.startsWith('172.22.') ||
        host.startsWith('172.23.') ||
        host.startsWith('172.24.') ||
        host.startsWith('172.25.') ||
        host.startsWith('172.26.') ||
        host.startsWith('172.27.') ||
        host.startsWith('172.28.') ||
        host.startsWith('172.29.') ||
        host.startsWith('172.30.') ||
        host.startsWith('172.31.');
  }
}

/// Helper functions for navigation
class NavigationHelper {
  /// Navigate to a new screen with replacement (no back button)
  static void navigateReplacement(
    BuildContext context,
    Widget screen,
  ) {
    Navigator.of(context).pushReplacement(
      MaterialPageRoute(builder: (context) => screen),
    );
  }

  /// Navigate to a new screen (with back button)
  static void navigate(
    BuildContext context,
    Widget screen,
  ) {
    Navigator.of(context).push(
      MaterialPageRoute(builder: (context) => screen),
    );
  }

  /// Navigate back to previous screen
  static void goBack(BuildContext context) {
    if (Navigator.of(context).canPop()) {
      Navigator.of(context).pop();
    }
  }

  /// Navigate to a new screen and remove all previous screens
  static void navigateAndRemoveAll(
    BuildContext context,
    Widget screen,
  ) {
    Navigator.of(context).pushAndRemoveUntil(
      MaterialPageRoute(builder: (context) => screen),
      (route) => false,
    );
  }
}

/// Helper functions for string manipulation
class StringHelper {
  /// Truncate string to specified length with ellipsis
  ///
  /// Example: truncate("Hello World", 8) -> "Hello..."
  static String truncate(String text, int maxLength) {
    if (text.length <= maxLength) {
      return text;
    }
    return '${text.substring(0, maxLength)}...';
  }

  /// Check if string is empty or contains only whitespace
  static bool isBlank(String? text) {
    return text == null || text.trim().isEmpty;
  }

  /// Capitalize first letter of string
  ///
  /// Example: capitalize("hello") -> "Hello"
  static String capitalize(String text) {
    if (text.isEmpty) return text;
    return text[0].toUpperCase() + text.substring(1);
  }

  /// Convert string to title case
  ///
  /// Example: toTitleCase("hello world") -> "Hello World"
  static String toTitleCase(String text) {
    if (text.isEmpty) return text;

    return text.split(' ').map((word) {
      if (word.isEmpty) return word;
      return word[0].toUpperCase() + word.substring(1).toLowerCase();
    }).join(' ');
  }

  /// Remove all whitespace from string
  static String removeWhitespace(String text) {
    return text.replaceAll(RegExp(r'\s+'), '');
  }

  /// Check if string contains only digits
  static bool isNumeric(String text) {
    return RegExp(r'^\d+$').hasMatch(text);
  }
}

/// Helper functions for color manipulation
class ColorHelper {
  /// Create color from hex string
  ///
  /// Example: fromHex("#FF5733") -> Color(0xFFFF5733)
  static Color fromHex(String hexString) {
    final buffer = StringBuffer();
    if (hexString.length == 6 || hexString.length == 7) buffer.write('ff');
    buffer.write(hexString.replaceFirst('#', ''));
    return Color(int.parse(buffer.toString(), radix: 16));
  }

  /// Convert color to hex string
  ///
  /// Example: toHex(Color(0xFFFF5733)) -> "#FF5733"
  static String toHex(Color color) {
    return '#${color.value.toRadixString(16).substring(2).toUpperCase()}';
  }

  /// Get contrasting text color (black or white) for background
  static Color getContrastingTextColor(Color backgroundColor) {
    // Calculate relative luminance
    final luminance = backgroundColor.computeLuminance();

    // Return white for dark backgrounds, black for light backgrounds
    return luminance > 0.5 ? Colors.black : Colors.white;
  }
}

/// Helper functions for async operations
class AsyncHelper {
  /// Execute function with delay
  static Future<void> delayed(
    Duration duration,
    Function() callback,
  ) async {
    await Future.delayed(duration);
    callback();
  }

  /// Execute function with retry logic
  ///
  /// Retries the function up to [maxRetries] times with [delay] between attempts
  static Future<T> retry<T>(
    Future<T> Function() function, {
    int maxRetries = 3,
    Duration delay = const Duration(seconds: 1),
  }) async {
    int attempts = 0;

    while (true) {
      try {
        return await function();
      } catch (e) {
        attempts++;
        if (attempts >= maxRetries) {
          rethrow;
        }
        await Future.delayed(delay);
      }
    }
  }
}
