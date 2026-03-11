import 'dart:convert';
import 'package:flutter_test/flutter_test.dart';
import 'package:agent_malas_mobile/models/api_config.dart';
import 'package:agent_malas_mobile/utils/validators.dart';

/// Unit tests for QR code parsing and validation logic
/// 
/// These tests verify that the QR scanner correctly:
/// - Parses valid JSON QR codes
/// - Rejects invalid JSON format
/// - Validates required fields
/// - Handles missing or malformed data
void main() {
  group('QR Code Parsing and Validation', () {
    test('Valid QR code JSON is parsed successfully', () {
      // Arrange
      final validJson = {
        'apiUrl': 'http://192.168.1.50:3001',
        'wsUrl': 'ws://192.168.1.50:3001/ws',
        'deviceName': 'Agent Malas Server',
        'timestamp': 1704067200000,
      };
      final qrData = jsonEncode(validJson);

      // Act
      final parsed = jsonDecode(qrData) as Map<String, dynamic>;
      final validationResult = ApiConfigValidator.validate(parsed);
      
      // Assert
      expect(validationResult.isValid, isTrue);
      expect(validationResult.errors, isEmpty);
      
      // Verify ApiConfig can be created
      final apiConfig = ApiConfig.fromJson(parsed);
      expect(apiConfig.apiUrl, equals('http://192.168.1.50:3001'));
      expect(apiConfig.wsUrl, equals('ws://192.168.1.50:3001/ws'));
      expect(apiConfig.deviceName, equals('Agent Malas Server'));
      expect(apiConfig.timestamp, equals(1704067200000));
    });

    test('Invalid JSON format throws FormatException', () {
      // Arrange
      const invalidJson = 'not valid json {';

      // Act & Assert
      expect(
        () => jsonDecode(invalidJson),
        throwsA(isA<FormatException>()),
      );
    });

    test('Missing required fields fails validation', () {
      // Arrange - missing wsUrl and timestamp
      final incompleteJson = {
        'apiUrl': 'http://192.168.1.50:3001',
        'deviceName': 'Agent Malas Server',
      };

      // Act
      final validationResult = ApiConfigValidator.validate(incompleteJson);

      // Assert
      expect(validationResult.isValid, isFalse);
      expect(validationResult.errors, isNotEmpty);
      expect(validationResult.errors, contains('Missing WebSocket URL'));
      expect(validationResult.errors, contains('Missing timestamp'));
    });

    test('Invalid URL format fails validation', () {
      // Arrange
      final invalidUrlJson = {
        'apiUrl': 'not-a-valid-url',
        'wsUrl': 'also-not-valid',
        'deviceName': 'Agent Malas Server',
        'timestamp': 1704067200000,
      };

      // Act
      final validationResult = ApiConfigValidator.validate(invalidUrlJson);

      // Assert
      expect(validationResult.isValid, isFalse);
      expect(validationResult.errors, contains('Invalid API URL format'));
      expect(validationResult.errors, contains('Invalid WebSocket URL format'));
    });

    test('Empty device name fails validation', () {
      // Arrange
      final emptyNameJson = {
        'apiUrl': 'http://192.168.1.50:3001',
        'wsUrl': 'ws://192.168.1.50:3001/ws',
        'deviceName': '   ',
        'timestamp': 1704067200000,
      };

      // Act
      final validationResult = ApiConfigValidator.validate(emptyNameJson);

      // Assert
      expect(validationResult.isValid, isFalse);
      expect(validationResult.errors, contains('Device name is empty'));
    });

    test('Wrong URL scheme fails validation', () {
      // Arrange
      final wrongSchemeJson = {
        'apiUrl': 'ftp://192.168.1.50:3001',
        'wsUrl': 'http://192.168.1.50:3001/ws',
        'deviceName': 'Agent Malas Server',
        'timestamp': 1704067200000,
      };

      // Act
      final validationResult = ApiConfigValidator.validate(wrongSchemeJson);

      // Assert
      expect(validationResult.isValid, isFalse);
      expect(validationResult.errors, contains('Invalid API URL format'));
      expect(validationResult.errors, contains('Invalid WebSocket URL format'));
    });

    test('HTTPS and WSS URLs are accepted', () {
      // Arrange
      final secureUrlsJson = {
        'apiUrl': 'https://example.com:3001',
        'wsUrl': 'wss://example.com:3001/ws',
        'deviceName': 'Secure Server',
        'timestamp': 1704067200000,
      };

      // Act
      final validationResult = ApiConfigValidator.validate(secureUrlsJson);

      // Assert
      expect(validationResult.isValid, isTrue);
      expect(validationResult.errors, isEmpty);
    });
  });
}
