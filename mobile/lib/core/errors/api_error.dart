/// Matches the backend's standard error envelope `{ error: { code, message, details } }`.
class ApiError implements Exception {
  ApiError({
    required this.code,
    required this.message,
    this.details,
    this.statusCode,
  });

  final String code;
  final String message;
  final Object? details;
  final int? statusCode;

  factory ApiError.fromResponse(int? statusCode, Object? data) {
    if (data is Map<String, dynamic> && data['error'] is Map) {
      final err = data['error'] as Map;
      return ApiError(
        code: (err['code'] as String?) ?? 'INTERNAL_ERROR',
        message: (err['message'] as String?) ?? 'Something went wrong',
        details: err['details'],
        statusCode: statusCode,
      );
    }
    return ApiError(
      code: 'INTERNAL_ERROR',
      message: 'Unexpected server response',
      statusCode: statusCode,
    );
  }

  factory ApiError.network() => ApiError(code: 'NETWORK', message: 'Network unavailable');

  bool get isUnauthenticated => code == 'UNAUTHENTICATED' || statusCode == 401;
  bool get isUnauthorized => code == 'UNAUTHORIZED' || statusCode == 403;
  bool get isNotFound => code == 'NOT_FOUND' || statusCode == 404;
  bool get isConflict => code == 'CONFLICT' || statusCode == 409;
  bool get isInvalidInput => code == 'INVALID_INPUT' || statusCode == 400;

  @override
  String toString() => '[$code] $message';
}
