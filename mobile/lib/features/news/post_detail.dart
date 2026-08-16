import 'package:flutter/material.dart';
import 'package:flutter_html/flutter_html.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:share_plus/share_plus.dart';
import 'news_post.dart';
import 'news_providers.dart';

/// research.md §5: `vanigarani://news/:id` deep link — no web fallback host
/// is deployed yet, so the link is app-scheme-only for now.
String deepLinkFor(NewsPost post) => 'vanigarani://news/${post.id}';

class PostDetailScreen extends ConsumerWidget {
  const PostDetailScreen({super.key, required this.postId});
  final String postId;

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final postAsync = ref.watch(newsPostProvider(postId));

    return Scaffold(
      appBar: AppBar(
        title: const Text('Post'),
        actions: [
          postAsync.maybeWhen(
            data: (post) => IconButton(
              tooltip: 'Share',
              icon: const Icon(Icons.share),
              onPressed: () => _share(post),
            ),
            orElse: () => const SizedBox.shrink(),
          ),
        ],
      ),
      body: postAsync.when(
        loading: () => const Center(child: CircularProgressIndicator()),
        error: (_, _) => const Center(child: Text('This post is no longer available to you.')),
        data: (post) => ListView(
          padding: const EdgeInsets.all(16),
          children: [
            Text(post.title, style: Theme.of(context).textTheme.headlineSmall),
            const SizedBox(height: 12),
            Html(data: post.bodyHtml),
          ],
        ),
      ),
    );
  }

  /// FR-007/SC-005: one tap opens the OS native share sheet with the
  /// title and deep link — no in-app share UI to build.
  void _share(NewsPost post) {
    SharePlus.instance.share(ShareParams(text: '${post.title}\n\n${deepLinkFor(post)}', title: post.title));
  }
}
