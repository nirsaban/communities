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

class CheckoutState {
  const CheckoutState({
    this.isLoading = false,
    this.errorMessage,
    this.lastSessionUrl,
  });
  final bool isLoading;
  final String? errorMessage;
  final String? lastSessionUrl;

  CheckoutState copyWith({bool? isLoading, String? errorMessage, String? lastSessionUrl}) {
    return CheckoutState(
      isLoading: isLoading ?? this.isLoading,
      errorMessage: errorMessage,
      lastSessionUrl: lastSessionUrl ?? this.lastSessionUrl,
    );
  }
}

class CheckoutNotifier extends StateNotifier<CheckoutState> {
  CheckoutNotifier({required this.repo, required this.launcher}) : super(const CheckoutState());

  final PaymentRepository repo;
  final LaunchUrl launcher;

  /// Kick off an event checkout: create the Stripe session, launch its URL.
  Future<bool> payForEvent(String eventId) async {
    state = state.copyWith(isLoading: true, errorMessage: null);
    try {
      final result = await repo.startEventCheckout(eventId);
      final opened = await launcher(Uri.parse(result.sessionUrl));
      state = state.copyWith(isLoading: false, lastSessionUrl: result.sessionUrl);
      return opened;
    } catch (e) {
      state = state.copyWith(isLoading: false, errorMessage: e.toString());
      return false;
    }
  }

  Future<bool> subscribe(String communityId, {String plan = 'monthly'}) async {
    state = state.copyWith(isLoading: true, errorMessage: null);
    try {
      final result = await repo.startSubscriptionCheckout(communityId, plan: plan);
      final opened = await launcher(Uri.parse(result.sessionUrl));
      state = state.copyWith(isLoading: false, lastSessionUrl: result.sessionUrl);
      return opened;
    } catch (e) {
      state = state.copyWith(isLoading: false, errorMessage: e.toString());
      return false;
    }
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
