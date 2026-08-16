import 'package:flutter_riverpod/flutter_riverpod.dart';
import '../../services/api_client.dart';
import 'news_post.dart';
import 'news_service.dart';

final newsServiceProvider = Provider<NewsService>((ref) => NewsService(ApiClient.instance));

class FeedState {
  const FeedState({this.items = const [], this.nextCursor, this.loading = false, this.error});
  final List<NewsPost> items;
  final String? nextCursor;
  final bool loading;
  final String? error;

  FeedState copyWith({List<NewsPost>? items, String? nextCursor, bool? loading, String? error}) {
    return FeedState(items: items ?? this.items, nextCursor: nextCursor ?? this.nextCursor, loading: loading ?? this.loading, error: error);
  }
}

class FeedController extends StateNotifier<FeedState> {
  FeedController(this._service) : super(const FeedState()) {
    refresh();
  }
  final NewsService _service;

  Future<void> refresh() async {
    state = state.copyWith(loading: true, error: null);
    try {
      final page = await _service.feed();
      state = FeedState(items: page.items, nextCursor: page.nextCursor);
    } catch (_) {
      state = state.copyWith(loading: false, error: 'Could not load the feed. Check your connection.');
    }
  }

  Future<void> loadMore() async {
    if (state.loading || state.nextCursor == null) return;
    state = state.copyWith(loading: true);
    try {
      final page = await _service.feed(cursor: state.nextCursor);
      state = state.copyWith(items: [...state.items, ...page.items], nextCursor: page.nextCursor, loading: false);
    } catch (_) {
      state = state.copyWith(loading: false);
    }
  }
}

final feedControllerProvider = StateNotifierProvider<FeedController, FeedState>(
  (ref) => FeedController(ref.read(newsServiceProvider)),
);

final newsPostProvider = FutureProvider.autoDispose.family<NewsPost, String>((ref, id) {
  return ref.watch(newsServiceProvider).getOne(id);
});
