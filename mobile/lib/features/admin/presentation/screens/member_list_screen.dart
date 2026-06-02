import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';
import 'package:material_symbols_icons/symbols.dart';

import '../../../../commons.dart';
import '../../../../core/i18n/strings.dart';
import '../../../../core/network/api_client.dart';
import '../../../../shared/widgets/widgets.dart';
import '../../../auth/presentation/providers/auth_providers.dart';
import '../../../events/presentation/providers/event_providers.dart';

/// Spec: design-specs/MemberList.json — search, role chips, member rows with role badge,
/// bulk-action bar (DEVIATION: bulk actions deferred).
class MemberListScreen extends ConsumerStatefulWidget {
  const MemberListScreen({super.key});
  @override
  ConsumerState<MemberListScreen> createState() => _S();
}

class _S extends ConsumerState<MemberListScreen> {
  String _query = '';
  String _role = 'all';

  Future<List<Map<String, dynamic>>> _load(String cid, String? role) async {
    final dio = ref.read(apiClientProvider).dio;
    final res = await dio.get<Map<String, dynamic>>(
      '/communities/$cid/members',
      queryParameters: {if (role != null && role != 'all') 'role': role},
    );
    return ((res.data!['data'] as List?) ?? const [])
        .whereType<Map<String, dynamic>>()
        .toList();
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
          title: Text(S.memberListTitle, style: t.titleMedium!.copyWith(fontSize: 16)),
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
                  onChanged: (v) => setState(() => _query = v.trim()),
                ),
              ),
              Padding(
                padding: const EdgeInsets.fromLTRB(20, 4, 20, 8),
                child: SingleChildScrollView(
                  scrollDirection: Axis.horizontal,
                  reverse: true,
                  child: Row(
                    children: [
                      _RoleChip(label: S.roleFilterAll, selected: _role == 'all', onTap: () => setState(() => _role = 'all')),
                      _RoleChip(label: S.roleFilterAdmin, selected: _role == 'admin', onTap: () => setState(() => _role = 'admin')),
                      _RoleChip(label: S.roleFilterSubadmin, selected: _role == 'subadmin', onTap: () => setState(() => _role = 'subadmin')),
                      _RoleChip(label: S.roleFilterEventMgr, selected: _role == 'event_manager', onTap: () => setState(() => _role = 'event_manager')),
                      _RoleChip(label: S.roleFilterMember, selected: _role == 'member', onTap: () => setState(() => _role = 'member')),
                    ],
                  ),
                ),
              ),
              Expanded(
                child: FutureBuilder<List<Map<String, dynamic>>>(
                  future: _load(cid, _role),
                  builder: (ctx, snap) {
                    if (!snap.hasData) return const Center(child: CircularProgressIndicator());
                    final rows = snap.data!.where((m) {
                      if (_query.isEmpty) return true;
                      final id = (m['userId'] as String?) ?? '';
                      return id.contains(_query);
                    }).toList();
                    if (rows.isEmpty) {
                      return EmptyState(icon: Symbols.group_off_rounded, headline: S.memberListEmpty, body: '');
                    }
                    return ListView.separated(
                      padding: const EdgeInsets.fromLTRB(20, 4, 20, 24),
                      itemCount: rows.length,
                      separatorBuilder: (_, __) => const SizedBox(height: 8),
                      itemBuilder: (_, i) => _MemberRow(communityId: cid, row: rows[i]),
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

class _RoleChip extends StatelessWidget {
  const _RoleChip({required this.label, required this.selected, required this.onTap});
  final String label;
  final bool selected;
  final VoidCallback onTap;
  @override
  Widget build(BuildContext context) {
    final p = context.palette;
    return Padding(
      padding: const EdgeInsets.only(right: 8),
      child: InkWell(
        borderRadius: AppRadius.brFull,
        onTap: onTap,
        child: Container(
          padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 8),
          decoration: BoxDecoration(
            color: selected ? p.accentWash : p.surface,
            borderRadius: AppRadius.brFull,
            border: Border.all(color: selected ? p.brand : p.border),
          ),
          child: Text(
            label,
            style: TextStyle(
              fontWeight: FontWeight.w700,
              fontSize: 12.5,
              color: selected ? p.accentInk : p.onBackground,
            ),
          ),
        ),
      ),
    );
  }
}

class _MemberRow extends StatelessWidget {
  const _MemberRow({required this.communityId, required this.row});
  final String communityId;
  final Map<String, dynamic> row;
  @override
  Widget build(BuildContext context) {
    final p = context.palette;
    final t = Theme.of(context).textTheme;
    final uid = (row['userId'] as String?) ?? '';
    final role = (row['role'] as String?) ?? 'member';
    final short = uid.length > 6 ? uid.substring(uid.length - 6) : uid;
    return InkWell(
      borderRadius: AppRadius.brMd,
      onTap: () => GoRouter.of(context).push('/admin/members/$uid'),
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
            Expanded(child: Text('…$short', style: t.bodyMedium!.copyWith(fontSize: 14))),
            Container(
              height: 22,
              padding: const EdgeInsets.symmetric(horizontal: 10),
              decoration: BoxDecoration(
                color: role == 'admin' || role == 'subadmin' ? p.accentWash : p.surface2,
                borderRadius: AppRadius.brFull,
              ),
              alignment: Alignment.center,
              child: Text(
                _roleLabel(role),
                style: TextStyle(
                  fontSize: 11,
                  fontWeight: FontWeight.w700,
                  color: role == 'admin' || role == 'subadmin' ? p.accentInk : p.muted,
                ),
              ),
            ),
          ],
        ),
      ),
    );
  }

  String _roleLabel(String role) {
    switch (role) {
      case 'admin':
        return 'מנהל';
      case 'subadmin':
        return 'מנהל משנה';
      case 'event_manager':
        return 'אחראי אירועים';
      default:
        return 'חבר';
    }
  }
}
