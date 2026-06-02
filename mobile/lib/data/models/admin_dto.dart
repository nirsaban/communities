// Sub-admin / admin DTOs for C5. Matches the shapes returned by
// /communities/:cid/admin/* endpoints.

class AdminOverviewDto {
  AdminOverviewDto({
    required this.members,
    required this.upcoming,
    required this.pending,
    required this.flagged,
    required this.revenueAvailable,
  });

  final int members;
  final int upcoming;
  final int pending;
  final int flagged;
  final bool revenueAvailable;

  factory AdminOverviewDto.fromJson(Map<String, dynamic> json) {
    final k = json['kpis'] as Map<String, dynamic>?;
    return AdminOverviewDto(
      members: (k?['members'] as num?)?.toInt() ?? 0,
      upcoming: (k?['upcoming'] as num?)?.toInt() ?? 0,
      pending: (k?['pending'] as num?)?.toInt() ?? 0,
      flagged: (k?['flagged'] as num?)?.toInt() ?? 0,
      revenueAvailable: (json['revenueAvailable'] as bool?) ?? false,
    );
  }
}

class AttendanceRow {
  AttendanceRow({
    required this.eventId,
    required this.title,
    required this.startAt,
    required this.rsvped,
    required this.attended,
  });
  final String eventId;
  final String title;
  final DateTime startAt;
  final int rsvped;
  final int attended;

  double get rate => rsvped == 0 ? 0 : attended / rsvped;

  factory AttendanceRow.fromJson(Map<String, dynamic> json) => AttendanceRow(
        eventId: json['eventId'] as String,
        title: json['title'] as String? ?? '',
        startAt: DateTime.parse(json['startAt'] as String),
        rsvped: (json['rsvped'] as num?)?.toInt() ?? 0,
        attended: (json['attended'] as num?)?.toInt() ?? 0,
      );
}

class AttendanceAnalyticsDto {
  AttendanceAnalyticsDto({
    required this.rate,
    required this.totalRsvp,
    required this.totalAttended,
    required this.perEvent,
    required this.bestTurnout,
    required this.worstTurnout,
  });
  final int rate;
  final int totalRsvp;
  final int totalAttended;
  final List<AttendanceRow> perEvent;
  final List<AttendanceRow> bestTurnout;
  final List<AttendanceRow> worstTurnout;

  factory AttendanceAnalyticsDto.fromJson(Map<String, dynamic> json) {
    List<AttendanceRow> parse(String k) =>
        ((json[k] as List?) ?? const []).whereType<Map<String, dynamic>>().map(AttendanceRow.fromJson).toList();
    return AttendanceAnalyticsDto(
      rate: (json['attendanceRate'] as num?)?.toInt() ?? 0,
      totalRsvp: (json['totalRsvp'] as num?)?.toInt() ?? 0,
      totalAttended: (json['totalAttended'] as num?)?.toInt() ?? 0,
      perEvent: parse('perEvent'),
      bestTurnout: parse('bestTurnout'),
      worstTurnout: parse('worstTurnout'),
    );
  }
}

class GrowthPoint {
  GrowthPoint({required this.date, required this.joined, required this.total});
  final String date; // YYYY-MM-DD
  final int joined;
  final int total;

  factory GrowthPoint.fromJson(Map<String, dynamic> json) => GrowthPoint(
        date: json['date'] as String? ?? '',
        joined: (json['joined'] as num?)?.toInt() ?? 0,
        total: (json['total'] as num?)?.toInt() ?? 0,
      );
}

class GrowthAnalyticsDto {
  GrowthAnalyticsDto({
    required this.total,
    required this.joined90d,
    required this.left90d,
    required this.net90d,
    required this.series,
  });
  final int total;
  final int joined90d;
  final int left90d;
  final int net90d;
  final List<GrowthPoint> series;

  factory GrowthAnalyticsDto.fromJson(Map<String, dynamic> json) => GrowthAnalyticsDto(
        total: (json['total'] as num?)?.toInt() ?? 0,
        joined90d: (json['joined90d'] as num?)?.toInt() ?? 0,
        left90d: (json['left90d'] as num?)?.toInt() ?? 0,
        net90d: (json['net90d'] as num?)?.toInt() ?? 0,
        series: ((json['series'] as List?) ?? const [])
            .whereType<Map<String, dynamic>>()
            .map(GrowthPoint.fromJson)
            .toList(),
      );
}

class LeaderRow {
  LeaderRow({
    required this.rank,
    required this.userId,
    required this.name,
    required this.email,
    this.photoUrl,
    required this.attended,
    required this.rsvped,
  });
  final int rank;
  final String userId;
  final String name;
  final String email;
  final String? photoUrl;
  final int attended;
  final int rsvped;

  factory LeaderRow.fromJson(Map<String, dynamic> json) => LeaderRow(
        rank: (json['rank'] as num?)?.toInt() ?? 0,
        userId: json['userId'] as String,
        name: json['name'] as String? ?? '',
        email: json['email'] as String? ?? '',
        photoUrl: json['photoUrl'] as String?,
        attended: (json['attended'] as num?)?.toInt() ?? 0,
        rsvped: (json['rsvped'] as num?)?.toInt() ?? 0,
      );
}

class PendingMemberRow {
  PendingMemberRow({
    required this.membershipId,
    required this.userId,
    required this.name,
    required this.email,
    this.photoUrl,
    this.bio,
    required this.requestedAt,
  });
  final String membershipId;
  final String userId;
  final String name;
  final String email;
  final String? photoUrl;
  final String? bio;
  final DateTime requestedAt;

  factory PendingMemberRow.fromJson(Map<String, dynamic> json) => PendingMemberRow(
        membershipId: json['membershipId'] as String,
        userId: json['userId'] as String,
        name: json['name'] as String? ?? '',
        email: json['email'] as String? ?? '',
        photoUrl: json['photoUrl'] as String?,
        bio: json['bio'] as String?,
        requestedAt: DateTime.parse(json['requestedAt'] as String),
      );
}

class MemberDetailDto {
  MemberDetailDto({
    required this.userId,
    required this.name,
    required this.email,
    this.photoUrl,
    this.bio,
    required this.interests,
    required this.role,
    required this.joinedAt,
    required this.eventsAttended,
    required this.postsAuthored,
    required this.initiativesAuthored,
    required this.spendVisible,
  });

  final String userId;
  final String name;
  final String email;
  final String? photoUrl;
  final String? bio;
  final List<String> interests;
  final String role;
  final DateTime joinedAt;
  final int eventsAttended;
  final int postsAuthored;
  final int initiativesAuthored;
  final bool spendVisible;

  factory MemberDetailDto.fromJson(Map<String, dynamic> json) {
    final m = json['membership'] as Map<String, dynamic>;
    final u = json['user'] as Map<String, dynamic>;
    final a = json['activity'] as Map<String, dynamic>;
    return MemberDetailDto(
      userId: u['id'] as String,
      name: u['name'] as String? ?? '',
      email: u['email'] as String? ?? '',
      photoUrl: u['photoUrl'] as String?,
      bio: u['bio'] as String?,
      interests: (u['interests'] as List?)?.cast<String>() ?? const [],
      role: m['role'] as String? ?? 'member',
      joinedAt: DateTime.parse(m['joinedAt'] as String),
      eventsAttended: (a['eventsAttended'] as num?)?.toInt() ?? 0,
      postsAuthored: (a['postsAuthored'] as num?)?.toInt() ?? 0,
      initiativesAuthored: (a['initiativesAuthored'] as num?)?.toInt() ?? 0,
      spendVisible: (json['spendVisible'] as bool?) ?? false,
    );
  }
}

class ModerationItemDto {
  ModerationItemDto({
    required this.id,
    required this.authorId,
    required this.type,
    this.title,
    required this.body,
    required this.hidden,
    required this.createdAt,
  });
  final String id;
  final String authorId;
  final String type;
  final String? title;
  final String body;
  final bool hidden;
  final DateTime createdAt;

  factory ModerationItemDto.fromJson(Map<String, dynamic> json) => ModerationItemDto(
        id: json['id'] as String,
        authorId: json['authorId'] as String? ?? '',
        type: json['type'] as String? ?? 'discussion',
        title: json['title'] as String?,
        body: json['body'] as String? ?? '',
        hidden: (json['hidden'] as bool?) ?? false,
        createdAt: DateTime.parse(json['createdAt'] as String),
      );
}
