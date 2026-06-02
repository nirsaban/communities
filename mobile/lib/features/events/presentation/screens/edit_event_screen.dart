import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';
import 'package:material_symbols_icons/symbols.dart';

import '../../../../commons.dart';
import '../../../../core/i18n/strings.dart';
import '../../../../data/models/event_dto.dart';
import '../../../../shared/widgets/widgets.dart';
import '../providers/event_manager_providers.dart';
import '../providers/event_providers.dart';

/// Spec: design-specs/EditEvent.json (route "/admin/events/:id/edit").
/// StatusChip, TitleField, DateField, LocationField, AssignedManagerSelect (DEVIATION: lookup
/// search defers to C5 members directory), SaveChanges primary, CancelEvent secondary error.
class EditEventScreen extends ConsumerStatefulWidget {
  const EditEventScreen({super.key, required this.eventId});
  final String eventId;

  @override
  ConsumerState<EditEventScreen> createState() => _State();
}

class _State extends ConsumerState<EditEventScreen> {
  final _titleCtrl = TextEditingController();
  final _dateCtrl = TextEditingController();
  final _locationCtrl = TextEditingController();
  bool _hydrated = false;
  bool _saving = false;

  @override
  void dispose() {
    _titleCtrl.dispose();
    _dateCtrl.dispose();
    _locationCtrl.dispose();
    super.dispose();
  }

  void _hydrate(EventDto e) {
    if (_hydrated) return;
    _hydrated = true;
    _titleCtrl.text = e.title;
    _dateCtrl.text = '${e.startAt.year}-${e.startAt.month.toString().padLeft(2, '0')}-${e.startAt.day.toString().padLeft(2, '0')}';
    _locationCtrl.text = e.location.displayLabel ?? '';
  }

  Future<void> _save() async {
    if (_saving) return;
    setState(() => _saving = true);
    try {
      final patch = <String, dynamic>{};
      if (_titleCtrl.text.trim().isNotEmpty) patch['title'] = _titleCtrl.text.trim();
      if (_locationCtrl.text.trim().isNotEmpty) {
        patch['location'] = _locationCtrl.text.trim().startsWith('http')
            ? {'type': 'online', 'url': _locationCtrl.text.trim()}
            : {'type': 'physical', 'address': _locationCtrl.text.trim()};
      }
      await ref.read(eventManagerRepoProvider).updateEvent(widget.eventId, patch);
      ref.invalidate(eventDetailProvider(widget.eventId));
      if (!mounted) return;
      ScaffoldMessenger.of(context).showSnackBar(const SnackBar(content: Text(S.profileSaveSuccess)));
      GoRouter.of(context).pop();
    } catch (_) {
      if (!mounted) return;
      ScaffoldMessenger.of(context).showSnackBar(const SnackBar(content: Text(S.eventSaveFailed)));
    } finally {
      if (mounted) setState(() => _saving = false);
    }
  }

  Future<void> _cancelEvent() async {
    final ok = await showDialog<bool>(
      context: context,
      builder: (ctx) => AlertDialog(
        title: const Text(S.eventCancelCta),
        content: const Text(S.eventCancelConfirm),
        actions: [
          TextButton(onPressed: () => Navigator.of(ctx).pop(false), child: const Text(S.cancel)),
          TextButton(onPressed: () => Navigator.of(ctx).pop(true), child: const Text(S.confirm)),
        ],
      ),
    );
    if (ok != true) return;
    try {
      await ref.read(eventManagerRepoProvider).cancelEvent(widget.eventId);
      ref.invalidate(eventDetailProvider(widget.eventId));
      if (!mounted) return;
      ScaffoldMessenger.of(context).showSnackBar(const SnackBar(content: Text(S.eventCancelledToast)));
      GoRouter.of(context).pop();
    } catch (_) {/* ignored */}
  }

  @override
  Widget build(BuildContext context) {
    final p = context.palette;
    final t = Theme.of(context).textTheme;
    final async = ref.watch(eventDetailProvider(widget.eventId));
    return Directionality(
      textDirection: TextDirection.rtl,
      child: Scaffold(
        backgroundColor: p.background,
        appBar: AppBar(
          backgroundColor: p.background,
          elevation: 0,
          scrolledUnderElevation: 0,
          leading: AppBackButton(),
          title: Text(S.eventEditTitle, style: t.titleMedium!.copyWith(fontSize: 16)),
          centerTitle: true,
          actions: [
            TextButton(
              onPressed: _saving ? null : _save,
              child: Text(
                S.save,
                style: t.labelLarge!.copyWith(color: p.accentInk, fontWeight: FontWeight.w700),
              ),
            ),
          ],
        ),
        body: async.when(
          loading: () => const Center(child: CircularProgressIndicator()),
          error: (e, _) => ErrorState(onRetry: () => ref.invalidate(eventDetailProvider(widget.eventId))),
          data: (event) {
            _hydrate(event);
            return SafeArea(
              top: false,
              child: SingleChildScrollView(
                padding: const EdgeInsets.fromLTRB(20, 12, 20, 24),
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.stretch,
                  children: [
                    Row(
                      children: [
                        Container(
                          height: 22,
                          padding: const EdgeInsets.symmetric(horizontal: 10),
                          decoration: BoxDecoration(
                            color: event.isCancelled
                                ? p.errorWash
                                : event.isCompleted
                                    ? p.successWash
                                    : p.accentWash,
                            borderRadius: AppRadius.brFull,
                          ),
                          alignment: Alignment.center,
                          child: Text(
                            event.status,
                            style: TextStyle(
                              fontSize: 11,
                              fontWeight: FontWeight.w700,
                              color: event.isCancelled
                                  ? p.error
                                  : event.isCompleted
                                      ? p.success
                                      : p.accentInk,
                            ),
                          ),
                        ),
                      ],
                    ),
                    const SizedBox(height: 16),
                    AppTextField(controller: _titleCtrl, hint: S.eventTitleField),
                    const SizedBox(height: 12),
                    AppTextField(controller: _dateCtrl, hint: S.eventDateField, enabled: false),
                    const SizedBox(height: 12),
                    AppTextField(controller: _locationCtrl, hint: S.eventLocationField),
                    const SizedBox(height: 24),
                    AppButton(S.eventSaveCta, loading: _saving, onPressed: _saving ? null : _save),
                    const SizedBox(height: 10),
                    AppButton.secondary(
                      S.eventCancelCta,
                      icon: Symbols.event_busy_rounded,
                      onPressed: event.isCancelled ? null : _cancelEvent,
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
