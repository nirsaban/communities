import 'package:flutter/material.dart';
import 'package:material_symbols_icons/symbols.dart';

import '../../../../commons.dart';
import '../../../../data/models/event_dto.dart';

/// Spec: design-specs/EventsCalendar.json (route "/events?view=calendar").
/// MonthSwitcher (stepper) → WeekdayHeader (grid) → CalendarGrid (with event
/// dots) → AgendaLabel → EventCard list for the selected day.
///
/// Pure presentation; the parent passes events for the visible month and an
/// EventCard builder (so the existing kit EventCard can be reused without
/// duplicating tap/RSVP wiring).
class EventsCalendarView extends StatefulWidget {
  const EventsCalendarView({
    super.key,
    required this.events,
    required this.cardBuilder,
  });

  final List<EventDto> events;
  final Widget Function(BuildContext, EventDto) cardBuilder;

  @override
  State<EventsCalendarView> createState() => _EventsCalendarViewState();
}

class _EventsCalendarViewState extends State<EventsCalendarView> {
  late DateTime _month;
  DateTime? _selectedDay;

  @override
  void initState() {
    super.initState();
    final now = DateTime.now();
    _month = DateTime(now.year, now.month);
    _selectedDay = DateTime(now.year, now.month, now.day);
  }

  void _shiftMonth(int delta) {
    setState(() => _month = DateTime(_month.year, _month.month + delta));
  }

  bool _sameDay(DateTime a, DateTime b) =>
      a.year == b.year && a.month == b.month && a.day == b.day;

  List<EventDto> _agendaEvents() {
    final day = _selectedDay;
    if (day == null) return const [];
    return widget.events.where((e) => _sameDay(e.startAt, day)).toList();
  }

  Set<int> _eventDays() {
    final days = <int>{};
    for (final e in widget.events) {
      if (e.startAt.year == _month.year && e.startAt.month == _month.month) {
        days.add(e.startAt.day);
      }
    }
    return days;
  }

  @override
  Widget build(BuildContext context) {
    final p = context.palette;
    final t = Theme.of(context).textTheme;
    final dark = Theme.of(context).brightness == Brightness.dark;
    final firstWeekday = DateTime(_month.year, _month.month, 1).weekday; // 1=Mon
    final daysInMonth = DateTime(_month.year, _month.month + 1, 0).day;
    // Hebrew week starts Sunday: align grid so Sun=0.
    final lead = firstWeekday % 7;
    final eventDays = _eventDays();
    final agenda = _agendaEvents();

    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        // MonthSwitcher
        Padding(
          padding: const EdgeInsets.symmetric(horizontal: 20, vertical: 8),
          child: Row(
            children: [
              _MonthStepBtn(icon: Symbols.chevron_right_rounded, onTap: () => _shiftMonth(-1)),
              Expanded(
                child: Text(
                  _formatMonth(_month),
                  textAlign: TextAlign.center,
                  style: t.titleMedium!.copyWith(fontSize: 16, fontWeight: FontWeight.w700),
                ),
              ),
              _MonthStepBtn(icon: Symbols.chevron_left_rounded, onTap: () => _shiftMonth(1)),
            ],
          ),
        ),
        // WeekdayHeader
        Padding(
          padding: const EdgeInsets.symmetric(horizontal: 20),
          child: Row(
            children: [
              for (final label in const ['א', 'ב', 'ג', 'ד', 'ה', 'ו', 'ש'])
                Expanded(
                  child: Center(
                    child: Text(
                      label,
                      style: t.labelSmall!.copyWith(color: p.muted, fontSize: 12),
                    ),
                  ),
                ),
            ],
          ),
        ),
        const SizedBox(height: 4),
        // CalendarGrid
        Padding(
          padding: const EdgeInsets.symmetric(horizontal: 16),
          child: GridView.builder(
            shrinkWrap: true,
            physics: const NeverScrollableScrollPhysics(),
            itemCount: lead + daysInMonth,
            gridDelegate: const SliverGridDelegateWithFixedCrossAxisCount(
              crossAxisCount: 7,
              mainAxisExtent: 44,
            ),
            itemBuilder: (context, i) {
              if (i < lead) return const SizedBox.shrink();
              final day = i - lead + 1;
              final date = DateTime(_month.year, _month.month, day);
              final isSelected = _selectedDay != null && _sameDay(date, _selectedDay!);
              final hasEvents = eventDays.contains(day);
              return GestureDetector(
                onTap: () => setState(() => _selectedDay = date),
                child: Container(
                  margin: const EdgeInsets.all(2),
                  decoration: BoxDecoration(
                    color: isSelected ? (dark ? p.brand : p.accentInk) : Colors.transparent,
                    shape: BoxShape.circle,
                  ),
                  alignment: Alignment.center,
                  child: Column(
                    mainAxisAlignment: MainAxisAlignment.center,
                    children: [
                      Text(
                        '$day',
                        style: t.bodyMedium!.copyWith(
                          fontSize: 14,
                          fontWeight: isSelected ? FontWeight.w700 : FontWeight.w500,
                          color: isSelected ? p.onAccent : p.onBackground,
                        ),
                      ),
                      if (hasEvents)
                        Container(
                          width: 4,
                          height: 4,
                          margin: const EdgeInsets.only(top: 2),
                          decoration: BoxDecoration(
                            color: isSelected ? p.onAccent : (dark ? p.brand : p.accentInk),
                            shape: BoxShape.circle,
                          ),
                        ),
                    ],
                  ),
                ),
              );
            },
          ),
        ),
        const SizedBox(height: 16),
        // AgendaLabel
        Padding(
          padding: const EdgeInsets.symmetric(horizontal: 20),
          child: Text(
            _formatAgendaLabel(_selectedDay),
            style: t.labelSmall!.copyWith(
              color: p.muted,
              letterSpacing: 0.5,
              fontSize: 11.5,
            ),
          ),
        ),
        const SizedBox(height: 8),
        if (agenda.isEmpty)
          Padding(
            padding: const EdgeInsets.symmetric(horizontal: 20, vertical: 24),
            child: Text(
              'אין אירועים ביום זה.',
              style: t.bodyMedium!.copyWith(color: p.muted),
            ),
          )
        else
          ...agenda.map((e) => Padding(
                padding: const EdgeInsets.fromLTRB(20, 0, 20, 12),
                child: widget.cardBuilder(context, e),
              )),
      ],
    );
  }
}

class _MonthStepBtn extends StatelessWidget {
  const _MonthStepBtn({required this.icon, required this.onTap});
  final IconData icon;
  final VoidCallback onTap;

  @override
  Widget build(BuildContext context) {
    final p = context.palette;
    return Material(
      color: Colors.transparent,
      shape: const CircleBorder(),
      child: InkWell(
        customBorder: const CircleBorder(),
        onTap: onTap,
        child: SizedBox(
          width: 36,
          height: 36,
          child: Icon(icon, size: 22, color: p.onBackground),
        ),
      ),
    );
  }
}

String _formatMonth(DateTime dt) {
  const months = ['ינואר', 'פברואר', 'מרץ', 'אפריל', 'מאי', 'יוני', 'יולי', 'אוגוסט', 'ספטמבר', 'אוקטובר', 'נובמבר', 'דצמבר'];
  return '${months[dt.month - 1]} ${dt.year}';
}

String _formatAgendaLabel(DateTime? dt) {
  if (dt == null) return 'בחר יום';
  const months = ['ינו׳', 'פבר׳', 'מרץ', 'אפר׳', 'מאי', 'יוני', 'יולי', 'אוג׳', 'ספט׳', 'אוק׳', 'נוב׳', 'דצמ׳'];
  return '${dt.day} ${months[dt.month - 1]} · יומן';
}
