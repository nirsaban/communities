import 'package:flutter/material.dart';
import 'package:go_router/go_router.dart';
import 'package:material_symbols_icons/symbols.dart';

import '../../../../commons.dart';
import '../../../../core/i18n/strings.dart';
import '../../../../shared/widgets/widgets.dart';

/// Spec: design-specs/OnboardingCarousel.json (route "/welcome")
/// Components in order: SkipButton, Illustration (336×full, r=20), SlideTitle,
/// SlideBody, PageDots (count=3), ContinueButton.
class OnboardingCarouselScreen extends StatefulWidget {
  const OnboardingCarouselScreen({super.key});

  @override
  State<OnboardingCarouselScreen> createState() => _OnboardingCarouselScreenState();
}

class _OnboardingCarouselScreenState extends State<OnboardingCarouselScreen> {
  final _controller = PageController();
  int _index = 0;

  late final List<_Slide> _slides = [
    const _Slide(
      title: S.onboardingSlide1Title,
      body: S.onboardingSlide1Body,
      icon: Symbols.groups_2_rounded,
    ),
    const _Slide(
      title: S.onboardingSlide2Title,
      body: S.onboardingSlide2Body,
      icon: Symbols.event_available_rounded,
    ),
    const _Slide(
      title: S.onboardingSlide3Title,
      body: S.onboardingSlide3Body,
      icon: Symbols.forum_rounded,
    ),
  ];

  @override
  void dispose() {
    _controller.dispose();
    super.dispose();
  }

  void _next() {
    if (_index < _slides.length - 1) {
      _controller.nextPage(
        duration: AppDuration.base,
        curve: AppDuration.standard,
      );
    } else {
      context.go('/signup');
    }
  }

  @override
  Widget build(BuildContext context) {
    final p = context.palette;
    final t = Theme.of(context).textTheme;
    return Scaffold(
      backgroundColor: p.background,
      body: SafeArea(
        child: Padding(
          padding: const EdgeInsets.symmetric(horizontal: AppSpacing.pagePadding),
          child: Column(
            children: [
              Align(
                alignment: AlignmentDirectional.centerEnd,
                child: TextButton(
                  onPressed: () => context.go('/signup'),
                  child: const Text(S.skip),
                ),
              ),
              const SizedBox(height: AppSpacing.s4),
              Expanded(
                child: PageView.builder(
                  controller: _controller,
                  onPageChanged: (i) => setState(() => _index = i),
                  itemCount: _slides.length,
                  itemBuilder: (_, i) {
                    final s = _slides[i];
                    return Column(
                      crossAxisAlignment: CrossAxisAlignment.stretch,
                      children: [
                        ClipRRect(
                          borderRadius: BorderRadius.circular(20),
                          child: Container(
                            height: 336,
                            color: p.accentWash,
                            alignment: Alignment.center,
                            child: Icon(s.icon, size: 120, color: p.accentInk),
                          ),
                        ),
                        const SizedBox(height: AppSpacing.sectionGap),
                        Text(
                          s.title,
                          style: t.displayLarge,
                          maxLines: 2,
                        ),
                        const SizedBox(height: AppSpacing.s3),
                        Text(
                          s.body,
                          style: t.bodyLarge!.copyWith(color: p.muted),
                        ),
                      ],
                    );
                  },
                ),
              ),
              const SizedBox(height: AppSpacing.s4),
              PageDots(count: _slides.length, activeIndex: _index),
              const SizedBox(height: AppSpacing.s4),
              AppButton(
                _index == _slides.length - 1 ? S.createAccountCta : S.continueCta,
                onPressed: _next,
              ),
              const SizedBox(height: AppSpacing.s2),
            ],
          ),
        ),
      ),
    );
  }
}

class _Slide {
  const _Slide({required this.title, required this.body, required this.icon});
  final String title;
  final String body;
  final IconData icon;
}
