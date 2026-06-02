import 'package:dio/dio.dart';

import '../../core/network/api_client.dart';
import '../models/admin_dto.dart';

class AdminRepository {
  AdminRepository(this._client);
  final ApiClient _client;
  Dio get _dio => _client.dio;

  Future<AdminOverviewDto> overview(String cid) async {
    try {
      final res = await _dio.get<Map<String, dynamic>>('/communities/$cid/admin/overview');
      return AdminOverviewDto.fromJson(res.data!['data'] as Map<String, dynamic>);
    } catch (e) {
      throw ApiClient.mapError(e);
    }
  }

  Future<AttendanceAnalyticsDto> attendance(String cid) async {
    try {
      final res = await _dio.get<Map<String, dynamic>>('/communities/$cid/admin/analytics/attendance');
      return AttendanceAnalyticsDto.fromJson(res.data!['data'] as Map<String, dynamic>);
    } catch (e) {
      throw ApiClient.mapError(e);
    }
  }

  Future<GrowthAnalyticsDto> growth(String cid) async {
    try {
      final res = await _dio.get<Map<String, dynamic>>('/communities/$cid/admin/analytics/growth');
      return GrowthAnalyticsDto.fromJson(res.data!['data'] as Map<String, dynamic>);
    } catch (e) {
      throw ApiClient.mapError(e);
    }
  }

  Future<List<LeaderRow>> mostActive(String cid) async {
    try {
      final res = await _dio.get<Map<String, dynamic>>('/communities/$cid/admin/analytics/most-active');
      return ((res.data!['data'] as List?) ?? const [])
          .whereType<Map<String, dynamic>>()
          .map(LeaderRow.fromJson)
          .toList();
    } catch (e) {
      throw ApiClient.mapError(e);
    }
  }

  Future<List<PendingMemberRow>> pendingMembers(String cid) async {
    try {
      final res = await _dio.get<Map<String, dynamic>>('/communities/$cid/admin/members/pending');
      return ((res.data!['data'] as List?) ?? const [])
          .whereType<Map<String, dynamic>>()
          .map(PendingMemberRow.fromJson)
          .toList();
    } catch (e) {
      throw ApiClient.mapError(e);
    }
  }

  Future<void> approveMember(String cid, String uid) async {
    try {
      await _dio.post<dynamic>('/communities/$cid/admin/members/$uid/approve');
    } catch (e) {
      throw ApiClient.mapError(e);
    }
  }

  Future<void> rejectMember(String cid, String uid) async {
    try {
      await _dio.post<dynamic>('/communities/$cid/admin/members/$uid/reject');
    } catch (e) {
      throw ApiClient.mapError(e);
    }
  }

  Future<MemberDetailDto> memberDetail(String cid, String uid) async {
    try {
      final res = await _dio.get<Map<String, dynamic>>('/communities/$cid/admin/members/$uid');
      return MemberDetailDto.fromJson(res.data!['data'] as Map<String, dynamic>);
    } catch (e) {
      throw ApiClient.mapError(e);
    }
  }

  Future<List<ModerationItemDto>> moderationQueue(String cid) async {
    try {
      final res = await _dio.get<Map<String, dynamic>>('/communities/$cid/admin/moderation');
      return ((res.data!['data'] as List?) ?? const [])
          .whereType<Map<String, dynamic>>()
          .map(ModerationItemDto.fromJson)
          .toList();
    } catch (e) {
      throw ApiClient.mapError(e);
    }
  }

  Future<void> moderatePost(String pid, {required String action}) async {
    try {
      await _dio.post<dynamic>('/posts/$pid/moderate', data: {'action': action});
    } catch (e) {
      throw ApiClient.mapError(e);
    }
  }

  Future<int> broadcastEvent(String eid, String message) async {
    try {
      final res = await _dio.post<Map<String, dynamic>>(
        '/events/$eid/broadcast',
        data: {'message': message},
      );
      final data = res.data!['data'] as Map<String, dynamic>;
      return (data['delivered'] as num?)?.toInt() ?? 0;
    } catch (e) {
      throw ApiClient.mapError(e);
    }
  }

  // C6: admin-only community subscriptions list.
  Future<List<Map<String, dynamic>>> communitySubscriptions(String cid) async {
    try {
      final res = await _dio.get<Map<String, dynamic>>('/communities/$cid/admin/subscriptions');
      return ((res.data!['data'] as List?) ?? const [])
          .whereType<Map<String, dynamic>>()
          .toList();
    } catch (e) {
      throw ApiClient.mapError(e);
    }
  }

  // C6: admin invites a member by email.
  Future<Map<String, dynamic>> inviteMember(String cid,
      {required String email, String role = 'member'}) async {
    try {
      final res = await _dio.post<Map<String, dynamic>>(
        '/communities/$cid/members/invite',
        data: {'email': email, 'role': role},
      );
      return res.data!['data'] as Map<String, dynamic>;
    } catch (e) {
      throw ApiClient.mapError(e);
    }
  }

  // C6: change a member's role.
  Future<void> changeRole(String cid, String uid, String role) async {
    try {
      await _dio.patch<dynamic>(
        '/communities/$cid/members/$uid',
        data: {'role': role},
      );
    } catch (e) {
      throw ApiClient.mapError(e);
    }
  }

  // C6: assign event manager.
  Future<void> assignEventManager(String eid, String userId) async {
    try {
      await _dio.post<dynamic>('/events/$eid/managers', data: {'userId': userId});
    } catch (e) {
      throw ApiClient.mapError(e);
    }
  }

  // C6: issue refund.
  Future<Map<String, dynamic>> refundPayment(String pid,
      {int? amountCents, String? reason}) async {
    try {
      final res = await _dio.post<Map<String, dynamic>>(
        '/payments/$pid/refund',
        data: {
          if (amountCents != null) 'amountCents': amountCents,
          if (reason != null) 'reason': reason,
        },
      );
      return res.data!['data'] as Map<String, dynamic>;
    } catch (e) {
      throw ApiClient.mapError(e);
    }
  }

  // C6: admin updates community settings (branding, welcome, rules).
  Future<Map<String, dynamic>> updateCommunity(String cid, Map<String, dynamic> patch) async {
    try {
      final res = await _dio.patch<Map<String, dynamic>>(
        '/communities/$cid',
        data: patch,
      );
      return res.data!['data'] as Map<String, dynamic>;
    } catch (e) {
      throw ApiClient.mapError(e);
    }
  }

  // C6: list event payments for IssueRefund picker.
  Future<List<Map<String, dynamic>>> listEventPayments(String eid) async {
    try {
      final res = await _dio.get<Map<String, dynamic>>('/events/$eid/payments');
      return ((res.data!['data'] as List?) ?? const [])
          .whereType<Map<String, dynamic>>()
          .toList();
    } catch (e) {
      throw ApiClient.mapError(e);
    }
  }
}
