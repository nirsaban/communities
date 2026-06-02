import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';

import '../../../../core/i18n/strings.dart';
import '../providers/initiative_providers.dart';

class InitiativeDetailScreen extends ConsumerStatefulWidget {
  const InitiativeDetailScreen({super.key, required this.iid});
  final String iid;

  @override
  ConsumerState<InitiativeDetailScreen> createState() => _InitiativeDetailScreenState();
}

class _InitiativeDetailScreenState extends ConsumerState<InitiativeDetailScreen> {
  final _commentCtrl = TextEditingController();
  bool _sending = false;

  @override
  void dispose() {
    _commentCtrl.dispose();
    super.dispose();
  }

  Future<void> _toggleSupport(bool currentlySupporting) async {
    final repo = ref.read(initiativeRepositoryProvider);
    try {
      if (currentlySupporting) {
        await repo.unsupport(widget.iid);
      } else {
        await repo.support(widget.iid);
      }
      ref.invalidate(initiativeDetailProvider(widget.iid));
    } catch (e) {
      if (mounted) {
        ScaffoldMessenger.of(context).showSnackBar(SnackBar(content: Text(e.toString())));
      }
    }
  }

  Future<void> _addComment() async {
    final body = _commentCtrl.text.trim();
    if (body.isEmpty) return;
    setState(() => _sending = true);
    try {
      await ref.read(initiativeRepositoryProvider).addComment(widget.iid, body);
      _commentCtrl.clear();
      ref.invalidate(initiativeCommentsProvider(widget.iid));
      ref.invalidate(initiativeDetailProvider(widget.iid));
    } catch (e) {
      if (mounted) {
        ScaffoldMessenger.of(context).showSnackBar(SnackBar(content: Text(e.toString())));
      }
    } finally {
      if (mounted) setState(() => _sending = false);
    }
  }

  @override
  Widget build(BuildContext context) {
    final detail = ref.watch(initiativeDetailProvider(widget.iid));
    final comments = ref.watch(initiativeCommentsProvider(widget.iid));
    return Scaffold(
      appBar: AppBar(title: const Text(S.initiatives)),
      body: SafeArea(
        child: detail.when(
          loading: () => const Center(child: CircularProgressIndicator()),
          error: (e, _) => Padding(
            padding: const EdgeInsets.all(24),
            child: Text(e.toString(), style: TextStyle(color: Theme.of(context).colorScheme.error)),
          ),
          data: (i) => Column(
            children: [
              Expanded(
                child: ListView(
                  padding: const EdgeInsets.all(16),
                  children: [
                    Row(
                      children: [
                        Expanded(
                          child: Text(i.title, style: Theme.of(context).textTheme.headlineSmall),
                        ),
                        Chip(label: Text(S.initiativeStatusLabel(i.status))),
                      ],
                    ),
                    const SizedBox(height: 8),
                    Text(S.initiativeCategoryLabel(i.category),
                        style: Theme.of(context).textTheme.bodySmall),
                    const SizedBox(height: 16),
                    Text(i.description),
                    const SizedBox(height: 16),
                    Row(
                      children: [
                        const Icon(Icons.favorite_border, size: 18),
                        const SizedBox(width: 6),
                        Text(S.supportersCount(i.supporterCount)),
                      ],
                    ),
                    if (i.status == 'approved' || i.status == 'active') ...[
                      const SizedBox(height: 12),
                      FilledButton.icon(
                        onPressed: () => _toggleSupport(i.isSupporting),
                        icon: Icon(i.isSupporting ? Icons.favorite : Icons.favorite_border),
                        label: Text(
                          i.isSupporting ? S.unsupportInitiative : S.supportInitiative,
                        ),
                      ),
                    ],
                    const Divider(height: 32),
                    Text(S.noComments,
                        style: Theme.of(context).textTheme.bodySmall),
                    const SizedBox(height: 8),
                    comments.when(
                      loading: () =>
                          const Padding(padding: EdgeInsets.all(8), child: LinearProgressIndicator()),
                      error: (e, _) => Text(e.toString()),
                      data: (list) {
                        if (list.isEmpty) {
                          return const Padding(
                            padding: EdgeInsets.all(8),
                            child: Text(S.noComments),
                          );
                        }
                        return Column(
                          crossAxisAlignment: CrossAxisAlignment.stretch,
                          children: list
                              .map(
                                (c) => Card(
                                  child: Padding(
                                    padding: const EdgeInsets.all(12),
                                    child: Text(c.body),
                                  ),
                                ),
                              )
                              .toList(),
                        );
                      },
                    ),
                  ],
                ),
              ),
              if (i.status == 'approved' || i.status == 'active' || i.status == 'completed')
                Padding(
                  padding: const EdgeInsets.fromLTRB(16, 0, 16, 16),
                  child: Row(
                    children: [
                      Expanded(
                        child: TextField(
                          controller: _commentCtrl,
                          decoration: const InputDecoration(hintText: S.writeComment),
                          minLines: 1,
                          maxLines: 4,
                        ),
                      ),
                      const SizedBox(width: 8),
                      FilledButton(
                        onPressed: _sending ? null : _addComment,
                        child: const Text(S.send),
                      ),
                    ],
                  ),
                ),
            ],
          ),
        ),
      ),
    );
  }
}
