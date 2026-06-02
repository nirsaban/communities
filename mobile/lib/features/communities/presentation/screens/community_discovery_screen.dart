import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:material_symbols_icons/symbols.dart';

import '../../../../commons.dart';
import '../../../../core/i18n/strings.dart';
import '../../../../data/models/community_dto.dart';
import '../../../../shared/widgets/widgets.dart';
import '../providers/community_providers.dart';

/// Spec: design-specs/CommunityDiscovery.json (route "/discover").
/// Title, InviteCodeInput (OTP 6 — currently inert, see DESIGN_DEVIATIONS),
/// SectionHeader, CommunityCard list with JoinButton/RequestButton based on privacy.
class CommunityDiscoveryScreen extends ConsumerStatefulWidget {
  const CommunityDiscoveryScreen({super.key});

  @override
  ConsumerState<CommunityDiscoveryScreen> createState() => _State();
}

class _State extends ConsumerState<CommunityDiscoveryScreen> {
  String _search = '';

  @override
  Widget build(BuildContext context) {
    final p = context.palette;
    final t = Theme.of(context).textTheme;
    final async = ref.watch(discoveryProvider(DiscoveryQuery(search: _search)));

    return Directionality(
      textDirection: TextDirection.rtl,
      child: Scaffold(
        backgroundColor: p.background,
        appBar: AppBar(
          backgroundColor: p.background,
          elevation: 0,
          scrolledUnderElevation: 0,
          leading: AppBackButton(),
          title: Text(S.discoveryTitle, style: t.titleMedium!.copyWith(fontSize: 16)),
          centerTitle: true,
        ),
        body: SafeArea(
          top: false,
          child: ListView(
            padding: const EdgeInsets.fromLTRB(20, 4, 20, 24),
            children: [
              Text(
                S.discoveryInviteCode,
                style: t.labelSmall!.copyWith(color: p.muted, fontSize: 11.5),
              ),
              const SizedBox(height: 8),
              // Spec wants a 6-digit OTP that resolves to a community. Backend
              // doesn't store short invite codes today — see DESIGN_DEVIATIONS.
              Opacity(
                opacity: 0.55,
                child: IgnorePointer(
                  child: OtpInput(length: 6, onCompleted: (_) {}),
                ),
              ),
              const SizedBox(height: 24),
              SectionHeader(S.discoveryRecommended),
              const SizedBox(height: 8),
              async.when(
                loading: () => const Padding(
                  padding: EdgeInsets.symmetric(vertical: 32),
                  child: Center(child: CircularProgressIndicator()),
                ),
                error: (e, _) => Padding(
                  padding: const EdgeInsets.symmetric(vertical: 16),
                  child: ErrorState(
                    onRetry: () => ref.invalidate(discoveryProvider(DiscoveryQuery(search: _search))),
                  ),
                ),
                data: (rows) {
                  if (rows.isEmpty) {
                    return Padding(
                      padding: const EdgeInsets.symmetric(vertical: 32),
                      child: EmptyState(
                        icon: Symbols.travel_explore_rounded,
                        headline: S.discoveryEmptyHeadline,
                        body: S.discoveryEmptyBody,
                      ),
                    );
                  }
                  return Column(
                    children: rows.map((c) => _DiscoveryCard(community: c)).toList(),
                  );
                },
              ),
            ],
          ),
        ),
      ),
    );
  }
}

class _DiscoveryCard extends ConsumerStatefulWidget {
  const _DiscoveryCard({required this.community});
  final CommunityDto community;

  @override
  ConsumerState<_DiscoveryCard> createState() => _DiscoveryCardState();
}

class _DiscoveryCardState extends ConsumerState<_DiscoveryCard> {
  bool _busy = false;
  bool _joined = false;
  bool _requested = false;

  Future<void> _join() async {
    if (_busy) return;
    setState(() => _busy = true);
    try {
      await ref.read(communityRepositoryProvider).join(widget.community.id);
      if (!mounted) return;
      setState(() => _joined = true);
      ScaffoldMessenger.of(context).showSnackBar(
        const SnackBar(content: Text(S.discoveryJoined)),
      );
    } catch (_) {
      if (!mounted) return;
      ScaffoldMessenger.of(context).showSnackBar(
        const SnackBar(content: Text(S.discoveryJoinFailed)),
      );
    } finally {
      if (mounted) setState(() => _busy = false);
    }
  }

  Future<void> _request() async {
    if (_busy) return;
    setState(() => _busy = true);
    try {
      await ref.read(communityRepositoryProvider).requestJoin(widget.community.id);
      if (!mounted) return;
      setState(() => _requested = true);
      ScaffoldMessenger.of(context).showSnackBar(
        const SnackBar(content: Text(S.discoveryRequested)),
      );
    } catch (_) {
      if (!mounted) return;
      ScaffoldMessenger.of(context).showSnackBar(
        const SnackBar(content: Text(S.discoveryJoinFailed)),
      );
    } finally {
      if (mounted) setState(() => _busy = false);
    }
  }

  @override
  Widget build(BuildContext context) {
    final c = widget.community;
    final p = context.palette;
    final t = Theme.of(context).textTheme;
    final dark = Theme.of(context).brightness == Brightness.dark;
    return Container(
      margin: const EdgeInsets.only(bottom: 12),
      decoration: BoxDecoration(
        color: p.surface,
        borderRadius: AppRadius.brMd,
        border: Border.all(color: p.border),
        boxShadow: AppShadows.low(dark: dark),
      ),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.stretch,
        children: [
          if (c.coverUrl != null)
            AspectRatio(
              aspectRatio: 16 / 9,
              child: ClipRRect(
                borderRadius: const BorderRadius.vertical(top: Radius.circular(AppRadius.md)),
                child: Image.network(c.coverUrl!, fit: BoxFit.cover),
              ),
            ),
          Padding(
            padding: const EdgeInsets.all(14),
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Row(
                  children: [
                    Container(
                      width: 32,
                      height: 32,
                      decoration: BoxDecoration(
                        color: p.accentWash,
                        borderRadius: BorderRadius.circular(8),
                      ),
                      alignment: Alignment.center,
                      child: c.logoUrl != null
                          ? ClipRRect(
                              borderRadius: BorderRadius.circular(8),
                              child: Image.network(c.logoUrl!, fit: BoxFit.cover),
                            )
                          : Icon(Symbols.groups_rounded, size: 18, color: p.accentInk),
                    ),
                    const SizedBox(width: 10),
                    Expanded(
                      child: Text(
                        c.name,
                        style: t.titleMedium!.copyWith(fontSize: 15, fontWeight: FontWeight.w700),
                      ),
                    ),
                    _PrivacyBadge(privacy: c.privacy),
                  ],
                ),
                if (c.description.isNotEmpty) ...[
                  const SizedBox(height: 8),
                  Text(
                    c.description,
                    style: t.bodyMedium!.copyWith(color: p.onBackground2, fontSize: 13.5, height: 1.4),
                    maxLines: 3,
                    overflow: TextOverflow.ellipsis,
                  ),
                ],
                const SizedBox(height: 10),
                Row(
                  children: [
                    Icon(Symbols.group_rounded, size: 16, color: p.muted),
                    const SizedBox(width: 4),
                    Text(
                      S.memberCountLabel(c.memberCount),
                      style: t.labelSmall!.copyWith(color: p.muted, fontSize: 11.5),
                    ),
                  ],
                ),
                const SizedBox(height: 12),
                _Cta(
                  privacy: c.privacy,
                  joined: _joined,
                  requested: _requested,
                  busy: _busy,
                  onJoin: _join,
                  onRequest: _request,
                ),
              ],
            ),
          ),
        ],
      ),
    );
  }
}

class _PrivacyBadge extends StatelessWidget {
  const _PrivacyBadge({required this.privacy});
  final String privacy;

  @override
  Widget build(BuildContext context) {
    final p = context.palette;
    final label = switch (privacy) {
      'public' => S.communityPrivacyPublic,
      'application' => S.communityPrivacyApplication,
      _ => S.communityPrivacyInvite,
    };
    return Container(
      height: 22,
      padding: const EdgeInsets.symmetric(horizontal: 10),
      decoration: BoxDecoration(color: p.surface2, borderRadius: AppRadius.brFull),
      alignment: Alignment.center,
      child: Text(
        label,
        style: TextStyle(fontSize: 11, fontWeight: FontWeight.w700, color: p.muted),
      ),
    );
  }
}

class _Cta extends StatelessWidget {
  const _Cta({
    required this.privacy,
    required this.joined,
    required this.requested,
    required this.busy,
    required this.onJoin,
    required this.onRequest,
  });
  final String privacy;
  final bool joined;
  final bool requested;
  final bool busy;
  final VoidCallback onJoin;
  final VoidCallback onRequest;

  @override
  Widget build(BuildContext context) {
    if (joined) {
      return AppButton.secondary(
        S.discoveryJoined,
        icon: Symbols.check_circle_rounded,
        onPressed: null,
      );
    }
    if (requested) {
      return AppButton.secondary(
        S.discoveryRequested,
        icon: Symbols.hourglass_top_rounded,
        onPressed: null,
      );
    }
    if (privacy == 'public') {
      return AppButton(
        S.discoveryJoin,
        loading: busy,
        onPressed: busy ? null : onJoin,
      );
    }
    if (privacy == 'application') {
      return AppButton.secondary(
        S.discoveryRequest,
        loading: busy,
        onPressed: busy ? null : onRequest,
      );
    }
    // invite_only → no CTA, only inbound invitations work.
    return const SizedBox.shrink();
  }
}
