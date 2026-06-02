// DTOs mirroring the backend Event + EventRSVP envelopes.
// See backend/src/models/Event.ts → toClientJSON() and EventRSVP.ts.

enum EventPricingKind { free, paid, subscriptionOnly, external }

EventPricingKind _pricingKindFromString(String? v) {
  switch (v) {
    case 'paid':
      return EventPricingKind.paid;
    case 'subscription_only':
      return EventPricingKind.subscriptionOnly;
    case 'external':
      return EventPricingKind.external;
    case 'free':
    default:
      return EventPricingKind.free;
  }
}

enum EventLocationKind { physical, online, hybrid }

EventLocationKind _locationKindFromString(String? v) {
  switch (v) {
    case 'online':
      return EventLocationKind.online;
    case 'hybrid':
      return EventLocationKind.hybrid;
    case 'physical':
    default:
      return EventLocationKind.physical;
  }
}

class EventLocationDto {
  EventLocationDto({required this.kind, this.address, this.url});
  final EventLocationKind kind;
  final String? address;
  final String? url;

  factory EventLocationDto.fromJson(Map<String, dynamic> json) {
    return EventLocationDto(
      kind: _locationKindFromString(json['type'] as String?),
      address: json['address'] as String?,
      url: json['url'] as String?,
    );
  }

  String? get displayLabel {
    switch (kind) {
      case EventLocationKind.online:
        return url ?? 'Online';
      case EventLocationKind.hybrid:
        return address ?? url ?? 'Hybrid';
      case EventLocationKind.physical:
        return address;
    }
  }
}

class EventSpeakerDto {
  EventSpeakerDto({required this.name, this.bio, this.photoUrl});
  final String name;
  final String? bio;
  final String? photoUrl;

  factory EventSpeakerDto.fromJson(Map<String, dynamic> json) {
    return EventSpeakerDto(
      name: json['name'] as String? ?? '',
      bio: json['bio'] as String?,
      photoUrl: json['photoUrl'] as String?,
    );
  }
}

class EventPricingDto {
  EventPricingDto({
    required this.kind,
    required this.priceCents,
    required this.currency,
    this.refundPolicyHours,
    this.externalUrl,
    this.subscriptionIncluded,
  });

  final EventPricingKind kind;
  final int priceCents;
  final String currency;
  final int? refundPolicyHours;
  final String? externalUrl;
  final bool? subscriptionIncluded;

  bool get isFree => kind == EventPricingKind.free;

  factory EventPricingDto.fromJson(Map<String, dynamic> json) {
    return EventPricingDto(
      kind: _pricingKindFromString(json['type'] as String?),
      priceCents: (json['priceCents'] as num?)?.toInt() ?? 0,
      currency: json['currency'] as String? ?? 'USD',
      refundPolicyHours: (json['refundPolicyHours'] as num?)?.toInt(),
      externalUrl: json['externalUrl'] as String?,
      subscriptionIncluded: json['subscriptionIncluded'] as bool?,
    );
  }
}

class EventMetricsDto {
  EventMetricsDto({
    required this.rsvpCount,
    required this.paidCount,
    required this.waitlistCount,
    required this.totalRevenueCents,
  });
  final int rsvpCount;
  final int paidCount;
  final int waitlistCount;
  final int totalRevenueCents;

  factory EventMetricsDto.fromJson(Map<String, dynamic>? json) {
    return EventMetricsDto(
      rsvpCount: (json?['rsvpCount'] as num?)?.toInt() ?? 0,
      paidCount: (json?['paidCount'] as num?)?.toInt() ?? 0,
      waitlistCount: (json?['waitlistCount'] as num?)?.toInt() ?? 0,
      totalRevenueCents: (json?['totalRevenueCents'] as num?)?.toInt() ?? 0,
    );
  }
}

class EventSummaryDto {
  EventSummaryDto({this.publishedAt, this.body, this.photoUrls = const []});
  final DateTime? publishedAt;
  final String? body;
  final List<String> photoUrls;

  bool get isPublished => publishedAt != null && (body ?? '').isNotEmpty;

  factory EventSummaryDto.fromJson(Map<String, dynamic> json) {
    return EventSummaryDto(
      publishedAt: _parseDate(json['publishedAt']),
      body: json['body'] as String?,
      photoUrls: (json['photoUrls'] as List?)?.cast<String>() ?? const [],
    );
  }
}

class EventViewerDto {
  EventViewerDto({this.isManager = false, this.isAttending = false});
  final bool isManager;
  final bool isAttending;

  factory EventViewerDto.fromJson(Map<String, dynamic>? json) {
    if (json == null) return EventViewerDto();
    return EventViewerDto(
      isManager: json['isManager'] as bool? ?? false,
      isAttending: json['isAttending'] as bool? ?? false,
    );
  }
}

class EventDto {
  EventDto({
    required this.id,
    required this.communityId,
    required this.title,
    required this.description,
    this.category,
    this.coverImageUrl,
    required this.type,
    required this.startAt,
    required this.endAt,
    required this.timezone,
    required this.location,
    this.capacity,
    required this.speakers,
    required this.pricing,
    required this.status,
    required this.visibility,
    required this.managers,
    this.createdBy,
    required this.metrics,
    this.summary,
    this.cancelledAt,
    this.cancellationReason,
    required this.createdAt,
    required this.updatedAt,
    required this.viewer,
  });

  final String id;
  final String communityId;
  final String title;
  final String description;
  final String? category;
  final String? coverImageUrl;
  final String type;
  final DateTime startAt;
  final DateTime endAt;
  final String timezone;
  final EventLocationDto location;
  final int? capacity;
  final List<EventSpeakerDto> speakers;
  final EventPricingDto pricing;
  final String status;
  final String visibility;
  final List<String> managers;
  final String? createdBy;
  final EventMetricsDto metrics;
  final EventSummaryDto? summary;
  final DateTime? cancelledAt;
  final String? cancellationReason;
  final DateTime createdAt;
  final DateTime updatedAt;
  final EventViewerDto viewer;

  bool get isCancelled => status == 'cancelled';
  bool get isCompleted => status == 'completed';
  bool get isPast => endAt.isBefore(DateTime.now());
  bool get isFull => capacity != null && metrics.rsvpCount >= capacity!;
  int get waitlistCount => metrics.waitlistCount;

  factory EventDto.fromJson(Map<String, dynamic> json) {
    return EventDto(
      id: json['id'] as String,
      communityId: json['communityId'] as String,
      title: json['title'] as String? ?? '',
      description: json['description'] as String? ?? '',
      category: json['category'] as String?,
      coverImageUrl: json['coverImageUrl'] as String?,
      type: json['type'] as String? ?? 'one_time',
      startAt: _parseDate(json['startAt']) ?? DateTime.now(),
      endAt: _parseDate(json['endAt']) ?? DateTime.now(),
      timezone: json['timezone'] as String? ?? 'UTC',
      location: json['location'] is Map<String, dynamic>
          ? EventLocationDto.fromJson(json['location'] as Map<String, dynamic>)
          : EventLocationDto(kind: EventLocationKind.physical),
      capacity: (json['capacity'] as num?)?.toInt(),
      speakers: (json['speakers'] as List? ?? const [])
          .whereType<Map<String, dynamic>>()
          .map(EventSpeakerDto.fromJson)
          .toList(),
      pricing: json['pricing'] is Map<String, dynamic>
          ? EventPricingDto.fromJson(json['pricing'] as Map<String, dynamic>)
          : EventPricingDto(kind: EventPricingKind.free, priceCents: 0, currency: 'USD'),
      status: json['status'] as String? ?? 'published',
      visibility: json['visibility'] as String? ?? 'community',
      managers: (json['managers'] as List?)?.cast<String>() ?? const [],
      createdBy: json['createdBy'] as String?,
      metrics: EventMetricsDto.fromJson(json['metrics'] as Map<String, dynamic>?),
      summary: json['summary'] is Map<String, dynamic>
          ? EventSummaryDto.fromJson(json['summary'] as Map<String, dynamic>)
          : null,
      cancelledAt: _parseDate(json['cancelledAt']),
      cancellationReason: json['cancellationReason'] as String?,
      createdAt: _parseDate(json['createdAt']) ?? DateTime.now(),
      updatedAt: _parseDate(json['updatedAt']) ?? DateTime.now(),
      viewer: EventViewerDto.fromJson(json['viewer'] as Map<String, dynamic>?),
    );
  }
}

class EventRsvpDto {
  EventRsvpDto({
    required this.id,
    required this.eventId,
    required this.communityId,
    required this.userId,
    required this.status,
    required this.paymentStatus,
    this.notes,
    required this.createdAt,
    required this.updatedAt,
  });

  final String id;
  final String eventId;
  final String communityId;
  final String userId;
  final String status; // going | waitlist | not_going | maybe | cancelled
  final String paymentStatus; // none | pending | paid | refunded
  final String? notes;
  final DateTime createdAt;
  final DateTime updatedAt;

  bool get isWaitlisted => status == 'waitlist';
  bool get isGoing => status == 'going';

  factory EventRsvpDto.fromJson(Map<String, dynamic> json) {
    return EventRsvpDto(
      id: json['id'] as String,
      eventId: json['eventId'] as String,
      communityId: json['communityId'] as String,
      userId: json['userId'] as String,
      status: json['status'] as String? ?? 'going',
      paymentStatus: json['paymentStatus'] as String? ?? 'none',
      notes: json['notes'] as String?,
      createdAt: _parseDate(json['createdAt']) ?? DateTime.now(),
      updatedAt: _parseDate(json['updatedAt']) ?? DateTime.now(),
    );
  }
}

class EventListPage {
  EventListPage({required this.items, this.nextCursor});
  final List<EventDto> items;
  final String? nextCursor;
}

DateTime? _parseDate(Object? v) {
  if (v is String && v.isNotEmpty) return DateTime.tryParse(v);
  if (v is DateTime) return v;
  return null;
}
