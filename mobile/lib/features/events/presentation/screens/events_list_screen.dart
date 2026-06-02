import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';
import 'package:material_symbols_icons/symbols.dart';

import '../../../../commons.dart';
import '../../../../core/i18n/strings.dart';
import '../../../../data/models/event_dto.dart';
import '../../../../shared/widgets/widgets.dart';
import '../providers/event_providers.dart';
import '../widgets/events_calendar_view.dart';
import '../widgets/filter_chips.dart';
import '../widgets/segmented_control.dart';

/// Spec: design-specs/EventsList.json (route "/events", role: member)
///   + design-specs/EventsCalendar.json (route "/events?view=calendar")
///   + design-specs/EmptyEventsList.json (state "empty")
///
/// `?view=calendar` swaps the list body for the calendar agenda; both share
/// the same top chrome (SegmentedControl, FilterChips, Filter + Calendar toggles).
class EventsListScreen extends ConsumerStatefulWidget {
  const EventsListScreen({super.key, this.initialView = 'list'});
  final String initialView;

  @override
  ConsumerState<EventsListScreen> createState() => _EventsListScreenState();
}

class _EventsListScreenState extends ConsumerState<EventsListScreen> {
  late String _view;
  EventsBucket _bucket = EventsBucket.upcoming;
  final Set<String> _filters = <String>{};

  @override
  void initState() {
    super.initState();
    _view = widget.initialView;
  }

  void _toggleView() {
    setState(() => _view = _view == 'calendar' ? 'list' : 'calendar');
    GoRouter.of(context).go(_view == 'calendar' ? '/events?view=calendar' : '/events');
  }

  bool _matchesFilters(EventDto e) {
    if (_filters.isEmpty) return true;
    final isFree = e.pricing.kind == EventPricingKind.free;
    final isPaid = e.pricing.kind == EventPricingKind.paid;
    final isOnline = e.location.kind == EventLocationKind.online;
    final isInPerson = e.location.kind == EventLocationKind.physical;
    bool ok = true;
    if (_filters.contains('free') && !isFree) ok = false;
    if (_filters.contains('paid') && !isPaid) ok = false;
    if (_filters.contains('online') && !isOnline) ok = false;
    if (_filters.contains('inPerson') && !isInPerson) ok = false;
    return ok;
  }

  @override
  Widget build(BuildContext context) {
    final cid = ref.watch(activeCommunityIdProvider);

    return Directionality(
      textDirection: TextDirection.rtl,
      child: Scaffold(
        backgroundColor: context.palette.background,
        body: SafeArea(
          bottom: false,
          child: cid == null
              ? const Center(child: Text(S.noCommunities))
              : Column(
                  children: [
                    _TopBar(
                      onCalendarToggle: _toggleView,
                      isCalendar: _view == 'calendar',
                    ),
                    Padding(
                      padding: const EdgeInsets.fromLTRB(20, 4, 20, 12),
                      child: SegmentedControl<EventsBucket>(
                        value: _bucket,
                        options: const [EventsBucket.upcoming, EventsBucket.past, EventsBucket.all],
                        labels: const [S.eventsUpcoming, S.eventsPast, S.eventsAll],
                        onChanged: (v) => setState(() => _bucket = v),
                      ),
                    ),
                    EventFilterChips(
                      options: const ['free', 'paid', 'online', 'inPerson'],
                      labels: const [
                        S.eventFilterFree,
                        S.eventFilterPaid,
                        S.eventFilterOnline,
                        S.eventFilterInPerson,
                      ],
                      selected: _filters,
                      onToggle: (k) => setState(() {
                        if (_filters.contains(k)) {
                          _filters.remove(k);
                        } else {
                          _filters.add(k);
                        }
                      }),
                    ),
                    const SizedBox(height: 12),
                    Expanded(child: _Body(communityId: cid, bucket: _bucket, view: _view, matches: _matchesFilters)),
                  ],
                ),
        ),
        bottomNavigationBar: AppBottomNav(
          active: MemberNavTab.events,
          initiativesCommunityId: cid,
        ),
      ),
    );
  }
}

class _TopBar extends StatelessWidget {
  const _TopBar({required this.onCalendarToggle, required this.isCalendar});
  final VoidCallback onCalendarToggle;
  final bool isCalendar;

  @override
  Widget build(BuildContext context) {
    final p = context.palette;
    return Padding(
      padding: const EdgeInsets.fromLTRB(20, 12, 20, 8),
      child: Row(
        children: [
          Text(
            S.events,
            style: Theme.of(context).textTheme.displayMedium!.copyWith(fontSize: 28),
          ),
          const Spacer(),
          _RoundIcon(
            icon: Symbols.filter_list_rounded,
            color: p.onBackground,
            onTap: () {},
          ),
          const SizedBox(width: 4),
          _RoundIcon(
            icon: isCalendar ? Symbols.list_rounded : Symbols.calendar_month_rounded,
            color: p.onBackground,
            onTap: onCalendarToggle,
          ),
        ],
      ),
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

class _Body extends ConsumerWidget {
  const _Body({
    required this.communityId,
    required this.bucket,
    required this.view,
    required this.matches,
  });

  final String communityId;
  final EventsBucket bucket;
  final String view;
  final bool Function(EventDto) matches;

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final query = EventsQuery(communityId: communityId, bucket: bucket);
    final async = ref.watch(eventsListProvider(query));
    return async.when(
      loading: () => const _ListLoading(),
      error: (e, _) => ErrorState(onRetry: () => ref.invalidate(eventsListProvider(query))),
      data: (events) {
        final filtered = events.where(matches).toList();
        if (filtered.isEmpty) {
          return const _EmptyEvents();
        }
        if (view == 'calendar') {
          return SingleChildScrollView(
            child: EventsCalendarView(
              events: filtered,
              cardBuilder: (ctx, ev) => _EventTile(event: ev),
            ),
          );
        }
        return RefreshIndicator(
          onRefresh: () async {
            ref.invalidate(eventsListProvider(query));
            await ref.read(eventsListProvider(query).future);
          },
          child: ListView.separated(
            padding: const EdgeInsets.fromLTRB(20, 4, 20, 24),
            itemCount: filtered.length,
            separatorBuilder: (_, __) => const SizedBox(height: 12),
            itemBuilder: (_, i) => _EventTile(event: filtered[i]),
          ),
        );
      },
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
  return '${dt.day} ${months[dt.month - 1]} · ${dt.hour.toString().padLeft(2, '0')}:${dt.minute.toString().padLeft(2, '0')}';
}

class _ListLoading extends StatelessWidget {
  const _ListLoading();

  @override
  Widget build(BuildContext context) {
    return ListView.separated(
      padding: const EdgeInsets.fromLTRB(20, 4, 20, 24),
      itemCount: 4,
      separatorBuilder: (_, __) => const SizedBox(height: 12),
      itemBuilder: (_, __) => const LoadingShimmer(height: 92, radius: AppRadius.md),
    );
  }
}

class _EmptyEvents extends StatelessWidget {
  const _EmptyEvents();

  @override
  Widget build(BuildContext context) {
    return EmptyState(
      icon: Symbols.event_busy_rounded,
      headline: S.eventsEmptyHeadline,
      body: S.eventsEmptyBody,
      ctaLabel: S.notifyMe,
      onCta: () {},
    );
  }
}
