import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';

import '../../../../commons.dart';
import '../../../../core/i18n/strings.dart';
import '../../../../data/models/notification_dto.dart';
import '../../../../shared/widgets/widgets.dart';
import '../providers/notification_providers.dart';

/// Spec: design-specs/NotificationPreferences.json (route "/settings/notifications").
/// BackButton, ChannelHeader ["Push","Email"], PrefRow (listRow, trailing: dualToggle).
/// PushColumnBanner shown when OS push permission is off.
class NotificationPreferencesScreen extends ConsumerStatefulWidget {
  const NotificationPreferencesScreen({super.key});

  @override
  ConsumerState<NotificationPreferencesScreen> createState() => _State();
}

class _State extends ConsumerState<NotificationPreferencesScreen> {
  NotificationPreferencesDto? _local;
  bool _saving = false;

  Future<void> _toggle(NotificationPrefKey key, {bool? push, bool? email}) async {
    if (_local == null) return;
    final next = _local!.withChannel(key, push: push, email: email);
    setState(() {
      _local = next;
      _saving = true;
    });
    try {
      final saved = await ref.read(notificationsControllerProvider).updatePreferences(next);
      if (!mounted) return;
      setState(() => _local = saved);
    } catch (_) {
      if (!mounted) return;
      ScaffoldMessenger.of(context).showSnackBar(
        const SnackBar(content: Text(S.notifPrefsSaveFailed)),
      );
    } finally {
      if (mounted) setState(() => _saving = false);
    }
  }

  @override
  Widget build(BuildContext context) {
    final p = context.palette;
    final t = Theme.of(context).textTheme;
    final async = ref.watch(notificationPreferencesProvider);

    return Directionality(
      textDirection: TextDirection.rtl,
      child: Scaffold(
        backgroundColor: p.background,
        appBar: AppBar(
          backgroundColor: p.background,
          elevation: 0,
          scrolledUnderElevation: 0,
          leading: AppBackButton(),
          title: Text(S.notifPrefsTitle, style: t.titleMedium!.copyWith(fontSize: 16)),
          centerTitle: true,
        ),
        body: SafeArea(
          top: false,
          child: async.when(
            loading: () => const Center(child: CircularProgressIndicator()),
            error: (e, _) => Center(
              child: TextButton(
                onPressed: () => ref.invalidate(notificationPreferencesProvider),
                child: const Text(S.retry),
              ),
            ),
            data: (prefs) {
              _local ??= prefs;
              return _PrefsList(
                prefs: _local!,
                onToggle: _toggle,
                saving: _saving,
              );
            },
          ),
        ),
      ),
    );
  }
}

class _PrefsList extends StatelessWidget {
  const _PrefsList({required this.prefs, required this.onToggle, required this.saving});
  final NotificationPreferencesDto prefs;
  final void Function(NotificationPrefKey, {bool? push, bool? email}) onToggle;
  final bool saving;

  @override
  Widget build(BuildContext context) {
    final p = context.palette;
    final t = Theme.of(context).textTheme;
    return ListView(
      padding: const EdgeInsets.fromLTRB(20, 8, 20, 32),
      children: [
        // ChannelHeader row.
        Padding(
          padding: const EdgeInsets.fromLTRB(0, 6, 0, 8),
          child: Row(
            children: [
              const Expanded(child: SizedBox()),
              SizedBox(
                width: 64,
                child: Text(
                  S.notifPrefsHeaderPush,
                  textAlign: TextAlign.center,
                  style: t.labelSmall!.copyWith(color: p.muted, fontSize: 11.5, letterSpacing: 0.4),
                ),
              ),
              SizedBox(
                width: 64,
                child: Text(
                  S.notifPrefsHeaderEmail,
                  textAlign: TextAlign.center,
                  style: t.labelSmall!.copyWith(color: p.muted, fontSize: 11.5, letterSpacing: 0.4),
                ),
              ),
            ],
          ),
        ),
        Container(
          decoration: BoxDecoration(
            color: p.surface,
            borderRadius: AppRadius.brMd,
            border: Border.all(color: p.border),
          ),
          child: Column(
            children: [
              for (var i = 0; i < NotificationPrefKey.values.length; i++) ...[
                _PrefRow(
                  keyName: NotificationPrefKey.values[i],
                  channel: prefs.get(NotificationPrefKey.values[i]),
                  onToggle: onToggle,
                ),
                if (i < NotificationPrefKey.values.length - 1) _RowDivider(),
              ],
            ],
          ),
        ),
        if (saving) ...[
          const SizedBox(height: 12),
          Center(
            child: Text(
              S.loading,
              style: t.labelSmall!.copyWith(color: p.muted, fontSize: 11),
            ),
          ),
        ],
      ],
    );
  }
}

class _PrefRow extends StatelessWidget {
  const _PrefRow({required this.keyName, required this.channel, required this.onToggle});
  final NotificationPrefKey keyName;
  final NotificationChannelPrefs channel;
  final void Function(NotificationPrefKey, {bool? push, bool? email}) onToggle;

  @override
  Widget build(BuildContext context) {
    final t = Theme.of(context).textTheme;
    return Padding(
      padding: const EdgeInsets.symmetric(horizontal: 14, vertical: 8),
      child: Row(
        children: [
          Expanded(
            child: Text(
              S.notifPrefLabel(prefKeyToString(keyName)),
              style: t.bodyMedium!.copyWith(fontSize: 14.5),
            ),
          ),
          SizedBox(
            width: 64,
            child: Center(
              child: Switch(
                value: channel.push,
                onChanged: (v) => onToggle(keyName, push: v),
              ),
            ),
          ),
          SizedBox(
            width: 64,
            child: Center(
              child: Switch(
                value: channel.email,
                onChanged: (v) => onToggle(keyName, email: v),
              ),
            ),
          ),
        ],
      ),
    );
  }
}

class _RowDivider extends StatelessWidget {
  @override
  Widget build(BuildContext context) {
    return Container(
      height: 1,
      margin: const EdgeInsets.symmetric(horizontal: 14),
      color: context.palette.border,
    );
  }
}
