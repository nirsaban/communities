import 'package:dio/dio.dart';

import '../../core/network/api_client.dart';
import '../models/community_dto.dart';

abstract class MeRepository {
  Future<List<MyRsvpEntry>> rsvps({String bucket = 'upcoming'});
  Future<DateTime> deleteAccount();
}

class DioMeRepository implements MeRepository {
  DioMeRepository(this._client);
  final ApiClient _client;
  Dio get _dio => _client.dio;

  @override
  Future<List<MyRsvpEntry>> rsvps({String bucket = 'upcoming'}) async {
    try {
      final res = await _dio.get<Map<String, dynamic>>(
        '/me/rsvps',
        queryParameters: {'bucket': bucket},
      );
      final list = (res.data!['data'] as List? ?? const []);
      return list.whereType<Map<String, dynamic>>().map(MyRsvpEntry.fromJson).toList();
    } catch (e) {
      throw ApiClient.mapError(e);
    }
  }

  @override
  Future<DateTime> deleteAccount() async {
    try {
      final res = await _dio.delete<Map<String, dynamic>>('/auth/me');
      final iso = (res.data!['data'] as Map<String, dynamic>)['scheduledDeletionAt'] as String;
      return DateTime.parse(iso);
    } catch (e) {
      throw ApiClient.mapError(e);
    }
  }
}
