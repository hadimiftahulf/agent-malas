import 'dart:async';
import 'dart:convert';
import 'package:flutter/foundation.dart';
import 'package:web_socket_channel/web_socket_channel.dart';
import 'package:logger/logger.dart';

/// WebSocket event parsed from server messages
class WsEvent {
  final String type;
  final Map<String, dynamic>? data;
  WsEvent({required this.type, this.data});
}

/// Service for managing WebSocket connection to the backend server
///
/// Handles real-time communication for task approval notifications,
/// agent status updates, and task lifecycle events.
class WebSocketService {
  final String wsUrl;
  final Logger _logger = Logger(printer: SimplePrinter());

  WebSocketChannel? _channel;
  final StreamController<WsEvent> _eventController =
      StreamController<WsEvent>.broadcast();
  Timer? _reconnectTimer;
  Timer? _heartbeatTimer;
  bool _isConnected = false;
  bool _shouldReconnect = true;
  int _reconnectAttempts = 0;
  static const int _maxReconnectDelay = 30;

  WebSocketService(this.wsUrl);

  /// Stream of parsed events from the WebSocket server
  Stream<WsEvent> get eventStream => _eventController.stream;

  /// Whether the WebSocket is currently connected
  bool get isConnected => _isConnected;

  /// Connect to the WebSocket server
  Future<void> connect() async {
    _shouldReconnect = true;
    _reconnectAttempts = 0;
    await _doConnect();
  }

  Future<void> _doConnect() async {
    try {
      _channel?.sink.close();
      _channel = WebSocketChannel.connect(Uri.parse(wsUrl));

      _channel!.stream.listen(
        (message) {
          _isConnected = true;
          _reconnectAttempts = 0;
          _handleMessage(message);
        },
        onError: (error) {
          _logger.w('WebSocket error: $error');
          _isConnected = false;
          _scheduleReconnect();
        },
        onDone: () {
          _logger.i('WebSocket closed');
          _isConnected = false;
          _scheduleReconnect();
        },
      );

      _isConnected = true;
      _startHeartbeat();
      _logger.i('WebSocket connected to $wsUrl');
    } catch (e) {
      _logger.e('WebSocket connect failed: $e');
      _isConnected = false;
      _scheduleReconnect();
    }
  }

  void _handleMessage(dynamic message) {
    try {
      final data = jsonDecode(message.toString());
      if (data is Map<String, dynamic>) {
        final type = data['type']?.toString() ?? 'unknown';
        final eventData = data['data'] as Map<String, dynamic>?;
        _eventController.add(WsEvent(type: type, data: eventData ?? data));
      }
    } catch (e) {
      debugPrint('WS parse error: $e');
    }
  }

  void _startHeartbeat() {
    _heartbeatTimer?.cancel();
    _heartbeatTimer = Timer.periodic(const Duration(seconds: 25), (_) {
      if (_isConnected) {
        try {
          _channel?.sink.add(jsonEncode({'type': 'ping'}));
        } catch (_) {}
      }
    });
  }

  void _scheduleReconnect() {
    if (!_shouldReconnect) return;
    _reconnectTimer?.cancel();
    _heartbeatTimer?.cancel();

    final delay = (_reconnectAttempts < 10)
        ? _reconnectAttempts + 1
        : _maxReconnectDelay;
    _reconnectAttempts++;

    _logger.i('Reconnecting in ${delay}s (attempt $_reconnectAttempts)');
    _reconnectTimer = Timer(Duration(seconds: delay), () => _doConnect());
  }

  /// Disconnect from the WebSocket server
  void disconnect() {
    _shouldReconnect = false;
    _reconnectTimer?.cancel();
    _heartbeatTimer?.cancel();
    _channel?.sink.close();
    _isConnected = false;
    _logger.i('WebSocket disconnected');
  }

  /// Dispose resources
  void dispose() {
    disconnect();
    _eventController.close();
  }
}
