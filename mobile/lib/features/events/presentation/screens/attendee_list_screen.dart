import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:material_symbols_icons/symbols.dart';

import '../../../../commons.dart';
import '../../../../core/i18n/strings.dart';
import '../../../../shared/widgets/widgets.dart';
import '../providers/event_manager_providers.dart';
import '../widgets/segmented_control.dart';

enum _AttFilter { all, going, checkedIn, waitlist }

/// Spec: design-specs/AttendeeList.json (route "/manage/events/:id/attendees").
/// QRScan (deviation: deferred), Search, SegmentedControl, AttendeeRow with checkInBox, CheckInAll FAB.
class AttendeeListScreen extends ConsumerStatefulWidget {
  const AttendeeListScreen({super.key, required this.eventId});
  final String eventId;

  @override
  ConsumerState<AttendeeListScreen> createState() => _State();
}

class _State extends ConsumerState<AttendeeListScreen> {
  _AttFilter _filter = _AttFilter.all;
  String _query = '';

  bool _matches(Map<String, dynamic> r) {
    final status = (r['status'] as String?) ?? 'going';
    final attendedAt = r['attendedAt'];
    final checkedIn = attendedAt is String && attendedAt.isNotEmpty;
    final bucketOk = switch (_filter) {
      _AttFilter.all => true,
      _AttFilter.going => status == 'going',
      _AttFilter.checkedIn => checkedIn,
      _AttFilter.waitlist => status == 'waitlist',
    };
    if (!bucketOk) return false;
    if (_query.isEmpty) return true;
    final userId = (r['userId'] as String?) ?? '';
    return userId.contains(_query);
  }

  Future<void> _toggleCheckIn(String rsvpId) async {
    try {
      await ref.read(eventManagerRepoProvider).checkIn(widget.eventId, rsvpId);
      ref.invalidate(eventRsvpsProvider(widget.eventId));
      if (!mounted) return;
      ScaffoldMessenger.of(context).showSnackBar(const SnackBar(content: Text(S.attendeeCheckedIn)));
    } catch (_) {/* ignored */}
  }

  Future<void> _checkInAll() async {
    try {
      final n = await ref.read(eventManagerRepoProvider).checkInAll(widget.eventId);
      ref.invalidate(eventRsvpsProvider(widget.eventId));
      if (!mounted) return;
      ScaffoldMessenger.of(context).showSnackBar(
        SnackBar(content: Text('${S.checkInAllDone} ($n)')),
      );
    } catch (_) {/* ignored */}
  }

  @override
  Widget build(BuildContext context) {
    final p = context.palette;
    final t = Theme.of(context).textTheme;
    final async = ref.watch(eventRsvpsProvider(widget.eventId));

    return Directionality(
      textDirection: TextDirection.rtl,
      child: Scaffold(
        backgroundColor: p.background,
        appBar: AppBar(
          backgroundColor: p.background,
          elevation: 0,
          scrolledUnderElevation: 0,
          leading: AppBackButton(),
          title: Text(S.attendeesTitle, style: t.titleMedium!.copyWith(fontSize: 16)),
          centerTitle: true,
          actions: [
            IconButton(
              tooltip: 'QR Scan',
              onPressed: () => ScaffoldMessenger.of(context).showSnackBar(
                const SnackBar(content: Text('QR scan זמין בעדכון הבא.')),
              ),
              icon: Icon(Symbols.qr_code_scanner_rounded, color: p.onBackground),
            ),
          ],
        ),
        floatingActionButton: FloatingActionButton.extended(
          backgroundColor: p.brand,
          onPressed: _checkInAll,
          icon: const Icon(Symbols.done_all_rounded, color: Colors.white),
          label: Text(S.checkInAllCta, style: const TextStyle(color: Colors.white)),
        ),
        body: SafeArea(
          top: false,
          child: Column(
            children: [
              Padding(
                padding: const EdgeInsets.fromLTRB(20, 4, 20, 8),
                child: AppTextField(
                  hint: 'חיפוש',
                  leadingIcon: Symbols.search_rounded,
                  onChanged: (v) => setState(() => _query = v.trim()),
                ),
              ),
              Padding(
                padding: const EdgeInsets.fromLTRB(20, 4, 20, 12),
                child: SegmentedControl<_AttFilter>(
                  value: _filter,
                  options: const [
                    _AttFilter.all,
                    _AttFilter.going,
                    _AttFilter.checkedIn,
                    _AttFilter.waitlist,
                  ],
                  labels: const [
                    S.attendeesAll,
                    S.attendeesGoing,
                    S.attendeesCheckedIn,
                    S.attendeesWaitlist,
                  ],
                  onChanged: (v) => setState(() => _filter = v),
                ),
              ),
              Expanded(
                child: async.when(
                  loading: () => const _Loading(),
                  error: (e, _) => ErrorState(onRetry: () => ref.invalidate(eventRsvpsProvider(widget.eventId))),
                  data: (rows) {
                    final filtered = rows.where(_matches).toList();
                    if (filtered.isEmpty) {
                      return Padding(
                        padding: const EdgeInsets.symmetric(vertical: 40),
                        child: EmptyState(
                          icon: Symbols.group_off_rounded,
                          headline: S.attendeesEmpty,
                          body: '',
                        ),
                      );
                    }
                    return ListView.separated(
                      padding: const EdgeInsets.fromLTRB(20, 4, 20, 96),
                      itemCount: filtered.length,
                      separatorBuilder: (_, __) => const SizedBox(height: 8),
                      itemBuilder: (_, i) => _AttendeeRow(
                        rsvp: filtered[i],
                        onCheckIn: () => _toggleCheckIn(filtered[i]['id'] as String),
                      ),
                    );
                  },
                ),
              ),
            ],
          ),
        ),
      ),
    );
  }
}

class _AttendeeRow extends StatelessWidget {
  const _AttendeeRow({required this.rsvp, required this.onCheckIn});
  final Map<String, dynamic> rsvp;
  final VoidCallback onCheckIn;

  @override
  Widget build(BuildContext context) {
    final p = context.palette;
    final t = Theme.of(context).textTheme;
    final status = (rsvp['status'] as String?) ?? 'going';
    final paymentStatus = (rsvp['paymentStatus'] as String?) ?? 'none';
    final attendedAt = rsvp['attendedAt'];
    final checkedIn = attendedAt is String && attendedAt.isNotEmpty;
    final userId = (rsvp['userId'] as String?) ?? '';
    final shortId = userId.length > 6 ? userId.substring(userId.length - 6) : userId;

    Color badgeBg;
    Color badgeFg;
    String badge;
    if (checkedIn) {
      badge = S.attendeesCheckedIn;
      badgeBg = p.successWash;
      badgeFg = p.success;
    } else if (status == 'waitlist') {
      badge = S.attendeesWaitlist;
      badgeBg = p.warningWash;
      badgeFg = p.warning;
    } else {
      badge = paymentStatus == 'paid' ? S.rsvpStatusPaid : S.attendeesGoing;
      badgeBg = p.accentWash;
      badgeFg = p.accentInk;
    }

    return Container(
      padding: const EdgeInsets.all(12),
      decoration: BoxDecoration(
        color: p.surface,
        borderRadius: AppRadius.brMd,
        border: Border.all(color: p.border),
      ),
      child: Row(
        children: [
          Container(
            width: 36,
            height: 36,
            decoration: BoxDecoration(color: p.surface2, shape: BoxShape.circle),
            alignment: Alignment.center,
            child: Icon(Symbols.person_rounded, color: p.muted),
          ),
          const SizedBox(width: 12),
          Expanded(
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Text(
                  '…$shortId',
                  style: t.bodyMedium!.copyWith(fontSize: 14),
                ),
                const SizedBox(height: 2),
                Text(
                  badge,
                  style: t.labelSmall!.copyWith(color: badgeFg, fontSize: 11, fontWeight: FontWeight.w700),
                ),
              ],
            ),
          ),
          Material(
            color: badgeBg,
            shape: const CircleBorder(),
            child: InkWell(
              customBorder: const CircleBorder(),
              onTap: status == 'waitlist' ? null : onCheckIn,
              child: SizedBox(
                width: 36,
                height: 36,
                child: Icon(
                  checkedIn ? Symbols.check_circle_rounded : Symbols.check_rounded,
                  color: badgeFg,
                  size: 22,
                ),
              ),
            ),
          ),
        ],
      ),
    );
  }
}

class _Loading extends StatelessWidget {
  const _Loading();

  @override
  Widget build(BuildContext context) {
    return ListView.separated(
      padding: const EdgeInsets.fromLTRB(20, 4, 20, 24),
      itemCount: 6,
      separatorBuilder: (_, __) => const SizedBox(height: 8),
      itemBuilder: (_, __) => const LoadingShimmer(height: 60, radius: AppRadius.md),
    );
  }
}
