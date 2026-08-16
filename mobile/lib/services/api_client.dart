import 'package:dio/dio.dart';
import 'api_config.dart';
import 'token_store.dart';

/// Set by the app shell to react to a session that could not be refreshed
/// (e.g. drop back to the login screen) — kept as a plain callback instead
/// of a direct dependency on the app's state layer, so this file doesn't
/// need to know Riverpod exists.
typedef SessionExpiredHandler = void Function();

class ApiClient {
  ApiClient._internal() : dio = Dio(BaseOptions(baseUrl: apiBaseUrl)) {
    dio.interceptors.add(InterceptorsWrapper(onRequest: _onRequest, onError: _onError));
  }

  static final ApiClient instance = ApiClient._internal();

  final Dio dio;
  SessionExpiredHandler? onSessionExpired;

  // Concurrent 401s share one refresh call instead of each firing their own.
  Future<String?>? _refreshInFlight;

  Future<void> _onRequest(RequestOptions options, RequestInterceptorHandler handler) async {
    if (options.extra['skipAuth'] != true) {
      final token = await TokenStore.instance.accessToken;
      if (token != null) options.headers['Authorization'] = 'Bearer $token';
    }
    handler.next(options);
  }

  Future<void> _onError(DioException error, ErrorInterceptorHandler handler) async {
    final response = error.response;
    final options = error.requestOptions;
    final alreadyRetried = options.extra['retried'] == true;
    final skipAuth = options.extra['skipAuth'] == true;

    if (response?.statusCode == 401 && !skipAuth && !alreadyRetried) {
      final newAccessToken = await _refreshAccessToken();
      if (newAccessToken != null) {
        options.extra['retried'] = true;
        options.headers['Authorization'] = 'Bearer $newAccessToken';
        try {
          final retried = await dio.fetch(options);
          return handler.resolve(retried);
        } catch (_) {
          // fall through to the original error below
        }
      } else {
        await TokenStore.instance.clear();
        onSessionExpired?.call();
      }
    }
    handler.next(error);
  }

  Future<String?> _refreshAccessToken() {
    return _refreshInFlight ??= () async {
      final refreshToken = await TokenStore.instance.refreshToken;
      if (refreshToken == null) return null;
      try {
        final res = await dio.post(
          '/auth/refresh',
          data: {'refreshToken': refreshToken},
          options: Options(extra: {'skipAuth': true}),
        );
        final accessToken = res.data['accessToken'] as String;
        await TokenStore.instance.setAccessToken(accessToken);
        return accessToken;
      } catch (_) {
        return null;
      } finally {
        _refreshInFlight = null;
      }
    }();
  }
}
