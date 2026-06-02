import 'package:flutter_riverpod/flutter_riverpod.dart';

import '../../../../data/models/initiative_dto.dart';
import '../../../../data/repositories/initiative_repository.dart';
import '../../../auth/presentation/providers/auth_providers.dart';

final Provider<InitiativeRepository> initiativeRepositoryProvider =
    Provider<InitiativeRepository>((ref) {
  return DioInitiativeRepository(ref.watch(apiClientProvider));
});

// Per-community list of initiatives, refetched on invalidate.
final FutureProviderFamily<List<InitiativeDto>, String> initiativesProvider =
    FutureProvider.family<List<InitiativeDto>, String>((ref, communityId) async {
  return ref.watch(initiativeRepositoryProvider).list(communityId);
});

final FutureProviderFamily<InitiativeDto, String> initiativeDetailProvider =
    FutureProvider.family<InitiativeDto, String>((ref, iid) async {
  return ref.watch(initiativeRepositoryProvider).get(iid);
});

final FutureProviderFamily<List<CommentDto>, String> initiativeCommentsProvider =
    FutureProvider.family<List<CommentDto>, String>((ref, iid) async {
  return ref.watch(initiativeRepositoryProvider).listComments(iid);
});
