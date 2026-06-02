import 'package:flutter_riverpod/flutter_riverpod.dart';

import '../../../../data/models/community_dto.dart';
import '../../../../data/repositories/community_repository.dart';
import '../../../../data/repositories/me_repository.dart';
import '../../../auth/presentation/providers/auth_providers.dart';

final Provider<CommunityRepository> communityRepositoryProvider = Provider<CommunityRepository>(
  (ref) => DioCommunityRepository(ref.watch(apiClientProvider)),
);

final Provider<MeRepository> meRepositoryProvider = Provider<MeRepository>(
  (ref) => DioMeRepository(ref.watch(apiClientProvider)),
);

final myCommunitiesProvider =
    FutureProvider.autoDispose<List<MyCommunityEntry>>((ref) async {
  return ref.watch(communityRepositoryProvider).myCommunities();
});

final communityDetailProvider =
    FutureProvider.autoDispose.family<CommunityDto, String>((ref, cid) async {
  return ref.watch(communityRepositoryProvider).detail(cid);
});

class DiscoveryQuery {
  const DiscoveryQuery({this.search = ''});
  final String search;

  @override
  bool operator ==(Object other) => other is DiscoveryQuery && other.search == search;

  @override
  int get hashCode => search.hashCode;
}

final discoveryProvider =
    FutureProvider.autoDispose.family<List<CommunityDto>, DiscoveryQuery>((ref, q) async {
  return ref.watch(communityRepositoryProvider).discover(query: q.search.isEmpty ? null : q.search);
});

class MyRsvpsQuery {
  const MyRsvpsQuery({this.bucket = 'upcoming'});
  final String bucket;

  @override
  bool operator ==(Object other) => other is MyRsvpsQuery && other.bucket == bucket;
  @override
  int get hashCode => bucket.hashCode;
}

final myRsvpsProvider =
    FutureProvider.autoDispose.family<List<MyRsvpEntry>, MyRsvpsQuery>((ref, q) async {
  return ref.watch(meRepositoryProvider).rsvps(bucket: q.bucket);
});
