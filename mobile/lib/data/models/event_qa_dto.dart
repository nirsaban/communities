// EventQA + recap DTOs for C4.

class EventQaDto {
  EventQaDto({
    required this.id,
    required this.eventId,
    required this.userId,
    required this.question,
    required this.upvoteCount,
    required this.upvoted,
    required this.pinned,
    required this.resolved,
    this.resolvedAt,
    this.answer,
    required this.createdAt,
  });

  final String id;
  final String eventId;
  final String userId;
  final String question;
  final int upvoteCount;
  final bool upvoted;
  final bool pinned;
  final bool resolved;
  final DateTime? resolvedAt;
  final EventQaAnswer? answer;
  final DateTime createdAt;

  bool get isAnswered => answer != null;

  factory EventQaDto.fromJson(Map<String, dynamic> json) {
    return EventQaDto(
      id: json['id'] as String,
      eventId: json['eventId'] as String,
      userId: json['userId'] as String,
      question: json['question'] as String? ?? '',
      upvoteCount: (json['upvoteCount'] as num?)?.toInt() ?? 0,
      upvoted: (json['upvoted'] as bool?) ?? false,
      pinned: (json['pinned'] as bool?) ?? false,
      resolved: (json['resolved'] as bool?) ?? false,
      resolvedAt: _parseDate(json['resolvedAt']),
      answer: json['answer'] is Map<String, dynamic>
          ? EventQaAnswer.fromJson(json['answer'] as Map<String, dynamic>)
          : null,
      createdAt: _parseDate(json['createdAt']) ?? DateTime.now(),
    );
  }
}

class EventQaAnswer {
  EventQaAnswer({
    required this.body,
    required this.answeredByUserId,
    required this.answeredAt,
  });

  final String body;
  final String answeredByUserId;
  final DateTime answeredAt;

  factory EventQaAnswer.fromJson(Map<String, dynamic> json) {
    return EventQaAnswer(
      body: json['body'] as String? ?? '',
      answeredByUserId: json['answeredByUserId'] as String? ?? '',
      answeredAt: _parseDate(json['answeredAt']) ?? DateTime.now(),
    );
  }
}

class EventMaterialDto {
  EventMaterialDto({
    required this.id,
    required this.eventId,
    required this.title,
    this.description,
    required this.type,
    required this.fileUrl,
    this.fileSizeBytes,
    required this.createdAt,
  });

  final String id;
  final String eventId;
  final String title;
  final String? description;
  final String type; // pdf | video | audio | image | slides | other
  final String fileUrl;
  final int? fileSizeBytes;
  final DateTime createdAt;

  factory EventMaterialDto.fromJson(Map<String, dynamic> json) {
    return EventMaterialDto(
      id: json['id'] as String,
      eventId: json['eventId'] as String,
      title: json['title'] as String? ?? '',
      description: json['description'] as String?,
      type: json['type'] as String? ?? 'other',
      fileUrl: json['fileUrl'] as String? ?? '',
      fileSizeBytes: (json['fileSizeBytes'] as num?)?.toInt(),
      createdAt: _parseDate(json['createdAt']) ?? DateTime.now(),
    );
  }
}

DateTime? _parseDate(Object? v) {
  if (v is String && v.isNotEmpty) return DateTime.tryParse(v);
  if (v is DateTime) return v;
  return null;
}
