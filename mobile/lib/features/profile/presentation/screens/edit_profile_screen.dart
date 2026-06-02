import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';

import '../../../../commons.dart';
import '../../../../core/i18n/strings.dart';
import '../../../../data/models/auth_dto.dart';
import '../../../../shared/widgets/widgets.dart';
import '../../../auth/presentation/providers/auth_providers.dart';

/// Spec: design-specs/EditProfile.json (route "/me/edit").
/// BackButton, SaveButton (link, accent), AvatarUpload(96), DisplayNameField,
/// UsernameField (DEFERRED — see DESIGN_DEVIATIONS), BioField (textArea, 160 max),
/// InterestChips (editable).
class EditProfileScreen extends ConsumerStatefulWidget {
  const EditProfileScreen({super.key});

  @override
  ConsumerState<EditProfileScreen> createState() => _EditProfileScreenState();
}

class _EditProfileScreenState extends ConsumerState<EditProfileScreen> {
  final _nameCtrl = TextEditingController();
  final _bioCtrl = TextEditingController();
  Set<String> _interests = {};
  bool _saving = false;
  bool _initialized = false;

  static const _interestCatalog = [
    'טכנולוגיה',
    'יזמות',
    'אומנות',
    'מוסיקה',
    'ספורט',
    'אוכל',
    'נסיעות',
    'קריאה',
    'משחקים',
    'התנדבות',
    'הורות',
    'בריאות',
  ];

  @override
  void dispose() {
    _nameCtrl.dispose();
    _bioCtrl.dispose();
    super.dispose();
  }

  void _hydrate(UserDto user) {
    if (_initialized) return;
    _initialized = true;
    _nameCtrl.text = user.name;
    _bioCtrl.text = user.bio ?? '';
    _interests = user.interests.toSet();
  }

  bool _isDirty(UserDto user) {
    if (_nameCtrl.text.trim() != user.name) return true;
    if (_bioCtrl.text.trim() != (user.bio ?? '')) return true;
    if (!_setEq(_interests, user.interests.toSet())) return true;
    return false;
  }

  bool _setEq(Set<String> a, Set<String> b) =>
      a.length == b.length && a.every(b.contains);

  Future<void> _save(UserDto user) async {
    if (_saving) return;
    final name = _nameCtrl.text.trim();
    if (name.isEmpty) {
      ScaffoldMessenger.of(context).showSnackBar(
        const SnackBar(content: Text(S.nameRequired)),
      );
      return;
    }
    setState(() => _saving = true);
    try {
      await ref.read(authNotifierProvider.notifier).updateProfile(
            name: name,
            bio: _bioCtrl.text.trim(),
            interests: _interests.toList(),
          );
      if (!mounted) return;
      ScaffoldMessenger.of(context).showSnackBar(
        const SnackBar(content: Text(S.profileSaveSuccess)),
      );
      if (GoRouter.of(context).canPop()) GoRouter.of(context).pop();
    } catch (_) {
      if (!mounted) return;
      ScaffoldMessenger.of(context).showSnackBar(
        const SnackBar(content: Text(S.profileSaveFailed)),
      );
    } finally {
      if (mounted) setState(() => _saving = false);
    }
  }

  Future<bool> _confirmDiscard(UserDto user) async {
    if (!_isDirty(user)) return true;
    final p = context.palette;
    final confirmed = await showDialog<bool>(
      context: context,
      builder: (ctx) => AlertDialog(
        backgroundColor: p.surface,
        title: const Text(S.editProfile),
        content: const Text('יש שינויים שלא נשמרו. לזרוק אותם?'),
        actions: [
          TextButton(onPressed: () => Navigator.of(ctx).pop(false), child: const Text(S.cancel)),
          TextButton(onPressed: () => Navigator.of(ctx).pop(true), child: const Text(S.confirm)),
        ],
      ),
    );
    return confirmed ?? false;
  }

  @override
  Widget build(BuildContext context) {
    final auth = ref.watch(authNotifierProvider);
    if (auth is! AuthAuthenticated) {
      return const Scaffold(body: Center(child: CircularProgressIndicator()));
    }
    final user = auth.user;
    _hydrate(user);

    final p = context.palette;
    final t = Theme.of(context).textTheme;

    return Directionality(
      textDirection: TextDirection.rtl,
      child: PopScope(
        canPop: false,
        onPopInvokedWithResult: (didPop, _) async {
          if (didPop) return;
          if (await _confirmDiscard(user) && context.mounted) {
            GoRouter.of(context).pop();
          }
        },
        child: Scaffold(
          backgroundColor: p.background,
          appBar: AppBar(
            backgroundColor: p.background,
            elevation: 0,
            scrolledUnderElevation: 0,
            leading: AppBackButton(),
            title: Text(S.editProfile, style: t.titleMedium!.copyWith(fontSize: 16)),
            centerTitle: true,
            actions: [
              TextButton(
                onPressed: _saving ? null : () => _save(user),
                child: _saving
                    ? const SizedBox(width: 18, height: 18, child: CircularProgressIndicator(strokeWidth: 2))
                    : Text(
                        S.save,
                        style: t.labelLarge!.copyWith(
                          color: p.accentInk,
                          fontWeight: FontWeight.w700,
                        ),
                      ),
              ),
              const SizedBox(width: 4),
            ],
          ),
          body: SafeArea(
            top: false,
            child: SingleChildScrollView(
              padding: const EdgeInsets.fromLTRB(20, 8, 20, 32),
              child: Directionality(
                textDirection: TextDirection.rtl,
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.stretch,
                  children: [
                    Center(
                      child: AvatarUpload(
                        name: _nameCtrl.text.isEmpty ? user.email : _nameCtrl.text,
                        photoUrl: user.photoUrl,
                        size: 96,
                        onTap: () {},
                      ),
                    ),
                    const SizedBox(height: 24),
                    Text(S.fullName, style: t.labelSmall!.copyWith(color: p.muted, fontSize: 11.5)),
                    const SizedBox(height: 6),
                    AppTextField(
                      controller: _nameCtrl,
                      hint: S.fullName,
                    ),
                    const SizedBox(height: 16),
                    Text(S.profileBio, style: t.labelSmall!.copyWith(color: p.muted, fontSize: 11.5)),
                    const SizedBox(height: 6),
                    AppTextField(
                      controller: _bioCtrl,
                      hint: S.profileBioHint,
                      maxLines: 4,
                      maxLength: 160,
                    ),
                    const SizedBox(height: 16),
                    Text('תחומי עניין', style: t.labelSmall!.copyWith(color: p.muted, fontSize: 11.5)),
                    const SizedBox(height: 8),
                    InterestChipGroup(
                      options: _interestCatalog,
                      selected: _interests,
                      onChanged: (next) => setState(() => _interests = next),
                    ),
                  ],
                ),
              ),
            ),
          ),
        ),
      ),
    );
  }
}
