import 'package:flutter_riverpod/flutter_riverpod.dart';

import '../../../../data/models/event_dto.dart';
import '../../../../data/repositories/event_repository.dart';
import '../../../auth/presentation/providers/auth_providers.dart';

final Provider<EventRepository> eventRepositoryProvider = Provider<EventRepository>((ref) {
  return DioEventRepository(ref.watch(apiClientProvider));
});

/// Time-bucket filter for EventsList SegmentedControl.
enum EventsBucket { upcoming, past, all }

/// Composite key for the events list family — communityId + bucket.
class EventsQuery {
  const EventsQuery({required this.communityId, this.bucket = EventsBucket.upcoming});
  final String communityId;
  final EventsBucket bucket;

  @override
  bool operator ==(Object other) =>
      other is EventsQuery && other.communityId == communityId && other.bucket == bucket;

  @override
  int get hashCode => Object.hash(communityId, bucket);
}

/// Paginated would come later; for C1 we hand the first page back as a list.
final eventsListProvider =
    FutureProvider.autoDispose.family<List<EventDto>, EventsQuery>((ref, query) async {
  final repo = ref.watch(eventRepositoryProvider);
  final now = DateTime.now();
  final filter = switch (query.bucket) {
    EventsBucket.upcoming => EventListFilter(status: 'published', from: now, limit: 50),
    EventsBucket.past => EventListFilter(to: now, limit: 50),
    EventsBucket.all => const EventListFilter(limit: 50),
  };
  final page = await repo.list(query.communityId, filter);
  return page.items;
});

final eventDetailProvider =
    FutureProvider.autoDispose.family<EventDto, String>((ref, eventId) async {
  final repo = ref.watch(eventRepositoryProvider);
  return repo.detail(eventId);
});

/// Imperative RSVP controller — screens call .rsvp / .cancel and route based on outcome.
class RsvpController {
  RsvpController(this._repo);
  final EventRepository _repo;

  Future<RsvpOutcome> rsvp(String eventId, {String? notes}) =>
      _repo.rsvp(eventId, notes: notes);

  Future<void> cancel(String eventId) => _repo.cancelRsvp(eventId);
}

final rsvpControllerProvider = Provider<RsvpController>((ref) {
  return RsvpController(ref.watch(eventRepositoryProvider));
});

/// Convenience: the first community the user belongs to. Used by HomeFeed +
/// EventsList until C2 ships a real CommunitySwitcher.
final activeCommunityIdProvider = Provider<String?>((ref) {
  final auth = ref.watch(authNotifierProvider);
  if (auth is! AuthAuthenticated || auth.memberships.isEmpty) return null;
  return auth.memberships.first.communityId;
});
