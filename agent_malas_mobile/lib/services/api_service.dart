import 'package:dio/dio.dart';
import 'package:logger/logger.dart';
import '../models/dashboard_data.dart';
import '../models/task_item.dart';
import '../models/approval_item.dart';

/// Service for handling HTTP communication with the backend server
///
/// Uses Dio client for HTTP requests with timeout configuration.
/// Provides connection testing, dashboard data, task queue,
/// approval workflow, and health endpoints.
class ApiService {
  final Dio _dio;
  final String baseUrl;
  final Logger _logger = Logger(printer: SimplePrinter());

  /// Creates an ApiService with the specified [baseUrl]
  ApiService(this.baseUrl, {Dio? dio})
      : _dio = dio ??
            Dio(BaseOptions(
              baseUrl: baseUrl,
              connectTimeout: const Duration(seconds: 5),
              receiveTimeout: const Duration(seconds: 10),
              sendTimeout: const Duration(seconds: 5),
            ));

  // ─── Connection Test ───────────────────────────────────────

  /// Test connection to the server
  Future<bool> testConnection() async {
    try {
      final response = await _dio.get('/api/health');
      if (response.statusCode != null &&
          response.statusCode! >= 200 &&
          response.statusCode! < 300) {
        _logger.i('Connection test successful: ${response.statusCode}');
        return true;
      }
      _logger.w('Connection test failed with status: ${response.statusCode}');
      return false;
    } on DioException catch (e) {
      _logger.w('Connection test failed: ${e.type}');
      return false;
    } catch (e) {
      _logger.e('Connection test unexpected error: $e');
      return false;
    }
  }

  // ─── Dashboard ─────────────────────────────────────────────

  /// Fetch dashboard data (stats, queue, agent status, recent tasks)
  Future<DashboardData> getDashboard() async {
    final response = await _dio.get('/api/dashboard');
    return DashboardData.fromJson(response.data);
  }

  // ─── Health ────────────────────────────────────────────────

  /// Get server health status
  Future<Map<String, dynamic>> getHealth() async {
    final response = await _dio.get('/api/health');
    return response.data;
  }

  // ─── Approvals ─────────────────────────────────────────────

  /// Get list of pending approval notifications
  Future<List<ApprovalItem>> getPendingApprovals() async {
    final response = await _dio.get('/api/approval/pending');
    final data = response.data;
    if (data['success'] == true && data['data'] != null) {
      return (data['data'] as List)
          .map((e) => ApprovalItem.fromJson(e as Map<String, dynamic>))
          .toList();
    }
    return [];
  }

  /// Approve a task by task ID
  Future<bool> approveTask(String taskId) async {
    try {
      final response = await _dio.post(
        '/api/approval/task/$taskId/approve',
        data: {
          'approvedBy': 'mobile-user',
          'deviceId': 'mobile-app',
        },
      );
      return response.data['success'] == true;
    } catch (e) {
      _logger.e('Error approving task: $e');
      return false;
    }
  }

  /// Reject a task by task ID with optional reason
  Future<bool> rejectTask(String taskId, {String? reason}) async {
    try {
      final response = await _dio.post(
        '/api/approval/task/$taskId/reject',
        data: {
          'rejectedBy': 'mobile-user',
          'reason': reason ?? 'Rejected from mobile app',
          'deviceId': 'mobile-app',
        },
      );
      return response.data['success'] == true;
    } catch (e) {
      _logger.e('Error rejecting task: $e');
      return false;
    }
  }

  // ─── Tasks ─────────────────────────────────────────────────

  /// Get task queue (status=queued)
  Future<List<TaskItem>> getTaskQueue() async {
    final response = await _dio.get('/api/queue');
    if (response.data is List) {
      return (response.data as List)
          .map((e) => TaskItem.fromJson(e as Map<String, dynamic>))
          .toList();
    }
    return [];
  }

  /// Get task history with optional filters
  Future<List<TaskItem>> getTaskHistory({
    String? status,
    int limit = 50,
  }) async {
    final params = <String, dynamic>{'limit': limit};
    if (status != null && status.isNotEmpty) params['status'] = status;

    final response = await _dio.get('/api/tasks', queryParameters: params);
    final data = response.data;
    if (data['data'] != null) {
      return (data['data'] as List)
          .map((e) => TaskItem.fromJson(e as Map<String, dynamic>))
          .toList();
    }
    return [];
  }

  /// Retry a failed task
  Future<bool> retryTask(String taskId) async {
    try {
      final response = await _dio.post('/api/tasks/$taskId/retry');
      return response.data['success'] == true;
    } catch (e) {
      _logger.e('Error retrying task: $e');
      return false;
    }
  }

  /// Get pull requests list with optional status filter
  Future<Map<String, dynamic>> getPullRequests({String? status}) async {
    try {
      final params = <String, dynamic>{'limit': 50};
      if (status != null && status.isNotEmpty) params['status'] = status;
      final response = await _dio.get('/api/prs', queryParameters: params);
      return response.data ?? {};
    } catch (e) {
      _logger.e('Error fetching PRs: $e');
      return {};
    }
  }

  /// Get comments for a specific PR
  Future<Map<String, dynamic>> getPRComments(int prId) async {
    try {
      final response = await _dio.get('/api/prs/$prId/comments');
      return response.data ?? {};
    } catch (e) {
      _logger.e('Error fetching PR comments: $e');
      return {};
    }
  }
}
