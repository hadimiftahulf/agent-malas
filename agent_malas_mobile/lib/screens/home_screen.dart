import 'package:flutter/material.dart';
import 'package:provider/provider.dart';
import '../config/theme.dart';
import '../providers/app_state.dart';
import 'dashboard_screen.dart';
import 'task_list_screen.dart';
import 'pr_screen.dart';
import 'approval_screen.dart';
import 'settings_screen.dart';

/// Home Screen — shell with premium bottom navigation
///
/// Manages page switching between Dashboard, Tasks, PRs, Approvals, and Settings.
/// Shows badge on Approvals tab when pending approvals exist.
class HomeScreen extends StatefulWidget {
  const HomeScreen({super.key});

  @override
  State<HomeScreen> createState() => _HomeScreenState();
}

class _HomeScreenState extends State<HomeScreen> {
  int _currentIndex = 0;

  static const _pages = [
    DashboardScreen(),
    TaskListScreen(),
    PRScreen(),
    ApprovalScreen(),
    SettingsScreen(),
  ];

  @override
  Widget build(BuildContext context) {
    return Consumer<AppState>(
      builder: (context, state, _) {
        return Scaffold(
          body: SafeArea(child: _pages[_currentIndex]),
          bottomNavigationBar: Container(
            decoration: BoxDecoration(
              color: Colors.white,
              border: Border(
                top: BorderSide(
                    color: Colors.black.withValues(alpha: 0.05)),
              ),
              boxShadow: [
                BoxShadow(
                  color: Colors.black.withValues(alpha: 0.04),
                  blurRadius: 20,
                  offset: const Offset(0, -4),
                ),
              ],
            ),
            child: SafeArea(
              child: Padding(
                padding:
                    const EdgeInsets.symmetric(horizontal: 4, vertical: 6),
                child: Row(
                  children: [
                    _NavItem(
                      icon: Icons.dashboard_rounded,
                      label: 'Dashboard',
                      isActive: _currentIndex == 0,
                      onTap: () => setState(() => _currentIndex = 0),
                    ),
                    _NavItem(
                      icon: Icons.checklist_rounded,
                      label: 'Tasks',
                      isActive: _currentIndex == 1,
                      onTap: () => setState(() => _currentIndex = 1),
                    ),
                    _NavItem(
                      icon: Icons.merge_rounded,
                      label: 'PRs',
                      isActive: _currentIndex == 2,
                      onTap: () => setState(() => _currentIndex = 2),
                    ),
                    _NavItem(
                      icon: Icons.notifications_rounded,
                      label: 'Approvals',
                      isActive: _currentIndex == 3,
                      badge: state.pendingCount > 0
                          ? state.pendingCount
                          : null,
                      onTap: () => setState(() => _currentIndex = 3),
                    ),
                    _NavItem(
                      icon: Icons.settings_rounded,
                      label: 'Settings',
                      isActive: _currentIndex == 4,
                      onTap: () => setState(() => _currentIndex = 4),
                    ),
                  ],
                ),
              ),
            ),
          ),
        );
      },
    );
  }
}

// ─── Bottom Nav Item ─────────────────────────────────────────

class _NavItem extends StatelessWidget {
  final IconData icon;
  final String label;
  final bool isActive;
  final int? badge;
  final VoidCallback onTap;

  const _NavItem({
    required this.icon,
    required this.label,
    required this.isActive,
    this.badge,
    required this.onTap,
  });

  @override
  Widget build(BuildContext context) {
    return Expanded(
      child: GestureDetector(
        behavior: HitTestBehavior.opaque,
        onTap: onTap,
        child: AnimatedContainer(
          duration: const Duration(milliseconds: 200),
          padding: const EdgeInsets.symmetric(vertical: 6),
          decoration: BoxDecoration(
            color: isActive
                ? AppTheme.indigo.withValues(alpha: 0.08)
                : Colors.transparent,
            borderRadius: BorderRadius.circular(14),
          ),
          child: Column(
            mainAxisSize: MainAxisSize.min,
            children: [
              Stack(
                clipBehavior: Clip.none,
                children: [
                  Icon(icon,
                      size: 22,
                      color: isActive
                          ? AppTheme.indigo
                          : AppTheme.slate400),
                  // Badge
                  if (badge != null)
                    Positioned(
                      top: -6,
                      right: -10,
                      child: Container(
                        padding: const EdgeInsets.symmetric(
                            horizontal: 5, vertical: 2),
                        decoration: BoxDecoration(
                          color: AppTheme.rose,
                          borderRadius: BorderRadius.circular(10),
                          boxShadow: [
                            BoxShadow(
                              color: AppTheme.rose.withValues(alpha: 0.4),
                              blurRadius: 6,
                              offset: const Offset(0, 2),
                            ),
                          ],
                        ),
                        child: Text('$badge',
                            style: const TextStyle(
                              fontSize: 9,
                              fontWeight: FontWeight.w800,
                              color: Colors.white,
                            )),
                      ),
                    ),
                ],
              ),
              const SizedBox(height: 4),
              Text(label,
                  style: TextStyle(
                    fontSize: 10,
                    fontWeight: isActive ? FontWeight.w800 : FontWeight.w600,
                    color: isActive
                        ? AppTheme.indigo
                        : AppTheme.slate400,
                    letterSpacing: 0.2,
                  )),
            ],
          ),
        ),
      ),
    );
  }
}
