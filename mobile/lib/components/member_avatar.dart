import 'package:flutter/material.dart';
import '../theme/app_colors.dart';
import 'badges.dart';

/// Commons — MemberAvatar.
/// Shows a network photo when [imageUrl] is set, else initials derived from
/// [name]. Optional [role] paints a small role-colored dot overlay.
class MemberAvatar extends StatelessWidget {
  final String name;
  final String? imageUrl;
  final double size;
  final AppRole? role;

  const MemberAvatar(
    this.name, {
    super.key,
    this.imageUrl,
    this.size = 44,
    this.role,
  });

  String get _initials {
    final parts = name.trim().split(RegExp(r'\s+'));
    if (parts.isEmpty || parts.first.isEmpty) return '?';
    if (parts.length == 1) return parts.first.characters.first.toUpperCase();
    return (parts.first.characters.first + parts.last.characters.first).toUpperCase();
  }

  @override
  Widget build(BuildContext context) {
    final p = context.palette;
    final fontSize = size * 0.36;

    final base = Container(
      width: size,
      height: size,
      decoration: BoxDecoration(
        color: p.surface2,
        shape: BoxShape.circle,
        image: imageUrl != null
            ? DecorationImage(image: NetworkImage(imageUrl!), fit: BoxFit.cover)
            : null,
      ),
      alignment: Alignment.center,
      child: imageUrl == null
          ? Text(_initials,
              style: TextStyle(
                fontFamily: 'DM Sans', fontWeight: FontWeight.w700,
                fontSize: fontSize, color: p.onBackground2,
              ))
          : null,
    );

    if (role == null) return base;

    return SizedBox(
      width: size + 4,
      height: size + 4,
      child: Stack(
        clipBehavior: Clip.none,
        children: [
          base,
          Positioned(
            right: -2,
            bottom: -2,
            child: Container(
              width: size * 0.4,
              height: size * 0.4,
              decoration: BoxDecoration(
                color: _roleColor(role!),
                shape: BoxShape.circle,
                border: Border.all(color: p.surface, width: 2.5),
              ),
              alignment: Alignment.center,
              child: Icon(_roleIcon(role!), size: size * 0.22, color: Colors.white),
            ),
          ),
        ],
      ),
    );
  }

  Color _roleColor(AppRole r) {
    switch (r) {
      case AppRole.admin: return const Color(0xFF5B3D9E);
      case AppRole.subAdmin: return const Color(0xFF1F6F95);
      case AppRole.eventManager: return const Color(0xFF9A6B12);
      case AppRole.superAdmin: return const Color(0xFFA82231);
      case AppRole.member: return const Color(0xFF8A857B);
    }
  }

  IconData _roleIcon(AppRole r) {
    switch (r) {
      case AppRole.admin: return Icons.shield;
      case AppRole.subAdmin: return Icons.badge_outlined;
      case AppRole.eventManager: return Icons.event;
      case AppRole.superAdmin: return Icons.verified_user;
      case AppRole.member: return Icons.person;
    }
  }
}
