import 'package:flutter/material.dart';
import 'app_colors.dart';
import 'app_typography.dart';
import 'app_tokens.dart';

/// Commons — ThemeData (light + dark), ready for MaterialApp.
///
/// Usage in main.dart:
///   MaterialApp(
///     theme: AppTheme.light(),
///     darkTheme: AppTheme.dark(),
///     themeMode: ThemeMode.system, // or user override
///   );
///
/// Per-community brand override:
///   AppTheme.light(brand: community.brandColor)
class AppTheme {
  AppTheme._();

  static ThemeData light({Color? brand}) =>
      _build(Brightness.light, AppColors.lightScheme, AppPalette.light, brand);

  static ThemeData dark({Color? brand}) =>
      _build(Brightness.dark, AppColors.darkScheme, AppPalette.dark, brand);

  static ThemeData _build(
    Brightness brightness,
    ColorScheme baseScheme,
    AppPalette basePalette,
    Color? brand,
  ) {
    final scheme = brand == null ? baseScheme : baseScheme.copyWith(primary: brand);
    final palette = brand == null ? basePalette : basePalette.copyWith(brand: brand);
    final isDark = brightness == Brightness.dark;
    final textTheme = AppTypography.textTheme(palette.onBackground, palette.muted);

    return ThemeData(
      useMaterial3: true,
      brightness: brightness,
      colorScheme: scheme,
      scaffoldBackgroundColor: palette.background,
      canvasColor: palette.background,
      fontFamily: AppTypography.sans,
      textTheme: textTheme,
      extensions: [palette],
      splashFactory: InkRipple.splashFactory,

      appBarTheme: AppBarTheme(
        backgroundColor: palette.background,
        surfaceTintColor: Colors.transparent,
        elevation: 0,
        centerTitle: false,
        titleTextStyle: textTheme.titleMedium!.copyWith(fontSize: 18),
        iconTheme: IconThemeData(color: palette.onBackground),
      ),

      cardTheme: CardThemeData(
        color: palette.surface,
        surfaceTintColor: Colors.transparent,
        elevation: 0,
        shape: RoundedRectangleBorder(
          borderRadius: AppRadius.brMd,
          side: BorderSide(color: palette.border),
        ),
        margin: EdgeInsets.zero,
      ),

      dividerTheme: DividerThemeData(color: palette.border, thickness: 1, space: 1),

      chipTheme: ChipThemeData(
        backgroundColor: palette.surface,
        side: BorderSide(color: palette.border2),
        shape: const StadiumBorder(),
        labelStyle: textTheme.labelLarge!.copyWith(fontWeight: FontWeight.w500),
      ),

      inputDecorationTheme: InputDecorationTheme(
        filled: true,
        fillColor: palette.surface,
        contentPadding: const EdgeInsets.symmetric(horizontal: 16, vertical: 15),
        hintStyle: textTheme.bodyLarge!.copyWith(color: palette.muted),
        enabledBorder: OutlineInputBorder(
          borderRadius: AppRadius.brMd,
          borderSide: BorderSide(color: palette.border2, width: 1.5),
        ),
        focusedBorder: OutlineInputBorder(
          borderRadius: AppRadius.brMd,
          borderSide: BorderSide(color: scheme.primary, width: 1.5),
        ),
        errorBorder: OutlineInputBorder(
          borderRadius: AppRadius.brMd,
          borderSide: BorderSide(color: palette.error, width: 1.5),
        ),
        focusedErrorBorder: OutlineInputBorder(
          borderRadius: AppRadius.brMd,
          borderSide: BorderSide(color: palette.error, width: 1.5),
        ),
      ),

      bottomNavigationBarTheme: BottomNavigationBarThemeData(
        backgroundColor: palette.surface,
        selectedItemColor: scheme.primary,
        unselectedItemColor: palette.muted,
        type: BottomNavigationBarType.fixed,
        elevation: 0,
        selectedLabelStyle: textTheme.labelSmall!.copyWith(letterSpacing: 0),
        unselectedLabelStyle: textTheme.labelSmall!.copyWith(letterSpacing: 0),
      ),

      bottomSheetTheme: BottomSheetThemeData(
        backgroundColor: palette.surface,
        surfaceTintColor: Colors.transparent,
        shape: const RoundedRectangleBorder(
          borderRadius: BorderRadius.vertical(top: Radius.circular(AppRadius.xl)),
        ),
      ),

      dialogTheme: DialogThemeData(
        backgroundColor: palette.surface,
        surfaceTintColor: Colors.transparent,
        shape: const RoundedRectangleBorder(borderRadius: AppRadius.brLg),
      ),

      shadowColor: isDark ? Colors.black : const Color(0x1A14130F),
    );
  }
}
