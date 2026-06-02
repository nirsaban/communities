import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:material_symbols_icons/symbols.dart';

import '../../../../commons.dart';
import '../../../../core/i18n/strings.dart';
import '../../../../data/models/notification_dto.dart';
import '../../../../shared/widgets/widgets.dart';
import '../../../events/presentation/providers/event_providers.dart';
import '../providers/notification_providers.dart';

/// Spec: design-specs/Inbox.json (route "/inbox", role: member).
/// MarkAllReadButton, ActionableBanner (accentWash), GroupLabel (labelSmall),
/// NotificationRow (leading typeIcon, trailing unreadDot), BottomNav(active=Inbox).
class InboxScreen extends ConsumerWidget {
  const InboxScreen({super.key});

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final cid = ref.watch(activeCommunityIdProvider);
    final async = ref.watch(inboxProvider);

    return Directionality(
      textDirection: TextDirection.rtl,
      child: Scaffold(
        backgroundColor: context.palette.background,
        body: SafeArea(
          bottom: false,
          child: Column(
            children: [
              _TopBar(
                onMarkAllRead: () async {
                  try {
                    await ref.read(notificationsControllerProvider).markAllRead();
                    ref.invalidate(inboxProvider);
                    if (context.mounted) {
                      ScaffoldMessenger.of(context).showSnackBar(
                        const SnackBar(content: Text(S.inboxMarkedAllRead)),
                      );
                    }
                  } catch (_) {}
                },
              ),
              Expanded(
                child: async.when(
                  loading: () => const _LoadingList(),
                  error: (e, _) => ErrorState(onRetry: () => ref.invalidate(inboxProvider)),
                  data: (items) {
                    if (items.isEmpty) return const _EmptyInbox();
                    return RefreshIndicator(
                      onRefresh: () async {
                        ref.invalidate(inboxProvider);
                        await ref.read(inboxProvider.future);
                      },
                      child: _GroupedList(items: items, ref: ref),
                    );
                  },
                ),
              ),
            ],
          ),
        ),
        bottomNavigationBar: AppBottomNav(
          active: MemberNavTab.inbox,
          initiativesCommunityId: cid,
        ),
      ),
    );
  }
}

class _TopBar extends StatelessWidget {
  const _TopBar({required this.onMarkAllRead});
  final VoidCallback onMarkAllRead;

  @override
  Widget build(BuildContext context) {
    final p = context.palette;
    return Padding(
      padding: const EdgeInsets.fromLTRB(20, 12, 12, 8),
      child: Row(
        children: [
          Text(
            S.inbox,
            style: Theme.of(context).textTheme.displayMedium!.copyWith(fontSize: 28),
          ),
          const Spacer(),
          IconButton(
            tooltip: S.inboxMarkAllRead,
            onPressed: onMarkAllRead,
            icon: Icon(Symbols.done_all_rounded, color: p.onBackground),
          ),
        ],
      ),
    );
  }
}

class _GroupedList extends StatelessWidget {
  const _GroupedList({required this.items, required this.ref});
  final List<NotificationDto> items;
  final WidgetRef ref;

  @override
  Widget build(BuildContext context) {
    final now = DateTime.now();
    final today = DateTime(now.year, now.month, now.day);
    final yesterday = today.subtract(const Duration(days: 1));

    final groups = <String, List<NotificationDto>>{
      S.inboxGroupToday: [],
      S.inboxGroupYesterday: [],
      S.inboxGroupEarlier: [],
    };
    for (final n in items) {
      final d = DateTime(n.createdAt.year, n.createdAt.month, n.createdAt.day);
      if (d == today) {
        groups[S.inboxGroupToday]!.add(n);
      } else if (d == yesterday) {
        groups[S.inboxGroupYesterday]!.add(n);
      } else {
        groups[S.inboxGroupEarlier]!.add(n);
      }
    }

    // Actionable banner: first unread waitlist-promotion if any.
    final waitlistBanner = items.firstWhere(
      (n) => n.isUnread && n.type.startsWith('waitlist_promoted'),
      orElse: () => NotificationDto(
        id: '',
        type: '',
        title: '',
        body: '',
        payload: const {},
        communityId: null,
        createdAt: DateTime.now(),
      ),
    );

    return ListView(
      padding: const EdgeInsets.fromLTRB(20, 4, 20, 32),
      children: [
        if (waitlistBanner.id.isNotEmpty) _ActionableBanner(notification: waitlistBanner),
        for (final entry in groups.entries)
          if (entry.value.isNotEmpty) ...[
            const SizedBox(height: 8),
            _GroupLabel(label: entry.key),
            const SizedBox(height: 6),
            ...entry.value.map((n) => _NotificationRow(
                  notification: n,
                  onTap: () async {
                    if (n.isUnread) {
                      try {
                        await ref.read(notificationsControllerProvider).markRead(n.id);
                        ref.invalidate(inboxProvider);
                      } catch (_) {}
                    }
                    // Deep-link routing lands when individual surfaces are ready.
                  },
                )),
          ],
      ],
    );
  }
}

class _ActionableBanner extends StatelessWidget {
  const _ActionableBanner({required this.notification});
  final NotificationDto notification;

  @override
  Widget build(BuildContext context) {
    final p = context.palette;
    final t = Theme.of(context).textTheme;
    return Container(
      margin: const EdgeInsets.only(top: 8, bottom: 4),
      padding: const EdgeInsets.all(14),
      decoration: BoxDecoration(
        color: p.accentWash,
        borderRadius: AppRadius.brMd,
        border: Border.all(color: p.brand),
      ),
      child: Row(
        children: [
          Icon(Symbols.hourglass_top_rounded, color: p.accentInk),
          const SizedBox(width: 10),
          Expanded(
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Text(
                  notification.title,
                  style: t.titleMedium!.copyWith(fontSize: 14.5, fontWeight: FontWeight.w700, color: p.accentInk),
                ),
                if (notification.body.isNotEmpty)
                  Padding(
                    padding: const EdgeInsets.only(top: 2),
                    child: Text(
                      notification.body,
                      style: t.bodyMedium!.copyWith(fontSize: 13, color: p.accentInk),
                    ),
                  ),
              ],
            ),
          ),
        ],
      ),
    );
  }
}

class _GroupLabel extends StatelessWidget {
  const _GroupLabel({required this.label});
  final String label;

  @override
  Widget build(BuildContext context) {
    final p = context.palette;
    return Text(
      label,
      style: Theme.of(context).textTheme.labelSmall!.copyWith(
            color: p.muted,
            fontSize: 11.5,
            letterSpacing: 0.5,
          ),
    );
  }
}

class _NotificationRow extends StatelessWidget {
  const _NotificationRow({required this.notification, required this.onTap});
  final NotificationDto notification;
  final VoidCallback onTap;

  IconData get _typeIcon {
    switch (notification.type) {
      case 'event_published':
      case 'event_reminder':
      case 'event_cancelled':
        return Symbols.event_rounded;
      case 'waitlist_promoted':
        return Symbols.hourglass_top_rounded;
      case 'rsvp_confirmed':
        return Symbols.check_circle_rounded;
      case 'initiative_update':
        return Symbols.lightbulb_rounded;
      case 'post_mention':
      case 'post_reply':
        return Symbols.forum_rounded;
      default:
        return Symbols.notifications_rounded;
    }
  }

  @override
  Widget build(BuildContext context) {
    final p = context.palette;
    final t = Theme.of(context).textTheme;
    return InkWell(
      borderRadius: AppRadius.brMd,
      onTap: onTap,
      child: Padding(
        padding: const EdgeInsets.symmetric(horizontal: 4, vertical: 10),
        child: Row(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Container(
              width: 36,
              height: 36,
              decoration: BoxDecoration(
                color: p.surface2,
                borderRadius: BorderRadius.circular(10),
              ),
              child: Icon(_typeIcon, size: 20, color: p.onBackground2),
            ),
            const SizedBox(width: 12),
            Expanded(
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  Text(
                    notification.title,
                    style: t.titleMedium!.copyWith(
                      fontSize: 14.5,
                      fontWeight: notification.isUnread ? FontWeight.w700 : FontWeight.w600,
                    ),
                    maxLines: 2,
                    overflow: TextOverflow.ellipsis,
                  ),
                  if (notification.body.isNotEmpty)
                    Padding(
                      padding: const EdgeInsets.only(top: 2),
                      child: Text(
                        notification.body,
                        style: t.bodyMedium!.copyWith(
                          color: p.onBackground2,
                          fontSize: 13,
                          height: 1.4,
                        ),
                        maxLines: 2,
                        overflow: TextOverflow.ellipsis,
                      ),
                    ),
                  Padding(
                    padding: const EdgeInsets.only(top: 4),
                    child: Text(
                      _relativeTime(notification.createdAt),
                      style: t.labelSmall!.copyWith(color: p.muted, fontSize: 11),
                    ),
                  ),
                ],
              ),
            ),
            if (notification.isUnread)
              Padding(
                padding: const EdgeInsets.only(top: 6),
                child: Container(
                  width: 9,
                  height: 9,
                  decoration: BoxDecoration(color: p.brand, shape: BoxShape.circle),
                ),
              ),
          ],
        ),
      ),
    );
  }
}

class _LoadingList extends StatelessWidget {
  const _LoadingList();

  @override
  Widget build(BuildContext context) {
    return ListView.separated(
      padding: const EdgeInsets.fromLTRB(20, 4, 20, 24),
      itemCount: 5,
      separatorBuilder: (_, __) => const SizedBox(height: 12),
      itemBuilder: (_, __) => const LoadingShimmer(height: 70, radius: AppRadius.md),
    );
  }
}

class _EmptyInbox extends StatelessWidget {
  const _EmptyInbox();

  @override
  Widget build(BuildContext context) {
    return EmptyState(
      icon: Symbols.notifications_off_rounded,
      headline: S.inboxEmptyHeadline,
      body: S.inboxEmptyBody,
    );
  }
}

String _relativeTime(DateTime dt) {
  final diff = DateTime.now().difference(dt);
  if (diff.inMinutes < 1) return 'עכשיו';
  if (diff.inHours < 1) return 'לפני ${diff.inMinutes} דק׳';
  if (diff.inDays < 1) return 'לפני ${diff.inHours} שע׳';
  if (diff.inDays < 7) return 'לפני ${diff.inDays} ימים';
  return '${dt.day}/${dt.month}/${dt.year}';
}
