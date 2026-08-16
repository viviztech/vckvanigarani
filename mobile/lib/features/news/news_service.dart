import '../../services/api_client.dart';
import 'news_post.dart';

class FeedPage {
  FeedPage({required this.items, required this.nextCursor});
  final List<NewsPost> items;
  final String? nextCursor;
}

class NewsService {
  NewsService(this._api);
  final ApiClient _api;

  /// FR-006: live per bearer — the backend re-evaluates against the
  /// caller's current assignments on every call, not a cached snapshot.
  Future<FeedPage> feed({String? cursor}) async {
    final res = await _api.dio.get('/news/feed', queryParameters: cursor == null ? null : {'cursor': cursor});
    final data = res.data as Map<String, dynamic>;
    return FeedPage(
      items: (data['items'] as List).map((p) => NewsPost.fromJson(p as Map<String, dynamic>)).toList(),
      nextCursor: data['nextCursor'] as String?,
    );
  }

  Future<NewsPost> getOne(String id) async {
    final res = await _api.dio.get('/news/$id');
    return NewsPost.fromJson(res.data as Map<String, dynamic>);
  }
}
