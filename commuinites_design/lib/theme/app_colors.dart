import 'package:flutter/material.dart';

/// Commons — Color tokens.
/// Material's ColorScheme covers the basics; the editorial palette needs a few
/// extra roles (surface-2, muted, borders, washes, success/warning), so those
/// live in [AppPalette], a ThemeExtension you read with `Theme.of(context).extension<AppPalette>()!`.
///
/// Per-community theming: override [AppPalette.brand] (and the ColorScheme primary)
/// with the community's stored brand color to re-skin the whole app.
class AppColors {
  AppColors._();

  // ---- Brand ----
  static const Color coral = Color(0xFFFF5C35); // accent (light)
  static const Color coralDark = Color(0xFFFF6B47); // accent (dark)
  static const Color coralInk = Color(0xFFC7300C);
  static const Color coralInkDark = Color(0xFFFFB59E);

  // ---- Light raw tokens ----
  static const Color lBg = Color(0xFFFAFAF7);
  static const Color lSurface = Color(0xFFFFFFFF);
  static const Color lSurface2 = Color(0xFFF3F1EA);
  static const Color lOnBg = Color(0xFF14130F);
  static const Color lOnBg2 = Color(0xFF4B4842);
  static const Color lMuted = Color(0xFF8A857B);
  static const Color lBorder = Color(0xFFE7E3D9);
  static const Color lBorder2 = Color(0xFFD8D3C7);
  static const Color lAccentWash = Color(0xFFFFEDE6);
  static const Color lError = Color(0xFFD83A3F);
  static const Color lSuccess = Color(0xFF1E8E50);
  static const Color lWarning = Color(0xFFC77A00);

  // ---- Dark raw tokens ----
  static const Color dBg = Color(0xFF0F0F0F);
  static const Color dSurface = Color(0xFF1A1917);
  static const Color dSurface2 = Color(0xFF242220);
  static const Color dOnBg = Color(0xFFFAFAF7);
  static const Color dOnBg2 = Color(0xFFC5C0B6);
  static const Color dMuted = Color(0xFF908B80);
  static const Color dBorder = Color(0xFF2C2A26);
  static const Color dBorder2 = Color(0xFF3A3733);
  static const Color dAccentWash = Color(0xFF3A1F16);
  static const Color dError = Color(0xFFF26B6F);
  static const Color dSuccess = Color(0xFF4FBE82);
  static const Color dWarning = Color(0xFFE2A53C);

  // ---- Material ColorSchemes ----
  static const ColorScheme lightScheme = ColorScheme(
    brightness: Brightness.light,
    primary: coral,
    onPrimary: Color(0xFFFFFFFF),
    secondary: lOnBg,
    onSecondary: lBg,
    error: lError,
    onError: Color(0xFFFFFFFF),
    surface: lSurface,
    onSurface: lOnBg,
    surfaceContainerHighest: lSurface2,
    outline: lBorder2,
    outlineVariant: lBorder,
  );

  static const ColorScheme darkScheme = ColorScheme(
    brightness: Brightness.dark,
    primary: coralDark,
    onPrimary: Color(0xFF1A0E08),
    secondary: dOnBg,
    onSecondary: dBg,
    error: dError,
    onError: Color(0xFF1A0E08),
    surface: dSurface,
    onSurface: dOnBg,
    surfaceContainerHighest: dSurface2,
    outline: dBorder2,
    outlineVariant: dBorder,
  );
}

/// Extra semantic colors not modeled by Material's ColorScheme.
@immutable
class AppPalette extends ThemeExtension<AppPalette> {
  final Color background;
  final Color surface;
  final Color surface2;
  final Color onBackground;
  final Color onBackground2;
  final Color muted;
  final Color border;
  final Color border2;
  final Color brand; // per-community override target
  final Color accentInk;
  final Color accentWash;
  final Color onAccent;
  final Color success;
  final Color successWash;
  final Color warning;
  final Color warningWash;
  final Color error;
  final Color errorWash;

  const AppPalette({
    required this.background,
    required this.surface,
    required this.surface2,
    required this.onBackground,
    required this.onBackground2,
    required this.muted,
    required this.border,
    required this.border2,
    required this.brand,
    required this.accentInk,
    required this.accentWash,
    required this.onAccent,
    required this.success,
    required this.successWash,
    required this.warning,
    required this.warningWash,
    required this.error,
    required this.errorWash,
  });

  static const AppPalette light = AppPalette(
    background: AppColors.lBg,
    surface: AppColors.lSurface,
    surface2: AppColors.lSurface2,
    onBackground: AppColors.lOnBg,
    onBackground2: AppColors.lOnBg2,
    muted: AppColors.lMuted,
    border: AppColors.lBorder,
    border2: AppColors.lBorder2,
    brand: AppColors.coral,
    accentInk: AppColors.coralInk,
    accentWash: AppColors.lAccentWash,
    onAccent: Color(0xFFFFFFFF),
    success: AppColors.lSuccess,
    successWash: Color(0xFFE3F3E9),
    warning: AppColors.lWarning,
    warningWash: Color(0xFFFBF0DC),
    error: AppColors.lError,
    errorWash: Color(0xFFFBE9E9),
  );

  static const AppPalette dark = AppPalette(
    background: AppColors.dBg,
    surface: AppColors.dSurface,
    surface2: AppColors.dSurface2,
    onBackground: AppColors.dOnBg,
    onBackground2: AppColors.dOnBg2,
    muted: AppColors.dMuted,
    border: AppColors.dBorder,
    border2: AppColors.dBorder2,
    brand: AppColors.coralDark,
    accentInk: AppColors.coralInkDark,
    accentWash: AppColors.dAccentWash,
    onAccent: Color(0xFF1A0E08),
    success: AppColors.dSuccess,
    successWash: Color(0xFF163025),
    warning: AppColors.dWarning,
    warningWash: Color(0xFF332813),
    error: AppColors.dError,
    errorWash: Color(0xFF3A1E1F),
  );

  @override
  AppPalette copyWith({
    Color? background,
    Color? surface,
    Color? surface2,
    Color? onBackground,
    Color? onBackground2,
    Color? muted,
    Color? border,
    Color? border2,
    Color? brand,
    Color? accentInk,
    Color? accentWash,
    Color? onAccent,
    Color? success,
    Color? successWash,
    Color? warning,
    Color? warningWash,
    Color? error,
    Color? errorWash,
  }) {
    return AppPalette(
      background: background ?? this.background,
      surface: surface ?? this.surface,
      surface2: surface2 ?? this.surface2,
      onBackground: onBackground ?? this.onBackground,
      onBackground2: onBackground2 ?? this.onBackground2,
      muted: muted ?? this.muted,
      border: border ?? this.border,
      border2: border2 ?? this.border2,
      brand: brand ?? this.brand,
      accentInk: accentInk ?? this.accentInk,
      accentWash: accentWash ?? this.accentWash,
      onAccent: onAccent ?? this.onAccent,
      success: success ?? this.success,
      successWash: successWash ?? this.successWash,
      warning: warning ?? this.warning,
      warningWash: warningWash ?? this.warningWash,
      error: error ?? this.error,
      errorWash: errorWash ?? this.errorWash,
    );
  }

  @override
  AppPalette lerp(ThemeExtension<AppPalette>? other, double t) {
    if (other is! AppPalette) return this;
    return AppPalette(
      background: Color.lerp(background, other.background, t)!,
      surface: Color.lerp(surface, other.surface, t)!,
      surface2: Color.lerp(surface2, other.surface2, t)!,
      onBackground: Color.lerp(onBackground, other.onBackground, t)!,
      onBackground2: Color.lerp(onBackground2, other.onBackground2, t)!,
      muted: Color.lerp(muted, other.muted, t)!,
      border: Color.lerp(border, other.border, t)!,
      border2: Color.lerp(border2, other.border2, t)!,
      brand: Color.lerp(brand, other.brand, t)!,
      accentInk: Color.lerp(accentInk, other.accentInk, t)!,
      accentWash: Color.lerp(accentWash, other.accentWash, t)!,
      onAccent: Color.lerp(onAccent, other.onAccent, t)!,
      success: Color.lerp(success, other.success, t)!,
      successWash: Color.lerp(successWash, other.successWash, t)!,
      warning: Color.lerp(warning, other.warning, t)!,
      warningWash: Color.lerp(warningWash, other.warningWash, t)!,
      error: Color.lerp(error, other.error, t)!,
      errorWash: Color.lerp(errorWash, other.errorWash, t)!,
    );
  }
}

/// Convenience: `context.palette` and `context.cs`.
extension AppThemeX on BuildContext {
  AppPalette get palette => Theme.of(this).extension<AppPalette>()!;
  ColorScheme get cs => Theme.of(this).colorScheme;
}
