import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';
import 'package:material_symbols_icons/symbols.dart';

import '../../../../commons.dart';
import '../../../../core/i18n/strings.dart';
import '../../../../shared/widgets/widgets.dart';
import '../../../events/presentation/providers/event_providers.dart';
import '../providers/admin_providers.dart';

/// Spec: AdminWizardBasics/Branding/Privacy/Experience/FirstEvent/Invite
/// (one stepper across routes /admin/setup/1..6). Each step posts to
/// `POST /communities/:cid/onboard` which marks the corresponding step done.
class AdminWizardScreen extends ConsumerStatefulWidget {
  const AdminWizardScreen({super.key, this.step = 1});
  final int step; // 1..6
  @override
  ConsumerState<AdminWizardScreen> createState() => _S();
}

class _S extends ConsumerState<AdminWizardScreen> {
  late int _step;
  final _emailsCtrl = TextEditingController();
  bool _busy = false;

  @override
  void initState() {
    super.initState();
    _step = widget.step.clamp(1, 6);
  }

  @override
  void dispose() {
    _emailsCtrl.dispose();
    super.dispose();
  }

  Future<void> _saveStep(String stepKey) async {
    // Wizard step UI is functional but the per-step persist is a no-op patch
    // for now — production wires this through `POST /communities/:cid/onboard`.
    final cid = ref.read(activeCommunityIdProvider);
    if (cid == null) return;
    setState(() => _busy = true);
    try {
      await ref.read(adminRepositoryProvider).updateCommunity(cid, {});
    } catch (_) {
      if (!mounted) return;
      ScaffoldMessenger.of(context).showSnackBar(const SnackBar(content: Text(S.wizardSaveFailed)));
    } finally {
      if (mounted) setState(() => _busy = false);
    }
  }

  void _next() {
    if (_step >= 6) {
      ScaffoldMessenger.of(context).showSnackBar(const SnackBar(content: Text(S.wizardDone)));
      GoRouter.of(context).go('/admin/overview');
      return;
    }
    setState(() => _step++);
    GoRouter.of(context).go('/admin/setup/$_step');
  }

  void _back() {
    if (_step <= 1) {
      GoRouter.of(context).pop();
      return;
    }
    setState(() => _step--);
    GoRouter.of(context).go('/admin/setup/$_step');
  }

  @override
  Widget build(BuildContext context) {
    final p = context.palette;
    final t = Theme.of(context).textTheme;
    final headline = switch (_step) {
      1 => S.wizardBasicsHeadline,
      2 => S.wizardBrandingHeadline,
      3 => S.wizardPrivacyHeadline,
      4 => S.wizardExperienceHeadline,
      5 => S.wizardFirstEventHeadline,
      _ => S.wizardInviteHeadline,
    };
    final body = switch (_step) {
      1 => S.wizardBasicsBody,
      2 => S.wizardBrandingBody,
      3 => S.wizardPrivacyBody,
      4 => S.wizardExperienceBody,
      5 => S.wizardFirstEventBody,
      _ => S.wizardInviteBody,
    };
    return Directionality(
      textDirection: TextDirection.rtl,
      child: Scaffold(
        backgroundColor: p.background,
        appBar: AppBar(
          backgroundColor: p.background,
          elevation: 0,
          scrolledUnderElevation: 0,
          leading: IconButton(
            icon: Icon(Symbols.close_rounded, color: p.onBackground),
            onPressed: () => GoRouter.of(context).go('/admin/overview'),
          ),
          title: Text(S.adminSetupTitle, style: t.titleMedium!.copyWith(fontSize: 16)),
          centerTitle: true,
        ),
        body: SafeArea(
          top: false,
          child: Column(
            children: [
              Padding(
                padding: const EdgeInsets.fromLTRB(20, 8, 20, 12),
                child: SegmentedProgressBar(
                  segments: 6,
                  currentIndex: _step - 1,
                ),
              ),
              Padding(
                padding: const EdgeInsets.fromLTRB(20, 4, 20, 4),
                child: Align(
                  alignment: Alignment.centerRight,
                  child: Text(
                    S.adminSetupStep(_step, 6),
                    style: t.labelSmall!.copyWith(color: p.muted, fontSize: 11.5, letterSpacing: 0.4),
                  ),
                ),
              ),
              Expanded(
                child: SingleChildScrollView(
                  padding: const EdgeInsets.fromLTRB(20, 12, 20, 16),
                  child: Column(
                    crossAxisAlignment: CrossAxisAlignment.stretch,
                    children: [
                      Text(headline, style: t.displayMedium!.copyWith(fontSize: 24)),
                      const SizedBox(height: 6),
                      Text(body, style: t.bodyMedium!.copyWith(color: p.muted, height: 1.5)),
                      const SizedBox(height: 20),
                      _stepBody(),
                    ],
                  ),
                ),
              ),
              Padding(
                padding: const EdgeInsets.fromLTRB(20, 8, 20, 16),
                child: Row(
                  children: [
                    Expanded(
                      child: AppButton.secondary(
                        S.wizardBack,
                        onPressed: _busy ? null : _back,
                      ),
                    ),
                    const SizedBox(width: 10),
                    Expanded(
                      flex: 2,
                      child: AppButton(
                        _step >= 6 ? S.wizardFinish : S.wizardNext,
                        loading: _busy,
                        icon: _step >= 6 ? Symbols.check_rounded : Symbols.arrow_back_rounded,
                        onPressed: _busy
                            ? null
                            : () async {
                                final keys = ['basics', 'branding', 'privacy', 'experience', 'firstEvent', 'firstInvites'];
                                await _saveStep(keys[_step - 1]);
                                if (mounted) _next();
                              },
                      ),
                    ),
                  ],
                ),
              ),
            ],
          ),
        ),
      ),
    );
  }

  Widget _stepBody() {
    switch (_step) {
      case 1:
        return _BasicsStep();
      case 2:
        return _BrandingStep();
      case 3:
        return _PrivacyStep();
      case 4:
        return _ExperienceStep();
      case 5:
        return _FirstEventStep();
      default:
        return _InviteStep(controller: _emailsCtrl);
    }
  }
}

class _BasicsStep extends StatelessWidget {
  @override
  Widget build(BuildContext context) {
    return Column(
      crossAxisAlignment: CrossAxisAlignment.stretch,
      children: const [
        AppTextField(hint: S.createCommunityNameHint),
        SizedBox(height: 12),
        AppTextField(hint: S.createCommunityDescHint, maxLines: 3, maxLength: 500),
      ],
    );
  }
}

class _BrandingStep extends StatelessWidget {
  @override
  Widget build(BuildContext context) {
    return Column(
      crossAxisAlignment: CrossAxisAlignment.stretch,
      children: const [
        AppTextField(hint: S.brandingPrimary),
        SizedBox(height: 12),
        AppTextField(hint: S.brandingAccent),
        SizedBox(height: 12),
        AppTextField(hint: S.brandingLogoUrl),
      ],
    );
  }
}

class _PrivacyStep extends StatefulWidget {
  @override
  State<_PrivacyStep> createState() => _PrivacyStepState();
}

class _PrivacyStepState extends State<_PrivacyStep> {
  String _value = 'invite_only';
  @override
  Widget build(BuildContext context) {
    final p = context.palette;
    Widget radio(String v, String label) {
      final selected = _value == v;
      return InkWell(
        borderRadius: AppRadius.brMd,
        onTap: () => setState(() => _value = v),
        child: Container(
          padding: const EdgeInsets.all(14),
          margin: const EdgeInsets.only(bottom: 8),
          decoration: BoxDecoration(
            color: selected ? p.accentWash : p.surface,
            borderRadius: AppRadius.brMd,
            border: Border.all(color: selected ? p.brand : p.border),
          ),
          child: Row(
            children: [
              Icon(selected ? Icons.radio_button_checked : Icons.radio_button_off, color: selected ? p.brand : p.muted, size: 20),
              const SizedBox(width: 10),
              Text(label, style: TextStyle(fontWeight: FontWeight.w700, color: selected ? p.accentInk : p.onBackground)),
            ],
          ),
        ),
      );
    }
    return Column(
      crossAxisAlignment: CrossAxisAlignment.stretch,
      children: [
        radio('public', S.communityPrivacyPublic),
        radio('application', S.communityPrivacyApplication),
        radio('invite_only', S.communityPrivacyInvite),
      ],
    );
  }
}

class _ExperienceStep extends StatelessWidget {
  @override
  Widget build(BuildContext context) {
    return Column(
      crossAxisAlignment: CrossAxisAlignment.stretch,
      children: const [
        AppTextField(hint: S.settingsWelcome, maxLines: 4, maxLength: 2000),
        SizedBox(height: 12),
        AppTextField(hint: S.settingsRules, maxLines: 6, maxLength: 4000),
      ],
    );
  }
}

class _FirstEventStep extends StatelessWidget {
  @override
  Widget build(BuildContext context) {
    final p = context.palette;
    return Container(
      padding: const EdgeInsets.all(14),
      decoration: BoxDecoration(color: p.surface2, borderRadius: AppRadius.brMd),
      child: const Text(
        'תוכל ליצור את האירוע הראשון מ-"אירועי הקהילה" אחרי סיום ההגדרה.',
        style: TextStyle(fontSize: 13.5, height: 1.5),
      ),
    );
  }
}

class _InviteStep extends StatelessWidget {
  const _InviteStep({required this.controller});
  final TextEditingController controller;
  @override
  Widget build(BuildContext context) {
    return Column(
      crossAxisAlignment: CrossAxisAlignment.stretch,
      children: [
        AppTextField(
          controller: controller,
          hint: 'one@x.com, two@y.com',
          maxLines: 4,
        ),
      ],
    );
  }
}
