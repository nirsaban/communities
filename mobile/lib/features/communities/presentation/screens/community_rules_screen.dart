import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';

import '../../../../commons.dart';
import '../../../../core/i18n/strings.dart';
import '../../../../shared/widgets/widgets.dart';
import '../providers/community_providers.dart';

/// Spec: design-specs/CommunityRules.json (route "/c/:slug/rules").
/// Backend uses :id (DESIGN_DEVIATIONS). Title, Body, RuleList (numbered),
/// AgreeCheckbox, AgreeButton (primary, full, h=50, disabled until checked).
class CommunityRulesScreen extends ConsumerStatefulWidget {
  const CommunityRulesScreen({super.key, required this.communityId});
  final String communityId;

  @override
  ConsumerState<CommunityRulesScreen> createState() => _State();
}

class _State extends ConsumerState<CommunityRulesScreen> {
  bool _agreed = false;
  bool _busy = false;

  Future<void> _ack() async {
    if (_busy || !_agreed) return;
    setState(() => _busy = true);
    try {
      await ref.read(communityRepositoryProvider).acknowledgeRules(widget.communityId);
      if (!mounted) return;
      ScaffoldMessenger.of(context).showSnackBar(const SnackBar(content: Text(S.rulesAcked)));
      GoRouter.of(context).go('/home');
    } catch (_) {
      if (!mounted) return;
      ScaffoldMessenger.of(context).showSnackBar(const SnackBar(content: Text(S.rulesAckFailed)));
    } finally {
      if (mounted) setState(() => _busy = false);
    }
  }

  List<String> _parseRules(String? rules) {
    if (rules == null || rules.trim().isEmpty) return const [];
    return rules
        .split(RegExp(r'\r?\n'))
        .map((l) => l.replaceFirst(RegExp(r'^\s*\d+[\.\)]\s*'), '').trim())
        .where((l) => l.isNotEmpty)
        .toList();
  }

  @override
  Widget build(BuildContext context) {
    final p = context.palette;
    final t = Theme.of(context).textTheme;
    final async = ref.watch(communityDetailProvider(widget.communityId));

    return Directionality(
      textDirection: TextDirection.rtl,
      child: Scaffold(
        backgroundColor: p.background,
        appBar: AppBar(
          backgroundColor: p.background,
          elevation: 0,
          scrolledUnderElevation: 0,
          leading: AppBackButton(),
          title: Text(S.rulesTitle, style: t.titleMedium!.copyWith(fontSize: 16)),
          centerTitle: true,
        ),
        body: async.when(
          loading: () => const Center(child: CircularProgressIndicator()),
          error: (e, _) => ErrorState(
            onRetry: () => ref.invalidate(communityDetailProvider(widget.communityId)),
          ),
          data: (community) {
            final rules = _parseRules(community.rules);
            return SafeArea(
              top: false,
              child: Column(
                children: [
                  Expanded(
                    child: ListView(
                      padding: const EdgeInsets.fromLTRB(20, 4, 20, 16),
                      children: [
                        Text(
                          community.name,
                          style: t.titleLarge!.copyWith(fontSize: 22, fontWeight: FontWeight.w700),
                        ),
                        const SizedBox(height: 6),
                        Text(
                          S.rulesTitle,
                          style: t.bodyLarge!.copyWith(color: p.muted, fontSize: 14, height: 1.5),
                        ),
                        const SizedBox(height: 18),
                        if (rules.isEmpty)
                          Text(
                            S.rulesEmpty,
                            style: t.bodyMedium!.copyWith(color: p.muted),
                          )
                        else
                          ...rules.asMap().entries.map(
                                (e) => Padding(
                                  padding: const EdgeInsets.only(bottom: 14),
                                  child: _NumberedRule(index: e.key + 1, body: e.value),
                                ),
                              ),
                      ],
                    ),
                  ),
                  Container(
                    padding: const EdgeInsets.fromLTRB(20, 8, 20, 16),
                    decoration: BoxDecoration(
                      color: p.surface,
                      border: Border(top: BorderSide(color: p.border)),
                    ),
                    child: Column(
                      crossAxisAlignment: CrossAxisAlignment.stretch,
                      children: [
                        InkWell(
                          borderRadius: AppRadius.brSm,
                          onTap: () => setState(() => _agreed = !_agreed),
                          child: Padding(
                            padding: const EdgeInsets.symmetric(vertical: 8, horizontal: 4),
                            child: Row(
                              children: [
                                Checkbox(
                                  value: _agreed,
                                  onChanged: (v) => setState(() => _agreed = v ?? false),
                                ),
                                const SizedBox(width: 6),
                                Expanded(
                                  child: Text(
                                    S.rulesAgreeLabel,
                                    style: t.bodyMedium!.copyWith(fontSize: 14, height: 1.4),
                                  ),
                                ),
                              ],
                            ),
                          ),
                        ),
                        const SizedBox(height: 8),
                        SizedBox(
                          height: 50,
                          child: AppButton(
                            S.rulesAgreeCta,
                            loading: _busy,
                            onPressed: _agreed && !_busy ? _ack : null,
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

class _NumberedRule extends StatelessWidget {
  const _NumberedRule({required this.index, required this.body});
  final int index;
  final String body;

  @override
  Widget build(BuildContext context) {
    final p = context.palette;
    final t = Theme.of(context).textTheme;
    return Row(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        Container(
          width: 28,
          height: 28,
          decoration: BoxDecoration(color: p.accentWash, shape: BoxShape.circle),
          alignment: Alignment.center,
          child: Text(
            '$index',
            style: TextStyle(color: p.accentInk, fontWeight: FontWeight.w700, fontSize: 13),
          ),
        ),
        const SizedBox(width: 12),
        Expanded(
          child: Text(
            body,
            style: t.bodyLarge!.copyWith(fontSize: 15, height: 1.55),
          ),
        ),
      ],
    );
  }
}
