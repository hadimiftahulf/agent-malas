import 'package:flutter/material.dart';
import '../models/api_config.dart';
import '../services/api_service.dart';
import '../services/storage_service.dart';
import '../utils/validators.dart';
import 'dashboard_screen.dart';

/// Manual Setup Screen for entering server connection details manually
/// 
/// This screen provides a fallback option for users who can't scan QR codes.
/// Users can manually enter the API and WebSocket URLs to configure the app.
/// 
/// Implements manual configuration input:
/// - Text input fields for API URL and WebSocket URL (Requirement 5.2)
/// - URL format validation (Requirement 5.3)
/// - Connection test before saving (Requirement 5.5)
/// - Error messages for invalid URLs (Requirement 5.4)
/// - Navigation to dashboard on success (Requirement 5.7)
/// - Material Design 3 outlined text fields
/// 
/// Validates Requirements 5.2, 5.3, 5.4, 5.5, 5.6, 5.7, 8.5, 8.6
class ManualSetupScreen extends StatefulWidget {
  const ManualSetupScreen({super.key});

  @override
  State<ManualSetupScreen> createState() => _ManualSetupScreenState();
}

class _ManualSetupScreenState extends State<ManualSetupScreen> {
  final _formKey = GlobalKey<FormState>();
  final _apiUrlController = TextEditingController();
  final _wsUrlController = TextEditingController();
  final StorageService _storageService = StorageService();
  
  bool _isConnecting = false;
  String? _errorMessage;

  @override
  void dispose() {
    _apiUrlController.dispose();
    _wsUrlController.dispose();
    super.dispose();
  }

  /// Validate and save manual configuration
  /// 
  /// Validates Requirements 5.3, 5.4, 5.5, 5.6, 5.7
  Future<void> _handleConnect() async {
    // Clear previous error
    setState(() {
      _errorMessage = null;
    });

    // Validate form
    if (!_formKey.currentState!.validate()) {
      return;
    }

    setState(() {
      _isConnecting = true;
    });

    try {
      final apiUrl = _apiUrlController.text.trim();
      final wsUrl = _wsUrlController.text.trim();

      // Create API config with manual URLs
      final apiConfig = ApiConfig(
        apiUrl: apiUrl,
        wsUrl: wsUrl,
        deviceName: 'Manual Setup',
        timestamp: DateTime.now().millisecondsSinceEpoch,
      );

      // Test connection to server (Requirement 5.5, 8.5)
      debugPrint('Testing connection to $apiUrl');
      final apiService = ApiService(apiUrl);
      
      final connectionSuccess = await apiService.testConnection();
      
      if (!connectionSuccess) {
        // Connection test failed
        setState(() {
          _errorMessage = 'Cannot reach server at $apiUrl';
          _isConnecting = false;
        });
        return;
      }

      // Connection successful - save config (Requirement 5.6)
      debugPrint('Connection successful, saving config');
      await _storageService.saveApiConfig(apiConfig);
      
      // Show success message
      if (mounted) {
        ScaffoldMessenger.of(context).showSnackBar(
          const SnackBar(
            content: Text('Connected successfully'),
            backgroundColor: Colors.green,
            duration: Duration(seconds: 2),
            behavior: SnackBarBehavior.floating,
          ),
        );
      }
      
      // Navigate to dashboard screen (Requirement 5.7)
      if (mounted) {
        // Wait a moment for the success message to be visible
        await Future.delayed(const Duration(milliseconds: 500));
        
        if (mounted) {
          Navigator.of(context).pushReplacement(
            MaterialPageRoute(
              builder: (context) => const DashboardScreen(),
            ),
          );
        }
      }
      
    } catch (e) {
      debugPrint('Error during manual setup: $e');
      setState(() {
        _errorMessage = 'An error occurred. Please try again.';
        _isConnecting = false;
      });
    }
  }

  @override
  Widget build(BuildContext context) {
    final theme = Theme.of(context);
    
    return Scaffold(
      appBar: AppBar(
        title: const Text('Manual Setup'),
        centerTitle: true,
      ),
      body: SafeArea(
        child: SingleChildScrollView(
          padding: const EdgeInsets.all(24.0),
          child: Form(
            key: _formKey,
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.stretch,
              children: [
                // Header icon and text
                Icon(
                  Icons.settings_input_antenna,
                  size: 64,
                  color: theme.colorScheme.primary,
                ),
                const SizedBox(height: 16),
                
                Text(
                  'Enter Server Details',
                  style: theme.textTheme.headlineSmall?.copyWith(
                    fontWeight: FontWeight.bold,
                  ),
                  textAlign: TextAlign.center,
                ),
                const SizedBox(height: 8),
                
                Text(
                  'Manually enter the API and WebSocket URLs to connect to your server',
                  style: theme.textTheme.bodyMedium?.copyWith(
                    color: Colors.grey[600],
                  ),
                  textAlign: TextAlign.center,
                ),
                const SizedBox(height: 32),

                // API URL input field
                TextFormField(
                  controller: _apiUrlController,
                  decoration: InputDecoration(
                    labelText: 'API URL',
                    hintText: 'http://192.168.1.50:3001',
                    prefixIcon: const Icon(Icons.http),
                    border: const OutlineInputBorder(),
                    helperText: 'HTTP or HTTPS endpoint for REST API',
                    enabled: !_isConnecting,
                  ),
                  keyboardType: TextInputType.url,
                  textInputAction: TextInputAction.next,
                  validator: (value) {
                    if (value == null || value.trim().isEmpty) {
                      return 'Please enter API URL';
                    }
                    if (!isValidHttpUrl(value.trim())) {
                      return 'Invalid URL format';
                    }
                    return null;
                  },
                ),
                const SizedBox(height: 24),

                // WebSocket URL input field
                TextFormField(
                  controller: _wsUrlController,
                  decoration: InputDecoration(
                    labelText: 'WebSocket URL',
                    hintText: 'ws://192.168.1.50:3001/ws',
                    prefixIcon: const Icon(Icons.cable),
                    border: const OutlineInputBorder(),
                    helperText: 'WS or WSS endpoint for real-time updates',
                    enabled: !_isConnecting,
                  ),
                  keyboardType: TextInputType.url,
                  textInputAction: TextInputAction.done,
                  onFieldSubmitted: (_) {
                    if (!_isConnecting) {
                      _handleConnect();
                    }
                  },
                  validator: (value) {
                    if (value == null || value.trim().isEmpty) {
                      return 'Please enter WebSocket URL';
                    }
                    if (!isValidWsUrl(value.trim())) {
                      return 'Invalid URL format';
                    }
                    return null;
                  },
                ),
                const SizedBox(height: 32),

                // Error message display
                if (_errorMessage != null)
                  Container(
                    padding: const EdgeInsets.all(12),
                    margin: const EdgeInsets.only(bottom: 16),
                    decoration: BoxDecoration(
                      color: Colors.red.shade50,
                      borderRadius: BorderRadius.circular(8),
                      border: Border.all(color: Colors.red.shade200),
                    ),
                    child: Row(
                      children: [
                        Icon(
                          Icons.error_outline,
                          color: Colors.red.shade700,
                        ),
                        const SizedBox(width: 12),
                        Expanded(
                          child: Text(
                            _errorMessage!,
                            style: TextStyle(
                              color: Colors.red.shade700,
                              fontWeight: FontWeight.w500,
                            ),
                          ),
                        ),
                      ],
                    ),
                  ),

                // Connect button
                FilledButton(
                  onPressed: _isConnecting ? null : _handleConnect,
                  style: FilledButton.styleFrom(
                    padding: const EdgeInsets.symmetric(vertical: 16),
                    shape: RoundedRectangleBorder(
                      borderRadius: BorderRadius.circular(8),
                    ),
                  ),
                  child: _isConnecting
                      ? const SizedBox(
                          height: 20,
                          width: 20,
                          child: CircularProgressIndicator(
                            strokeWidth: 2,
                            valueColor: AlwaysStoppedAnimation<Color>(Colors.white),
                          ),
                        )
                      : const Text(
                          'Connect',
                          style: TextStyle(
                            fontSize: 16,
                            fontWeight: FontWeight.w600,
                          ),
                        ),
                ),
                const SizedBox(height: 24),

                // Helper text with link back to QR scanner
                Container(
                  padding: const EdgeInsets.all(16),
                  decoration: BoxDecoration(
                    color: theme.colorScheme.surfaceContainerHighest.withValues(alpha: 0.3),
                    borderRadius: BorderRadius.circular(8),
                  ),
                  child: Row(
                    children: [
                      Icon(
                        Icons.info_outline,
                        size: 20,
                        color: theme.colorScheme.onSurfaceVariant,
                      ),
                      const SizedBox(width: 12),
                      Expanded(
                        child: Column(
                          crossAxisAlignment: CrossAxisAlignment.start,
                          children: [
                            Text(
                              'Prefer QR code scanning?',
                              style: theme.textTheme.bodyMedium?.copyWith(
                                fontWeight: FontWeight.w600,
                                color: theme.colorScheme.onSurfaceVariant,
                              ),
                            ),
                            const SizedBox(height: 4),
                            GestureDetector(
                              onTap: () {
                                Navigator.of(context).pop();
                              },
                              child: Text(
                                'Go back to QR scanner',
                                style: theme.textTheme.bodyMedium?.copyWith(
                                  color: theme.colorScheme.primary,
                                  decoration: TextDecoration.underline,
                                ),
                              ),
                            ),
                          ],
                        ),
                      ),
                    ],
                  ),
                ),
              ],
            ),
          ),
        ),
      ),
    );
  }
}
