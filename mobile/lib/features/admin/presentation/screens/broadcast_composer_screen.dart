import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';
import 'package:material_symbols_icons/symbols.dart';

import '../../../../commons.dart';
import '../../../../core/i18n/strings.dart';
import '../../../../shared/widgets/widgets.dart';
import '../providers/admin_providers.dart';

/// Spec: design-specs/BroadcastComposer.json (route "/manage/events/:id/broadcast").
/// RecipientRow, MessageField, ScheduleToggle, ChannelChips (Push/Inbox/Email), Send primary.
/// Backend POST /events/:eid/broadcast fans out Notification rows (inbox).
class BroadcastComposerScreen extends ConsumerStatefulWidget {
  const BroadcastComposerScreen({super.key, required this.eventId});
  final String eventId;
  @override
  ConsumerState<BroadcastComposerScreen> createState() => _S();
}

class _S extends ConsumerState<BroadcastComposerScreen> {
  final _ctrl = TextEditingController();
  bool _scheduled = false;
  final Set<String> _channels = {'push', 'inbox'};
  bool _sending = false;

  @override
  void dispose() {
    _ctrl.dispose();
    super.dispose();
  }

  Future<void> _send() async {
    if (_sending) return;
    final msg = _ctrl.text.trim();
    if (msg.isEmpty) {
      ScaffoldMessenger.of(context).showSnackBar(const SnackBar(content: Text(S.required)));
      return;
    }
    setState(() => _sending = true);
    try {
      final n = await ref.read(adminRepositoryProvider).broadcastEvent(widget.eventId, msg);
      if (!mounted) return;
      ScaffoldMessenger.of(context).showSnackBar(SnackBar(content: Text(S.broadcastSent(n))));
      GoRouter.of(context).pop();
    } catch (_) {
      if (!mounted) return;
      ScaffoldMessenger.of(context).showSnackBar(const SnackBar(content: Text(S.broadcastFailed)));
    } finally {
      if (mounted) setState(() => _sending = false);
    }
  }

  @override
  Widget build(BuildContext context) {
    final p = context.palette;
    final t = Theme.of(context).textTheme;
    return Directionality(
      textDirection: TextDirection.rtl,
      child: Scaffold(
        backgroundColor: p.background,
        body: SafeArea(
          child: Column(
            children: [
              Padding(
                padding: const EdgeInsets.fromLTRB(8, 8, 8, 0),
                child: Row(
                  children: [
                    IconButton(
                      onPressed: () => GoRouter.of(context).canPop()
                          ? GoRouter.of(context).pop()
                          : GoRouter.of(context).go('/home'),
                      icon: Icon(Symbols.close_rounded, color: p.onBackground),
                    ),
                    const Spacer(),
                    Text(S.broadcastTitle, style: t.titleMedium!.copyWith(fontSize: 16)),
                    const SizedBox(width: 48),
                  ],
                ),
              ),
              Expanded(
                child: SingleChildScrollView(
                  padding: const EdgeInsets.fromLTRB(20, 12, 20, 16),
                  child: Column(
                    crossAxisAlignment: CrossAxisAlignment.stretch,
                    children: [
                      Container(
                        padding: const EdgeInsets.all(12),
                        decoration: BoxDecoration(
                          color: p.surface,
                          borderRadius: AppRadius.brMd,
                          border: Border.all(color: p.border),
                        ),
                        child: Row(
                          children: [
                            Icon(Symbols.group_rounded, color: p.muted, size: 18),
                            const SizedBox(width: 10),
                            Expanded(child: Text(S.broadcastTo, style: t.bodyMedium!.copyWith(fontSize: 13.5))),
                          ],
                        ),
                      ),
                      const SizedBox(height: 14),
                      AppTextField(
                        controller: _ctrl,
                        hint: S.broadcastMessageHint,
                        maxLines: 6,
                        maxLength: 1000,
                      ),
                      const SizedBox(height: 14),
                      SwitchListTile.adaptive(
                        contentPadding: EdgeInsets.zero,
                        title: Text(S.broadcastSchedule, style: t.bodyMedium!.copyWith(fontSize: 14)),
                        value: _scheduled,
                        onChanged: (v) => setState(() => _scheduled = v),
                      ),
                      if (_scheduled)
                        Container(
                          padding: const EdgeInsets.all(12),
                          decoration: BoxDecoration(
                            color: p.surface2,
                            borderRadius: AppRadius.brMd,
                          ),
                          child: Text(
                            'בחירת תאריך/שעה זמינה בעדכון הבא — ההודעה תישלח באישור.',
                            style: t.bodyMedium!.copyWith(color: p.muted, fontSize: 12.5),
                          ),
                        ),
                      const SizedBox(height: 14),
                      Text(S.broadcastChannels, style: t.labelSmall!.copyWith(color: p.muted, fontSize: 11.5)),
                      const SizedBox(height: 8),
                      Wrap(
                        spacing: 8,
                        children: [
                          _ChannelChip(label: S.broadcastChannelPush, value: 'push', selected: _channels),
                          _ChannelChip(label: S.broadcastChannelInbox, value: 'inbox', selected: _channels),
                          _ChannelChip(label: S.broadcastChannelEmail, value: 'email', selected: _channels),
                        ],
                      ),
                    ],
                  ),
                ),
              ),
              Padding(
                padding: const EdgeInsets.fromLTRB(20, 8, 20, 16),
                child: AppButton(
                  S.broadcastSend,
                  icon: Symbols.campaign_rounded,
                  loading: _sending,
                  onPressed: _sending ? null : _send,
                ),
              ),
            ],
          ),
        ),
      ),
    );
  }
}

class _ChannelChip extends StatefulWidget {
  const _ChannelChip({required this.label, required this.value, required this.selected});
  final String label;
  final String value;
  final Set<String> selected;
  @override
  State<_ChannelChip> createState() => _ChannelChipState();
}

class _ChannelChipState extends State<_ChannelChip> {
  @override
  Widget build(BuildContext context) {
    final p = context.palette;
    final isSelected = widget.selected.contains(widget.value);
    return InkWell(
      borderRadius: AppRadius.brFull,
      onTap: () => setState(() {
        if (isSelected) {
          widget.selected.remove(widget.value);
        } else {
          widget.selected.add(widget.value);
        }
      }),
      child: Container(
        padding: const EdgeInsets.symmetric(horizontal: 14, vertical: 8),
        decoration: BoxDecoration(
          color: isSelected ? p.accentWash : p.surface,
          borderRadius: AppRadius.brFull,
          border: Border.all(color: isSelected ? p.brand : p.border),
        ),
        child: Text(
          widget.label,
          style: TextStyle(
            fontWeight: FontWeight.w700,
            color: isSelected ? p.accentInk : p.onBackground,
          ),
        ),
      ),
    );
  }
}
