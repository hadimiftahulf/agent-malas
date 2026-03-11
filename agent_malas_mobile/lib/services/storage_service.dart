import 'dart:convert';
import 'package:shared_preferences/shared_preferences.dart';
import '../models/api_config.dart';

/// Service for persisting and retrieving API configuration data
///
/// Uses SharedPreferences to store configuration as JSON string.
/// Handles serialization/deserialization of ApiConfig objects.
class StorageService {
  static const String _configKey = 'api_config';

  /// Save API configuration to local storage
  ///
  /// Serializes the [config] to JSON and stores it in SharedPreferences.
  /// Returns a Future that completes when the save operation is done.
  Future<void> saveApiConfig(ApiConfig config) async {
    final prefs = await SharedPreferences.getInstance();
    final jsonString = jsonEncode(config.toJson());
    await prefs.setString(_configKey, jsonString);
  }

  /// Load API configuration from local storage
  ///
  /// Returns the stored ApiConfig if it exists, or null if no configuration
  /// has been saved. Returns null if the stored data is corrupted.
  Future<ApiConfig?> getApiConfig() async {
    try {
      final prefs = await SharedPreferences.getInstance();
      final jsonString = prefs.getString(_configKey);

      if (jsonString == null) {
        return null;
      }

      final json = jsonDecode(jsonString) as Map<String, dynamic>;
      return ApiConfig.fromJson(json);
    } catch (e) {
      // Return null if data is corrupted or cannot be parsed
      return null;
    }
  }

  /// Check if configuration exists in storage
  ///
  /// Returns true if an API configuration has been saved, false otherwise.
  Future<bool> hasConfig() async {
    final prefs = await SharedPreferences.getInstance();
    return prefs.containsKey(_configKey);
  }

  /// Clear all stored data
  ///
  /// Removes all data from SharedPreferences.
  /// Use this for logout or reset functionality.
  Future<void> clearAll() async {
    final prefs = await SharedPreferences.getInstance();
    await prefs.clear();
  }
}
