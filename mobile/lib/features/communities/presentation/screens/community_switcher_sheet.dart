import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';
import 'package:material_symbols_icons/symbols.dart';

import '../../../../commons.dart';
import '../../../../core/i18n/strings.dart';
import '../../../../data/models/community_dto.dart';
import '../providers/community_providers.dart';

/// Spec: design-specs/CommunitySwitcher.json (route "/communities", role: member).
/// Scrim + bottom sheet (with handle). Cards list user's memberships with role
/// badge; DiscoverMore button at the bottom links to /discover.
class CommunitySwitcherSheet extends ConsumerWidget {
  const CommunitySwitcherSheet({super.key});

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final async = ref.watch(myCommunitiesProvider);
    return Directionality(
      textDirection: TextDirection.rtl,
      child: Scaffold(
        backgroundColor: Colors.black.withValues(alpha: 0.4),
        body: GestureDetector(
          behavior: HitTestBehavior.opaque,
          onTap: () => _close(context),
          child: SafeArea(
            child: Align(
              alignment: Alignment.bottomCenter,
              child: GestureDetector(
                onTap: () {}, // swallow taps inside the sheet
                child: _SheetBody(async: async),
              ),
            ),
          ),
        ),
      ),
    );
  }

  static void _close(BuildContext context) {
    if (GoRouter.of(context).canPop()) {
      GoRouter.of(context).pop();
    }
  }
}

class _SheetBody extends StatelessWidget {
  const _SheetBody({required this.async});
  final AsyncValue<List<MyCommunityEntry>> async;

  @override
  Widget build(BuildContext context) {
    final p = context.palette;
    final t = Theme.of(context).textTheme;
    final dark = Theme.of(context).brightness == Brightness.dark;
    return Container(
      width: double.infinity,
      decoration: BoxDecoration(
        color: p.surface,
        borderRadius: const BorderRadius.vertical(top: Radius.circular(AppRadius.lg)),
        boxShadow: AppShadows.high(dark: dark),
      ),
      padding: const EdgeInsets.fromLTRB(20, 10, 20, 24),
      child: Column(
        mainAxisSize: MainAxisSize.min,
        crossAxisAlignment: CrossAxisAlignment.stretch,
        children: [
          // Handle
          Center(
            child: Container(
              width: 44,
              height: 4,
              decoration: BoxDecoration(
                color: p.border,
                borderRadius: BorderRadius.circular(4),
              ),
            ),
          ),
          const SizedBox(height: 14),
          Text(
            S.communitySwitcherTitle,
            style: t.titleMedium!.copyWith(fontSize: 16, fontWeight: FontWeight.w700),
          ),
          const SizedBox(height: 14),
          async.when(
            loading: () => const SizedBox(
              height: 80,
              child: Center(child: CircularProgressIndicator()),
            ),
            error: (e, _) => Padding(
              padding: const EdgeInsets.symmetric(vertical: 16),
              child: Text(
                S.discoveryEmptyHeadline,
                textAlign: TextAlign.center,
                style: t.bodyMedium!.copyWith(color: p.muted),
              ),
            ),
            data: (rows) {
              if (rows.isEmpty) {
                return Padding(
                  padding: const EdgeInsets.symmetric(vertical: 16),
                  child: Text(
                    S.noCommunityYet,
                    style: t.bodyMedium!.copyWith(color: p.muted),
                  ),
                );
              }
              return Flexible(
                child: ListView.separated(
                  shrinkWrap: true,
                  itemCount: rows.length,
                  separatorBuilder: (_, __) => const SizedBox(height: 10),
                  itemBuilder: (_, i) => _CommunityCard(entry: rows[i]),
                ),
              );
            },
          ),
          const SizedBox(height: 14),
          AppButton.secondary(
            S.switcherDiscoverMore,
            icon: Symbols.explore_rounded,
            onPressed: () {
              if (GoRouter.of(context).canPop()) GoRouter.of(context).pop();
              GoRouter.of(context).push('/discover');
            },
          ),
        ],
      ),
    );
  }
}

class _CommunityCard extends StatelessWidget {
  const _CommunityCard({required this.entry});
  final MyCommunityEntry entry;

  @override
  Widget build(BuildContext context) {
    final p = context.palette;
    final t = Theme.of(context).textTheme;
    return InkWell(
      borderRadius: AppRadius.brMd,
      onTap: () {
        // Per spec: CommunityCard → switch context. Full active-community state
        // ships with C6 (admin); for C2b the tap surfaces the community welcome
        // screen so users can see brand/cover/rules at any time.
        if (GoRouter.of(context).canPop()) GoRouter.of(context).pop();
        GoRouter.of(context).push('/c/${entry.community.id}/welcome');
      },
      child: Container(
        padding: const EdgeInsets.all(12),
        decoration: BoxDecoration(
          color: p.surface,
          borderRadius: AppRadius.brMd,
          border: Border.all(color: p.border),
        ),
        child: Row(
          children: [
            Container(
              width: 40,
              height: 40,
              decoration: BoxDecoration(
                color: p.accentWash,
                borderRadius: BorderRadius.circular(10),
              ),
              alignment: Alignment.center,
              child: entry.community.logoUrl != null
                  ? ClipRRect(
                      borderRadius: BorderRadius.circular(10),
                      child: Image.network(entry.community.logoUrl!, fit: BoxFit.cover),
                    )
                  : Icon(Symbols.groups_rounded, color: p.accentInk),
            ),
            const SizedBox(width: 12),
            Expanded(
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  Text(
                    entry.community.name,
                    style: t.titleMedium!.copyWith(fontSize: 15, fontWeight: FontWeight.w700),
                  ),
                  const SizedBox(height: 2),
                  Text(
                    S.memberCountLabel(entry.community.memberCount),
                    style: t.labelSmall!.copyWith(color: p.muted, fontSize: 11.5),
                  ),
                ],
              ),
            ),
            _RoleBadge(role: entry.role),
          ],
        ),
      ),
    );
  }
}

class _RoleBadge extends StatelessWidget {
  const _RoleBadge({required this.role});
  final String role;

  @override
  Widget build(BuildContext context) {
    final p = context.palette;
    String label;
    Color bg;
    Color fg;
    switch (role) {
      case 'admin':
        label = 'מנהל';
        bg = p.accentWash;
        fg = p.accentInk;
      case 'subadmin':
        label = 'מנהל משנה';
        bg = p.accentWash;
        fg = p.accentInk;
      case 'event_manager':
        label = 'אחראי אירועים';
        bg = p.surface2;
        fg = p.onBackground2;
      default:
        label = 'חבר';
        bg = p.surface2;
        fg = p.muted;
    }
    return Container(
      height: 22,
      padding: const EdgeInsets.symmetric(horizontal: 10),
      decoration: BoxDecoration(
        color: bg,
        borderRadius: AppRadius.brFull,
      ),
      alignment: Alignment.center,
      child: Text(
        label,
        style: TextStyle(fontSize: 11, fontWeight: FontWeight.w700, color: fg),
      ),
    );
  }
}
