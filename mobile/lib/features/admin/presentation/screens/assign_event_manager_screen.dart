import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';
import 'package:material_symbols_icons/symbols.dart';

import '../../../../commons.dart';
import '../../../../core/i18n/strings.dart';
import '../../../../shared/widgets/widgets.dart';
import '../providers/admin_providers.dart';

/// Spec: design-specs/AssignEventManager.json — pick a user to manage an event.
/// User-search picker is deferred (DEVIATION); for now accept a userId string.
class AssignEventManagerScreen extends ConsumerStatefulWidget {
  const AssignEventManagerScreen({super.key, required this.eventId});
  final String eventId;
  @override
  ConsumerState<AssignEventManagerScreen> createState() => _S();
}

class _S extends ConsumerState<AssignEventManagerScreen> {
  final _uidCtrl = TextEditingController();
  bool _saving = false;

  @override
  void dispose() {
    _uidCtrl.dispose();
    super.dispose();
  }

  Future<void> _assign() async {
    final uid = _uidCtrl.text.trim();
    if (uid.isEmpty) {
      ScaffoldMessenger.of(context).showSnackBar(const SnackBar(content: Text(S.required)));
      return;
    }
    setState(() => _saving = true);
    try {
      await ref.read(adminRepositoryProvider).assignEventManager(widget.eventId, uid);
      if (!mounted) return;
      ScaffoldMessenger.of(context).showSnackBar(const SnackBar(content: Text(S.assignedToast)));
      GoRouter.of(context).pop();
    } catch (_) {
      if (!mounted) return;
      ScaffoldMessenger.of(context).showSnackBar(const SnackBar(content: Text(S.eventSaveFailed)));
    } finally {
      if (mounted) setState(() => _saving = false);
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
          title: Text(S.assignEvtMgrTitle, style: t.titleMedium!.copyWith(fontSize: 16)),
          centerTitle: true,
        ),
        body: SafeArea(
          top: false,
          child: Padding(
            padding: const EdgeInsets.fromLTRB(20, 12, 20, 24),
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.stretch,
              children: [
                Directionality(
                  textDirection: TextDirection.ltr,
                  child: AppTextField(
                    controller: _uidCtrl,
                    hint: S.assignEvtMgrHint,
                    leadingIcon: Symbols.person_rounded,
                  ),
                ),
                const SizedBox(height: 14),
                AppButton(
                  S.assignEvtMgrAssign,
                  icon: Symbols.shield_person_rounded,
                  loading: _saving,
                  onPressed: _saving ? null : _assign,
                ),
              ],
            ),
          ),
        ),
      ),
    );
  }
}
