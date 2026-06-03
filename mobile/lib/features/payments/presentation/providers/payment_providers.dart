import 'dart:async';

import 'package:flutter/foundation.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:url_launcher/url_launcher.dart';

import '../../../../data/models/payment_dto.dart';
import '../../../../data/repositories/payment_repository.dart';
import '../../../auth/presentation/providers/auth_providers.dart';

final Provider<PaymentRepository> paymentRepositoryProvider =
    Provider<PaymentRepository>((ref) {
  return DioPaymentRepository(ref.watch(apiClientProvider));
});

/// Wraps a checkout-session creation + opening the URL in the system browser.
/// Returns true on success (URL opened), false on failure.
typedef LaunchUrl = Future<bool> Function(Uri uri);

final Provider<LaunchUrl> urlLauncherProvider = Provider<LaunchUrl>((_) {
  return (uri) => launchUrl(uri, mode: LaunchMode.externalApplication);
});

/// Result of the poll loop. `confirmed` means PayPlus webhook flipped the
/// Payment to succeeded; `failed` means the webhook reported a failure;
/// `timeout` means the 60s poll window elapsed without a verdict.
enum CheckoutOutcome { confirmed, failed, timeout, cancelled }

class CheckoutState {
  const CheckoutState({
    this.isLoading = false,
    this.isPolling = false,
    this.errorMessage,
    this.lastPaymentUrl,
    this.lastPaymentId,
    this.outcome,
  });
  final bool isLoading;
  final bool isPolling;
  final String? errorMessage;
  final String? lastPaymentUrl;
  final String? lastPaymentId;
  final CheckoutOutcome? outcome;

  CheckoutState copyWith({
    bool? isLoading,
    bool? isPolling,
    String? errorMessage,
    String? lastPaymentUrl,
    String? lastPaymentId,
    CheckoutOutcome? outcome,
  }) {
    return CheckoutState(
      isLoading: isLoading ?? this.isLoading,
      isPolling: isPolling ?? this.isPolling,
      errorMessage: errorMessage,
      lastPaymentUrl: lastPaymentUrl ?? this.lastPaymentUrl,
      lastPaymentId: lastPaymentId ?? this.lastPaymentId,
      outcome: outcome,
    );
  }
}

class CheckoutNotifier extends StateNotifier<CheckoutState> {
  CheckoutNotifier({required this.repo, required this.launcher})
      : super(const CheckoutState());

  final PaymentRepository repo;
  final LaunchUrl launcher;

  // Tunables. Spec: poll every 2s up to 60s.
  static const Duration pollInterval = Duration(seconds: 2);
  static const Duration pollTimeout = Duration(seconds: 60);

  /// Kick off an event checkout: create the PayPlus page, launch its URL in the
  /// system browser, then poll our /payments/success endpoint until the webhook
  /// resolves the Payment.
  Future<CheckoutOutcome> payForEvent(String eventId) async {
    state = state.copyWith(isLoading: true, errorMessage: null, outcome: null);
    try {
      final result = await repo.startEventCheckout(eventId);
      final opened = await launcher(Uri.parse(result.paymentUrl));
      state = state.copyWith(
        isLoading: false,
        lastPaymentUrl: result.paymentUrl,
        lastPaymentId: result.paymentId,
      );
      if (!opened) {
        state = state.copyWith(outcome: CheckoutOutcome.failed);
        return CheckoutOutcome.failed;
      }
      return _pollUntilTerminal(result.paymentId);
    } catch (e) {
      state = state.copyWith(
        isLoading: false,
        errorMessage: e.toString(),
        outcome: CheckoutOutcome.failed,
      );
      return CheckoutOutcome.failed;
    }
  }

  Future<CheckoutOutcome> subscribe(String communityId, {String plan = 'monthly'}) async {
    state = state.copyWith(isLoading: true, errorMessage: null, outcome: null);
    try {
      final result = await repo.startSubscriptionCheckout(communityId, plan: plan);
      final opened = await launcher(Uri.parse(result.paymentUrl));
      state = state.copyWith(
        isLoading: false,
        lastPaymentUrl: result.paymentUrl,
        lastPaymentId: result.paymentId,
      );
      if (!opened) {
        state = state.copyWith(outcome: CheckoutOutcome.failed);
        return CheckoutOutcome.failed;
      }
      return _pollUntilTerminal(result.paymentId);
    } catch (e) {
      state = state.copyWith(
        isLoading: false,
        errorMessage: e.toString(),
        outcome: CheckoutOutcome.failed,
      );
      return CheckoutOutcome.failed;
    }
  }

  Future<CheckoutOutcome> _pollUntilTerminal(String paymentId) async {
    if (paymentId.isEmpty) return CheckoutOutcome.timeout;
    state = state.copyWith(isPolling: true);
    final deadline = DateTime.now().add(pollTimeout);
    while (DateTime.now().isBefore(deadline)) {
      await Future<void>.delayed(pollInterval);
      try {
        final status = await repo.getPaymentStatus(paymentId);
        if (status.status == 'succeeded') {
          state = state.copyWith(isPolling: false, outcome: CheckoutOutcome.confirmed);
          return CheckoutOutcome.confirmed;
        }
        if (status.status == 'failed') {
          state = state.copyWith(isPolling: false, outcome: CheckoutOutcome.failed);
          return CheckoutOutcome.failed;
        }
      } catch (_) {
        // Transient — keep polling until the deadline.
      }
    }
    state = state.copyWith(isPolling: false, outcome: CheckoutOutcome.timeout);
    return CheckoutOutcome.timeout;
  }
}

final StateNotifierProvider<CheckoutNotifier, CheckoutState> checkoutProvider =
    StateNotifierProvider<CheckoutNotifier, CheckoutState>((ref) {
  return CheckoutNotifier(
    repo: ref.watch(paymentRepositoryProvider),
    launcher: ref.watch(urlLauncherProvider),
  );
});

/// Pulls the user's active subscriptions; auto-refetches on auth state change.
final FutureProvider<List<SubscriptionDto>> mySubscriptionsProvider =
    FutureProvider<List<SubscriptionDto>>((ref) async {
  // Only sensible when authenticated; return empty otherwise so the UI can render.
  final auth = ref.watch(authNotifierProvider);
  if (auth is! AuthAuthenticated) return const <SubscriptionDto>[];
  return ref.watch(paymentRepositoryProvider).listMySubscriptions();
});

/// Financial dashboard for a given community (admin only). Tuple of community id
/// + Riverpod's family pattern to allow per-community caching.
final FutureProviderFamily<FinancialSnapshotDto, String> financesProvider =
    FutureProvider.family<FinancialSnapshotDto, String>((ref, communityId) async {
  return ref.watch(paymentRepositoryProvider).finances(communityId);
});

// Re-export for places that want the platform-agnostic launcher signature.
@visibleForTesting
LaunchUrl testNoopLauncher() => (Uri _) async => true;
