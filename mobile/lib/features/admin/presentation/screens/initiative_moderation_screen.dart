import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:material_symbols_icons/symbols.dart';

import '../../../../commons.dart';
import '../../../../core/i18n/strings.dart';
import '../../../../core/network/api_client.dart';
import '../../../../shared/widgets/widgets.dart';
import '../../../auth/presentation/providers/auth_providers.dart';
import '../../../events/presentation/providers/event_providers.dart';

/// Spec: design-specs/InitiativeModeration.json — list pending (submitted/under_review)
/// initiatives, approve via existing POST /initiatives/:iid/approve, reject via /reject.
class InitiativeModerationScreen extends ConsumerStatefulWidget {
  const InitiativeModerationScreen({super.key});
  @override
  ConsumerState<InitiativeModerationScreen> createState() => _S();
}

class _S extends ConsumerState<InitiativeModerationScreen> {
  bool _busy = false;

  Future<List<Map<String, dynamic>>> _load(String cid) async {
    final dio = ref.read(apiClientProvider).dio;
    final res = await dio.get<Map<String, dynamic>>(
      '/communities/$cid/initiatives',
      queryParameters: {'status': 'submitted'},
    );
    return ((res.data!['data'] as List?) ?? const [])
        .whereType<Map<String, dynamic>>()
        .toList();
  }

  Future<void> _approve(String iid) async {
    if (_busy) return;
    setState(() => _busy = true);
    try {
      await ref.read(apiClientProvider).dio.post<dynamic>('/initiatives/$iid/approve');
      if (!mounted) return;
      ScaffoldMessenger.of(context).showSnackBar(const SnackBar(content: Text(S.initiativeApproved)));
      setState(() {}); // force FutureBuilder rebuild
    } catch (_) {/* ignored */}
    finally {
      if (mounted) setState(() => _busy = false);
    }
  }

  Future<void> _reject(String iid) async {
    final reasonCtrl = TextEditingController();
    final ok = await showDialog<bool>(
      context: context,
      builder: (ctx) => AlertDialog(
        title: const Text(S.initiativeRejectReason),
        content: TextField(controller: reasonCtrl, maxLines: 3),
        actions: [
          TextButton(onPressed: () => Navigator.of(ctx).pop(false), child: const Text(S.cancel)),
          TextButton(onPressed: () => Navigator.of(ctx).pop(true), child: const Text(S.reject)),
        ],
      ),
    );
    if (ok != true) return;
    setState(() => _busy = true);
    try {
      await ref.read(apiClientProvider).dio.post<dynamic>(
        '/initiatives/$iid/reject',
        data: {'reason': reasonCtrl.text.trim()},
      );
      if (!mounted) return;
      ScaffoldMessenger.of(context).showSnackBar(const SnackBar(content: Text(S.initiativeRejected)));
      setState(() {});
    } catch (_) {/* ignored */}
    finally {
      if (mounted) setState(() => _busy = false);
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
          title: Text(S.initiativesPendingTitle, style: t.titleMedium!.copyWith(fontSize: 16)),
          centerTitle: true,
        ),
        body: FutureBuilder<List<Map<String, dynamic>>>(
          future: _load(cid),
          builder: (ctx, snap) {
            if (!snap.hasData) return const Center(child: CircularProgressIndicator());
            final rows = snap.data!;
            if (rows.isEmpty) {
              return EmptyState(icon: Symbols.lightbulb_rounded, headline: S.initiativesPendingEmpty, body: '');
            }
            return ListView.separated(
              padding: const EdgeInsets.fromLTRB(20, 8, 20, 24),
              itemCount: rows.length,
              separatorBuilder: (_, __) => const SizedBox(height: 12),
              itemBuilder: (_, i) {
                final row = rows[i];
                final iid = (row['id'] as String?) ?? '';
                final title = (row['title'] as String?) ?? '';
                final body = (row['description'] as String?) ?? '';
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
                      Text(title, style: t.titleMedium!.copyWith(fontSize: 15, fontWeight: FontWeight.w700)),
                      const SizedBox(height: 6),
                      Text(body,
                          style: t.bodyMedium!.copyWith(fontSize: 13.5, height: 1.5),
                          maxLines: 4, overflow: TextOverflow.ellipsis),
                      const SizedBox(height: 12),
                      Row(
                        children: [
                          Expanded(
                            child: AppButton(
                              S.approve,
                              size: AppButtonSize.small,
                              icon: Symbols.check_rounded,
                              onPressed: _busy ? null : () => _approve(iid),
                            ),
                          ),
                          const SizedBox(width: 8),
                          Expanded(
                            child: AppButton.secondary(
                              S.reject,
                              size: AppButtonSize.small,
                              icon: Symbols.close_rounded,
                              onPressed: _busy ? null : () => _reject(iid),
                            ),
                          ),
                        ],
                      ),
                    ],
                  ),
                );
              },
            );
          },
        ),
      ),
    );
  }
}
