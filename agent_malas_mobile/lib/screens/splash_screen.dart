import 'package:flutter/material.dart';
import 'package:flutter/scheduler.dart';
import 'package:provider/provider.dart';
import 'package:agent_malas_mobile/config/app_config.dart';
import 'package:agent_malas_mobile/providers/app_state.dart';
import 'package:agent_malas_mobile/screens/home_screen.dart';
import 'package:agent_malas_mobile/screens/qr_scanner_screen.dart';

/// Splash screen displayed during app initialization
///
/// This screen is shown when the app launches and performs the following:
/// - Displays the app logo and name
/// - Shows a loading indicator
/// - Checks for existing configuration using AppState provider
/// - Navigates to HomeScreen if config exists
/// - Navigates to QRScannerScreen if no config exists
/// - Displays splash for minimum 1 second
/// - Uses fade transition for navigation
///
/// Requirements: 7.1, 7.2, 7.3, 7.4, 12.4
class SplashScreen extends StatefulWidget {
  const SplashScreen({super.key});

  @override
  State<SplashScreen> createState() => _SplashScreenState();
}

class _SplashScreenState extends State<SplashScreen> {

  @override
  void initState() {
    super.initState();
    // Defer to post-frame callback to avoid notifyListeners during build
    SchedulerBinding.instance.addPostFrameCallback((_) {
      _initializeApp();
    });
  }

  /// Initialize app by checking for existing configuration
  /// 
  /// Validates Requirements 7.1, 7.2, 7.3
  Future<void> _initializeApp() async {
    // Record start time to ensure minimum splash duration
    final startTime = DateTime.now();

    try {
      // Load config via AppState provider (Requirement 7.1)
      final appState = context.read<AppState>();
      await appState.loadConfig();
      final hasConfig = appState.isConfigured;

      // Calculate remaining time to meet minimum 1 second display
      final elapsed = DateTime.now().difference(startTime);
      final remainingTime = const Duration(seconds: 1) - elapsed;

      if (remainingTime.isNegative == false) {
        // Wait for remaining time to ensure minimum 1 second splash display
        await Future.delayed(remainingTime);
      }

      if (!mounted) return;

      // Navigate to appropriate screen based on config state
      if (hasConfig) {
        // Config exists - navigate to dashboard (Requirement 7.2)
        _navigateToDashboard();
      } else {
        // No config - navigate to QR scanner (Requirement 7.3)
        _navigateToQRScanner();
      }
    } catch (e) {
      // If error occurs during initialization, navigate to QR scanner
      // to allow user to set up configuration
      debugPrint('Error during initialization: $e');
      
      // Ensure minimum splash duration even on error
      final elapsed = DateTime.now().difference(startTime);
      final remainingTime = const Duration(seconds: 1) - elapsed;
      
      if (remainingTime.isNegative == false) {
        await Future.delayed(remainingTime);
      }

      if (mounted) {
        _navigateToQRScanner();
      }
    }
  }

  /// Navigate to dashboard screen with fade transition
  void _navigateToDashboard() {
    Navigator.of(context).pushReplacement(
      PageRouteBuilder(
        pageBuilder: (context, animation, secondaryAnimation) =>
            const HomeScreen(),
        transitionsBuilder: (context, animation, secondaryAnimation, child) {
          return FadeTransition(
            opacity: animation,
            child: child,
          );
        },
        transitionDuration: const Duration(milliseconds: 300),
      ),
    );
  }

  /// Navigate to QR scanner screen with fade transition
  void _navigateToQRScanner() {
    Navigator.of(context).pushReplacement(
      PageRouteBuilder(
        pageBuilder: (context, animation, secondaryAnimation) =>
            const QRScannerScreen(),
        transitionsBuilder: (context, animation, secondaryAnimation, child) {
          return FadeTransition(
            opacity: animation,
            child: child,
          );
        },
        transitionDuration: const Duration(milliseconds: 300),
      ),
    );
  }

  @override
  Widget build(BuildContext context) {
    final theme = Theme.of(context);
    final primaryColor = theme.colorScheme.primary;

    return Scaffold(
      backgroundColor: primaryColor,
      body: Center(
        child: Column(
          mainAxisAlignment: MainAxisAlignment.center,
          children: [
            // App logo (128x128dp)
            Container(
              width: 128,
              height: 128,
              decoration: BoxDecoration(
                borderRadius: BorderRadius.circular(24),
                boxShadow: [
                  BoxShadow(
                    color: Colors.black.withValues(alpha: 0.2),
                    blurRadius: 10,
                    offset: const Offset(0, 4),
                  ),
                ],
              ),
              child: ClipRRect(
                borderRadius: BorderRadius.circular(24),
                child: Image.asset(
                  'assets/gemini_logo.png',
                  width: 128,
                  height: 128,
                  fit: BoxFit.cover,
                ),
              ),
            ),
            
            const SizedBox(height: 24),
            
            // App name (Headline style)
            Text(
              AppConfig.appName,
              style: theme.textTheme.headlineMedium?.copyWith(
                color: Colors.white,
                fontWeight: FontWeight.w600,
              ),
              textAlign: TextAlign.center,
            ),
            
            const SizedBox(height: 48),
            
            // Circular progress indicator
            const CircularProgressIndicator(
              valueColor: AlwaysStoppedAnimation<Color>(Colors.white),
            ),
          ],
        ),
      ),
    );
  }
}
