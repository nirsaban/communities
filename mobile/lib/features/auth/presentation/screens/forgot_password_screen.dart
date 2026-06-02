import 'dart:async';

import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';
import 'package:material_symbols_icons/symbols.dart';

import '../../../../commons.dart';
import '../../../../core/i18n/strings.dart';
import '../../../../shared/widgets/widgets.dart';
import '../providers/auth_providers.dart';

/// Spec: design-specs/ForgotPassword.json (route "/forgot")
/// Components in order: BackButton, IconBlob (96x96), Title, Body, EmailField,
/// SendResetButton, BackToLoginButton.
/// States: default | focused | loading | sent
class ForgotPasswordScreen extends ConsumerStatefulWidget {
  const ForgotPasswordScreen({super.key});

  @override
  ConsumerState<ForgotPasswordScreen> createState() => _ForgotPasswordScreenState();
}

class _ForgotPasswordScreenState extends ConsumerState<ForgotPasswordScreen> {
  final _emailCtrl = TextEditingController();
  String? _emailError;
  bool _loading = false;
  bool _sent = false;
  int _resendCooldown = 0;
  Timer? _cooldownTimer;

  @override
  void dispose() {
    _emailCtrl.dispose();
    _cooldownTimer?.cancel();
    super.dispose();
  }

  bool _validate() {
    setState(() => _emailError = null);
    final email = _emailCtrl.text.trim();
    if (email.isEmpty) {
      setState(() => _emailError = S.emailRequired);
      return false;
    }
    if (!RegExp(r'^[^@\s]+@[^@\s]+\.[^@\s]+$').hasMatch(email)) {
      setState(() => _emailError = S.emailInvalid);
      return false;
    }
    return true;
  }

  Future<void> _submit() async {
    if (!_validate()) return;
    setState(() => _loading = true);
    try {
      await ref
          .read(authRepositoryProvider)
          .forgotPassword(_emailCtrl.text.trim());
      if (!mounted) return;
      setState(() {
        _sent = true;
        _resendCooldown = 60;
      });
      _cooldownTimer = Timer.periodic(const Duration(seconds: 1), (_) {
        if (!mounted) return;
        setState(() => _resendCooldown -= 1);
        if (_resendCooldown <= 0) _cooldownTimer?.cancel();
      });
    } catch (e) {
      // Per the spec — no account enumeration — show the same "sent" UI even on error.
      if (!mounted) return;
      setState(() => _sent = true);
    } finally {
      if (mounted) setState(() => _loading = false);
    }
  }

  @override
  Widget build(BuildContext context) {
    final p = context.palette;
    final t = Theme.of(context).textTheme;
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
            Center(
              child: IconBlob(
                icon: _sent ? Symbols.mark_email_read_rounded : Symbols.lock_reset_rounded,
              ),
            ),
            const SizedBox(height: AppSpacing.sectionGap),
            Text(_sent ? S.resetSentTitle : S.forgotTitle, style: t.displayMedium),
            const SizedBox(height: AppSpacing.s3),
            Text(
              _sent ? S.resetSentBody : S.forgotBody,
              style: t.bodyLarge!.copyWith(color: p.muted),
            ),
            const SizedBox(height: AppSpacing.sectionGap),
            if (!_sent) ...[
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
              const SizedBox(height: AppSpacing.s4),
              AppButton(
                S.sendResetCta,
                onPressed: _loading ? null : _submit,
                loading: _loading,
              ),
            ] else ...[
              AppButton(
                _resendCooldown > 0
                    ? '${S.resendIn} $_resendCooldown'
                    : S.resendNow,
                onPressed: _resendCooldown > 0 || _loading ? null : _submit,
                loading: _loading,
              ),
            ],
            const SizedBox(height: AppSpacing.s2),
            AppButton.ghost(
              S.backToLogin,
              onPressed: () {
                if (GoRouter.of(context).canPop()) {
                  context.pop();
                } else {
                  context.go('/login');
                }
              },
            ),
          ],
        ),
      ),
    );
  }
}
