import 'package:flutter/material.dart';
import '../theme/app_colors.dart';
import '../theme/app_tokens.dart';

// ============================================================
// RoleBadge
// ============================================================
enum AppRole { admin, subAdmin, eventManager, member, superAdmin }

class RoleBadge extends StatelessWidget {
  final AppRole role;
  const RoleBadge(this.role, {super.key});

  @override
  Widget build(BuildContext context) {
    final dark = Theme.of(context).brightness == Brightness.dark;
    late Color bg, fg;
    late String text;
    IconData? icon;
    switch (role) {
      case AppRole.admin:
        text = 'Admin'; icon = Icons.shield;
        bg = dark ? const Color(0xFF2A1C46) : const Color(0xFFEFE7FF);
        fg = dark ? const Color(0xFFD9C7FF) : const Color(0xFF5B3D9E);
        break;
      case AppRole.subAdmin:
        text = 'Sub Admin'; icon = Icons.badge_outlined;
        bg = dark ? const Color(0xFF0E3247) : const Color(0xFFE1F1FA);
        fg = dark ? const Color(0xFF9FD8F2) : const Color(0xFF1F6F95);
        break;
      case AppRole.eventManager:
        text = 'Event Mgr'; icon = Icons.event;
        bg = dark ? const Color(0xFF3A2A10) : const Color(0xFFFBF0DC);
        fg = dark ? const Color(0xFFF2C879) : const Color(0xFF9A6B12);
        break;
      case AppRole.superAdmin:
        text = 'Platform'; icon = Icons.verified_user;
        bg = dark ? const Color(0xFF3A1016) : const Color(0xFFFBE3E6);
        fg = dark ? const Color(0xFFF4A6B0) : const Color(0xFFA82231);
        break;
      case AppRole.member:
        text = 'Member'; icon = null;
        bg = context.palette.surface2; fg = context.palette.onBackground2;
        break;
    }
    return _Pill(bg: bg, fg: fg, text: text, icon: icon, height: 24, fontSize: 11.5);
  }
}

// ============================================================
// PriceTag
// ============================================================
enum PriceKind { free, paid, subscription, external }

class PriceTag extends StatelessWidget {
  final PriceKind kind;
  final String? amount; // e.g. "₪45"
  const PriceTag(this.kind, {super.key, this.amount});

  @override
  Widget build(BuildContext context) {
    final p = context.palette;
    final dark = Theme.of(context).brightness == Brightness.dark;
    switch (kind) {
      case PriceKind.free:
        return _Pill(bg: p.successWash, fg: p.success, text: 'Free', icon: Icons.check, radius: AppRadius.sm);
      case PriceKind.paid:
        return _Pill(bg: p.accentWash, fg: dark ? p.brand : p.accentInk, text: amount ?? 'Paid', radius: AppRadius.sm);
      case PriceKind.subscription:
        return _Pill(
          bg: dark ? const Color(0xFF241A3A) : const Color(0xFFEFE7FF),
          fg: dark ? const Color(0xFFC7B0FF) : const Color(0xFF5B3D9E),
          text: 'Subscription', radius: AppRadius.sm);
      case PriceKind.external:
        return _Pill(bg: p.surface2, fg: p.onBackground2, text: 'External', radius: AppRadius.sm);
    }
  }
}

// ============================================================
// StatusChip — event status
// ============================================================
enum EventStatus { draft, published, cancelled, completed }

class StatusChip extends StatelessWidget {
  final EventStatus status;
  final String? labelOverride;
  const StatusChip(this.status, {super.key, this.labelOverride});

  @override
  Widget build(BuildContext context) {
    final p = context.palette;
    late Color bg, fg;
    late String text;
    switch (status) {
      case EventStatus.draft:
        bg = p.surface2; fg = p.muted; text = 'Draft'; break;
      case EventStatus.published:
        bg = p.successWash; fg = p.success; text = 'Published'; break;
      case EventStatus.cancelled:
        bg = p.errorWash; fg = p.error; text = 'Cancelled'; break;
      case EventStatus.completed:
        bg = p.surface2; fg = p.onBackground2; text = 'Completed'; break;
    }
    return _Pill(
      bg: bg, fg: fg, text: labelOverride ?? text, height: 22, fontSize: 11,
      dot: true,
    );
  }
}

/// Limited-admin guard pill (Sub Admin).
class LimitedAdminBadge extends StatelessWidget {
  const LimitedAdminBadge({super.key});
  @override
  Widget build(BuildContext context) {
    final p = context.palette;
    return _Pill(bg: p.warningWash, fg: p.warning, text: 'Limited admin', icon: Icons.shield_outlined, height: 24, fontSize: 11);
  }
}

// ---- shared pill primitive ----
class _Pill extends StatelessWidget {
  final Color bg, fg;
  final String text;
  final IconData? icon;
  final bool dot;
  final double height;
  final double fontSize;
  final double radius;
  const _Pill({
    required this.bg, required this.fg, required this.text,
    this.icon, this.dot = false, this.height = 24, this.fontSize = 11.5,
    this.radius = AppRadius.full,
  });

  @override
  Widget build(BuildContext context) {
    return Container(
      height: height,
      padding: EdgeInsets.symmetric(horizontal: dot ? 9 : 10),
      decoration: BoxDecoration(color: bg, borderRadius: BorderRadius.circular(radius)),
      child: Row(
        mainAxisSize: MainAxisSize.min,
        children: [
          if (dot) ...[
            Container(width: 6, height: 6, decoration: BoxDecoration(color: fg, shape: BoxShape.circle)),
            const SizedBox(width: 5),
          ],
          if (icon != null) ...[
            Icon(icon, size: 13, color: fg),
            const SizedBox(width: 5),
          ],
          Text(text,
              style: TextStyle(
                fontFamily: 'DM Sans', fontWeight: FontWeight.w600,
                fontSize: fontSize, color: fg, height: 1,
              )),
        ],
      ),
    );
  }
}
