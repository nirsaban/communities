import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';

import '../../../../core/i18n/strings.dart';
import '../../../../data/models/initiative_dto.dart';
import '../providers/initiative_providers.dart';

class InitiativesScreen extends ConsumerWidget {
  const InitiativesScreen({super.key, required this.communityId});
  final String communityId;

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final async = ref.watch(initiativesProvider(communityId));
    return Scaffold(
      appBar: AppBar(title: const Text(S.initiatives)),
      floatingActionButton: FloatingActionButton.extended(
        onPressed: () => context.push('/communities/$communityId/initiatives/new'),
        icon: const Icon(Icons.add),
        label: const Text(S.newInitiative),
      ),
      body: SafeArea(
        child: RefreshIndicator(
          onRefresh: () async => ref.invalidate(initiativesProvider(communityId)),
          child: async.when(
            loading: () => const Center(child: CircularProgressIndicator()),
            error: (e, _) => ListView(
              children: [
                Padding(
                  padding: const EdgeInsets.all(24),
                  child: Text(
                    e.toString(),
                    style: TextStyle(color: Theme.of(context).colorScheme.error),
                  ),
                ),
              ],
            ),
            data: (items) {
              if (items.isEmpty) {
                return ListView(
                  children: const [
                    Padding(
                      padding: EdgeInsets.all(24),
                      child: Text(S.noInitiatives, textAlign: TextAlign.center),
                    ),
                  ],
                );
              }
              return ListView.separated(
                padding: const EdgeInsets.all(16),
                itemCount: items.length,
                separatorBuilder: (_, __) => const SizedBox(height: 12),
                itemBuilder: (_, i) => _InitiativeCard(initiative: items[i]),
              );
            },
          ),
        ),
      ),
    );
  }
}

class _InitiativeCard extends StatelessWidget {
  const _InitiativeCard({required this.initiative});
  final InitiativeDto initiative;

  @override
  Widget build(BuildContext context) {
    return Card(
      child: InkWell(
        onTap: () => context.push('/initiatives/${initiative.id}'),
        child: Padding(
          padding: const EdgeInsets.all(16),
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.stretch,
            children: [
              Row(
                children: [
                  Expanded(
                    child: Text(
                      initiative.title,
                      style: Theme.of(context).textTheme.titleMedium,
                    ),
                  ),
                  Chip(label: Text(S.initiativeStatusLabel(initiative.status))),
                ],
              ),
              const SizedBox(height: 4),
              Text(
                S.initiativeCategoryLabel(initiative.category),
                style: Theme.of(context).textTheme.bodySmall,
              ),
              const SizedBox(height: 8),
              Text(
                initiative.description,
                maxLines: 3,
                overflow: TextOverflow.ellipsis,
              ),
              const SizedBox(height: 8),
              Row(
                children: [
                  const Icon(Icons.favorite_border, size: 16),
                  const SizedBox(width: 4),
                  Text(S.supportersCount(initiative.supporterCount)),
                  const SizedBox(width: 16),
                  const Icon(Icons.mode_comment_outlined, size: 16),
                  const SizedBox(width: 4),
                  Text('${initiative.commentCount}'),
                ],
              ),
            ],
          ),
        ),
      ),
    );
  }
}
