import 'package:flutter/material.dart';

import '../../commons.dart';

/// N-segment progress used by the onboarding wizard screens
/// (ProfileSetup, InterestsSelector, AdminWizard*).
///
/// Each segment is a fixed-radius pill; completed segments fill with accent.
class SegmentedProgressBar extends StatelessWidget {
  const SegmentedProgressBar({
    super.key,
    required this.segments,
    required this.currentIndex,
    this.height = 6,
  });

  final int segments;
  final int currentIndex; // 0-based; treats >= as filled.
  final double height;

  @override
  Widget build(BuildContext context) {
    final p = context.palette;
    return Row(
      children: List.generate(segments, (i) {
        final filled = i <= currentIndex;
        return Expanded(
          child: Padding(
            padding: EdgeInsetsDirectional.only(end: i == segments - 1 ? 0 : 6),
            child: AnimatedContainer(
              duration: AppDuration.base,
              height: height,
              decoration: BoxDecoration(
                color: filled ? p.brand : p.border,
                borderRadius: BorderRadius.circular(height),
              ),
            ),
          ),
        );
      }),
    );
  }
}
