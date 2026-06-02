import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';
import 'package:material_symbols_icons/symbols.dart';

import '../../../../commons.dart';
import '../../../../core/i18n/strings.dart';
import '../../../../shared/widgets/widgets.dart';
import '../providers/super_providers.dart';

/// Spec: design-specs/SuspendCommunity.json — typed-name gate + reason select + Suspend.
/// Suspend is reversible (warning, not destructive); Restore lands in CommunityDetailSuper.
class SuspendCommunityScreen extends ConsumerStatefulWidget {
  const SuspendCommunityScreen({super.key, required this.cid});
  final String cid;
  @override
  ConsumerState<SuspendCommunityScreen> createState() => _S();
}

class _S extends ConsumerState<SuspendCommunityScreen> {
  final _confirmCtrl = TextEditingController();
  String _reason = 'TOS violation';
  bool _busy = false;

  static const _reasons = [
    'TOS violation',
    'Spam / abuse',
    'Billing dispute',
    'Owner request',
    'Other',
  ];

  @override
  void dispose() {
    _confirmCtrl.dispose();
    super.dispose();
  }

  Future<void> _suspend(String expectedName) async {
    if (_busy) return;
    if (_confirmCtrl.text.trim() != expectedName) return;
    setState(() => _busy = true);
    try {
      await ref.read(superRepositoryProvider).suspendCommunity(widget.cid);
      ref.invalidate(superCommunityDetailProvider(widget.cid));
      if (!mounted) return;
      ScaffoldMessenger.of(context).showSnackBar(const SnackBar(content: Text(S.superSuspendDone)));
      GoRouter.of(context).pop();
    } catch (_) {
      if (!mounted) return;
      ScaffoldMessenger.of(context).showSnackBar(const SnackBar(content: Text(S.eventSaveFailed)));
    } finally {
      if (mounted) setState(() => _busy = false);
    }
  }

  @override
  Widget build(BuildContext context) {
    final p = context.palette;
    final t = Theme.of(context).textTheme;
    final async = ref.watch(superCommunityDetailProvider(widget.cid));
    return Directionality(
      textDirection: TextDirection.rtl,
      child: Scaffold(
        backgroundColor: p.background,
        appBar: AppBar(
          backgroundColor: p.background,
          elevation: 0,
          scrolledUnderElevation: 0,
          leading: AppBackButton(),
          title: Text(S.superSuspendTitle, style: t.titleMedium!.copyWith(fontSize: 16)),
          centerTitle: true,
        ),
        body: async.when(
          loading: () => const Center(child: CircularProgressIndicator()),
          error: (e, _) => ErrorState(onRetry: () => ref.invalidate(superCommunityDetailProvider(widget.cid))),
          data: (c) {
            final name = (c['name'] as String?) ?? '';
            final canSuspend = _confirmCtrl.text.trim() == name && name.isNotEmpty;
            return SafeArea(
              top: false,
              child: SingleChildScrollView(
                padding: const EdgeInsets.fromLTRB(20, 16, 20, 24),
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.stretch,
                  children: [
                    Center(
                      child: IconBlob(
                        icon: Symbols.warning_rounded,
                        bg: p.warningWash,
                        color: p.warning,
                      ),
                    ),
                    const SizedBox(height: 18),
                    Text(
                      S.superSuspendTitle,
                      textAlign: TextAlign.center,
                      style: t.displayMedium!.copyWith(fontSize: 24),
                    ),
                    const SizedBox(height: 8),
                    Text(
                      'הקלד את שם הקהילה (${name}) לאישור.',
                      textAlign: TextAlign.center,
                      style: t.bodyMedium!.copyWith(color: p.muted, height: 1.5),
                    ),
                    const SizedBox(height: 18),
                    AppTextField(
                      controller: _confirmCtrl,
                      hint: name,
                      onChanged: (_) => setState(() {}),
                    ),
                    const SizedBox(height: 14),
                    Text(S.superSuspendReason, style: t.labelSmall!.copyWith(color: p.muted, fontSize: 11.5)),
                    const SizedBox(height: 6),
                    Container(
                      decoration: BoxDecoration(
                        color: p.surface,
                        borderRadius: AppRadius.brMd,
                        border: Border.all(color: p.border),
                      ),
                      padding: const EdgeInsets.symmetric(horizontal: 12),
                      child: DropdownButton<String>(
                        value: _reason,
                        isExpanded: true,
                        underline: const SizedBox(),
                        onChanged: (v) => setState(() => _reason = v ?? _reason),
                        items: _reasons
                            .map((r) => DropdownMenuItem(value: r, child: Text(r)))
                            .toList(),
                      ),
                    ),
                    const SizedBox(height: 18),
                    AppButton.danger(
                      S.superSuspendCta,
                      icon: Symbols.pause_circle_rounded,
                      loading: _busy,
                      onPressed: canSuspend && !_busy ? () => _suspend(name) : null,
                    ),
                    const SizedBox(height: 10),
                    AppButton.ghost(
                      S.cancel,
                      onPressed: _busy ? null : () => GoRouter.of(context).pop(),
                    ),
                  ],
                ),
              ),
            );
          },
        ),
      ),
    );
  }
}
