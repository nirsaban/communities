import 'package:flutter/material.dart';
import 'package:material_symbols_icons/symbols.dart';

import '../../../../commons.dart';
import '../../../../core/i18n/strings.dart';
import '../../../../shared/widgets/widgets.dart';

/// Spec: design-specs/PrivacySettings.json (route "/settings/privacy", member).
/// VisibilityRadioCards (Members/Everyone/OnlyMe), VisibilityToggles list,
/// BlockedMembers row. No `/me/privacy` backend yet — state is local-only
/// in-memory (DEVIATION). The shape is wired to swap in a repository later.
class PrivacySettingsScreen extends StatefulWidget {
  const PrivacySettingsScreen({super.key});

  @override
  State<PrivacySettingsScreen> createState() => _PrivacySettingsScreenState();
}

enum _Visibility { members, everyone, onlyMe }

class _PrivacySettingsScreenState extends State<PrivacySettingsScreen> {
  _Visibility _vis = _Visibility.members;
  bool _showAttendance = true;
  bool _showInitiatives = true;
  bool _allowDms = false;

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
          leading: const AppBackButton(),
          title: Text(S.privacyTitle, style: t.titleMedium!.copyWith(fontSize: 16)),
          centerTitle: true,
        ),
        body: SafeArea(
          top: false,
          child: ListView(
            padding: const EdgeInsets.fromLTRB(20, 8, 20, 24),
            children: [
              Padding(
                padding: const EdgeInsets.fromLTRB(2, 4, 2, 10),
                child: Text(
                  S.privacyProfileVisibility,
                  style: t.labelSmall!.copyWith(color: p.muted, fontSize: 11.5, letterSpacing: 0.4),
                ),
              ),
              _VisibilityCard(
                icon: Symbols.groups_rounded,
                label: S.privacyVisMembers,
                selected: _vis == _Visibility.members,
                onTap: () => setState(() => _vis = _Visibility.members),
              ),
              const SizedBox(height: 8),
              _VisibilityCard(
                icon: Symbols.public_rounded,
                label: S.privacyVisEveryone,
                selected: _vis == _Visibility.everyone,
                onTap: () => setState(() => _vis = _Visibility.everyone),
              ),
              const SizedBox(height: 8),
              _VisibilityCard(
                icon: Symbols.lock_rounded,
                label: S.privacyVisOnlyMe,
                selected: _vis == _Visibility.onlyMe,
                onTap: () => setState(() => _vis = _Visibility.onlyMe),
              ),
              const SizedBox(height: 22),
              _GroupCard(
                children: [
                  _ToggleRow(
                    label: S.privacyShowAttendance,
                    value: _showAttendance,
                    onChanged: (v) => setState(() => _showAttendance = v),
                  ),
                  _RowDivider(),
                  _ToggleRow(
                    label: S.privacyShowInitiatives,
                    value: _showInitiatives,
                    onChanged: (v) => setState(() => _showInitiatives = v),
                  ),
                  _RowDivider(),
                  _ToggleRow(
                    label: S.privacyAllowMessages,
                    value: _allowDms,
                    onChanged: (v) => setState(() => _allowDms = v),
                  ),
                ],
              ),
              const SizedBox(height: 14),
              _GroupCard(
                children: [
                  InkWell(
                    borderRadius: AppRadius.brMd,
                    onTap: () {},
                    child: Padding(
                      padding: const EdgeInsets.symmetric(horizontal: 14, vertical: 14),
                      child: Row(
                        children: [
                          Icon(Symbols.block_rounded, size: 20, color: p.muted),
                          const SizedBox(width: 12),
                          Expanded(
                            child: Text(
                              S.privacyBlockedMembers,
                              style: t.bodyMedium!.copyWith(fontSize: 14.5),
                            ),
                          ),
                          Icon(Symbols.chevron_left_rounded, size: 20, color: p.muted),
                        ],
                      ),
                    ),
                  ),
                ],
              ),
            ],
          ),
        ),
      ),
    );
  }
}

class _VisibilityCard extends StatelessWidget {
  const _VisibilityCard({
    required this.icon,
    required this.label,
    required this.selected,
    required this.onTap,
  });
  final IconData icon;
  final String label;
  final bool selected;
  final VoidCallback onTap;

  @override
  Widget build(BuildContext context) {
    final p = context.palette;
    final t = Theme.of(context).textTheme;
    return InkWell(
      borderRadius: AppRadius.brMd,
      onTap: onTap,
      child: Container(
        padding: const EdgeInsets.symmetric(horizontal: 14, vertical: 14),
        decoration: BoxDecoration(
          color: selected ? p.accentWash : p.surface,
          borderRadius: AppRadius.brMd,
          border: Border.all(color: selected ? p.brand : p.border, width: selected ? 1.5 : 1),
        ),
        child: Row(
          children: [
            Icon(icon, size: 20, color: selected ? p.brand : p.muted),
            const SizedBox(width: 12),
            Expanded(
              child: Text(
                label,
                style: t.bodyMedium!.copyWith(
                  fontSize: 14.5,
                  fontWeight: selected ? FontWeight.w700 : FontWeight.w500,
                  color: selected ? p.brand : p.onBackground,
                ),
              ),
            ),
            Icon(
              selected ? Symbols.radio_button_checked_rounded : Symbols.radio_button_unchecked_rounded,
              size: 20,
              color: selected ? p.brand : p.muted,
            ),
          ],
        ),
      ),
    );
  }
}

class _GroupCard extends StatelessWidget {
  const _GroupCard({required this.children});
  final List<Widget> children;

  @override
  Widget build(BuildContext context) {
    final p = context.palette;
    return Container(
      decoration: BoxDecoration(
        color: p.surface,
        borderRadius: AppRadius.brMd,
        border: Border.all(color: p.border),
      ),
      child: Column(children: children),
    );
  }
}

class _ToggleRow extends StatelessWidget {
  const _ToggleRow({required this.label, required this.value, required this.onChanged});
  final String label;
  final bool value;
  final ValueChanged<bool> onChanged;

  @override
  Widget build(BuildContext context) {
    final t = Theme.of(context).textTheme;
    return Padding(
      padding: const EdgeInsets.symmetric(horizontal: 14, vertical: 4),
      child: Row(
        children: [
          Expanded(
            child: Text(label, style: t.bodyMedium!.copyWith(fontSize: 14.5)),
          ),
          Switch(value: value, onChanged: onChanged),
        ],
      ),
    );
  }
}

class _RowDivider extends StatelessWidget {
  @override
  Widget build(BuildContext context) {
    return Container(
      height: 1,
      margin: const EdgeInsets.symmetric(horizontal: 14),
      color: context.palette.border,
    );
  }
}
