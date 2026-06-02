import 'package:flutter/material.dart';
import 'package:go_router/go_router.dart';
import 'package:material_symbols_icons/symbols.dart';

import '../../../../commons.dart';
import '../../../../core/i18n/strings.dart';
import '../../../../shared/widgets/widgets.dart';

/// Spec: design-specs/Offline.json — persistent reconnect banner with spinner,
/// cached content dimmed & non-interactive. Without a connectivity_plus dependency
/// we render the offline visual deterministically (DEVIATION).
class OfflineScreen extends StatelessWidget {
  const OfflineScreen({super.key});

  @override
  Widget build(BuildContext context) {
    final p = context.palette;
    final t = Theme.of(context).textTheme;
    return Directionality(
      textDirection: TextDirection.rtl,
      child: Scaffold(
        backgroundColor: p.background,
        body: SafeArea(
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.stretch,
            children: [
              Container(
                padding: const EdgeInsets.symmetric(horizontal: 14, vertical: 10),
                color: p.warningWash,
                child: Row(
                  children: [
                    SizedBox(
                      width: 16,
                      height: 16,
                      child: CircularProgressIndicator(strokeWidth: 2, color: p.warning),
                    ),
                    const SizedBox(width: 10),
                    Expanded(
                      child: Text(
                        S.offlineBanner,
                        style: t.bodyMedium!.copyWith(color: p.warning, fontWeight: FontWeight.w700, fontSize: 13),
                      ),
                    ),
                  ],
                ),
              ),
              const SizedBox(height: 60),
              Center(
                child: IconBlob(
                  icon: Symbols.wifi_off_rounded,
                  bg: p.surface2,
                  color: p.muted,
                ),
              ),
              const SizedBox(height: 24),
              Padding(
                padding: const EdgeInsets.symmetric(horizontal: 20),
                child: Column(
                  children: [
                    Text(
                      S.offlineHeadline,
                      textAlign: TextAlign.center,
                      style: t.titleLarge!.copyWith(fontSize: 22, fontWeight: FontWeight.w700),
                    ),
                    const SizedBox(height: 10),
                    Text(
                      S.offlineBody,
                      textAlign: TextAlign.center,
                      style: t.bodyLarge!.copyWith(color: p.muted, height: 1.55),
                    ),
                    const SizedBox(height: 14),
                    Text(
                      S.offlineLastSync(DateTime.now()),
                      style: t.labelSmall!.copyWith(color: p.muted, fontSize: 11),
                    ),
                  ],
                ),
              ),
              const Spacer(),
              Padding(
                padding: const EdgeInsets.fromLTRB(20, 0, 20, 16),
                child: AppButton.secondary(
                  S.errorHomeCta,
                  icon: Symbols.home_rounded,
                  onPressed: () => GoRouter.of(context).go('/home'),
                ),
              ),
            ],
          ),
        ),
      ),
    );
  }
}
