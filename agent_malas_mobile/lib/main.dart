import 'package:flutter/material.dart';
import 'package:provider/provider.dart';
import 'config/app_config.dart';
import 'config/theme.dart';
import 'providers/app_state.dart';
import 'screens/splash_screen.dart';

/// Main entry point for Agent Malas Mobile App
///
/// Configures Provider for state management and sets up premium light mode theme.
/// Forces ThemeMode.light for premium UI experience.
void main() {
  runApp(
    ChangeNotifierProvider(
      create: (_) => AppState(),
      child: const MyApp(),
    ),
  );
}

class MyApp extends StatelessWidget {
  const MyApp({super.key});

  @override
  Widget build(BuildContext context) {
    return MaterialApp(
      title: AppConfig.appName,
      theme: AppTheme.lightTheme,
      darkTheme: AppTheme.darkTheme,
      themeMode: ThemeMode.light, // Force light mode per user request
      debugShowCheckedModeBanner: false,
      home: const SplashScreen(),
    );
  }
}
