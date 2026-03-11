/// API Configuration model for server connection details
///
/// This model represents the configuration data scanned from QR codes
/// or entered manually for connecting to the Agent Malas backend server.
class ApiConfig {
  /// HTTP/HTTPS endpoint for REST API
  final String apiUrl;

  /// WebSocket endpoint for real-time communication
  final String wsUrl;

  /// Human-readable server name
  final String deviceName;

  /// Unix timestamp in milliseconds when config was created
  final int timestamp;

  ApiConfig({
    required this.apiUrl,
    required this.wsUrl,
    required this.deviceName,
    required this.timestamp,
  });

  /// Convert ApiConfig to JSON for storage
  Map<String, dynamic> toJson() {
    return {
      'apiUrl': apiUrl,
      'wsUrl': wsUrl,
      'deviceName': deviceName,
      'timestamp': timestamp,
    };
  }

  /// Create ApiConfig from JSON
  factory ApiConfig.fromJson(Map<String, dynamic> json) {
    return ApiConfig(
      apiUrl: json['apiUrl'] as String,
      wsUrl: json['wsUrl'] as String,
      deviceName: json['deviceName'] as String,
      timestamp: json['timestamp'] as int,
    );
  }

  /// Validate that all required fields are present and properly formatted
  bool isValid() {
    // Check all fields are non-empty
    if (apiUrl.trim().isEmpty) return false;
    if (wsUrl.trim().isEmpty) return false;
    if (deviceName.trim().isEmpty) return false;
    if (timestamp <= 0) return false;

    // Validate URL formats
    final apiUri = Uri.tryParse(apiUrl);
    if (apiUri == null) return false;
    if (!['http', 'https'].contains(apiUri.scheme)) return false;
    if (apiUri.host.isEmpty) return false;

    final wsUri = Uri.tryParse(wsUrl);
    if (wsUri == null) return false;
    if (!['ws', 'wss'].contains(wsUri.scheme)) return false;
    if (wsUri.host.isEmpty) return false;

    return true;
  }

  @override
  String toString() {
    return 'ApiConfig(apiUrl: $apiUrl, wsUrl: $wsUrl, deviceName: $deviceName, timestamp: $timestamp)';
  }

  @override
  bool operator ==(Object other) {
    if (identical(this, other)) return true;

    return other is ApiConfig &&
        other.apiUrl == apiUrl &&
        other.wsUrl == wsUrl &&
        other.deviceName == deviceName &&
        other.timestamp == timestamp;
  }

  @override
  int get hashCode {
    return apiUrl.hashCode ^
        wsUrl.hashCode ^
        deviceName.hashCode ^
        timestamp.hashCode;
  }
}
