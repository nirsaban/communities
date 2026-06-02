import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';
import 'package:material_symbols_icons/symbols.dart';

import '../../../../commons.dart';
import '../../../../core/i18n/strings.dart';
import '../../../../shared/widgets/widgets.dart';
import '../../../auth/presentation/providers/auth_providers.dart';

/// Spec: design-specs/CreateCommunity.json (role: super_admin, route /super/communities/new).
/// Bob (non-super) sees a guidance card. Super admin sees the create form.
/// POST /super/communities is super-only on the backend.
class CreateCommunityScreen extends ConsumerStatefulWidget {
  const CreateCommunityScreen({super.key});
  @override
  ConsumerState<CreateCommunityScreen> createState() => _S();
}

class _S extends ConsumerState<CreateCommunityScreen> {
  final _name = TextEditingController();
  final _desc = TextEditingController();
  final _slug = TextEditingController();
  final _email = TextEditingController();
  String _category = 'other';
  String _privacy = 'invite_only';
  bool _saving = false;

  @override
  void dispose() {
    _name.dispose();
    _desc.dispose();
    _slug.dispose();
    _email.dispose();
    super.dispose();
  }

  Future<void> _create() async {
    if (_saving) return;
    if (_name.text.trim().isEmpty || _email.text.trim().isEmpty) {
      ScaffoldMessenger.of(context).showSnackBar(const SnackBar(content: Text(S.required)));
      return;
    }
    setState(() => _saving = true);
    try {
      await ref.read(apiClientProvider).dio.post<dynamic>(
        '/super/communities',
        data: {
          'name': _name.text.trim(),
          'description': _desc.text.trim(),
          'category': _category,
          'privacy': _privacy,
          if (_slug.text.trim().isNotEmpty) 'slug': _slug.text.trim(),
          'initialAdminEmail': _email.text.trim(),
        },
      );
      if (!mounted) return;
      ScaffoldMessenger.of(context).showSnackBar(const SnackBar(content: Text(S.eventCreated)));
      GoRouter.of(context).pop();
    } catch (_) {
      if (!mounted) return;
      ScaffoldMessenger.of(context).showSnackBar(const SnackBar(content: Text(S.eventCreateFailed)));
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
          title: Text(S.createCommunityTitle, style: t.titleMedium!.copyWith(fontSize: 16)),
          centerTitle: true,
        ),
        body: SafeArea(
          top: false,
          child: SingleChildScrollView(
            padding: const EdgeInsets.fromLTRB(20, 12, 20, 24),
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.stretch,
              children: [
                Container(
                  padding: const EdgeInsets.all(14),
                  decoration: BoxDecoration(color: p.surface2, borderRadius: AppRadius.brMd),
                  child: Row(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      Icon(Symbols.info_rounded, color: p.muted, size: 18),
                      const SizedBox(width: 10),
                      Expanded(
                        child: Text(
                          S.createCommunityNote,
                          style: t.bodyMedium!.copyWith(color: p.onBackground2, fontSize: 13, height: 1.5),
                        ),
                      ),
                    ],
                  ),
                ),
                const SizedBox(height: 16),
                AppTextField(controller: _name, hint: S.createCommunityNameHint),
                const SizedBox(height: 10),
                AppTextField(controller: _desc, hint: S.createCommunityDescHint, maxLines: 3, maxLength: 1000),
                const SizedBox(height: 10),
                AppTextField(controller: _slug, hint: S.createCommunitySlug),
                const SizedBox(height: 10),
                Directionality(
                  textDirection: TextDirection.ltr,
                  child: AppTextField(controller: _email, hint: S.createCommunityAdminEmail, keyboardType: TextInputType.emailAddress),
                ),
                const SizedBox(height: 10),
                Text(S.createCommunityCategory, style: t.labelSmall!.copyWith(color: p.muted, fontSize: 11.5)),
                const SizedBox(height: 8),
                Wrap(
                  spacing: 8,
                  children: ['religious', 'educational', 'professional', 'hobby', 'other'].map((c) {
                    final sel = c == _category;
                    return InkWell(
                      borderRadius: AppRadius.brFull,
                      onTap: () => setState(() => _category = c),
                      child: Container(
                        padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 8),
                        decoration: BoxDecoration(
                          color: sel ? p.accentWash : p.surface,
                          borderRadius: AppRadius.brFull,
                          border: Border.all(color: sel ? p.brand : p.border),
                        ),
                        child: Text(c, style: TextStyle(fontWeight: FontWeight.w700, color: sel ? p.accentInk : p.onBackground)),
                      ),
                    );
                  }).toList(),
                ),
                const SizedBox(height: 14),
                AppButton(S.createCommunityCta, icon: Symbols.add_circle_rounded, loading: _saving, onPressed: _saving ? null : _create),
              ],
            ),
          ),
        ),
      ),
    );
  }
}
