import 'dart:io' show Platform;
import 'package:flutter/foundation.dart' show kIsWeb;

/// Backend base URL. `localhost` works for web (Chrome) and for an Android
/// emulator can't reach the host machine's localhost directly — it needs
/// `10.0.2.2`, the emulator's alias for the host loopback interface. A real
/// device needs the host's LAN IP instead; override via
/// `--dart-define=API_BASE_URL=http://<lan-ip>:3000` when running on one.
String get apiBaseUrl {
  const override = String.fromEnvironment('API_BASE_URL');
  if (override.isNotEmpty) return override;
  if (!kIsWeb && Platform.isAndroid) return 'http://10.0.2.2:3000';
  return 'http://localhost:3000';
}
