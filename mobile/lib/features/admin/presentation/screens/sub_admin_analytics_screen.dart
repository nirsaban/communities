import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';
import 'package:material_symbols_icons/symbols.dart';

import '../../../../commons.dart';
import '../../../../core/i18n/strings.dart';
import '../../../../data/models/admin_dto.dart';
import '../../../../shared/widgets/widgets.dart';
import '../../../events/presentation/providers/event_providers.dart';
import '../providers/admin_providers.dart';

/// Spec: design-specs/SubAdminAnalytics.json + AnalyticsAttendance + AnalyticsMemberGrowth +
/// AnalyticsMostActive. SegmentedControl(Growth/Attendance/Members) swaps the body.
/// Sub-admin sees the same screens; revenue widgets are gated and replaced by guard banner.
class SubAdminAnalyticsScreen extends ConsumerStatefulWidget {
  const SubAdminAnalyticsScreen({super.key, this.initialTab = 'growth'});
  final String initialTab; // growth | attendance | members
  @override
  ConsumerState<SubAdminAnalyticsScreen> createState() => _S();
}

class _S extends ConsumerState<SubAdminAnalyticsScreen> {
  late String _tab;
  @override
  void initState() {
    super.initState();
    _tab = widget.initialTab;
  }

  @override
  Widget build(BuildContext context) {
    final p = context.palette;
    final t = Theme.of(context).textTheme;
    final cid = ref.watch(activeCommunityIdProvider);
    return Directionality(
      textDirection: TextDirection.rtl,
      child: Scaffold(
        backgroundColor: p.background,
        appBar: AppBar(
          backgroundColor: p.background,
          elevation: 0,
          scrolledUnderElevation: 0,
          leading: AppBackButton(),
          title: Text(S.analyticsTitle, style: t.titleMedium!.copyWith(fontSize: 16)),
          centerTitle: true,
        ),
        body: cid == null
            ? const Center(child: Text(S.noCommunities))
            : SafeArea(
                top: false,
                child: Column(
                  children: [
                    Padding(
                      padding: const EdgeInsets.fromLTRB(20, 8, 20, 12),
                      child: _SegBar(
                        value: _tab,
                        onChanged: (v) {
                          setState(() => _tab = v);
                          // Keep URL aligned per spec deep-links.
                          final path = switch (v) {
                            'attendance' => '/admin/analytics/attendance',
                            'members' => '/admin/analytics/members',
                            _ => '/admin/analytics/growth',
                          };
                          GoRouter.of(context).go(path);
                        },
                      ),
                    ),
                    Padding(
                      padding: const EdgeInsets.fromLTRB(20, 0, 20, 12),
                      child: Container(
                        padding: const EdgeInsets.all(12),
                        decoration: BoxDecoration(
                          color: p.surface2,
                          borderRadius: AppRadius.brMd,
                        ),
                        child: Row(
                          children: [
                            Icon(Symbols.lock_rounded, size: 16, color: p.muted),
                            const SizedBox(width: 8),
                            Expanded(
                              child: Text(
                                S.revenueGuardBanner,
                                style: t.bodyMedium!.copyWith(color: p.muted, fontSize: 12),
                              ),
                            ),
                          ],
                        ),
                      ),
                    ),
                    Expanded(child: _body(cid)),
                  ],
                ),
              ),
      ),
    );
  }

  Widget _body(String cid) {
    switch (_tab) {
      case 'attendance':
        return _AttendanceTab(cid: cid);
      case 'members':
        return _LeaderTab(cid: cid);
      default:
        return _GrowthTab(cid: cid);
    }
  }
}

class _SegBar extends StatelessWidget {
  const _SegBar({required this.value, required this.onChanged});
  final String value;
  final ValueChanged<String> onChanged;
  @override
  Widget build(BuildContext context) {
    final p = context.palette;
    Widget seg(String v, String label) {
      final selected = value == v;
      return Expanded(
        child: Material(
          color: selected ? p.surface : Colors.transparent,
          borderRadius: AppRadius.brFull,
          child: InkWell(
            borderRadius: AppRadius.brFull,
            onTap: () => onChanged(v),
            child: Container(
              height: 36,
              alignment: Alignment.center,
              child: Text(
                label,
                style: TextStyle(
                  fontWeight: FontWeight.w700,
                  fontSize: 13.5,
                  color: selected ? p.onBackground : p.muted,
                ),
              ),
            ),
          ),
        ),
      );
    }
    return Container(
      padding: const EdgeInsets.all(4),
      decoration: BoxDecoration(color: p.surface2, borderRadius: AppRadius.brFull),
      child: Row(
        children: [
          seg('growth', S.analyticsTabGrowth),
          seg('attendance', S.analyticsTabAttendance),
          seg('members', S.analyticsTabMembers),
        ],
      ),
    );
  }
}

class _GrowthTab extends ConsumerWidget {
  const _GrowthTab({required this.cid});
  final String cid;
  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final p = context.palette;
    final t = Theme.of(context).textTheme;
    final async = ref.watch(growthAnalyticsProvider(cid));
    return async.when(
      loading: () => const Center(child: CircularProgressIndicator()),
      error: (e, _) => ErrorState(onRetry: () => ref.invalidate(growthAnalyticsProvider(cid))),
      data: (g) => ListView(
        padding: const EdgeInsets.fromLTRB(20, 4, 20, 24),
        children: [
          Text(S.totalMembers, style: t.labelSmall!.copyWith(color: p.muted, fontSize: 11.5)),
          const SizedBox(height: 4),
          Text('${g.total}', style: t.displayLarge!.copyWith(fontSize: 40)),
          const SizedBox(height: 18),
          _AreaChart(points: g.series),
          const SizedBox(height: 18),
          Row(
            children: [
              Expanded(child: _KpiSmall(label: S.joined90d, value: '${g.joined90d}', color: p.success)),
              const SizedBox(width: 12),
              Expanded(child: _KpiSmall(label: S.left90d, value: '${g.left90d}', color: p.muted)),
              const SizedBox(width: 12),
              Expanded(child: _KpiSmall(label: S.net90d, value: '${g.net90d}', color: p.accentInk)),
            ],
          ),
        ],
      ),
    );
  }
}

class _AttendanceTab extends ConsumerWidget {
  const _AttendanceTab({required this.cid});
  final String cid;
  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final p = context.palette;
    final t = Theme.of(context).textTheme;
    final async = ref.watch(attendanceAnalyticsProvider(cid));
    return async.when(
      loading: () => const Center(child: CircularProgressIndicator()),
      error: (e, _) => ErrorState(onRetry: () => ref.invalidate(attendanceAnalyticsProvider(cid))),
      data: (a) {
        if (a.perEvent.isEmpty) {
          return EmptyState(icon: Symbols.bar_chart_rounded, headline: S.leaderboardEmpty, body: '');
        }
        return ListView(
          padding: const EdgeInsets.fromLTRB(20, 4, 20, 24),
          children: [
            Text(S.attendanceRate, style: t.labelSmall!.copyWith(color: p.muted, fontSize: 11.5)),
            const SizedBox(height: 4),
            Text('${a.rate}%', style: t.displayLarge!.copyWith(fontSize: 40)),
            const SizedBox(height: 18),
            _BarChart(rows: a.perEvent),
            if (a.bestTurnout.isNotEmpty) ...[
              const SizedBox(height: 18),
              SectionHeader(S.bestTurnout),
              const SizedBox(height: 8),
              ...a.bestTurnout.map((r) => _AttendanceRow(row: r)),
            ],
            if (a.worstTurnout.isNotEmpty) ...[
              const SizedBox(height: 18),
              SectionHeader(S.worstTurnout),
              const SizedBox(height: 8),
              ...a.worstTurnout.map((r) => _AttendanceRow(row: r)),
            ],
          ],
        );
      },
    );
  }
}

class _LeaderTab extends ConsumerWidget {
  const _LeaderTab({required this.cid});
  final String cid;
  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final p = context.palette;
    final t = Theme.of(context).textTheme;
    final async = ref.watch(mostActiveProvider(cid));
    return async.when(
      loading: () => const Center(child: CircularProgressIndicator()),
      error: (e, _) => ErrorState(onRetry: () => ref.invalidate(mostActiveProvider(cid))),
      data: (rows) {
        if (rows.isEmpty) {
          return EmptyState(icon: Symbols.leaderboard_rounded, headline: S.leaderboardEmpty, body: '');
        }
        final maxAttended = rows.first.attended <= 0 ? 1 : rows.first.attended;
        return ListView.separated(
          padding: const EdgeInsets.fromLTRB(20, 4, 20, 24),
          itemCount: rows.length,
          separatorBuilder: (_, __) => const SizedBox(height: 8),
          itemBuilder: (_, i) {
            final r = rows[i];
            return Container(
              padding: const EdgeInsets.all(12),
              decoration: BoxDecoration(
                color: p.surface,
                borderRadius: AppRadius.brMd,
                border: Border.all(color: p.border),
              ),
              child: Row(
                children: [
                  SizedBox(
                    width: 24,
                    child: Text(
                      '${r.rank}',
                      style: t.titleMedium!.copyWith(fontSize: 16, color: p.muted),
                    ),
                  ),
                  Container(
                    width: 32,
                    height: 32,
                    decoration: BoxDecoration(color: p.surface2, shape: BoxShape.circle),
                    alignment: Alignment.center,
                    child: Icon(Symbols.person_rounded, color: p.muted),
                  ),
                  const SizedBox(width: 10),
                  Expanded(
                    child: Column(
                      crossAxisAlignment: CrossAxisAlignment.start,
                      children: [
                        Text(r.name.isEmpty ? r.email : r.name,
                            style: t.titleMedium!.copyWith(fontSize: 14, fontWeight: FontWeight.w700)),
                        const SizedBox(height: 4),
                        ClipRRect(
                          borderRadius: BorderRadius.circular(4),
                          child: SizedBox(
                            height: 6,
                            child: Stack(children: [
                              Container(color: p.surface2),
                              FractionallySizedBox(
                                widthFactor: (r.attended / maxAttended).clamp(0.05, 1.0),
                                child: Container(color: p.brand),
                              ),
                            ]),
                          ),
                        ),
                      ],
                    ),
                  ),
                  const SizedBox(width: 12),
                  Column(
                    children: [
                      Text('${r.attended}', style: t.titleMedium!.copyWith(fontWeight: FontWeight.w700)),
                      Text('נוכחות', style: t.labelSmall!.copyWith(color: p.muted, fontSize: 10.5)),
                    ],
                  ),
                ],
              ),
            );
          },
        );
      },
    );
  }
}

class _KpiSmall extends StatelessWidget {
  const _KpiSmall({required this.label, required this.value, required this.color});
  final String label;
  final String value;
  final Color color;
  @override
  Widget build(BuildContext context) {
    final p = context.palette;
    return Container(
      padding: const EdgeInsets.symmetric(vertical: 12),
      decoration: BoxDecoration(
        color: p.surface,
        borderRadius: AppRadius.brMd,
        border: Border.all(color: p.border),
      ),
      child: Column(
        children: [
          Text(value, style: TextStyle(fontSize: 20, fontWeight: FontWeight.w700, color: color)),
          const SizedBox(height: 2),
          Text(label, style: TextStyle(fontSize: 11, color: p.muted)),
        ],
      ),
    );
  }
}

class _AreaChart extends StatelessWidget {
  const _AreaChart({required this.points});
  final List<GrowthPoint> points;
  @override
  Widget build(BuildContext context) {
    final p = context.palette;
    if (points.isEmpty) {
      return Container(
        height: 140,
        decoration: BoxDecoration(color: p.surface2, borderRadius: AppRadius.brMd),
        alignment: Alignment.center,
        child: Text('אין נתונים ב-90 ימים האחרונים', style: TextStyle(color: p.muted, fontSize: 12)),
      );
    }
    final values = points.map((e) => e.total).toList();
    final maxV = values.reduce((a, b) => a > b ? a : b);
    return CustomPaint(
      size: const Size(double.infinity, 140),
      painter: _AreaPainter(values: values, maxV: maxV == 0 ? 1 : maxV, color: p.brand),
    );
  }
}

class _AreaPainter extends CustomPainter {
  _AreaPainter({required this.values, required this.maxV, required this.color});
  final List<int> values;
  final int maxV;
  final Color color;
  @override
  void paint(Canvas canvas, Size size) {
    final fill = Paint()..color = color.withValues(alpha: 0.18);
    final stroke = Paint()
      ..color = color
      ..style = PaintingStyle.stroke
      ..strokeWidth = 2;
    final path = Path();
    final step = values.length <= 1 ? size.width : size.width / (values.length - 1);
    for (var i = 0; i < values.length; i++) {
      final x = i * step;
      final y = size.height - (values[i] / maxV) * size.height;
      if (i == 0) path.moveTo(x, y);
      else path.lineTo(x, y);
    }
    final fillPath = Path.from(path)
      ..lineTo(size.width, size.height)
      ..lineTo(0, size.height)
      ..close();
    canvas.drawPath(fillPath, fill);
    canvas.drawPath(path, stroke);
  }

  @override
  bool shouldRepaint(covariant _AreaPainter old) => old.values != values || old.maxV != maxV;
}

class _BarChart extends StatelessWidget {
  const _BarChart({required this.rows});
  final List<AttendanceRow> rows;
  @override
  Widget build(BuildContext context) {
    final p = context.palette;
    final maxR = rows.map((r) => r.rsvped).fold<int>(1, (m, v) => v > m ? v : m);
    return SizedBox(
      height: 140,
      child: Row(
        crossAxisAlignment: CrossAxisAlignment.end,
        children: rows.take(10).map((r) {
          final rsvpH = (r.rsvped / maxR) * 120;
          final attH = (r.attended / maxR) * 120;
          return Expanded(
            child: Padding(
              padding: const EdgeInsets.symmetric(horizontal: 3),
              child: Column(
                mainAxisAlignment: MainAxisAlignment.end,
                children: [
                  Stack(
                    alignment: Alignment.bottomCenter,
                    children: [
                      Container(width: double.infinity, height: rsvpH, color: p.surface2),
                      Container(width: double.infinity, height: attH, color: p.brand),
                    ],
                  ),
                  const SizedBox(height: 4),
                  Text(
                    '${r.startAt.day}/${r.startAt.month}',
                    style: TextStyle(fontSize: 9.5, color: p.muted),
                  ),
                ],
              ),
            ),
          );
        }).toList(),
      ),
    );
  }
}

class _AttendanceRow extends StatelessWidget {
  const _AttendanceRow({required this.row});
  final AttendanceRow row;
  @override
  Widget build(BuildContext context) {
    final p = context.palette;
    final t = Theme.of(context).textTheme;
    return Container(
      padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 10),
      margin: const EdgeInsets.only(bottom: 6),
      decoration: BoxDecoration(
        color: p.surface,
        borderRadius: AppRadius.brMd,
        border: Border.all(color: p.border),
      ),
      child: Row(
        children: [
          Expanded(
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Text(row.title, style: t.titleMedium!.copyWith(fontSize: 14, fontWeight: FontWeight.w700)),
                Text(
                  '${row.attended} / ${row.rsvped} (${(row.rate * 100).toStringAsFixed(0)}%)',
                  style: t.labelSmall!.copyWith(color: p.muted, fontSize: 11.5),
                ),
              ],
            ),
          ),
        ],
      ),
    );
  }
}
