import 'package:flutter/material.dart';
import '../theme/app_colors.dart';

/// Commons — AppTextField.
/// States: default / focused / error / disabled (handled by the framework +
/// the [errorText]/[enabled] props). Optional label, leading/trailing icons,
/// helper/hint, obscure toggle, and multiline.
class AppTextField extends StatefulWidget {
  final String? label;
  final String? hint;
  final String? helper;
  final String? errorText;
  final IconData? leadingIcon;
  final Widget? trailing;
  final bool obscure;
  final bool enabled;
  final int maxLines;
  final int? maxLength;
  final TextEditingController? controller;
  final TextInputType? keyboardType;
  final ValueChanged<String>? onChanged;

  const AppTextField({
    super.key,
    this.label,
    this.hint,
    this.helper,
    this.errorText,
    this.leadingIcon,
    this.trailing,
    this.obscure = false,
    this.enabled = true,
    this.maxLines = 1,
    this.maxLength,
    this.controller,
    this.keyboardType,
    this.onChanged,
  });

  @override
  State<AppTextField> createState() => _AppTextFieldState();
}

class _AppTextFieldState extends State<AppTextField> {
  late bool _obscured = widget.obscure;

  @override
  Widget build(BuildContext context) {
    final p = context.palette;
    final t = Theme.of(context).textTheme;
    final hasError = widget.errorText != null;

    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        if (widget.label != null) ...[
          Text(widget.label!,
              style: t.labelLarge!.copyWith(color: p.onBackground)),
          const SizedBox(height: 7),
        ],
        TextField(
          controller: widget.controller,
          enabled: widget.enabled,
          obscureText: _obscured,
          maxLines: widget.obscure ? 1 : widget.maxLines,
          maxLength: widget.maxLength,
          keyboardType: widget.keyboardType,
          onChanged: widget.onChanged,
          style: t.bodyLarge!.copyWith(color: p.onBackground),
          decoration: InputDecoration(
            hintText: widget.hint,
            errorText: widget.errorText,
            counterText: '',
            filled: true,
            fillColor: widget.enabled ? p.surface : p.surface2,
            prefixIcon: widget.leadingIcon != null
                ? Icon(widget.leadingIcon, size: 21, color: hasError ? p.error : p.muted)
                : null,
            suffixIcon: widget.obscure
                ? IconButton(
                    icon: Icon(_obscured ? Icons.visibility_off : Icons.visibility,
                        size: 21, color: p.muted),
                    onPressed: () => setState(() => _obscured = !_obscured),
                  )
                : widget.trailing,
          ),
        ),
        if (widget.helper != null && !hasError) ...[
          const SizedBox(height: 6),
          Text(widget.helper!, style: t.bodyMedium!.copyWith(fontSize: 12, color: p.muted)),
        ],
      ],
    );
  }
}
