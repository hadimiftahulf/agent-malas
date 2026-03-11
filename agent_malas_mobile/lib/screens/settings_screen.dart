import 'package:flutter/material.dart';
import 'package:provider/provider.dart';
import '../config/theme.dart';
import '../providers/app_state.dart';
import 'splash_screen.dart';

/// Premium Settings Screen — connection management and app info
///
/// Features:
/// - Server connection info (API + WS URLs)
/// - WebSocket status with reconnect
/// - Agent status
/// - Disconnect / Reset config
/// - App version info
class SettingsScreen extends StatelessWidget {
  const SettingsScreen({super.key});

  @override
  Widget build(BuildContext context) {
    return Consumer<AppState>(
      builder: (context, state, _) {
        final config = state.apiConfig;
        final data = state.dashboardData;

        return ListView(
          padding: const EdgeInsets.fromLTRB(20, 24, 20, 40),
          children: [
            // Header
            Row(
              children: [
                Container(
                  width: 36,
                  height: 36,
                  decoration: BoxDecoration(
                    borderRadius: BorderRadius.circular(12),
                    gradient: const LinearGradient(
                      colors: [Color(0xFF64748B), Color(0xFF475569)],
                    ),
                  ),
                  child: const Icon(Icons.settings_rounded,
                      color: Colors.white, size: 18),
                ),
                const SizedBox(width: 12),
                Text('Settings',
                    style: Theme.of(context).textTheme.headlineSmall?.copyWith(
                          fontWeight: FontWeight.w900,
                          letterSpacing: -0.5,
                        )),
              ],
            ),

            const SizedBox(height: 24),

            // Connection Section
            _SectionLabel(label: 'CONNECTION'),
            const SizedBox(height: 8),
            _SettingsCard(
              children: [
                _InfoRow(
                  icon: Icons.dns_outlined,
                  label: 'Server URL',
                  value: config?.apiUrl ?? '—',
                  iconColor: AppTheme.indigo,
                ),
                const Divider(height: 1),
                _InfoRow(
                  icon: Icons.cable_rounded,
                  label: 'WebSocket URL',
                  value: config?.wsUrl ?? '—',
                  iconColor: AppTheme.violet,
                ),
                const Divider(height: 1),
                _StatusRow(
                  icon: Icons.wifi_rounded,
                  label: 'WebSocket Status',
                  isConnected: state.wsConnected,
                ),
              ],
            ),

            const SizedBox(height: 8),

            // Reconnect button
            _ActionButton(
              icon: Icons.refresh_rounded,
              label: 'Reconnect WebSocket',
              iconColor: AppTheme.indigo,
              onTap: () {
                state.reconnectWebSocket();
                ScaffoldMessenger.of(context).showSnackBar(
                  const SnackBar(content: Text('🔄 Reconnecting...')),
                );
              },
            ),

            const SizedBox(height: 24),

            // Agent Section
            _SectionLabel(label: 'AGENT'),
            const SizedBox(height: 8),
            _SettingsCard(
              children: [
                _InfoRow(
                  icon: Icons.smart_toy_outlined,
                  label: 'Agent Status',
                  value: data?.agent.statusLabel ?? 'Unknown',
                  iconColor: AppTheme.emerald,
                  valueColor: _agentColor(data?.agent.status),
                ),
                const Divider(height: 1),
                _InfoRow(
                  icon: Icons.timer_outlined,
                  label: 'Uptime',
                  value: _formatUptime(data?.agent.uptime ?? 0),
                  iconColor: AppTheme.cyan,
                ),
                const Divider(height: 1),
                _InfoRow(
                  icon: Icons.queue_rounded,
                  label: 'Queue Size',
                  value: '${data?.queue.size ?? 0} tasks',
                  iconColor: AppTheme.amber,
                ),
              ],
            ),

            const SizedBox(height: 24),

            // Danger Zone
            _SectionLabel(label: 'DANGER ZONE'),
            const SizedBox(height: 8),
            _ActionButton(
              icon: Icons.link_off_rounded,
              label: 'Disconnect & Reset',
              iconColor: AppTheme.rose,
              textColor: AppTheme.rose,
              onTap: () => _showDisconnectDialog(context, state),
            ),

            const SizedBox(height: 24),

            // App Info
            _SectionLabel(label: 'APP INFO'),
            const SizedBox(height: 8),
            _SettingsCard(
              children: [
                _InfoRow(
                  icon: Icons.info_outline_rounded,
                  label: 'App Version',
                  value: '1.0.0 (Sprint 1)',
                  iconColor: AppTheme.slate400,
                ),
                const Divider(height: 1),
                _InfoRow(
                  icon: Icons.flutter_dash_rounded,
                  label: 'Built with',
                  value: 'Flutter 3.x',
                  iconColor: const Color(0xFF02569B),
                ),
              ],
            ),
          ],
        );
      },
    );
  }

  Color _agentColor(String? status) {
    switch (status) {
      case 'running':
        return AppTheme.emerald;
      case 'processing':
        return AppTheme.indigo;
      case 'idle':
        return AppTheme.amber;
      default:
        return AppTheme.slate400;
    }
  }

  String _formatUptime(int seconds) {
    if (seconds < 60) return '${seconds}s';
    final m = seconds ~/ 60;
    if (m < 60) return '${m}m';
    final h = m ~/ 60;
    return '${h}h ${m % 60}m';
  }

  void _showDisconnectDialog(BuildContext context, AppState state) {
    showDialog(
      context: context,
      builder: (ctx) => AlertDialog(
        shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(20)),
        title: const Text('Disconnect?',
            style: TextStyle(fontWeight: FontWeight.w800)),
        content: const Text(
            'This will remove the server configuration. You will need to scan the QR code or set up manually again.'),
        actions: [
          TextButton(
            onPressed: () => Navigator.pop(ctx),
            child: Text('Cancel', style: TextStyle(color: AppTheme.slate400)),
          ),
          FilledButton(
            style: FilledButton.styleFrom(backgroundColor: AppTheme.rose),
            onPressed: () async {
              Navigator.pop(ctx);
              await state.clearConfig();
              if (context.mounted) {
                Navigator.of(context).pushAndRemoveUntil(
                  MaterialPageRoute(builder: (_) => const SplashScreen()),
                  (route) => false,
                );
              }
            },
            child: const Text('Disconnect'),
          ),
        ],
      ),
    );
  }
}

// ─── Section Label ───────────────────────────────────────────

class _SectionLabel extends StatelessWidget {
  final String label;
  const _SectionLabel({required this.label});

  @override
  Widget build(BuildContext context) {
    return Text(label,
        style: TextStyle(
          fontSize: 10,
          fontWeight: FontWeight.w800,
          color: AppTheme.slate400,
          letterSpacing: 1.5,
        ));
  }
}

// ─── Settings Card ───────────────────────────────────────────

class _SettingsCard extends StatelessWidget {
  final List<Widget> children;
  const _SettingsCard({required this.children});

  @override
  Widget build(BuildContext context) {
    return Container(
      decoration: BoxDecoration(
        color: Colors.white,
        borderRadius: BorderRadius.circular(18),
        border: Border.all(color: Colors.black.withValues(alpha: 0.04)),
        boxShadow: [
          BoxShadow(
            color: Colors.black.withValues(alpha: 0.03),
            blurRadius: 12,
            offset: const Offset(0, 2),
          ),
        ],
      ),
      child: Column(children: children),
    );
  }
}

// ─── Info Row ────────────────────────────────────────────────

class _InfoRow extends StatelessWidget {
  final IconData icon;
  final String label;
  final String value;
  final Color iconColor;
  final Color? valueColor;

  const _InfoRow({
    required this.icon,
    required this.label,
    required this.value,
    required this.iconColor,
    this.valueColor,
  });

  @override
  Widget build(BuildContext context) {
    return Padding(
      padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 14),
      child: Row(
        children: [
          Container(
            width: 32,
            height: 32,
            decoration: BoxDecoration(
              color: iconColor.withValues(alpha: 0.1),
              borderRadius: BorderRadius.circular(9),
            ),
            child: Icon(icon, size: 16, color: iconColor),
          ),
          const SizedBox(width: 12),
          Expanded(
            child: Text(label,
                style: const TextStyle(
                    fontSize: 13,
                    fontWeight: FontWeight.w600,
                    color: Color(0xFF334155))),
          ),
          Flexible(
            child: Text(value,
                style: TextStyle(
                  fontSize: 12,
                  fontWeight: FontWeight.w700,
                  color: valueColor ?? AppTheme.slate400,
                ),
                textAlign: TextAlign.right,
                maxLines: 1,
                overflow: TextOverflow.ellipsis),
          ),
        ],
      ),
    );
  }
}

// ─── Status Row ──────────────────────────────────────────────

class _StatusRow extends StatelessWidget {
  final IconData icon;
  final String label;
  final bool isConnected;

  const _StatusRow({
    required this.icon,
    required this.label,
    required this.isConnected,
  });

  @override
  Widget build(BuildContext context) {
    return Padding(
      padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 14),
      child: Row(
        children: [
          Container(
            width: 32,
            height: 32,
            decoration: BoxDecoration(
              color: (isConnected ? AppTheme.emerald : AppTheme.rose)
                  .withValues(alpha: 0.1),
              borderRadius: BorderRadius.circular(9),
            ),
            child: Icon(icon,
                size: 16,
                color: isConnected ? AppTheme.emerald : AppTheme.rose),
          ),
          const SizedBox(width: 12),
          Expanded(
            child: Text(label,
                style: const TextStyle(
                    fontSize: 13,
                    fontWeight: FontWeight.w600,
                    color: Color(0xFF334155))),
          ),
          Container(
            padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 5),
            decoration: BoxDecoration(
              color: isConnected
                  ? const Color(0xFFECFDF5)
                  : const Color(0xFFFFF1F2),
              borderRadius: BorderRadius.circular(8),
              border: Border.all(
                color: isConnected
                    ? const Color(0xFFA7F3D0)
                    : const Color(0xFFFECDD3),
              ),
            ),
            child: Row(
              mainAxisSize: MainAxisSize.min,
              children: [
                Container(
                  width: 6,
                  height: 6,
                  decoration: BoxDecoration(
                    color: isConnected ? AppTheme.emerald : AppTheme.rose,
                    shape: BoxShape.circle,
                  ),
                ),
                const SizedBox(width: 5),
                Text(
                  isConnected ? 'Connected' : 'Disconnected',
                  style: TextStyle(
                    fontSize: 10,
                    fontWeight: FontWeight.w800,
                    color: isConnected
                        ? const Color(0xFF047857)
                        : const Color(0xFFBE123C),
                  ),
                ),
              ],
            ),
          ),
        ],
      ),
    );
  }
}

// ─── Action Button ───────────────────────────────────────────

class _ActionButton extends StatelessWidget {
  final IconData icon;
  final String label;
  final Color iconColor;
  final Color? textColor;
  final VoidCallback onTap;

  const _ActionButton({
    required this.icon,
    required this.label,
    required this.iconColor,
    this.textColor,
    required this.onTap,
  });

  @override
  Widget build(BuildContext context) {
    return Material(
      color: Colors.white,
      borderRadius: BorderRadius.circular(18),
      child: InkWell(
        borderRadius: BorderRadius.circular(18),
        onTap: onTap,
        child: Container(
          padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 14),
          decoration: BoxDecoration(
            borderRadius: BorderRadius.circular(18),
            border: Border.all(color: Colors.black.withValues(alpha: 0.04)),
          ),
          child: Row(
            children: [
              Container(
                width: 32,
                height: 32,
                decoration: BoxDecoration(
                  color: iconColor.withValues(alpha: 0.1),
                  borderRadius: BorderRadius.circular(9),
                ),
                child: Icon(icon, size: 16, color: iconColor),
              ),
              const SizedBox(width: 12),
              Text(label,
                  style: TextStyle(
                    fontSize: 13,
                    fontWeight: FontWeight.w700,
                    color: textColor ?? const Color(0xFF334155),
                  )),
              const Spacer(),
              Icon(Icons.chevron_right_rounded,
                  size: 18, color: AppTheme.slate400),
            ],
          ),
        ),
      ),
    );
  }
}
