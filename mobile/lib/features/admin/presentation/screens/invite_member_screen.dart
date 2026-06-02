import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';
import 'package:material_symbols_icons/symbols.dart';

import '../../../../commons.dart';
import '../../../../core/i18n/strings.dart';
import '../../../../shared/widgets/widgets.dart';
import '../../../events/presentation/providers/event_providers.dart';
import '../providers/admin_providers.dart';

/// Spec: design-specs/InviteMember.json (route "/admin/members/invite"). Email field
/// + role picker chips + Send button. Calls existing `POST /communities/:cid/members/invite`.
class InviteMemberScreen extends ConsumerStatefulWidget {
  const InviteMemberScreen({super.key});
  @override
  ConsumerState<InviteMemberScreen> createState() => _S();
}

class _S extends ConsumerState<InviteMemberScreen> {
  final _emailCtrl = TextEditingController();
  String _role = 'member';
  bool _sending = false;

  @override
  void dispose() {
    _emailCtrl.dispose();
    super.dispose();
  }

  Future<void> _send() async {
    final cid = ref.read(activeCommunityIdProvider);
    if (cid == null || _sending) return;
    final email = _emailCtrl.text.trim();
    if (email.isEmpty) {
      ScaffoldMessenger.of(context).showSnackBar(const SnackBar(content: Text(S.emailRequired)));
      return;
    }
    setState(() => _sending = true);
    try {
      await ref.read(adminRepositoryProvider).inviteMember(cid, email: email, role: _role);
      if (!mounted) return;
      ScaffoldMessenger.of(context).showSnackBar(const SnackBar(content: Text(S.inviteSent)));
      GoRouter.of(context).pop();
    } catch (_) {
      if (!mounted) return;
      ScaffoldMessenger.of(context).showSnackBar(const SnackBar(content: Text(S.inviteFailed)));
    } finally {
      if (mounted) setState(() => _sending = false);
    }
  }

  @override
  Widget build(BuildContext context) {
    final p = context.palette;
    final t = Theme.of(context).textTheme;
    return Directionality(
      textDirection: TextDirection.rtl,
      child: Scaffold(
        backgroundColor: p.background,
        appBar: AppBar(
          backgroundColor: p.background,
          elevation: 0,
          scrolledUnderElevation: 0,
          leading: AppBackButton(),
          title: Text(S.inviteMemberTitle, style: t.titleMedium!.copyWith(fontSize: 16)),
          centerTitle: true,
        ),
        body: SafeArea(
          top: false,
          child: SingleChildScrollView(
            padding: const EdgeInsets.fromLTRB(20, 12, 20, 24),
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.stretch,
              children: [
                Directionality(
                  textDirection: TextDirection.ltr,
                  child: AppTextField(
                    controller: _emailCtrl,
                    hint: S.inviteMemberEmail,
                    keyboardType: TextInputType.emailAddress,
                    leadingIcon: Symbols.mail_rounded,
                  ),
                ),
                const SizedBox(height: 14),
                Text(S.inviteMemberRole, style: t.labelSmall!.copyWith(color: p.muted, fontSize: 11.5)),
                const SizedBox(height: 8),
                Wrap(
                  spacing: 8,
                  children: [
                    _RoleChip(label: S.roleFilterMember, value: 'member', selected: _role, onTap: (v) => setState(() => _role = v)),
                    _RoleChip(label: S.roleFilterEventMgr, value: 'event_manager', selected: _role, onTap: (v) => setState(() => _role = v)),
                    _RoleChip(label: S.roleFilterSubadmin, value: 'subadmin', selected: _role, onTap: (v) => setState(() => _role = v)),
                    _RoleChip(label: S.roleFilterAdmin, value: 'admin', selected: _role, onTap: (v) => setState(() => _role = v)),
                  ],
                ),
                const SizedBox(height: 18),
                AppButton(
                  S.inviteMemberSend,
                  icon: Symbols.send_rounded,
                  loading: _sending,
                  onPressed: _sending ? null : _send,
                ),
              ],
            ),
          ),
        ),
      ),
    );
  }
}

class _RoleChip extends StatelessWidget {
  const _RoleChip({required this.label, required this.value, required this.selected, required this.onTap});
  final String label;
  final String value;
  final String selected;
  final ValueChanged<String> onTap;
  @override
  Widget build(BuildContext context) {
    final p = context.palette;
    final isSelected = value == selected;
    return InkWell(
      borderRadius: AppRadius.brFull,
      onTap: () => onTap(value),
      child: Container(
        padding: const EdgeInsets.symmetric(horizontal: 14, vertical: 8),
        decoration: BoxDecoration(
          color: isSelected ? p.accentWash : p.surface,
          borderRadius: AppRadius.brFull,
          border: Border.all(color: isSelected ? p.brand : p.border),
        ),
        child: Text(label,
            style: TextStyle(
              fontWeight: FontWeight.w700,
              color: isSelected ? p.accentInk : p.onBackground,
            )),
      ),
    );
  }
}
