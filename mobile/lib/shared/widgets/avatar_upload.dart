import 'package:flutter/material.dart';
import 'package:material_symbols_icons/symbols.dart';

import '../../commons.dart';

/// 104px circular avatar with an "add photo" overlay used by ProfileSetup.
///
/// Image picking is out of scope for v1 — tapping currently does nothing
/// (logged in DESIGN_DEVIATIONS as a backend/plugin gap). Renders the user's
/// initials as a fallback the moment a [photoUrl] is missing.
class AvatarUpload extends StatelessWidget {
  const AvatarUpload({
    super.key,
    required this.name,
    this.photoUrl,
    this.onTap,
    this.size = 104,
  });

  final String name;
  final String? photoUrl;
  final VoidCallback? onTap;
  final double size;

  String get _initials {
    final parts = name.trim().split(RegExp(r'\s+'));
    if (parts.isEmpty || parts.first.isEmpty) return '?';
    if (parts.length == 1) return parts.first.characters.first.toUpperCase();
    return (parts.first.characters.first + parts.last.characters.first).toUpperCase();
  }

  @override
  Widget build(BuildContext context) {
    final p = context.palette;
    final t = Theme.of(context).textTheme;
    final badge = SizedBox(
      width: 32,
      height: 32,
      child: Material(
        color: p.brand,
        shape: const CircleBorder(),
        child: const Icon(Symbols.add_a_photo_rounded, size: 18, color: Colors.white),
      ),
    );

    return SizedBox(
      width: size,
      height: size,
      child: Material(
        color: Colors.transparent,
        shape: const CircleBorder(),
        child: InkWell(
          customBorder: const CircleBorder(),
          onTap: onTap,
          child: Stack(
            clipBehavior: Clip.none,
            children: [
              Container(
                width: size,
                height: size,
                decoration: BoxDecoration(
                  color: p.surface2,
                  shape: BoxShape.circle,
                  border: Border.all(color: p.border, width: 2),
                  image: photoUrl != null
                      ? DecorationImage(image: NetworkImage(photoUrl!), fit: BoxFit.cover)
                      : null,
                ),
                alignment: Alignment.center,
                child: photoUrl == null
                    ? Text(
                        _initials,
                        style: t.titleLarge!.copyWith(
                          fontSize: size * 0.32,
                          color: p.onBackground2,
                        ),
                      )
                    : null,
              ),
              PositionedDirectional(
                end: 0,
                bottom: 0,
                child: badge,
              ),
            ],
          ),
        ),
      ),
    );
  }
}
