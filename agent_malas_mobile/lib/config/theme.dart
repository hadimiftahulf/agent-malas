import 'package:flutter/material.dart';
import 'package:google_fonts/google_fonts.dart';

/// Premium light mode theme for Agent Malas Mobile
///
/// Uses Material Design 3 with custom color scheme, glassmorphism-inspired cards,
/// premium typography via Google Fonts (Inter), and refined spacing.
class AppTheme {
  // ─── Color Palette ─────────────────────────────────────────
  static const Color _primarySeed = Color(0xFF6366F1); // Indigo
  static const Color _surfaceBg = Color(0xFFF1F5F9); // Slate-100
  static const Color _cardBg = Colors.white;

  // Status colors
  static const Color emerald = Color(0xFF10B981);
  static const Color rose = Color(0xFFF43F5E);
  static const Color amber = Color(0xFFF59E0B);
  static const Color indigo = Color(0xFF6366F1);
  static const Color violet = Color(0xFF8B5CF6);
  static const Color cyan = Color(0xFF06B6D4);
  static const Color slate600 = Color(0xFF475569);
  static const Color slate400 = Color(0xFF94A3B8);
  static const Color slate200 = Color(0xFFE2E8F0);
  static const Color slate50 = Color(0xFFF8FAFC);

  // ─── Light Theme ───────────────────────────────────────────
  static ThemeData get lightTheme {
    final colorScheme = ColorScheme.fromSeed(
      seedColor: _primarySeed,
      brightness: Brightness.light,
      surface: _surfaceBg,
    );

    final textTheme = GoogleFonts.interTextTheme(ThemeData.light().textTheme);

    return ThemeData(
      useMaterial3: true,
      brightness: Brightness.light,
      colorScheme: colorScheme,
      textTheme: textTheme,
      scaffoldBackgroundColor: _surfaceBg,

      // AppBar
      appBarTheme: AppBarTheme(
        backgroundColor: Colors.white,
        foregroundColor: const Color(0xFF0F172A),
        elevation: 0,
        scrolledUnderElevation: 1,
        shadowColor: Colors.black.withValues(alpha: 0.05),
        centerTitle: true,
        titleTextStyle: GoogleFonts.inter(
          fontSize: 18,
          fontWeight: FontWeight.w800,
          color: const Color(0xFF0F172A),
          letterSpacing: -0.3,
        ),
      ),

      // Cards
      cardTheme: CardThemeData(
        color: _cardBg,
        elevation: 0,
        surfaceTintColor: Colors.transparent,
        shape: RoundedRectangleBorder(
          borderRadius: BorderRadius.circular(20),
          side: BorderSide(color: Colors.black.withValues(alpha: 0.04)),
        ),
        shadowColor: Colors.black.withValues(alpha: 0.06),
      ),

      // Bottom Nav
      bottomNavigationBarTheme: BottomNavigationBarThemeData(
        backgroundColor: Colors.white,
        selectedItemColor: _primarySeed,
        unselectedItemColor: slate400,
        type: BottomNavigationBarType.fixed,
        elevation: 0,
        selectedLabelStyle: GoogleFonts.inter(
          fontSize: 11,
          fontWeight: FontWeight.w700,
          letterSpacing: 0.3,
        ),
        unselectedLabelStyle: GoogleFonts.inter(
          fontSize: 11,
          fontWeight: FontWeight.w600,
        ),
      ),

      // Filled Button
      filledButtonTheme: FilledButtonThemeData(
        style: FilledButton.styleFrom(
          backgroundColor: _primarySeed,
          foregroundColor: Colors.white,
          padding: const EdgeInsets.symmetric(horizontal: 24, vertical: 14),
          shape: RoundedRectangleBorder(
            borderRadius: BorderRadius.circular(14),
          ),
          textStyle: GoogleFonts.inter(
            fontSize: 14,
            fontWeight: FontWeight.w700,
          ),
        ),
      ),

      // Elevated Button
      elevatedButtonTheme: ElevatedButtonThemeData(
        style: ElevatedButton.styleFrom(
          elevation: 0,
          padding: const EdgeInsets.symmetric(horizontal: 24, vertical: 14),
          shape: RoundedRectangleBorder(
            borderRadius: BorderRadius.circular(14),
          ),
        ),
      ),

      // Snackbar
      snackBarTheme: SnackBarThemeData(
        behavior: SnackBarBehavior.floating,
        shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(12)),
      ),

      // Input
      inputDecorationTheme: InputDecorationTheme(
        filled: true,
        fillColor: slate50,
        border: OutlineInputBorder(
          borderRadius: BorderRadius.circular(14),
          borderSide: BorderSide(color: slate200),
        ),
        enabledBorder: OutlineInputBorder(
          borderRadius: BorderRadius.circular(14),
          borderSide: BorderSide(color: slate200),
        ),
        focusedBorder: OutlineInputBorder(
          borderRadius: BorderRadius.circular(14),
          borderSide: BorderSide(color: _primarySeed, width: 2),
        ),
        contentPadding:
            const EdgeInsets.symmetric(horizontal: 16, vertical: 14),
      ),

      // Divider
      dividerTheme: DividerThemeData(
        color: Colors.black.withValues(alpha: 0.05),
        thickness: 1,
      ),
    );
  }

  // ─── Dark Theme (minimal, mainly for completeness) ─────────
  static ThemeData get darkTheme {
    final colorScheme = ColorScheme.fromSeed(
      seedColor: _primarySeed,
      brightness: Brightness.dark,
    );
    return ThemeData(
      useMaterial3: true,
      brightness: Brightness.dark,
      colorScheme: colorScheme,
      textTheme: GoogleFonts.interTextTheme(ThemeData.dark().textTheme),
    );
  }
}
