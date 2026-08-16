import 'package:flutter_riverpod/flutter_riverpod.dart';
import '../../services/api_client.dart';
import 'bearer.dart';
import 'directory_cache.dart';
import 'directory_service.dart';

final directoryServiceProvider = Provider<DirectoryService>((ref) => DirectoryService(ApiClient.instance));

class DirectoryState {
  const DirectoryState({
    this.query = '',
    this.results = const [],
    this.loading = false,
    this.isFromCache = false,
    this.cachedAt,
    this.error,
  });

  final String query;
  final List<DirectoryBearer> results;
  final bool loading;
  final bool isFromCache;
  final DateTime? cachedAt;
  final String? error;

  DirectoryState copyWith({
    String? query,
    List<DirectoryBearer>? results,
    bool? loading,
    bool? isFromCache,
    DateTime? cachedAt,
    String? error,
  }) {
    return DirectoryState(
      query: query ?? this.query,
      results: results ?? this.results,
      loading: loading ?? this.loading,
      isFromCache: isFromCache ?? false,
      cachedAt: cachedAt ?? this.cachedAt,
      error: error,
    );
  }
}

/// research.md §6: tries the live search first; on failure (offline, most
/// often) falls back to the last cached result set for the same query and
/// surfaces its age, rather than just failing outright.
class DirectoryController extends StateNotifier<DirectoryState> {
  DirectoryController(this._service) : super(const DirectoryState());
  final DirectoryService _service;

  Future<void> search(String query) async {
    state = state.copyWith(query: query, loading: true, error: null);
    try {
      final results = await _service.search(query);
      await DirectoryCache.instance.save(query, results);
      state = DirectoryState(query: query, results: results, isFromCache: false);
    } catch (_) {
      final cached = DirectoryCache.instance.read(query);
      if (cached != null) {
        state = DirectoryState(query: query, results: cached.results, isFromCache: true, cachedAt: cached.cachedAt);
      } else {
        state = DirectoryState(query: query, error: 'Could not reach the server, and no cached results for this search.');
      }
    }
  }
}

final directoryControllerProvider = StateNotifierProvider<DirectoryController, DirectoryState>(
  (ref) => DirectoryController(ref.read(directoryServiceProvider)),
);
