import 'package:dio/dio.dart';
import 'package:logger/logger.dart';

/// Service for handling HTTP communication with the backend server
///
/// Uses Dio client for HTTP requests with timeout configuration.
/// Provides connection testing to verify server reachability.
class ApiService {
  final Dio _dio;
  final String baseUrl;
  final Logger _logger = Logger();

  /// Creates an ApiService with the specified [baseUrl]
  ///
  /// Optionally accepts a custom [dio] instance for testing purposes.
  /// Configures timeout to 5 seconds as per requirements.
  ApiService(this.baseUrl, {Dio? dio})
      : _dio = dio ??
            Dio(BaseOptions(
              baseUrl: baseUrl,
              connectTimeout: const Duration(seconds: 5),
              receiveTimeout: const Duration(seconds: 5),
              sendTimeout: const Duration(seconds: 5),
            ));

  /// Test connection to the server
  ///
  /// Sends a GET request to the baseUrl to verify server reachability.
  /// Returns true for 2xx responses, false for any errors or timeouts.
  ///
  /// Handles:
  /// - Connection timeout
  /// - Connection errors
  /// - Non-2xx status codes
  /// - Network errors
  Future<bool> testConnection() async {
    try {
      final response = await _dio.get('');

      // Return true for successful 2xx responses
      if (response.statusCode != null &&
          response.statusCode! >= 200 &&
          response.statusCode! < 300) {
        _logger.i('Connection test successful: ${response.statusCode}');
        return true;
      }

      _logger.w('Connection test failed with status: ${response.statusCode}');
      return false;
    } on DioException catch (e) {
      // Handle specific Dio exceptions
      if (e.type == DioExceptionType.connectionTimeout) {
        _logger.w('Connection test failed: timeout');
      } else if (e.type == DioExceptionType.receiveTimeout) {
        _logger.w('Connection test failed: receive timeout');
      } else if (e.type == DioExceptionType.connectionError) {
        _logger.w('Connection test failed: connection error');
      } else {
        _logger.w('Connection test failed: ${e.type}');
      }
      return false;
    } catch (e) {
      _logger.e('Connection test failed with unexpected error: $e');
      return false;
    }
  }
}
