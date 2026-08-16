import 'package:flutter_secure_storage/flutter_secure_storage.dart';

/// Tokens live in the platform keychain/keystore (not shared_preferences) —
/// same role as admin-web's token-store.ts, different backing storage since
/// this is a mobile app.
class TokenStore {
  TokenStore._();
  static final TokenStore instance = TokenStore._();

  final _storage = const FlutterSecureStorage();
  static const _accessKey = 'vanigarani.accessToken';
  static const _refreshKey = 'vanigarani.refreshToken';

  Future<String?> get accessToken => _storage.read(key: _accessKey);
  Future<String?> get refreshToken => _storage.read(key: _refreshKey);

  Future<void> set({required String accessToken, required String refreshToken}) async {
    await _storage.write(key: _accessKey, value: accessToken);
    await _storage.write(key: _refreshKey, value: refreshToken);
  }

  Future<void> setAccessToken(String accessToken) => _storage.write(key: _accessKey, value: accessToken);

  Future<void> clear() async {
    await _storage.delete(key: _accessKey);
    await _storage.delete(key: _refreshKey);
  }
}
