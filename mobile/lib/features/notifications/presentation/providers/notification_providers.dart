import 'package:flutter_riverpod/flutter_riverpod.dart';

import '../../../../data/models/notification_dto.dart';
import '../../../../data/repositories/notification_repository.dart';
import '../../../auth/presentation/providers/auth_providers.dart';

final Provider<NotificationRepository> notificationRepositoryProvider =
    Provider<NotificationRepository>(
  (ref) => DioNotificationRepository(ref.watch(apiClientProvider)),
);

/// First page of notifications. Pagination ships when Inbox needs > 50 entries.
final inboxProvider = FutureProvider.autoDispose<List<NotificationDto>>((ref) async {
  final repo = ref.watch(notificationRepositoryProvider);
  final page = await repo.list(limit: 50);
  return page.items;
});

final notificationPreferencesProvider =
    FutureProvider.autoDispose<NotificationPreferencesDto>((ref) async {
  final repo = ref.watch(notificationRepositoryProvider);
  return repo.getPreferences();
});

/// Imperative actions surfaced to screens. Screens invalidate inboxProvider
/// themselves after mutations so list reorders are visible.
class NotificationsController {
  NotificationsController(this._repo);
  final NotificationRepository _repo;

  Future<void> markRead(String id) => _repo.markRead(id);
  Future<int> markAllRead() => _repo.markAllRead();
  Future<NotificationPreferencesDto> updatePreferences(NotificationPreferencesDto prefs) =>
      _repo.updatePreferences(prefs);
}

final notificationsControllerProvider = Provider<NotificationsController>(
  (ref) => NotificationsController(ref.watch(notificationRepositoryProvider)),
);
