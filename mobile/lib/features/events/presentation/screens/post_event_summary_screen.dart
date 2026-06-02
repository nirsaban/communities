import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';
import 'package:material_symbols_icons/symbols.dart';

import '../../../../commons.dart';
import '../../../../core/i18n/strings.dart';
import '../../../../shared/widgets/widgets.dart';
import '../providers/event_providers.dart';

/// Spec: design-specs/PostEventSummary.json (route "/events/:id/recap").
/// ShareButton, StatusChip, Title (displayMedium), StatCards, RecapText (bodyLarge),
/// PhotoGrid, ViewMaterialsButton secondary.
class PostEventSummaryScreen extends ConsumerWidget {
  const PostEventSummaryScreen({super.key, required this.eventId});
  final String eventId;

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final p = context.palette;
    final t = Theme.of(context).textTheme;
    final async = ref.watch(eventDetailProvider(eventId));

    return Directionality(
      textDirection: TextDirection.rtl,
      child: Scaffold(
        backgroundColor: p.background,
        appBar: AppBar(
          backgroundColor: p.background,
          elevation: 0,
          scrolledUnderElevation: 0,
          leading: AppBackButton(),
          title: Text(S.recapTitle, style: t.titleMedium!.copyWith(fontSize: 16)),
          centerTitle: true,
          actions: [
            IconButton(
              onPressed: () {},
              icon: Icon(Symbols.share_rounded, color: p.onBackground),
            ),
          ],
        ),
        body: async.when(
          loading: () => const Center(child: CircularProgressIndicator()),
          error: (e, _) => ErrorState(onRetry: () => ref.invalidate(eventDetailProvider(eventId))),
          data: (event) {
            final summary = event.summary;
            final isPublished = summary != null && summary.isPublished;
            if (!isPublished) {
              return Padding(
                padding: const EdgeInsets.only(top: 40),
                child: EmptyState(
                  icon: Symbols.summarize_rounded,
                  headline: S.recapEmpty,
                  body: '',
                ),
              );
            }
            return SafeArea(
              top: false,
              child: SingleChildScrollView(
                padding: const EdgeInsets.fromLTRB(20, 8, 20, 24),
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.stretch,
                  children: [
                    Row(
                      children: [
                        Container(
                          height: 22,
                          padding: const EdgeInsets.symmetric(horizontal: 10),
                          decoration: BoxDecoration(color: p.successWash, borderRadius: AppRadius.brFull),
                          alignment: Alignment.center,
                          child: Text(
                            S.eventCompleted,
                            style: TextStyle(fontSize: 11, color: p.success, fontWeight: FontWeight.w700),
                          ),
                        ),
                      ],
                    ),
                    const SizedBox(height: 10),
                    Text(
                      event.title,
                      style: t.displayMedium!.copyWith(fontSize: 26),
                    ),
                    const SizedBox(height: 14),
                    Row(
                      children: [
                        Expanded(child: _Stat(value: '${event.metrics.rsvpCount}', label: S.recapAttendees)),
                        const SizedBox(width: 12),
                        Expanded(
                          child: _Stat(
                            value: '${summary.photoUrls.length}',
                            label: S.recapPhotosCount,
                          ),
                        ),
                      ],
                    ),
                    const SizedBox(height: 18),
                    Text(
                      summary.body ?? '',
                      style: t.bodyLarge!.copyWith(fontSize: 15, height: 1.55),
                    ),
                    if (summary.photoUrls.isNotEmpty) ...[
                      const SizedBox(height: 18),
                      GridView.count(
                        shrinkWrap: true,
                        physics: const NeverScrollableScrollPhysics(),
                        crossAxisCount: 3,
                        crossAxisSpacing: 8,
                        mainAxisSpacing: 8,
                        children: summary.photoUrls
                            .map((u) => ClipRRect(
                                  borderRadius: BorderRadius.circular(8),
                                  child: Image.network(
                                    u,
                                    fit: BoxFit.cover,
                                    errorBuilder: (_, __, ___) => Container(
                                      color: p.surface2,
                                      child: Icon(Symbols.broken_image_rounded, color: p.muted),
                                    ),
                                  ),
                                ))
                            .toList(),
                      ),
                    ],
                    const SizedBox(height: 22),
                    AppButton.secondary(
                      S.viewMaterialsCta,
                      icon: Symbols.folder_open_rounded,
                      onPressed: () => GoRouter.of(context).push('/events/${event.id}/materials'),
                    ),
                  ],
                ),
              ),
            );
          },
        ),
      ),
    );
  }
}

class _Stat extends StatelessWidget {
  const _Stat({required this.value, required this.label});
  final String value;
  final String label;

  @override
  Widget build(BuildContext context) {
    final p = context.palette;
    final t = Theme.of(context).textTheme;
    return Container(
      padding: const EdgeInsets.symmetric(vertical: 14),
      decoration: BoxDecoration(
        color: p.surface,
        borderRadius: AppRadius.brMd,
        border: Border.all(color: p.border),
      ),
      child: Column(
        children: [
          Text(value, style: t.titleLarge!.copyWith(fontSize: 20, fontWeight: FontWeight.w700)),
          const SizedBox(height: 2),
          Text(label, style: t.labelSmall!.copyWith(color: p.muted, fontSize: 11)),
        ],
      ),
    );
  }
}
