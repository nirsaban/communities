import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:material_symbols_icons/symbols.dart';

import '../../../../commons.dart';
import '../../../../core/i18n/strings.dart';
import '../../../../data/models/admin_dto.dart';
import '../../../../shared/widgets/widgets.dart';
import '../../../events/presentation/providers/event_providers.dart';
import '../providers/admin_providers.dart';

/// Spec: design-specs/ApprovalQueue.json — sub-admin/admin reviews application-privacy
/// join requests. Approve triggers welcome flow; Reject removes the pending row.
class ApprovalQueueScreen extends ConsumerWidget {
  const ApprovalQueueScreen({super.key});

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final p = context.palette;
    final t = Theme.of(context).textTheme;
    final cid = ref.watch(activeCommunityIdProvider);
    if (cid == null) return const Scaffold(body: Center(child: Text(S.noCommunities)));
    final async = ref.watch(pendingMembersProvider(cid));
    return Directionality(
      textDirection: TextDirection.rtl,
      child: Scaffold(
        backgroundColor: p.background,
        appBar: AppBar(
          backgroundColor: p.background,
          elevation: 0,
          scrolledUnderElevation: 0,
          leading: AppBackButton(),
          title: Text(S.approvalsTitle, style: t.titleMedium!.copyWith(fontSize: 16)),
          centerTitle: true,
        ),
        body: SafeArea(
          top: false,
          child: async.when(
            loading: () => const Center(child: CircularProgressIndicator()),
            error: (e, _) => ErrorState(onRetry: () => ref.invalidate(pendingMembersProvider(cid))),
            data: (rows) {
              if (rows.isEmpty) {
                return EmptyState(icon: Symbols.how_to_reg_rounded, headline: S.approvalsEmpty, body: '');
              }
              return ListView.separated(
                padding: const EdgeInsets.fromLTRB(20, 8, 20, 24),
                itemCount: rows.length,
                separatorBuilder: (_, __) => const SizedBox(height: 12),
                itemBuilder: (_, i) => _ApplicantCard(communityId: cid, row: rows[i]),
              );
            },
          ),
        ),
      ),
    );
  }
}

class _ApplicantCard extends ConsumerWidget {
  const _ApplicantCard({required this.communityId, required this.row});
  final String communityId;
  final PendingMemberRow row;
  @override
  Widget build(BuildContext context, WidgetRef ref) {
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
        children: [
          Row(
            children: [
              Container(
                width: 40,
                height: 40,
                decoration: BoxDecoration(color: p.surface2, shape: BoxShape.circle),
                alignment: Alignment.center,
                child: Icon(Symbols.person_rounded, color: p.muted),
              ),
              const SizedBox(width: 12),
              Expanded(
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    Text(row.name.isEmpty ? row.email : row.name,
                        style: t.titleMedium!.copyWith(fontWeight: FontWeight.w700, fontSize: 15)),
                    if (row.email.isNotEmpty)
                      Text(row.email, style: t.labelSmall!.copyWith(color: p.muted, fontSize: 11.5)),
                  ],
                ),
              ),
            ],
          ),
          if ((row.bio ?? '').isNotEmpty) ...[
            const SizedBox(height: 10),
            Container(
              padding: const EdgeInsets.all(10),
              decoration: BoxDecoration(color: p.surface2, borderRadius: BorderRadius.circular(8)),
              child: Text(row.bio!, style: t.bodyMedium!.copyWith(fontSize: 13, height: 1.4)),
            ),
          ],
          const SizedBox(height: 12),
          Row(
            children: [
              Expanded(
                child: AppButton(
                  S.approve,
                  icon: Symbols.check_rounded,
                  onPressed: () async {
                    try {
                      await ref.read(adminRepositoryProvider).approveMember(communityId, row.userId);
                      ref.invalidate(pendingMembersProvider(communityId));
                      if (context.mounted) {
                        ScaffoldMessenger.of(context).showSnackBar(const SnackBar(content: Text(S.approvedToast)));
                      }
                    } catch (_) {/* ignored */}
                  },
                ),
              ),
              const SizedBox(width: 8),
              Expanded(
                child: AppButton.secondary(
                  S.reject,
                  icon: Symbols.close_rounded,
                  onPressed: () async {
                    try {
                      await ref.read(adminRepositoryProvider).rejectMember(communityId, row.userId);
                      ref.invalidate(pendingMembersProvider(communityId));
                      if (context.mounted) {
                        ScaffoldMessenger.of(context).showSnackBar(const SnackBar(content: Text(S.rejectedToast)));
                      }
                    } catch (_) {/* ignored */}
                  },
                ),
              ),
            ],
          ),
        ],
      ),
    );
  }
}
