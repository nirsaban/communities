// DTOs mirroring the backend /me/notifications + /me/notification-preferences shapes.
// See backend/src/controllers/notification.controller.ts and models/User.ts.

class NotificationDto {
  NotificationDto({
    required this.id,
    required this.type,
    required this.title,
    required this.body,
    required this.payload,
    required this.communityId,
    required this.createdAt,
    this.readAt,
  });

  final String id;
  final String type;
  final String title;
  final String body;
  final Map<String, dynamic> payload;
  final String? communityId;
  final DateTime createdAt;
  final DateTime? readAt;

  bool get isUnread => readAt == null;

  factory NotificationDto.fromJson(Map<String, dynamic> json) {
    return NotificationDto(
      id: json['id'] as String,
      type: json['type'] as String? ?? 'system',
      title: json['title'] as String? ?? '',
      body: json['body'] as String? ?? '',
      payload: (json['payload'] as Map?)?.cast<String, dynamic>() ?? const {},
      communityId: json['communityId'] as String?,
      createdAt: _parseDate(json['createdAt']) ?? DateTime.now(),
      readAt: _parseDate(json['readAt']),
    );
  }
}

class NotificationListPage {
  NotificationListPage({required this.items, this.nextCursor});
  final List<NotificationDto> items;
  final String? nextCursor;
}

/// Fixed enum mirrors backend `NOTIFICATION_PREF_KEYS` in models/User.ts.
enum NotificationPrefKey { events, rsvp, initiatives, posts, system }

String prefKeyToString(NotificationPrefKey k) {
  switch (k) {
    case NotificationPrefKey.events:
      return 'events';
    case NotificationPrefKey.rsvp:
      return 'rsvp';
    case NotificationPrefKey.initiatives:
      return 'initiatives';
    case NotificationPrefKey.posts:
      return 'posts';
    case NotificationPrefKey.system:
      return 'system';
  }
}

NotificationPrefKey? prefKeyFromString(String s) {
  for (final k in NotificationPrefKey.values) {
    if (prefKeyToString(k) == s) return k;
  }
  return null;
}

class NotificationChannelPrefs {
  NotificationChannelPrefs({required this.push, required this.email});
  final bool push;
  final bool email;

  NotificationChannelPrefs copyWith({bool? push, bool? email}) =>
      NotificationChannelPrefs(push: push ?? this.push, email: email ?? this.email);

  factory NotificationChannelPrefs.fromJson(Map<String, dynamic>? json) {
    if (json == null) return NotificationChannelPrefs(push: true, email: true);
    return NotificationChannelPrefs(
      push: json['push'] as bool? ?? true,
      email: json['email'] as bool? ?? true,
    );
  }

  Map<String, dynamic> toJson() => {'push': push, 'email': email};
}

class NotificationPreferencesDto {
  NotificationPreferencesDto({required this.byKey});

  final Map<NotificationPrefKey, NotificationChannelPrefs> byKey;

  NotificationChannelPrefs get(NotificationPrefKey k) =>
      byKey[k] ?? NotificationChannelPrefs(push: true, email: true);

  NotificationPreferencesDto withChannel(
    NotificationPrefKey key, {
    bool? push,
    bool? email,
  }) {
    final next = Map<NotificationPrefKey, NotificationChannelPrefs>.from(byKey);
    final cur = get(key);
    next[key] = cur.copyWith(push: push, email: email);
    return NotificationPreferencesDto(byKey: next);
  }

  factory NotificationPreferencesDto.defaults() => NotificationPreferencesDto(
        byKey: {
          for (final k in NotificationPrefKey.values)
            k: NotificationChannelPrefs(push: true, email: true),
        },
      );

  factory NotificationPreferencesDto.fromJson(Map<String, dynamic> json) {
    final out = <NotificationPrefKey, NotificationChannelPrefs>{};
    json.forEach((k, v) {
      final key = prefKeyFromString(k);
      if (key != null && v is Map) {
        out[key] = NotificationChannelPrefs.fromJson(v.cast<String, dynamic>());
      }
    });
    for (final k in NotificationPrefKey.values) {
      out.putIfAbsent(k, () => NotificationChannelPrefs(push: true, email: true));
    }
    return NotificationPreferencesDto(byKey: out);
  }

  Map<String, dynamic> toJson() =>
      {for (final e in byKey.entries) prefKeyToString(e.key): e.value.toJson()};
}

DateTime? _parseDate(Object? v) {
  if (v is String && v.isNotEmpty) return DateTime.tryParse(v);
  if (v is DateTime) return v;
  return null;
}
