import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';
import 'package:material_symbols_icons/symbols.dart';

import '../../../../commons.dart';
import '../../../../core/i18n/strings.dart';
import '../../../../shared/widgets/widgets.dart';
import '../providers/super_providers.dart';

/// Spec adapt: super's "CommunitiesList" (route originally `/super/communities`).
/// Lists every community on the platform — active + suspended dimmed.
class SuperCommunitiesListScreen extends ConsumerStatefulWidget {
  const SuperCommunitiesListScreen({super.key});
  @override
  ConsumerState<SuperCommunitiesListScreen> createState() => _S();
}

class _S extends ConsumerState<SuperCommunitiesListScreen> {
  String? _status;

  @override
  Widget build(BuildContext context) {
    final p = context.palette;
    final t = Theme.of(context).textTheme;
    final async = ref.watch(superCommunitiesProvider(_status));
    return Directionality(
      textDirection: TextDirection.rtl,
      child: Scaffold(
        backgroundColor: p.background,
        appBar: AppBar(
          backgroundColor: p.background,
          elevation: 0,
          scrolledUnderElevation: 0,
          leading: AppBackButton(),
          title: Text(S.superCommunitiesTitle, style: t.titleMedium!.copyWith(fontSize: 16)),
          centerTitle: true,
        ),
        floatingActionButton: FloatingActionButton.extended(
          backgroundColor: p.brand,
          onPressed: () => GoRouter.of(context).push('/super/communities/new'),
          icon: const Icon(Symbols.add_rounded, color: Colors.white),
          label: Text(S.superCommunitiesNew, style: const TextStyle(color: Colors.white)),
        ),
        body: SafeArea(
          top: false,
          child: Column(
            children: [
              Padding(
                padding: const EdgeInsets.fromLTRB(20, 4, 20, 8),
                child: Wrap(
                  spacing: 8,
                  children: [
                    _Chip(label: S.roleFilterAll, value: null, selected: _status, onTap: (v) => setState(() => _status = v)),
                    _Chip(label: 'פעילות', value: 'active', selected: _status, onTap: (v) => setState(() => _status = v)),
                    _Chip(label: 'מושעות', value: 'suspended', selected: _status, onTap: (v) => setState(() => _status = v)),
                  ],
                ),
              ),
              Expanded(
                child: async.when(
                  loading: () => const Center(child: CircularProgressIndicator()),
                  error: (e, _) => ErrorState(onRetry: () => ref.invalidate(superCommunitiesProvider(_status))),
                  data: (rows) {
                    if (rows.isEmpty) return EmptyState(icon: Symbols.groups_rounded, headline: S.noCommunities, body: '');
                    return ListView.separated(
                      padding: const EdgeInsets.fromLTRB(20, 4, 20, 96),
                      itemCount: rows.length,
                      separatorBuilder: (_, __) => const SizedBox(height: 8),
                      itemBuilder: (_, i) => _Row(row: rows[i]),
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
  final String? value;
  final String? selected;
  final ValueChanged<String?> onTap;
  @override
  Widget build(BuildContext context) {
    final p = context.palette;
    final isSelected = value == selected;
    return InkWell(
      borderRadius: AppRadius.brFull,
      onTap: () => onTap(value),
      child: Container(
        padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 8),
        decoration: BoxDecoration(
          color: isSelected ? p.accentWash : p.surface,
          borderRadius: AppRadius.brFull,
          border: Border.all(color: isSelected ? p.brand : p.border),
        ),
        child: Text(label, style: TextStyle(fontWeight: FontWeight.w700, color: isSelected ? p.accentInk : p.onBackground)),
      ),
    );
  }
}

class _Row extends StatelessWidget {
  const _Row({required this.row});
  final Map<String, dynamic> row;
  @override
  Widget build(BuildContext context) {
    final p = context.palette;
    final t = Theme.of(context).textTheme;
    final cid = (row['id'] as String?) ?? '';
    final name = (row['name'] as String?) ?? '';
    final status = (row['status'] as String?) ?? 'active';
    final metrics = (row['metrics'] as Map<String, dynamic>?) ?? const {};
    final isSuspended = status == 'suspended';
    return Opacity(
      opacity: isSuspended ? 0.55 : 1.0,
      child: InkWell(
        borderRadius: AppRadius.brMd,
        onTap: () => GoRouter.of(context).push('/super/communities/$cid'),
        child: Container(
          padding: const EdgeInsets.all(12),
          decoration: BoxDecoration(
            color: p.surface,
            borderRadius: AppRadius.brMd,
            border: Border.all(color: isSuspended ? p.warning : p.border),
          ),
          child: Row(
            children: [
              Container(
                width: 36,
                height: 36,
                decoration: BoxDecoration(color: p.accentWash, borderRadius: BorderRadius.circular(10)),
                alignment: Alignment.center,
                child: Icon(Symbols.groups_rounded, color: p.accentInk),
              ),
              const SizedBox(width: 12),
              Expanded(
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    Text(name, style: t.titleMedium!.copyWith(fontWeight: FontWeight.w700, fontSize: 14)),
                    Text(
                      '${metrics['memberCount'] ?? 0} ${S.superCommunityVitalMembers}',
                      style: t.labelSmall!.copyWith(color: p.muted, fontSize: 11.5),
                    ),
                  ],
                ),
              ),
              if (isSuspended)
                Container(
                  height: 22,
                  padding: const EdgeInsets.symmetric(horizontal: 10),
                  decoration: BoxDecoration(color: p.warningWash, borderRadius: AppRadius.brFull),
                  alignment: Alignment.center,
                  child: Text('מושעית', style: TextStyle(fontSize: 11, fontWeight: FontWeight.w700, color: p.warning)),
                ),
            ],
          ),
        ),
      ),
    );
  }
}
