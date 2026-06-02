import 'package:flutter/material.dart';

/// Commons — Spacing scale (4-point base).
class AppSpacing {
  AppSpacing._();
  static const double s1 = 4;
  static const double s2 = 8;
  static const double s3 = 12;
  static const double s4 = 16;
  static const double s6 = 24;
  static const double s8 = 32;
  static const double s12 = 48;
  static const double s16 = 64;

  /// Default horizontal page padding for screens.
  static const double pagePadding = 20;
  static const double sectionGap = 24;
}

/// Commons — Corner radii.
class AppRadius {
  AppRadius._();
  static const double sm = 6;
  static const double md = 12;
  static const double lg = 20;
  static const double xl = 28;
  static const double full = 999;

  static const BorderRadius brSm = BorderRadius.all(Radius.circular(sm));
  static const BorderRadius brMd = BorderRadius.all(Radius.circular(md));
  static const BorderRadius brLg = BorderRadius.all(Radius.circular(lg));
  static const BorderRadius brXl = BorderRadius.all(Radius.circular(xl));
  static const BorderRadius brFull = BorderRadius.all(Radius.circular(full));
}

/// Commons — Elevation (BoxShadow lists). Pass `dark: true` for the dark theme.
class AppShadows {
  AppShadows._();

  static List<BoxShadow> none = const [];

  static List<BoxShadow> low({bool dark = false}) => dark
      ? const [BoxShadow(color: Color(0x66000000), blurRadius: 2, offset: Offset(0, 1))]
      : const [
          BoxShadow(color: Color(0x0D14130F), blurRadius: 2, offset: Offset(0, 1)),
          BoxShadow(color: Color(0x0A14130F), blurRadius: 3, offset: Offset(0, 1)),
        ];

  static List<BoxShadow> mid({bool dark = false}) => dark
      ? const [BoxShadow(color: Color(0x80000000), blurRadius: 16, offset: Offset(0, 6))]
      : const [
          BoxShadow(color: Color(0x1214130F), blurRadius: 10, offset: Offset(0, 4)),
          BoxShadow(color: Color(0x0D14130F), blurRadius: 4, offset: Offset(0, 2)),
        ];

  static List<BoxShadow> high({bool dark = false}) => dark
      ? const [BoxShadow(color: Color(0x99000000), blurRadius: 48, offset: Offset(0, 20))]
      : const [
          BoxShadow(color: Color(0x2914130F), blurRadius: 40, offset: Offset(0, 16)),
          BoxShadow(color: Color(0x1414130F), blurRadius: 12, offset: Offset(0, 4)),
        ];
}

/// Commons — Motion.
class AppDuration {
  AppDuration._();
  static const Duration fast = Duration(milliseconds: 150);
  static const Duration base = Duration(milliseconds: 240);
  static const Duration slow = Duration(milliseconds: 360);
  static const Curve spring = Curves.easeOutBack;
  static const Curve standard = Curves.easeOutCubic;
}
