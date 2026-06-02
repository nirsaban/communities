import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:material_symbols_icons/symbols.dart';

import '../../../../commons.dart';
import '../../../../core/i18n/strings.dart';
import '../../../../shared/widgets/widgets.dart';
import '../providers/super_providers.dart';

/// Spec: design-specs/PlatformSettings.json (super-only). Billing keys card (masked),
/// Maintenance toggle, Signups toggle, EmailTemplates + Terms shortcut rows.
class PlatformSettingsScreen extends ConsumerStatefulWidget {
  const PlatformSettingsScreen({super.key});
  @override
  ConsumerState<PlatformSettingsScreen> createState() => _S();
}

class _S extends ConsumerState<PlatformSettingsScreen> {
  bool _maintenance = false;
  bool _allowSignups = true;
  bool _hydrated = false;
  bool _payplusRevealed = false;

  Future<void> _patch({bool? maintenance, bool? signups}) async {
    try {
      await ref.read(superRepositoryProvider).updateSettings(
            maintenanceMode: maintenance,
            allowSignups: signups,
          );
      ref.invalidate(superSettingsProvider);
      if (!mounted) return;
      ScaffoldMessenger.of(context).showSnackBar(const SnackBar(content: Text(S.superSettingsSaved)));
    } catch (_) {/* ignored */}
  }

  @override
  Widget build(BuildContext context) {
    final p = context.palette;
    final t = Theme.of(context).textTheme;
    final async = ref.watch(superSettingsProvider);
    return Directionality(
      textDirection: TextDirection.rtl,
      child: Scaffold(
        backgroundColor: p.background,
        appBar: AppBar(
          backgroundColor: p.background,
          elevation: 0,
          scrolledUnderElevation: 0,
          leading: AppBackButton(),
          title: Text(S.superSettingsTitle, style: t.titleMedium!.copyWith(fontSize: 16)),
          centerTitle: true,
        ),
        body: async.when(
          loading: () => const Center(child: CircularProgressIndicator()),
          error: (e, _) => ErrorState(onRetry: () => ref.invalidate(superSettingsProvider)),
          data: (s) {
            if (!_hydrated) {
              _maintenance = (s['maintenanceMode'] as bool?) ?? false;
              _allowSignups = (s['allowSignups'] as bool?) ?? true;
              _hydrated = true;
            }
            final masked = (s['payplusKeyMasked'] as String?) ?? '';
            return SafeArea(
              top: false,
              child: ListView(
                padding: const EdgeInsets.fromLTRB(20, 12, 20, 28),
                children: [
                  Container(
                    padding: const EdgeInsets.all(16),
                    decoration: BoxDecoration(
                      color: p.surface,
                      borderRadius: AppRadius.brMd,
                      border: Border.all(color: p.border),
                    ),
                    child: Column(
                      crossAxisAlignment: CrossAxisAlignment.start,
                      children: [
                        Row(
                          children: [
                            Icon(Symbols.attach_money_rounded, color: p.accentInk),
                            const SizedBox(width: 8),
                            Text(S.superSettingsBilling, style: t.titleMedium!.copyWith(fontWeight: FontWeight.w700)),
                          ],
                        ),
                        const SizedBox(height: 10),
                        Row(
                          children: [
                            Expanded(
                              child: Text(
                                _payplusRevealed ? 'pp_test_••••••••_REDACTED' : masked,
                                style: t.bodyMedium!.copyWith(fontFamily: 'monospace'),
                              ),
                            ),
                            TextButton(
                              onPressed: () => setState(() => _payplusRevealed = !_payplusRevealed),
                              child: Text(_payplusRevealed ? 'הסתר' : 'חשוף'),
                            ),
                          ],
                        ),
                      ],
                    ),
                  ),
                  const SizedBox(height: 14),
                  Container(
                    decoration: BoxDecoration(
                      color: p.surface,
                      borderRadius: AppRadius.brMd,
                      border: Border.all(color: p.border),
                    ),
                    child: Column(
                      children: [
                        SwitchListTile.adaptive(
                          title: Text(S.superSettingsMaintenance),
                          value: _maintenance,
                          onChanged: (v) {
                            setState(() => _maintenance = v);
                            _patch(maintenance: v);
                          },
                        ),
                        Container(height: 1, margin: const EdgeInsets.symmetric(horizontal: 14), color: p.border),
                        SwitchListTile.adaptive(
                          title: Text(S.superSettingsAllowSignups),
                          value: _allowSignups,
                          onChanged: (v) {
                            setState(() => _allowSignups = v);
                            _patch(signups: v);
                          },
                        ),
                      ],
                    ),
                  ),
                  const SizedBox(height: 14),
                  Container(
                    decoration: BoxDecoration(
                      color: p.surface,
                      borderRadius: AppRadius.brMd,
                      border: Border.all(color: p.border),
                    ),
                    child: Column(
                      children: [
                        ListTile(
                          leading: Icon(Symbols.mail_rounded, color: p.accentInk),
                          title: Text(S.superSettingsEmailTemplates),
                          trailing: Icon(Symbols.chevron_left_rounded, color: p.muted),
                          onTap: () {},
                        ),
                        Container(height: 1, margin: const EdgeInsetsDirectional.only(start: 60), color: p.border),
                        ListTile(
                          leading: Icon(Symbols.description_rounded, color: p.accentInk),
                          title: Text(S.superSettingsTerms),
                          trailing: Icon(Symbols.chevron_left_rounded, color: p.muted),
                          onTap: () {},
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
