// Basic smoke test for Agent Malas Mobile App

import 'package:flutter/material.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:provider/provider.dart';

import 'package:agent_malas_mobile/main.dart';
import 'package:agent_malas_mobile/providers/app_state.dart';

void main() {
  testWidgets('App initializes and shows splash screen', (WidgetTester tester) async {
    // Build our app and trigger a frame.
    await tester.pumpWidget(
      ChangeNotifierProvider(
        create: (_) => AppState(),
        child: const MyApp(),
      ),
    );

    // Verify that the app initializes without errors
    expect(find.byType(MaterialApp), findsOneWidget);
  });
}
