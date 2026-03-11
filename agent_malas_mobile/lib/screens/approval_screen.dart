import 'package:flutter/material.dart';
import 'package:flutter/services.dart';
import 'package:provider/provider.dart';
import '../config/theme.dart';
import '../providers/app_state.dart';
import '../models/approval_item.dart';

/// Premium Approval Screen — mirrors frontend ApprovalNotifications component
///
/// Features:
/// - List pending approvals with gradient accent bars
/// - Approve & Reject buttons with haptic feedback
/// - Rejection reason dialog
/// - Pull-to-refresh
/// - Real-time updates via WebSocket
/// - Beautiful empty state
class ApprovalScreen extends StatelessWidget {
  const ApprovalScreen({super.key});

  @override
  Widget build(BuildContext context) {
    return Consumer<AppState>(
      builder: (context, state, _) {
        final approvals = state.pendingApprovals;

        return RefreshIndicator(
          onRefresh: () => state.refreshApprovals(),
          color: AppTheme.indigo,
          child: CustomScrollView(
            slivers: [
              // Header
              SliverToBoxAdapter(
                child: Padding(
                  padding: const EdgeInsets.fromLTRB(20, 24, 20, 16),
                  child: Row(
                    mainAxisAlignment: MainAxisAlignment.spaceBetween,
                    children: [
                      Column(
                        crossAxisAlignment: CrossAxisAlignment.start,
                        children: [
                          Text('Pending Approvals',
                              style: Theme.of(context)
                                  .textTheme
                                  .headlineSmall
                                  ?.copyWith(
                                    fontWeight: FontWeight.w900,
                                    letterSpacing: -0.5,
                                  )),
                          const SizedBox(height: 2),
                          Text(
                            '${approvals.length} task${approvals.length != 1 ? 's' : ''} waiting for your decision',
                            style: TextStyle(
                                fontSize: 12,
                                fontWeight: FontWeight.w600,
                                color: AppTheme.slate400),
                          ),
                        ],
                      ),
                      // Refresh button
                      Material(
                        color: Colors.white,
                        borderRadius: BorderRadius.circular(12),
                        child: InkWell(
                          borderRadius: BorderRadius.circular(12),
                          onTap: () => state.refreshApprovals(),
                          child: Container(
                            padding: const EdgeInsets.all(10),
                            decoration: BoxDecoration(
                              borderRadius: BorderRadius.circular(12),
                              border: Border.all(color: AppTheme.slate200),
                            ),
                            child: Icon(Icons.refresh_rounded,
                                size: 18, color: AppTheme.slate600),
                          ),
                        ),
                      ),
                    ],
                  ),
                ),
              ),

              // Empty state
              if (approvals.isEmpty)
                SliverFillRemaining(
                  child: _EmptyApprovals(),
                )
              else ...[
                // Approval cards
                SliverList(
                  delegate: SliverChildBuilderDelegate(
                    (context, index) {
                      return _ApprovalCard(
                        approval: approvals[index],
                        index: index,
                      );
                    },
                    childCount: approvals.length,
                  ),
                ),

                // Info banner
                SliverToBoxAdapter(
                  child: Padding(
                    padding: const EdgeInsets.all(20),
                    child: _InfoBanner(),
                  ),
                ),
              ],
            ],
          ),
        );
      },
    );
  }
}

// ─── Approval Card ───────────────────────────────────────────

class _ApprovalCard extends StatefulWidget {
  final ApprovalItem approval;
  final int index;
  const _ApprovalCard({required this.approval, required this.index});

  @override
  State<_ApprovalCard> createState() => _ApprovalCardState();
}

class _ApprovalCardState extends State<_ApprovalCard> {
  bool _processing = false;

  Future<void> _approve() async {
    setState(() => _processing = true);
    HapticFeedback.mediumImpact();
    final state = context.read<AppState>();
    final success = await state.approve(widget.approval.taskId);
    if (mounted) {
      setState(() => _processing = false);
      if (success) {
        ScaffoldMessenger.of(context).showSnackBar(
          SnackBar(
            content: const Text('✅ Task approved'),
            backgroundColor: AppTheme.emerald,
          ),
        );
      }
    }
  }

  Future<void> _reject() async {
    final reason = await showDialog<String>(
      context: context,
      builder: (ctx) => _RejectDialog(),
    );
    if (reason == null) return; // cancelled

    final state = context.read<AppState>();
    setState(() => _processing = true);
    HapticFeedback.mediumImpact();
    final success =
        await state.reject(widget.approval.taskId, reason: reason);
    if (mounted) {
      setState(() => _processing = false);
      if (success) {
        ScaffoldMessenger.of(context).showSnackBar(
          SnackBar(
            content: const Text('❌ Task rejected'),
            backgroundColor: AppTheme.rose,
          ),
        );
      }
    }
  }

  @override
  Widget build(BuildContext context) {
    final a = widget.approval;
    final gradient = a.isIssue
        ? const [Color(0xFF3B82F6), Color(0xFF06B6D4)]
        : a.isPRRejected
            ? const [Color(0xFFF97316), Color(0xFFEC4899)]
            : const [Color(0xFF8B5CF6), Color(0xFF6366F1)];

    return Padding(
      padding: const EdgeInsets.symmetric(horizontal: 20, vertical: 6),
      child: Container(
        clipBehavior: Clip.antiAlias,
        decoration: BoxDecoration(
          color: Colors.white,
          borderRadius: BorderRadius.circular(20),
          border: Border.all(color: Colors.black.withValues(alpha: 0.04)),
          boxShadow: [
            BoxShadow(
              color: Colors.black.withValues(alpha: 0.04),
              blurRadius: 16,
              offset: const Offset(0, 4),
            ),
          ],
        ),
        child: Column(
          children: [
            // Gradient accent bar
            Container(
              height: 4,
              decoration: BoxDecoration(
                gradient: LinearGradient(colors: gradient),
              ),
            ),

            Padding(
              padding: const EdgeInsets.all(16),
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  Row(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      // Icon
                      Container(
                        width: 44,
                        height: 44,
                        decoration: BoxDecoration(
                          borderRadius: BorderRadius.circular(14),
                          gradient: LinearGradient(
                            colors: gradient,
                            begin: Alignment.topLeft,
                            end: Alignment.bottomRight,
                          ),
                          boxShadow: [
                            BoxShadow(
                              color: gradient[0].withValues(alpha: 0.3),
                              blurRadius: 10,
                              offset: const Offset(0, 3),
                            ),
                          ],
                        ),
                        child: Icon(
                          a.isIssue
                              ? Icons.description_outlined
                              : a.isPRRejected
                                  ? Icons.merge_type_rounded
                                  : Icons.auto_awesome_rounded,
                          color: Colors.white,
                          size: 20,
                        ),
                      ),
                      const SizedBox(width: 12),
                      // Title + timestamp
                      Expanded(
                        child: Column(
                          crossAxisAlignment: CrossAxisAlignment.start,
                          children: [
                            Text(a.title,
                                style: const TextStyle(
                                  fontSize: 15,
                                  fontWeight: FontWeight.w800,
                                  color: Color(0xFF1E293B),
                                ),
                                maxLines: 2,
                                overflow: TextOverflow.ellipsis),
                            const SizedBox(height: 4),
                            Row(
                              children: [
                                Icon(Icons.schedule,
                                    size: 12, color: AppTheme.slate400),
                                const SizedBox(width: 4),
                                Text(
                                  _formatDate(a.sentAt),
                                  style: TextStyle(
                                      fontSize: 11, color: AppTheme.slate400),
                                ),
                              ],
                            ),
                          ],
                        ),
                      ),
                    ],
                  ),

                  // Task info card
                  if (a.task != null) ...[
                    const SizedBox(height: 12),
                    Container(
                      padding: const EdgeInsets.all(12),
                      decoration: BoxDecoration(
                        color: const Color(0xFFF8FAFC),
                        borderRadius: BorderRadius.circular(12),
                        border: Border.all(color: AppTheme.slate200),
                      ),
                      child: Column(
                        crossAxisAlignment: CrossAxisAlignment.start,
                        children: [
                          Text(a.task!.title,
                              style: const TextStyle(
                                fontSize: 13,
                                fontWeight: FontWeight.w700,
                                color: Color(0xFF334155),
                              )),
                          if (a.task!.repo != null) ...[
                            const SizedBox(height: 4),
                            Row(
                              children: [
                                const Text('📦 ',
                                    style: TextStyle(fontSize: 11)),
                                Text(a.task!.repo!,
                                    style: TextStyle(
                                        fontSize: 11,
                                        color: AppTheme.slate400)),
                              ],
                            ),
                          ],
                        ],
                      ),
                    ),
                  ],

                  // Description
                  if (a.description != null &&
                      a.description!.isNotEmpty) ...[
                    const SizedBox(height: 10),
                    Text(a.description!,
                        style: TextStyle(
                          fontSize: 13,
                          color: AppTheme.slate600,
                          height: 1.5,
                        ),
                        maxLines: 4,
                        overflow: TextOverflow.ellipsis),
                  ],

                  const SizedBox(height: 16),

                  // Action buttons
                  Row(
                    children: [
                      Expanded(
                        child: _GradientButton(
                          onTap: _processing ? null : _approve,
                          gradient: const [
                            Color(0xFF10B981),
                            Color(0xFF14B8A6)
                          ],
                          icon: _processing
                              ? null
                              : Icons.check_circle_rounded,
                          label: _processing ? 'Processing...' : 'Approve',
                          isLoading: _processing,
                        ),
                      ),
                      const SizedBox(width: 10),
                      Expanded(
                        child: _GradientButton(
                          onTap: _processing ? null : _reject,
                          gradient: const [
                            Color(0xFFF43F5E),
                            Color(0xFFEC4899)
                          ],
                          icon: Icons.cancel_rounded,
                          label: 'Reject',
                        ),
                      ),
                    ],
                  ),
                ],
              ),
            ),
          ],
        ),
      ),
    );
  }

  String _formatDate(String? iso) {
    if (iso == null) return '';
    try {
      final d = DateTime.parse(iso);
      return '${d.day}/${d.month} ${d.hour.toString().padLeft(2, '0')}:${d.minute.toString().padLeft(2, '0')}';
    } catch (_) {
      return '';
    }
  }
}

// ─── Gradient Button ─────────────────────────────────────────

class _GradientButton extends StatelessWidget {
  final VoidCallback? onTap;
  final List<Color> gradient;
  final IconData? icon;
  final String label;
  final bool isLoading;

  const _GradientButton({
    this.onTap,
    required this.gradient,
    this.icon,
    required this.label,
    this.isLoading = false,
  });

  @override
  Widget build(BuildContext context) {
    return Material(
      color: Colors.transparent,
      child: InkWell(
        borderRadius: BorderRadius.circular(14),
        onTap: onTap,
        child: Ink(
          decoration: BoxDecoration(
            gradient: LinearGradient(colors: gradient),
            borderRadius: BorderRadius.circular(14),
            boxShadow: [
              BoxShadow(
                color: gradient[0].withValues(alpha: 0.3),
                blurRadius: 10,
                offset: const Offset(0, 3),
              ),
            ],
          ),
          child: Container(
            padding: const EdgeInsets.symmetric(vertical: 13),
            child: Row(
              mainAxisAlignment: MainAxisAlignment.center,
              children: [
                if (isLoading)
                  const SizedBox(
                    width: 16,
                    height: 16,
                    child: CircularProgressIndicator(
                      strokeWidth: 2,
                      color: Colors.white,
                    ),
                  )
                else if (icon != null)
                  Icon(icon, size: 16, color: Colors.white),
                const SizedBox(width: 6),
                Text(label,
                    style: const TextStyle(
                      fontSize: 13,
                      fontWeight: FontWeight.w700,
                      color: Colors.white,
                    )),
              ],
            ),
          ),
        ),
      ),
    );
  }
}

// ─── Reject Dialog ───────────────────────────────────────────

class _RejectDialog extends StatefulWidget {
  @override
  State<_RejectDialog> createState() => _RejectDialogState();
}

class _RejectDialogState extends State<_RejectDialog> {
  final _controller = TextEditingController();

  @override
  void dispose() {
    _controller.dispose();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
    return AlertDialog(
      shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(20)),
      title: const Text('Reject Task',
          style: TextStyle(fontWeight: FontWeight.w800)),
      content: TextField(
        controller: _controller,
        decoration: const InputDecoration(
          hintText: 'Reason for rejection (optional)',
        ),
        maxLines: 3,
      ),
      actions: [
        TextButton(
          onPressed: () => Navigator.pop(context),
          child: Text('Cancel',
              style: TextStyle(color: AppTheme.slate400)),
        ),
        FilledButton(
          style: FilledButton.styleFrom(backgroundColor: AppTheme.rose),
          onPressed: () => Navigator.pop(
              context, _controller.text.isEmpty ? 'No reason provided' : _controller.text),
          child: const Text('Reject'),
        ),
      ],
    );
  }
}

// ─── Empty State ─────────────────────────────────────────────

class _EmptyApprovals extends StatelessWidget {
  @override
  Widget build(BuildContext context) {
    return Center(
      child: SingleChildScrollView(
        child: Column(
          mainAxisAlignment: MainAxisAlignment.center,
          children: [
            Container(
              width: 84,
              height: 84,
              decoration: BoxDecoration(
                gradient: const LinearGradient(
                  colors: [Color(0xFF10B981), Color(0xFF14B8A6)],
                  begin: Alignment.topLeft,
                  end: Alignment.bottomRight,
                ),
                shape: BoxShape.circle,
                boxShadow: [
                  BoxShadow(
                    color: AppTheme.emerald.withValues(alpha: 0.3),
                    blurRadius: 24,
                    offset: const Offset(0, 8),
                  ),
                ],
              ),
              child: const Icon(Icons.check_circle_rounded,
                  color: Colors.white, size: 44),
            ),
            const SizedBox(height: 20),
            const Text('All Clear!',
                style: TextStyle(
                    fontSize: 22,
                    fontWeight: FontWeight.w900,
                    color: Color(0xFF1E293B))),
            const SizedBox(height: 8),
            Text('No pending approvals at the moment.\nAll tasks are approved or completed.',
                textAlign: TextAlign.center,
                style: TextStyle(
                    fontSize: 13,
                    color: AppTheme.slate400,
                    height: 1.5)),
          ],
        ),
      ),
    );
  }
}

// ─── Info Banner ─────────────────────────────────────────────

class _InfoBanner extends StatelessWidget {
  @override
  Widget build(BuildContext context) {
    return Container(
      decoration: BoxDecoration(
        borderRadius: BorderRadius.circular(20),
        gradient: const LinearGradient(
          colors: [Color(0xFF6366F1), Color(0xFF8B5CF6), Color(0xFFEC4899)],
        ),
        boxShadow: [
          BoxShadow(
            color: AppTheme.indigo.withValues(alpha: 0.3),
            blurRadius: 20,
            offset: const Offset(0, 8),
          ),
        ],
      ),
      child: Container(
        margin: const EdgeInsets.all(2),
        padding: const EdgeInsets.all(16),
        decoration: BoxDecoration(
          color: Colors.white,
          borderRadius: BorderRadius.circular(18),
        ),
        child: Row(
          children: [
            Container(
              width: 44,
              height: 44,
              decoration: BoxDecoration(
                borderRadius: BorderRadius.circular(14),
                gradient: const LinearGradient(
                  colors: [Color(0xFF6366F1), Color(0xFF8B5CF6)],
                ),
              ),
              child: const Icon(Icons.auto_awesome_rounded,
                  color: Colors.white, size: 20),
            ),
            const SizedBox(width: 12),
            Expanded(
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  const Text('Approval Workflow Active',
                      style: TextStyle(
                          fontSize: 14,
                          fontWeight: FontWeight.w800,
                          color: Color(0xFF1E293B))),
                  const SizedBox(height: 2),
                  Text(
                    'All tasks require your approval before the AI agent processes them.',
                    style: TextStyle(fontSize: 11, color: AppTheme.slate400, height: 1.4),
                  ),
                ],
              ),
            ),
          ],
        ),
      ),
    );
  }
}
