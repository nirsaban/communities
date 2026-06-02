import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';
import 'package:material_symbols_icons/symbols.dart';

import '../../../../commons.dart';
import '../../../../core/i18n/strings.dart';
import '../../../../shared/widgets/widgets.dart';
import '../providers/auth_providers.dart';

/// Spec: design-specs/ResetPassword.json (route "/reset")
/// Components in order: BackButton, Title, NewPasswordField (revealToggle),
/// PasswordStrengthMeter, ConfirmPasswordField, UpdatePasswordButton.
class ResetPasswordScreen extends ConsumerStatefulWidget {
  const ResetPasswordScreen({super.key, this.initialToken});
  final String? initialToken;

  @override
  ConsumerState<ResetPasswordScreen> createState() => _ResetPasswordScreenState();
}

class _ResetPasswordScreenState extends ConsumerState<ResetPasswordScreen> {
  late final TextEditingController _tokenCtrl;
  final _passwordCtrl = TextEditingController();
  final _confirmCtrl = TextEditingController();
  String? _tokenError;
  String? _passwordError;
  String? _confirmError;
  bool _loading = false;

  @override
  void initState() {
    super.initState();
    _tokenCtrl = TextEditingController(text: widget.initialToken ?? '');
    _passwordCtrl.addListener(() => setState(() {}));
  }

  @override
  void dispose() {
    _tokenCtrl.dispose();
    _passwordCtrl.dispose();
    _confirmCtrl.dispose();
    super.dispose();
  }

  bool _validate() {
    setState(() {
      _tokenError = _passwordError = _confirmError = null;
    });
    if (_tokenCtrl.text.trim().isEmpty) {
      setState(() => _tokenError = S.tokenRequired);
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
    if (_confirmCtrl.text != pw) {
      setState(() => _confirmError = S.passwordsMustMatch);
      return false;
    }
    return true;
  }

  Future<void> _submit() async {
    if (!_validate()) return;
    setState(() => _loading = true);
    try {
      await ref.read(authRepositoryProvider).resetPassword(
            token: _tokenCtrl.text.trim(),
            newPassword: _passwordCtrl.text,
          );
      if (mounted) {
        ScaffoldMessenger.of(context).showSnackBar(
          const SnackBar(content: Text(S.passwordResetDone)),
        );
        context.go('/login');
      }
    } catch (e) {
      if (mounted) setState(() => _passwordError = e.toString());
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
            Text(S.setNewPassword, style: t.displayMedium),
            const SizedBox(height: AppSpacing.s4),
            // Token field — present because backend reset uses tokens, not OTP
            Directionality(
              textDirection: TextDirection.ltr,
              child: AppTextField(
                controller: _tokenCtrl,
                label: S.resetToken,
                leadingIcon: Symbols.key_rounded,
                errorText: _tokenError,
              ),
            ),
            const SizedBox(height: AppSpacing.s3),
            Directionality(
              textDirection: TextDirection.ltr,
              child: AppTextField(
                controller: _passwordCtrl,
                label: S.newPassword,
                helper: S.passwordHelper,
                leadingIcon: Symbols.lock_rounded,
                obscure: true,
                errorText: _passwordError,
              ),
            ),
            const SizedBox(height: AppSpacing.s2),
            PasswordStrengthMeter(password: _passwordCtrl.text),
            const SizedBox(height: AppSpacing.s3),
            Directionality(
              textDirection: TextDirection.ltr,
              child: AppTextField(
                controller: _confirmCtrl,
                label: S.confirmPassword,
                leadingIcon: Symbols.lock_rounded,
                obscure: true,
                errorText: _confirmError,
              ),
            ),
            const SizedBox(height: AppSpacing.s4),
            AppButton(
              S.updatePassword,
              onPressed: _loading ? null : _submit,
              loading: _loading,
            ),
          ],
        ),
      ),
    );
  }
}
