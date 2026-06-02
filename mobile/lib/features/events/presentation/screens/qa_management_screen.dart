import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:material_symbols_icons/symbols.dart';

import '../../../../commons.dart';
import '../../../../core/i18n/strings.dart';
import '../../../../data/models/event_qa_dto.dart';
import '../../../../shared/widgets/widgets.dart';
import '../providers/event_manager_providers.dart';

/// Spec: design-specs/QAManagement.json (route "/manage/events/:id/qa").
/// FilterButton, UnansweredCard (accent), AnswerButton (primary sm), PinButton, ResolvedCard.
class QaManagementScreen extends ConsumerWidget {
  const QaManagementScreen({super.key, required this.eventId});
  final String eventId;

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final p = context.palette;
    final t = Theme.of(context).textTheme;
    final async = ref.watch(eventQaProvider(eventId));

    return Directionality(
      textDirection: TextDirection.rtl,
      child: Scaffold(
        backgroundColor: p.background,
        appBar: AppBar(
          backgroundColor: p.background,
          elevation: 0,
          scrolledUnderElevation: 0,
          leading: AppBackButton(),
          title: Text(S.qaManagementTitle, style: t.titleMedium!.copyWith(fontSize: 16)),
          centerTitle: true,
        ),
        body: SafeArea(
          top: false,
          child: async.when(
            loading: () => const Center(child: CircularProgressIndicator()),
            error: (e, _) => ErrorState(onRetry: () => ref.invalidate(eventQaProvider(eventId))),
            data: (rows) {
              if (rows.isEmpty) return EmptyState(icon: Symbols.help_rounded, headline: S.qaEmpty, body: '');
              // Unanswered float to top per spec.
              final unanswered = rows.where((q) => q.answer == null).toList()
                ..sort((a, b) => b.upvoteCount.compareTo(a.upvoteCount));
              final answered = rows.where((q) => q.answer != null).toList()
                ..sort((a, b) => b.createdAt.compareTo(a.createdAt));

              return ListView(
                padding: const EdgeInsets.fromLTRB(20, 8, 20, 24),
                children: [
                  if (unanswered.isNotEmpty) ...[
                    Padding(
                      padding: const EdgeInsets.symmetric(vertical: 6),
                      child: Text(
                        S.qaUnanswered,
                        style: t.labelSmall!.copyWith(color: p.muted, fontSize: 11.5, letterSpacing: 0.4),
                      ),
                    ),
                    ...unanswered.map((q) => Padding(
                          padding: const EdgeInsets.only(bottom: 10),
                          child: _ManagerCard(eventId: eventId, q: q, isUnanswered: true),
                        )),
                  ],
                  if (answered.isNotEmpty) ...[
                    Padding(
                      padding: const EdgeInsets.symmetric(vertical: 6),
                      child: Text(
                        'נענו',
                        style: t.labelSmall!.copyWith(color: p.muted, fontSize: 11.5, letterSpacing: 0.4),
                      ),
                    ),
                    ...answered.map((q) => Padding(
                          padding: const EdgeInsets.only(bottom: 10),
                          child: _ManagerCard(eventId: eventId, q: q, isUnanswered: false),
                        )),
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

class _ManagerCard extends ConsumerStatefulWidget {
  const _ManagerCard({required this.eventId, required this.q, required this.isUnanswered});
  final String eventId;
  final EventQaDto q;
  final bool isUnanswered;

  @override
  ConsumerState<_ManagerCard> createState() => _ManagerCardState();
}

class _ManagerCardState extends ConsumerState<_ManagerCard> {
  bool _composing = false;
  final _ctrl = TextEditingController();

  @override
  void dispose() {
    _ctrl.dispose();
    super.dispose();
  }

  Future<void> _answer() async {
    if (_ctrl.text.trim().isEmpty) return;
    try {
      await ref
          .read(eventManagerRepoProvider)
          .answerQa(widget.eventId, widget.q.id, _ctrl.text.trim());
      ref.invalidate(eventQaProvider(widget.eventId));
      if (!mounted) return;
      setState(() => _composing = false);
      ScaffoldMessenger.of(context).showSnackBar(const SnackBar(content: Text(S.qaAnswered)));
    } catch (_) {/* ignored */}
  }

  Future<void> _pin() async {
    try {
      await ref.read(eventManagerRepoProvider).pinQa(widget.eventId, widget.q.id);
      ref.invalidate(eventQaProvider(widget.eventId));
    } catch (_) {/* ignored */}
  }

  Future<void> _resolve() async {
    try {
      await ref.read(eventManagerRepoProvider).resolveQa(widget.eventId, widget.q.id);
      ref.invalidate(eventQaProvider(widget.eventId));
    } catch (_) {/* ignored */}
  }

  @override
  Widget build(BuildContext context) {
    final p = context.palette;
    final t = Theme.of(context).textTheme;
    final q = widget.q;
    return Container(
      padding: const EdgeInsets.all(14),
      decoration: BoxDecoration(
        color: widget.isUnanswered ? p.accentWash : p.surface,
        borderRadius: AppRadius.brMd,
        border: Border.all(color: widget.isUnanswered ? p.brand : p.border),
      ),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Text(q.question,
              style: t.bodyLarge!.copyWith(fontSize: 14.5, height: 1.5, fontWeight: FontWeight.w700)),
          if (q.answer != null) ...[
            const SizedBox(height: 8),
            Text(q.answer!.body, style: t.bodyMedium!.copyWith(fontSize: 13.5, height: 1.5)),
          ],
          const SizedBox(height: 8),
          Row(
            children: [
              Icon(Symbols.thumb_up_rounded, size: 14, color: p.muted),
              const SizedBox(width: 4),
              Text('${q.upvoteCount}', style: t.labelSmall!.copyWith(color: p.muted, fontSize: 11.5)),
              const Spacer(),
              if (!_composing && q.answer == null)
                AppButton(
                  S.qaAnswerCta,
                  size: AppButtonSize.small,
                  expand: false,
                  onPressed: () => setState(() => _composing = true),
                ),
              if (!_composing) ...[
                const SizedBox(width: 6),
                AppButton.secondary(
                  q.pinned ? S.qaUnpinCta : S.qaPinCta,
                  size: AppButtonSize.small,
                  expand: false,
                  onPressed: _pin,
                ),
                const SizedBox(width: 6),
                AppButton.ghost(
                  q.resolved ? S.qaUnresolveCta : S.qaResolveCta,
                  size: AppButtonSize.small,
                  expand: false,
                  onPressed: _resolve,
                ),
              ],
            ],
          ),
          if (_composing) ...[
            const SizedBox(height: 10),
            AppTextField(
              controller: _ctrl,
              hint: S.qaAnswerHint,
              maxLines: 3,
              maxLength: 1000,
            ),
            const SizedBox(height: 8),
            Row(
              children: [
                Expanded(
                  child: AppButton(
                    S.qaSend,
                    onPressed: _answer,
                  ),
                ),
                const SizedBox(width: 8),
                Expanded(
                  child: AppButton.ghost(
                    S.cancel,
                    onPressed: () => setState(() => _composing = false),
                  ),
                ),
              ],
            ),
          ],
        ],
      ),
    );
  }
}
