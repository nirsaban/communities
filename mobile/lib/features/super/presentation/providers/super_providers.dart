import 'package:flutter_riverpod/flutter_riverpod.dart';

import '../../../../data/repositories/super_repository.dart';
import '../../../auth/presentation/providers/auth_providers.dart';

final Provider<SuperRepository> superRepositoryProvider =
    Provider<SuperRepository>((ref) => SuperRepository(ref.watch(apiClientProvider)));

final superStatsProvider =
    FutureProvider.autoDispose<Map<String, dynamic>>((ref) async {
  return ref.watch(superRepositoryProvider).stats();
});

class SuperUserQuery {
  const SuperUserQuery({this.search = '', this.status});
  final String search;
  final String? status;
  @override
  bool operator ==(Object other) =>
      other is SuperUserQuery && other.search == search && other.status == status;
  @override
  int get hashCode => Object.hash(search, status);
}

final superUsersProvider =
    FutureProvider.autoDispose.family<List<Map<String, dynamic>>, SuperUserQuery>(
        (ref, q) async => ref.watch(superRepositoryProvider).listUsers(query: q.search, status: q.status));

final superCommunitiesProvider =
    FutureProvider.autoDispose.family<List<Map<String, dynamic>>, String?>(
        (ref, status) async => ref.watch(superRepositoryProvider).listCommunities(status: status));

final superCommunityDetailProvider =
    FutureProvider.autoDispose.family<Map<String, dynamic>, String>(
        (ref, cid) async => ref.watch(superRepositoryProvider).communityDetail(cid));

final superUserDetailProvider =
    FutureProvider.autoDispose.family<Map<String, dynamic>, String>(
        (ref, uid) async => ref.watch(superRepositoryProvider).userDetail(uid));

final superSettingsProvider =
    FutureProvider.autoDispose<Map<String, dynamic>>((ref) async {
  return ref.watch(superRepositoryProvider).getSettings();
});
