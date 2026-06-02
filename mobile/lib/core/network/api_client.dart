import 'package:dio/dio.dart';

import '../config/env.dart';
import '../errors/api_error.dart';
import 'token_store.dart';

typedef OnSessionInvalidated = Future<void> Function();
typedef RefreshSession = Future<RefreshResult?> Function(String refreshToken);

class RefreshResult {
  RefreshResult({required this.accessToken, required this.refreshToken});
  final String accessToken;
  final String refreshToken;
}

/// Wires a Dio instance with:
///  - Authorization: Bearer <access> on every request
///  - on 401 (excluding the /auth/refresh path): try refresh once, retry the request, then logout on failure
class ApiClient {
  ApiClient({
    required this.tokenStore,
    required this.onSessionInvalidated,
    required this.refreshSession,
    String? baseUrl,
    Dio? dio,
  }) : dio = dio ??
            Dio(BaseOptions(
              baseUrl: baseUrl ?? AppEnv.current.apiBaseUrl,
              connectTimeout: const Duration(seconds: 15),
              receiveTimeout: const Duration(seconds: 20),
              responseType: ResponseType.json,
              headers: {'Content-Type': 'application/json'},
            )) {
    this.dio.interceptors.add(_authInterceptor());
  }

  final Dio dio;
  final TokenStore tokenStore;
  final OnSessionInvalidated onSessionInvalidated;
  final RefreshSession refreshSession;

  bool _refreshing = false;

  Interceptor _authInterceptor() {
    return InterceptorsWrapper(
      onRequest: (options, handler) async {
        if (options.extra['skipAuth'] != true) {
          final token = await tokenStore.readAccessToken();
          if (token != null && token.isNotEmpty) {
            options.headers['Authorization'] = 'Bearer $token';
          }
        }
        handler.next(options);
      },
      onError: (error, handler) async {
        final response = error.response;
        final isAuthError = response?.statusCode == 401;
        final requestPath = error.requestOptions.path;
        final isRefreshCall = requestPath.endsWith('/auth/refresh');
        if (!isAuthError || isRefreshCall || error.requestOptions.extra['retried'] == true) {
          handler.reject(error);
          return;
        }

        final refresh = await tokenStore.readRefreshToken();
        if (refresh == null || refresh.isEmpty) {
          await onSessionInvalidated();
          handler.reject(error);
          return;
        }

        if (_refreshing) {
          // Best-effort: bail; the in-flight refresh will repopulate tokens.
          handler.reject(error);
          return;
        }
        _refreshing = true;
        try {
          final result = await refreshSession(refresh);
          if (result == null) {
            await tokenStore.clear();
            await onSessionInvalidated();
            handler.reject(error);
            return;
          }
          await tokenStore.write(
            accessToken: result.accessToken,
            refreshToken: result.refreshToken,
          );

          // Retry the original request with the new token.
          final retryOptions = error.requestOptions;
          retryOptions.headers['Authorization'] = 'Bearer ${result.accessToken}';
          retryOptions.extra['retried'] = true;
          final retried = await dio.fetch<dynamic>(retryOptions);
          handler.resolve(retried);
        } catch (_) {
          await tokenStore.clear();
          await onSessionInvalidated();
          handler.reject(error);
        } finally {
          _refreshing = false;
        }
      },
    );
  }

  // Convenience: convert Dio errors to ApiError.
  static ApiError mapError(Object e) {
    if (e is DioException) {
      if (e.type == DioExceptionType.connectionTimeout ||
          e.type == DioExceptionType.receiveTimeout ||
          e.type == DioExceptionType.connectionError) {
        return ApiError.network();
      }
      return ApiError.fromResponse(e.response?.statusCode, e.response?.data);
    }
    if (e is ApiError) return e;
    return ApiError(code: 'INTERNAL_ERROR', message: e.toString());
  }
}
