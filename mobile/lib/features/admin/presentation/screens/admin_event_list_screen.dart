import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';
import 'package:material_symbols_icons/symbols.dart';

import '../../../../commons.dart';
import '../../../../core/i18n/strings.dart';
import '../../../../data/models/event_dto.dart';
import '../../../../data/repositories/event_repository.dart';
import '../../../../shared/widgets/widgets.dart';
import '../../../events/presentation/providers/event_providers.dart';

/// Spec: design-specs/AdminEventList.json — admin-side event list with status filter.
/// Uses existing `GET /communities/:cid/events?status=...`.
class AdminEventListScreen extends ConsumerStatefulWidget {
  const AdminEventListScreen({super.key});
  @override
  ConsumerState<AdminEventListScreen> createState() => _S();
}

class _S extends ConsumerState<AdminEventListScreen> {
  String _status = 'all';

  Future<List<EventDto>> _load(String cid) async {
    final repo = ref.read(eventRepositoryProvider);
    final filter = EventListFilter(
      status: _status == 'all' ? null : _status,
      limit: 100,
    );
    final page = await repo.list(cid, filter);
    return page.items;
  }

  @override
  Widget build(BuildContext context) {
    final p = context.palette;
    final t = Theme.of(context).textTheme;
    final cid = ref.watch(activeCommunityIdProvider);
    if (cid == null) return const Scaffold(body: Center(child: Text(S.noCommunities)));
    return Directionality(
      textDirection: TextDirection.rtl,
      child: Scaffold(
        backgroundColor: p.background,
        appBar: AppBar(
          backgroundColor: p.background,
          elevation: 0,
          scrolledUnderElevation: 0,
          leading: AppBackButton(),
          title: Text(S.adminEventsTitle, style: t.titleMedium!.copyWith(fontSize: 16)),
          centerTitle: true,
        ),
        floatingActionButton: FloatingActionButton.extended(
          backgroundColor: p.brand,
          onPressed: () => GoRouter.of(context).push('/admin/events/new'),
          icon: const Icon(Symbols.add_rounded, color: Colors.white),
          label: Text(S.adminEventNew, style: const TextStyle(color: Colors.white)),
        ),
        body: SafeArea(
          top: false,
          child: Column(
            children: [
              Padding(
                padding: const EdgeInsets.fromLTRB(20, 8, 20, 12),
                child: SingleChildScrollView(
                  scrollDirection: Axis.horizontal,
                  reverse: true,
                  child: Row(children: [
                    _Chip(label: S.adminEventsAll, value: 'all', selected: _status, onTap: (v) => setState(() => _status = v)),
                    _Chip(label: S.adminEventsDraft, value: 'draft', selected: _status, onTap: (v) => setState(() => _status = v)),
                    _Chip(label: S.adminEventsPublished, value: 'published', selected: _status, onTap: (v) => setState(() => _status = v)),
                    _Chip(label: S.adminEventsCancelled, value: 'cancelled', selected: _status, onTap: (v) => setState(() => _status = v)),
                  ]),
                ),
              ),
              Expanded(
                child: FutureBuilder<List<EventDto>>(
                  future: _load(cid),
                  builder: (ctx, snap) {
                    if (!snap.hasData) return const Center(child: CircularProgressIndicator());
                    final rows = snap.data!;
                    if (rows.isEmpty) {
                      return EmptyState(icon: Symbols.event_busy_rounded, headline: S.adminEventsEmpty, body: '');
                    }
                    return ListView.separated(
                      padding: const EdgeInsets.fromLTRB(20, 4, 20, 96),
                      itemCount: rows.length,
                      separatorBuilder: (_, __) => const SizedBox(height: 8),
                      itemBuilder: (_, i) => _Row(event: rows[i]),
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

class _Chip extends StatelessWidget {
  const _Chip({required this.label, required this.value, required this.selected, required this.onTap});
  final String label;
  final String value;
  final String selected;
  final ValueChanged<String> onTap;
  @override
  Widget build(BuildContext context) {
    final p = context.palette;
    final isSelected = value == selected;
    return Padding(
      padding: const EdgeInsets.only(right: 8),
      child: InkWell(
        borderRadius: AppRadius.brFull,
        onTap: () => onTap(value),
        child: Container(
          padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 8),
          decoration: BoxDecoration(
            color: isSelected ? p.accentWash : p.surface,
            borderRadius: AppRadius.brFull,
            border: Border.all(color: isSelected ? p.brand : p.border),
          ),
          child: Text(label,
              style: TextStyle(
                fontWeight: FontWeight.w700,
                fontSize: 12.5,
                color: isSelected ? p.accentInk : p.onBackground,
              )),
        ),
      ),
    );
  }
}

class _Row extends StatelessWidget {
  const _Row({required this.event});
  final EventDto event;
  @override
  Widget build(BuildContext context) {
    final p = context.palette;
    final t = Theme.of(context).textTheme;
    return InkWell(
      borderRadius: AppRadius.brMd,
      onTap: () => GoRouter.of(context).push('/admin/events/${event.id}'),
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
              decoration: BoxDecoration(color: p.surface2, borderRadius: BorderRadius.circular(8)),
              alignment: Alignment.center,
              child: Icon(Symbols.event_rounded, color: p.muted),
            ),
            const SizedBox(width: 12),
            Expanded(
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  Text(event.title, style: t.titleMedium!.copyWith(fontSize: 14.5, fontWeight: FontWeight.w700)),
                  Text(
                    '${event.startAt.day}/${event.startAt.month}/${event.startAt.year} · ${event.metrics.rsvpCount} הרשמות',
                    style: t.labelSmall!.copyWith(color: p.muted, fontSize: 11.5),
                  ),
                ],
              ),
            ),
            _StatusBadge(status: event.status),
          ],
        ),
      ),
    );
  }
}

class _StatusBadge extends StatelessWidget {
  const _StatusBadge({required this.status});
  final String status;
  @override
  Widget build(BuildContext context) {
    final p = context.palette;
    Color bg;
    Color fg;
    switch (status) {
      case 'published':
        bg = p.successWash;
        fg = p.success;
      case 'cancelled':
        bg = p.errorWash;
        fg = p.error;
      case 'draft':
        bg = p.surface2;
        fg = p.muted;
      default:
        bg = p.accentWash;
        fg = p.accentInk;
    }
    return Container(
      height: 22,
      padding: const EdgeInsets.symmetric(horizontal: 10),
      decoration: BoxDecoration(color: bg, borderRadius: AppRadius.brFull),
      alignment: Alignment.center,
      child: Text(status, style: TextStyle(fontSize: 11, fontWeight: FontWeight.w700, color: fg)),
    );
  }
}
