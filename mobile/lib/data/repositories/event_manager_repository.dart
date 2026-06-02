import 'package:dio/dio.dart';

import '../../core/network/api_client.dart';
import '../models/event_dto.dart';
import '../models/event_qa_dto.dart';

class EventManagerRepository {
  EventManagerRepository(this._client);
  final ApiClient _client;
  Dio get _dio => _client.dio;

  // Event CRUD (admin / subadmin)
  Future<EventDto> createEvent(String communityId, Map<String, dynamic> body) async {
    try {
      final res = await _dio.post<Map<String, dynamic>>(
        '/communities/$communityId/events',
        data: body,
      );
      return EventDto.fromJson(res.data!['data'] as Map<String, dynamic>);
    } catch (e) {
      throw ApiClient.mapError(e);
    }
  }

  Future<EventDto> updateEvent(String eventId, Map<String, dynamic> body) async {
    try {
      final res = await _dio.patch<Map<String, dynamic>>(
        '/events/$eventId',
        data: body,
      );
      return EventDto.fromJson(res.data!['data'] as Map<String, dynamic>);
    } catch (e) {
      throw ApiClient.mapError(e);
    }
  }

  Future<void> cancelEvent(String eventId, {String? reason}) async {
    try {
      await _dio.post<dynamic>(
        '/events/$eventId/cancel',
        data: {if (reason != null) 'reason': reason},
      );
    } catch (e) {
      throw ApiClient.mapError(e);
    }
  }

  // Attendees
  Future<List<Map<String, dynamic>>> listEventRsvps(String eventId) async {
    try {
      final res = await _dio.get<Map<String, dynamic>>('/events/$eventId/rsvps');
      final list = res.data!['data'] as List? ?? const [];
      return list.whereType<Map<String, dynamic>>().toList();
    } catch (e) {
      throw ApiClient.mapError(e);
    }
  }

  Future<void> checkIn(String eventId, String rsvpId) async {
    try {
      await _dio.post<dynamic>('/events/$eventId/rsvps/$rsvpId/check-in');
    } catch (e) {
      throw ApiClient.mapError(e);
    }
  }

  Future<int> checkInAll(String eventId) async {
    try {
      final res = await _dio.post<Map<String, dynamic>>('/events/$eventId/check-in-all');
      return ((res.data!['data'] as Map<String, dynamic>)['updated'] as num?)?.toInt() ?? 0;
    } catch (e) {
      throw ApiClient.mapError(e);
    }
  }

  // Materials
  Future<List<EventMaterialDto>> listMaterials(String eventId) async {
    try {
      final res = await _dio.get<Map<String, dynamic>>('/events/$eventId/materials');
      final list = res.data!['data'] as List? ?? const [];
      return list.whereType<Map<String, dynamic>>().map(EventMaterialDto.fromJson).toList();
    } catch (e) {
      throw ApiClient.mapError(e);
    }
  }

  // Q&A
  Future<List<EventQaDto>> listQa(String eventId) async {
    try {
      final res = await _dio.get<Map<String, dynamic>>('/events/$eventId/qa');
      final list = res.data!['data'] as List? ?? const [];
      return list.whereType<Map<String, dynamic>>().map(EventQaDto.fromJson).toList();
    } catch (e) {
      throw ApiClient.mapError(e);
    }
  }

  Future<EventQaDto> createQa(String eventId, String question) async {
    try {
      final res = await _dio.post<Map<String, dynamic>>(
        '/events/$eventId/qa',
        data: {'question': question},
      );
      return EventQaDto.fromJson(res.data!['data'] as Map<String, dynamic>);
    } catch (e) {
      throw ApiClient.mapError(e);
    }
  }

  Future<EventQaDto> upvoteQa(String eventId, String qid) async {
    try {
      final res = await _dio.post<Map<String, dynamic>>('/events/$eventId/qa/$qid/upvote');
      return EventQaDto.fromJson(res.data!['data'] as Map<String, dynamic>);
    } catch (e) {
      throw ApiClient.mapError(e);
    }
  }

  Future<EventQaDto> answerQa(String eventId, String qid, String body) async {
    try {
      final res = await _dio.post<Map<String, dynamic>>(
        '/events/$eventId/qa/$qid/answer',
        data: {'body': body},
      );
      return EventQaDto.fromJson(res.data!['data'] as Map<String, dynamic>);
    } catch (e) {
      throw ApiClient.mapError(e);
    }
  }

  Future<EventQaDto> pinQa(String eventId, String qid) async {
    try {
      final res = await _dio.post<Map<String, dynamic>>('/events/$eventId/qa/$qid/pin');
      return EventQaDto.fromJson(res.data!['data'] as Map<String, dynamic>);
    } catch (e) {
      throw ApiClient.mapError(e);
    }
  }

  Future<EventQaDto> resolveQa(String eventId, String qid) async {
    try {
      final res = await _dio.post<Map<String, dynamic>>('/events/$eventId/qa/$qid/resolve');
      return EventQaDto.fromJson(res.data!['data'] as Map<String, dynamic>);
    } catch (e) {
      throw ApiClient.mapError(e);
    }
  }

  // Recap
  Future<EventDto> publishRecap(
    String eventId, {
    required String body,
    List<String> photoUrls = const [],
    bool notify = false,
  }) async {
    try {
      final res = await _dio.post<Map<String, dynamic>>(
        '/events/$eventId/recap',
        data: {'body': body, 'photoUrls': photoUrls, 'notify': notify},
      );
      return EventDto.fromJson(res.data!['data'] as Map<String, dynamic>);
    } catch (e) {
      throw ApiClient.mapError(e);
    }
  }

  // Managed events
  Future<List<EventDto>> listManagedEvents({String bucket = 'upcoming'}) async {
    try {
      final res = await _dio.get<Map<String, dynamic>>(
        '/me/managed-events',
        queryParameters: {'bucket': bucket},
      );
      final list = res.data!['data'] as List? ?? const [];
      return list.whereType<Map<String, dynamic>>().map(EventDto.fromJson).toList();
    } catch (e) {
      throw ApiClient.mapError(e);
    }
  }
}
