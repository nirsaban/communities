import 'package:flutter_riverpod/flutter_riverpod.dart';

import '../../../../data/models/event_dto.dart';
import '../../../../data/models/event_qa_dto.dart';
import '../../../../data/repositories/event_manager_repository.dart';
import '../../../auth/presentation/providers/auth_providers.dart';

final Provider<EventManagerRepository> eventManagerRepoProvider =
    Provider<EventManagerRepository>(
  (ref) => EventManagerRepository(ref.watch(apiClientProvider)),
);

class ManagedEventsQuery {
  const ManagedEventsQuery({this.bucket = 'upcoming'});
  final String bucket;

  @override
  bool operator ==(Object other) =>
      other is ManagedEventsQuery && other.bucket == bucket;
  @override
  int get hashCode => bucket.hashCode;
}

final managedEventsProvider =
    FutureProvider.autoDispose.family<List<EventDto>, ManagedEventsQuery>(
        (ref, q) async {
  return ref.watch(eventManagerRepoProvider).listManagedEvents(bucket: q.bucket);
});

final eventQaProvider =
    FutureProvider.autoDispose.family<List<EventQaDto>, String>((ref, eid) async {
  return ref.watch(eventManagerRepoProvider).listQa(eid);
});

final eventRsvpsProvider =
    FutureProvider.autoDispose.family<List<Map<String, dynamic>>, String>(
        (ref, eid) async {
  return ref.watch(eventManagerRepoProvider).listEventRsvps(eid);
});

final eventMaterialsProvider =
    FutureProvider.autoDispose.family<List<EventMaterialDto>, String>(
        (ref, eid) async {
  return ref.watch(eventManagerRepoProvider).listMaterials(eid);
});
