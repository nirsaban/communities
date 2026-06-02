import 'package:flutter/material.dart';
import '../theme/app_colors.dart';
import '../theme/app_tokens.dart';

enum AppButtonVariant { primary, secondary, ghost, danger }
enum AppButtonSize { regular, small }

/// Commons — AppButton.
/// Variants: primary / secondary / ghost / danger. Supports a leading icon,
/// loading spinner, full-width (default) or intrinsic width, and two sizes.
class AppButton extends StatelessWidget {
  final String label;
  final VoidCallback? onPressed;
  final AppButtonVariant variant;
  final AppButtonSize size;
  final IconData? icon;
  final bool loading;
  final bool expand;

  const AppButton(
    this.label, {
    super.key,
    this.onPressed,
    this.variant = AppButtonVariant.primary,
    this.size = AppButtonSize.regular,
    this.icon,
    this.loading = false,
    this.expand = true,
  });

  const AppButton.secondary(this.label,
      {super.key, this.onPressed, this.icon, this.loading = false, this.expand = true, this.size = AppButtonSize.regular})
      : variant = AppButtonVariant.secondary;

  const AppButton.ghost(this.label,
      {super.key, this.onPressed, this.icon, this.loading = false, this.expand = true, this.size = AppButtonSize.regular})
      : variant = AppButtonVariant.ghost;

  const AppButton.danger(this.label,
      {super.key, this.onPressed, this.icon, this.loading = false, this.expand = true, this.size = AppButtonSize.regular})
      : variant = AppButtonVariant.danger;

  @override
  Widget build(BuildContext context) {
    final p = context.palette;
    final scheme = context.cs;
    final bool sm = size == AppButtonSize.small;
    final double height = sm ? 38 : 50;
    final double fontSize = sm ? 13.5 : 15;
    final radius = sm ? AppRadius.brSm : AppRadius.brMd;
    final bool disabled = onPressed == null || loading;

    late Color bg, fg, borderColor;
    switch (variant) {
      case AppButtonVariant.primary:
        bg = scheme.primary; fg = p.onAccent; borderColor = Colors.transparent;
        break;
      case AppButtonVariant.secondary:
        bg = p.surface; fg = p.onBackground; borderColor = p.border2;
        break;
      case AppButtonVariant.ghost:
        bg = Colors.transparent; fg = p.accentInk; borderColor = Colors.transparent;
        break;
      case AppButtonVariant.danger:
        bg = p.error; fg = Colors.white; borderColor = Colors.transparent;
        break;
    }

    final child = loading
        ? SizedBox(
            width: 18, height: 18,
            child: CircularProgressIndicator(strokeWidth: 2.5, color: fg),
          )
        : Row(
            mainAxisSize: MainAxisSize.min,
            mainAxisAlignment: MainAxisAlignment.center,
            children: [
              if (icon != null) ...[
                Icon(icon, size: sm ? 18 : 20, color: fg),
                const SizedBox(width: 8),
              ],
              Text(label,
                  style: TextStyle(
                    fontFamily: 'DM Sans', fontWeight: FontWeight.w600,
                    fontSize: fontSize, letterSpacing: -0.15, color: fg,
                  )),
            ],
          );

    return Opacity(
      opacity: disabled && !loading ? 0.45 : 1,
      child: Material(
        color: bg,
        borderRadius: radius,
        child: InkWell(
          borderRadius: radius,
          onTap: disabled ? null : onPressed,
          child: Container(
            height: height,
            width: expand ? double.infinity : null,
            padding: EdgeInsets.symmetric(horizontal: sm ? 14 : 18),
            decoration: BoxDecoration(
              borderRadius: radius,
              border: Border.all(color: borderColor, width: 1),
            ),
            alignment: Alignment.center,
            child: child,
          ),
        ),
      ),
    );
  }
}
