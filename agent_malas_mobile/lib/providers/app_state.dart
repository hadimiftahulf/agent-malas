import 'package:flutter/foundation.dart';
import '../models/api_config.dart';
import '../services/storage_service.dart';

/// Global application state provider using ChangeNotifier
///
/// Manages API configuration, loading states, and error messages.
/// Uses Provider package for reactive state management across the app.
///
/// **Validates: Requirements 6.1, 6.2, 6.4**
class AppState extends ChangeNotifier {
  final StorageService _storageService = StorageService();

  ApiConfig? _apiConfig;
  bool _isLoading = false;
  String? _errorMessage;

  /// Current API configuration, null if not configured
  ApiConfig? get apiConfig => _apiConfig;

  /// Whether an async operation is in progress
  bool get isLoading => _isLoading;

  /// Current error message, null if no error
  String? get errorMessage => _errorMessage;

  /// Whether the app has been configured with server details
  bool get isConfigured => _apiConfig != null;

  /// Load configuration from storage
  ///
  /// Retrieves the stored API configuration from SharedPreferences.
  /// Sets loading state during the operation and clears any previous errors.
  /// Updates the state and notifies listeners when complete.
  Future<void> loadConfig() async {
    setLoading(true);
    setError(null);

    try {
      _apiConfig = await _storageService.getApiConfig();
      notifyListeners();
    } catch (e) {
      setError('Failed to load configuration: $e');
    } finally {
      setLoading(false);
    }
  }

  /// Save configuration to storage
  ///
  /// Persists the provided [config] to SharedPreferences.
  /// Sets loading state during the operation and clears any previous errors.
  /// Updates the state and notifies listeners when complete.
  Future<void> saveConfig(ApiConfig config) async {
    setLoading(true);
    setError(null);

    try {
      await _storageService.saveApiConfig(config);
      _apiConfig = config;
      notifyListeners();
    } catch (e) {
      setError('Failed to save configuration: $e');
    } finally {
      setLoading(false);
    }
  }

  /// Clear all stored configuration
  ///
  /// Removes the API configuration from SharedPreferences.
  /// Sets loading state during the operation and clears any previous errors.
  /// Updates the state and notifies listeners when complete.
  Future<void> clearConfig() async {
    setLoading(true);
    setError(null);

    try {
      await _storageService.clearAll();
      _apiConfig = null;
      notifyListeners();
    } catch (e) {
      setError('Failed to clear configuration: $e');
    } finally {
      setLoading(false);
    }
  }

  /// Set loading state
  ///
  /// Updates the loading indicator state and notifies listeners.
  /// Use this to show/hide loading indicators in the UI.
  void setLoading(bool loading) {
    _isLoading = loading;
    notifyListeners();
  }

  /// Set error message
  ///
  /// Updates the error message state and notifies listeners.
  /// Pass null to clear the error. Use this to display error messages in the UI.
  void setError(String? message) {
    _errorMessage = message;
    notifyListeners();
  }
}
