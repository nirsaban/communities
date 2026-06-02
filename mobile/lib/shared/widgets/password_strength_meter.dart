import 'package:flutter/material.dart';

import '../../commons.dart';

/// 4-segment strength bar shown beneath the password field on SignUp /
/// ResetPassword. Score 0–4 covers length + character-class signals.
class PasswordStrengthMeter extends StatelessWidget {
  const PasswordStrengthMeter({super.key, required this.password});

  final String password;

  static int scoreOf(String pw) {
    if (pw.isEmpty) return 0;
    var score = 0;
    if (pw.length >= 8) score++;
    if (pw.length >= 12) score++;
    final classes = [
      RegExp('[a-z]'),
      RegExp('[A-Z]'),
      RegExp(r'\d'),
      RegExp(r'[^A-Za-z0-9]'),
    ].where((r) => r.hasMatch(pw)).length;
    if (classes >= 2) score++;
    if (classes >= 3) score++;
    return score.clamp(0, 4);
  }

  @override
  Widget build(BuildContext context) {
    final p = context.palette;
    final score = scoreOf(password);
    final label = switch (score) {
      0 => '',
      1 => 'חלשה',
      2 => 'בינונית',
      3 => 'טובה',
      _ => 'חזקה',
    };
    final color = switch (score) {
      0 => p.border,
      1 => p.error,
      2 => p.warning,
      3 => p.success,
      _ => p.success,
    };
    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        Row(
          children: List.generate(4, (i) {
            final filled = i < score;
            return Expanded(
              child: Padding(
                padding: EdgeInsetsDirectional.only(end: i == 3 ? 0 : 4),
                child: AnimatedContainer(
                  duration: AppDuration.fast,
                  height: 4,
                  decoration: BoxDecoration(
                    color: filled ? color : p.border,
                    borderRadius: BorderRadius.circular(2),
                  ),
                ),
              ),
            );
          }),
        ),
        if (label.isNotEmpty) ...[
          const SizedBox(height: 6),
          Text(label, style: Theme.of(context).textTheme.bodyMedium!.copyWith(color: color)),
        ],
      ],
    );
  }
}
