import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';
import 'package:material_symbols_icons/symbols.dart';

import '../../../../commons.dart';
import '../../../../core/i18n/strings.dart';
import '../../../../data/models/auth_dto.dart';
import '../../../../shared/widgets/widgets.dart';
import '../../../auth/presentation/providers/auth_providers.dart';
import '../../../events/presentation/providers/event_providers.dart';

/// Spec: design-specs/MemberProfile.json (route "/me", role: member).
/// SettingsButton, Avatar(88), Name (titleLarge), Bio (bodyLarge), StatCards,
/// InterestChips, ShortcutList, EditProfileButton (secondary), BottomNav(active=Profile).
class MemberProfileScreen extends ConsumerWidget {
  const MemberProfileScreen({super.key});

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final auth = ref.watch(authNotifierProvider);
    final cid = ref.watch(activeCommunityIdProvider);

    return Directionality(
      textDirection: TextDirection.rtl,
      child: Scaffold(
        backgroundColor: context.palette.background,
        body: SafeArea(
          bottom: false,
          child: auth is AuthAuthenticated
              ? _Body(
                  user: auth.user,
                  membershipCount: auth.memberships.length,
                )
              : const Center(child: CircularProgressIndicator()),
        ),
        bottomNavigationBar: AppBottomNav(
          active: MemberNavTab.profile,
          initiativesCommunityId: cid,
        ),
      ),
    );
  }
}

class _Body extends ConsumerWidget {
  const _Body({required this.user, required this.membershipCount});
  final UserDto user;
  final int membershipCount;

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final p = context.palette;
    final t = Theme.of(context).textTheme;
    return SingleChildScrollView(
      padding: const EdgeInsets.fromLTRB(20, 8, 20, 32),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.stretch,
        children: [
          // SettingsButton — header row, single icon on the far visual-left.
          Row(
            children: [
              const Spacer(),
              _RoundIcon(
                icon: Symbols.settings_rounded,
                color: p.onBackground,
                onTap: () => GoRouter.of(context).push('/settings/notifications'),
              ),
            ],
          ),
          const SizedBox(height: 8),
          Center(
            child: _Avatar88(name: user.name.isEmpty ? user.email : user.name, photoUrl: user.photoUrl),
          ),
          const SizedBox(height: 16),
          Center(
            child: Text(
              user.name.isEmpty ? user.email : user.name,
              style: t.titleLarge!.copyWith(fontSize: 22, fontWeight: FontWeight.w700),
              textAlign: TextAlign.center,
            ),
          ),
          if (user.bio != null && user.bio!.isNotEmpty) ...[
            const SizedBox(height: 6),
            Text(
              user.bio!,
              style: t.bodyLarge!.copyWith(color: p.onBackground2, height: 1.5),
              textAlign: TextAlign.center,
            ),
          ] else ...[
            const SizedBox(height: 6),
            Text(
              S.profileEmptyBio,
              style: t.bodyMedium!.copyWith(color: p.muted),
              textAlign: TextAlign.center,
            ),
          ],
          const SizedBox(height: AppSpacing.sectionGap),
          _StatCards(
            memberships: membershipCount,
            interests: user.interests.length,
          ),
          const SizedBox(height: AppSpacing.sectionGap),
          if (user.interests.isNotEmpty) ...[
            InterestChipGroup(
              options: user.interests,
              selected: user.interests.toSet(),
              onChanged: (_) {},
            ),
            const SizedBox(height: AppSpacing.sectionGap),
          ] else ...[
            Container(
              padding: const EdgeInsets.all(14),
              decoration: BoxDecoration(
                color: p.surface2,
                borderRadius: AppRadius.brMd,
              ),
              child: Row(
                children: [
                  Icon(Symbols.interests_rounded, size: 20, color: p.muted),
                  const SizedBox(width: 10),
                  Expanded(
                    child: Text(
                      S.profileEmptyInterests,
                      style: t.bodyMedium!.copyWith(color: p.onBackground2, fontSize: 13.5, height: 1.5),
                    ),
                  ),
                ],
              ),
            ),
            const SizedBox(height: AppSpacing.sectionGap),
          ],
          _ShortcutList(),
          const SizedBox(height: AppSpacing.sectionGap),
          AppButton.secondary(
            S.editProfile,
            icon: Symbols.edit_rounded,
            onPressed: () => GoRouter.of(context).push('/me/edit'),
          ),
          const SizedBox(height: 12),
          AppButton.secondary(
            S.profileLogout,
            icon: Symbols.logout_rounded,
            onPressed: () => ref.read(authNotifierProvider.notifier).logout(),
          ),
        ],
      ),
    );
  }
}

class _Avatar88 extends StatelessWidget {
  const _Avatar88({required this.name, this.photoUrl});
  final String name;
  final String? photoUrl;

  String get _initials {
    final parts = name.trim().split(RegExp(r'\s+'));
    if (parts.isEmpty || parts.first.isEmpty) return '?';
    if (parts.length == 1) return parts.first.characters.first.toUpperCase();
    return (parts.first.characters.first + parts.last.characters.first).toUpperCase();
  }

  @override
  Widget build(BuildContext context) {
    final p = context.palette;
    final t = Theme.of(context).textTheme;
    return Container(
      width: 88,
      height: 88,
      decoration: BoxDecoration(
        shape: BoxShape.circle,
        color: p.surface2,
        border: Border.all(color: p.border, width: 2),
        image: photoUrl != null
            ? DecorationImage(image: NetworkImage(photoUrl!), fit: BoxFit.cover)
            : null,
      ),
      alignment: Alignment.center,
      child: photoUrl == null
          ? Text(
              _initials,
              style: t.titleLarge!.copyWith(fontSize: 28, color: p.onBackground2),
            )
          : null,
    );
  }
}

class _StatCards extends StatelessWidget {
  const _StatCards({required this.memberships, required this.interests});
  final int memberships;
  final int interests;

  @override
  Widget build(BuildContext context) {
    return Row(
      children: [
        Expanded(child: _StatCard(label: S.profileMyCommunities, value: memberships.toString())),
        const SizedBox(width: 12),
        Expanded(child: _StatCard(label: S.profileMyInitiatives, value: '—')),
        const SizedBox(width: 12),
        Expanded(child: _StatCard(label: 'תחומי עניין', value: interests.toString())),
      ],
    );
  }
}

class _StatCard extends StatelessWidget {
  const _StatCard({required this.label, required this.value});
  final String label;
  final String value;

  @override
  Widget build(BuildContext context) {
    final p = context.palette;
    final t = Theme.of(context).textTheme;
    return Container(
      padding: const EdgeInsets.symmetric(vertical: 14, horizontal: 12),
      decoration: BoxDecoration(
        color: p.surface,
        borderRadius: AppRadius.brMd,
        border: Border.all(color: p.border),
      ),
      child: Column(
        children: [
          Text(value, style: t.titleLarge!.copyWith(fontSize: 22, fontWeight: FontWeight.w700)),
          const SizedBox(height: 4),
          Text(
            label,
            style: t.labelSmall!.copyWith(color: p.muted, fontSize: 11.5),
            textAlign: TextAlign.center,
          ),
        ],
      ),
    );
  }
}

class _ShortcutList extends StatelessWidget {
  @override
  Widget build(BuildContext context) {
    final p = context.palette;
    return Container(
      decoration: BoxDecoration(
        color: p.surface,
        borderRadius: AppRadius.brMd,
        border: Border.all(color: p.border),
      ),
      child: Column(
        children: [
          _ShortcutRow(
            icon: Symbols.event_available_rounded,
            label: S.profileMyRsvps,
            onTap: () => GoRouter.of(context).push('/me/rsvps'),
          ),
          _Divider(),
          _ShortcutRow(
            icon: Symbols.groups_rounded,
            label: S.profileMyCommunities,
            onTap: () => GoRouter.of(context).push('/communities'),
          ),
          _Divider(),
          _ShortcutRow(
            icon: Symbols.travel_explore_rounded,
            label: S.discoveryTitle,
            onTap: () => GoRouter.of(context).push('/discover'),
          ),
          _Divider(),
          _ShortcutRow(
            icon: Symbols.shield_person_rounded,
            label: S.myEventsTitle,
            onTap: () => GoRouter.of(context).push('/manage/events'),
          ),
          _Divider(),
          _ShortcutRow(
            icon: Symbols.admin_panel_settings_rounded,
            label: S.subAdminOverviewTitle,
            onTap: () => GoRouter.of(context).push('/admin/overview'),
          ),
          _Divider(),
          _ShortcutRow(
            icon: Symbols.security_rounded,
            label: S.superDashboardTitle,
            onTap: () => GoRouter.of(context).push('/super'),
          ),
          _Divider(),
          _ShortcutRow(
            icon: Symbols.diamond_rounded,
            label: S.membershipTitle,
            onTap: () => GoRouter.of(context).push('/me/membership'),
          ),
          _Divider(),
          _ShortcutRow(
            icon: Symbols.notifications_rounded,
            label: S.profileSettingsNotifications,
            onTap: () => GoRouter.of(context).push('/settings/notifications'),
          ),
          _Divider(),
          _ShortcutRow(
            icon: Symbols.shield_rounded,
            label: S.privacyTitle,
            onTap: () => GoRouter.of(context).push('/settings/privacy'),
          ),
          _Divider(),
          _ShortcutRow(
            icon: Symbols.delete_forever_rounded,
            label: S.deleteAccountTitle,
            onTap: () => GoRouter.of(context).push('/settings/delete'),
          ),
        ],
      ),
    );
  }
}

class _ShortcutRow extends StatelessWidget {
  const _ShortcutRow({required this.icon, required this.label, required this.onTap});
  final IconData icon;
  final String label;
  final VoidCallback onTap;

  @override
  Widget build(BuildContext context) {
    final p = context.palette;
    final t = Theme.of(context).textTheme;
    return InkWell(
      borderRadius: AppRadius.brMd,
      onTap: onTap,
      child: Padding(
        padding: const EdgeInsets.symmetric(horizontal: 14, vertical: 14),
        child: Row(
          children: [
            Icon(icon, size: 22, color: p.accentInk),
            const SizedBox(width: 12),
            Expanded(child: Text(label, style: t.bodyMedium!.copyWith(fontSize: 14.5))),
            Icon(Symbols.chevron_left_rounded, size: 22, color: p.muted),
          ],
        ),
      ),
    );
  }
}

class _Divider extends StatelessWidget {
  @override
  Widget build(BuildContext context) {
    return Container(
      height: 1,
      margin: const EdgeInsetsDirectional.only(start: 46),
      color: context.palette.border,
    );
  }
}

class _RoundIcon extends StatelessWidget {
  const _RoundIcon({required this.icon, required this.color, required this.onTap});
  final IconData icon;
  final Color color;
  final VoidCallback onTap;

  @override
  Widget build(BuildContext context) {
    return SizedBox(
      width: 44,
      height: 44,
      child: Material(
        color: Colors.transparent,
        shape: const CircleBorder(),
        child: InkWell(
          customBorder: const CircleBorder(),
          onTap: onTap,
          child: Icon(icon, size: 24, color: color),
        ),
      ),
    );
  }
}
