// Community + membership DTOs for C2b. Backend shapes live in
// backend/src/models/Community.ts and controllers/community.controller.ts.

class CommunityDto {
  CommunityDto({
    required this.id,
    required this.name,
    this.slug,
    this.description = '',
    this.category,
    this.logoUrl,
    this.coverUrl,
    this.privacy = 'invite_only',
    this.welcomeMessage,
    this.rules,
    this.memberCount = 0,
    this.eventCount = 0,
    this.status = 'active',
  });

  final String id;
  final String name;
  final String? slug;
  final String description;
  final String? category;
  final String? logoUrl;
  final String? coverUrl;
  final String privacy; // public | invite_only | application
  final String? welcomeMessage;
  final String? rules;
  final int memberCount;
  final int eventCount;
  final String status;

  bool get isPublic => privacy == 'public';
  bool get isApplication => privacy == 'application';
  bool get isInviteOnly => privacy == 'invite_only';

  factory CommunityDto.fromJson(Map<String, dynamic> json) {
    final settings = json['settings'] as Map<String, dynamic>?;
    final metrics = json['metrics'] as Map<String, dynamic>?;
    return CommunityDto(
      id: json['id'] as String,
      name: (json['name'] as String?) ?? '',
      slug: json['slug'] as String?,
      description: (json['description'] as String?) ?? '',
      category: json['category'] as String?,
      logoUrl: json['logoUrl'] as String?,
      coverUrl: json['coverUrl'] as String?,
      privacy: (json['privacy'] as String?) ?? 'invite_only',
      welcomeMessage: settings?['welcomeMessage'] as String?,
      rules: settings?['rules'] as String?,
      memberCount: (metrics?['memberCount'] as num?)?.toInt() ??
          (json['memberCount'] as num?)?.toInt() ??
          0,
      eventCount: (metrics?['eventCount'] as num?)?.toInt() ??
          (json['eventCount'] as num?)?.toInt() ??
          0,
      status: (json['status'] as String?) ?? 'active',
    );
  }
}

/// Member-side combined membership + community shape returned by GET /me/communities.
class MyCommunityEntry {
  MyCommunityEntry({required this.membershipId, required this.role, required this.community});
  final String membershipId;
  final String role;
  final CommunityDto community;

  factory MyCommunityEntry.fromJson(Map<String, dynamic> json) {
    final m = json['membership'] as Map<String, dynamic>;
    final c = json['community'] as Map<String, dynamic>;
    return MyCommunityEntry(
      membershipId: m['id'] as String,
      role: m['role'] as String? ?? 'member',
      community: CommunityDto.fromJson(c),
    );
  }
}

/// Single row in GET /me/rsvps — embeds enough event detail to render the card.
class MyRsvpEntry {
  MyRsvpEntry({
    required this.id,
    required this.status,
    required this.paymentStatus,
    required this.event,
  });

  final String id;
  final String status; // going | waitlist | ...
  final String paymentStatus;
  final MyRsvpEvent event;

  bool get isWaitlisted => status == 'waitlist';
  bool get isGoing => status == 'going';

  factory MyRsvpEntry.fromJson(Map<String, dynamic> json) => MyRsvpEntry(
        id: json['id'] as String,
        status: json['status'] as String? ?? 'going',
        paymentStatus: json['paymentStatus'] as String? ?? 'none',
        event: MyRsvpEvent.fromJson(json['event'] as Map<String, dynamic>),
      );
}

class MyRsvpEvent {
  MyRsvpEvent({
    required this.id,
    required this.communityId,
    required this.title,
    required this.startAt,
    required this.endAt,
    this.coverImageUrl,
    this.locationLabel,
    this.locationKind = 'physical',
    this.priceKind = 'free',
    this.priceCents = 0,
    this.currency = 'USD',
  });

  final String id;
  final String communityId;
  final String title;
  final DateTime startAt;
  final DateTime endAt;
  final String? coverImageUrl;
  final String? locationLabel;
  final String locationKind;
  final String priceKind;
  final int priceCents;
  final String currency;

  factory MyRsvpEvent.fromJson(Map<String, dynamic> json) {
    final loc = json['location'] as Map<String, dynamic>?;
    final price = json['pricing'] as Map<String, dynamic>?;
    return MyRsvpEvent(
      id: json['id'] as String,
      communityId: json['communityId'] as String,
      title: (json['title'] as String?) ?? '',
      startAt: DateTime.parse(json['startAt'] as String),
      endAt: DateTime.parse(json['endAt'] as String),
      coverImageUrl: json['coverImageUrl'] as String?,
      locationLabel: (loc?['address'] as String?) ?? (loc?['url'] as String?),
      locationKind: (loc?['type'] as String?) ?? 'physical',
      priceKind: (price?['type'] as String?) ?? 'free',
      priceCents: (price?['priceCents'] as num?)?.toInt() ?? 0,
      currency: (price?['currency'] as String?) ?? 'USD',
    );
  }
}
