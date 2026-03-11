import 'package:flutter_test/flutter_test.dart';
import 'package:agent_malas_mobile/utils/validators.dart';

void main() {
  group('isValidHttpUrl', () {
    test('returns true for valid HTTP URLs', () {
      expect(isValidHttpUrl('http://192.168.1.50:3001'), isTrue);
      expect(isValidHttpUrl('http://localhost:3000'), isTrue);
      expect(isValidHttpUrl('http://example.com'), isTrue);
      expect(isValidHttpUrl('http://example.com/api'), isTrue);
      expect(isValidHttpUrl('http://10.0.0.1:8080'), isTrue);
    });

    test('returns true for valid HTTPS URLs', () {
      expect(isValidHttpUrl('https://example.com'), isTrue);
      expect(isValidHttpUrl('https://api.example.com'), isTrue);
      expect(isValidHttpUrl('https://example.com:443'), isTrue);
      expect(isValidHttpUrl('https://example.com/path/to/resource'), isTrue);
    });

    test('returns false for non-HTTP/HTTPS schemes', () {
      expect(isValidHttpUrl('ftp://example.com'), isFalse);
      expect(isValidHttpUrl('ws://example.com'), isFalse);
      expect(isValidHttpUrl('wss://example.com'), isFalse);
      expect(isValidHttpUrl('file:///path/to/file'), isFalse);
    });

    test('returns false for malformed URLs', () {
      expect(isValidHttpUrl('not a url'), isFalse);
      expect(isValidHttpUrl('http://'), isFalse);
      expect(isValidHttpUrl('://example.com'), isFalse);
      expect(isValidHttpUrl(''), isFalse);
    });

    test('returns false for empty string', () {
      expect(isValidHttpUrl(''), isFalse);
    });

    test('returns false for URLs without host', () {
      expect(isValidHttpUrl('http://'), isFalse);
      expect(isValidHttpUrl('https://'), isFalse);
    });
  });

  group('isValidWsUrl', () {
    test('returns true for valid WS URLs', () {
      expect(isValidWsUrl('ws://192.168.1.50:3001'), isTrue);
      expect(isValidWsUrl('ws://localhost:3000'), isTrue);
      expect(isValidWsUrl('ws://example.com'), isTrue);
      expect(isValidWsUrl('ws://example.com/ws'), isTrue);
      expect(isValidWsUrl('ws://10.0.0.1:8080/socket'), isTrue);
    });

    test('returns true for valid WSS URLs', () {
      expect(isValidWsUrl('wss://example.com'), isTrue);
      expect(isValidWsUrl('wss://api.example.com'), isTrue);
      expect(isValidWsUrl('wss://example.com:443'), isTrue);
      expect(isValidWsUrl('wss://example.com/path/to/socket'), isTrue);
    });

    test('returns false for non-WS/WSS schemes', () {
      expect(isValidWsUrl('http://example.com'), isFalse);
      expect(isValidWsUrl('https://example.com'), isFalse);
      expect(isValidWsUrl('ftp://example.com'), isFalse);
      expect(isValidWsUrl('file:///path/to/file'), isFalse);
    });

    test('returns false for malformed URLs', () {
      expect(isValidWsUrl('not a url'), isFalse);
      expect(isValidWsUrl('ws://'), isFalse);
      expect(isValidWsUrl('://example.com'), isFalse);
      expect(isValidWsUrl(''), isFalse);
    });

    test('returns false for empty string', () {
      expect(isValidWsUrl(''), isFalse);
    });

    test('returns false for URLs without host', () {
      expect(isValidWsUrl('ws://'), isFalse);
      expect(isValidWsUrl('wss://'), isFalse);
    });
  });

  group('ApiConfigValidator', () {
    test('validates complete and valid API config', () {
      final json = {
        'apiUrl': 'http://192.168.1.50:3001',
        'wsUrl': 'ws://192.168.1.50:3001/ws',
        'deviceName': 'Agent Malas Server',
        'timestamp': 1704067200000,
      };
      
      final result = ApiConfigValidator.validate(json);
      
      expect(result.isValid, isTrue);
      expect(result.errors, isEmpty);
    });

    test('rejects config missing apiUrl', () {
      final json = {
        'wsUrl': 'ws://192.168.1.50:3001/ws',
        'deviceName': 'Agent Malas Server',
        'timestamp': 1704067200000,
      };
      
      final result = ApiConfigValidator.validate(json);
      
      expect(result.isValid, isFalse);
      expect(result.errors, contains('Missing API URL'));
    });

    test('rejects config with invalid apiUrl format', () {
      final json = {
        'apiUrl': 'not-a-url',
        'wsUrl': 'ws://192.168.1.50:3001/ws',
        'deviceName': 'Agent Malas Server',
        'timestamp': 1704067200000,
      };
      
      final result = ApiConfigValidator.validate(json);
      
      expect(result.isValid, isFalse);
      expect(result.errors, contains('Invalid API URL format'));
    });

    test('rejects config with empty apiUrl', () {
      final json = {
        'apiUrl': '',
        'wsUrl': 'ws://192.168.1.50:3001/ws',
        'deviceName': 'Agent Malas Server',
        'timestamp': 1704067200000,
      };
      
      final result = ApiConfigValidator.validate(json);
      
      expect(result.isValid, isFalse);
      expect(result.errors, contains('API URL is empty'));
    });

    test('rejects config missing wsUrl', () {
      final json = {
        'apiUrl': 'http://192.168.1.50:3001',
        'deviceName': 'Agent Malas Server',
        'timestamp': 1704067200000,
      };
      
      final result = ApiConfigValidator.validate(json);
      
      expect(result.isValid, isFalse);
      expect(result.errors, contains('Missing WebSocket URL'));
    });

    test('rejects config with invalid wsUrl format', () {
      final json = {
        'apiUrl': 'http://192.168.1.50:3001',
        'wsUrl': 'http://192.168.1.50:3001/ws',
        'deviceName': 'Agent Malas Server',
        'timestamp': 1704067200000,
      };
      
      final result = ApiConfigValidator.validate(json);
      
      expect(result.isValid, isFalse);
      expect(result.errors, contains('Invalid WebSocket URL format'));
    });

    test('rejects config with empty wsUrl', () {
      final json = {
        'apiUrl': 'http://192.168.1.50:3001',
        'wsUrl': '',
        'deviceName': 'Agent Malas Server',
        'timestamp': 1704067200000,
      };
      
      final result = ApiConfigValidator.validate(json);
      
      expect(result.isValid, isFalse);
      expect(result.errors, contains('WebSocket URL is empty'));
    });

    test('rejects config missing deviceName', () {
      final json = {
        'apiUrl': 'http://192.168.1.50:3001',
        'wsUrl': 'ws://192.168.1.50:3001/ws',
        'timestamp': 1704067200000,
      };
      
      final result = ApiConfigValidator.validate(json);
      
      expect(result.isValid, isFalse);
      expect(result.errors, contains('Missing device name'));
    });

    test('rejects config with empty deviceName', () {
      final json = {
        'apiUrl': 'http://192.168.1.50:3001',
        'wsUrl': 'ws://192.168.1.50:3001/ws',
        'deviceName': '',
        'timestamp': 1704067200000,
      };
      
      final result = ApiConfigValidator.validate(json);
      
      expect(result.isValid, isFalse);
      expect(result.errors, contains('Device name is empty'));
    });

    test('rejects config with whitespace-only deviceName', () {
      final json = {
        'apiUrl': 'http://192.168.1.50:3001',
        'wsUrl': 'ws://192.168.1.50:3001/ws',
        'deviceName': '   ',
        'timestamp': 1704067200000,
      };
      
      final result = ApiConfigValidator.validate(json);
      
      expect(result.isValid, isFalse);
      expect(result.errors, contains('Device name is empty'));
    });

    test('rejects config missing timestamp', () {
      final json = {
        'apiUrl': 'http://192.168.1.50:3001',
        'wsUrl': 'ws://192.168.1.50:3001/ws',
        'deviceName': 'Agent Malas Server',
      };
      
      final result = ApiConfigValidator.validate(json);
      
      expect(result.isValid, isFalse);
      expect(result.errors, contains('Missing timestamp'));
    });

    test('collects multiple validation errors', () {
      final json = {
        'apiUrl': 'not-a-url',
        'wsUrl': 'also-not-a-url',
      };
      
      final result = ApiConfigValidator.validate(json);
      
      expect(result.isValid, isFalse);
      expect(result.errors.length, greaterThanOrEqualTo(4));
      expect(result.errors, contains('Invalid API URL format'));
      expect(result.errors, contains('Invalid WebSocket URL format'));
      expect(result.errors, contains('Missing device name'));
      expect(result.errors, contains('Missing timestamp'));
    });

    test('accepts config with HTTPS and WSS URLs', () {
      final json = {
        'apiUrl': 'https://example.com:3001',
        'wsUrl': 'wss://example.com:3001/ws',
        'deviceName': 'Secure Server',
        'timestamp': 1704067200000,
      };
      
      final result = ApiConfigValidator.validate(json);
      
      expect(result.isValid, isTrue);
      expect(result.errors, isEmpty);
    });
  });
}
