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
import '../providers/admin_providers.dart';

/// Spec: design-specs/RoleManagement.json — grouped lists of admins / sub-admins /
/// event managers + change-role action. Uses existing PATCH /communities/:cid/members/:uid.
class RoleManagementScreen extends ConsumerStatefulWidget {
  const RoleManagementScreen({super.key});
  @override
  ConsumerState<RoleManagementScreen> createState() => _S();
}

class _S extends ConsumerState<RoleManagementScreen> {
  Future<List<Map<String, dynamic>>> _load(String cid) async {
    final dio = ref.read(apiClientProvider).dio;
    final res = await dio.get<Map<String, dynamic>>('/communities/$cid/members');
    return ((res.data!['data'] as List?) ?? const [])
        .whereType<Map<String, dynamic>>()
        .toList();
  }

  Future<void> _setRole(String cid, String uid, String role) async {
    try {
      await ref.read(adminRepositoryProvider).changeRole(cid, uid, role);
      if (!mounted) return;
      setState(() {});
      ScaffoldMessenger.of(context).showSnackBar(const SnackBar(content: Text(S.roleChanged)));
    } catch (_) {
      if (!mounted) return;
      ScaffoldMessenger.of(context).showSnackBar(const SnackBar(content: Text(S.roleChangeFailed)));
    }
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
          title: Text(S.roleMgmtTitle, style: t.titleMedium!.copyWith(fontSize: 16)),
          centerTitle: true,
          actions: [
            IconButton(
              onPressed: () => GoRouter.of(context).push('/admin/members/invite'),
              icon: Icon(Symbols.person_add_rounded, color: p.onBackground),
            ),
          ],
        ),
        body: SafeArea(
          top: false,
          child: FutureBuilder<List<Map<String, dynamic>>>(
            future: _load(cid),
            builder: (ctx, snap) {
              if (!snap.hasData) return const Center(child: CircularProgressIndicator());
              final all = snap.data!;
              final groups = {
                S.roleMgmtAdmin: all.where((m) => m['role'] == 'admin').toList(),
                S.roleMgmtSubadmin: all.where((m) => m['role'] == 'subadmin').toList(),
                S.roleMgmtEventMgr: all.where((m) => m['role'] == 'event_manager').toList(),
              };
              return ListView(
                padding: const EdgeInsets.fromLTRB(20, 8, 20, 24),
                children: [
                  for (final entry in groups.entries) ...[
                    Padding(
                      padding: const EdgeInsets.symmetric(vertical: 6),
                      child: Text(entry.key, style: t.labelSmall!.copyWith(color: p.muted, fontSize: 11.5, letterSpacing: 0.4)),
                    ),
                    if (entry.value.isEmpty)
                      Padding(
                        padding: const EdgeInsets.only(bottom: 8),
                        child: Text('—', style: t.bodyMedium!.copyWith(color: p.muted)),
                      ),
                    ...entry.value.map((m) {
                      final uid = (m['userId'] as String?) ?? '';
                      final short = uid.length > 6 ? uid.substring(uid.length - 6) : uid;
                      return Container(
                        margin: const EdgeInsets.only(bottom: 8),
                        padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 10),
                        decoration: BoxDecoration(
                          color: p.surface,
                          borderRadius: AppRadius.brMd,
                          border: Border.all(color: p.border),
                        ),
                        child: Row(
                          children: [
                            Icon(Symbols.person_rounded, color: p.muted),
                            const SizedBox(width: 10),
                            Expanded(child: Text('…$short', style: t.bodyMedium!.copyWith(fontSize: 13.5))),
                            PopupMenuButton<String>(
                              icon: Icon(Symbols.more_vert_rounded, color: p.muted),
                              onSelected: (v) => _setRole(cid, uid, v),
                              itemBuilder: (_) => const [
                                PopupMenuItem(value: 'admin', child: Text('הפוך למנהל')),
                                PopupMenuItem(value: 'subadmin', child: Text('הפוך למנהל משנה')),
                                PopupMenuItem(value: 'event_manager', child: Text('הפוך לאחראי')),
                                PopupMenuItem(value: 'member', child: Text('חזרה לחבר')),
                              ],
                            ),
                          ],
                        ),
                      );
                    }),
                  ],
                ],
              );
            },
          ),
        ),
      ),
    );
  }
}
