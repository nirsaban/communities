import 'package:flutter/material.dart';

import '../../../../commons.dart';

/// 3-option SegmentedControl matching design-specs/EventsList.json.
/// Pill-shaped container, active segment fills with the brand color.
class SegmentedControl<T> extends StatelessWidget {
  const SegmentedControl({
    super.key,
    required this.value,
    required this.options,
    required this.labels,
    required this.onChanged,
  });

  final T value;
  final List<T> options;
  final List<String> labels;
  final ValueChanged<T> onChanged;

  @override
  Widget build(BuildContext context) {
    final p = context.palette;
    final dark = Theme.of(context).brightness == Brightness.dark;
    return Container(
      height: 40,
      decoration: BoxDecoration(
        color: p.surface2,
        borderRadius: AppRadius.brFull,
      ),
      padding: const EdgeInsets.all(3),
      child: Row(
        children: [
          for (var i = 0; i < options.length; i++)
            Expanded(
              child: GestureDetector(
                onTap: () => onChanged(options[i]),
                child: AnimatedContainer(
                  duration: AppDuration.fast,
                  decoration: BoxDecoration(
                    color: options[i] == value ? p.surface : Colors.transparent,
                    borderRadius: AppRadius.brFull,
                    boxShadow: options[i] == value ? AppShadows.low(dark: dark) : null,
                  ),
                  alignment: Alignment.center,
                  child: Text(
                    labels[i],
                    style: Theme.of(context).textTheme.labelLarge!.copyWith(
                          fontSize: 13.5,
                          color: options[i] == value
                              ? p.onBackground
                              : p.onBackground2,
                          fontWeight: FontWeight.w600,
                        ),
                  ),
                ),
              ),
            ),
        ],
      ),
    );
  }
}
