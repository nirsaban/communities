import 'package:flutter/material.dart';
import '../theme/app_colors.dart';
import '../theme/app_tokens.dart';
import 'badges.dart';

/// Commons — EventCard.
/// Horizontal card: cover thumbnail + title, date, location, and a footer row
/// with a [PriceTag] and an optional trailing widget (RSVP badge / count).
class EventCard extends StatelessWidget {
  final String title;
  final String whenLabel;
  final String? location;
  final String? coverUrl;
  final PriceKind priceKind;
  final String? priceAmount;
  final Widget? trailing;
  final VoidCallback? onTap;

  const EventCard({
    super.key,
    required this.title,
    required this.whenLabel,
    this.location,
    this.coverUrl,
    this.priceKind = PriceKind.free,
    this.priceAmount,
    this.trailing,
    this.onTap,
  });

  @override
  Widget build(BuildContext context) {
    final p = context.palette;
    final t = Theme.of(context).textTheme;
    final dark = Theme.of(context).brightness == Brightness.dark;

    return Material(
      color: p.surface,
      borderRadius: AppRadius.brMd,
      child: InkWell(
        borderRadius: AppRadius.brMd,
        onTap: onTap,
        child: Container(
          padding: const EdgeInsets.all(11),
          decoration: BoxDecoration(
            borderRadius: AppRadius.brMd,
            border: Border.all(color: p.border),
            boxShadow: AppShadows.low(dark: dark),
          ),
          child: IntrinsicHeight(
            child: Row(
              crossAxisAlignment: CrossAxisAlignment.stretch,
              children: [
                // Cover
                ClipRRect(
                  borderRadius: BorderRadius.circular(9),
                  child: SizedBox(
                    width: 76,
                    child: coverUrl != null
                        ? Image.network(coverUrl!, fit: BoxFit.cover)
                        : Container(color: p.surface2),
                  ),
                ),
                const SizedBox(width: 13),
                // Body
                Expanded(
                  child: Column(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    mainAxisAlignment: MainAxisAlignment.spaceBetween,
                    children: [
                      Column(
                        crossAxisAlignment: CrossAxisAlignment.start,
                        children: [
                          Text(whenLabel.toUpperCase(),
                              style: t.labelSmall!.copyWith(
                                color: dark ? p.brand : p.accentInk,
                                fontSize: 11.5, letterSpacing: 0.4,
                              )),
                          const SizedBox(height: 4),
                          Text(title,
                              maxLines: 2,
                              overflow: TextOverflow.ellipsis,
                              style: t.titleMedium!.copyWith(fontSize: 15, height: 1.2)),
                          if (location != null) ...[
                            const SizedBox(height: 4),
                            Row(children: [
                              Icon(Icons.place, size: 14, color: p.muted),
                              const SizedBox(width: 4),
                              Expanded(
                                child: Text(location!,
                                    maxLines: 1, overflow: TextOverflow.ellipsis,
                                    style: t.bodyMedium!.copyWith(fontSize: 12, color: p.muted)),
                              ),
                            ]),
                          ],
                        ],
                      ),
                      const SizedBox(height: 6),
                      Row(
                        mainAxisAlignment: MainAxisAlignment.spaceBetween,
                        children: [
                          PriceTag(priceKind, amount: priceAmount),
                          if (trailing != null) trailing!,
                        ],
                      ),
                    ],
                  ),
                ),
              ],
            ),
          ),
        ),
      ),
    );
  }
}
