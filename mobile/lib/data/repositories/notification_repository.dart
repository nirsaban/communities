import 'package:dio/dio.dart';

import '../../core/network/api_client.dart';
import '../models/notification_dto.dart';

abstract class NotificationRepository {
  Future<NotificationListPage> list({String? cursor, int? limit, bool unreadOnly = false});
  Future<void> markRead(String notificationId);
  Future<int> markAllRead();
  Future<NotificationPreferencesDto> getPreferences();
  Future<NotificationPreferencesDto> updatePreferences(NotificationPreferencesDto prefs);
}

class DioNotificationRepository implements NotificationRepository {
  DioNotificationRepository(this._client);
  final ApiClient _client;
  Dio get _dio => _client.dio;

  @override
  Future<NotificationListPage> list({String? cursor, int? limit, bool unreadOnly = false}) async {
    try {
      final res = await _dio.get<Map<String, dynamic>>(
        '/me/notifications',
        queryParameters: {
          if (cursor != null) 'cursor': cursor,
          if (limit != null) 'limit': limit,
          if (unreadOnly) 'unread': 'true',
        },
      );
      final body = res.data!;
      final items = (body['data'] as List? ?? const [])
          .whereType<Map<String, dynamic>>()
          .map(NotificationDto.fromJson)
          .toList();
      final meta = body['meta'];
      final next = meta is Map ? meta['nextCursor'] as String? : null;
      return NotificationListPage(items: items, nextCursor: next);
    } catch (e) {
      throw ApiClient.mapError(e);
    }
  }

  @override
  Future<void> markRead(String notificationId) async {
    try {
      await _dio.patch<dynamic>('/me/notifications/$notificationId/read');
    } catch (e) {
      throw ApiClient.mapError(e);
    }
  }

  @override
  Future<int> markAllRead() async {
    try {
      final res = await _dio.patch<Map<String, dynamic>>('/me/notifications/read-all');
      final data = res.data!['data'] as Map<String, dynamic>;
      return (data['updated'] as num?)?.toInt() ?? 0;
    } catch (e) {
      throw ApiClient.mapError(e);
    }
  }

  @override
  Future<NotificationPreferencesDto> getPreferences() async {
    try {
      final res = await _dio.get<Map<String, dynamic>>('/me/notification-preferences');
      final prefs = (res.data!['data'] as Map<String, dynamic>)['preferences'] as Map<String, dynamic>;
      return NotificationPreferencesDto.fromJson(prefs);
    } catch (e) {
      throw ApiClient.mapError(e);
    }
  }

  @override
  Future<NotificationPreferencesDto> updatePreferences(NotificationPreferencesDto prefs) async {
    try {
      final res = await _dio.patch<Map<String, dynamic>>(
        '/me/notification-preferences',
        data: {'preferences': prefs.toJson()},
      );
      final out = (res.data!['data'] as Map<String, dynamic>)['preferences'] as Map<String, dynamic>;
      return NotificationPreferencesDto.fromJson(out);
    } catch (e) {
      throw ApiClient.mapError(e);
    }
  }
}
