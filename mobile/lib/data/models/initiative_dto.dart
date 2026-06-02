// DTOs that mirror the backend initiative + comment envelopes.

class InitiativeDto {
  InitiativeDto({
    required this.id,
    required this.communityId,
    required this.authorId,
    required this.title,
    required this.description,
    required this.category,
    required this.status,
    required this.supporterCount,
    required this.commentCount,
    required this.contributorIds,
    this.coverImageUrl,
    this.targetDate,
    this.completedAt,
    this.completionSummary,
    this.rejectionReason,
    this.isSupporting = false,
    this.isContributor = false,
    required this.createdAt,
    required this.updatedAt,
  });

  final String id;
  final String communityId;
  final String authorId;
  final String title;
  final String description;
  final String category;
  final String status;
  final int supporterCount;
  final int commentCount;
  final List<String> contributorIds;
  final String? coverImageUrl;
  final DateTime? targetDate;
  final DateTime? completedAt;
  final String? completionSummary;
  final String? rejectionReason;
  final bool isSupporting;
  final bool isContributor;
  final DateTime createdAt;
  final DateTime updatedAt;

  factory InitiativeDto.fromJson(Map<String, dynamic> json) {
    DateTime? parse(Object? v) =>
        v is String && v.isNotEmpty ? DateTime.parse(v) : null;
    final viewer = json['viewer'];
    return InitiativeDto(
      id: json['id'] as String,
      communityId: json['communityId'] as String,
      authorId: json['authorId'] as String,
      title: json['title'] as String,
      description: (json['description'] as String?) ?? '',
      category: json['category'] as String,
      status: json['status'] as String,
      supporterCount: (json['supporterCount'] as num?)?.toInt() ?? 0,
      commentCount: (json['commentCount'] as num?)?.toInt() ?? 0,
      contributorIds:
          (json['contributorIds'] as List?)?.cast<String>() ?? const [],
      coverImageUrl: json['coverImageUrl'] as String?,
      targetDate: parse(json['targetDate']),
      completedAt: parse(json['completedAt']),
      completionSummary: json['completionSummary'] as String?,
      rejectionReason: json['rejectionReason'] as String?,
      isSupporting: viewer is Map ? (viewer['isSupporting'] as bool? ?? false) : false,
      isContributor: viewer is Map ? (viewer['isContributor'] as bool? ?? false) : false,
      createdAt: parse(json['createdAt']) ?? DateTime.now(),
      updatedAt: parse(json['updatedAt']) ?? DateTime.now(),
    );
  }
}

class CommentDto {
  CommentDto({
    required this.id,
    required this.parentType,
    required this.parentId,
    required this.authorId,
    required this.body,
    this.replyToId,
    required this.createdAt,
  });

  final String id;
  final String parentType;
  final String parentId;
  final String authorId;
  final String body;
  final String? replyToId;
  final DateTime createdAt;

  factory CommentDto.fromJson(Map<String, dynamic> json) {
    return CommentDto(
      id: json['id'] as String,
      parentType: json['parentType'] as String,
      parentId: json['parentId'] as String,
      authorId: json['authorId'] as String,
      body: json['body'] as String,
      replyToId: json['replyToId'] as String?,
      createdAt: DateTime.parse(json['createdAt'] as String),
    );
  }
}

class PostDto {
  PostDto({
    required this.id,
    required this.communityId,
    required this.authorId,
    required this.type,
    required this.body,
    this.title,
    this.imageUrls = const [],
    this.isPinned = false,
    this.isLocked = false,
    required this.commentCount,
    required this.createdAt,
  });

  final String id;
  final String communityId;
  final String authorId;
  final String type;
  final String body;
  final String? title;
  final List<String> imageUrls;
  final bool isPinned;
  final bool isLocked;
  final int commentCount;
  final DateTime createdAt;

  factory PostDto.fromJson(Map<String, dynamic> json) {
    return PostDto(
      id: json['id'] as String,
      communityId: json['communityId'] as String,
      authorId: json['authorId'] as String,
      type: json['type'] as String,
      body: json['body'] as String,
      title: json['title'] as String?,
      imageUrls: (json['imageUrls'] as List?)?.cast<String>() ?? const [],
      isPinned: json['isPinned'] as bool? ?? false,
      isLocked: json['isLocked'] as bool? ?? false,
      commentCount: (json['commentCount'] as num?)?.toInt() ?? 0,
      createdAt: DateTime.parse(json['createdAt'] as String),
    );
  }
}
