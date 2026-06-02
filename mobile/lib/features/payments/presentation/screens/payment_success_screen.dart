import 'dart:async';

import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';
import 'package:material_symbols_icons/symbols.dart';

import '../../../../commons.dart';
import '../../../../core/i18n/strings.dart';
import '../../../../data/models/community_dto.dart';
import '../../../../shared/widgets/widgets.dart';
import '../../../communities/presentation/providers/community_providers.dart';

/// Spec: design-specs/PaymentSuccess.json (route "/pay/success", role: member).
/// SuccessBlob, Title (displayMedium), ReceiptCard, AddToCalendar + ViewRSVP.
/// PRD 09 §6.1: app polls /me/rsvps until the relevant RSVP is paid+going.
class PaymentSuccessScreen extends ConsumerStatefulWidget {
  const PaymentSuccessScreen({super.key, this.eventId});
  final String? eventId;

  @override
  ConsumerState<PaymentSuccessScreen> createState() => _State();
}

class _State extends ConsumerState<PaymentSuccessScreen> with WidgetsBindingObserver {
  Timer? _poll;
  bool _confirmed = false;
  int _attempts = 0;

  @override
  void initState() {
    super.initState();
    WidgetsBinding.instance.addObserver(this);
    // ref.invalidate / ref.read can't run during initState — schedule for the
    // first frame so the ConsumerStatefulElement is fully wired.
    WidgetsBinding.instance.addPostFrameCallback((_) {
      if (mounted) _start();
    });
  }

  @override
  void dispose() {
    WidgetsBinding.instance.removeObserver(this);
    _poll?.cancel();
    super.dispose();
  }

  @override
  void didChangeAppLifecycleState(AppLifecycleState state) {
    if (state == AppLifecycleState.resumed && !_confirmed) {
      // The user just came back from the external Stripe page — refresh once.
      ref.invalidate(myRsvpsProvider(const MyRsvpsQuery(bucket: 'upcoming')));
    }
  }

  void _start() {
    _poll?.cancel();
    _poll = Timer.periodic(const Duration(seconds: 2), (_) => _tick());
    _tick();
  }

  Future<void> _tick() async {
    if (!mounted || _confirmed) return;
    _attempts++;
    ref.invalidate(myRsvpsProvider(const MyRsvpsQuery(bucket: 'upcoming')));
    try {
      final rows = await ref.read(myRsvpsProvider(const MyRsvpsQuery(bucket: 'upcoming')).future);
      MyRsvpEntry? match;
      for (final r in rows) {
        final ok = widget.eventId == null
            ? r.isGoing
            : r.event.id == widget.eventId && r.isGoing;
        if (ok) {
          match = r;
          break;
        }
      }
      if (match != null) {
        if (mounted) setState(() => _confirmed = true);
        _poll?.cancel();
      }
    } catch (_) {/* keep polling */}
    if (_attempts > 30) _poll?.cancel(); // ~60s cap
  }

  @override
  Widget build(BuildContext context) {
    final p = context.palette;
    final t = Theme.of(context).textTheme;

    return Directionality(
      textDirection: TextDirection.rtl,
      child: Scaffold(
        backgroundColor: p.background,
        body: SafeArea(
          child: SingleChildScrollView(
            padding: const EdgeInsets.fromLTRB(20, 24, 20, 32),
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.stretch,
              children: [
                Center(
                  child: _SpringScale(
                    child: IconBlob(
                      icon: _confirmed ? Symbols.check_rounded : Symbols.hourglass_top_rounded,
                      bg: _confirmed ? p.successWash : p.accentWash,
                      color: _confirmed ? p.success : p.accentInk,
                    ),
                  ),
                ),
                const SizedBox(height: 18),
                Text(
                  _confirmed ? S.paymentSuccessTitle : S.paymentSuccessConfirming,
                  textAlign: TextAlign.center,
                  style: t.displayMedium!.copyWith(fontSize: 26),
                ),
                const SizedBox(height: 8),
                Text(
                  _confirmed ? S.paymentSuccessBody : S.paymentSuccessTimeoutHint,
                  textAlign: TextAlign.center,
                  style: t.bodyMedium!.copyWith(color: p.muted, height: 1.5),
                ),
                const SizedBox(height: 22),
                Container(
                  padding: const EdgeInsets.all(14),
                  decoration: BoxDecoration(
                    color: p.surface,
                    borderRadius: AppRadius.brMd,
                    border: Border.all(color: p.border),
                  ),
                  child: Row(
                    children: [
                      Icon(Symbols.receipt_long_rounded, color: p.accentInk),
                      const SizedBox(width: 10),
                      Expanded(
                        child: Text(
                          S.paymentSuccessReceipt,
                          style: t.titleMedium!.copyWith(fontSize: 14.5, fontWeight: FontWeight.w700),
                        ),
                      ),
                      Icon(Symbols.chevron_left_rounded, size: 20, color: p.muted),
                    ],
                  ),
                ),
                const SizedBox(height: 22),
                AppButton(
                  S.addToCalendar,
                  icon: Symbols.event_available_rounded,
                  onPressed: _confirmed ? () {} : null,
                ),
                const SizedBox(height: 10),
                AppButton.ghost(
                  S.viewMyRsvps,
                  onPressed: () => GoRouter.of(context).go('/me/rsvps'),
                ),
              ],
            ),
          ),
        ),
      ),
    );
  }
}

class _SpringScale extends StatefulWidget {
  const _SpringScale({required this.child});
  final Widget child;

  @override
  State<_SpringScale> createState() => _SpringScaleState();
}

class _SpringScaleState extends State<_SpringScale> with SingleTickerProviderStateMixin {
  late final AnimationController _c =
      AnimationController(vsync: this, duration: const Duration(milliseconds: 460))..forward();
  late final Animation<double> _scale = CurvedAnimation(parent: _c, curve: Curves.easeOutBack);

  @override
  void dispose() {
    _c.dispose();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) =>
      ScaleTransition(scale: Tween<double>(begin: 0.6, end: 1).animate(_scale), child: widget.child);
}
