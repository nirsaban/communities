import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';
import 'package:material_symbols_icons/symbols.dart';

import '../../../../commons.dart';
import '../../../../core/i18n/strings.dart';
import '../../../../features/auth/presentation/providers/auth_providers.dart';
import '../../../../shared/widgets/widgets.dart';

/// Spec: design-specs/ProfileSetup.json (route "/onboard/profile")
/// Components in order: ProgressBar (2 segments), StepLabel, Title,
/// AvatarUpload (104×104), DisplayNameField, UsernameField, ContinueButton.
class ProfileSetupScreen extends ConsumerStatefulWidget {
  const ProfileSetupScreen({super.key});

  @override
  ConsumerState<ProfileSetupScreen> createState() => _ProfileSetupScreenState();
}

class _ProfileSetupScreenState extends ConsumerState<ProfileSetupScreen> {
  final _displayNameCtrl = TextEditingController();
  final _usernameCtrl = TextEditingController();
  String? _nameError;
  bool _saving = false;

  @override
  void initState() {
    super.initState();
    // Seed from current user.
    final state = ref.read(authNotifierProvider);
    if (state is AuthAuthenticated) {
      _displayNameCtrl.text = state.user.name;
    }
  }

  @override
  void dispose() {
    _displayNameCtrl.dispose();
    _usernameCtrl.dispose();
    super.dispose();
  }

  Future<void> _continue() async {
    if (_displayNameCtrl.text.trim().isEmpty) {
      setState(() => _nameError = S.nameRequired);
      return;
    }
    // Demo flow: navigate forward only. The /auth/me PATCH that persists name +
    // username arrives in P6 once we have a proper PATCH endpoint pair.
    context.go('/onboard/interests');
  }

  @override
  Widget build(BuildContext context) {
    final p = context.palette;
    final t = Theme.of(context).textTheme;
    final auth = ref.watch(authNotifierProvider);
    final name = auth is AuthAuthenticated
        ? (auth.user.name.isEmpty ? auth.user.email : auth.user.name)
        : '';
    return Scaffold(
      backgroundColor: p.background,
      body: SafeArea(
        child: ListView(
          padding: const EdgeInsets.symmetric(
            horizontal: AppSpacing.pagePadding,
            vertical: AppSpacing.s2,
          ),
          children: [
            const AppBackButton(),
            const SizedBox(height: AppSpacing.s3),
            const SegmentedProgressBar(segments: 2, currentIndex: 0),
            const SizedBox(height: AppSpacing.s2),
            Text(S.stepOfN(1, 2),
                style: t.labelSmall!.copyWith(color: p.muted)),
            const SizedBox(height: AppSpacing.s2),
            Text(S.profileSetupTitle, style: t.displayMedium),
            const SizedBox(height: AppSpacing.s4),
            Center(child: AvatarUpload(name: name)),
            const SizedBox(height: AppSpacing.s4),
            AppTextField(
              controller: _displayNameCtrl,
              label: S.fullName,
              leadingIcon: Symbols.person_rounded,
              errorText: _nameError,
            ),
            const SizedBox(height: AppSpacing.s3),
            Directionality(
              textDirection: TextDirection.ltr,
              child: AppTextField(
                controller: _usernameCtrl,
                label: S.username,
                hint: '@username',
                leadingIcon: Symbols.alternate_email_rounded,
              ),
            ),
            const SizedBox(height: AppSpacing.s4 * 2),
            AppButton(
              S.continueCta,
              onPressed: _saving ? null : _continue,
              loading: _saving,
            ),
          ],
        ),
      ),
    );
  }
}
