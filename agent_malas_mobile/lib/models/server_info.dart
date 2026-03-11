/// Server Information model for backend server details
///
/// This model represents server information returned from the
/// `/api/server-info` endpoint. It's used internally by the mobile app
/// to fetch server details for QR code generation and connection setup.
class ServerInfo {
  /// Server's local network IP address
  final String ipAddress;

  /// Server's HTTP port number
  final int port;

  /// Unix timestamp in milliseconds when info was retrieved
  final int timestamp;

  ServerInfo({
    required this.ipAddress,
    required this.port,
    required this.timestamp,
  });

  /// Convert ServerInfo to JSON
  Map<String, dynamic> toJson() {
    return {
      'ipAddress': ipAddress,
      'port': port,
      'timestamp': timestamp,
    };
  }

  /// Create ServerInfo from JSON
  factory ServerInfo.fromJson(Map<String, dynamic> json) {
    return ServerInfo(
      ipAddress: json['ipAddress'] as String,
      port: json['port'] as int,
      timestamp: json['timestamp'] as int,
    );
  }

  @override
  String toString() {
    return 'ServerInfo(ipAddress: $ipAddress, port: $port, timestamp: $timestamp)';
  }

  @override
  bool operator ==(Object other) {
    if (identical(this, other)) return true;

    return other is ServerInfo &&
        other.ipAddress == ipAddress &&
        other.port == port &&
        other.timestamp == timestamp;
  }

  @override
  int get hashCode {
    return ipAddress.hashCode ^ port.hashCode ^ timestamp.hashCode;
  }
}
