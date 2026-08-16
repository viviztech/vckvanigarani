import 'package:flutter_riverpod/flutter_riverpod.dart';
import '../../services/api_client.dart';
import '../../services/auth_service.dart';

final authServiceProvider = Provider<AuthService>((ref) => AuthService(ApiClient.instance));

/// null = still checking stored credentials, true/false once known.
class AuthNotifier extends StateNotifier<bool?> {
  AuthNotifier(this._authService) : super(null) {
    ApiClient.instance.onSessionExpired = () => state = false;
    _checkStoredSession();
  }

  final AuthService _authService;

  Future<void> _checkStoredSession() async {
    state = await _authService.hasStoredSession();
  }

  void markLoggedIn() => state = true;

  Future<void> logOut() async {
    await _authService.logOut();
    state = false;
  }
}

final authStateProvider = StateNotifierProvider<AuthNotifier, bool?>(
  (ref) => AuthNotifier(ref.read(authServiceProvider)),
);
