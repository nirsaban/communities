import 'package:flutter/material.dart';

import '../../../../commons.dart';

/// Scrollable horizontal chip row matching design-specs/EventsList.json FilterChips.
class EventFilterChips extends StatelessWidget {
  const EventFilterChips({
    super.key,
    required this.options,
    required this.labels,
    required this.selected,
    required this.onToggle,
  });

  final List<String> options;
  final List<String> labels;
  final Set<String> selected;
  final ValueChanged<String> onToggle;

  @override
  Widget build(BuildContext context) {
    return SizedBox(
      height: 36,
      child: ListView.separated(
        scrollDirection: Axis.horizontal,
        padding: const EdgeInsets.symmetric(horizontal: 20),
        itemCount: options.length,
        separatorBuilder: (_, __) => const SizedBox(width: 8),
        itemBuilder: (context, i) {
          final isOn = selected.contains(options[i]);
          return _Chip(label: labels[i], active: isOn, onTap: () => onToggle(options[i]));
        },
      ),
    );
  }
}

class _Chip extends StatelessWidget {
  const _Chip({required this.label, required this.active, required this.onTap});
  final String label;
  final bool active;
  final VoidCallback onTap;

  @override
  Widget build(BuildContext context) {
    final p = context.palette;
    final dark = Theme.of(context).brightness == Brightness.dark;
    return InkWell(
      borderRadius: AppRadius.brFull,
      onTap: onTap,
      child: Container(
        padding: const EdgeInsets.symmetric(horizontal: 14),
        alignment: Alignment.center,
        decoration: BoxDecoration(
          color: active ? p.accentWash : p.surface,
          borderRadius: AppRadius.brFull,
          border: Border.all(color: active ? (dark ? p.brand : p.accentInk) : p.border),
        ),
        child: Text(
          label,
          style: Theme.of(context).textTheme.labelLarge!.copyWith(
                fontSize: 13.5,
                fontWeight: FontWeight.w600,
                color: active ? (dark ? p.brand : p.accentInk) : p.onBackground2,
              ),
        ),
      ),
    );
  }
}
