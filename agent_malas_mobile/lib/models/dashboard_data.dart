/// Dashboard data model matching the backend /api/dashboard response
class DashboardData {
  final TodayStats today;
  final QueueInfo queue;
  final AgentInfo agent;
  final List<RecentTask> recentTasks;

  DashboardData({
    required this.today,
    required this.queue,
    required this.agent,
    required this.recentTasks,
  });

  factory DashboardData.fromJson(Map<String, dynamic> json) {
    return DashboardData(
      today: TodayStats.fromJson(json['today'] ?? {}),
      queue: QueueInfo.fromJson(json['queue'] ?? {}),
      agent: AgentInfo.fromJson(json['agent'] ?? {}),
      recentTasks: (json['recentTasks'] as List<dynamic>?)
              ?.map((e) => RecentTask.fromJson(e as Map<String, dynamic>))
              .toList() ??
          [],
    );
  }
}

class TodayStats {
  final int tasksCompleted;
  final int tasksFailed;
  final int prsCreated;
  final int prsRevised;

  TodayStats({
    this.tasksCompleted = 0,
    this.tasksFailed = 0,
    this.prsCreated = 0,
    this.prsRevised = 0,
  });

  factory TodayStats.fromJson(Map<String, dynamic> json) {
    return TodayStats(
      tasksCompleted: json['tasksCompleted'] ?? 0,
      tasksFailed: json['tasksFailed'] ?? 0,
      prsCreated: json['prsCreated'] ?? 0,
      prsRevised: json['prsRevised'] ?? 0,
    );
  }
}

class QueueInfo {
  final int size;
  final String? currentTask;

  QueueInfo({this.size = 0, this.currentTask});

  factory QueueInfo.fromJson(Map<String, dynamic> json) {
    return QueueInfo(
      size: json['size'] ?? 0,
      currentTask: json['currentTask'],
    );
  }
}

class AgentInfo {
  final String status;
  final int uptime;

  AgentInfo({this.status = 'stopped', this.uptime = 0});

  factory AgentInfo.fromJson(Map<String, dynamic> json) {
    return AgentInfo(
      status: json['status'] ?? 'stopped',
      uptime: json['uptime'] ?? 0,
    );
  }

  String get statusLabel {
    switch (status) {
      case 'running':
        return 'Running';
      case 'idle':
        return 'Idle';
      case 'processing':
        return 'Processing';
      case 'waiting_approval':
        return 'Waiting Approval';
      default:
        return 'Offline';
    }
  }

  bool get isActive => status == 'running' || status == 'processing';
}

class RecentTask {
  final String id;
  final String title;
  final String status;
  final String? repo;
  final String? createdAt;
  final String? completedAt;

  RecentTask({
    required this.id,
    required this.title,
    required this.status,
    this.repo,
    this.createdAt,
    this.completedAt,
  });

  factory RecentTask.fromJson(Map<String, dynamic> json) {
    return RecentTask(
      id: json['id']?.toString() ?? '',
      title: json['title'] ?? '',
      status: json['status'] ?? 'queued',
      repo: json['repo'],
      createdAt: json['createdAt'],
      completedAt: json['completedAt'],
    );
  }
}
