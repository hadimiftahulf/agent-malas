/// Task item model matching the backend /api/tasks and /api/queue responses
class TaskItem {
  final String id;
  final String title;
  final String status;
  final String? repo;
  final String? description;
  final String? errorMessage;
  final String? aiPrompt;
  final String? createdAt;
  final String? completedAt;
  final String? approvalStatus;

  TaskItem({
    required this.id,
    required this.title,
    required this.status,
    this.repo,
    this.description,
    this.errorMessage,
    this.aiPrompt,
    this.createdAt,
    this.completedAt,
    this.approvalStatus,
  });

  factory TaskItem.fromJson(Map<String, dynamic> json) {
    return TaskItem(
      id: json['id']?.toString() ?? '',
      title: json['title'] ?? '',
      status: json['status'] ?? 'queued',
      repo: json['repo'],
      description: json['description'],
      errorMessage: json['error_message'] ?? json['errorMessage'],
      aiPrompt: json['ai_prompt'] ?? json['aiPrompt'],
      createdAt: json['created_at'] ?? json['createdAt'],
      completedAt: json['completed_at'] ?? json['completedAt'],
      approvalStatus: json['approval_status'] ?? json['approvalStatus'],
    );
  }

  String get statusLabel {
    switch (status) {
      case 'queued':
        return 'Queued';
      case 'processing':
        return 'Processing';
      case 'done':
        return 'Done';
      case 'failed':
        return 'Failed';
      case 'skipped':
        return 'Skipped';
      case 'pending':
        return 'Pending';
      default:
        return status;
    }
  }

  bool get isFailed => status == 'failed';
  bool get isDone => status == 'done';
  bool get isProcessing => status == 'processing';
}
