import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';
import 'package:material_symbols_icons/symbols.dart';

import '../../commons.dart';

/// Back button used by every auth + onboarding header per the design specs.
///
/// Renders as a Material-Symbols-Rounded chevron in a 44×44 tap target. Pops
/// the current route, or fires [onPressed] when supplied. Falls back to a SizedBox
/// when there's nothing to pop and no override (e.g. when this screen is the
/// initial destination).
class AppBackButton extends ConsumerWidget {
  const AppBackButton({super.key, this.onPressed});

  final VoidCallback? onPressed;

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final p = context.palette;
    bool canPop = onPressed != null;
    if (!canPop) {
      // GoRouter may be absent in widget tests; fail gracefully.
      try {
        canPop = GoRouter.of(context).canPop();
      } catch (_) {
        canPop = false;
      }
    }
    if (!canPop) return const SizedBox(height: 44, width: 44);

    final isRtl = Directionality.of(context) == TextDirection.rtl;
    final glyph = isRtl ? Symbols.arrow_forward_rounded : Symbols.arrow_back_rounded;
    return SizedBox(
      width: 44,
      height: 44,
      child: Material(
        color: Colors.transparent,
        shape: const CircleBorder(),
        child: InkWell(
          customBorder: const CircleBorder(),
          onTap: onPressed ?? () => GoRouter.of(context).pop(),
          child: Icon(glyph, size: 24, color: p.onBackground),
        ),
      ),
    );
  }
}
