// DTOs that mirror the backend payment / subscription / finances envelopes.

class CheckoutResultDto {
  CheckoutResultDto({required this.sessionUrl, required this.paymentId});
  final String sessionUrl;
  final String paymentId;

  factory CheckoutResultDto.fromJson(Map<String, dynamic> json) {
    return CheckoutResultDto(
      sessionUrl: json['sessionUrl'] as String,
      paymentId: (json['paymentId'] as String?) ?? '',
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
