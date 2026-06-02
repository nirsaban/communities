import 'package:flutter/material.dart';

import '../../commons.dart';

/// Multi-select chip grid used by `InterestsSelector`. Tapping toggles
/// membership in [selected]; parent owns the state via [onChanged].
class InterestChipGroup extends StatelessWidget {
  const InterestChipGroup({
    super.key,
    required this.options,
    required this.selected,
    required this.onChanged,
  });

  final List<String> options;
  final Set<String> selected;
  final ValueChanged<Set<String>> onChanged;

  @override
  Widget build(BuildContext context) {
    return Wrap(
      spacing: 8,
      runSpacing: 8,
      children: options
          .map((o) => _InterestChip(
                label: o,
                selected: selected.contains(o),
                onTap: () {
                  final next = {...selected};
                  if (!next.add(o)) next.remove(o);
                  onChanged(next);
                },
              ))
          .toList(),
    );
  }
}

class _InterestChip extends StatelessWidget {
  const _InterestChip({
    required this.label,
    required this.selected,
    required this.onTap,
  });

  final String label;
  final bool selected;
  final VoidCallback onTap;

  @override
  Widget build(BuildContext context) {
    final p = context.palette;
    final t = Theme.of(context).textTheme;
    return Material(
      color: selected ? p.accentWash : p.surface,
      shape: StadiumBorder(
        side: BorderSide(
          color: selected ? p.brand : p.border2,
          width: selected ? 1.5 : 1,
        ),
      ),
      child: InkWell(
        customBorder: const StadiumBorder(),
        onTap: onTap,
        child: Padding(
          padding: const EdgeInsets.symmetric(horizontal: 14, vertical: 10),
          child: Text(
            label,
            style: t.labelLarge!.copyWith(
              color: selected ? p.accentInk : p.onBackground,
              fontWeight: FontWeight.w600,
            ),
          ),
        ),
      ),
    );
  }
}
