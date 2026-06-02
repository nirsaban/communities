import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';
import 'package:material_symbols_icons/symbols.dart';

import '../../../../commons.dart';
import '../../../../core/i18n/strings.dart';
import '../../../../data/models/event_qa_dto.dart';
import '../../../../shared/widgets/widgets.dart';
import '../../../payments/presentation/providers/payment_providers.dart';
import '../providers/event_manager_providers.dart';

/// Spec: design-specs/EventMaterials.json (route "/events/:id/materials", role: member).
/// RecordingCard (in-app player — DEVIATION: defer to OS via url_launcher), DocumentRow with downloadButton.
class EventMaterialsScreen extends ConsumerWidget {
  const EventMaterialsScreen({super.key, required this.eventId});
  final String eventId;

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final p = context.palette;
    final t = Theme.of(context).textTheme;
    final async = ref.watch(eventMaterialsProvider(eventId));

    return Directionality(
      textDirection: TextDirection.rtl,
      child: Scaffold(
        backgroundColor: p.background,
        appBar: AppBar(
          backgroundColor: p.background,
          elevation: 0,
          scrolledUnderElevation: 0,
          leading: AppBackButton(),
          title: Text(S.materialsTitle, style: t.titleMedium!.copyWith(fontSize: 16)),
          centerTitle: true,
        ),
        body: SafeArea(
          top: false,
          child: async.when(
            loading: () => const _Loading(),
            error: (e, _) => ErrorState(onRetry: () => ref.invalidate(eventMaterialsProvider(eventId))),
            data: (rows) {
              if (rows.isEmpty) return const _Empty();
              return ListView.separated(
                padding: const EdgeInsets.fromLTRB(20, 8, 20, 24),
                itemCount: rows.length,
                separatorBuilder: (_, __) => const SizedBox(height: 10),
                itemBuilder: (_, i) => _MaterialRow(material: rows[i]),
              );
            },
          ),
        ),
      ),
    );
  }
}

class _MaterialRow extends ConsumerWidget {
  const _MaterialRow({required this.material});
  final EventMaterialDto material;

  IconData get _icon {
    switch (material.type) {
      case 'pdf':
        return Symbols.picture_as_pdf_rounded;
      case 'video':
        return Symbols.play_circle_rounded;
      case 'audio':
        return Symbols.audiotrack_rounded;
      case 'image':
        return Symbols.image_rounded;
      case 'slides':
        return Symbols.slideshow_rounded;
      default:
        return Symbols.description_rounded;
    }
  }

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final p = context.palette;
    final t = Theme.of(context).textTheme;
    return InkWell(
      borderRadius: AppRadius.brMd,
      onTap: () async {
        final url = material.fileUrl;
        if (url.startsWith('http')) {
          await ref.read(urlLauncherProvider)(Uri.parse(url));
        }
      },
      child: Container(
        padding: const EdgeInsets.all(14),
        decoration: BoxDecoration(
          color: p.surface,
          borderRadius: AppRadius.brMd,
          border: Border.all(color: p.border),
        ),
        child: Row(
          children: [
            Container(
              width: 40,
              height: 40,
              decoration: BoxDecoration(color: p.surface2, borderRadius: BorderRadius.circular(10)),
              alignment: Alignment.center,
              child: Icon(_icon, color: p.accentInk, size: 20),
            ),
            const SizedBox(width: 12),
            Expanded(
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  Text(
                    material.title,
                    style: t.titleMedium!.copyWith(fontSize: 14.5, fontWeight: FontWeight.w700),
                    maxLines: 1,
                    overflow: TextOverflow.ellipsis,
                  ),
                  if ((material.description ?? '').isNotEmpty) ...[
                    const SizedBox(height: 2),
                    Text(
                      material.description!,
                      style: t.bodyMedium!.copyWith(fontSize: 12.5, color: p.muted),
                      maxLines: 1,
                      overflow: TextOverflow.ellipsis,
                    ),
                  ],
                ],
              ),
            ),
            Icon(Symbols.download_rounded, size: 22, color: p.muted),
          ],
        ),
      ),
    );
  }
}

class _Empty extends StatelessWidget {
  const _Empty();
  @override
  Widget build(BuildContext context) {
    return EmptyState(
      icon: Symbols.folder_off_rounded,
      headline: S.materialsEmpty,
      body: '',
    );
  }
}

class _Loading extends StatelessWidget {
  const _Loading();
  @override
  Widget build(BuildContext context) {
    return ListView.separated(
      padding: const EdgeInsets.fromLTRB(20, 8, 20, 24),
      itemCount: 4,
      separatorBuilder: (_, __) => const SizedBox(height: 10),
      itemBuilder: (_, __) => const LoadingShimmer(height: 64, radius: AppRadius.md),
    );
  }
}
