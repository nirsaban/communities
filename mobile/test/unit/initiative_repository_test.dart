import 'package:dio/dio.dart';
import 'package:flutter_test/flutter_test.dart';

import 'package:community_app/core/errors/api_error.dart';
import 'package:community_app/core/network/api_client.dart';
import 'package:community_app/core/network/token_store.dart';
import 'package:community_app/data/repositories/initiative_repository.dart';

class _FakeAdapter implements HttpClientAdapter {
  _FakeAdapter(this.responder);
  final ResponseBody Function(RequestOptions opts) responder;
  @override
  void close({bool force = false}) {}
  @override
  Future<ResponseBody> fetch(
    RequestOptions options,
    Stream<List<int>>? requestStream,
    Future<void>? cancelFuture,
  ) async {
    return responder(options);
  }
}

ApiClient _client(_FakeAdapter adapter) {
  final dio = Dio(BaseOptions(baseUrl: 'http://test.local/api/v1'));
  dio.httpClientAdapter = adapter;
  return ApiClient(
    tokenStore: InMemoryTokenStore(),
    onSessionInvalidated: () async {},
    refreshSession: (_) async => null,
    dio: dio,
  );
}

ResponseBody _json(int status, String body) => ResponseBody.fromString(
      body,
      status,
      headers: {
        Headers.contentTypeHeader: ['application/json'],
      },
    );

void main() {
  group('DioInitiativeRepository', () {
    test('list parses initiatives on 200', () async {
      final adapter = _FakeAdapter((opts) {
        expect(opts.path, '/communities/C1/initiatives');
        return _json(
          200,
          '{"data":[{"id":"I1","communityId":"C1","authorId":"U1","title":"Try X","description":"",'
          '"category":"social","status":"approved","supporterCount":2,"commentCount":0,'
          '"contributorIds":[],"createdAt":"2026-06-01T00:00:00.000Z","updatedAt":"2026-06-01T00:00:00.000Z",'
          '"viewer":{"isSupporting":false,"isContributor":false}}]}',
        );
      });
      final repo = DioInitiativeRepository(_client(adapter));
      final items = await repo.list('C1');
      expect(items, hasLength(1));
      expect(items.first.title, 'Try X');
      expect(items.first.supporterCount, 2);
      expect(items.first.isSupporting, isFalse);
    });

    test('list throws unauthenticated on 401', () async {
      final adapter = _FakeAdapter((_) => _json(
            401,
            '{"error":{"code":"UNAUTHENTICATED","message":"Missing bearer token"}}',
          ));
      final repo = DioInitiativeRepository(_client(adapter));
      await expectLater(
        () => repo.list('C1'),
        throwsA(predicate((e) => e is ApiError && e.isUnauthenticated)),
      );
    });

    test('support hits the right endpoint', () async {
      final adapter = _FakeAdapter((opts) {
        expect(opts.path, '/initiatives/I1/support');
        expect(opts.method, 'POST');
        return _json(
          200,
          '{"data":{"id":"I1","communityId":"C1","authorId":"U1","title":"Try X","description":"",'
          '"category":"social","status":"active","supporterCount":3,"commentCount":0,'
          '"contributorIds":[],"createdAt":"2026-06-01T00:00:00.000Z","updatedAt":"2026-06-01T00:00:00.000Z",'
          '"viewer":{"isSupporting":true,"isContributor":false}}}',
        );
      });
      final repo = DioInitiativeRepository(_client(adapter));
      final updated = await repo.support('I1');
      expect(updated.supporterCount, 3);
      expect(updated.isSupporting, isTrue);
    });

    test('get on a draft returns 404 for non-author', () async {
      final adapter = _FakeAdapter((_) => _json(
            404,
            '{"error":{"code":"NOT_FOUND","message":"Initiative not found"}}',
          ));
      final repo = DioInitiativeRepository(_client(adapter));
      await expectLater(
        () => repo.get('I-private'),
        throwsA(predicate((e) => e is ApiError && e.isNotFound)),
      );
    });
  });
}
