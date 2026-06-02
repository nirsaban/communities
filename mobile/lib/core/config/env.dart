import 'package:flutter_dotenv/flutter_dotenv.dart';

class AppEnv {
  AppEnv._({
    required this.apiBaseUrl,
    required this.appName,
  });

  final String apiBaseUrl;
  final String appName;

  static late AppEnv current;

  static Future<void> load({String flavor = 'development'}) async {
    await dotenv.load(fileName: '.env.$flavor');
    current = AppEnv._(
      apiBaseUrl: dotenv.get('API_BASE_URL', fallback: 'http://localhost:3000/api/v1'),
      appName: dotenv.get('APP_NAME', fallback: 'Community'),
    );
  }
}
