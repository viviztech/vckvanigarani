import 'package:dio/dio.dart';
import 'api_client.dart';
import 'token_store.dart';

class BearerNotFoundException implements Exception {}

class InvalidOtpException implements Exception {}

class AuthService {
  AuthService(this._api);
  final ApiClient _api;

  Future<void> requestOtp(String email) {
    return _api.dio.post(
      '/auth/otp/request',
      data: {'email': email},
      options: Options(extra: {'skipAuth': true}),
    );
  }

  /// FR-016: rejects with [BearerNotFoundException] if no admin has created
  /// this email address as a bearer yet — there is no sign-up to fall back to.
  Future<void> verifyOtp(String email, String code) async {
    try {
      final res = await _api.dio.post(
        '/auth/otp/verify',
        data: {'email': email, 'code': code},
        options: Options(extra: {'skipAuth': true}),
      );
      await TokenStore.instance.set(
        accessToken: res.data['accessToken'] as String,
        refreshToken: res.data['refreshToken'] as String,
      );
    } on DioException catch (e) {
      if (e.response?.statusCode == 404) throw BearerNotFoundException();
      if (e.response?.statusCode == 401) throw InvalidOtpException();
      rethrow;
    }
  }

  Future<bool> hasStoredSession() async {
    return await TokenStore.instance.accessToken != null;
  }

  Future<void> logOut() => TokenStore.instance.clear();
}
