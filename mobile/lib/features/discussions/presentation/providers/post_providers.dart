import 'package:flutter_riverpod/flutter_riverpod.dart';

import '../../../../data/models/initiative_dto.dart';
import '../../../../data/repositories/post_repository.dart';
import '../../../auth/presentation/providers/auth_providers.dart';

final Provider<PostRepository> postRepositoryProvider = Provider<PostRepository>((ref) {
  return DioPostRepository(ref.watch(apiClientProvider));
});

final FutureProviderFamily<List<PostDto>, String> postsProvider =
    FutureProvider.family<List<PostDto>, String>((ref, communityId) async {
  return ref.watch(postRepositoryProvider).list(communityId);
});

final FutureProviderFamily<List<CommentDto>, String> postCommentsProvider =
    FutureProvider.family<List<CommentDto>, String>((ref, pid) async {
  return ref.watch(postRepositoryProvider).listComments(pid);
});
