import 'dart:convert';
import 'package:flutter/material.dart';
import 'package:flutter/services.dart';
import 'package:mobile_scanner/mobile_scanner.dart';
import 'package:permission_handler/permission_handler.dart';
import '../models/api_config.dart';
import '../services/api_service.dart';
import '../services/storage_service.dart';
import '../utils/validators.dart';
import 'dashboard_screen.dart';
import 'manual_setup_screen.dart';

/// QR Scanner Screen for scanning QR codes from the web app
/// 
/// This screen displays a camera preview with a scan overlay to guide users
/// where to position the QR code. It includes a "Manual Setup" button as an
/// alternative if camera scanning fails.
/// 
/// Implements camera permission handling:
/// - Requests camera permission when screen loads (Requirement 4.1)
/// - Shows permission dialog if denied with explanation (Requirement 4.2)
/// - Provides button to open app settings if permanently denied (Requirement 4.2)
/// - Shows "Manual Setup" as alternative when permission denied (Requirement 4.4)
/// - Activates camera preview when permission granted (Requirement 4.3)
/// 
/// After successful QR parse, tests connection to server, saves config,
/// and navigates to dashboard with haptic feedback.
/// 
/// Validates Requirements 3.1, 3.2, 3.3, 3.4, 3.5, 3.6, 3.7, 3.8, 3.9, 4.1, 4.2, 4.3, 4.4, 8.5, 8.6
class QRScannerScreen extends StatefulWidget {
  const QRScannerScreen({super.key});

  @override
  State<QRScannerScreen> createState() => _QRScannerScreenState();
}

class _QRScannerScreenState extends State<QRScannerScreen> {
  MobileScannerController cameraController = MobileScannerController();
  bool _isProcessing = false;
  bool _hasPermission = false;
  bool _isCheckingPermission = true;
  final StorageService _storageService = StorageService();

  @override
  void initState() {
    super.initState();
    _checkCameraPermission();
  }

  @override
  void dispose() {
    cameraController.dispose();
    super.dispose();
  }

  /// Check and request camera permission when screen loads
  /// 
  /// Validates Requirements 4.1, 4.2
  Future<void> _checkCameraPermission() async {
    final status = await Permission.camera.status;
    
    if (status.isGranted) {
      // Permission already granted (Requirement 4.3)
      setState(() {
        _hasPermission = true;
        _isCheckingPermission = false;
      });
    } else if (status.isDenied) {
      // Request permission (Requirement 4.1)
      final result = await Permission.camera.request();
      
      setState(() {
        _hasPermission = result.isGranted;
        _isCheckingPermission = false;
      });
      
      if (!result.isGranted) {
        // Permission denied (Requirement 4.2)
        _showPermissionDeniedDialog(result.isPermanentlyDenied);
      }
    } else if (status.isPermanentlyDenied) {
      // Permission permanently denied (Requirement 4.2)
      setState(() {
        _hasPermission = false;
        _isCheckingPermission = false;
      });
      _showPermissionDeniedDialog(true);
    } else {
      // Other status (restricted, limited, etc.)
      setState(() {
        _hasPermission = false;
        _isCheckingPermission = false;
      });
    }
  }

  /// Show permission dialog with explanation and action button
  /// 
  /// Validates Requirements 4.2, 4.4
  void _showPermissionDeniedDialog(bool isPermanentlyDenied) {
    showDialog(
      context: context,
      barrierDismissible: false,
      builder: (context) => AlertDialog(
        title: const Text('Camera Access Required'),
        content: Text(
          isPermanentlyDenied
              ? 'Camera access is required to scan QR codes. Please enable it in app settings.'
              : 'Camera access is required to scan QR codes.',
        ),
        actions: [
          // Manual Setup alternative (Requirement 4.4)
          TextButton(
            onPressed: () {
              Navigator.of(context).pop();
              _navigateToManualSetup();
            },
            child: const Text('Manual Setup'),
          ),
          // Open settings button if permanently denied (Requirement 4.2)
          if (isPermanentlyDenied)
            FilledButton(
              onPressed: () async {
                Navigator.of(context).pop();
                await openAppSettings();
                // Recheck permission when user returns
                _checkCameraPermission();
              },
              child: const Text('Open Settings'),
            )
          else
            FilledButton(
              onPressed: () {
                Navigator.of(context).pop();
                _checkCameraPermission();
              },
              child: const Text('Try Again'),
            ),
        ],
      ),
    );
  }

  void _onDetect(BarcodeCapture capture) {
    if (_isProcessing) return;

    final List<Barcode> barcodes = capture.barcodes;
    if (barcodes.isEmpty) return;

    final String? code = barcodes.first.rawValue;
    if (code == null || code.isEmpty) return;

    setState(() {
      _isProcessing = true;
    });

    // Parse and validate QR code data
    _processQRCode(code);
  }

  /// Process QR code data: parse JSON, validate, test connection, and save
  /// 
  /// Validates Requirements 3.2, 3.3, 3.4, 3.5, 3.6, 3.7, 3.8, 3.9, 8.5, 8.6
  Future<void> _processQRCode(String qrData) async {
    try {
      // Parse QR code data as JSON
      final Map<String, dynamic> json;
      try {
        json = jsonDecode(qrData) as Map<String, dynamic>;
      } on FormatException catch (e) {
        // Invalid JSON format
        debugPrint('JSON parsing error: $e');
        _showError('Invalid QR code format');
        _resetProcessing();
        return;
      } catch (e) {
        // Other parsing errors
        debugPrint('QR parsing error: $e');
        _showError('Invalid QR code format');
        _resetProcessing();
        return;
      }

      // Validate parsed data using ApiConfigValidator
      final validationResult = ApiConfigValidator.validate(json);
      
      if (!validationResult.isValid) {
        // Display specific error message for validation failures
        final errorMessage = validationResult.errors.isNotEmpty
            ? validationResult.errors.first
            : 'Incomplete server information';
        
        debugPrint('Validation errors: ${validationResult.errors}');
        _showError(errorMessage);
        _resetProcessing();
        return;
      }

      // Create ApiConfig from validated JSON
      final apiConfig = ApiConfig.fromJson(json);
      
      // Test connection to server (Requirement 3.5, 8.5)
      debugPrint('Testing connection to ${apiConfig.apiUrl}');
      final apiService = ApiService(apiConfig.apiUrl);
      
      final connectionSuccess = await apiService.testConnection();
      
      if (!connectionSuccess) {
        // Connection test failed (Requirement 3.6)
        _showError('Cannot reach server at ${apiConfig.apiUrl}');
        _resetProcessing();
        return;
      }

      // Connection successful - save config (Requirement 3.7)
      debugPrint('Connection successful, saving config');
      await _storageService.saveApiConfig(apiConfig);
      
      // Trigger haptic feedback on success
      HapticFeedback.mediumImpact();
      
      // Display success message with device name (Requirement 3.9)
      _showSuccess('Connected to ${apiConfig.deviceName}');
      
      // Navigate to dashboard screen (Requirement 3.8)
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
      // Catch any unexpected errors
      debugPrint('Unexpected error processing QR code: $e');
      _showError('Error processing QR code');
      _resetProcessing();
    }
  }

  /// Show error message in a snackbar
  void _showError(String message) {
    if (!mounted) return;
    
    ScaffoldMessenger.of(context).showSnackBar(
      SnackBar(
        content: Text(message),
        backgroundColor: Colors.red,
        duration: const Duration(seconds: 5),
        behavior: SnackBarBehavior.floating,
      ),
    );
  }

  /// Show success message in a snackbar
  void _showSuccess(String message) {
    if (!mounted) return;
    
    ScaffoldMessenger.of(context).showSnackBar(
      SnackBar(
        content: Text(message),
        backgroundColor: Colors.green,
        duration: const Duration(seconds: 3),
        behavior: SnackBarBehavior.floating,
      ),
    );
  }

  /// Reset processing state to allow scanning again
  void _resetProcessing() {
    Future.delayed(const Duration(milliseconds: 500), () {
      if (mounted) {
        setState(() {
          _isProcessing = false;
        });
      }
    });
  }

  void _navigateToManualSetup() {
    Navigator.of(context).push(
      MaterialPageRoute(
        builder: (context) => const ManualSetupScreen(),
      ),
    );
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: AppBar(
        title: const Text('QR Scanner'),
        centerTitle: true,
      ),
      body: _isCheckingPermission
          ? const Center(
              child: CircularProgressIndicator(),
            )
          : !_hasPermission
              ? _buildPermissionDeniedView()
              : _buildScannerView(),
    );
  }

  /// Build view when camera permission is denied
  /// 
  /// Shows message and Manual Setup button as alternative (Requirement 4.4)
  Widget _buildPermissionDeniedView() {
    return Center(
      child: Padding(
        padding: const EdgeInsets.all(24.0),
        child: Column(
          mainAxisAlignment: MainAxisAlignment.center,
          children: [
            Icon(
              Icons.camera_alt_outlined,
              size: 80,
              color: Colors.grey[400],
            ),
            const SizedBox(height: 24),
            Text(
              'Camera Access Required',
              style: Theme.of(context).textTheme.headlineSmall?.copyWith(
                    fontWeight: FontWeight.bold,
                  ),
              textAlign: TextAlign.center,
            ),
            const SizedBox(height: 16),
            Text(
              'Camera access is required to scan QR codes. You can use manual setup as an alternative.',
              style: Theme.of(context).textTheme.bodyLarge?.copyWith(
                    color: Colors.grey[600],
                  ),
              textAlign: TextAlign.center,
            ),
            const SizedBox(height: 32),
            FilledButton.icon(
              onPressed: _navigateToManualSetup,
              icon: const Icon(Icons.edit),
              label: const Text('Manual Setup'),
              style: FilledButton.styleFrom(
                padding: const EdgeInsets.symmetric(
                  horizontal: 32,
                  vertical: 16,
                ),
              ),
            ),
            const SizedBox(height: 16),
            OutlinedButton.icon(
              onPressed: () async {
                await openAppSettings();
                _checkCameraPermission();
              },
              icon: const Icon(Icons.settings),
              label: const Text('Open Settings'),
              style: OutlinedButton.styleFrom(
                padding: const EdgeInsets.symmetric(
                  horizontal: 32,
                  vertical: 16,
                ),
              ),
            ),
          ],
        ),
      ),
    );
  }

  /// Build scanner view when camera permission is granted
  Widget _buildScannerView() {
    return Stack(
      children: [
        // Camera preview
        MobileScanner(
          controller: cameraController,
          onDetect: _onDetect,
        ),

        // Scan overlay with rounded square and corner markers
        CustomPaint(
          painter: ScanOverlayPainter(),
          child: Container(),
        ),

        // Instruction text and manual setup button at bottom
        Positioned(
          left: 0,
          right: 0,
          bottom: 0,
          child: Container(
            decoration: BoxDecoration(
              gradient: LinearGradient(
                begin: Alignment.topCenter,
                end: Alignment.bottomCenter,
                colors: [
                  Colors.transparent,
                  Colors.black.withValues(alpha: 0.7),
                ],
              ),
            ),
            padding: const EdgeInsets.all(24.0),
            child: Column(
              mainAxisSize: MainAxisSize.min,
              children: [
                // Instruction text
                const Text(
                  'Scan QR code from web app',
                  style: TextStyle(
                    color: Colors.white,
                    fontSize: 16,
                    fontWeight: FontWeight.w500,
                  ),
                  textAlign: TextAlign.center,
                ),
                const SizedBox(height: 24),

                // Manual Setup button
                OutlinedButton(
                  onPressed: _navigateToManualSetup,
                  style: OutlinedButton.styleFrom(
                    foregroundColor: Colors.white,
                    side: const BorderSide(color: Colors.white, width: 2),
                    padding: const EdgeInsets.symmetric(
                      horizontal: 32,
                      vertical: 16,
                    ),
                    shape: RoundedRectangleBorder(
                      borderRadius: BorderRadius.circular(8),
                    ),
                  ),
                  child: const Text(
                    'Manual Setup',
                    style: TextStyle(
                      fontSize: 16,
                      fontWeight: FontWeight.w600,
                    ),
                  ),
                ),
              ],
            ),
          ),
        ),

        // Processing overlay with loading indicator (Requirement 8.5)
        if (_isProcessing)
          Container(
            color: Colors.black.withValues(alpha: 0.7),
            child: const Center(
              child: Column(
                mainAxisSize: MainAxisSize.min,
                children: [
                  CircularProgressIndicator(
                    color: Colors.white,
                    strokeWidth: 3,
                  ),
                  SizedBox(height: 16),
                  Text(
                    'Testing connection...',
                    style: TextStyle(
                      color: Colors.white,
                      fontSize: 16,
                      fontWeight: FontWeight.w500,
                    ),
                  ),
                ],
              ),
            ),
          ),
      ],
    );
  }
}

/// Custom painter for the scan overlay
/// 
/// Draws a rounded square with corner markers to guide users where to
/// position the QR code for scanning.
class ScanOverlayPainter extends CustomPainter {
  @override
  void paint(Canvas canvas, Size size) {
    final double scanAreaSize = size.width * 0.7;
    final double left = (size.width - scanAreaSize) / 2;
    final double top = (size.height - scanAreaSize) / 2;
    final double right = left + scanAreaSize;
    final double bottom = top + scanAreaSize;

    // Draw semi-transparent overlay outside scan area
    final Paint overlayPaint = Paint()
      ..color = Colors.black.withValues(alpha: 0.5);

    // Top overlay
    canvas.drawRect(
      Rect.fromLTRB(0, 0, size.width, top),
      overlayPaint,
    );

    // Bottom overlay
    canvas.drawRect(
      Rect.fromLTRB(0, bottom, size.width, size.height),
      overlayPaint,
    );

    // Left overlay
    canvas.drawRect(
      Rect.fromLTRB(0, top, left, bottom),
      overlayPaint,
    );

    // Right overlay
    canvas.drawRect(
      Rect.fromLTRB(right, top, size.width, bottom),
      overlayPaint,
    );

    // Draw corner markers
    final Paint cornerPaint = Paint()
      ..color = Colors.white
      ..strokeWidth = 4
      ..style = PaintingStyle.stroke
      ..strokeCap = StrokeCap.round;

    const double cornerLength = 30;
    const double cornerRadius = 12;

    // Top-left corner
    canvas.drawPath(
      Path()
        ..moveTo(left + cornerRadius, top)
        ..lineTo(left + cornerLength, top)
        ..moveTo(left, top + cornerRadius)
        ..lineTo(left, top + cornerLength),
      cornerPaint,
    );

    // Top-right corner
    canvas.drawPath(
      Path()
        ..moveTo(right - cornerRadius, top)
        ..lineTo(right - cornerLength, top)
        ..moveTo(right, top + cornerRadius)
        ..lineTo(right, top + cornerLength),
      cornerPaint,
    );

    // Bottom-left corner
    canvas.drawPath(
      Path()
        ..moveTo(left + cornerRadius, bottom)
        ..lineTo(left + cornerLength, bottom)
        ..moveTo(left, bottom - cornerRadius)
        ..lineTo(left, bottom - cornerLength),
      cornerPaint,
    );

    // Bottom-right corner
    canvas.drawPath(
      Path()
        ..moveTo(right - cornerRadius, bottom)
        ..lineTo(right - cornerLength, bottom)
        ..moveTo(right, bottom - cornerRadius)
        ..lineTo(right, bottom - cornerLength),
      cornerPaint,
    );

    // Draw rounded square border
    final Paint borderPaint = Paint()
      ..color = Colors.white.withValues(alpha: 0.5)
      ..strokeWidth = 2
      ..style = PaintingStyle.stroke;

    canvas.drawRRect(
      RRect.fromRectAndRadius(
        Rect.fromLTRB(left, top, right, bottom),
        const Radius.circular(cornerRadius),
      ),
      borderPaint,
    );
  }

  @override
  bool shouldRepaint(covariant CustomPainter oldDelegate) => false;
}
