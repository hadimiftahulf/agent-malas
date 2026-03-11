import 'package:flutter/material.dart';
import 'package:provider/provider.dart';
import '../config/theme.dart';
import '../providers/app_state.dart';
import '../models/task_item.dart';

/// Premium Task List Screen — mirrors frontend TaskQueue component
///
/// Features:
/// - Segmented control (Queue / History)
/// - Search bar
/// - Status filter for history tab
/// - Task cards with status badges
/// - Retry button for failed tasks
/// - Pull-to-refresh
/// - Empty states
class TaskListScreen extends StatefulWidget {
  const TaskListScreen({super.key});

  @override
  State<TaskListScreen> createState() => _TaskListScreenState();
}

class _TaskListScreenState extends State<TaskListScreen> {
  String _tab = 'history';
  String _statusFilter = '';
  String _search = '';

  @override
  Widget build(BuildContext context) {
    return Consumer<AppState>(
      builder: (context, state, _) {
        final queue = state.taskQueue;
        final history = state.taskHistory;
        final displayedList = _tab == 'queue' ? queue : history;

        // Apply filters
        var filtered = displayedList.where((t) {
          if (_search.isNotEmpty &&
              !t.title.toLowerCase().contains(_search.toLowerCase())) {
            return false;
          }
          if (_tab == 'history' &&
              _statusFilter.isNotEmpty &&
              t.status != _statusFilter) {
            return false;
          }
          return true;
        }).toList();

        return RefreshIndicator(
          onRefresh: () => state.refreshTasks(),
          color: AppTheme.indigo,
          child: CustomScrollView(
            slivers: [
              // Header
              SliverToBoxAdapter(
                child: Padding(
                  padding: const EdgeInsets.fromLTRB(20, 24, 20, 4),
                  child: Row(
                    children: [
                      Container(
                        width: 36,
                        height: 36,
                        decoration: BoxDecoration(
                          borderRadius: BorderRadius.circular(12),
                          gradient: const LinearGradient(
                            colors: [AppTheme.indigo, AppTheme.violet],
                          ),
                          boxShadow: [
                            BoxShadow(
                              color: AppTheme.indigo.withValues(alpha: 0.25),
                              blurRadius: 10,
                              offset: const Offset(0, 3),
                            ),
                          ],
                        ),
                        child: const Icon(Icons.checklist_rounded,
                            color: Colors.white, size: 18),
                      ),
                      const SizedBox(width: 12),
                      Expanded(
                        child: Column(
                          crossAxisAlignment: CrossAxisAlignment.start,
                          children: [
                            Text('Task Explorer',
                                style: Theme.of(context)
                                    .textTheme
                                    .headlineSmall
                                    ?.copyWith(
                                      fontWeight: FontWeight.w900,
                                      letterSpacing: -0.5,
                                    )),
                            Text('Manage pending queue and history.',
                                style: TextStyle(
                                    fontSize: 11,
                                    fontWeight: FontWeight.w600,
                                    color: AppTheme.slate400)),
                          ],
                        ),
                      ),
                    ],
                  ),
                ),
              ),

              // Segmented Control
              SliverToBoxAdapter(
                child: Padding(
                  padding:
                      const EdgeInsets.symmetric(horizontal: 20, vertical: 12),
                  child: Container(
                    padding: const EdgeInsets.all(4),
                    decoration: BoxDecoration(
                      color: const Color(0xFFF1F5F9),
                      borderRadius: BorderRadius.circular(16),
                    ),
                    child: Row(
                      children: [
                        _SegmentBtn(
                          label: 'Queue',
                          badge: queue.length,
                          isActive: _tab == 'queue',
                          onTap: () => setState(() => _tab = 'queue'),
                        ),
                        _SegmentBtn(
                          label: 'History',
                          badge: null,
                          isActive: _tab == 'history',
                          onTap: () => setState(() => _tab = 'history'),
                        ),
                      ],
                    ),
                  ),
                ),
              ),

              // Search + Filter toolbar
              SliverToBoxAdapter(
                child: Padding(
                  padding:
                      const EdgeInsets.symmetric(horizontal: 20, vertical: 4),
                  child: Container(
                    padding: const EdgeInsets.all(10),
                    decoration: BoxDecoration(
                      color: Colors.white,
                      borderRadius: BorderRadius.circular(16),
                      border: Border.all(
                          color: Colors.black.withValues(alpha: 0.04)),
                    ),
                    child: Column(
                      children: [
                        // Search
                        TextField(
                          onChanged: (v) => setState(() => _search = v),
                          decoration: InputDecoration(
                            hintText: 'Search tasks...',
                            hintStyle: TextStyle(
                                color: AppTheme.slate400,
                                fontWeight: FontWeight.w500),
                            prefixIcon: Icon(Icons.search,
                                color: AppTheme.slate400, size: 18),
                            filled: true,
                            fillColor: const Color(0xFFF8FAFC),
                            border: OutlineInputBorder(
                              borderRadius: BorderRadius.circular(12),
                              borderSide: BorderSide(color: AppTheme.slate200),
                            ),
                            enabledBorder: OutlineInputBorder(
                              borderRadius: BorderRadius.circular(12),
                              borderSide: BorderSide(
                                  color:
                                      Colors.black.withValues(alpha: 0.05)),
                            ),
                            focusedBorder: OutlineInputBorder(
                              borderRadius: BorderRadius.circular(12),
                              borderSide: const BorderSide(
                                  color: AppTheme.indigo, width: 1.5),
                            ),
                            contentPadding: const EdgeInsets.symmetric(
                                horizontal: 14, vertical: 12),
                            isDense: true,
                          ),
                          style: const TextStyle(
                              fontSize: 14, fontWeight: FontWeight.w600),
                        ),
                        // Status filter (history tab only)
                        if (_tab == 'history') ...[
                          const SizedBox(height: 8),
                          SizedBox(
                            height: 34,
                            child: ListView(
                              scrollDirection: Axis.horizontal,
                              children: [
                                _FilterChip(
                                    label: 'All',
                                    isActive: _statusFilter.isEmpty,
                                    onTap: () =>
                                        setState(() => _statusFilter = '')),
                                _FilterChip(
                                    label: 'Done',
                                    isActive: _statusFilter == 'done',
                                    color: AppTheme.emerald,
                                    onTap: () => setState(
                                        () => _statusFilter = 'done')),
                                _FilterChip(
                                    label: 'Failed',
                                    isActive: _statusFilter == 'failed',
                                    color: AppTheme.rose,
                                    onTap: () => setState(
                                        () => _statusFilter = 'failed')),
                                _FilterChip(
                                    label: 'Processing',
                                    isActive: _statusFilter == 'processing',
                                    color: AppTheme.indigo,
                                    onTap: () => setState(
                                        () => _statusFilter = 'processing')),
                                _FilterChip(
                                    label: 'Queued',
                                    isActive: _statusFilter == 'queued',
                                    color: AppTheme.slate400,
                                    onTap: () => setState(
                                        () => _statusFilter = 'queued')),
                              ],
                            ),
                          ),
                        ],
                      ],
                    ),
                  ),
                ),
              ),

              // Task list
              if (filtered.isEmpty)
                SliverFillRemaining(
                  child: Center(
                    child: Column(
                      mainAxisAlignment: MainAxisAlignment.center,
                      children: [
                        Container(
                          width: 72,
                          height: 72,
                          decoration: BoxDecoration(
                            color: const Color(0xFFF8FAFC),
                            borderRadius: BorderRadius.circular(24),
                            border: Border.all(color: AppTheme.slate200),
                          ),
                          child: Icon(
                            _tab == 'queue'
                                ? Icons.free_breakfast_rounded
                                : Icons.auto_awesome_rounded,
                            size: 28,
                            color: AppTheme.slate400,
                          ),
                        ),
                        const SizedBox(height: 16),
                        Text(
                          _tab == 'queue'
                              ? 'Queue is clear'
                              : 'No tasks found',
                          style: const TextStyle(
                              fontSize: 18,
                              fontWeight: FontWeight.w800,
                              color: Color(0xFF334155)),
                        ),
                        const SizedBox(height: 4),
                        Text(
                          _tab == 'queue'
                              ? 'The agent is awaiting new operations.'
                              : 'Adjust search or clear filters.',
                          style: TextStyle(
                              fontSize: 13, color: AppTheme.slate400),
                        ),
                      ],
                    ),
                  ),
                )
              else
                SliverList(
                  delegate: SliverChildBuilderDelegate(
                    (context, index) {
                      return _TaskCard(task: filtered[index], index: index);
                    },
                    childCount: filtered.length,
                  ),
                ),

              const SliverToBoxAdapter(child: SizedBox(height: 24)),
            ],
          ),
        );
      },
    );
  }
}

// ─── Segment Button ──────────────────────────────────────────

class _SegmentBtn extends StatelessWidget {
  final String label;
  final int? badge;
  final bool isActive;
  final VoidCallback onTap;

  const _SegmentBtn({
    required this.label,
    this.badge,
    required this.isActive,
    required this.onTap,
  });

  @override
  Widget build(BuildContext context) {
    return Expanded(
      child: GestureDetector(
        onTap: onTap,
        child: AnimatedContainer(
          duration: const Duration(milliseconds: 200),
          padding: const EdgeInsets.symmetric(vertical: 10),
          decoration: BoxDecoration(
            color: isActive ? Colors.white : Colors.transparent,
            borderRadius: BorderRadius.circular(12),
            boxShadow: isActive
                ? [
                    BoxShadow(
                        color: Colors.black.withValues(alpha: 0.06),
                        blurRadius: 8,
                        offset: const Offset(0, 2))
                  ]
                : null,
          ),
          child: Row(
            mainAxisAlignment: MainAxisAlignment.center,
            children: [
              Text(label,
                  style: TextStyle(
                    fontSize: 13,
                    fontWeight: FontWeight.w800,
                    color: isActive
                        ? const Color(0xFF0F172A)
                        : AppTheme.slate400,
                  )),
              if (badge != null) ...[
                const SizedBox(width: 6),
                Container(
                  padding:
                      const EdgeInsets.symmetric(horizontal: 7, vertical: 2),
                  decoration: BoxDecoration(
                    color: isActive
                        ? const Color(0xFFEEF2FF)
                        : const Color(0xFFE2E8F0),
                    borderRadius: BorderRadius.circular(8),
                  ),
                  child: Text('$badge',
                      style: TextStyle(
                        fontSize: 10,
                        fontWeight: FontWeight.w800,
                        color: isActive
                            ? const Color(0xFF4338CA)
                            : AppTheme.slate400,
                      )),
                ),
              ],
            ],
          ),
        ),
      ),
    );
  }
}

// ─── Filter Chip ─────────────────────────────────────────────

class _FilterChip extends StatelessWidget {
  final String label;
  final bool isActive;
  final Color? color;
  final VoidCallback onTap;

  const _FilterChip({
    required this.label,
    required this.isActive,
    this.color,
    required this.onTap,
  });

  @override
  Widget build(BuildContext context) {
    return Padding(
      padding: const EdgeInsets.only(right: 6),
      child: GestureDetector(
        onTap: onTap,
        child: Container(
          padding: const EdgeInsets.symmetric(horizontal: 14, vertical: 6),
          decoration: BoxDecoration(
            color: isActive
                ? (color ?? AppTheme.indigo).withValues(alpha: 0.1)
                : const Color(0xFFF8FAFC),
            borderRadius: BorderRadius.circular(10),
            border: Border.all(
              color: isActive
                  ? (color ?? AppTheme.indigo).withValues(alpha: 0.3)
                  : AppTheme.slate200,
            ),
          ),
          child: Text(label,
              style: TextStyle(
                fontSize: 11,
                fontWeight: FontWeight.w700,
                color: isActive ? (color ?? AppTheme.indigo) : AppTheme.slate400,
              )),
        ),
      ),
    );
  }
}

// ─── Task Card ───────────────────────────────────────────────

class _TaskCard extends StatelessWidget {
  final TaskItem task;
  final int index;
  const _TaskCard({required this.task, required this.index});

  @override
  Widget build(BuildContext context) {
    final badgeCfg = _statusBadge(task.status);

    return Padding(
      padding: const EdgeInsets.symmetric(horizontal: 20, vertical: 5),
      child: Container(
        padding: const EdgeInsets.all(16),
        decoration: BoxDecoration(
          color: Colors.white,
          borderRadius: BorderRadius.circular(18),
          border: Border.all(color: Colors.black.withValues(alpha: 0.04)),
          boxShadow: [
            BoxShadow(
              color: Colors.black.withValues(alpha: 0.02),
              blurRadius: 8,
              offset: const Offset(0, 2),
            ),
          ],
        ),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Row(
              children: [
                // Task ID badge
                Container(
                  padding:
                      const EdgeInsets.symmetric(horizontal: 8, vertical: 4),
                  decoration: BoxDecoration(
                    color: const Color(0xFFF8FAFC),
                    borderRadius: BorderRadius.circular(8),
                    border: Border.all(color: AppTheme.slate200),
                  ),
                  child: Text('#${task.id}',
                      style: TextStyle(
                        fontSize: 10,
                        fontWeight: FontWeight.w800,
                        fontFamily: 'monospace',
                        color: AppTheme.slate400,
                      )),
                ),
                const SizedBox(width: 8),
                Expanded(
                  child: Text(task.title,
                      style: const TextStyle(
                        fontSize: 14,
                        fontWeight: FontWeight.w700,
                        color: Color(0xFF1E293B),
                      ),
                      maxLines: 1,
                      overflow: TextOverflow.ellipsis),
                ),
              ],
            ),
            const SizedBox(height: 8),
            Row(
              children: [
                Expanded(
                  child: Row(
                    children: [
                      if (task.repo != null) ...[
                        Icon(Icons.code_rounded, size: 12, color: AppTheme.slate400),
                        const SizedBox(width: 4),
                        Flexible(
                          child: Text(task.repo!,
                              style: TextStyle(
                                  fontSize: 11,
                                  fontWeight: FontWeight.w600,
                                  color: AppTheme.slate400),
                              maxLines: 1,
                              overflow: TextOverflow.ellipsis),
                        ),
                        const SizedBox(width: 8),
                      ],
                      Icon(Icons.schedule, size: 11, color: AppTheme.slate400),
                      const SizedBox(width: 3),
                      Text(_relativeTime(task.createdAt),
                          style: TextStyle(
                              fontSize: 11, color: AppTheme.slate400)),
                    ],
                  ),
                ),
                const SizedBox(width: 8),
                // Status badge
                Container(
                  padding:
                      const EdgeInsets.symmetric(horizontal: 10, vertical: 5),
                  decoration: BoxDecoration(
                    color: badgeCfg.bg,
                    borderRadius: BorderRadius.circular(10),
                    border: Border.all(color: badgeCfg.border),
                  ),
                  child: Row(
                    mainAxisSize: MainAxisSize.min,
                    children: [
                      Container(
                        width: 6,
                        height: 6,
                        decoration: BoxDecoration(
                          color: badgeCfg.dot,
                          shape: BoxShape.circle,
                        ),
                      ),
                      const SizedBox(width: 5),
                      Text(badgeCfg.label,
                          style: TextStyle(
                            fontSize: 9,
                            fontWeight: FontWeight.w800,
                            color: badgeCfg.text,
                            letterSpacing: 0.5,
                          )),
                    ],
                  ),
                ),
              ],
            ),
            // Retry button for failed tasks
            if (task.isFailed) ...[
              const SizedBox(height: 10),
              if (task.errorMessage != null) ...[
                Container(
                  padding: const EdgeInsets.all(10),
                  decoration: BoxDecoration(
                    color: const Color(0xFFFFF1F2),
                    borderRadius: BorderRadius.circular(10),
                    border: Border.all(color: const Color(0xFFFECDD3)),
                  ),
                  child: Row(
                    children: [
                      const Icon(Icons.error_outline,
                          size: 14, color: Color(0xFFBE123C)),
                      const SizedBox(width: 8),
                      Expanded(
                        child: Text(task.errorMessage!,
                            style: const TextStyle(
                                fontSize: 11, color: Color(0xFFBE123C)),
                            maxLines: 2,
                            overflow: TextOverflow.ellipsis),
                      ),
                    ],
                  ),
                ),
                const SizedBox(height: 8),
              ],
              SizedBox(
                width: double.infinity,
                child: OutlinedButton.icon(
                  onPressed: () {
                    context.read<AppState>().retryTask(task.id);
                  },
                  icon: const Icon(Icons.replay_rounded, size: 14),
                  label: const Text('Retry',
                      style: TextStyle(fontWeight: FontWeight.w700)),
                  style: OutlinedButton.styleFrom(
                    foregroundColor: AppTheme.indigo,
                    side: const BorderSide(color: AppTheme.indigo),
                    shape: RoundedRectangleBorder(
                      borderRadius: BorderRadius.circular(12),
                    ),
                    padding: const EdgeInsets.symmetric(vertical: 10),
                  ),
                ),
              ),
            ],
          ],
        ),
      ),
    );
  }

  _StatusBadge _statusBadge(String status) {
    switch (status) {
      case 'done':
        return _StatusBadge(
          bg: const Color(0xFFECFDF5),
          border: const Color(0xFFA7F3D0),
          dot: AppTheme.emerald,
          text: const Color(0xFF047857),
          label: 'DONE',
        );
      case 'failed':
        return _StatusBadge(
          bg: const Color(0xFFFFF1F2),
          border: const Color(0xFFFECDD3),
          dot: AppTheme.rose,
          text: const Color(0xFFBE123C),
          label: 'FAILED',
        );
      case 'processing':
        return _StatusBadge(
          bg: const Color(0xFFEEF2FF),
          border: const Color(0xFFC7D2FE),
          dot: AppTheme.indigo,
          text: const Color(0xFF4338CA),
          label: 'PROCESSING',
        );
      case 'skipped':
        return _StatusBadge(
          bg: const Color(0xFFFFFBEB),
          border: const Color(0xFFFDE68A),
          dot: AppTheme.amber,
          text: const Color(0xFF92400E),
          label: 'SKIPPED',
        );
      default:
        return _StatusBadge(
          bg: const Color(0xFFF8FAFC),
          border: AppTheme.slate200,
          dot: AppTheme.slate400,
          text: AppTheme.slate600,
          label: 'QUEUED',
        );
    }
  }

  String _relativeTime(String? iso) {
    if (iso == null) return '—';
    try {
      final d = DateTime.now().difference(DateTime.parse(iso));
      if (d.inMinutes < 1) return 'now';
      if (d.inMinutes < 60) return '${d.inMinutes}m';
      if (d.inHours < 24) return '${d.inHours}h';
      return '${d.inDays}d';
    } catch (_) {
      return '—';
    }
  }
}

class _StatusBadge {
  final Color bg, border, dot, text;
  final String label;
  const _StatusBadge({
    required this.bg,
    required this.border,
    required this.dot,
    required this.text,
    required this.label,
  });
}
