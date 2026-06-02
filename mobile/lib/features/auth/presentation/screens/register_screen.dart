import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';
import 'package:material_symbols_icons/symbols.dart';

import '../../../../commons.dart';
import '../../../../core/i18n/strings.dart';
import '../../../../shared/widgets/widgets.dart';
import '../providers/auth_providers.dart';

/// Spec: design-specs/SignUp.json (route "/signup")
/// Components in order: BackButton, Title, FullNameField, EmailField,
/// PasswordField (revealToggle), PasswordStrengthMeter, TermsCheckbox,
/// CreateAccountButton (disabled until terms checked), SocialButtons.
///
/// Spec interaction: "CreateAccountButton → email verification".
class RegisterScreen extends ConsumerStatefulWidget {
  const RegisterScreen({super.key});

  @override
  ConsumerState<RegisterScreen> createState() => _RegisterScreenState();
}

class _RegisterScreenState extends ConsumerState<RegisterScreen> {
  final _nameCtrl = TextEditingController();
  final _emailCtrl = TextEditingController();
  final _passwordCtrl = TextEditingController();
  bool _acceptedTerms = false;
  String? _nameError;
  String? _emailError;
  String? _passwordError;

  @override
  void initState() {
    super.initState();
    _passwordCtrl.addListener(() => setState(() {}));
  }

  @override
  void dispose() {
    _nameCtrl.dispose();
    _emailCtrl.dispose();
    _passwordCtrl.dispose();
    super.dispose();
  }

  bool _validate() {
    setState(() {
      _nameError = _emailError = _passwordError = null;
    });
    if (_nameCtrl.text.trim().isEmpty) {
      setState(() => _nameError = S.nameRequired);
      return false;
    }
    final email = _emailCtrl.text.trim();
    if (email.isEmpty) {
      setState(() => _emailError = S.emailRequired);
      return false;
    }
    if (!RegExp(r'^[^@\s]+@[^@\s]+\.[^@\s]+$').hasMatch(email)) {
      setState(() => _emailError = S.emailInvalid);
      return false;
    }
    final pw = _passwordCtrl.text;
    if (pw.length < 8) {
      setState(() => _passwordError = S.passwordMinChars);
      return false;
    }
    if (!RegExp(r'[A-Za-z]').hasMatch(pw)) {
      setState(() => _passwordError = S.passwordNeedsLetter);
      return false;
    }
    if (!RegExp(r'\d').hasMatch(pw)) {
      setState(() => _passwordError = S.passwordNeedsDigit);
      return false;
    }
    return true;
  }

  Future<void> _submit() async {
    if (!_validate()) return;
    // Per design-spec interaction: "CreateAccountButton → email verification".
    // For the onboarding-flow demo the actual register call is deferred — we
    // walk the user through /verify → /onboard/profile → /onboard/interests
    // first, then the interests screen logs them in so /home shows real data.
    final email = _emailCtrl.text.trim();
    context.go('/verify?email=$email');
  }

  @override
  Widget build(BuildContext context) {
    final p = context.palette;
    final t = Theme.of(context).textTheme;
    final state = ref.watch(authNotifierProvider);
    final loading = state is AuthLoading;
    final serverError = state is AuthUnauthenticated ? state.error : null;
    final canSubmit = _acceptedTerms && !loading;

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
            const SizedBox(height: AppSpacing.s4),
            Text(S.createAccount, style: t.displayLarge),
            // Spec: sectionGap: 16
            const SizedBox(height: AppSpacing.s4),
            AppTextField(
              controller: _nameCtrl,
              label: S.fullName,
              leadingIcon: Symbols.person_rounded,
              errorText: _nameError,
            ),
            const SizedBox(height: AppSpacing.s3),
            Directionality(
              textDirection: TextDirection.ltr,
              child: AppTextField(
                controller: _emailCtrl,
                label: S.email,
                hint: 'name@example.com',
                leadingIcon: Symbols.mail_rounded,
                keyboardType: TextInputType.emailAddress,
                errorText: _emailError,
              ),
            ),
            const SizedBox(height: AppSpacing.s3),
            Directionality(
              textDirection: TextDirection.ltr,
              child: AppTextField(
                controller: _passwordCtrl,
                label: S.password,
                helper: S.passwordHelper,
                leadingIcon: Symbols.lock_rounded,
                obscure: true,
                errorText: _passwordError,
              ),
            ),
            const SizedBox(height: AppSpacing.s2),
            PasswordStrengthMeter(password: _passwordCtrl.text),
            const SizedBox(height: AppSpacing.s3),
            _TermsCheckbox(
              value: _acceptedTerms,
              onChanged: (v) => setState(() => _acceptedTerms = v ?? false),
            ),
            if (serverError != null) ...[
              const SizedBox(height: AppSpacing.s2),
              Container(
                padding: const EdgeInsets.symmetric(
                  horizontal: AppSpacing.s3, vertical: AppSpacing.s2,
                ),
                decoration: BoxDecoration(
                  color: p.errorWash,
                  borderRadius: AppRadius.brSm,
                ),
                child: Text(serverError,
                    style: t.bodyMedium!.copyWith(color: p.error)),
              ),
            ],
            const SizedBox(height: AppSpacing.s4),
            AppButton(
              S.createAccountCta,
              onPressed: canSubmit ? _submit : null,
              loading: loading,
            ),
            const SizedBox(height: AppSpacing.s3),
            Center(child: Text(S.orSeparator,
                style: t.bodyMedium!.copyWith(color: p.muted))),
            const SizedBox(height: AppSpacing.s3),
            const AppButton.secondary(
              S.continueWithApple,
              icon: Symbols.devices_rounded,
              onPressed: null,
            ),
            const SizedBox(height: AppSpacing.s2),
            const AppButton.secondary(
              S.continueWithGoogle,
              icon: Symbols.g_translate_rounded,
              onPressed: null,
            ),
          ],
        ),
      ),
    );
  }
}

class _TermsCheckbox extends StatelessWidget {
  const _TermsCheckbox({required this.value, required this.onChanged});
  final bool value;
  final ValueChanged<bool?> onChanged;

  @override
  Widget build(BuildContext context) {
    final p = context.palette;
    final t = Theme.of(context).textTheme;
    return InkWell(
      borderRadius: AppRadius.brSm,
      onTap: () => onChanged(!value),
      child: Padding(
        padding: const EdgeInsets.symmetric(vertical: AppSpacing.s1),
        child: Row(
          children: [
            Checkbox(
              value: value,
              onChanged: onChanged,
              activeColor: p.brand,
            ),
            Expanded(
              child: Text(S.termsLabel,
                  style: t.bodyMedium!.copyWith(color: p.onBackground2)),
            ),
          ],
        ),
      ),
    );
  }
}
