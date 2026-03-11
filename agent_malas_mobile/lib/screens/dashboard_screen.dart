import 'package:flutter/material.dart';
import 'package:provider/provider.dart';
import '../config/theme.dart';
import '../providers/app_state.dart';
import '../models/dashboard_data.dart';

/// Premium Dashboard Screen — mirrors frontend DashboardStats component
///
/// Features:
/// - Stat cards (Completed, Failed, PRs Created, PRs Revised)
/// - Agent status badge with live indicator
/// - Recent activity list
/// - Queue count card
/// - Pull-to-refresh
class DashboardScreen extends StatelessWidget {
  const DashboardScreen({super.key});

  @override
  Widget build(BuildContext context) {
    return Consumer<AppState>(
      builder: (context, state, _) {
        final data = state.dashboardData;
        final isLoading = data == null;

        return RefreshIndicator(
          onRefresh: () => state.refreshDashboard(),
          color: AppTheme.indigo,
          child: CustomScrollView(
            slivers: [
              // Header
              SliverToBoxAdapter(
                child: Padding(
                  padding: const EdgeInsets.fromLTRB(20, 24, 20, 8),
                  child: Row(
                    children: [
                      Container(
                        width: 44,
                        height: 44,
                        decoration: BoxDecoration(
                          borderRadius: BorderRadius.circular(14),
                          color: Colors.white,
                          boxShadow: [
                            BoxShadow(
                              color: AppTheme.indigo.withValues(alpha: 0.1),
                              blurRadius: 12,
                              offset: const Offset(0, 4),
                            ),
                          ],
                        ),
                        child: ClipRRect(
                          borderRadius: BorderRadius.circular(14),
                          child: Image.asset(
                            'assets/gemini_logo.png',
                            fit: BoxFit.cover,
                          ),
                        ),
                      ),
                      const SizedBox(width: 12),
                      Expanded(
                        child: Column(
                          crossAxisAlignment: CrossAxisAlignment.start,
                          children: [
                            Text(
                              'Agent Malas',
                              style: Theme.of(context).textTheme.headlineSmall
                                  ?.copyWith(
                                    fontWeight: FontWeight.w900,
                                    letterSpacing: -0.5,
                                  ),
                            ),
                            Row(
                              children: [
                                Icon(
                                  Icons.bolt_rounded,
                                  size: 13,
                                  color: AppTheme.slate400,
                                ),
                                const SizedBox(width: 3),
                                Text(
                                  'Real-time overview',
                                  style: TextStyle(
                                    fontSize: 11,
                                    fontWeight: FontWeight.w600,
                                    color: AppTheme.slate400,
                                  ),
                                ),
                              ],
                            ),
                          ],
                        ),
                      ),
                      // Agent status badge
                      _AgentBadge(status: data?.agent),
                    ],
                  ),
                ),
              ),

              // Stat Cards Grid
              SliverToBoxAdapter(
                child: Padding(
                  padding: const EdgeInsets.fromLTRB(20, 16, 20, 8),
                  child: isLoading
                      ? _buildSkeletonGrid()
                      : _buildStatGrid(data!.today),
                ),
              ),

              // Queue + Agent Row
              SliverToBoxAdapter(
                child: Padding(
                  padding: const EdgeInsets.symmetric(
                    horizontal: 20,
                    vertical: 8,
                  ),
                  child: Row(
                    children: [
                      Expanded(
                        child: _InfoCard(
                          label: 'QUEUE',
                          value: '${data?.queue.size ?? 0}',
                          subtitle: 'pending tasks',
                          icon: Icons.filter_list_rounded,
                          iconBg: const Color(0xFFF3EEFF),
                          iconColor: AppTheme.violet,
                        ),
                      ),
                      const SizedBox(width: 12),
                      Expanded(
                        child: _InfoCard(
                          label: 'UPTIME',
                          value: _formatUptime(data?.agent.uptime ?? 0),
                          subtitle: 'server',
                          icon: Icons.timer_outlined,
                          iconBg: const Color(0xFFE0F2FE),
                          iconColor: AppTheme.cyan,
                        ),
                      ),
                    ],
                  ),
                ),
              ),

              // Current task banner
              if (data?.queue.currentTask != null)
                SliverToBoxAdapter(
                  child: Padding(
                    padding: const EdgeInsets.symmetric(
                      horizontal: 20,
                      vertical: 4,
                    ),
                    child: Container(
                      padding: const EdgeInsets.symmetric(
                        horizontal: 14,
                        vertical: 10,
                      ),
                      decoration: BoxDecoration(
                        color: const Color(0xFFEEF2FF),
                        borderRadius: BorderRadius.circular(14),
                        border: Border.all(
                          color: AppTheme.indigo.withValues(alpha: 0.15),
                        ),
                      ),
                      child: Row(
                        children: [
                          SizedBox(
                            width: 14,
                            height: 14,
                            child: CircularProgressIndicator(
                              strokeWidth: 2,
                              color: AppTheme.indigo,
                            ),
                          ),
                          const SizedBox(width: 10),
                          Expanded(
                            child: Text(
                              data!.queue.currentTask!,
                              style: const TextStyle(
                                fontSize: 12,
                                fontWeight: FontWeight.w700,
                                color: Color(0xFF4338CA),
                              ),
                              maxLines: 1,
                              overflow: TextOverflow.ellipsis,
                            ),
                          ),
                        ],
                      ),
                    ),
                  ),
                ),

              // Recent Activity
              SliverToBoxAdapter(
                child: Padding(
                  padding: const EdgeInsets.fromLTRB(20, 16, 20, 4),
                  child: _SectionHeader(
                    title: 'Recent Activity',
                    subtitle: 'Last operations',
                    icon: Icons.layers_rounded,
                    iconColor: AppTheme.indigo,
                  ),
                ),
              ),

              // Activity List
              if (data?.recentTasks.isEmpty ?? true)
                SliverToBoxAdapter(
                  child: _EmptyState(
                    icon: Icons.auto_awesome_rounded,
                    message: 'No activity yet',
                    subtitle: 'Tasks will appear here when processed.',
                  ),
                )
              else
                SliverList(
                  delegate: SliverChildBuilderDelegate((context, index) {
                    final task = data!.recentTasks[index];
                    return _RecentTaskTile(task: task);
                  }, childCount: data!.recentTasks.length),
                ),

              const SliverToBoxAdapter(child: SizedBox(height: 24)),
            ],
          ),
        );
      },
    );
  }

  Widget _buildStatGrid(TodayStats stats) {
    return GridView.count(
      crossAxisCount: 2,
      mainAxisSpacing: 12,
      crossAxisSpacing: 12,
      childAspectRatio: 1.3,
      shrinkWrap: true,
      physics: const NeverScrollableScrollPhysics(),
      children: [
        _StatCard(
          label: 'Completed',
          value: stats.tasksCompleted,
          icon: Icons.check_circle_rounded,
          color: AppTheme.emerald,
          bgColor: const Color(0xFFECFDF5),
        ),
        _StatCard(
          label: 'Failed',
          value: stats.tasksFailed,
          icon: Icons.cancel_rounded,
          color: AppTheme.rose,
          bgColor: const Color(0xFFFFF1F2),
        ),
        _StatCard(
          label: 'PRs Created',
          value: stats.prsCreated,
          icon: Icons.merge_type_rounded,
          color: AppTheme.indigo,
          bgColor: const Color(0xFFEEF2FF),
        ),
        _StatCard(
          label: 'PRs Revised',
          value: stats.prsRevised,
          icon: Icons.replay_rounded,
          color: AppTheme.amber,
          bgColor: const Color(0xFFFFFBEB),
        ),
      ],
    );
  }

  Widget _buildSkeletonGrid() {
    return GridView.count(
      crossAxisCount: 2,
      mainAxisSpacing: 12,
      crossAxisSpacing: 12,
      childAspectRatio: 1.3,
      shrinkWrap: true,
      physics: const NeverScrollableScrollPhysics(),
      children: List.generate(4, (_) => _SkeletonCard()),
    );
  }

  String _formatUptime(int seconds) {
    if (seconds < 60) return '${seconds}s';
    final m = seconds ~/ 60;
    if (m < 60) return '${m}m';
    final h = m ~/ 60;
    return '${h}h ${m % 60}m';
  }
}

// ─── Premium Stat Card ────────────────────────────────────────

class _StatCard extends StatelessWidget {
  final String label;
  final int value;
  final IconData icon;
  final Color color;
  final Color bgColor;

  const _StatCard({
    required this.label,
    required this.value,
    required this.icon,
    required this.color,
    required this.bgColor,
  });

  @override
  Widget build(BuildContext context) {
    return Container(
      padding: const EdgeInsets.all(16),
      decoration: BoxDecoration(
        color: Colors.white,
        borderRadius: BorderRadius.circular(20),
        border: Border.all(color: Colors.black.withValues(alpha: 0.04)),
        boxShadow: [
          BoxShadow(
            color: Colors.black.withValues(alpha: 0.03),
            blurRadius: 12,
            offset: const Offset(0, 2),
          ),
        ],
      ),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Row(
            mainAxisAlignment: MainAxisAlignment.spaceBetween,
            children: [
              Text(
                label.toUpperCase(),
                style: TextStyle(
                  fontSize: 9,
                  fontWeight: FontWeight.w800,
                  color: AppTheme.slate400,
                  letterSpacing: 1.2,
                ),
              ),
              Container(
                width: 30,
                height: 30,
                decoration: BoxDecoration(
                  color: bgColor,
                  borderRadius: BorderRadius.circular(10),
                ),
                child: Icon(icon, size: 15, color: color),
              ),
            ],
          ),
          const Spacer(),
          Text(
            '$value',
            style: TextStyle(
              fontSize: 28,
              fontWeight: FontWeight.w900,
              color: const Color(0xFF1E293B),
              letterSpacing: -1,
            ),
          ),
          Text(
            'Today',
            style: TextStyle(
              fontSize: 9,
              fontWeight: FontWeight.w700,
              color: AppTheme.slate400.withValues(alpha: 0.6),
              letterSpacing: 0.8,
            ),
          ),
        ],
      ),
    );
  }
}

// ─── Info Card ────────────────────────────────────────────────

class _InfoCard extends StatelessWidget {
  final String label;
  final String value;
  final String subtitle;
  final IconData icon;
  final Color iconBg;
  final Color iconColor;

  const _InfoCard({
    required this.label,
    required this.value,
    required this.subtitle,
    required this.icon,
    required this.iconBg,
    required this.iconColor,
  });

  @override
  Widget build(BuildContext context) {
    return Container(
      padding: const EdgeInsets.all(16),
      decoration: BoxDecoration(
        color: Colors.white,
        borderRadius: BorderRadius.circular(20),
        border: Border.all(color: Colors.black.withValues(alpha: 0.04)),
        boxShadow: [
          BoxShadow(
            color: Colors.black.withValues(alpha: 0.03),
            blurRadius: 12,
            offset: const Offset(0, 2),
          ),
        ],
      ),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Row(
            mainAxisAlignment: MainAxisAlignment.spaceBetween,
            children: [
              Text(
                label,
                style: TextStyle(
                  fontSize: 9,
                  fontWeight: FontWeight.w800,
                  color: AppTheme.slate400,
                  letterSpacing: 1.2,
                ),
              ),
              Container(
                width: 28,
                height: 28,
                decoration: BoxDecoration(
                  color: iconBg,
                  borderRadius: BorderRadius.circular(9),
                ),
                child: Icon(icon, size: 14, color: iconColor),
              ),
            ],
          ),
          const SizedBox(height: 8),
          Text(
            value,
            style: const TextStyle(
              fontSize: 24,
              fontWeight: FontWeight.w900,
              letterSpacing: -0.8,
            ),
          ),
          Text(
            subtitle,
            style: TextStyle(
              fontSize: 9,
              fontWeight: FontWeight.w700,
              color: AppTheme.slate400.withValues(alpha: 0.6),
              letterSpacing: 0.8,
            ),
          ),
        ],
      ),
    );
  }
}

// ─── Agent Status Badge ──────────────────────────────────────

class _AgentBadge extends StatelessWidget {
  final AgentInfo? status;
  const _AgentBadge({this.status});

  @override
  Widget build(BuildContext context) {
    final s = status?.status ?? 'stopped';
    final cfg = _statusCfg(s);

    return Container(
      padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 8),
      decoration: BoxDecoration(
        color: cfg.bg,
        borderRadius: BorderRadius.circular(12),
        border: Border.all(color: cfg.border),
      ),
      child: Row(
        mainAxisSize: MainAxisSize.min,
        children: [
          Container(
            width: 8,
            height: 8,
            decoration: BoxDecoration(color: cfg.dot, shape: BoxShape.circle),
          ),
          const SizedBox(width: 6),
          Text(
            cfg.label,
            style: TextStyle(
              fontSize: 10,
              fontWeight: FontWeight.w800,
              color: cfg.text,
              letterSpacing: 0.5,
            ),
          ),
        ],
      ),
    );
  }

  _BadgeCfg _statusCfg(String s) {
    switch (s) {
      case 'running':
        return _BadgeCfg(
          bg: const Color(0xFFECFDF5),
          border: const Color(0xFFA7F3D0),
          dot: AppTheme.emerald,
          text: const Color(0xFF047857),
          label: 'RUNNING',
        );
      case 'processing':
        return _BadgeCfg(
          bg: const Color(0xFFEEF2FF),
          border: const Color(0xFFC7D2FE),
          dot: AppTheme.indigo,
          text: const Color(0xFF4338CA),
          label: 'PROCESSING',
        );
      case 'idle':
        return _BadgeCfg(
          bg: const Color(0xFFFFFBEB),
          border: const Color(0xFFFDE68A),
          dot: AppTheme.amber,
          text: const Color(0xFF92400E),
          label: 'IDLE',
        );
      case 'waiting_approval':
        return _BadgeCfg(
          bg: const Color(0xFFEFF6FF),
          border: const Color(0xFFBFDBFE),
          dot: const Color(0xFF3B82F6),
          text: const Color(0xFF1D4ED8),
          label: 'WAITING',
        );
      default:
        return _BadgeCfg(
          bg: const Color(0xFFF8FAFC),
          border: AppTheme.slate200,
          dot: AppTheme.slate400,
          text: AppTheme.slate600,
          label: 'OFFLINE',
        );
    }
  }
}

class _BadgeCfg {
  final Color bg, border, dot, text;
  final String label;
  const _BadgeCfg({
    required this.bg,
    required this.border,
    required this.dot,
    required this.text,
    required this.label,
  });
}

// ─── Recent Task Tile ────────────────────────────────────────

class _RecentTaskTile extends StatelessWidget {
  final RecentTask task;
  const _RecentTaskTile({required this.task});

  @override
  Widget build(BuildContext context) {
    final dotColor = _dotColor(task.status);
    final badgeCfg = _badgeCfg(task.status);

    return Padding(
      padding: const EdgeInsets.symmetric(horizontal: 20, vertical: 3),
      child: Container(
        padding: const EdgeInsets.all(14),
        decoration: BoxDecoration(
          color: Colors.white,
          borderRadius: BorderRadius.circular(16),
          border: Border.all(color: Colors.black.withValues(alpha: 0.04)),
        ),
        child: Row(
          children: [
            Container(
              width: 6,
              height: 6,
              decoration: BoxDecoration(
                color: dotColor,
                shape: BoxShape.circle,
              ),
            ),
            const SizedBox(width: 12),
            Expanded(
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  Text(
                    task.title,
                    style: const TextStyle(
                      fontSize: 13,
                      fontWeight: FontWeight.w700,
                      color: Color(0xFF334155),
                    ),
                    maxLines: 1,
                    overflow: TextOverflow.ellipsis,
                  ),
                  const SizedBox(height: 3),
                  Row(
                    children: [
                      if (task.repo != null) ...[
                        Icon(
                          Icons.code_rounded,
                          size: 10,
                          color: AppTheme.slate400,
                        ),
                        const SizedBox(width: 3),
                        Text(
                          task.repo!.split('/').last,
                          style: TextStyle(
                            fontSize: 10,
                            color: AppTheme.slate400,
                          ),
                        ),
                        const SizedBox(width: 8),
                      ],
                      Icon(Icons.schedule, size: 9, color: AppTheme.slate400),
                      const SizedBox(width: 3),
                      Text(
                        _relativeTime(task.completedAt ?? task.createdAt),
                        style: TextStyle(fontSize: 9, color: AppTheme.slate400),
                      ),
                    ],
                  ),
                ],
              ),
            ),
            Container(
              padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 4),
              decoration: BoxDecoration(
                color: badgeCfg.$1,
                borderRadius: BorderRadius.circular(8),
                border: Border.all(color: badgeCfg.$3),
              ),
              child: Text(
                badgeCfg.$4,
                style: TextStyle(
                  fontSize: 8,
                  fontWeight: FontWeight.w800,
                  color: badgeCfg.$2,
                  letterSpacing: 0.5,
                ),
              ),
            ),
          ],
        ),
      ),
    );
  }

  Color _dotColor(String status) {
    switch (status) {
      case 'done':
        return AppTheme.emerald;
      case 'failed':
        return AppTheme.rose;
      case 'processing':
        return AppTheme.indigo;
      default:
        return AppTheme.slate400;
    }
  }

  (Color, Color, Color, String) _badgeCfg(String status) {
    switch (status) {
      case 'done':
        return (
          const Color(0xFFECFDF5),
          const Color(0xFF047857),
          const Color(0xFFA7F3D0),
          'DONE',
        );
      case 'failed':
        return (
          const Color(0xFFFFF1F2),
          const Color(0xFFBE123C),
          const Color(0xFFFECDD3),
          'FAILED',
        );
      case 'processing':
        return (
          const Color(0xFFEEF2FF),
          const Color(0xFF4338CA),
          const Color(0xFFC7D2FE),
          'PROCESSING',
        );
      case 'queued':
        return (
          const Color(0xFFF8FAFC),
          AppTheme.slate600,
          AppTheme.slate200,
          'QUEUED',
        );
      default:
        return (
          const Color(0xFFF8FAFC),
          AppTheme.slate600,
          AppTheme.slate200,
          status.toUpperCase(),
        );
    }
  }

  String _relativeTime(String? iso) {
    if (iso == null) return '—';
    try {
      final d = DateTime.now().difference(DateTime.parse(iso));
      if (d.inMinutes < 1) return 'just now';
      if (d.inMinutes < 60) return '${d.inMinutes}m ago';
      if (d.inHours < 24) return '${d.inHours}h ago';
      return '${d.inDays}d ago';
    } catch (_) {
      return '—';
    }
  }
}

// ─── Section Header ──────────────────────────────────────────

class _SectionHeader extends StatelessWidget {
  final String title;
  final String subtitle;
  final IconData icon;
  final Color iconColor;

  const _SectionHeader({
    required this.title,
    required this.subtitle,
    required this.icon,
    required this.iconColor,
  });

  @override
  Widget build(BuildContext context) {
    return Row(
      children: [
        Container(
          width: 32,
          height: 32,
          decoration: BoxDecoration(
            color: iconColor.withValues(alpha: 0.1),
            borderRadius: BorderRadius.circular(10),
            border: Border.all(color: iconColor.withValues(alpha: 0.15)),
          ),
          child: Icon(icon, size: 14, color: iconColor),
        ),
        const SizedBox(width: 10),
        Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Text(
              title,
              style: const TextStyle(fontSize: 14, fontWeight: FontWeight.w800),
            ),
            Text(
              subtitle,
              style: TextStyle(
                fontSize: 10,
                fontWeight: FontWeight.w600,
                color: AppTheme.slate400,
              ),
            ),
          ],
        ),
      ],
    );
  }
}

// ─── Empty State ─────────────────────────────────────────────

class _EmptyState extends StatelessWidget {
  final IconData icon;
  final String message;
  final String subtitle;

  const _EmptyState({
    required this.icon,
    required this.message,
    required this.subtitle,
  });

  @override
  Widget build(BuildContext context) {
    return Padding(
      padding: const EdgeInsets.all(40),
      child: Column(
        children: [
          Icon(icon, size: 40, color: AppTheme.slate200),
          const SizedBox(height: 12),
          Text(
            message,
            style: const TextStyle(
              fontSize: 14,
              fontWeight: FontWeight.w700,
              color: Color(0xFF94A3B8),
            ),
          ),
          const SizedBox(height: 4),
          Text(
            subtitle,
            style: TextStyle(fontSize: 12, color: AppTheme.slate400),
          ),
        ],
      ),
    );
  }
}

// ─── Skeleton ────────────────────────────────────────────────

class _SkeletonCard extends StatelessWidget {
  @override
  Widget build(BuildContext context) {
    return Container(
      decoration: BoxDecoration(
        color: Colors.white.withValues(alpha: 0.6),
        borderRadius: BorderRadius.circular(20),
        border: Border.all(color: AppTheme.slate200),
      ),
    );
  }
}
