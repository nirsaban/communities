# Community — Flutter mobile app

Multi-tenant community management mobile app. iOS + Android.

## Run

```bash
flutter pub get
flutter run --dart-define=FLAVOR=development
```

The flavor selects which `.env.<flavor>` file is loaded at startup.

## Test

```bash
flutter test
flutter analyze
```

## Folder layout

See `prds/12-mobile-app-flutter.md` §3 for the canonical structure. Highlights:

- `lib/core/` — config, theme, network/Dio setup, errors
- `lib/data/` — repositories + DTOs
- `lib/domain/` — entities + use cases
- `lib/features/<feature>/` — screens / providers / widgets
- `lib/shared/` — reusable UI

## Currently implemented (P1 scope)

- Splash → auth-gated routing via `go_router`
- Login / register / forgot-password / reset-password screens
- `AuthRepository` + `AuthNotifier` (Riverpod) talking to the real backend
- Dio interceptor: attaches access token, refreshes on 401, retries once
- Secure-storage-backed token persistence (`flutter_secure_storage`)
- Material 3 theme with light + dark
- `flutter_dotenv` flavor-aware config

Remaining (P3+) covered in the backend already — wiring to be added in subsequent phases.
