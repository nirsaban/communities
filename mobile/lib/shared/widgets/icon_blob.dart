import 'package:flutter/material.dart';

import '../../commons.dart';

/// 96×96 rounded "blob" with a centered icon — the warm hero used on
/// ForgotPassword, EmailVerification, and several edge-state screens.
///
/// Defaults to the accent wash + ink color; pass [color]/[bg] to recolor (e.g.
/// errorWash + error for failure states).
class IconBlob extends StatelessWidget {
  const IconBlob({
    super.key,
    required this.icon,
    this.size = 96,
    this.iconSize = 44,
    this.borderRadius = 30,
    this.bg,
    this.color,
  });

  final IconData icon;
  final double size;
  final double iconSize;
  final double borderRadius;
  final Color? bg;
  final Color? color;

  @override
  Widget build(BuildContext context) {
    final p = context.palette;
    final dark = Theme.of(context).brightness == Brightness.dark;
    return Container(
      width: size,
      height: size,
      decoration: BoxDecoration(
        color: bg ?? p.accentWash,
        borderRadius: BorderRadius.circular(borderRadius),
      ),
      child: Icon(
        icon,
        size: iconSize,
        color: color ?? (dark ? p.brand : p.accentInk),
      ),
    );
  }
}
