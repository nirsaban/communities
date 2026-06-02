import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';
import 'package:material_symbols_icons/symbols.dart';

import '../../../../commons.dart';
import '../../../../core/i18n/strings.dart';
import '../../../../shared/widgets/widgets.dart';
import '../../../auth/presentation/providers/auth_providers.dart';
import '../../../communities/presentation/providers/community_providers.dart';

/// Spec: design-specs/AccountDeletion.json (route "/settings/delete").
/// BackButton, WarningBlob, Title, ConsequencesList, TypedConfirmField (DELETE),
/// DeleteButton (danger, full, disabled until match), KeepButton (ghost).
/// Action calls DELETE /auth/me — 30-day soft-delete grace.
class AccountDeletionScreen extends ConsumerStatefulWidget {
  const AccountDeletionScreen({super.key});

  @override
  ConsumerState<AccountDeletionScreen> createState() => _State();
}

class _State extends ConsumerState<AccountDeletionScreen> {
  final _ctrl = TextEditingController();
  bool _busy = false;

  static const _confirmWord = 'DELETE';

  @override
  void dispose() {
    _ctrl.dispose();
    super.dispose();
  }

  Future<void> _delete() async {
    if (_busy) return;
    setState(() => _busy = true);
    try {
      final when = await ref.read(meRepositoryProvider).deleteAccount();
      if (!mounted) return;
      ScaffoldMessenger.of(context).showSnackBar(
        SnackBar(content: Text(S.deleteAccountScheduled(when))),
      );
      // Force logout; the backend revoked all refresh tokens already.
      await ref.read(authNotifierProvider.notifier).clear();
      if (!mounted) return;
      GoRouter.of(context).go('/login');
    } catch (_) {
      if (!mounted) return;
      ScaffoldMessenger.of(context).showSnackBar(
        const SnackBar(content: Text(S.deleteAccountFailed)),
      );
    } finally {
      if (mounted) setState(() => _busy = false);
    }
  }

  @override
  Widget build(BuildContext context) {
    final p = context.palette;
    final t = Theme.of(context).textTheme;
    final canDelete = _ctrl.text.trim() == _confirmWord;

    return Directionality(
      textDirection: TextDirection.rtl,
      child: Scaffold(
        backgroundColor: p.background,
        appBar: AppBar(
          backgroundColor: p.background,
          elevation: 0,
          scrolledUnderElevation: 0,
          leading: AppBackButton(),
          title: Text(S.deleteAccountTitle, style: t.titleMedium!.copyWith(fontSize: 16)),
          centerTitle: true,
        ),
        body: SafeArea(
          top: false,
          child: SingleChildScrollView(
            padding: const EdgeInsets.fromLTRB(20, 12, 20, 24),
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.stretch,
              children: [
                Center(
                  child: IconBlob(
                    icon: Symbols.warning_rounded,
                    bg: p.errorWash,
                    color: p.error,
                  ),
                ),
                const SizedBox(height: 18),
                Text(
                  S.deleteAccountTitle,
                  textAlign: TextAlign.center,
                  style: t.displayMedium!.copyWith(fontSize: 26),
                ),
                const SizedBox(height: 8),
                Text(
                  S.deleteAccountSummary,
                  textAlign: TextAlign.center,
                  style: t.bodyMedium!.copyWith(color: p.onBackground2, height: 1.55),
                ),
                const SizedBox(height: 20),
                Container(
                  padding: const EdgeInsets.all(14),
                  decoration: BoxDecoration(
                    color: p.surface,
                    borderRadius: AppRadius.brMd,
                    border: Border.all(color: p.border),
                  ),
                  child: Column(
                    crossAxisAlignment: CrossAxisAlignment.stretch,
                    children: const [
                      _ConsequenceItem(text: S.deleteAccountConsequence1),
                      _Sep(),
                      _ConsequenceItem(text: S.deleteAccountConsequence2),
                      _Sep(),
                      _ConsequenceItem(text: S.deleteAccountConsequence3),
                      _Sep(),
                      _ConsequenceItem(text: S.deleteAccountConsequence4),
                    ],
                  ),
                ),
                const SizedBox(height: 20),
                Text(
                  S.deleteAccountTypeToConfirm,
                  style: t.labelSmall!.copyWith(color: p.muted, fontSize: 11.5),
                ),
                const SizedBox(height: 8),
                Directionality(
                  textDirection: TextDirection.ltr,
                  child: AppTextField(
                    controller: _ctrl,
                    hint: _confirmWord,
                    onChanged: (_) => setState(() {}),
                  ),
                ),
                const SizedBox(height: 16),
                AppButton.danger(
                  S.deleteAccountCta,
                  loading: _busy,
                  onPressed: canDelete && !_busy ? _delete : null,
                ),
                const SizedBox(height: 10),
                AppButton.ghost(
                  S.deleteAccountKeep,
                  onPressed: _busy
                      ? null
                      : () {
                          if (GoRouter.of(context).canPop()) GoRouter.of(context).pop();
                        },
                ),
              ],
            ),
          ),
        ),
      ),
    );
  }
}

class _ConsequenceItem extends StatelessWidget {
  const _ConsequenceItem({required this.text});
  final String text;

  @override
  Widget build(BuildContext context) {
    final p = context.palette;
    final t = Theme.of(context).textTheme;
    return Padding(
      padding: const EdgeInsets.symmetric(vertical: 10),
      child: Row(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Icon(Symbols.error_rounded, size: 18, color: p.error),
          const SizedBox(width: 10),
          Expanded(
            child: Text(
              text,
              style: t.bodyMedium!.copyWith(fontSize: 14, height: 1.5),
            ),
          ),
        ],
      ),
    );
  }
}

class _Sep extends StatelessWidget {
  const _Sep();

  @override
  Widget build(BuildContext context) {
    return Container(height: 1, color: context.palette.border);
  }
}
