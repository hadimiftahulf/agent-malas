import 'dart:async';
import 'package:flutter/foundation.dart';
import '../models/api_config.dart';
import '../models/dashboard_data.dart';
import '../models/task_item.dart';
import '../models/approval_item.dart';
import '../services/storage_service.dart';
import '../services/api_service.dart';
import '../services/websocket_service.dart';

/// Global application state provider
///
/// Manages API configuration, dashboard data, approvals, tasks,
/// WebSocket connection, and all UI states.
class AppState extends ChangeNotifier {
  final StorageService _storageService = StorageService();

  // ─── Core State ────────────────────────────────────────────
  ApiConfig? _apiConfig;
  bool _isLoading = false;
  String? _errorMessage;

  // ─── Live Data ─────────────────────────────────────────────
  DashboardData? _dashboardData;
  List<ApprovalItem> _pendingApprovals = [];
  List<TaskItem> _taskQueue = [];
  List<TaskItem> _taskHistory = [];
  bool _wsConnected = false;

  // ─── Services ──────────────────────────────────────────────
  ApiService? _apiService;
  ApiService? get apiService => _apiService;
  WebSocketService? _wsService;
  Timer? _refreshTimer;
  StreamSubscription? _wsSubscription;

  // ─── Getters ───────────────────────────────────────────────
  ApiConfig? get apiConfig => _apiConfig;
  bool get isLoading => _isLoading;
  String? get errorMessage => _errorMessage;
  bool get isConfigured => _apiConfig != null;
  DashboardData? get dashboardData => _dashboardData;
  List<ApprovalItem> get pendingApprovals => _pendingApprovals;
  List<TaskItem> get taskQueue => _taskQueue;
  List<TaskItem> get taskHistory => _taskHistory;
  bool get wsConnected => _wsConnected;
  int get pendingCount => _pendingApprovals.length;
  String get agentStatus =>
      _dashboardData?.agent.status ?? 'stopped';

  // ─── Config Operations ────────────────────────────────────

  Future<void> loadConfig() async {
    setLoading(true);
    setError(null);
    try {
      _apiConfig = await _storageService.getApiConfig();
      if (_apiConfig != null) {
        _initServices();
      }
      notifyListeners();
    } catch (e) {
      setError('Failed to load configuration: $e');
    } finally {
      setLoading(false);
    }
  }

  Future<void> saveConfig(ApiConfig config) async {
    setLoading(true);
    setError(null);
    try {
      await _storageService.saveApiConfig(config);
      _apiConfig = config;
      _initServices();
      notifyListeners();
    } catch (e) {
      setError('Failed to save configuration: $e');
    } finally {
      setLoading(false);
    }
  }

  Future<void> clearConfig() async {
    setLoading(true);
    setError(null);
    try {
      _wsService?.disconnect();
      _refreshTimer?.cancel();
      _wsSubscription?.cancel();
      await _storageService.clearAll();
      _apiConfig = null;
      _dashboardData = null;
      _pendingApprovals = [];
      _taskQueue = [];
      _taskHistory = [];
      _wsConnected = false;
      _apiService = null;
      _wsService = null;
      notifyListeners();
    } catch (e) {
      setError('Failed to clear configuration: $e');
    } finally {
      setLoading(false);
    }
  }

  // ─── Service Initialization ───────────────────────────────

  void _initServices() {
    if (_apiConfig == null) return;
    _apiService = ApiService(_apiConfig!.apiUrl);

    // WebSocket
    _wsService?.disconnect();
    _wsService = WebSocketService(_apiConfig!.wsUrl);
    _connectWebSocket();

    // Auto-refresh every 15 seconds
    _refreshTimer?.cancel();
    _refreshTimer = Timer.periodic(
      const Duration(seconds: 15),
      (_) => _silentRefreshAll(),
    );

    // Initial data load
    _silentRefreshAll();
  }

  void _connectWebSocket() {
    _wsService?.connect();
    _wsSubscription?.cancel();
    _wsSubscription = _wsService?.eventStream.listen((event) {
      _wsConnected = true;
      _handleWsEvent(event);
      notifyListeners();
    });
  }

  void _handleWsEvent(WsEvent event) {
    switch (event.type) {
      case 'approval:request':
        // Refresh approvals when new request arrives
        refreshApprovals();
        break;
      case 'approval:response':
        refreshApprovals();
        refreshDashboard();
        break;
      case 'task:done':
      case 'task:error':
      case 'task:start':
      case 'queue:update':
        refreshDashboard();
        refreshTasks();
        break;
      case 'agent:status':
        refreshDashboard();
        break;
    }
  }

  // ─── Data Operations ──────────────────────────────────────

  Future<void> refreshDashboard() async {
    try {
      _dashboardData = await _apiService?.getDashboard();
      notifyListeners();
    } catch (e) {
      debugPrint('Dashboard refresh error: $e');
    }
  }

  Future<void> refreshApprovals() async {
    try {
      _pendingApprovals = await _apiService?.getPendingApprovals() ?? [];
      notifyListeners();
    } catch (e) {
      debugPrint('Approvals refresh error: $e');
    }
  }

  Future<void> refreshTasks() async {
    try {
      _taskQueue = await _apiService?.getTaskQueue() ?? [];
      _taskHistory = await _apiService?.getTaskHistory() ?? [];
      notifyListeners();
    } catch (e) {
      debugPrint('Tasks refresh error: $e');
    }
  }

  Future<void> _silentRefreshAll() async {
    await Future.wait([
      refreshDashboard(),
      refreshApprovals(),
      refreshTasks(),
    ]);
  }

  /// Approve a task
  Future<bool> approve(String taskId) async {
    final result = await _apiService?.approveTask(taskId) ?? false;
    if (result) {
      await refreshApprovals();
      await refreshDashboard();
    }
    return result;
  }

  /// Reject a task
  Future<bool> reject(String taskId, {String? reason}) async {
    final result =
        await _apiService?.rejectTask(taskId, reason: reason) ?? false;
    if (result) {
      await refreshApprovals();
      await refreshDashboard();
    }
    return result;
  }

  /// Retry a failed task
  Future<bool> retryTask(String taskId) async {
    final result = await _apiService?.retryTask(taskId) ?? false;
    if (result) {
      await refreshTasks();
      await refreshDashboard();
    }
    return result;
  }

  /// Reconnect WebSocket
  void reconnectWebSocket() {
    _wsService?.disconnect();
    _connectWebSocket();
  }

  // ─── Common State Helpers ─────────────────────────────────

  void setLoading(bool loading) {
    _isLoading = loading;
    notifyListeners();
  }

  void setError(String? message) {
    _errorMessage = message;
    notifyListeners();
  }

  @override
  void dispose() {
    _wsService?.dispose();
    _refreshTimer?.cancel();
    _wsSubscription?.cancel();
    super.dispose();
  }
}
