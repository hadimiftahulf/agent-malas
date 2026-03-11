import 'task_item.dart';

/// Approval notification item matching backend /api/approval/pending response
class ApprovalItem {
  final int id;
  final String taskId;
  final String title;
  final String? description;
  final String notificationType;
  final String status;
  final String? sentAt;
  final TaskItem? task;

  ApprovalItem({
    required this.id,
    required this.taskId,
    required this.title,
    this.description,
    required this.notificationType,
    required this.status,
    this.sentAt,
    this.task,
  });

  factory ApprovalItem.fromJson(Map<String, dynamic> json) {
    return ApprovalItem(
      id: json['id'] ?? 0,
      taskId: json['task_id']?.toString() ?? '',
      title: json['title'] ?? '',
      description: json['description'],
      notificationType: json['notification_type'] ?? 'issue',
      status: json['status'] ?? 'pending',
      sentAt: json['sent_at'],
      task: json['task'] != null
          ? TaskItem.fromJson(json['task'] as Map<String, dynamic>)
          : null,
    );
  }

  bool get isIssue => notificationType == 'issue';
  bool get isPRRejected => notificationType == 'pr_rejected';
}
