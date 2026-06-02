import 'dart:io' show Platform;

import 'package:flutter/foundation.dart';
import 'package:flutter/material.dart';
import 'package:material_symbols_icons/symbols.dart';
import 'package:url_launcher/url_launcher.dart';

import '../../../../commons.dart';
import '../../../../core/i18n/strings.dart';
import '../../../../shared/widgets/widgets.dart';

/// Spec: design-specs/AppUpdateRequired.json — blocking, no dismiss/back.
/// PopScope blocks system back so this screen behaves as a true gate.
/// Store URL is a placeholder until the real listing IDs land (DEVIATION).
class AppUpdateRequiredScreen extends StatelessWidget {
  const AppUpdateRequiredScreen({super.key, this.currentVersion = '1.0.0'});
  final String currentVersion;

  Future<void> _openStore() async {
    final Uri uri = !kIsWeb && Platform.isIOS
        ? Uri.parse('https://apps.apple.com/app/id000000000')
        : Uri.parse('https://play.google.com/store/apps/details?id=com.communities.app');
    await launchUrl(uri, mode: LaunchMode.externalApplication);
  }

  @override
  Widget build(BuildContext context) {
    final p = context.palette;
    final t = Theme.of(context).textTheme;
    return PopScope(
      canPop: false,
      child: Directionality(
        textDirection: TextDirection.rtl,
        child: Scaffold(
          backgroundColor: p.background,
          body: SafeArea(
            child: Padding(
              padding: const EdgeInsets.fromLTRB(20, 60, 20, 24),
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.stretch,
                children: [
                  Center(
                    child: IconBlob(
                      icon: Symbols.system_update_rounded,
                      bg: p.accentWash,
                      color: p.brand,
                    ),
                  ),
                  const SizedBox(height: 24),
                  Text(
                    S.updateRequiredHeadline,
                    textAlign: TextAlign.center,
                    style: t.titleLarge!.copyWith(fontSize: 22, fontWeight: FontWeight.w700),
                  ),
                  const SizedBox(height: 10),
                  Text(
                    S.updateRequiredBody,
                    textAlign: TextAlign.center,
                    style: t.bodyLarge!.copyWith(color: p.muted, height: 1.55),
                  ),
                  const SizedBox(height: 14),
                  Text(
                    S.appVersionLabel(currentVersion),
                    textAlign: TextAlign.center,
                    style: t.labelSmall!.copyWith(color: p.muted, fontSize: 11),
                  ),
                  const Spacer(),
                  AppButton(
                    S.updateButton,
                    icon: Symbols.download_rounded,
                    onPressed: _openStore,
                  ),
                ],
              ),
            ),
          ),
        ),
      ),
    );
  }
}
