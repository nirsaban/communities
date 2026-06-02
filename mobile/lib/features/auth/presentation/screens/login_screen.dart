import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';
import 'package:material_symbols_icons/symbols.dart';

import '../../../../commons.dart';
import '../../../../core/i18n/strings.dart';
import '../../../../shared/widgets/widgets.dart';
import '../providers/auth_providers.dart';

/// Spec: design-specs/LogIn.json (route "/login")
/// Components in order: BackButton, Title, EmailField, PasswordField (with
/// revealToggle), ForgotLink, LogInButton, SocialButtons.
class LoginScreen extends ConsumerStatefulWidget {
  const LoginScreen({super.key});

  @override
  ConsumerState<LoginScreen> createState() => _LoginScreenState();
}

class _LoginScreenState extends ConsumerState<LoginScreen> {
  final _emailCtrl = TextEditingController();
  final _passwordCtrl = TextEditingController();
  String? _emailError;
  String? _passwordError;

  @override
  void dispose() {
    _emailCtrl.dispose();
    _passwordCtrl.dispose();
    super.dispose();
  }

  bool _validate() {
    setState(() {
      _emailError = null;
      _passwordError = null;
    });
    final email = _emailCtrl.text.trim();
    if (email.isEmpty) {
      setState(() => _emailError = S.emailRequired);
      return false;
    }
    if (!RegExp(r'^[^@\s]+@[^@\s]+\.[^@\s]+$').hasMatch(email)) {
      setState(() => _emailError = S.emailInvalid);
      return false;
    }
    if (_passwordCtrl.text.isEmpty) {
      setState(() => _passwordError = S.passwordRequired);
      return false;
    }
    return true;
  }

  Future<void> _submit() async {
    if (!_validate()) return;
    await ref.read(authNotifierProvider.notifier).login(
          email: _emailCtrl.text.trim(),
          password: _passwordCtrl.text,
        );
  }

  @override
  Widget build(BuildContext context) {
    final p = context.palette;
    final t = Theme.of(context).textTheme;
    final state = ref.watch(authNotifierProvider);
    final loading = state is AuthLoading;
    final serverError = state is AuthUnauthenticated ? state.error : null;

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
            Text(S.signInTitle, style: t.displayLarge),
            const SizedBox(height: AppSpacing.sectionGap),
            // Email — forced LTR so the IME behaves on RTL pages.
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
                leadingIcon: Symbols.lock_rounded,
                obscure: true,
                errorText: _passwordError,
              ),
            ),
            const SizedBox(height: AppSpacing.s2),
            Align(
              alignment: AlignmentDirectional.centerEnd,
              child: TextButton(
                onPressed: loading ? null : () => context.push('/forgot'),
                child: const Text(S.forgotPassword),
              ),
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
                child: Text(
                  serverError,
                  style: t.bodyMedium!.copyWith(color: p.error),
                ),
              ),
            ],
            const SizedBox(height: AppSpacing.s4),
            AppButton(
              S.signInCta,
              onPressed: loading ? null : _submit,
              loading: loading,
            ),
            const SizedBox(height: AppSpacing.s3),
            Center(
              child: Text(
                S.orSeparator,
                style: t.bodyMedium!.copyWith(color: p.muted),
              ),
            ),
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
            const SizedBox(height: AppSpacing.s4),
            Center(
              child: TextButton(
                onPressed: loading ? null : () => context.push('/signup'),
                child: const Text(S.noAccountSignUp),
              ),
            ),
          ],
        ),
      ),
    );
  }
}
