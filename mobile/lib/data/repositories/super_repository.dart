import 'package:dio/dio.dart';

import '../../core/network/api_client.dart';

class SuperRepository {
  SuperRepository(this._client);
  final ApiClient _client;
  Dio get _dio => _client.dio;

  Future<Map<String, dynamic>> stats() async {
    try {
      final res = await _dio.get<Map<String, dynamic>>('/super/stats');
      return res.data!['data'] as Map<String, dynamic>;
    } catch (e) {
      throw ApiClient.mapError(e);
    }
  }

  Future<List<Map<String, dynamic>>> listCommunities({String? search, String? status}) async {
    try {
      final res = await _dio.get<Map<String, dynamic>>(
        '/super/communities',
        queryParameters: {
          if (search != null && search.isNotEmpty) 'search': search,
          if (status != null) 'status': status,
        },
      );
      return ((res.data!['data'] as List?) ?? const [])
          .whereType<Map<String, dynamic>>()
          .toList();
    } catch (e) {
      throw ApiClient.mapError(e);
    }
  }

  Future<Map<String, dynamic>> communityDetail(String cid) async {
    try {
      final res = await _dio.get<Map<String, dynamic>>('/super/communities/$cid');
      return res.data!['data'] as Map<String, dynamic>;
    } catch (e) {
      throw ApiClient.mapError(e);
    }
  }

  Future<void> suspendCommunity(String cid) async {
    try {
      await _dio.post<dynamic>('/super/communities/$cid/suspend');
    } catch (e) {
      throw ApiClient.mapError(e);
    }
  }

  Future<void> restoreCommunity(String cid) async {
    try {
      await _dio.post<dynamic>('/super/communities/$cid/restore');
    } catch (e) {
      throw ApiClient.mapError(e);
    }
  }

  Future<void> deleteCommunity(String cid) async {
    try {
      await _dio.delete<dynamic>('/super/communities/$cid');
    } catch (e) {
      throw ApiClient.mapError(e);
    }
  }

  Future<List<Map<String, dynamic>>> listUsers({String? query, String? status}) async {
    try {
      final res = await _dio.get<Map<String, dynamic>>(
        '/super/users',
        queryParameters: {
          if (query != null && query.isNotEmpty) 'q': query,
          if (status != null) 'status': status,
        },
      );
      return ((res.data!['data'] as List?) ?? const [])
          .whereType<Map<String, dynamic>>()
          .toList();
    } catch (e) {
      throw ApiClient.mapError(e);
    }
  }

  Future<Map<String, dynamic>> userDetail(String uid) async {
    try {
      final res = await _dio.get<Map<String, dynamic>>('/super/users/$uid');
      return res.data!['data'] as Map<String, dynamic>;
    } catch (e) {
      throw ApiClient.mapError(e);
    }
  }

  Future<void> disableUser(String uid) async {
    try {
      await _dio.post<dynamic>('/super/users/$uid/disable');
    } catch (e) {
      throw ApiClient.mapError(e);
    }
  }

  Future<void> enableUser(String uid) async {
    try {
      await _dio.post<dynamic>('/super/users/$uid/enable');
    } catch (e) {
      throw ApiClient.mapError(e);
    }
  }

  Future<Map<String, dynamic>> getSettings() async {
    try {
      final res = await _dio.get<Map<String, dynamic>>('/super/settings');
      return res.data!['data'] as Map<String, dynamic>;
    } catch (e) {
      throw ApiClient.mapError(e);
    }
  }

  Future<Map<String, dynamic>> updateSettings({bool? maintenanceMode, bool? allowSignups}) async {
    try {
      final res = await _dio.patch<Map<String, dynamic>>(
        '/super/settings',
        data: {
          if (maintenanceMode != null) 'maintenanceMode': maintenanceMode,
          if (allowSignups != null) 'allowSignups': allowSignups,
        },
      );
      return res.data!['data'] as Map<String, dynamic>;
    } catch (e) {
      throw ApiClient.mapError(e);
    }
  }
}
