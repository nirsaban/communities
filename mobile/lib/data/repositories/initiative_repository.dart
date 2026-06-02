import 'package:dio/dio.dart';

import '../../core/network/api_client.dart';
import '../models/initiative_dto.dart';

abstract class InitiativeRepository {
  Future<List<InitiativeDto>> list(
    String communityId, {
    String? status,
    String? filter,
  });
  Future<InitiativeDto> get(String iid);
  Future<InitiativeDto> create(
    String communityId, {
    required String title,
    required String description,
    required String category,
  });
  Future<InitiativeDto> submit(String iid);
  Future<InitiativeDto> support(String iid);
  Future<InitiativeDto> unsupport(String iid);
  Future<InitiativeDto> approve(String iid);
  Future<InitiativeDto> reject(String iid, {String? reason});
  Future<InitiativeDto> complete(String iid, {String? summary});
  Future<List<CommentDto>> listComments(String iid);
  Future<CommentDto> addComment(String iid, String body);
}

class DioInitiativeRepository implements InitiativeRepository {
  DioInitiativeRepository(this._client);
  final ApiClient _client;
  Dio get _dio => _client.dio;

  @override
  Future<List<InitiativeDto>> list(
    String communityId, {
    String? status,
    String? filter,
  }) async {
    try {
      final res = await _dio.get<Map<String, dynamic>>(
        '/communities/$communityId/initiatives',
        queryParameters: {
          if (status != null) 'status': status,
          if (filter != null) 'filter': filter,
        },
      );
      final list = res.data!['data'] as List;
      return list.map((j) => InitiativeDto.fromJson(j as Map<String, dynamic>)).toList();
    } catch (e) {
      throw ApiClient.mapError(e);
    }
  }

  @override
  Future<InitiativeDto> get(String iid) async {
    try {
      final res = await _dio.get<Map<String, dynamic>>('/initiatives/$iid');
      return InitiativeDto.fromJson(res.data!['data'] as Map<String, dynamic>);
    } catch (e) {
      throw ApiClient.mapError(e);
    }
  }

  @override
  Future<InitiativeDto> create(
    String communityId, {
    required String title,
    required String description,
    required String category,
  }) async {
    try {
      final res = await _dio.post<Map<String, dynamic>>(
        '/communities/$communityId/initiatives',
        data: {'title': title, 'description': description, 'category': category},
      );
      return InitiativeDto.fromJson(res.data!['data'] as Map<String, dynamic>);
    } catch (e) {
      throw ApiClient.mapError(e);
    }
  }

  @override
  Future<InitiativeDto> submit(String iid) => _post('/initiatives/$iid/submit');
  @override
  Future<InitiativeDto> support(String iid) => _post('/initiatives/$iid/support');
  @override
  Future<InitiativeDto> approve(String iid) => _post('/initiatives/$iid/approve');
  @override
  Future<InitiativeDto> reject(String iid, {String? reason}) =>
      _post('/initiatives/$iid/reject', body: reason != null ? {'reason': reason} : null);
  @override
  Future<InitiativeDto> complete(String iid, {String? summary}) =>
      _post('/initiatives/$iid/complete', body: summary != null ? {'summary': summary} : null);

  @override
  Future<InitiativeDto> unsupport(String iid) async {
    try {
      final res = await _dio.delete<Map<String, dynamic>>('/initiatives/$iid/support');
      return InitiativeDto.fromJson(res.data!['data'] as Map<String, dynamic>);
    } catch (e) {
      throw ApiClient.mapError(e);
    }
  }

  @override
  Future<List<CommentDto>> listComments(String iid) async {
    try {
      final res = await _dio.get<Map<String, dynamic>>('/initiatives/$iid/comments');
      final list = res.data!['data'] as List;
      return list.map((j) => CommentDto.fromJson(j as Map<String, dynamic>)).toList();
    } catch (e) {
      throw ApiClient.mapError(e);
    }
  }

  @override
  Future<CommentDto> addComment(String iid, String body) async {
    try {
      final res = await _dio.post<Map<String, dynamic>>(
        '/initiatives/$iid/comments',
        data: {'body': body},
      );
      return CommentDto.fromJson(res.data!['data'] as Map<String, dynamic>);
    } catch (e) {
      throw ApiClient.mapError(e);
    }
  }

  Future<InitiativeDto> _post(String path, {Map<String, dynamic>? body}) async {
    try {
      final res = await _dio.post<Map<String, dynamic>>(path, data: body ?? const {});
      return InitiativeDto.fromJson(res.data!['data'] as Map<String, dynamic>);
    } catch (e) {
      throw ApiClient.mapError(e);
    }
  }
}
