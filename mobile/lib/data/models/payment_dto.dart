// DTOs that mirror the backend payment / subscription / finances envelopes.

/// Result of POSTing /events/:eid/checkout or /communities/:cid/subscribe.
/// [paymentUrl] is the hosted PayPlus page; mobile launches it in the
/// system browser and polls /api/v1/payments/success?ref=<paymentId>.
class CheckoutResultDto {
  CheckoutResultDto({required this.paymentUrl, required this.paymentId});
  final String paymentUrl;
  final String paymentId;

  factory CheckoutResultDto.fromJson(Map<String, dynamic> json) {
    return CheckoutResultDto(
      paymentUrl: json['paymentUrl'] as String,
      paymentId: (json['paymentId'] as String?) ??
          (json['subscriptionId'] as String?) ??
          '',
    );
  }
}

/// Polled by the checkout screen after the user returns from PayPlus.
/// Mirror of GET /api/v1/payments/success?ref=<paymentId>.
class PaymentStatusDto {
  PaymentStatusDto({
    required this.status,
    required this.paymentId,
    this.amountCents,
    this.currency,
    this.installments,
  });

  /// One of 'pending' | 'succeeded' | 'failed' | 'refunded' | 'partial_refund' | 'unknown'.
  final String status;
  final String? paymentId;
  final int? amountCents;
  final String? currency;
  final int? installments;

  bool get isTerminal =>
      status == 'succeeded' || status == 'failed' || status == 'refunded';

  factory PaymentStatusDto.fromJson(Map<String, dynamic> json) {
    return PaymentStatusDto(
      status: (json['status'] as String?) ?? 'unknown',
      paymentId: json['paymentId'] as String?,
      amountCents: (json['amountCents'] as num?)?.toInt(),
      currency: json['currency'] as String?,
      installments: (json['installments'] as num?)?.toInt(),
    );
  }
}

class SubscriptionDto {
  SubscriptionDto({
    required this.id,
    required this.communityId,
    required this.plan,
    required this.status,
    this.currentPeriodStart,
    this.currentPeriodEnd,
    required this.cancelAtPeriodEnd,
  });

  final String id;
  final String communityId;
  final String plan;
  final String status;
  final DateTime? currentPeriodStart;
  final DateTime? currentPeriodEnd;
  final bool cancelAtPeriodEnd;

  factory SubscriptionDto.fromJson(Map<String, dynamic> json) {
    DateTime? parse(Object? v) =>
        v is String && v.isNotEmpty ? DateTime.parse(v) : null;
    return SubscriptionDto(
      id: json['id'] as String,
      communityId: json['communityId'] as String,
      plan: json['plan'] as String,
      status: json['status'] as String,
      currentPeriodStart: parse(json['currentPeriodStart']),
      currentPeriodEnd: parse(json['currentPeriodEnd']),
      cancelAtPeriodEnd: (json['cancelAtPeriodEnd'] as bool?) ?? false,
    );
  }
}

class RevenueByEventEntry {
  RevenueByEventEntry({
    required this.eventId,
    required this.title,
    required this.revenueCents,
    required this.paidCount,
  });
  final String eventId;
  final String title;
  final int revenueCents;
  final int paidCount;

  factory RevenueByEventEntry.fromJson(Map<String, dynamic> json) {
    return RevenueByEventEntry(
      eventId: json['eventId'] as String,
      title: (json['title'] as String?) ?? '',
      revenueCents: (json['revenueCents'] as num).toInt(),
      paidCount: (json['paidCount'] as num).toInt(),
    );
  }
}

class FinancialSnapshotDto {
  FinancialSnapshotDto({
    required this.totalRevenueCents,
    required this.revenueThisMonth,
    required this.revenueThisWeek,
    required this.activeSubscriptions,
    required this.revenueByEvent,
  });
  final int totalRevenueCents;
  final int revenueThisMonth;
  final int revenueThisWeek;
  final int activeSubscriptions;
  final List<RevenueByEventEntry> revenueByEvent;

  factory FinancialSnapshotDto.fromJson(Map<String, dynamic> json) {
    return FinancialSnapshotDto(
      totalRevenueCents: (json['totalRevenueCents'] as num).toInt(),
      revenueThisMonth: (json['revenueThisMonth'] as num).toInt(),
      revenueThisWeek: (json['revenueThisWeek'] as num).toInt(),
      activeSubscriptions: (json['activeSubscriptions'] as num).toInt(),
      revenueByEvent: (json['revenueByEvent'] as List)
          .map((e) => RevenueByEventEntry.fromJson(e as Map<String, dynamic>))
          .toList(),
    );
  }
}
