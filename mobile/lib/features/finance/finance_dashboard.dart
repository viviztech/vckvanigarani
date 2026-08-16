class DashboardBearer {
  DashboardBearer({required this.id, required this.fullName, required this.phone, required this.membershipNo});

  factory DashboardBearer.fromJson(Map<String, dynamic> json) {
    return DashboardBearer(
      id: json['id'] as String,
      fullName: json['fullName'] as String,
      phone: json['phone'] as String,
      membershipNo: json['membershipNo'] as String,
    );
  }

  final String id;
  final String fullName;
  final String phone;
  final String membershipNo;
}

class DashboardByPost {
  DashboardByPost({required this.postId, required this.postName, required this.totalAmount, required this.contributorCount});

  factory DashboardByPost.fromJson(Map<String, dynamic> json) {
    return DashboardByPost(
      postId: json['postId'] as String,
      postName: json['postName'] as String,
      totalAmount: json['totalAmount'] as num,
      contributorCount: json['contributorCount'] as int,
    );
  }

  final String postId;
  final String postName;
  final num totalAmount;
  final int contributorCount;
}

/// FR-009/FR-010: mirrors admin-web's EventDashboard.tsx — totals computed
/// live from the ledger server-side, nothing here is a stored/editable
/// figure this client could tamper with.
class EventDashboard {
  EventDashboard({required this.raised, required this.target, required this.byPost, required this.paid, required this.unpaid});

  factory EventDashboard.fromJson(Map<String, dynamic> json) {
    return EventDashboard(
      raised: json['raised'] as num,
      target: json['target'] as num?,
      byPost: (json['byPost'] as List).map((e) => DashboardByPost.fromJson(e as Map<String, dynamic>)).toList(),
      paid: (json['paid'] as List).map((e) => DashboardBearer.fromJson(e as Map<String, dynamic>)).toList(),
      unpaid: (json['unpaid'] as List).map((e) => DashboardBearer.fromJson(e as Map<String, dynamic>)).toList(),
    );
  }

  final num raised;
  final num? target;
  final List<DashboardByPost> byPost;
  final List<DashboardBearer> paid;
  final List<DashboardBearer> unpaid;
}
