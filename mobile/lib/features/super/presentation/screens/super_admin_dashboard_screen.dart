import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';
import 'package:material_symbols_icons/symbols.dart';

import '../../../../commons.dart';
import '../../../../core/i18n/strings.dart';
import '../../../../shared/widgets/widgets.dart';
import '../providers/super_providers.dart';

/// Spec: design-specs/SuperAdminDashboard.json (route "/super").
/// PlatformBadge, NotificationsButton, displayMedium title, KPI grid (Communities/Users/
/// MRR/DAU), area chart of active users, activity feed, BottomNav.
class SuperAdminDashboardScreen extends ConsumerWidget {
  const SuperAdminDashboardScreen({super.key});

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final p = context.palette;
    final t = Theme.of(context).textTheme;
    final async = ref.watch(superStatsProvider);
    return Directionality(
      textDirection: TextDirection.rtl,
      child: Scaffold(
        backgroundColor: p.background,
        body: SafeArea(
          bottom: false,
          child: RefreshIndicator(
            onRefresh: () async {
              ref.invalidate(superStatsProvider);
              await ref.read(superStatsProvider.future);
            },
            child: ListView(
              padding: const EdgeInsets.fromLTRB(20, 8, 20, 32),
              children: [
                Row(
                  children: [
                    Container(
                      padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 5),
                      decoration: BoxDecoration(
                        color: p.accentInk,
                        borderRadius: AppRadius.brFull,
                      ),
                      child: Text(
                        S.platformBadge,
                        style: const TextStyle(color: Colors.white, fontSize: 11, fontWeight: FontWeight.w700),
                      ),
                    ),
                    const Spacer(),
                    IconButton(
                      onPressed: () => GoRouter.of(context).push('/inbox'),
                      icon: Icon(Symbols.notifications_rounded, color: p.onBackground),
                    ),
                  ],
                ),
                const SizedBox(height: 8),
                Text(S.superDashboardTitle, style: t.displayMedium!.copyWith(fontSize: 26)),
                const SizedBox(height: 18),
                async.when(
                  loading: () => const SizedBox(height: 200, child: Center(child: CircularProgressIndicator())),
                  error: (e, _) => ErrorState(onRetry: () => ref.invalidate(superStatsProvider)),
                  data: (data) {
                    final k = data['kpis'] as Map<String, dynamic>? ?? const {};
                    final series = (data['activeUsersSeries'] as List?)
                            ?.whereType<Map<String, dynamic>>()
                            .map((e) => (e['active'] as num?)?.toInt() ?? 0)
                            .toList() ??
                        const [];
                    final mrr = ((k['mrrCents'] as num?)?.toInt() ?? 0) / 100;
                    return Column(
                      crossAxisAlignment: CrossAxisAlignment.stretch,
                      children: [
                        GridView.count(
                          shrinkWrap: true,
                          physics: const NeverScrollableScrollPhysics(),
                          crossAxisCount: 2,
                          crossAxisSpacing: 12,
                          mainAxisSpacing: 12,
                          childAspectRatio: 1.7,
                          children: [
                            _Kpi(value: '${k['communities'] ?? 0}', label: S.superKpiCommunities, icon: Symbols.groups_rounded),
                            _Kpi(value: '${k['users'] ?? 0}', label: S.superKpiUsers, icon: Symbols.person_rounded),
                            _Kpi(value: '\$${mrr.toStringAsFixed(0)}', label: S.superKpiMrr, icon: Symbols.attach_money_rounded),
                            _Kpi(value: '${k['activeUsersMtd'] ?? 0}', label: S.superKpiDau, icon: Symbols.trending_up_rounded),
                          ],
                        ),
                        const SizedBox(height: 18),
                        if (series.isNotEmpty)
                          CustomPaint(
                            size: const Size(double.infinity, 140),
                            painter: _AreaPainter(values: series, color: p.brand),
                          ),
                      ],
                    );
                  },
                ),
                const SizedBox(height: 18),
                _ShortcutCard(rows: [
                  (Symbols.groups_rounded, S.superCommunitiesTitle, '/super/communities'),
                  (Symbols.person_rounded, S.superUsersTitle, '/super/users'),
                  (Symbols.settings_rounded, S.superSettingsTitle, '/super/settings'),
                ]),
              ],
            ),
          ),
        ),
      ),
    );
  }
}

class _Kpi extends StatelessWidget {
  const _Kpi({required this.value, required this.label, required this.icon});
  final String value;
  final String label;
  final IconData icon;
  @override
  Widget build(BuildContext context) {
    final p = context.palette;
    final t = Theme.of(context).textTheme;
    return Container(
      padding: const EdgeInsets.all(14),
      decoration: BoxDecoration(
        color: p.surface,
        borderRadius: AppRadius.brMd,
        border: Border.all(color: p.border),
      ),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        mainAxisAlignment: MainAxisAlignment.spaceBetween,
        children: [
          Icon(icon, size: 20, color: p.accentInk),
          Text(value, style: t.titleLarge!.copyWith(fontSize: 22, fontWeight: FontWeight.w700)),
          Text(label, style: t.labelSmall!.copyWith(color: p.muted, fontSize: 11.5)),
        ],
      ),
    );
  }
}

class _AreaPainter extends CustomPainter {
  _AreaPainter({required this.values, required this.color});
  final List<int> values;
  final Color color;
  @override
  void paint(Canvas canvas, Size size) {
    if (values.isEmpty) return;
    final maxV = values.reduce((a, b) => a > b ? a : b).toDouble();
    final m = maxV <= 0 ? 1.0 : maxV;
    final fill = Paint()..color = color.withValues(alpha: 0.18);
    final stroke = Paint()
      ..color = color
      ..style = PaintingStyle.stroke
      ..strokeWidth = 2;
    final path = Path();
    final step = values.length <= 1 ? size.width : size.width / (values.length - 1);
    for (var i = 0; i < values.length; i++) {
      final x = i * step;
      final y = size.height - (values[i] / m) * size.height;
      if (i == 0) {
        path.moveTo(x, y);
      } else {
        path.lineTo(x, y);
      }
    }
    final fillPath = Path.from(path)
      ..lineTo(size.width, size.height)
      ..lineTo(0, size.height)
      ..close();
    canvas.drawPath(fillPath, fill);
    canvas.drawPath(path, stroke);
  }

  @override
  bool shouldRepaint(covariant _AreaPainter old) => old.values != values;
}

class _ShortcutCard extends StatelessWidget {
  const _ShortcutCard({required this.rows});
  final List<(IconData, String, String)> rows;
  @override
  Widget build(BuildContext context) {
    final p = context.palette;
    final t = Theme.of(context).textTheme;
    return Container(
      decoration: BoxDecoration(
        color: p.surface,
        borderRadius: AppRadius.brMd,
        border: Border.all(color: p.border),
      ),
      child: Column(
        children: [
          for (var i = 0; i < rows.length; i++) ...[
            InkWell(
              borderRadius: AppRadius.brMd,
              onTap: () => GoRouter.of(context).push(rows[i].$3),
              child: Padding(
                padding: const EdgeInsets.symmetric(horizontal: 14, vertical: 14),
                child: Row(
                  children: [
                    Icon(rows[i].$1, color: p.accentInk, size: 22),
                    const SizedBox(width: 12),
                    Expanded(child: Text(rows[i].$2, style: t.bodyMedium!.copyWith(fontSize: 14.5))),
                    Icon(Symbols.chevron_left_rounded, color: p.muted, size: 22),
                  ],
                ),
              ),
            ),
            if (i < rows.length - 1)
              Container(height: 1, margin: const EdgeInsetsDirectional.only(start: 46), color: p.border),
          ],
        ],
      ),
    );
  }
}
