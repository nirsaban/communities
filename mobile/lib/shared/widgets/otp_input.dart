import 'package:flutter/material.dart';
import 'package:flutter/services.dart';

import '../../commons.dart';

/// 6-digit OTP input used by EmailVerification. Auto-advances, accepts paste of
/// the full code into any field, and fires [onCompleted] when the last cell is
/// filled.
class OtpInput extends StatefulWidget {
  const OtpInput({
    super.key,
    this.length = 6,
    this.onChanged,
    this.onCompleted,
    this.errorText,
  });

  final int length;
  final ValueChanged<String>? onChanged;
  final ValueChanged<String>? onCompleted;
  final String? errorText;

  @override
  State<OtpInput> createState() => _OtpInputState();
}

class _OtpInputState extends State<OtpInput> {
  late final List<TextEditingController> _ctrls =
      List.generate(widget.length, (_) => TextEditingController());
  late final List<FocusNode> _focus = List.generate(widget.length, (_) => FocusNode());

  @override
  void dispose() {
    for (final c in _ctrls) {
      c.dispose();
    }
    for (final f in _focus) {
      f.dispose();
    }
    super.dispose();
  }

  String get _value => _ctrls.map((c) => c.text).join();

  void _emitChange() {
    widget.onChanged?.call(_value);
    if (_value.length == widget.length) {
      widget.onCompleted?.call(_value);
    }
  }

  void _handlePaste(String text, int from) {
    final digits = text.replaceAll(RegExp(r'\D'), '');
    for (var i = 0; i + from < widget.length && i < digits.length; i++) {
      _ctrls[from + i].text = digits[i];
    }
    final next = (from + digits.length).clamp(0, widget.length - 1);
    _focus[next].requestFocus();
    _emitChange();
    setState(() {});
  }

  @override
  Widget build(BuildContext context) {
    final p = context.palette;
    final t = Theme.of(context).textTheme;
    final hasError = widget.errorText != null;
    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        // OTP is always LTR even on RTL screens.
        Directionality(
          textDirection: TextDirection.ltr,
          child: Row(
            mainAxisAlignment: MainAxisAlignment.spaceBetween,
            children: List.generate(widget.length, (i) {
              return SizedBox(
                width: 48,
                height: 56,
                child: TextField(
                  controller: _ctrls[i],
                  focusNode: _focus[i],
                  textAlign: TextAlign.center,
                  keyboardType: TextInputType.number,
                  inputFormatters: [FilteringTextInputFormatter.digitsOnly],
                  maxLength: 1,
                  style: t.titleLarge!.copyWith(fontSize: 22),
                  decoration: InputDecoration(
                    counterText: '',
                    filled: true,
                    fillColor: p.surface,
                    enabledBorder: OutlineInputBorder(
                      borderRadius: AppRadius.brMd,
                      borderSide: BorderSide(
                        color: hasError ? p.error : p.border2,
                        width: 1.5,
                      ),
                    ),
                    focusedBorder: OutlineInputBorder(
                      borderRadius: AppRadius.brMd,
                      borderSide: BorderSide(color: p.brand, width: 1.5),
                    ),
                    errorBorder: OutlineInputBorder(
                      borderRadius: AppRadius.brMd,
                      borderSide: BorderSide(color: p.error, width: 1.5),
                    ),
                  ),
                  onChanged: (raw) {
                    if (raw.length > 1) {
                      // Likely a paste.
                      _handlePaste(raw, i);
                      return;
                    }
                    if (raw.isNotEmpty && i < widget.length - 1) {
                      _focus[i + 1].requestFocus();
                    }
                    if (raw.isEmpty && i > 0) {
                      _focus[i - 1].requestFocus();
                    }
                    _emitChange();
                  },
                ),
              );
            }),
          ),
        ),
        if (hasError) ...[
          const SizedBox(height: 8),
          Text(widget.errorText!,
              style: t.bodyMedium!.copyWith(color: p.error)),
        ],
      ],
    );
  }
}
