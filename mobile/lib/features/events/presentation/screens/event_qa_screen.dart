import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:material_symbols_icons/symbols.dart';

import '../../../../commons.dart';
import '../../../../core/i18n/strings.dart';
import '../../../../data/models/event_qa_dto.dart';
import '../../../../shared/widgets/widgets.dart';
import '../providers/event_manager_providers.dart';

/// Spec: design-specs/EventQA.json (route "/events/:id/qa", role: member).
/// QuestionCard list (sorted votes; pinned answers up top), UpvotePill, AskComposer sticky.
class EventQaScreen extends ConsumerStatefulWidget {
  const EventQaScreen({super.key, required this.eventId});
  final String eventId;

  @override
  ConsumerState<EventQaScreen> createState() => _State();
}

class _State extends ConsumerState<EventQaScreen> {
  final _composerCtrl = TextEditingController();
  bool _sending = false;

  @override
  void dispose() {
    _composerCtrl.dispose();
    super.dispose();
  }

  Future<void> _send() async {
    final q = _composerCtrl.text.trim();
    if (q.length < 3) {
      ScaffoldMessenger.of(context).showSnackBar(const SnackBar(content: Text(S.qaQuestionRequired)));
      return;
    }
    setState(() => _sending = true);
    try {
      await ref.read(eventManagerRepoProvider).createQa(widget.eventId, q);
      _composerCtrl.clear();
      ref.invalidate(eventQaProvider(widget.eventId));
      if (!mounted) return;
      ScaffoldMessenger.of(context).showSnackBar(const SnackBar(content: Text(S.qaPosted)));
    } catch (_) {/* ignored */}
    finally {
      if (mounted) setState(() => _sending = false);
    }
  }

  Future<void> _upvote(EventQaDto q) async {
    try {
      await ref.read(eventManagerRepoProvider).upvoteQa(widget.eventId, q.id);
      ref.invalidate(eventQaProvider(widget.eventId));
    } catch (_) {/* ignored */}
  }

  @override
  Widget build(BuildContext context) {
    final p = context.palette;
    final t = Theme.of(context).textTheme;
    final async = ref.watch(eventQaProvider(widget.eventId));

    return Directionality(
      textDirection: TextDirection.rtl,
      child: Scaffold(
        backgroundColor: p.background,
        appBar: AppBar(
          backgroundColor: p.background,
          elevation: 0,
          scrolledUnderElevation: 0,
          leading: AppBackButton(),
          title: Text(S.qaTitle, style: t.titleMedium!.copyWith(fontSize: 16)),
          centerTitle: true,
        ),
        body: SafeArea(
          top: false,
          child: Column(
            children: [
              Expanded(
                child: async.when(
                  loading: () => const _Loading(),
                  error: (e, _) => ErrorState(onRetry: () => ref.invalidate(eventQaProvider(widget.eventId))),
                  data: (rows) {
                    if (rows.isEmpty) {
                      return EmptyState(icon: Symbols.help_rounded, headline: S.qaEmpty, body: '');
                    }
                    // Sort: pinned first, then by upvotes desc, then newest.
                    final sorted = [...rows];
                    sorted.sort((a, b) {
                      if (a.pinned != b.pinned) return a.pinned ? -1 : 1;
                      if (a.upvoteCount != b.upvoteCount) {
                        return b.upvoteCount.compareTo(a.upvoteCount);
                      }
                      return b.createdAt.compareTo(a.createdAt);
                    });
                    return ListView.separated(
                      padding: const EdgeInsets.fromLTRB(20, 8, 20, 16),
                      itemCount: sorted.length,
                      separatorBuilder: (_, __) => const SizedBox(height: 10),
                      itemBuilder: (_, i) => _QuestionCard(q: sorted[i], onUpvote: () => _upvote(sorted[i])),
                    );
                  },
                ),
              ),
              _Composer(
                controller: _composerCtrl,
                sending: _sending,
                onSend: _send,
              ),
            ],
          ),
        ),
      ),
    );
  }
}

class _QuestionCard extends StatelessWidget {
  const _QuestionCard({required this.q, required this.onUpvote});
  final EventQaDto q;
  final VoidCallback onUpvote;

  @override
  Widget build(BuildContext context) {
    final p = context.palette;
    final t = Theme.of(context).textTheme;
    final dark = Theme.of(context).brightness == Brightness.dark;
    return Container(
      padding: const EdgeInsets.all(14),
      decoration: BoxDecoration(
        color: q.pinned ? p.accentWash : p.surface,
        borderRadius: AppRadius.brMd,
        border: Border.all(color: q.pinned ? p.brand : p.border),
        boxShadow: AppShadows.low(dark: dark),
      ),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Row(
            children: [
              if (q.pinned) ...[
                Icon(Symbols.push_pin_rounded, size: 16, color: p.accentInk),
                const SizedBox(width: 6),
                Text(S.qaPinned, style: TextStyle(color: p.accentInk, fontWeight: FontWeight.w700, fontSize: 11)),
                const SizedBox(width: 10),
              ],
              if (q.resolved) ...[
                Icon(Symbols.check_circle_rounded, size: 16, color: p.success),
                const SizedBox(width: 6),
                Text(S.qaResolved, style: TextStyle(color: p.success, fontWeight: FontWeight.w700, fontSize: 11)),
              ],
            ],
          ),
          if (q.pinned || q.resolved) const SizedBox(height: 6),
          Text(
            q.question,
            style: t.bodyLarge!.copyWith(fontSize: 14.5, height: 1.5, fontWeight: FontWeight.w600),
          ),
          if (q.answer != null) ...[
            const SizedBox(height: 10),
            Container(
              padding: const EdgeInsets.all(10),
              decoration: BoxDecoration(
                color: p.surface2,
                borderRadius: BorderRadius.circular(8),
              ),
              child: Row(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  Icon(Symbols.support_agent_rounded, size: 16, color: p.success),
                  const SizedBox(width: 8),
                  Expanded(
                    child: Text(
                      q.answer!.body,
                      style: t.bodyMedium!.copyWith(fontSize: 13.5, height: 1.5),
                    ),
                  ),
                ],
              ),
            ),
          ],
          const SizedBox(height: 8),
          Row(
            children: [
              InkWell(
                borderRadius: AppRadius.brFull,
                onTap: onUpvote,
                child: Container(
                  padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 5),
                  decoration: BoxDecoration(
                    color: q.upvoted ? p.accentWash : p.surface2,
                    borderRadius: AppRadius.brFull,
                  ),
                  child: Row(
                    mainAxisSize: MainAxisSize.min,
                    children: [
                      Icon(
                        Symbols.thumb_up_rounded,
                        size: 14,
                        color: q.upvoted ? p.accentInk : p.muted,
                      ),
                      const SizedBox(width: 4),
                      Text(
                        '${q.upvoteCount}',
                        style: TextStyle(
                          fontWeight: FontWeight.w700,
                          fontSize: 12,
                          color: q.upvoted ? p.accentInk : p.muted,
                        ),
                      ),
                    ],
                  ),
                ),
              ),
              const Spacer(),
              Text(
                _relTime(q.createdAt),
                style: t.labelSmall!.copyWith(color: p.muted, fontSize: 11),
              ),
            ],
          ),
        ],
      ),
    );
  }
}

class _Composer extends StatelessWidget {
  const _Composer({required this.controller, required this.sending, required this.onSend});
  final TextEditingController controller;
  final bool sending;
  final VoidCallback onSend;

  @override
  Widget build(BuildContext context) {
    final p = context.palette;
    return Container(
      padding: const EdgeInsets.fromLTRB(12, 8, 12, 12),
      decoration: BoxDecoration(
        color: p.surface,
        border: Border(top: BorderSide(color: p.border)),
      ),
      child: SafeArea(
        top: false,
        child: Row(
          children: [
            Expanded(
              child: AppTextField(
                controller: controller,
                hint: S.qaAskHint,
              ),
            ),
            const SizedBox(width: 8),
            Material(
              color: p.brand,
              shape: const CircleBorder(),
              child: InkWell(
                customBorder: const CircleBorder(),
                onTap: sending ? null : onSend,
                child: const SizedBox(
                  width: 48,
                  height: 48,
                  child: Icon(Symbols.send_rounded, color: Colors.white),
                ),
              ),
            ),
          ],
        ),
      ),
    );
  }
}

class _Loading extends StatelessWidget {
  const _Loading();
  @override
  Widget build(BuildContext context) {
    return ListView.separated(
      padding: const EdgeInsets.fromLTRB(20, 8, 20, 16),
      itemCount: 4,
      separatorBuilder: (_, __) => const SizedBox(height: 10),
      itemBuilder: (_, __) => const LoadingShimmer(height: 96, radius: AppRadius.md),
    );
  }
}

String _relTime(DateTime dt) {
  final diff = DateTime.now().difference(dt);
  if (diff.inMinutes < 1) return 'עכשיו';
  if (diff.inHours < 1) return 'לפני ${diff.inMinutes}ד׳';
  if (diff.inDays < 1) return 'לפני ${diff.inHours}ש׳';
  return '${dt.day}/${dt.month}';
}
