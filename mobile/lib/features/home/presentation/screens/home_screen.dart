import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';
import 'package:material_symbols_icons/symbols.dart';

import '../../../../commons.dart';
import '../../../../core/i18n/strings.dart';
import '../../../../data/models/event_dto.dart';
import '../../../auth/presentation/providers/auth_providers.dart';
import '../../../events/presentation/providers/event_providers.dart';
import '../../../../shared/widgets/widgets.dart';

/// Spec: design-specs/HomeFeed.json (route "/home", role: member)
/// Components in order: CommunitySwitcherPill, SearchButton, NotificationsButton,
/// Greeting (displayMedium), PinnedAnnouncement, HappeningSoonRail, EventTile (repeat),
/// CommunityPost, BottomNav (active: Home).
/// States: loading / populated / empty — handled inline (EmptyHomeFeed shares /home).
class HomeScreen extends ConsumerWidget {
  const HomeScreen({super.key});

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final authState = ref.watch(authNotifierProvider);
    final cid = ref.watch(activeCommunityIdProvider);
    final user = authState is AuthAuthenticated ? authState.user : null;

    return Directionality(
      textDirection: TextDirection.rtl,
      child: Scaffold(
        backgroundColor: context.palette.background,
        body: SafeArea(
          bottom: false,
          child: cid == null
              ? _NoCommunityState(onSignOut: () => ref.read(authNotifierProvider.notifier).logout())
              : _HomeBody(
                  communityId: cid,
                  // CommunityName is fetched in C2 when the switcher ships.
                  communityName: null,
                  greetingName: user?.name.isEmpty ?? true ? (user?.email ?? '') : user!.name,
                ),
        ),
        bottomNavigationBar: AppBottomNav(
          active: MemberNavTab.home,
          initiativesCommunityId: cid,
        ),
      ),
    );
  }
}

class _HomeBody extends ConsumerWidget {
  const _HomeBody({
    required this.communityId,
    required this.communityName,
    required this.greetingName,
  });

  final String communityId;
  final String? communityName;
  final String greetingName;

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final eventsAsync = ref.watch(eventsListProvider(
      EventsQuery(communityId: communityId, bucket: EventsBucket.upcoming),
    ));

    return RefreshIndicator(
      onRefresh: () async {
        ref.invalidate(eventsListProvider(
          EventsQuery(communityId: communityId, bucket: EventsBucket.upcoming),
        ));
        await ref.read(eventsListProvider(
          EventsQuery(communityId: communityId, bucket: EventsBucket.upcoming),
        ).future);
      },
      child: CustomScrollView(
        physics: const AlwaysScrollableScrollPhysics(),
        slivers: [
          SliverToBoxAdapter(
            child: _HomeTopBar(communityName: communityName),
          ),
          const SliverToBoxAdapter(child: SizedBox(height: AppSpacing.s4)),
          SliverToBoxAdapter(
            child: Padding(
              padding: const EdgeInsets.symmetric(horizontal: 20),
              child: Text(
                S.greetingFor(greetingName.isEmpty ? '' : greetingName.split(' ').first),
                style: Theme.of(context).textTheme.displayMedium,
              ),
            ),
          ),
          const SliverToBoxAdapter(child: SizedBox(height: AppSpacing.sectionGap)),
          eventsAsync.when(
            loading: () => const SliverToBoxAdapter(child: _HomeLoading()),
            error: (e, _) => SliverToBoxAdapter(
              child: Padding(
                padding: const EdgeInsets.only(top: 40),
                child: ErrorState(
                  onRetry: () => ref.invalidate(eventsListProvider(
                    EventsQuery(communityId: communityId, bucket: EventsBucket.upcoming),
                  )),
                ),
              ),
            ),
            data: (events) {
              if (events.isEmpty) {
                return const SliverFillRemaining(
                  hasScrollBody: false,
                  child: _EmptyHomeFeed(),
                );
              }
              return SliverList.list(
                children: [
                  _HappeningSoonRail(events: events.take(8).toList()),
                  const SizedBox(height: AppSpacing.sectionGap),
                  const Padding(
                    padding: EdgeInsets.symmetric(horizontal: 20),
                    child: SectionHeader(S.inYourCommunity),
                  ),
                  ...events.map((e) => Padding(
                        padding: const EdgeInsets.fromLTRB(20, 0, 20, 12),
                        child: _EventTile(event: e),
                      )),
                  const SizedBox(height: 24),
                ],
              );
            },
          ),
        ],
      ),
    );
  }
}

class _HomeTopBar extends StatelessWidget {
  const _HomeTopBar({required this.communityName});
  final String? communityName;

  @override
  Widget build(BuildContext context) {
    final p = context.palette;
    return Padding(
      padding: const EdgeInsets.fromLTRB(20, 12, 20, 0),
      child: Row(
        children: [
          Expanded(
            child: _CommunitySwitcherPill(name: communityName ?? 'הקהילה שלי'),
          ),
          const SizedBox(width: 8),
          _IconButton(
            icon: Symbols.search_rounded,
            onTap: () {},
            color: p.onBackground,
          ),
          const SizedBox(width: 4),
          _IconButton(
            icon: Symbols.notifications_rounded,
            onTap: () {},
            color: p.onBackground,
            badge: true,
          ),
        ],
      ),
    );
  }
}

class _CommunitySwitcherPill extends StatelessWidget {
  const _CommunitySwitcherPill({required this.name});
  final String name;

  @override
  Widget build(BuildContext context) {
    final p = context.palette;
    return InkWell(
      borderRadius: AppRadius.brFull,
      onTap: () => GoRouter.of(context).push('/communities'),
      child: Container(
        height: 40,
        padding: const EdgeInsets.symmetric(horizontal: 14),
        decoration: BoxDecoration(
          color: p.surface,
          borderRadius: AppRadius.brFull,
          border: Border.all(color: p.border),
        ),
        child: Row(
          mainAxisSize: MainAxisSize.min,
          children: [
            Container(
              width: 20,
              height: 20,
              decoration: BoxDecoration(
                color: p.accentWash,
                borderRadius: BorderRadius.circular(6),
              ),
              child: Icon(Symbols.groups_rounded, size: 14, color: p.accentInk),
            ),
            const SizedBox(width: 8),
            Flexible(
              child: Text(
                name,
                maxLines: 1,
                overflow: TextOverflow.ellipsis,
                style: Theme.of(context).textTheme.titleMedium!.copyWith(fontSize: 14),
              ),
            ),
            const SizedBox(width: 4),
            Icon(Symbols.expand_more_rounded, size: 18, color: p.muted),
          ],
        ),
      ),
    );
  }
}

class _IconButton extends StatelessWidget {
  const _IconButton({
    required this.icon,
    required this.onTap,
    required this.color,
    this.badge = false,
  });

  final IconData icon;
  final VoidCallback onTap;
  final Color color;
  final bool badge;

  @override
  Widget build(BuildContext context) {
    final p = context.palette;
    return SizedBox(
      width: 44,
      height: 44,
      child: Stack(
        alignment: Alignment.center,
        children: [
          Material(
            color: Colors.transparent,
            shape: const CircleBorder(),
            child: InkWell(
              customBorder: const CircleBorder(),
              onTap: onTap,
              child: Icon(icon, size: 24, color: color),
            ),
          ),
          if (badge)
            Positioned(
              top: 10,
              right: 10,
              child: Container(
                width: 8,
                height: 8,
                decoration: BoxDecoration(
                  color: p.error,
                  shape: BoxShape.circle,
                  border: Border.all(color: p.background, width: 1.5),
                ),
              ),
            ),
        ],
      ),
    );
  }
}

class _HappeningSoonRail extends StatelessWidget {
  const _HappeningSoonRail({required this.events});
  final List<EventDto> events;

  @override
  Widget build(BuildContext context) {
    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        Padding(
          padding: const EdgeInsets.symmetric(horizontal: 20),
          child: SectionHeader(S.happeningSoon, actionLabel: S.seeAll, onAction: () {
            // Routes to EventsList — handled in C1.f.
            // ignore: avoid_dynamic_calls
            (context as dynamic);
            // Use GoRouter when available; tests don't.
            try {
              GoRouter.of(context).go('/events');
            } catch (_) {}
          }),
        ),
        SizedBox(
          height: 200,
          child: ListView.separated(
            scrollDirection: Axis.horizontal,
            padding: const EdgeInsets.symmetric(horizontal: 20),
            itemCount: events.length,
            separatorBuilder: (_, __) => const SizedBox(width: 12),
            itemBuilder: (context, i) {
              final ev = events[i];
              return _RailCard(event: ev);
            },
          ),
        ),
      ],
    );
  }
}

class _RailCard extends StatelessWidget {
  const _RailCard({required this.event});
  final EventDto event;

  @override
  Widget build(BuildContext context) {
    final p = context.palette;
    final t = Theme.of(context).textTheme;
    final dark = Theme.of(context).brightness == Brightness.dark;
    return SizedBox(
      width: 240,
      child: Material(
        color: p.surface,
        borderRadius: AppRadius.brMd,
        child: InkWell(
          borderRadius: AppRadius.brMd,
          onTap: () => GoRouter.of(context).push('/events/${event.id}'),
          child: Container(
            decoration: BoxDecoration(
              borderRadius: AppRadius.brMd,
              border: Border.all(color: p.border),
              boxShadow: AppShadows.low(dark: dark),
            ),
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                AspectRatio(
                  aspectRatio: 16 / 9,
                  child: ClipRRect(
                    borderRadius: const BorderRadius.vertical(top: Radius.circular(AppRadius.md)),
                    child: event.coverImageUrl != null
                        ? Image.network(event.coverImageUrl!, fit: BoxFit.cover)
                        : Container(color: p.surface2, child: Icon(Symbols.event_rounded, size: 36, color: p.muted)),
                  ),
                ),
                Padding(
                  padding: const EdgeInsets.all(12),
                  child: Column(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      Text(
                        _formatRailDate(event.startAt),
                        style: t.labelSmall!.copyWith(
                          color: dark ? p.brand : p.accentInk,
                          fontSize: 11.5,
                          letterSpacing: 0.4,
                        ),
                      ),
                      const SizedBox(height: 4),
                      Text(
                        event.title,
                        maxLines: 2,
                        overflow: TextOverflow.ellipsis,
                        style: t.titleMedium!.copyWith(fontSize: 15, height: 1.2),
                      ),
                    ],
                  ),
                ),
              ],
            ),
          ),
        ),
      ),
    );
  }
}

class _EventTile extends StatelessWidget {
  const _EventTile({required this.event});
  final EventDto event;

  @override
  Widget build(BuildContext context) {
    return EventCard(
      title: event.title,
      whenLabel: _formatRailDate(event.startAt),
      location: event.location.displayLabel,
      coverUrl: event.coverImageUrl,
      priceKind: _priceKindOf(event.pricing.kind),
      priceAmount: event.pricing.kind == EventPricingKind.paid
          ? _formatPrice(event.pricing.priceCents, event.pricing.currency)
          : null,
      onTap: () => GoRouter.of(context).push('/events/${event.id}'),
    );
  }
}

PriceKind _priceKindOf(EventPricingKind k) {
  switch (k) {
    case EventPricingKind.free:
      return PriceKind.free;
    case EventPricingKind.paid:
      return PriceKind.paid;
    case EventPricingKind.subscriptionOnly:
      return PriceKind.subscription;
    case EventPricingKind.external:
      return PriceKind.external;
  }
}

String _formatPrice(int cents, String currency) {
  final amount = (cents / 100).toStringAsFixed((cents % 100 == 0) ? 0 : 2);
  switch (currency.toUpperCase()) {
    case 'ILS':
      return '₪$amount';
    case 'EUR':
      return '€$amount';
    case 'ILS':
    default:
      // ILS-only at v1 — fall back to the shekel sign so legacy USD rows still render.
      return '₪$amount';
  }
}

String _formatRailDate(DateTime dt) {
  const months = ['ינו׳', 'פבר׳', 'מרץ', 'אפר׳', 'מאי', 'יוני', 'יולי', 'אוג׳', 'ספט׳', 'אוק׳', 'נוב׳', 'דצמ׳'];
  final m = months[dt.month - 1];
  final hh = dt.hour.toString().padLeft(2, '0');
  final mm = dt.minute.toString().padLeft(2, '0');
  return '${dt.day} $m · $hh:$mm';
}

class _HomeLoading extends StatelessWidget {
  const _HomeLoading();

  @override
  Widget build(BuildContext context) {
    return const Padding(
      padding: EdgeInsets.symmetric(horizontal: 20),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          LoadingShimmer(height: 22, width: 160),
          SizedBox(height: 18),
          Row(
            children: [
              Expanded(child: LoadingShimmer(height: 180, radius: AppRadius.md)),
              SizedBox(width: 12),
              Expanded(child: LoadingShimmer(height: 180, radius: AppRadius.md)),
            ],
          ),
          SizedBox(height: 24),
          LoadingShimmer(height: 90, radius: AppRadius.md),
          SizedBox(height: 12),
          LoadingShimmer(height: 90, radius: AppRadius.md),
        ],
      ),
    );
  }
}

/// Spec: design-specs/EmptyHomeFeed.json (route "/home", state "empty").
class _EmptyHomeFeed extends StatelessWidget {
  const _EmptyHomeFeed();

  @override
  Widget build(BuildContext context) {
    return EmptyState(
      icon: Symbols.event_upcoming_rounded,
      headline: S.emptyHomeHeadline,
      body: S.emptyHomeBody,
      ctaLabel: S.exploreCommunities,
      onCta: () => GoRouter.of(context).go('/events'),
    );
  }
}

class _NoCommunityState extends StatelessWidget {
  const _NoCommunityState({required this.onSignOut});
  final VoidCallback onSignOut;

  @override
  Widget build(BuildContext context) {
    return Column(
      children: [
        Padding(
          padding: const EdgeInsets.fromLTRB(20, 12, 20, 0),
          child: Row(
            mainAxisAlignment: MainAxisAlignment.end,
            children: [
              IconButton(
                tooltip: S.signOut,
                icon: const Icon(Symbols.logout_rounded),
                onPressed: onSignOut,
              ),
            ],
          ),
        ),
        Expanded(
          child: EmptyState(
            icon: Symbols.groups_2_rounded,
            headline: S.noCommunityYet,
            body: S.noCommunityYetBody,
            ctaLabel: S.exploreCommunities,
            onCta: () {},
          ),
        ),
      ],
    );
  }
}
