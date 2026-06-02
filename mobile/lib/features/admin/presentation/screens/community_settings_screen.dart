import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';
import 'package:material_symbols_icons/symbols.dart';

import '../../../../commons.dart';
import '../../../../core/i18n/strings.dart';
import '../../../../shared/widgets/widgets.dart';
import '../../../communities/presentation/providers/community_providers.dart';
import '../../../events/presentation/providers/event_providers.dart';
import '../providers/admin_providers.dart';

/// Spec: design-specs/CommunitySettings.json — links to Basics / Branding / Privacy /
/// Roles / Rules / Welcome message editors. Welcome + Rules edit inline.
class CommunitySettingsScreen extends ConsumerStatefulWidget {
  const CommunitySettingsScreen({super.key});
  @override
  ConsumerState<CommunitySettingsScreen> createState() => _S();
}

class _S extends ConsumerState<CommunitySettingsScreen> {
  final _welcomeCtrl = TextEditingController();
  final _rulesCtrl = TextEditingController();
  bool _hydrated = false;
  bool _saving = false;

  @override
  void dispose() {
    _welcomeCtrl.dispose();
    _rulesCtrl.dispose();
    super.dispose();
  }

  Future<void> _save(String cid) async {
    if (_saving) return;
    setState(() => _saving = true);
    try {
      await ref.read(adminRepositoryProvider).updateCommunity(cid, {
        'settings': {
          'welcomeMessage': _welcomeCtrl.text.trim(),
          'rules': _rulesCtrl.text.trim(),
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

  @override
  Widget build(BuildContext context) {
    final p = context.palette;
    final t = Theme.of(context).textTheme;
    final cid = ref.watch(activeCommunityIdProvider);
    if (cid == null) return const Scaffold(body: Center(child: Text(S.noCommunities)));
    final async = ref.watch(communityDetailProvider(cid));
    return Directionality(
      textDirection: TextDirection.rtl,
      child: Scaffold(
        backgroundColor: p.background,
        appBar: AppBar(
          backgroundColor: p.background,
          elevation: 0,
          scrolledUnderElevation: 0,
          leading: AppBackButton(),
          title: Text(S.settingsTitle, style: t.titleMedium!.copyWith(fontSize: 16)),
          centerTitle: true,
          actions: [
            TextButton(
              onPressed: _saving ? null : () => _save(cid),
              child: Text(S.save, style: t.labelLarge!.copyWith(color: p.accentInk, fontWeight: FontWeight.w700)),
            ),
          ],
        ),
        body: async.when(
          loading: () => const Center(child: CircularProgressIndicator()),
          error: (e, _) => ErrorState(onRetry: () => ref.invalidate(communityDetailProvider(cid))),
          data: (c) {
            if (!_hydrated) {
              _welcomeCtrl.text = c.welcomeMessage ?? '';
              _rulesCtrl.text = c.rules ?? '';
              _hydrated = true;
            }
            return SafeArea(
              top: false,
              child: ListView(
                padding: const EdgeInsets.fromLTRB(20, 12, 20, 24),
                children: [
                  _NavRow(
                    icon: Symbols.palette_rounded,
                    label: S.settingsBranding,
                    onTap: () => GoRouter.of(context).push('/admin/settings/branding'),
                  ),
                  _NavRow(
                    icon: Symbols.shield_person_rounded,
                    label: S.settingsRoles,
                    onTap: () => GoRouter.of(context).push('/admin/settings/roles'),
                  ),
                  const SizedBox(height: 18),
                  Text(S.settingsWelcome, style: t.labelSmall!.copyWith(color: p.muted, fontSize: 11.5)),
                  const SizedBox(height: 6),
                  AppTextField(controller: _welcomeCtrl, hint: S.settingsWelcome, maxLines: 4, maxLength: 2000),
                  const SizedBox(height: 14),
                  Text(S.settingsRules, style: t.labelSmall!.copyWith(color: p.muted, fontSize: 11.5)),
                  const SizedBox(height: 6),
                  AppTextField(controller: _rulesCtrl, hint: S.settingsRules, maxLines: 8, maxLength: 4000),
                  const SizedBox(height: 18),
                  AppButton(
                    S.save,
                    loading: _saving,
                    onPressed: _saving ? null : () => _save(cid),
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

class _NavRow extends StatelessWidget {
  const _NavRow({required this.icon, required this.label, required this.onTap});
  final IconData icon;
  final String label;
  final VoidCallback onTap;
  @override
  Widget build(BuildContext context) {
    final p = context.palette;
    final t = Theme.of(context).textTheme;
    return Container(
      margin: const EdgeInsets.only(bottom: 8),
      decoration: BoxDecoration(
        color: p.surface,
        borderRadius: AppRadius.brMd,
        border: Border.all(color: p.border),
      ),
      child: InkWell(
        borderRadius: AppRadius.brMd,
        onTap: onTap,
        child: Padding(
          padding: const EdgeInsets.symmetric(horizontal: 14, vertical: 14),
          child: Row(
            children: [
              Icon(icon, color: p.accentInk, size: 22),
              const SizedBox(width: 12),
              Expanded(child: Text(label, style: t.bodyMedium!.copyWith(fontSize: 14.5))),
              Icon(Symbols.chevron_left_rounded, color: p.muted, size: 22),
            ],
          ),
        ),
      ),
    );
  }
}
