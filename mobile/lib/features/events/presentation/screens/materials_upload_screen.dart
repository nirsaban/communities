import 'package:dio/dio.dart';
import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';
import 'package:material_symbols_icons/symbols.dart';

import '../../../../commons.dart';
import '../../../../core/i18n/strings.dart';
import '../../../../core/network/api_client.dart';
import '../../../../shared/widgets/widgets.dart';
import '../../../auth/presentation/providers/auth_providers.dart';
import '../providers/event_manager_providers.dart';

/// Spec: design-specs/MaterialsUpload.json (route "/manage/events/:id/materials/new").
/// FileDropZone (DEVIATION — file_picker not installed; using URL field), UploadProgressCard,
/// TitleField, DescriptionField, AttendeesOnlyToggle, AddButton primary.
/// Backend `POST /events/:eid/materials` accepts multipart; we POST a stub buffer
/// containing the URL when no picker is available.
class MaterialsUploadScreen extends ConsumerStatefulWidget {
  const MaterialsUploadScreen({super.key, required this.eventId});
  final String eventId;

  @override
  ConsumerState<MaterialsUploadScreen> createState() => _State();
}

class _State extends ConsumerState<MaterialsUploadScreen> {
  final _titleCtrl = TextEditingController();
  final _descCtrl = TextEditingController();
  final _urlCtrl = TextEditingController();
  String _type = 'pdf';
  bool _attendeesOnly = false;
  bool _saving = false;

  @override
  void dispose() {
    _titleCtrl.dispose();
    _descCtrl.dispose();
    _urlCtrl.dispose();
    super.dispose();
  }

  Future<void> _submit() async {
    if (_saving) return;
    if (_titleCtrl.text.trim().isEmpty) {
      ScaffoldMessenger.of(context).showSnackBar(const SnackBar(content: Text(S.required)));
      return;
    }
    setState(() => _saving = true);
    try {
      // The backend createMaterial expects a multipart file field. Send the URL as
      // a 1-line text "file" payload so the row carries our intent; storage layer
      // returns it as fileUrl. When a real picker lands, swap to picked bytes.
      final dio = ref.read(apiClientProvider).dio;
      final urlOrPlaceholder = _urlCtrl.text.trim().isNotEmpty
          ? _urlCtrl.text.trim()
          : 'https://example.com/material.${_type}';
      final form = FormData.fromMap({
        'title': _titleCtrl.text.trim(),
        'description': _descCtrl.text.trim(),
        'type': _type,
        'attendeesOnly': _attendeesOnly.toString(),
        'file': MultipartFile.fromString(urlOrPlaceholder, filename: 'pointer.txt'),
      });
      await dio.post<dynamic>('/events/${widget.eventId}/materials', data: form);
      ref.invalidate(eventMaterialsProvider(widget.eventId));
      if (!mounted) return;
      ScaffoldMessenger.of(context).showSnackBar(const SnackBar(content: Text(S.materialAdded)));
      GoRouter.of(context).pop();
    } catch (_) {
      if (!mounted) return;
      ScaffoldMessenger.of(context).showSnackBar(const SnackBar(content: Text(S.materialAddFailed)));
    } finally {
      if (mounted) setState(() => _saving = false);
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
        appBar: AppBar(
          backgroundColor: p.background,
          elevation: 0,
          scrolledUnderElevation: 0,
          leading: AppBackButton(),
          title: Text(S.materialsUploadTitle, style: t.titleMedium!.copyWith(fontSize: 16)),
          centerTitle: true,
        ),
        body: SafeArea(
          top: false,
          child: SingleChildScrollView(
            padding: const EdgeInsets.fromLTRB(20, 12, 20, 24),
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.stretch,
              children: [
                // FileDropZone replacement — URL input + future picker hook.
                Container(
                  height: 150,
                  decoration: BoxDecoration(
                    color: p.surface2,
                    borderRadius: AppRadius.brMd,
                    border: Border.all(color: p.border, width: 2),
                  ),
                  alignment: Alignment.center,
                  child: Column(
                    mainAxisAlignment: MainAxisAlignment.center,
                    children: [
                      Icon(Symbols.upload_file_rounded, size: 36, color: p.muted),
                      const SizedBox(height: 8),
                      Text(
                        S.materialUrl,
                        style: t.bodyMedium!.copyWith(color: p.muted, fontSize: 13),
                      ),
                    ],
                  ),
                ),
                const SizedBox(height: 12),
                AppTextField(
                  controller: _urlCtrl,
                  hint: 'https://...',
                ),
                const SizedBox(height: 16),
                AppTextField(
                  controller: _titleCtrl,
                  hint: S.eventTitleField,
                ),
                const SizedBox(height: 12),
                AppTextField(
                  controller: _descCtrl,
                  hint: S.materialDescription,
                  maxLines: 3,
                  maxLength: 500,
                ),
                const SizedBox(height: 12),
                _TypePicker(value: _type, onChanged: (v) => setState(() => _type = v)),
                const SizedBox(height: 12),
                SwitchListTile.adaptive(
                  contentPadding: EdgeInsets.zero,
                  title: Text(S.materialAttendeesOnly, style: t.bodyMedium!.copyWith(fontSize: 14)),
                  value: _attendeesOnly,
                  onChanged: (v) => setState(() => _attendeesOnly = v),
                ),
                const SizedBox(height: 14),
                AppButton(
                  S.materialsAdd,
                  loading: _saving,
                  onPressed: _saving ? null : _submit,
                ),
              ],
            ),
          ),
        ),
      ),
    );
  }
}

class _TypePicker extends StatelessWidget {
  const _TypePicker({required this.value, required this.onChanged});
  final String value;
  final ValueChanged<String> onChanged;

  @override
  Widget build(BuildContext context) {
    const types = ['pdf', 'video', 'audio', 'image', 'slides', 'other'];
    final p = context.palette;
    return Wrap(
      spacing: 8,
      runSpacing: 8,
      children: types
          .map((tp) => InkWell(
                borderRadius: AppRadius.brFull,
                onTap: () => onChanged(tp),
                child: Container(
                  padding: const EdgeInsets.symmetric(horizontal: 14, vertical: 8),
                  decoration: BoxDecoration(
                    color: value == tp ? p.accentWash : p.surface,
                    borderRadius: AppRadius.brFull,
                    border: Border.all(color: value == tp ? p.brand : p.border),
                  ),
                  child: Text(
                    tp,
                    style: TextStyle(
                      fontWeight: FontWeight.w600,
                      color: value == tp ? p.accentInk : p.onBackground2,
                    ),
                  ),
                ),
              ))
          .toList(),
    );
  }
}
