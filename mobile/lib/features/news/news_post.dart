class NewsPost {
  NewsPost({
    required this.id,
    required this.title,
    required this.bodyHtml,
    required this.targetEveryone,
    required this.status,
    required this.publishedAt,
    required this.deepLinkSlug,
  });

  factory NewsPost.fromJson(Map<String, dynamic> json) {
    return NewsPost(
      id: json['id'] as String,
      title: json['title'] as String,
      bodyHtml: json['bodyHtml'] as String,
      targetEveryone: json['targetEveryone'] as bool,
      status: json['status'] as String,
      publishedAt: json['publishedAt'] == null ? null : DateTime.parse(json['publishedAt'] as String),
      deepLinkSlug: json['deepLinkSlug'] as String,
    );
  }

  final String id;
  final String title;
  final String bodyHtml;
  final bool targetEveryone;
  final String status;
  final DateTime? publishedAt;
  final String deepLinkSlug;
}
