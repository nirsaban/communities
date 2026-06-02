import 'package:flutter/material.dart';
import 'package:go_router/go_router.dart';
import 'package:material_symbols_icons/symbols.dart';

import '../../commons.dart';

/// Tabs shown on the member-side BottomNav.
/// Per design-specs/*.json: Home, Events, Initiatives, Inbox, Profile.
enum MemberNavTab { home, events, initiatives, inbox, profile }

/// Spec: every member-facing screen below the top bar shows the same 5-tab nav.
/// Height: 64 + safe area (DESIGN_LOCK).
///
/// For C1, Home + Events are live. Initiatives routes to the user's first
/// community initiatives list. Inbox + Profile are wired in C2 — for now they
/// pop back to /home so the tap still feels responsive.
class AppBottomNav extends StatelessWidget {
  const AppBottomNav({
    super.key,
    required this.active,
    this.initiativesCommunityId,
  });

  final MemberNavTab active;
  final String? initiativesCommunityId;

  void _go(BuildContext context, MemberNavTab tab) {
    if (tab == active) return;
    switch (tab) {
      case MemberNavTab.home:
        context.go('/home');
      case MemberNavTab.events:
        context.go('/events');
      case MemberNavTab.initiatives:
        if (initiativesCommunityId != null) {
          context.go('/communities/$initiativesCommunityId/initiatives');
        } else {
          context.go('/home');
        }
      case MemberNavTab.inbox:
        context.go('/inbox');
      case MemberNavTab.profile:
        context.go('/me');
    }
  }

  @override
  Widget build(BuildContext context) {
    final p = context.palette;
    final dark = Theme.of(context).brightness == Brightness.dark;
    return Container(
      decoration: BoxDecoration(
        color: p.surface,
        border: Border(top: BorderSide(color: p.border)),
      ),
      child: SafeArea(
        top: false,
        child: SizedBox(
          height: 64,
          child: Row(
            mainAxisAlignment: MainAxisAlignment.spaceAround,
            children: [
              _NavItem(
                icon: Symbols.home_rounded,
                label: 'בית',
                active: active == MemberNavTab.home,
                accentDark: dark,
                onTap: () => _go(context, MemberNavTab.home),
              ),
              _NavItem(
                icon: Symbols.event_rounded,
                label: 'אירועים',
                active: active == MemberNavTab.events,
                accentDark: dark,
                onTap: () => _go(context, MemberNavTab.events),
              ),
              _NavItem(
                icon: Symbols.lightbulb_rounded,
                label: 'יוזמות',
                active: active == MemberNavTab.initiatives,
                accentDark: dark,
                onTap: () => _go(context, MemberNavTab.initiatives),
              ),
              _NavItem(
                icon: Symbols.inbox_rounded,
                label: 'תיבה',
                active: active == MemberNavTab.inbox,
                accentDark: dark,
                onTap: () => _go(context, MemberNavTab.inbox),
              ),
              _NavItem(
                icon: Symbols.person_rounded,
                label: 'פרופיל',
                active: active == MemberNavTab.profile,
                accentDark: dark,
                onTap: () => _go(context, MemberNavTab.profile),
              ),
            ],
          ),
        ),
      ),
    );
  }
}

class _NavItem extends StatelessWidget {
  const _NavItem({
    required this.icon,
    required this.label,
    required this.active,
    required this.accentDark,
    required this.onTap,
  });

  final IconData icon;
  final String label;
  final bool active;
  final bool accentDark;
  final VoidCallback onTap;

  @override
  Widget build(BuildContext context) {
    final p = context.palette;
    final fg = active ? (accentDark ? p.brand : p.accentInk) : p.muted;
    return Expanded(
      child: InkWell(
        onTap: onTap,
        child: Column(
          mainAxisAlignment: MainAxisAlignment.center,
          children: [
            Icon(icon, size: 24, color: fg),
            const SizedBox(height: 2),
            Text(
              label,
              style: TextStyle(
                fontSize: 10.5,
                fontWeight: FontWeight.w600,
                color: fg,
                height: 1.1,
              ),
            ),
          ],
        ),
      ),
    );
  }
}
