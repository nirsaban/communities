import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:material_symbols_icons/symbols.dart';

import '../../../../commons.dart';
import '../../../../core/i18n/strings.dart';
import '../../../../shared/widgets/widgets.dart';
import '../../../communities/presentation/providers/community_providers.dart';
import '../../../events/presentation/providers/event_providers.dart';
import '../providers/admin_providers.dart';

/// Spec: design-specs/BrandingCustomizer.json — primary/accent color hex, logo + cover URL,
/// live preview tile. Patches /communities/:cid with `{logoUrl, coverUrl, settings.branding}`.
class BrandingCustomizerScreen extends ConsumerStatefulWidget {
  const BrandingCustomizerScreen({super.key});
  @override
  ConsumerState<BrandingCustomizerScreen> createState() => _S();
}

class _S extends ConsumerState<BrandingCustomizerScreen> {
  final _primaryCtrl = TextEditingController(text: '#FF5C35');
  final _accentCtrl = TextEditingController(text: '#FF7A52');
  final _logoCtrl = TextEditingController();
  final _coverCtrl = TextEditingController();
  bool _saving = false;

  @override
  void dispose() {
    _primaryCtrl.dispose();
    _accentCtrl.dispose();
    _logoCtrl.dispose();
    _coverCtrl.dispose();
    super.dispose();
  }

  Future<void> _save(String cid) async {
    if (_saving) return;
    setState(() => _saving = true);
    try {
      await ref.read(adminRepositoryProvider).updateCommunity(cid, {
        if (_logoCtrl.text.trim().isNotEmpty) 'logoUrl': _logoCtrl.text.trim(),
        if (_coverCtrl.text.trim().isNotEmpty) 'coverUrl': _coverCtrl.text.trim(),
        'settings': {
          'branding': {
            'primaryColor': _primaryCtrl.text.trim(),
            'accentColor': _accentCtrl.text.trim(),
          },
        },
      });
      ref.invalidate(communityDetailProvider(cid));
      if (!mounted) return;
      ScaffoldMessenger.of(context).showSnackBar(const SnackBar(content: Text(S.settingsSaved)));
    } catch (_) {
      if (!mounted) return;
      ScaffoldMessenger.of(context).showSnackBar(const SnackBar(content: Text(S.settingsSaveFailed)));
    } finally {
      if (mounted) setState(() => _saving = false);
    }
  }

  Color? _parseHex(String s) {
    final t = s.replaceAll('#', '');
    if (t.length != 6 && t.length != 8) return null;
    final v = int.tryParse(t.length == 6 ? 'FF$t' : t, radix: 16);
    return v == null ? null : Color(v);
  }

  @override
  Widget build(BuildContext context) {
    final p = context.palette;
    final t = Theme.of(context).textTheme;
    final cid = ref.watch(activeCommunityIdProvider);
    if (cid == null) return const Scaffold(body: Center(child: Text(S.noCommunities)));
    final preview = _parseHex(_primaryCtrl.text) ?? p.brand;
    return Directionality(
      textDirection: TextDirection.rtl,
      child: Scaffold(
        backgroundColor: p.background,
        appBar: AppBar(
          backgroundColor: p.background,
          elevation: 0,
          scrolledUnderElevation: 0,
          leading: AppBackButton(),
          title: Text(S.brandingTitle, style: t.titleMedium!.copyWith(fontSize: 16)),
          centerTitle: true,
          actions: [
            TextButton(
              onPressed: _saving ? null : () => _save(cid),
              child: Text(S.save, style: t.labelLarge!.copyWith(color: p.accentInk, fontWeight: FontWeight.w700)),
            ),
          ],
        ),
        body: SafeArea(
          top: false,
          child: SingleChildScrollView(
            padding: const EdgeInsets.fromLTRB(20, 12, 20, 24),
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.stretch,
              children: [
                // Live preview
                Container(
                  padding: const EdgeInsets.all(16),
                  decoration: BoxDecoration(
                    color: preview.withValues(alpha: 0.15),
                    borderRadius: AppRadius.brMd,
                    border: Border.all(color: preview),
                  ),
                  child: Row(
                    children: [
                      Container(
                        width: 40,
                        height: 40,
                        decoration: BoxDecoration(color: preview, borderRadius: BorderRadius.circular(10)),
                        alignment: Alignment.center,
                        child: const Icon(Symbols.groups_rounded, color: Colors.white),
                      ),
                      const SizedBox(width: 10),
                      Text(S.brandingPreview, style: TextStyle(color: preview, fontWeight: FontWeight.w700)),
                    ],
                  ),
                ),
                const SizedBox(height: 18),
                AppTextField(controller: _primaryCtrl, hint: S.brandingPrimary, onChanged: (_) => setState(() {})),
                const SizedBox(height: 10),
                AppTextField(controller: _accentCtrl, hint: S.brandingAccent),
                const SizedBox(height: 10),
                AppTextField(controller: _logoCtrl, hint: S.brandingLogoUrl),
                const SizedBox(height: 10),
                AppTextField(controller: _coverCtrl, hint: S.brandingCoverUrl),
                const SizedBox(height: 18),
                AppButton(S.save, loading: _saving, onPressed: _saving ? null : () => _save(cid)),
              ],
            ),
          ),
        ),
      ),
    );
  }
}
