import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';
import 'package:material_symbols_icons/symbols.dart';

import '../../../../commons.dart';
import '../../../../core/i18n/strings.dart';
import '../providers/community_providers.dart';

/// Spec: design-specs/CommunityWelcome.json (route "/c/:slug/welcome").
/// Backend lookup is by id, not slug — passing the community id as `:id` from
/// the discovery / invitation flows (see DESIGN_DEVIATIONS).
/// Components: CoverImage(300, full, r=0), CommunityLogo(72), Title(displayLarge),
/// Description(bodyLarge muted), StatChips, ContinueButton(primary, full, h=50).
class CommunityWelcomeScreen extends ConsumerWidget {
  const CommunityWelcomeScreen({super.key, required this.communityId});
  final String communityId;

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final p = context.palette;
    final async = ref.watch(communityDetailProvider(communityId));

    return Directionality(
      textDirection: TextDirection.rtl,
      child: Scaffold(
        backgroundColor: p.background,
        body: async.when(
          loading: () => const Center(child: CircularProgressIndicator()),
          error: (e, _) => SafeArea(
            child: ErrorState(
              onRetry: () => ref.invalidate(communityDetailProvider(communityId)),
            ),
          ),
          data: (community) => CustomScrollView(
            slivers: [
              SliverToBoxAdapter(
                child: SizedBox(
                  height: 300,
                  width: double.infinity,
                  child: community.coverUrl != null
                      ? Image.network(community.coverUrl!, fit: BoxFit.cover)
                      : Container(color: p.surface2),
                ),
              ),
              SliverPadding(
                padding: const EdgeInsets.fromLTRB(20, 0, 20, 32),
                sliver: SliverList(
                  delegate: SliverChildListDelegate([
                    Transform.translate(
                      offset: const Offset(0, -36),
                      child: Container(
                        width: 72,
                        height: 72,
                        decoration: BoxDecoration(
                          color: p.surface,
                          borderRadius: BorderRadius.circular(20),
                          border: Border.all(color: p.border, width: 2),
                          image: community.logoUrl != null
                              ? DecorationImage(image: NetworkImage(community.logoUrl!), fit: BoxFit.cover)
                              : null,
                        ),
                        alignment: Alignment.center,
                        child: community.logoUrl == null
                            ? Icon(Symbols.groups_rounded, size: 36, color: p.accentInk)
                            : null,
                      ),
                    ),
                    Text(
                      community.name,
                      style: Theme.of(context).textTheme.displayLarge!.copyWith(fontSize: 30),
                      maxLines: 2,
                      overflow: TextOverflow.ellipsis,
                    ),
                    if (community.description.isNotEmpty) ...[
                      const SizedBox(height: 10),
                      Text(
                        community.description,
                        style: Theme.of(context).textTheme.bodyLarge!.copyWith(
                              color: p.muted,
                              fontSize: 15,
                              height: 1.5,
                            ),
                      ),
                    ],
                    const SizedBox(height: 16),
                    Wrap(
                      spacing: 8,
                      runSpacing: 8,
                      children: [
                        _StatChip(
                          icon: Symbols.group_rounded,
                          label: S.memberCountLabel(community.memberCount),
                        ),
                        if (community.eventCount > 0)
                          _StatChip(
                            icon: Symbols.event_rounded,
                            label: '${community.eventCount} אירועים',
                          ),
                      ],
                    ),
                    if ((community.welcomeMessage ?? '').isNotEmpty) ...[
                      const SizedBox(height: 18),
                      Container(
                        padding: const EdgeInsets.all(14),
                        decoration: BoxDecoration(
                          color: p.accentWash,
                          borderRadius: AppRadius.brMd,
                        ),
                        child: Text(
                          community.welcomeMessage!,
                          style: Theme.of(context).textTheme.bodyMedium!.copyWith(
                                color: p.accentInk,
                                fontSize: 14,
                                height: 1.5,
                              ),
                        ),
                      ),
                    ],
                    const SizedBox(height: 24),
                    SizedBox(
                      height: 50,
                      child: AppButton(
                        S.welcomeContinue,
                        onPressed: () {
                          final hasRules = (community.rules ?? '').trim().isNotEmpty;
                          if (hasRules) {
                            GoRouter.of(context).pushReplacement('/c/${community.id}/rules');
                          } else {
                            GoRouter.of(context).go('/home');
                          }
                        },
                      ),
                    ),
                  ]),
                ),
              ),
            ],
          ),
        ),
      ),
    );
  }
}

class _StatChip extends StatelessWidget {
  const _StatChip({required this.icon, required this.label});
  final IconData icon;
  final String label;

  @override
  Widget build(BuildContext context) {
    final p = context.palette;
    return Container(
      height: 28,
      padding: const EdgeInsets.symmetric(horizontal: 12),
      decoration: BoxDecoration(
        color: p.surface2,
        borderRadius: AppRadius.brFull,
      ),
      child: Row(
        mainAxisSize: MainAxisSize.min,
        children: [
          Icon(icon, size: 14, color: p.muted),
          const SizedBox(width: 6),
          Text(
            label,
            style: TextStyle(fontSize: 12, fontWeight: FontWeight.w600, color: p.muted),
          ),
        ],
      ),
    );
  }
}
