import 'package:flutter/material.dart';
import 'package:flutter/services.dart';
import 'package:go_router/go_router.dart';
import 'package:material_symbols_icons/symbols.dart';

import '../../../../commons.dart';
import '../../../../core/i18n/strings.dart';
import '../../../../shared/widgets/widgets.dart';

/// Spec: design-specs/GenericError500.json — error blob, takes blame, copyable
/// error id for support, contact-support secondary CTA.
class GenericErrorScreen extends StatelessWidget {
  const GenericErrorScreen({super.key, this.errorIdValue});
  final String? errorIdValue;

  @override
  Widget build(BuildContext context) {
    final p = context.palette;
    final t = Theme.of(context).textTheme;
    final id = errorIdValue ?? 'ERR-${DateTime.now().millisecondsSinceEpoch.toRadixString(36).toUpperCase()}';
    return Directionality(
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
                    icon: Symbols.error_rounded,
                    bg: p.errorWash,
                    color: p.error,
                  ),
                ),
                const SizedBox(height: 24),
                Text(
                  S.error500Headline,
                  textAlign: TextAlign.center,
                  style: t.titleLarge!.copyWith(fontSize: 22, fontWeight: FontWeight.w700),
                ),
                const SizedBox(height: 10),
                Text(
                  S.error500Body,
                  textAlign: TextAlign.center,
                  style: t.bodyLarge!.copyWith(color: p.muted, height: 1.55),
                ),
                const SizedBox(height: 14),
                InkWell(
                  borderRadius: AppRadius.brSm,
                  onTap: () => Clipboard.setData(ClipboardData(text: id)),
                  child: Container(
                    padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 6),
                    decoration: BoxDecoration(color: p.surface2, borderRadius: AppRadius.brSm),
                    child: Row(
                      mainAxisSize: MainAxisSize.min,
                      children: [
                        Icon(Symbols.content_copy_rounded, size: 14, color: p.muted),
                        const SizedBox(width: 6),
                        Text(
                          S.errorId(id),
                          style: t.labelSmall!.copyWith(
                            color: p.muted,
                            fontFamily: 'monospace',
                            fontSize: 11.5,
                          ),
                        ),
                      ],
                    ),
                  ),
                ),
                const Spacer(),
                AppButton(
                  S.tryAgain,
                  icon: Symbols.refresh_rounded,
                  onPressed: () => GoRouter.of(context).go('/home'),
                ),
                const SizedBox(height: 10),
                AppButton.ghost(
                  S.contactSupport,
                  onPressed: () {},
                ),
              ],
            ),
          ),
        ),
      ),
    );
  }
}
