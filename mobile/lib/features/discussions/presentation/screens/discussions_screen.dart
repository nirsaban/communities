import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';

import '../../../../core/i18n/strings.dart';
import '../providers/post_providers.dart';

class DiscussionsScreen extends ConsumerStatefulWidget {
  const DiscussionsScreen({super.key, required this.communityId});
  final String communityId;

  @override
  ConsumerState<DiscussionsScreen> createState() => _DiscussionsScreenState();
}

class _DiscussionsScreenState extends ConsumerState<DiscussionsScreen> {
  final _bodyCtrl = TextEditingController();
  bool _posting = false;

  @override
  void dispose() {
    _bodyCtrl.dispose();
    super.dispose();
  }

  Future<void> _newPost() async {
    final body = _bodyCtrl.text.trim();
    if (body.isEmpty) return;
    setState(() => _posting = true);
    try {
      await ref.read(postRepositoryProvider).create(widget.communityId, body: body);
      _bodyCtrl.clear();
      ref.invalidate(postsProvider(widget.communityId));
      if (mounted) {
        ScaffoldMessenger.of(context).showSnackBar(const SnackBar(content: Text(S.postCreated)));
      }
    } catch (e) {
      if (mounted) {
        ScaffoldMessenger.of(context).showSnackBar(SnackBar(content: Text(e.toString())));
      }
    } finally {
      if (mounted) setState(() => _posting = false);
    }
  }

  @override
  Widget build(BuildContext context) {
    final async = ref.watch(postsProvider(widget.communityId));
    return Scaffold(
      appBar: AppBar(title: const Text(S.discussions)),
      body: SafeArea(
        child: Column(
          children: [
            Expanded(
              child: RefreshIndicator(
                onRefresh: () async => ref.invalidate(postsProvider(widget.communityId)),
                child: async.when(
                  loading: () => const Center(child: CircularProgressIndicator()),
                  error: (e, _) => ListView(children: [
                    Padding(
                      padding: const EdgeInsets.all(24),
                      child: Text(e.toString(),
                          style: TextStyle(color: Theme.of(context).colorScheme.error)),
                    ),
                  ]),
                  data: (items) {
                    if (items.isEmpty) {
                      return ListView(
                        children: const [
                          Padding(
                            padding: EdgeInsets.all(24),
                            child: Text(S.noPosts, textAlign: TextAlign.center),
                          ),
                        ],
                      );
                    }
                    return ListView.separated(
                      padding: const EdgeInsets.all(16),
                      itemCount: items.length,
                      separatorBuilder: (_, __) => const SizedBox(height: 12),
                      itemBuilder: (_, i) {
                        final p = items[i];
                        return Card(
                          child: Padding(
                            padding: const EdgeInsets.all(16),
                            child: Column(
                              crossAxisAlignment: CrossAxisAlignment.stretch,
                              children: [
                                Row(
                                  children: [
                                    if (p.isPinned)
                                      const Padding(
                                        padding: EdgeInsetsDirectional.only(end: 6),
                                        child: Icon(Icons.push_pin, size: 16),
                                      ),
                                    Expanded(
                                      child: Text(
                                        p.title ?? '',
                                        style: Theme.of(context).textTheme.titleMedium,
                                      ),
                                    ),
                                    if (p.isLocked) const Icon(Icons.lock_outline, size: 16),
                                  ],
                                ),
                                if ((p.title ?? '').isNotEmpty) const SizedBox(height: 8),
                                Text(p.body),
                                const SizedBox(height: 8),
                                Row(
                                  children: [
                                    const Icon(Icons.mode_comment_outlined, size: 16),
                                    const SizedBox(width: 4),
                                    Text('${p.commentCount}'),
                                  ],
                                ),
                              ],
                            ),
                          ),
                        );
                      },
                    );
                  },
                ),
              ),
            ),
            Padding(
              padding: const EdgeInsets.fromLTRB(16, 0, 16, 16),
              child: Row(
                children: [
                  Expanded(
                    child: TextField(
                      controller: _bodyCtrl,
                      decoration: const InputDecoration(hintText: S.postBody),
                      minLines: 1,
                      maxLines: 4,
                    ),
                  ),
                  const SizedBox(width: 8),
                  FilledButton(
                    onPressed: _posting ? null : _newPost,
                    child: const Text(S.send),
                  ),
                ],
              ),
            ),
          ],
        ),
      ),
    );
  }
}
