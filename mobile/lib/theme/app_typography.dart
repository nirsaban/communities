import 'package:flutter/material.dart';
import 'package:google_fonts/google_fonts.dart';

/// Commons — Typography.
///
/// Pairing: DM Serif Display (display roles) + DM Sans (everything else).
///
/// pubspec.yaml — declare the fonts (or swap these two lines for GoogleFonts):
/// flutter:
///   fonts:
///     - family: DM Serif Display
///       fonts: [{ asset: assets/fonts/DMSerifDisplay-Regular.ttf }]
///     - family: DM Sans
///       fonts:
///         - { asset: assets/fonts/DMSans-Regular.ttf, weight: 400 }
///         - { asset: assets/fonts/DMSans-Medium.ttf,  weight: 500 }
///         - { asset: assets/fonts/DMSans-SemiBold.ttf, weight: 600 }
///         - { asset: assets/fonts/DMSans-Bold.ttf,     weight: 700 }
class AppTypography {
  AppTypography._();

  static const String display = 'DM Serif Display';
  static const String sans = 'DM Sans';

  /// Builds a TextTheme for the given on-surface color. Fonts come from
  /// `google_fonts` because we don't bundle TTF assets — see
  /// /docs/DESIGN_DEVIATIONS.md.
  static TextTheme textTheme(Color onSurface, Color muted) {
    TextStyle serif({
      required double fontSize,
      required double height,
      required double letterSpacing,
      required Color color,
    }) =>
        GoogleFonts.dmSerifDisplay(
          fontSize: fontSize,
          height: height,
          letterSpacing: letterSpacing,
          color: color,
        );

    TextStyle sans({
      required FontWeight fontWeight,
      required double fontSize,
      required double height,
      required Color color,
      double letterSpacing = 0,
    }) =>
        GoogleFonts.dmSans(
          fontWeight: fontWeight,
          fontSize: fontSize,
          height: height,
          letterSpacing: letterSpacing,
          color: color,
        );

    return TextTheme(
      displayLarge: serif(
        fontSize: 34, height: 1.05, letterSpacing: -0.34, color: onSurface,
      ),
      displayMedium: serif(
        fontSize: 27, height: 1.08, letterSpacing: -0.27, color: onSurface,
      ),
      titleLarge: sans(
        fontWeight: FontWeight.w700, fontSize: 22,
        height: 1.18, letterSpacing: -0.33, color: onSurface,
      ),
      titleMedium: sans(
        fontWeight: FontWeight.w600, fontSize: 17,
        height: 1.25, letterSpacing: -0.17, color: onSurface,
      ),
      bodyLarge: sans(
        fontWeight: FontWeight.w400, fontSize: 15.5,
        height: 1.45, color: onSurface,
      ),
      bodyMedium: sans(
        fontWeight: FontWeight.w400, fontSize: 13.5,
        height: 1.45, color: muted,
      ),
      labelLarge: sans(
        fontWeight: FontWeight.w600, fontSize: 13,
        height: 1.2, color: onSurface,
      ),
      labelSmall: sans(
        fontWeight: FontWeight.w600, fontSize: 11,
        height: 1.2, letterSpacing: 0.66, color: muted,
      ),
    );
  }
}
