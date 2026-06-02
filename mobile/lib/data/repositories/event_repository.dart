import 'package:dio/dio.dart';

import '../../core/network/api_client.dart';
import '../models/event_dto.dart';

class EventListFilter {
  const EventListFilter({
    this.status,
    this.from,
    this.to,
    this.cursor,
    this.limit,
  });

  final String? status; // draft | published | cancelled | completed
  final DateTime? from;
  final DateTime? to;
  final String? cursor;
  final int? limit;

  Map<String, dynamic> toQuery() => {
        if (status != null) 'status': status,
        if (from != null) 'from': from!.toIso8601String(),
        if (to != null) 'to': to!.toIso8601String(),
        if (cursor != null) 'cursor': cursor,
        if (limit != null) 'limit': limit,
      };
}

/// Outcome of a POST /events/:id/rsvp call.
/// Free or already-paid → [rsvp] populated.
/// Paid event with no completed payment → backend returns 402 + checkoutUrl,
/// which we surface as [checkoutUrl] for the caller to hand off to Stripe.
class RsvpOutcome {
  RsvpOutcome({this.rsvp, this.checkoutUrl, this.paymentId});
  final EventRsvpDto? rsvp;
  final String? checkoutUrl;
  final String? paymentId;

  bool get needsCheckout => checkoutUrl != null;
  bool get isWaitlisted => rsvp?.isWaitlisted ?? false;
}

abstract class EventRepository {
  Future<EventListPage> list(String communityId, EventListFilter filter);
  Future<EventDto> detail(String eventId);
  Future<RsvpOutcome> rsvp(String eventId, {String? notes});
  Future<void> cancelRsvp(String eventId);
}

class DioEventRepository implements EventRepository {
  DioEventRepository(this._client);
  final ApiClient _client;
  Dio get _dio => _client.dio;

  @override
  Future<EventListPage> list(String communityId, EventListFilter filter) async {
    try {
      final res = await _dio.get<Map<String, dynamic>>(
        '/communities/$communityId/events',
        queryParameters: filter.toQuery(),
      );
      final body = res.data!;
      final items = (body['data'] as List? ?? const [])
          .whereType<Map<String, dynamic>>()
          .map(EventDto.fromJson)
          .toList();
      final meta = body['meta'];
      final nextCursor = meta is Map ? meta['nextCursor'] as String? : null;
      return EventListPage(items: items, nextCursor: nextCursor);
    } catch (e) {
      throw ApiClient.mapError(e);
    }
  }

  @override
  Future<EventDto> detail(String eventId) async {
    try {
      final res = await _dio.get<Map<String, dynamic>>('/events/$eventId');
      return EventDto.fromJson(res.data!['data'] as Map<String, dynamic>);
    } catch (e) {
      throw ApiClient.mapError(e);
    }
  }

  @override
  Future<RsvpOutcome> rsvp(String eventId, {String? notes}) async {
    try {
      final res = await _dio.post<Map<String, dynamic>>(
        '/events/$eventId/rsvp',
        data: {if (notes != null) 'notes': notes},
      );
      final data = res.data!['data'] as Map<String, dynamic>;
      return RsvpOutcome(rsvp: EventRsvpDto.fromJson(data));
    } on DioException catch (e) {
      // Paid event → backend returns 402 with details.checkoutUrl + paymentId.
      final body = e.response?.data;
      if (e.response?.statusCode == 402 &&
          body is Map<String, dynamic> &&
          body['error'] is Map) {
        final err = body['error'] as Map;
        final details = err['details'];
        if (details is Map && details['checkoutUrl'] is String) {
          return RsvpOutcome(
            checkoutUrl: details['checkoutUrl'] as String,
            paymentId: details['paymentId'] as String?,
          );
        }
      }
      throw ApiClient.mapError(e);
    } catch (e) {
      throw ApiClient.mapError(e);
    }
  }

  @override
  Future<void> cancelRsvp(String eventId) async {
    try {
      await _dio.delete<Map<String, dynamic>>('/events/$eventId/rsvp');
    } catch (e) {
      throw ApiClient.mapError(e);
    }
  }
}
