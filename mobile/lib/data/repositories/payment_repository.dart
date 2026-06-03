import 'package:dio/dio.dart';

import '../../core/network/api_client.dart';
import '../models/payment_dto.dart';

abstract class PaymentRepository {
  /// Create a PayPlus hosted-page checkout for a paid event.
  /// Returns the hosted page URL + the Payment id we use to poll status.
  Future<CheckoutResultDto> startEventCheckout(String eventId);

  /// Create a PayPlus recurring program for a community subscription.
  Future<CheckoutResultDto> startSubscriptionCheckout(
    String communityId, {
    String plan = 'monthly',
  });

  /// List the caller's active subscriptions.
  Future<List<SubscriptionDto>> listMySubscriptions();

  /// Cancel a subscription (sets cancelAtPeriodEnd=true; PayPlus recurring is cancelled).
  Future<SubscriptionDto> cancelSubscription(String subscriptionId);

  /// Admin-only — fetch the community financial dashboard.
  Future<FinancialSnapshotDto> finances(String communityId);

  /// Poll target for the mobile checkout screen — no auth, rate-limited 10/min/IP.
  Future<PaymentStatusDto> getPaymentStatus(String paymentId);
}

class DioPaymentRepository implements PaymentRepository {
  DioPaymentRepository(this._client);
  final ApiClient _client;
  Dio get _dio => _client.dio;

  @override
  Future<CheckoutResultDto> startEventCheckout(String eventId) async {
    try {
      final res = await _dio.post<Map<String, dynamic>>('/events/$eventId/checkout');
      return CheckoutResultDto.fromJson(res.data!['data'] as Map<String, dynamic>);
    } catch (e) {
      // 402 from /rsvp also bundles a checkoutUrl in details — extract it for callers
      // that go through the RSVP path instead of /checkout.
      if (e is DioException) {
        final body = e.response?.data;
        if (body is Map<String, dynamic> && body['error'] is Map) {
          final err = body['error'] as Map;
          final details = err['details'];
          if (e.response?.statusCode == 402 &&
              details is Map &&
              details['checkoutUrl'] is String) {
            return CheckoutResultDto(
              paymentUrl: details['checkoutUrl'] as String,
              paymentId: (details['paymentId'] as String?) ?? '',
            );
          }
        }
      }
      throw ApiClient.mapError(e);
    }
  }

  @override
  Future<CheckoutResultDto> startSubscriptionCheckout(
    String communityId, {
    String plan = 'monthly',
  }) async {
    try {
      final res = await _dio.post<Map<String, dynamic>>(
        '/communities/$communityId/subscribe',
        data: {'plan': plan},
      );
      return CheckoutResultDto.fromJson(res.data!['data'] as Map<String, dynamic>);
    } catch (e) {
      throw ApiClient.mapError(e);
    }
  }

  @override
  Future<List<SubscriptionDto>> listMySubscriptions() async {
    try {
      final res = await _dio.get<Map<String, dynamic>>('/me/subscriptions');
      final list = res.data!['data'] as List;
      return list.map((j) => SubscriptionDto.fromJson(j as Map<String, dynamic>)).toList();
    } catch (e) {
      throw ApiClient.mapError(e);
    }
  }

  @override
  Future<SubscriptionDto> cancelSubscription(String subscriptionId) async {
    try {
      final res = await _dio.post<Map<String, dynamic>>(
        '/me/subscriptions/$subscriptionId/cancel',
      );
      return SubscriptionDto.fromJson(res.data!['data'] as Map<String, dynamic>);
    } catch (e) {
      throw ApiClient.mapError(e);
    }
  }

  @override
  Future<FinancialSnapshotDto> finances(String communityId) async {
    try {
      final res = await _dio.get<Map<String, dynamic>>(
        '/communities/$communityId/finances',
      );
      return FinancialSnapshotDto.fromJson(res.data!['data'] as Map<String, dynamic>);
    } catch (e) {
      throw ApiClient.mapError(e);
    }
  }

  @override
  Future<PaymentStatusDto> getPaymentStatus(String paymentId) async {
    try {
      final res = await _dio.get<Map<String, dynamic>>(
        '/payments/success',
        queryParameters: {'ref': paymentId},
      );
      return PaymentStatusDto.fromJson(res.data!['data'] as Map<String, dynamic>);
    } catch (e) {
      throw ApiClient.mapError(e);
    }
  }
}
