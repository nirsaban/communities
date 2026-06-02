import '../../commons.dart';

/// Maps backend wire tokens ("member", "event_manager", "subadmin", "admin",
/// "super_admin"/"superadmin") to the locked [AppRole] enum from
/// `lib/components/badges.dart` (re-exported via `commons.dart`).
///
/// The enum itself is part of the locked design kit; only the parsing logic
/// lives here.
class AppRoleParser {
  AppRoleParser._();

  /// Returns null when the token doesn't match any known role.
  static AppRole? fromToken(String? token) {
    if (token == null) return null;
    switch (token) {
      case 'admin':
        return AppRole.admin;
      case 'subadmin':
      case 'sub_admin':
        return AppRole.subAdmin;
      case 'event_manager':
      case 'eventManager':
        return AppRole.eventManager;
      case 'super_admin':
      case 'superadmin':
        return AppRole.superAdmin;
      case 'member':
        return AppRole.member;
      default:
        return null;
    }
  }
}
