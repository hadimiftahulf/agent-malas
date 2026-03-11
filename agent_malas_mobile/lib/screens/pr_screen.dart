import 'package:flutter/material.dart';
import 'package:provider/provider.dart';
import 'package:url_launcher/url_launcher.dart';
import '../config/theme.dart';
import '../providers/app_state.dart';
import '../models/pull_request_item.dart';

/// Premium Pull Requests Screen — mirrors frontend PRTracker component
///
/// Features:
/// - List PRs with status & review badges
/// - Status filter (All, Open, Merged, Closed)
/// - Comment progress bar per PR
/// - View Comments bottom sheet
/// - Pull-to-refresh
class PRScreen extends StatefulWidget {
  const PRScreen({super.key});

  @override
  State<PRScreen> createState() => _PRScreenState();
}

class _PRScreenState extends State<PRScreen> {
  String _statusFilter = '';
  List<PullRequestItem> _prs = [];
  bool _loading = true;
  int _total = 0;

  @override
  void initState() {
    super.initState();
    _fetchPRs();
  }

  Future<void> _fetchPRs() async {
    setState(() => _loading = true);
    final state = context.read<AppState>();
    if (state.apiService == null) {
      if (mounted) setState(() => _loading = false);
      return;
    }
    try {
      final data = await state.apiService!.getPullRequests(
        status: _statusFilter.isNotEmpty ? _statusFilter : null,
      );
      final list = (data['data'] as List<dynamic>?)
              ?.map((e) => PullRequestItem.fromJson(e))
              .toList() ??
          [];
      if (mounted) {
        setState(() {
          _prs = list;
          _total = data['total'] ?? list.length;
          _loading = false;
        });
      }
    } catch (e) {
      if (mounted) {
        setState(() => _loading = false);
      }
    }
  }

  @override
  Widget build(BuildContext context) {
    return RefreshIndicator(
      onRefresh: _fetchPRs,
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
                    child: const Icon(Icons.merge_rounded,
                        color: Colors.white, size: 18),
                  ),
                  const SizedBox(width: 12),
                  Expanded(
                    child: Column(
                      crossAxisAlignment: CrossAxisAlignment.start,
                      children: [
                        Text('Pull Requests',
                            style: Theme.of(context)
                                .textTheme
                                .headlineSmall
                                ?.copyWith(
                                  fontWeight: FontWeight.w900,
                                  letterSpacing: -0.5,
                                )),
                        Text('Tracking PRs and pending reviews.',
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

          // Filter bar
          SliverToBoxAdapter(
            child: Padding(
              padding: const EdgeInsets.fromLTRB(20, 12, 20, 8),
              child: Row(
                children: [
                  // Total badge
                  Container(
                    padding:
                        const EdgeInsets.symmetric(horizontal: 10, vertical: 6),
                    decoration: BoxDecoration(
                      color: const Color(0xFFEEF2FF),
                      borderRadius: BorderRadius.circular(12),
                      border: Border.all(color: const Color(0xFFC7D2FE)),
                    ),
                    child: Text('$_total PRs',
                        style: const TextStyle(
                          fontSize: 11,
                          fontWeight: FontWeight.w800,
                          color: Color(0xFF4338CA),
                          letterSpacing: 0.3,
                        )),
                  ),
                  const SizedBox(width: 8),
                  // Status chips
                  Expanded(
                    child: SizedBox(
                      height: 34,
                      child: ListView(
                        scrollDirection: Axis.horizontal,
                        children: [
                          _StatusChip(
                              label: 'All',
                              isActive: _statusFilter.isEmpty,
                              onTap: () {
                                setState(() => _statusFilter = '');
                                _fetchPRs();
                              }),
                          _StatusChip(
                              label: 'Open',
                              isActive: _statusFilter == 'open',
                              color: AppTheme.indigo,
                              onTap: () {
                                setState(() => _statusFilter = 'open');
                                _fetchPRs();
                              }),
                          _StatusChip(
                              label: 'Merged',
                              isActive: _statusFilter == 'merged',
                              color: AppTheme.violet,
                              onTap: () {
                                setState(() => _statusFilter = 'merged');
                                _fetchPRs();
                              }),
                          _StatusChip(
                              label: 'Closed',
                              isActive: _statusFilter == 'closed',
                              color: AppTheme.slate400,
                              onTap: () {
                                setState(() => _statusFilter = 'closed');
                                _fetchPRs();
                              }),
                        ],
                      ),
                    ),
                  ),
                ],
              ),
            ),
          ),

          // PR list
          if (_loading)
            SliverList(
              delegate: SliverChildBuilderDelegate(
                (_, index) => _SkeletonPR(),
                childCount: 3,
              ),
            )
          else if (_prs.isEmpty)
            SliverFillRemaining(child: _EmptyPRs())
          else
            SliverList(
              delegate: SliverChildBuilderDelegate(
                (context, index) => _PRCard(pr: _prs[index], onRefresh: _fetchPRs),
                childCount: _prs.length,
              ),
            ),

          const SliverToBoxAdapter(child: SizedBox(height: 24)),
        ],
      ),
    );
  }
}

// ─── Status Chip ─────────────────────────────────────────────

class _StatusChip extends StatelessWidget {
  final String label;
  final bool isActive;
  final Color? color;
  final VoidCallback onTap;

  const _StatusChip({
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

// ─── PR Card ─────────────────────────────────────────────────

class _PRCard extends StatelessWidget {
  final PullRequestItem pr;
  final VoidCallback onRefresh;
  const _PRCard({required this.pr, required this.onRefresh});

  @override
  Widget build(BuildContext context) {
    final statusCfg = _prStatusConfig(pr.status);
    final reviewCfg = _reviewConfig(pr.reviewDecision);

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
              color: Colors.black.withValues(alpha: 0.03),
              blurRadius: 12,
              offset: const Offset(0, 3),
            ),
          ],
        ),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            // Title row
            Row(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Icon(Icons.merge_type_rounded, size: 16, color: statusCfg.dot),
                const SizedBox(width: 8),
                Expanded(
                  child: Text(
                    pr.title ?? 'PR #${pr.id}',
                    style: const TextStyle(
                      fontSize: 14,
                      fontWeight: FontWeight.w800,
                      color: Color(0xFF1E293B),
                    ),
                    maxLines: 2,
                    overflow: TextOverflow.ellipsis,
                  ),
                ),
                const SizedBox(width: 8),
                Container(
                  padding:
                      const EdgeInsets.symmetric(horizontal: 8, vertical: 4),
                  decoration: BoxDecoration(
                    color: const Color(0xFFF8FAFC),
                    borderRadius: BorderRadius.circular(8),
                    border: Border.all(color: AppTheme.slate200),
                  ),
                  child: Text('#${pr.id}',
                      style: TextStyle(
                        fontSize: 10,
                        fontWeight: FontWeight.w800,
                        fontFamily: 'monospace',
                        color: AppTheme.slate400,
                      )),
                ),
              ],
            ),

            const SizedBox(height: 10),

            // Info row (repo + time)
            Row(
              children: [
                Expanded(
                  child: Row(
                    children: [
                      if (pr.repo != null) ...[
                        Icon(Icons.code_rounded,
                            size: 12, color: AppTheme.slate400),
                        const SizedBox(width: 4),
                        Flexible(
                          child: Text(pr.repo!,
                              style: TextStyle(
                                  fontSize: 11,
                                  fontWeight: FontWeight.w600,
                                  color: AppTheme.slate400),
                              maxLines: 1,
                              overflow: TextOverflow.ellipsis),
                        ),
                        const SizedBox(width: 8),
                      ],
                      if (pr.taskId != null) ...[
                        Icon(Icons.alt_route_rounded,
                            size: 12, color: AppTheme.indigo),
                        const SizedBox(width: 3),
                        Text('Task #${pr.taskId}',
                            style: const TextStyle(
                                fontSize: 11,
                                fontWeight: FontWeight.w700,
                                color: AppTheme.indigo)),
                        const SizedBox(width: 8),
                      ],
                      Icon(Icons.schedule, size: 11, color: AppTheme.slate400),
                      const SizedBox(width: 3),
                      Text(_relativeTime(pr.updatedAt ?? pr.createdAt),
                          style: TextStyle(
                              fontSize: 11, color: AppTheme.slate400)),
                    ],
                  ),
                ),
              ],
            ),

            const SizedBox(height: 10),

            // Status + Review badges
            Row(
              children: [
                // Status badge
                Container(
                  padding:
                      const EdgeInsets.symmetric(horizontal: 10, vertical: 5),
                  decoration: BoxDecoration(
                    color: statusCfg.bg,
                    borderRadius: BorderRadius.circular(10),
                    border: Border.all(color: statusCfg.border),
                  ),
                  child: Row(
                    mainAxisSize: MainAxisSize.min,
                    children: [
                      Container(
                        width: 6,
                        height: 6,
                        decoration: BoxDecoration(
                          color: statusCfg.dot,
                          shape: BoxShape.circle,
                        ),
                      ),
                      const SizedBox(width: 5),
                      Text(statusCfg.label,
                          style: TextStyle(
                            fontSize: 9,
                            fontWeight: FontWeight.w800,
                            color: statusCfg.text,
                            letterSpacing: 0.5,
                          )),
                    ],
                  ),
                ),
                const SizedBox(width: 6),
                // Review badge
                Container(
                  padding:
                      const EdgeInsets.symmetric(horizontal: 10, vertical: 5),
                  decoration: BoxDecoration(
                    color: reviewCfg.bg,
                    borderRadius: BorderRadius.circular(10),
                    border: Border.all(color: reviewCfg.border),
                  ),
                  child: Row(
                    mainAxisSize: MainAxisSize.min,
                    children: [
                      Icon(reviewCfg.icon, size: 12, color: reviewCfg.text),
                      const SizedBox(width: 4),
                      Text(reviewCfg.label,
                          style: TextStyle(
                            fontSize: 9,
                            fontWeight: FontWeight.w800,
                            color: reviewCfg.text,
                            letterSpacing: 0.5,
                          )),
                    ],
                  ),
                ),
                const Spacer(),
                // Open in browser
                if (pr.url != null)
                  GestureDetector(
                    onTap: () => _openUrl(pr.url!),
                    child: Icon(Icons.open_in_new_rounded,
                        size: 16, color: AppTheme.slate400),
                  ),
              ],
            ),

            // Comment progress (if any)
            if (pr.hasComments) ...[
              const SizedBox(height: 14),
              _CommentProgress(pr: pr),
            ],

            // View comments button
            const SizedBox(height: 12),
            SizedBox(
              width: double.infinity,
              child: ElevatedButton.icon(
                onPressed: () => _showCommentsSheet(context, pr),
                icon: const Icon(Icons.comment_rounded, size: 16),
                label: Row(
                  mainAxisSize: MainAxisSize.min,
                  children: [
                    const Text('View Comments'),
                    if (pr.hasComments) ...[
                      const SizedBox(width: 6),
                      Container(
                        padding: const EdgeInsets.symmetric(
                            horizontal: 8, vertical: 2),
                        decoration: BoxDecoration(
                          color: Colors.white.withValues(alpha: 0.2),
                          borderRadius: BorderRadius.circular(10),
                          border: Border.all(
                              color: Colors.white.withValues(alpha: 0.3)),
                        ),
                        child: Text('${pr.commentStats!.total}',
                            style: const TextStyle(
                                fontSize: 11,
                                fontWeight: FontWeight.w800,
                                color: Colors.white)),
                      ),
                    ],
                  ],
                ),
                style: ElevatedButton.styleFrom(
                  backgroundColor: AppTheme.indigo,
                  foregroundColor: Colors.white,
                  padding: const EdgeInsets.symmetric(vertical: 13),
                  shape: RoundedRectangleBorder(
                    borderRadius: BorderRadius.circular(14),
                  ),
                  elevation: 0,
                ),
              ),
            ),
          ],
        ),
      ),
    );
  }

  void _showCommentsSheet(BuildContext context, PullRequestItem pr) {
    showModalBottomSheet(
      context: context,
      isScrollControlled: true,
      backgroundColor: Colors.transparent,
      builder: (_) => _CommentsSheet(pr: pr),
    );
  }

  void _openUrl(String url) async {
    final uri = Uri.tryParse(url);
    if (uri != null && await canLaunchUrl(uri)) {
      launchUrl(uri, mode: LaunchMode.externalApplication);
    }
  }

  _BadgeCfg _prStatusConfig(String status) {
    switch (status) {
      case 'open':
        return _BadgeCfg(
            bg: const Color(0xFFEEF2FF),
            border: const Color(0xFFC7D2FE),
            dot: AppTheme.indigo,
            text: const Color(0xFF4338CA),
            label: 'OPEN',
            icon: Icons.circle);
      case 'merged':
        return _BadgeCfg(
            bg: const Color(0xFFF5F3FF),
            border: const Color(0xFFDDD6FE),
            dot: AppTheme.violet,
            text: const Color(0xFF6D28D9),
            label: 'MERGED',
            icon: Icons.circle);
      case 'closed':
        return _BadgeCfg(
            bg: const Color(0xFFF8FAFC),
            border: AppTheme.slate200,
            dot: AppTheme.slate400,
            text: AppTheme.slate600,
            label: 'CLOSED',
            icon: Icons.circle);
      default:
        return _BadgeCfg(
            bg: const Color(0xFFF8FAFC),
            border: AppTheme.slate200,
            dot: AppTheme.slate400,
            text: AppTheme.slate600,
            label: status.toUpperCase(),
            icon: Icons.circle);
    }
  }

  _BadgeCfg _reviewConfig(String? decision) {
    switch (decision) {
      case 'approved':
        return _BadgeCfg(
            bg: const Color(0xFFECFDF5),
            border: const Color(0xFFA7F3D0),
            dot: AppTheme.emerald,
            text: const Color(0xFF047857),
            label: 'APPROVED',
            icon: Icons.check_circle_rounded);
      case 'changes_requested':
        return _BadgeCfg(
            bg: const Color(0xFFFFF1F2),
            border: const Color(0xFFFECDD3),
            dot: AppTheme.rose,
            text: const Color(0xFFBE123C),
            label: 'CHANGES REQ',
            icon: Icons.error_rounded);
      default:
        return _BadgeCfg(
            bg: const Color(0xFFFFFBEB),
            border: const Color(0xFFFDE68A),
            dot: AppTheme.amber,
            text: const Color(0xFF92400E),
            label: 'PENDING REV',
            icon: Icons.schedule_rounded);
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

class _BadgeCfg {
  final Color bg, border, dot, text;
  final String label;
  final IconData icon;
  const _BadgeCfg({
    required this.bg,
    required this.border,
    required this.dot,
    required this.text,
    required this.label,
    required this.icon,
  });
}

// ─── Comment Progress ────────────────────────────────────────

class _CommentProgress extends StatelessWidget {
  final PullRequestItem pr;
  const _CommentProgress({required this.pr});

  @override
  Widget build(BuildContext context) {
    final stats = pr.commentStats!;
    return Container(
      padding: const EdgeInsets.all(14),
      decoration: BoxDecoration(
        gradient: const LinearGradient(
          colors: [Color(0xFFF8FAFC), Color(0xFFEEF2FF), Color(0xFFF5F3FF)],
        ),
        borderRadius: BorderRadius.circular(14),
        border: Border.all(color: const Color(0xFFC7D2FE).withValues(alpha: 0.6)),
      ),
      child: Column(
        children: [
          Row(
            children: [
              Container(
                width: 28,
                height: 28,
                decoration: BoxDecoration(
                  borderRadius: BorderRadius.circular(9),
                  gradient: const LinearGradient(
                    colors: [AppTheme.indigo, AppTheme.violet],
                  ),
                ),
                child: const Icon(Icons.comment_rounded,
                    color: Colors.white, size: 13),
              ),
              const SizedBox(width: 8),
              const Expanded(
                child: Text('Review Comments Progress',
                    style: TextStyle(
                      fontSize: 12,
                      fontWeight: FontWeight.w800,
                      color: Color(0xFF1E293B),
                    ),
                    maxLines: 1,
                    overflow: TextOverflow.ellipsis,
                ),
              ),
              const SizedBox(width: 8),
              Container(
                padding:
                    const EdgeInsets.symmetric(horizontal: 10, vertical: 4),
                decoration: BoxDecoration(
                  color: Colors.white,
                  borderRadius: BorderRadius.circular(10),
                  border: Border.all(color: const Color(0xFFC7D2FE)),
                  boxShadow: [
                    BoxShadow(
                      color: Colors.black.withValues(alpha: 0.03),
                      blurRadius: 4,
                    ),
                  ],
                ),
                child: Text('${stats.processed}/${stats.total}',
                    style: const TextStyle(
                      fontSize: 13,
                      fontWeight: FontWeight.w900,
                      color: AppTheme.indigo,
                    )),
              ),
              const SizedBox(width: 6),
              Text('${stats.progress}%',
                  style: TextStyle(
                    fontSize: 12,
                    fontWeight: FontWeight.w700,
                    color: AppTheme.slate600,
                  )),
            ],
          ),
          const SizedBox(height: 10),
          // Progress bar
          ClipRRect(
            borderRadius: BorderRadius.circular(8),
            child: LinearProgressIndicator(
              value: stats.progress / 100,
              minHeight: 10,
              backgroundColor: AppTheme.slate200,
              valueColor: const AlwaysStoppedAnimation<Color>(AppTheme.indigo),
            ),
          ),
          const SizedBox(height: 8),
          Row(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              Expanded(
                child: Wrap(
                  spacing: 6,
                  runSpacing: 6,
                  children: [
                    _MiniChip(
                        icon: Icons.check_circle_rounded,
                        label: '${stats.processed} processed',
                        color: AppTheme.emerald),
                    if (stats.unprocessed > 0)
                      _MiniChip(
                          icon: Icons.schedule,
                          label: '${stats.unprocessed} pending',
                          color: AppTheme.amber),
                  ],
                ),
              ),
              const SizedBox(width: 8),
              Padding(
                padding: const EdgeInsets.only(top: 4),
                child: Text('Total: ${stats.total} comments',
                    style: TextStyle(
                        fontSize: 10,
                        fontWeight: FontWeight.w600,
                        color: AppTheme.slate400)),
              ),
            ],
          ),
        ],
      ),
    );
  }
}

class _MiniChip extends StatelessWidget {
  final IconData icon;
  final String label;
  final Color color;
  const _MiniChip(
      {required this.icon, required this.label, required this.color});

  @override
  Widget build(BuildContext context) {
    return Container(
      padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 4),
      decoration: BoxDecoration(
        color: color.withValues(alpha: 0.08),
        borderRadius: BorderRadius.circular(8),
        border: Border.all(color: color.withValues(alpha: 0.2)),
      ),
      child: Row(
        mainAxisSize: MainAxisSize.min,
        children: [
          Icon(icon, size: 11, color: color),
          const SizedBox(width: 4),
          Text(label,
              style: TextStyle(
                  fontSize: 10, fontWeight: FontWeight.w700, color: color)),
        ],
      ),
    );
  }
}

// ─── Comments Bottom Sheet ───────────────────────────────────

class _CommentsSheet extends StatefulWidget {
  final PullRequestItem pr;
  const _CommentsSheet({required this.pr});

  @override
  State<_CommentsSheet> createState() => _CommentsSheetState();
}

class _CommentsSheetState extends State<_CommentsSheet> {
  bool _loading = true;
  List<PRComment> _comments = [];
  Map<String, dynamic>? _stats; // ignore: unused_field

  @override
  void initState() {
    super.initState();
    _loadComments();
  }

  Future<void> _loadComments() async {
    final state = context.read<AppState>();
    if (state.apiService == null) {
      setState(() => _loading = false);
      return;
    }
    final data = await state.apiService!.getPRComments(widget.pr.id);
    final list = (data['comments'] as List<dynamic>?)
            ?.map((e) => PRComment.fromJson(e))
            .toList() ??
        [];
    if (mounted) {
      setState(() {
        _comments = list;
        _stats = data['stats'];
        _loading = false;
      });
    }
  }

  @override
  Widget build(BuildContext context) {
    return DraggableScrollableSheet(
      initialChildSize: 0.8,
      minChildSize: 0.4,
      maxChildSize: 0.95,
      builder: (_, controller) => Container(
        decoration: const BoxDecoration(
          color: Colors.white,
          borderRadius: BorderRadius.vertical(top: Radius.circular(24)),
        ),
        child: Column(
          children: [
            // Handle
            Center(
              child: Container(
                width: 40,
                height: 4,
                margin: const EdgeInsets.only(top: 12),
                decoration: BoxDecoration(
                  color: AppTheme.slate200,
                  borderRadius: BorderRadius.circular(2),
                ),
              ),
            ),
            // Header
            Padding(
              padding: const EdgeInsets.fromLTRB(20, 16, 20, 12),
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
                    ),
                    child: const Icon(Icons.comment_rounded,
                        color: Colors.white, size: 16),
                  ),
                  const SizedBox(width: 12),
                  Expanded(
                    child: Column(
                      crossAxisAlignment: CrossAxisAlignment.start,
                      children: [
                        const Text('Review Comments',
                            style: TextStyle(
                              fontSize: 18,
                              fontWeight: FontWeight.w900,
                              color: Color(0xFF0F172A),
                            )),
                        Text('PR #${widget.pr.id}',
                            style: TextStyle(
                                fontSize: 12,
                                fontWeight: FontWeight.w600,
                                color: AppTheme.slate400)),
                      ],
                    ),
                  ),
                  IconButton(
                    onPressed: () => Navigator.pop(context),
                    icon: Icon(Icons.close, color: AppTheme.slate400),
                  ),
                ],
              ),
            ),
            const Divider(height: 1),
            // Content
            Expanded(
              child: _loading
                  ? const Center(child: CircularProgressIndicator())
                  : _comments.isEmpty
                      ? Center(
                          child: Column(
                            mainAxisAlignment: MainAxisAlignment.center,
                            children: [
                              Icon(Icons.comment_rounded,
                                  size: 48, color: AppTheme.slate200),
                              const SizedBox(height: 12),
                              const Text('No Comments',
                                  style: TextStyle(
                                      fontSize: 16,
                                      fontWeight: FontWeight.w800,
                                      color: Color(0xFF334155))),
                              Text(
                                  "This PR doesn't have review comments yet.",
                                  style: TextStyle(
                                      fontSize: 13,
                                      color: AppTheme.slate400)),
                            ],
                          ),
                        )
                      : ListView.builder(
                          controller: controller,
                          padding: const EdgeInsets.all(16),
                          itemCount: _comments.length,
                          itemBuilder: (_, i) =>
                              _CommentCard(comment: _comments[i]),
                        ),
            ),
          ],
        ),
      ),
    );
  }
}

class _CommentCard extends StatelessWidget {
  final PRComment comment;
  const _CommentCard({required this.comment});

  @override
  Widget build(BuildContext context) {
    return Container(
      margin: const EdgeInsets.only(bottom: 12),
      padding: const EdgeInsets.all(14),
      decoration: BoxDecoration(
        color: comment.processed
            ? const Color(0xFFECFDF5)
            : const Color(0xFFFFFBEB),
        borderRadius: BorderRadius.circular(14),
        border: Border.all(
          color: comment.processed
              ? const Color(0xFFA7F3D0)
              : const Color(0xFFFDE68A),
        ),
      ),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Row(
            children: [
              Container(
                width: 32,
                height: 32,
                decoration: BoxDecoration(
                  borderRadius: BorderRadius.circular(10),
                  gradient: LinearGradient(
                    colors: comment.type == 'inline'
                        ? [const Color(0xFF3B82F6), const Color(0xFF06B6D4)]
                        : [const Color(0xFF8B5CF6), const Color(0xFFEC4899)],
                  ),
                ),
                child: Icon(
                  comment.type == 'inline'
                      ? Icons.code_rounded
                      : Icons.description_rounded,
                  color: Colors.white,
                  size: 14,
                ),
              ),
              const SizedBox(width: 8),
              Text('${comment.type[0].toUpperCase()}${comment.type.substring(1)} Comment',
                  style: const TextStyle(
                    fontSize: 13,
                    fontWeight: FontWeight.w800,
                    color: Color(0xFF1E293B),
                  )),
              const Spacer(),
              Container(
                padding:
                    const EdgeInsets.symmetric(horizontal: 8, vertical: 3),
                decoration: BoxDecoration(
                  color: comment.processed
                      ? const Color(0xFFD1FAE5)
                      : const Color(0xFFFEF3C7),
                  borderRadius: BorderRadius.circular(8),
                  border: Border.all(
                    color: comment.processed
                        ? const Color(0xFFA7F3D0)
                        : const Color(0xFFFDE68A),
                  ),
                ),
                child: Text(
                  comment.processed ? '✓ Done' : '⏳ Pending',
                  style: TextStyle(
                    fontSize: 9,
                    fontWeight: FontWeight.w800,
                    color: comment.processed
                        ? const Color(0xFF065F46)
                        : const Color(0xFF92400E),
                  ),
                ),
              ),
            ],
          ),
          if (comment.filePath != null) ...[
            const SizedBox(height: 8),
            Container(
              padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 4),
              decoration: BoxDecoration(
                color: const Color(0xFFF1F5F9),
                borderRadius: BorderRadius.circular(6),
                border: Border.all(color: AppTheme.slate200),
              ),
              child: Text(
                '📁 ${comment.filePath}${comment.lineNumber != null ? ':${comment.lineNumber}' : ''}',
                style: const TextStyle(
                  fontSize: 10,
                  fontFamily: 'monospace',
                  color: Color(0xFF475569),
                ),
                maxLines: 1,
                overflow: TextOverflow.ellipsis,
              ),
            ),
          ],
          const SizedBox(height: 10),
          Container(
            width: double.infinity,
            padding: const EdgeInsets.all(12),
            decoration: BoxDecoration(
              color: Colors.white,
              borderRadius: BorderRadius.circular(10),
              border: Border.all(color: AppTheme.slate200),
            ),
            child: Text(comment.body,
                style: const TextStyle(
                  fontSize: 13,
                  color: Color(0xFF374151),
                  height: 1.5,
                )),
          ),
        ],
      ),
    );
  }
}

// ─── Empty & Skeleton ────────────────────────────────────────

class _EmptyPRs extends StatelessWidget {
  @override
  Widget build(BuildContext context) {
    return Center(
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
            child: Icon(Icons.merge_rounded, size: 28, color: AppTheme.slate400),
          ),
          const SizedBox(height: 16),
          const Text('No Pull Requests Yet',
              style: TextStyle(
                  fontSize: 18,
                  fontWeight: FontWeight.w800,
                  color: Color(0xFF334155))),
          const SizedBox(height: 4),
          Text('The agent hasn\'t generated any PRs.',
              style: TextStyle(fontSize: 13, color: AppTheme.slate400)),
        ],
      ),
    );
  }
}

class _SkeletonPR extends StatelessWidget {
  @override
  Widget build(BuildContext context) {
    return Padding(
      padding: const EdgeInsets.symmetric(horizontal: 20, vertical: 5),
      child: Container(
        height: 120,
        decoration: BoxDecoration(
          color: Colors.white,
          borderRadius: BorderRadius.circular(18),
          border: Border.all(color: Colors.black.withValues(alpha: 0.04)),
        ),
        child: const Center(
          child: SizedBox(
            width: 24,
            height: 24,
            child: CircularProgressIndicator(strokeWidth: 2),
          ),
        ),
      ),
    );
  }
}
