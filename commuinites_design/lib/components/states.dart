import 'package:flutter/material.dart';
import '../theme/app_colors.dart';
import '../theme/app_tokens.dart';
import 'app_button.dart';

/// Commons — EmptyState. Warm illustrated empty placeholder (never "No data").
class EmptyState extends StatelessWidget {
  final IconData icon;
  final String headline;
  final String body;
  final String? ctaLabel;
  final VoidCallback? onCta;
  final Color? blobColor;
  final Color? iconColor;

  const EmptyState({
    super.key,
    required this.icon,
    required this.headline,
    required this.body,
    this.ctaLabel,
    this.onCta,
    this.blobColor,
    this.iconColor,
  });

  @override
  Widget build(BuildContext context) {
    final p = context.palette;
    final t = Theme.of(context).textTheme;
    final dark = Theme.of(context).brightness == Brightness.dark;
    return Center(
      child: Padding(
        padding: const EdgeInsets.symmetric(horizontal: 36, vertical: 32),
        child: Column(
          mainAxisSize: MainAxisSize.min,
          children: [
            Container(
              width: 96, height: 96,
              decoration: BoxDecoration(
                color: blobColor ?? p.accentWash,
                borderRadius: BorderRadius.circular(30),
              ),
              child: Icon(icon, size: 44, color: iconColor ?? (dark ? p.brand : p.accentInk)),
            ),
            const SizedBox(height: 14),
            Text(headline, textAlign: TextAlign.center,
                style: t.displayMedium!.copyWith(fontSize: 22)),
            const SizedBox(height: 6),
            ConstrainedBox(
              constraints: const BoxConstraints(maxWidth: 240),
              child: Text(body, textAlign: TextAlign.center,
                  style: t.bodyMedium!.copyWith(height: 1.5, color: p.muted)),
            ),
            if (ctaLabel != null) ...[
              const SizedBox(height: 16),
              AppButton(ctaLabel!, onPressed: onCta, expand: false),
            ],
          ],
        ),
      ),
    );
  }
}

/// Commons — ErrorState. Takes the blame, offers retry.
class ErrorState extends StatelessWidget {
  final String headline;
  final String body;
  final String retryLabel;
  final VoidCallback? onRetry;
  final IconData icon;
  const ErrorState({
    super.key,
    this.headline = 'Something went wrong',
    this.body = 'An unexpected error happened on our end — not you.',
    this.retryLabel = 'Try again',
    this.onRetry,
    this.icon = Icons.cloud_off,
  });

  @override
  Widget build(BuildContext context) {
    final p = context.palette;
    return EmptyState(
      icon: icon,
      headline: headline,
      body: body,
      blobColor: p.errorWash,
      iconColor: p.error,
      ctaLabel: retryLabel,
      onCta: onRetry,
    );
  }
}

/// Commons — LoadingShimmer. Animated skeleton block for lists & cards.
class LoadingShimmer extends StatefulWidget {
  final double width;
  final double height;
  final double radius;
  const LoadingShimmer({super.key, this.width = double.infinity, this.height = 14, this.radius = 8});

  @override
  State<LoadingShimmer> createState() => _LoadingShimmerState();
}

class _LoadingShimmerState extends State<LoadingShimmer> with SingleTickerProviderStateMixin {
  late final AnimationController _c =
      AnimationController(vsync: this, duration: const Duration(milliseconds: 1300))..repeat();

  @override
  void dispose() { _c.dispose(); super.dispose(); }

  @override
  Widget build(BuildContext context) {
    final p = context.palette;
    return AnimatedBuilder(
      animation: _c,
      builder: (_, __) {
        return Container(
          width: widget.width,
          height: widget.height,
          decoration: BoxDecoration(
            borderRadius: BorderRadius.circular(widget.radius),
            gradient: LinearGradient(
              begin: Alignment(-1 - 2 * _c.value, 0),
              end: Alignment(1 - 2 * _c.value, 0),
              colors: [p.surface2, p.border, p.surface2],
              stops: const [0.3, 0.5, 0.7],
            ),
          ),
        );
      },
    );
  }
}

/// Commons — SectionHeader. Label + optional "See all" action.
class SectionHeader extends StatelessWidget {
  final String title;
  final String? actionLabel;
  final VoidCallback? onAction;
  const SectionHeader(this.title, {super.key, this.actionLabel, this.onAction});

  @override
  Widget build(BuildContext context) {
    final p = context.palette;
    final t = Theme.of(context).textTheme;
    final dark = Theme.of(context).brightness == Brightness.dark;
    return Padding(
      padding: const EdgeInsets.only(bottom: 12),
      child: Row(
        crossAxisAlignment: CrossAxisAlignment.baseline,
        textBaseline: TextBaseline.alphabetic,
        mainAxisAlignment: MainAxisAlignment.spaceBetween,
        children: [
          Text(title, style: t.titleMedium!.copyWith(fontSize: 18, fontWeight: FontWeight.w700)),
          if (actionLabel != null)
            GestureDetector(
              onTap: onAction,
              child: Text(actionLabel!,
                  style: t.labelLarge!.copyWith(color: dark ? p.brand : p.accentInk)),
            ),
        ],
      ),
    );
  }
}
