import 'package:dio/dio.dart';

import '../../core/network/api_client.dart';
import '../models/initiative_dto.dart';

abstract class PostRepository {
  Future<List<PostDto>> list(String communityId);
  Future<PostDto> create(String communityId, {required String body, String? title, String type = 'discussion'});
  Future<List<CommentDto>> listComments(String pid);
  Future<CommentDto> addComment(String pid, String body);
}

class DioPostRepository implements PostRepository {
  DioPostRepository(this._client);
  final ApiClient _client;
  Dio get _dio => _client.dio;

  @override
  Future<List<PostDto>> list(String communityId) async {
    try {
      final res = await _dio.get<Map<String, dynamic>>('/communities/$communityId/posts');
      final list = res.data!['data'] as List;
      return list.map((j) => PostDto.fromJson(j as Map<String, dynamic>)).toList();
    } catch (e) {
      throw ApiClient.mapError(e);
    }
  }

  @override
  Future<PostDto> create(
    String communityId, {
    required String body,
    String? title,
    String type = 'discussion',
  }) async {
    try {
      final res = await _dio.post<Map<String, dynamic>>(
        '/communities/$communityId/posts',
        data: {'type': type, if (title != null) 'title': title, 'body': body},
      );
      return PostDto.fromJson(res.data!['data'] as Map<String, dynamic>);
    } catch (e) {
      throw ApiClient.mapError(e);
    }
  }

  @override
  Future<List<CommentDto>> listComments(String pid) async {
    try {
      final res = await _dio.get<Map<String, dynamic>>('/posts/$pid/comments');
      final list = res.data!['data'] as List;
      return list.map((j) => CommentDto.fromJson(j as Map<String, dynamic>)).toList();
    } catch (e) {
      throw ApiClient.mapError(e);
    }
  }

  @override
  Future<CommentDto> addComment(String pid, String body) async {
    try {
      final res = await _dio.post<Map<String, dynamic>>(
        '/posts/$pid/comments',
        data: {'body': body},
      );
      return CommentDto.fromJson(res.data!['data'] as Map<String, dynamic>);
    } catch (e) {
      throw ApiClient.mapError(e);
    }
  }
}
