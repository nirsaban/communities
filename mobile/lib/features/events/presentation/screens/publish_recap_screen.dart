import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';
import 'package:material_symbols_icons/symbols.dart';

import '../../../../commons.dart';
import '../../../../core/i18n/strings.dart';
import '../../../../shared/widgets/widgets.dart';
import '../providers/event_manager_providers.dart';
import '../providers/event_providers.dart';

/// Spec: design-specs/PublishRecap.json (route "/manage/events/:id/recap").
/// AttendanceKPIs, RecapNoteField, PhotoGridUpload (URL fields — DEVIATION), NotifyToggle, Publish primary.
class PublishRecapScreen extends ConsumerStatefulWidget {
  const PublishRecapScreen({super.key, required this.eventId});
  final String eventId;

  @override
  ConsumerState<PublishRecapScreen> createState() => _State();
}

class _State extends ConsumerState<PublishRecapScreen> {
  final _bodyCtrl = TextEditingController();
  final List<TextEditingController> _photoCtrls = [TextEditingController()];
  bool _notify = true;
  bool _saving = false;
  bool _hydrated = false;

  @override
  void dispose() {
    _bodyCtrl.dispose();
    for (final c in _photoCtrls) {
      c.dispose();
    }
    super.dispose();
  }

  void _hydrateOnce(String? body, List<String> photos) {
    if (_hydrated) return;
    _hydrated = true;
    if (body != null && body.isNotEmpty) _bodyCtrl.text = body;
    if (photos.isNotEmpty) {
      _photoCtrls.clear();
      for (final url in photos) {
        _photoCtrls.add(TextEditingController(text: url));
      }
      _photoCtrls.add(TextEditingController());
    }
  }

  Future<void> _publish() async {
    if (_saving) return;
    if (_bodyCtrl.text.trim().isEmpty) {
      ScaffoldMessenger.of(context).showSnackBar(const SnackBar(content: Text(S.required)));
      return;
    }
    setState(() => _saving = true);
    try {
      final urls = _photoCtrls.map((c) => c.text.trim()).where((u) => u.isNotEmpty).toList();
      await ref.read(eventManagerRepoProvider).publishRecap(
            widget.eventId,
            body: _bodyCtrl.text.trim(),
            photoUrls: urls,
            notify: _notify,
          );
      ref.invalidate(eventDetailProvider(widget.eventId));
      if (!mounted) return;
      ScaffoldMessenger.of(context).showSnackBar(const SnackBar(content: Text(S.recapPublished)));
      GoRouter.of(context).pop();
    } catch (_) {
      if (!mounted) return;
      ScaffoldMessenger.of(context).showSnackBar(const SnackBar(content: Text(S.recapPublishFailed)));
    } finally {
      if (mounted) setState(() => _saving = false);
    }
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
          title: Text(S.recapTitle, style: t.titleMedium!.copyWith(fontSize: 16)),
          centerTitle: true,
        ),
        body: async.when(
          loading: () => const Center(child: CircularProgressIndicator()),
          error: (e, _) => ErrorState(onRetry: () => ref.invalidate(eventDetailProvider(widget.eventId))),
          data: (event) {
            _hydrateOnce(event.summary?.body, event.summary?.photoUrls ?? const []);
            return SafeArea(
              top: false,
              child: SingleChildScrollView(
                padding: const EdgeInsets.fromLTRB(20, 12, 20, 24),
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.stretch,
                  children: [
                    // AttendanceKPIs
                    Row(
                      children: [
                        Expanded(child: _Kpi(value: '${event.metrics.rsvpCount}', label: S.recapAttendees)),
                        const SizedBox(width: 12),
                        Expanded(
                          child: _Kpi(
                            value: '${_photoCtrls.where((c) => c.text.trim().isNotEmpty).length}',
                            label: S.recapPhotosCount,
                          ),
                        ),
                      ],
                    ),
                    const SizedBox(height: 18),
                    Text(S.recapBody, style: t.labelSmall!.copyWith(color: p.muted, fontSize: 11.5)),
                    const SizedBox(height: 6),
                    AppTextField(
                      controller: _bodyCtrl,
                      hint: S.recapBodyHint,
                      maxLines: 6,
                      maxLength: 4000,
                    ),
                    const SizedBox(height: 18),
                    Text(S.recapPhotos, style: t.labelSmall!.copyWith(color: p.muted, fontSize: 11.5)),
                    const SizedBox(height: 6),
                    ..._photoCtrls.asMap().entries.map(
                          (e) => Padding(
                            padding: const EdgeInsets.only(bottom: 8),
                            child: AppTextField(
                              controller: e.value,
                              hint: 'https://...',
                              onChanged: (_) => setState(() {}),
                            ),
                          ),
                        ),
                    AppButton.secondary(
                      S.recapAddPhoto,
                      icon: Symbols.add_a_photo_rounded,
                      onPressed: () => setState(() => _photoCtrls.add(TextEditingController())),
                    ),
                    const SizedBox(height: 12),
                    SwitchListTile.adaptive(
                      contentPadding: EdgeInsets.zero,
                      title: Text(S.recapNotify, style: t.bodyMedium!.copyWith(fontSize: 14)),
                      value: _notify,
                      onChanged: (v) => setState(() => _notify = v),
                    ),
                    const SizedBox(height: 14),
                    AppButton(
                      S.recapPublish,
                      icon: Symbols.publish_rounded,
                      loading: _saving,
                      onPressed: _saving ? null : _publish,
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

class _Kpi extends StatelessWidget {
  const _Kpi({required this.value, required this.label});
  final String value;
  final String label;

  @override
  Widget build(BuildContext context) {
    final p = context.palette;
    final t = Theme.of(context).textTheme;
    return Container(
      padding: const EdgeInsets.symmetric(vertical: 14),
      decoration: BoxDecoration(
        color: p.surface,
        borderRadius: AppRadius.brMd,
        border: Border.all(color: p.border),
      ),
      child: Column(
        children: [
          Text(value, style: t.titleLarge!.copyWith(fontSize: 20, fontWeight: FontWeight.w700)),
          const SizedBox(height: 2),
          Text(label, style: t.labelSmall!.copyWith(color: p.muted, fontSize: 11)),
        ],
      ),
    );
  }
}
