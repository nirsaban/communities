import 'dart:async';

import 'package:flutter/material.dart';
import 'package:go_router/go_router.dart';
import 'package:material_symbols_icons/symbols.dart';

import '../../../../commons.dart';
import '../../../../core/i18n/strings.dart';
import '../../../../shared/widgets/widgets.dart';

/// Spec: design-specs/EmailVerification.json (route "/verify")
/// Components in order: BackButton, IconBlob, Title, Body, OTPInput (6-digit),
/// VerifyButton, ResendTimer.
///
/// NB: backend does not yet expose an email-OTP verification endpoint; this
/// screen renders the UI per spec but the submit handler is a stub. Tracked
/// in DESIGN_DEVIATIONS.md.
class EmailVerificationScreen extends StatefulWidget {
  const EmailVerificationScreen({super.key, required this.email});
  final String email;

  @override
  State<EmailVerificationScreen> createState() => _EmailVerificationScreenState();
}

class _EmailVerificationScreenState extends State<EmailVerificationScreen> {
  String _code = '';
  String? _error;
  bool _loading = false;
  int _resendCooldown = 60;
  Timer? _cooldownTimer;

  @override
  void initState() {
    super.initState();
    _startCooldown();
  }

  void _startCooldown() {
    _cooldownTimer?.cancel();
    setState(() => _resendCooldown = 60);
    _cooldownTimer = Timer.periodic(const Duration(seconds: 1), (_) {
      if (!mounted) return;
      setState(() => _resendCooldown -= 1);
      if (_resendCooldown <= 0) _cooldownTimer?.cancel();
    });
  }

  @override
  void dispose() {
    _cooldownTimer?.cancel();
    super.dispose();
  }

  Future<void> _submit() async {
    if (_code.length != 6) {
      setState(() => _error = S.required);
      return;
    }
    setState(() {
      _error = null;
      _loading = true;
    });
    // Stub — backend OTP verify endpoint pending. See DESIGN_DEVIATIONS.md.
    // Per spec interaction: "VerifyButton → profile setup".
    await Future<void>.delayed(const Duration(milliseconds: 400));
    if (!mounted) return;
    setState(() => _loading = false);
    context.go('/onboard/profile');
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
            const Center(child: IconBlob(icon: Symbols.mark_email_read_rounded)),
            const SizedBox(height: AppSpacing.sectionGap),
            Text(S.verifyEmailTitle, style: t.displayMedium),
            const SizedBox(height: AppSpacing.s3),
            Text(
              S.verifyEmailBody(widget.email),
              style: t.bodyLarge!.copyWith(color: p.muted),
            ),
            const SizedBox(height: AppSpacing.sectionGap),
            OtpInput(
              onChanged: (v) => setState(() => _code = v),
              onCompleted: (_) => _submit(),
              errorText: _error,
            ),
            const SizedBox(height: AppSpacing.s4),
            AppButton(
              S.verify,
              onPressed: _loading ? null : _submit,
              loading: _loading,
            ),
            const SizedBox(height: AppSpacing.s3),
            Center(
              child: TextButton(
                onPressed: _resendCooldown > 0
                    ? null
                    : () {
                        _startCooldown();
                      },
                child: Text(
                  _resendCooldown > 0
                      ? '${S.resendIn} $_resendCooldown'
                      : S.resendNow,
                  style: t.bodyMedium!.copyWith(
                    color: _resendCooldown > 0 ? p.muted : p.accentInk,
                  ),
                ),
              ),
            ),
          ],
        ),
      ),
    );
  }
}
