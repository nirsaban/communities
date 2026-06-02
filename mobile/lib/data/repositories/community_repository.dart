import 'package:dio/dio.dart';

import '../../core/network/api_client.dart';
import '../models/community_dto.dart';

abstract class CommunityRepository {
  Future<CommunityDto> detail(String communityId);
  Future<List<MyCommunityEntry>> myCommunities();
  Future<List<CommunityDto>> discover({String? query, String? cursor, int? limit});
  Future<void> join(String communityId);
  Future<void> requestJoin(String communityId);
  Future<void> acknowledgeRules(String communityId);
}

class DioCommunityRepository implements CommunityRepository {
  DioCommunityRepository(this._client);
  final ApiClient _client;
  Dio get _dio => _client.dio;

  @override
  Future<CommunityDto> detail(String communityId) async {
    try {
      final res = await _dio.get<Map<String, dynamic>>('/communities/$communityId');
      return CommunityDto.fromJson(res.data!['data'] as Map<String, dynamic>);
    } catch (e) {
      throw ApiClient.mapError(e);
    }
  }

  @override
  Future<List<MyCommunityEntry>> myCommunities() async {
    try {
      final res = await _dio.get<Map<String, dynamic>>('/me/communities');
      final list = (res.data!['data'] as List? ?? const []);
      return list
          .whereType<Map<String, dynamic>>()
          .where((m) => m['community'] != null)
          .map(MyCommunityEntry.fromJson)
          .toList();
    } catch (e) {
      throw ApiClient.mapError(e);
    }
  }

  @override
  Future<List<CommunityDto>> discover({String? query, String? cursor, int? limit}) async {
    try {
      final res = await _dio.get<Map<String, dynamic>>(
        '/discovery/communities',
        queryParameters: {
          if (query != null && query.isNotEmpty) 'q': query,
          if (cursor != null) 'cursor': cursor,
          if (limit != null) 'limit': limit,
        },
      );
      final list = (res.data!['data'] as List? ?? const []);
      return list.whereType<Map<String, dynamic>>().map(CommunityDto.fromJson).toList();
    } catch (e) {
      throw ApiClient.mapError(e);
    }
  }

  @override
  Future<void> join(String communityId) async {
    try {
      await _dio.post<dynamic>('/discovery/communities/$communityId/join');
    } catch (e) {
      throw ApiClient.mapError(e);
    }
  }

  @override
  Future<void> requestJoin(String communityId) async {
    try {
      await _dio.post<dynamic>('/discovery/communities/$communityId/request');
    } catch (e) {
      throw ApiClient.mapError(e);
    }
  }

  @override
  Future<void> acknowledgeRules(String communityId) async {
    try {
      await _dio.post<dynamic>('/communities/$communityId/rules/ack');
    } catch (e) {
      throw ApiClient.mapError(e);
    }
  }
}
