import 'package:flutter/material.dart';

import '../../commons.dart';

/// Carousel pagination indicator — three dots that morph into a stretched pill
/// for the active slide. Used by OnboardingCarousel.
class PageDots extends StatelessWidget {
  const PageDots({super.key, required this.count, required this.activeIndex});

  final int count;
  final int activeIndex;

  @override
  Widget build(BuildContext context) {
    final p = context.palette;
    return Row(
      mainAxisAlignment: MainAxisAlignment.center,
      children: List.generate(count, (i) {
        final active = i == activeIndex;
        return AnimatedContainer(
          duration: AppDuration.base,
          margin: const EdgeInsets.symmetric(horizontal: 3),
          height: 8,
          width: active ? 26 : 8,
          decoration: BoxDecoration(
            color: active ? p.brand : p.border,
            borderRadius: BorderRadius.circular(4),
          ),
        );
      }),
    );
  }
}
