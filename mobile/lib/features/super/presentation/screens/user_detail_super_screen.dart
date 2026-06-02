import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:material_symbols_icons/symbols.dart';

import '../../../../commons.dart';
import '../../../../core/i18n/strings.dart';
import '../../../../shared/widgets/widgets.dart';
import '../providers/super_providers.dart';

/// Spec: design-specs/UserDetailSuper.json — avatar/name + memberships across communities +
/// account actions (disable/enable). PaymentCard/Password explicitly hidden for super-admin
/// per spec privacy guardrail.
class UserDetailSuperScreen extends ConsumerWidget {
  const UserDetailSuperScreen({super.key, required this.uid});
  final String uid;

  Future<void> _toggle(BuildContext context, WidgetRef ref, String currentStatus) async {
    try {
      if (currentStatus == 'disabled') {
        await ref.read(superRepositoryProvider).enableUser(uid);
        if (context.mounted) {
          ScaffoldMessenger.of(context).showSnackBar(const SnackBar(content: Text(S.superUserEnabled)));
        }
      } else {
        await ref.read(superRepositoryProvider).disableUser(uid);
        if (context.mounted) {
          ScaffoldMessenger.of(context).showSnackBar(const SnackBar(content: Text(S.superUserDisabled)));
        }
      }
      ref.invalidate(superUserDetailProvider(uid));
    } catch (_) {/* ignored */}
  }

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final p = context.palette;
    final t = Theme.of(context).textTheme;
    final async = ref.watch(superUserDetailProvider(uid));
    return Directionality(
      textDirection: TextDirection.rtl,
      child: Scaffold(
        backgroundColor: p.background,
        appBar: AppBar(
          backgroundColor: p.background,
          elevation: 0,
          scrolledUnderElevation: 0,
          leading: AppBackButton(),
          title: Text(S.superUserDetailTitle, style: t.titleMedium!.copyWith(fontSize: 16)),
          centerTitle: true,
        ),
        body: async.when(
          loading: () => const Center(child: CircularProgressIndicator()),
          error: (e, _) => ErrorState(onRetry: () => ref.invalidate(superUserDetailProvider(uid))),
          data: (d) {
            final user = (d['user'] as Map<String, dynamic>?) ?? const {};
            final memberships = ((d['memberships'] as List?) ?? const [])
                .whereType<Map<String, dynamic>>()
                .toList();
            final status = (user['status'] as String?) ?? 'active';
            final name = (user['name'] as String?) ?? '';
            final email = (user['email'] as String?) ?? '';
            return SafeArea(
              top: false,
              child: ListView(
                padding: const EdgeInsets.fromLTRB(20, 8, 20, 28),
                children: [
                  Center(
                    child: Container(
                      width: 72,
                      height: 72,
                      decoration: BoxDecoration(color: p.surface2, shape: BoxShape.circle),
                      alignment: Alignment.center,
                      child: Icon(Symbols.person_rounded, color: p.muted, size: 32),
                    ),
                  ),
                  const SizedBox(height: 10),
                  Center(
                    child: Text(name.isEmpty ? email : name,
                        style: t.titleLarge!.copyWith(fontSize: 20, fontWeight: FontWeight.w700)),
                  ),
                  const SizedBox(height: 4),
                  Center(child: Text(email, style: t.labelSmall!.copyWith(color: p.muted, fontSize: 12))),
                  const SizedBox(height: 18),
                  Text(S.superUserCommunities, style: t.labelSmall!.copyWith(color: p.muted, fontSize: 11.5)),
                  const SizedBox(height: 8),
                  if (memberships.isEmpty)
                    Text('—', style: t.bodyMedium!.copyWith(color: p.muted))
                  else
                    Container(
                      decoration: BoxDecoration(
                        color: p.surface,
                        borderRadius: AppRadius.brMd,
                        border: Border.all(color: p.border),
                      ),
                      child: Column(
                        children: [
                          for (var i = 0; i < memberships.length; i++) ...[
                            ListTile(
                              dense: true,
                              leading: Icon(Symbols.groups_rounded, color: p.accentInk),
                              title: Text((memberships[i]['community']?['name'] as String?) ?? '—'),
                              subtitle: Text((memberships[i]['role'] as String?) ?? '—'),
                              trailing: Text(
                                (memberships[i]['status'] as String?) ?? '—',
                                style: t.labelSmall!.copyWith(color: p.muted, fontSize: 11.5),
                              ),
                            ),
                            if (i < memberships.length - 1)
                              Container(height: 1, margin: const EdgeInsetsDirectional.only(start: 60), color: p.border),
                          ],
                        ],
                      ),
                    ),
                  const SizedBox(height: 18),
                  Text(S.superUserAccount, style: t.labelSmall!.copyWith(color: p.muted, fontSize: 11.5)),
                  const SizedBox(height: 6),
                  if (status == 'disabled')
                    AppButton(
                      S.superUserEnable,
                      icon: Symbols.restart_alt_rounded,
                      onPressed: () => _toggle(context, ref, status),
                    )
                  else
                    AppButton.danger(
                      S.superUserDisable,
                      icon: Symbols.block_rounded,
                      onPressed: () => _toggle(context, ref, status),
                    ),
                  const SizedBox(height: 12),
                  Container(
                    padding: const EdgeInsets.all(12),
                    decoration: BoxDecoration(color: p.surface2, borderRadius: AppRadius.brMd),
                    child: Row(
                      children: [
                        Icon(Symbols.lock_rounded, color: p.muted, size: 16),
                        const SizedBox(width: 8),
                        const Expanded(
                          child: Text(
                            'פרטי תשלום וסיסמה אינם נחשפים למנהל פלטפורמה.',
                            style: TextStyle(fontSize: 12),
                          ),
                        ),
                      ],
                    ),
                  ),
                ],
              ),
            );
          },
        ),
      ),
    );
  }
}
