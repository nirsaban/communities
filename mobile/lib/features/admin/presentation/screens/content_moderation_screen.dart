import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:material_symbols_icons/symbols.dart';

import '../../../../commons.dart';
import '../../../../core/i18n/strings.dart';
import '../../../../data/models/admin_dto.dart';
import '../../../../shared/widgets/widgets.dart';
import '../../../events/presentation/providers/event_providers.dart';
import '../providers/admin_providers.dart';

/// Spec: design-specs/ContentModeration.json — flagged content with Keep / Warn / Remove.
/// Backend has no flagging model yet; this surface lists recent posts and lets the
/// moderator hide/restore. Logged as a deviation.
class ContentModerationScreen extends ConsumerWidget {
  const ContentModerationScreen({super.key});

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final p = context.palette;
    final t = Theme.of(context).textTheme;
    final cid = ref.watch(activeCommunityIdProvider);
    if (cid == null) return const Scaffold(body: Center(child: Text(S.noCommunities)));
    final async = ref.watch(moderationQueueProvider(cid));
    return Directionality(
      textDirection: TextDirection.rtl,
      child: Scaffold(
        backgroundColor: p.background,
        appBar: AppBar(
          backgroundColor: p.background,
          elevation: 0,
          scrolledUnderElevation: 0,
          leading: AppBackButton(),
          title: Text(S.moderationTitle, style: t.titleMedium!.copyWith(fontSize: 16)),
          centerTitle: true,
        ),
        body: SafeArea(
          top: false,
          child: async.when(
            loading: () => const Center(child: CircularProgressIndicator()),
            error: (e, _) => ErrorState(onRetry: () => ref.invalidate(moderationQueueProvider(cid))),
            data: (rows) {
              if (rows.isEmpty) {
                return EmptyState(icon: Symbols.flag_rounded, headline: S.moderationEmpty, body: '');
              }
              return ListView.separated(
                padding: const EdgeInsets.fromLTRB(20, 8, 20, 24),
                itemCount: rows.length,
                separatorBuilder: (_, __) => const SizedBox(height: 12),
                itemBuilder: (_, i) => _ModerationCard(communityId: cid, item: rows[i]),
              );
            },
          ),
        ),
      ),
    );
  }
}

class _ModerationCard extends ConsumerWidget {
  const _ModerationCard({required this.communityId, required this.item});
  final String communityId;
  final ModerationItemDto item;

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final p = context.palette;
    final t = Theme.of(context).textTheme;
    Future<void> act(String action) async {
      try {
        await ref.read(adminRepositoryProvider).moderatePost(item.id, action: action);
        ref.invalidate(moderationQueueProvider(communityId));
        if (context.mounted) {
          final msg = switch (action) {
            'remove' => S.modRemovedToast,
            'keep' => S.modKeptToast,
            _ => S.modWarnedToast,
          };
          ScaffoldMessenger.of(context).showSnackBar(SnackBar(content: Text(msg)));
        }
      } catch (_) {/* ignored */}
    }

    return Container(
      padding: const EdgeInsets.all(14),
      decoration: BoxDecoration(
        color: item.hidden ? p.errorWash : p.surface,
        borderRadius: AppRadius.brMd,
        border: Border.all(color: item.hidden ? p.error : p.border),
      ),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Row(
            children: [
              if (item.hidden) ...[
                Icon(Symbols.visibility_off_rounded, size: 16, color: p.error),
                const SizedBox(width: 6),
                Text(S.modHiddenBadge,
                    style: TextStyle(color: p.error, fontSize: 11, fontWeight: FontWeight.w700)),
                const SizedBox(width: 10),
              ],
              Container(
                height: 22,
                padding: const EdgeInsets.symmetric(horizontal: 10),
                decoration: BoxDecoration(color: p.surface2, borderRadius: AppRadius.brFull),
                alignment: Alignment.center,
                child: Text(
                  item.type,
                  style: TextStyle(color: p.muted, fontSize: 11, fontWeight: FontWeight.w700),
                ),
              ),
              const Spacer(),
              Text(
                _rel(item.createdAt),
                style: t.labelSmall!.copyWith(color: p.muted, fontSize: 11),
              ),
            ],
          ),
          if ((item.title ?? '').isNotEmpty) ...[
            const SizedBox(height: 10),
            Text(item.title!, style: t.titleMedium!.copyWith(fontWeight: FontWeight.w700)),
          ],
          const SizedBox(height: 6),
          Text(
            item.body,
            style: t.bodyMedium!.copyWith(fontSize: 13.5, height: 1.5),
            maxLines: 4,
            overflow: TextOverflow.ellipsis,
          ),
          const SizedBox(height: 12),
          Row(
            children: [
              Expanded(
                child: AppButton.secondary(
                  S.modKeep,
                  size: AppButtonSize.small,
                  onPressed: item.hidden ? () => act('keep') : null,
                ),
              ),
              const SizedBox(width: 8),
              Expanded(
                child: AppButton.secondary(
                  S.modWarn,
                  size: AppButtonSize.small,
                  onPressed: () => act('warn'),
                ),
              ),
              const SizedBox(width: 8),
              Expanded(
                child: AppButton.danger(
                  S.modRemove,
                  size: AppButtonSize.small,
                  onPressed: item.hidden ? null : () => act('remove'),
                ),
              ),
            ],
          ),
        ],
      ),
    );
  }

  String _rel(DateTime dt) {
    final d = DateTime.now().difference(dt);
    if (d.inHours < 1) return 'לפני ${d.inMinutes}ד׳';
    if (d.inDays < 1) return 'לפני ${d.inHours}ש׳';
    return 'לפני ${d.inDays}י׳';
  }
}
