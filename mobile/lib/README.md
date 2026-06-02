# Commons — Flutter Design System

Drop-in theming + components for the Commons community platform. Editorial civic-tech aesthetic: charcoal + warm white + coral, DM Serif Display / DM Sans.

## Files
```
lib/
  commons.dart                 # barrel export — import this
  theme/
    app_colors.dart            # ColorScheme (light+dark) + AppPalette ThemeExtension
    app_typography.dart        # TextTheme (display/title/body/label scale)
    app_tokens.dart            # AppSpacing, AppRadius, AppShadows, AppDuration
    app_theme.dart             # AppTheme.light() / AppTheme.dark() -> ThemeData
  components/
    app_button.dart            # AppButton (primary/secondary/ghost/danger + loading)
    app_text_field.dart        # AppTextField (default/focused/error/disabled)
    badges.dart                # RoleBadge, PriceTag, StatusChip, LimitedAdminBadge
    member_avatar.dart         # MemberAvatar (photo / initials + role dot)
    event_card.dart            # EventCard
    states.dart                # EmptyState, ErrorState, LoadingShimmer, SectionHeader
```

## 1. Fonts (pubspec.yaml)
Add the font files under `assets/fonts/` and declare them:
```yaml
flutter:
  fonts:
    - family: DM Serif Display
      fonts:
        - asset: assets/fonts/DMSerifDisplay-Regular.ttf
    - family: DM Sans
      fonts:
        - { asset: assets/fonts/DMSans-Regular.ttf,  weight: 400 }
        - { asset: assets/fonts/DMSans-Medium.ttf,   weight: 500 }
        - { asset: assets/fonts/DMSans-SemiBold.ttf, weight: 600 }
        - { asset: assets/fonts/DMSans-Bold.ttf,     weight: 700 }
```
(Or use the `google_fonts` package and swap the `fontFamily` strings in `app_typography.dart`.)

## 2. Wire up the theme (main.dart)
```dart
import 'package:flutter/material.dart';
import 'commons.dart';

void main() => runApp(const CommonsApp());

class CommonsApp extends StatelessWidget {
  const CommonsApp({super.key});
  @override
  Widget build(BuildContext context) {
    return MaterialApp(
      title: 'Commons',
      theme: AppTheme.light(),
      darkTheme: AppTheme.dark(),
      themeMode: ThemeMode.system, // or user override
      home: const HomeScreen(),
    );
  }
}
```

## 3. Per-community brand override
Re-skin the whole app with a community's stored color:
```dart
theme: AppTheme.light(brand: community.brandColor),
darkTheme: AppTheme.dark(brand: community.brandColor),
```

## 4. Reading tokens in widgets
```dart
final p = context.palette;   // AppPalette: surface2, muted, border, accentWash, success...
final cs = context.cs;       // Material ColorScheme: primary, error, surface...
Text('Hi', style: Theme.of(context).textTheme.displayMedium);
Container(padding: const EdgeInsets.all(AppSpacing.s4), ...);
```

## Component examples
```dart
AppButton('RSVP — I\'m going', onPressed: rsvp);
AppButton.secondary('Edit profile', icon: Icons.edit, onPressed: edit);
AppButton.danger('Delete', loading: deleting, onPressed: confirmDelete);

const AppTextField(label: 'Email', leadingIcon: Icons.mail, hint: 'you@example.com');
const AppTextField(label: 'Password', obscure: true, errorText: 'Too short');

const RoleBadge(AppRole.admin);
const PriceTag(PriceKind.paid, amount: '₪45');
const StatusChip(EventStatus.published);

const MemberAvatar('Noa Levi', role: AppRole.eventManager, size: 44);

EventCard(
  title: 'Torah Study Circle',
  whenLabel: 'Sat · Mar 8 · 10:00',
  location: 'Beit Tefilah',
  priceKind: PriceKind.free,
  onTap: openEvent,
);

EmptyState(
  icon: Icons.event_upcoming,
  headline: 'No events yet',
  body: 'When your community schedules something, it lands here first.',
  ctaLabel: 'Notify me',
  onCta: subscribe,
);
```
