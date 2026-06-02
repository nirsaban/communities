import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:material_symbols_icons/symbols.dart';

import '../../../../commons.dart';
import '../../../../core/i18n/strings.dart';
import '../providers/auth_providers.dart';

/// Spec: design-specs/Splash.json (route "/")
/// Components in order: BrandMark, Wordmark, LoadingDots, Tagline.
/// State: loading only. Boots the auth session and redirects out of /splash.
class SplashScreen extends ConsumerStatefulWidget {
  const SplashScreen({super.key});

  @override
  ConsumerState<SplashScreen> createState() => _SplashScreenState();
}

class _SplashScreenState extends ConsumerState<SplashScreen> {
  @override
  void initState() {
    super.initState();
    WidgetsBinding.instance.addPostFrameCallback((_) {
      ref.read(authNotifierProvider.notifier).bootstrap();
    });
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
            mainAxisAlignment: MainAxisAlignment.center,
            crossAxisAlignment: CrossAxisAlignment.center,
            children: [
              const Spacer(),
              // BrandMark — 62x62 logo blob (using IconBlob style)
              Container(
                width: 62,
                height: 62,
                decoration: BoxDecoration(
                  color: p.brand,
                  borderRadius: BorderRadius.circular(18),
                ),
                child: const Icon(Symbols.groups_rounded, size: 36, color: Colors.white),
              ),
              const SizedBox(height: AppSpacing.s3),
              // Wordmark
              Text(S.appTitle, style: t.displayMedium!),
              const SizedBox(height: AppSpacing.sectionGap),
              // LoadingDots
              const LoadingShimmer(width: 32, height: 8, radius: 8),
              const Spacer(),
              // Tagline
              Padding(
                padding: const EdgeInsets.only(bottom: AppSpacing.s4),
                child: Text(
                  S.tagline,
                  textAlign: TextAlign.center,
                  style: t.labelSmall!.copyWith(color: p.muted),
                ),
              ),
            ],
          ),
        ),
      ),
    );
  }
}
