import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';
import 'package:material_symbols_icons/symbols.dart';

import '../../../../commons.dart';
import '../../../../core/i18n/strings.dart';
import '../../../../shared/widgets/widgets.dart';
import '../providers/super_providers.dart';

/// Spec: design-specs/GlobalUserList.json (super_admin). Search + status filter chips +
/// user rows w/ role badge. Disabled accounts dimmed.
class GlobalUserListScreen extends ConsumerStatefulWidget {
  const GlobalUserListScreen({super.key});
  @override
  ConsumerState<GlobalUserListScreen> createState() => _S();
}

class _S extends ConsumerState<GlobalUserListScreen> {
  String _q = '';
  String? _status;

  @override
  Widget build(BuildContext context) {
    final p = context.palette;
    final t = Theme.of(context).textTheme;
    final async = ref.watch(superUsersProvider(SuperUserQuery(search: _q, status: _status)));
    return Directionality(
      textDirection: TextDirection.rtl,
      child: Scaffold(
        backgroundColor: p.background,
        appBar: AppBar(
          backgroundColor: p.background,
          elevation: 0,
          scrolledUnderElevation: 0,
          leading: AppBackButton(),
          title: Text(S.superUsersTitle, style: t.titleMedium!.copyWith(fontSize: 16)),
          centerTitle: true,
        ),
        body: SafeArea(
          top: false,
          child: Column(
            children: [
              Padding(
                padding: const EdgeInsets.fromLTRB(20, 4, 20, 8),
                child: AppTextField(
                  hint: S.memberListSearchHint,
                  leadingIcon: Symbols.search_rounded,
                  onChanged: (v) => setState(() => _q = v.trim()),
                ),
              ),
              Padding(
                padding: const EdgeInsets.fromLTRB(20, 4, 20, 8),
                child: Wrap(
                  spacing: 8,
                  children: [
                    _Chip(label: S.roleFilterAll, value: null, selected: _status, onTap: (v) => setState(() => _status = v)),
                    _Chip(label: 'פעילים', value: 'active', selected: _status, onTap: (v) => setState(() => _status = v)),
                    _Chip(label: 'מושבתים', value: 'disabled', selected: _status, onTap: (v) => setState(() => _status = v)),
                  ],
                ),
              ),
              Expanded(
                child: async.when(
                  loading: () => const Center(child: CircularProgressIndicator()),
                  error: (e, _) => ErrorState(onRetry: () => ref.invalidate(superUsersProvider(SuperUserQuery(search: _q, status: _status)))),
                  data: (rows) {
                    if (rows.isEmpty) return EmptyState(icon: Symbols.person_off_rounded, headline: S.superUsersEmpty, body: '');
                    return ListView.separated(
                      padding: const EdgeInsets.fromLTRB(20, 4, 20, 24),
                      itemCount: rows.length,
                      separatorBuilder: (_, __) => const SizedBox(height: 8),
                      itemBuilder: (_, i) => _UserRow(row: rows[i]),
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

class _UserRow extends StatelessWidget {
  const _UserRow({required this.row});
  final Map<String, dynamic> row;
  @override
  Widget build(BuildContext context) {
    final p = context.palette;
    final t = Theme.of(context).textTheme;
    final uid = (row['id'] as String?) ?? '';
    final email = (row['email'] as String?) ?? '';
    final name = (row['name'] as String?) ?? '';
    final status = (row['status'] as String?) ?? 'active';
    final globalRole = (row['globalRole'] as String?) ?? 'user';
    final isDisabled = status == 'disabled';
    return Opacity(
      opacity: isDisabled ? 0.55 : 1.0,
      child: InkWell(
        borderRadius: AppRadius.brMd,
        onTap: () => GoRouter.of(context).push('/super/users/$uid'),
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
                    Text(name.isEmpty ? email : name, style: t.bodyMedium!.copyWith(fontWeight: FontWeight.w700, fontSize: 14)),
                    if (name.isNotEmpty && email.isNotEmpty)
                      Text(email, style: t.labelSmall!.copyWith(color: p.muted, fontSize: 11.5)),
                  ],
                ),
              ),
              Container(
                height: 22,
                padding: const EdgeInsets.symmetric(horizontal: 10),
                decoration: BoxDecoration(
                  color: globalRole == 'superadmin' ? p.accentInk : p.surface2,
                  borderRadius: AppRadius.brFull,
                ),
                alignment: Alignment.center,
                child: Text(
                  globalRole == 'superadmin' ? 'super' : status,
                  style: TextStyle(
                    fontSize: 10.5,
                    fontWeight: FontWeight.w700,
                    color: globalRole == 'superadmin' ? Colors.white : p.muted,
                  ),
                ),
              ),
            ],
          ),
        ),
      ),
    );
  }
}
