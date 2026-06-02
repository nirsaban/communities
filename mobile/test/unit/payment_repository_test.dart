import 'package:dio/dio.dart';
import 'package:flutter_test/flutter_test.dart';

import 'package:community_app/core/errors/api_error.dart';
import 'package:community_app/core/network/api_client.dart';
import 'package:community_app/core/network/token_store.dart';
import 'package:community_app/data/repositories/payment_repository.dart';

/// Minimal Dio adapter that returns canned responses keyed by request path.
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

ApiClient _buildClient(_FakeAdapter adapter) {
  final dio = Dio(BaseOptions(baseUrl: 'http://test.local/api/v1'));
  dio.httpClientAdapter = adapter;
  return ApiClient(
    tokenStore: InMemoryTokenStore(),
    onSessionInvalidated: () async {},
    refreshSession: (_) async => null,
    dio: dio,
  );
}

ResponseBody _json(int status, String body) {
  return ResponseBody.fromString(
    body,
    status,
    headers: {
      Headers.contentTypeHeader: ['application/json'],
    },
  );
}

void main() {
  group('DioPaymentRepository.startEventCheckout', () {
    test('returns sessionUrl on 200', () async {
      final adapter = _FakeAdapter((opts) {
        expect(opts.path, '/events/E1/checkout');
        expect(opts.method, 'POST');
        return _json(
          200,
          '{"data":{"sessionUrl":"https://stripe.test/checkout/abc","paymentId":"P1"}}',
        );
      });
      final repo = DioPaymentRepository(_buildClient(adapter));
      final result = await repo.startEventCheckout('E1');
      expect(result.sessionUrl, 'https://stripe.test/checkout/abc');
      expect(result.paymentId, 'P1');
    });

    test('throws unauthenticated ApiError on 401', () async {
      final adapter = _FakeAdapter((_) => _json(
            401,
            '{"error":{"code":"UNAUTHENTICATED","message":"Missing bearer token"}}',
          ));
      final repo = DioPaymentRepository(_buildClient(adapter));
      await expectLater(
        () => repo.startEventCheckout('E1'),
        throwsA(predicate((e) => e is ApiError && e.isUnauthenticated)),
      );
    });

    test('maps a 402 with checkoutUrl details into a CheckoutResultDto (RSVP path)', () async {
      final adapter = _FakeAdapter((_) => _json(
            402,
            '{"error":{"code":"PAYMENT_REQUIRED","message":"Checkout required for paid event",'
            '"details":{"checkoutUrl":"https://stripe.test/checkout/xyz","paymentId":"P9"}}}',
          ));
      final repo = DioPaymentRepository(_buildClient(adapter));
      final result = await repo.startEventCheckout('E2');
      expect(result.sessionUrl, 'https://stripe.test/checkout/xyz');
      expect(result.paymentId, 'P9');
    });

    test('throws internal-error ApiError on 500', () async {
      final adapter = _FakeAdapter((_) => _json(
            500,
            '{"error":{"code":"INTERNAL_ERROR","message":"boom"}}',
          ));
      final repo = DioPaymentRepository(_buildClient(adapter));
      await expectLater(
        () => repo.startEventCheckout('E3'),
        throwsA(predicate((e) => e is ApiError && e.code == 'INTERNAL_ERROR')),
      );
    });
  });

  group('DioPaymentRepository.listMySubscriptions', () {
    test('parses subscription DTOs on 200', () async {
      final adapter = _FakeAdapter((opts) {
        expect(opts.path, '/me/subscriptions');
        return _json(
          200,
          '{"data":[{"id":"S1","communityId":"C1","plan":"monthly","status":"active",'
          '"currentPeriodStart":"2026-06-01T00:00:00.000Z",'
          '"currentPeriodEnd":"2026-07-01T00:00:00.000Z","cancelAtPeriodEnd":false}]}',
        );
      });
      final repo = DioPaymentRepository(_buildClient(adapter));
      final subs = await repo.listMySubscriptions();
      expect(subs, hasLength(1));
      expect(subs.first.id, 'S1');
      expect(subs.first.plan, 'monthly');
      expect(subs.first.cancelAtPeriodEnd, isFalse);
    });

    test('throws on 401 (caller will log out)', () async {
      final adapter = _FakeAdapter((_) => _json(
            401,
            '{"error":{"code":"UNAUTHENTICATED","message":"Missing bearer token"}}',
          ));
      final repo = DioPaymentRepository(_buildClient(adapter));
      await expectLater(
        repo.listMySubscriptions,
        throwsA(predicate((e) => e is ApiError && e.isUnauthenticated)),
      );
    });
  });

  group('DioPaymentRepository.cancelSubscription', () {
    test('returns updated DTO on 200', () async {
      final adapter = _FakeAdapter((opts) {
        expect(opts.path, '/me/subscriptions/S1/cancel');
        expect(opts.method, 'POST');
        return _json(
          200,
          '{"data":{"id":"S1","communityId":"C1","plan":"monthly","status":"active",'
          '"currentPeriodStart":null,"currentPeriodEnd":null,"cancelAtPeriodEnd":true}}',
        );
      });
      final repo = DioPaymentRepository(_buildClient(adapter));
      final sub = await repo.cancelSubscription('S1');
      expect(sub.cancelAtPeriodEnd, isTrue);
    });
  });

  group('DioPaymentRepository.finances', () {
    test('parses snapshot on 200', () async {
      final adapter = _FakeAdapter((opts) {
        expect(opts.path, '/communities/C1/finances');
        return _json(
          200,
          '{"data":{"totalRevenueCents":5000,"revenueThisMonth":2500,"revenueThisWeek":1000,'
          '"activeSubscriptions":3,"revenueByEvent":[{"eventId":"E1","title":"Demo","revenueCents":2500,"paidCount":1}]}}',
        );
      });
      final repo = DioPaymentRepository(_buildClient(adapter));
      final snap = await repo.finances('C1');
      expect(snap.totalRevenueCents, 5000);
      expect(snap.activeSubscriptions, 3);
      expect(snap.revenueByEvent, hasLength(1));
      expect(snap.revenueByEvent.first.title, 'Demo');
    });

    test('throws unauthorized ApiError on 403 (sub-admin tried)', () async {
      final adapter = _FakeAdapter((_) => _json(
            403,
            '{"error":{"code":"UNAUTHORIZED","message":"Sub Admins cannot access financial data"}}',
          ));
      final repo = DioPaymentRepository(_buildClient(adapter));
      await expectLater(
        () => repo.finances('C1'),
        throwsA(predicate((e) => e is ApiError && e.isUnauthorized)),
      );
    });

    test('throws on 500', () async {
      final adapter = _FakeAdapter((_) => _json(
            500,
            '{"error":{"code":"INTERNAL_ERROR","message":"boom"}}',
          ));
      final repo = DioPaymentRepository(_buildClient(adapter));
      await expectLater(
        () => repo.finances('C1'),
        throwsA(predicate((e) => e is ApiError && e.code == 'INTERNAL_ERROR')),
      );
    });
  });
}
