import 'package:flutter_riverpod/flutter_riverpod.dart';

import '../../../../data/models/admin_dto.dart';
import '../../../../data/repositories/admin_repository.dart';
import '../../../auth/presentation/providers/auth_providers.dart';

final Provider<AdminRepository> adminRepositoryProvider =
    Provider<AdminRepository>((ref) => AdminRepository(ref.watch(apiClientProvider)));

final adminOverviewProvider =
    FutureProvider.autoDispose.family<AdminOverviewDto, String>(
        (ref, cid) async => ref.watch(adminRepositoryProvider).overview(cid));

final attendanceAnalyticsProvider =
    FutureProvider.autoDispose.family<AttendanceAnalyticsDto, String>(
        (ref, cid) async => ref.watch(adminRepositoryProvider).attendance(cid));

final growthAnalyticsProvider =
    FutureProvider.autoDispose.family<GrowthAnalyticsDto, String>(
        (ref, cid) async => ref.watch(adminRepositoryProvider).growth(cid));

final mostActiveProvider =
    FutureProvider.autoDispose.family<List<LeaderRow>, String>(
        (ref, cid) async => ref.watch(adminRepositoryProvider).mostActive(cid));

final pendingMembersProvider =
    FutureProvider.autoDispose.family<List<PendingMemberRow>, String>(
        (ref, cid) async => ref.watch(adminRepositoryProvider).pendingMembers(cid));

class MemberDetailKey {
  const MemberDetailKey({required this.cid, required this.uid});
  final String cid;
  final String uid;
  @override
  bool operator ==(Object other) =>
      other is MemberDetailKey && other.cid == cid && other.uid == uid;
  @override
  int get hashCode => Object.hash(cid, uid);
}

final memberDetailProvider =
    FutureProvider.autoDispose.family<MemberDetailDto, MemberDetailKey>(
        (ref, k) async => ref.watch(adminRepositoryProvider).memberDetail(k.cid, k.uid));

final moderationQueueProvider =
    FutureProvider.autoDispose.family<List<ModerationItemDto>, String>(
        (ref, cid) async => ref.watch(adminRepositoryProvider).moderationQueue(cid));

final communitySubscriptionsProvider =
    FutureProvider.autoDispose.family<List<Map<String, dynamic>>, String>(
        (ref, cid) async => ref.watch(adminRepositoryProvider).communitySubscriptions(cid));

final eventPaymentsProvider =
    FutureProvider.autoDispose.family<List<Map<String, dynamic>>, String>(
        (ref, eid) async => ref.watch(adminRepositoryProvider).listEventPayments(eid));
