/// Pull Request model — mirrors frontend PRTracker data
class PullRequestItem {
  final int id;
  final String? title;
  final String status; // open, merged, closed
  final String? reviewDecision; // approved, changes_requested, pending
  final String? repo;
  final String? url;
  final int? taskId;
  final String? createdAt;
  final String? updatedAt;
  final CommentStats? commentStats;

  PullRequestItem({
    required this.id,
    this.title,
    this.status = 'open',
    this.reviewDecision,
    this.repo,
    this.url,
    this.taskId,
    this.createdAt,
    this.updatedAt,
    this.commentStats,
  });

  factory PullRequestItem.fromJson(Map<String, dynamic> json) {
    return PullRequestItem(
      id: int.tryParse(json['id']?.toString() ?? '') ?? 0,
      title: json['title'],
      status: json['status'] ?? 'open',
      reviewDecision: json['review_decision'],
      repo: json['repo'],
      url: json['url'],
      taskId: int.tryParse(json['task_id']?.toString() ?? ''),
      createdAt: json['created_at'],
      updatedAt: json['updated_at'],
      commentStats: json['commentStats'] != null
          ? CommentStats.fromJson(json['commentStats'])
          : null,
    );
  }

  bool get isOpen => status == 'open';
  bool get isMerged => status == 'merged';
  bool get isClosed => status == 'closed';
  bool get hasComments => commentStats != null && commentStats!.total > 0;
}

class CommentStats {
  final int total;
  final int processed;
  final int unprocessed;
  final int progress;

  CommentStats({
    required this.total,
    required this.processed,
    required this.unprocessed,
    required this.progress,
  });

  factory CommentStats.fromJson(Map<String, dynamic> json) {
    return CommentStats(
      total: json['total'] ?? 0,
      processed: json['processed'] ?? 0,
      unprocessed: json['unprocessed'] ?? 0,
      progress: json['progress'] ?? 0,
    );
  }
}

class PRComment {
  final int id;
  final String type; // inline, review
  final String body;
  final String? filePath;
  final int? lineNumber;
  final bool processed;
  final String? createdAt;
  final String? processedAt;

  PRComment({
    required this.id,
    required this.type,
    required this.body,
    this.filePath,
    this.lineNumber,
    this.processed = false,
    this.createdAt,
    this.processedAt,
  });

  factory PRComment.fromJson(Map<String, dynamic> json) {
    return PRComment(
      id: json['id'] ?? 0,
      type: json['type'] ?? 'review',
      body: json['body'] ?? '',
      filePath: json['filePath'],
      lineNumber: json['lineNumber'],
      processed: json['processed'] ?? false,
      createdAt: json['createdAt'] ?? json['created_at'],
      processedAt: json['processedAt'] ?? json['processed_at'],
    );
  }
}
