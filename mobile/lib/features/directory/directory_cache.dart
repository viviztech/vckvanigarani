import 'dart:convert';
import 'package:hive_flutter/hive_flutter.dart';
import 'bearer.dart';

class CachedDirectoryResult {
  CachedDirectoryResult({required this.results, required this.cachedAt});

  final List<DirectoryBearer> results;
  final DateTime cachedAt;
}

/// research.md §6: caches the most recent successful query result set,
/// keyed by the filter used, so a read-only screen still shows something
/// under rural/low-connectivity conditions — not a general offline queue
/// (this feature's mobile slice has no writes).
class DirectoryCache {
  DirectoryCache._();
  static final DirectoryCache instance = DirectoryCache._();

  static const _boxName = 'directory_cache';
  Box<String>? _box;

  Future<void> init() async {
    _box = await Hive.openBox<String>(_boxName);
  }

  Future<void> save(String query, List<DirectoryBearer> results) async {
    final box = _box;
    if (box == null) return;
    final payload = jsonEncode({
      'cachedAt': DateTime.now().toIso8601String(),
      'results': results.map((b) => b.toJson()).toList(),
    });
    await box.put(_keyFor(query), payload);
  }

  CachedDirectoryResult? read(String query) {
    final raw = _box?.get(_keyFor(query));
    if (raw == null) return null;
    final decoded = jsonDecode(raw) as Map<String, dynamic>;
    return CachedDirectoryResult(
      cachedAt: DateTime.parse(decoded['cachedAt'] as String),
      results: (decoded['results'] as List).map((b) => DirectoryBearer.fromJson(b as Map<String, dynamic>)).toList(),
    );
  }

  String _keyFor(String query) => query.trim().toLowerCase();
}
