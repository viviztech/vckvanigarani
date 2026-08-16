class Event {
  Event({
    required this.id,
    required this.title,
    required this.purpose,
    required this.status,
    required this.openDate,
    required this.closeDate,
    this.targetAmount,
    this.bannerUrl,
  });

  factory Event.fromJson(Map<String, dynamic> json) {
    return Event(
      id: json['id'] as String,
      title: json['title'] as String,
      purpose: json['purpose'] as String,
      status: json['status'] as String,
      openDate: DateTime.parse(json['openDate'] as String),
      closeDate: DateTime.parse(json['closeDate'] as String),
      targetAmount: json['targetAmount'] == null ? null : num.parse(json['targetAmount'].toString()),
      bannerUrl: json['bannerUrl'] as String?,
    );
  }

  final String id;
  final String title;
  final String purpose;
  final String status;
  final DateTime openDate;
  final DateTime closeDate;
  final num? targetAmount;
  final String? bannerUrl;

  bool get isOpen => status == 'OPEN' && DateTime.now().isBefore(closeDate);
}

class Contribution {
  Contribution({
    required this.id,
    required this.eventId,
    required this.eventTitle,
    required this.amount,
    required this.status,
    required this.createdAt,
    this.receiptUrl,
    this.verifiedAt,
  });

  factory Contribution.fromJson(Map<String, dynamic> json) {
    final event = json['event'] as Map<String, dynamic>?;
    return Contribution(
      id: json['id'] as String,
      eventId: json['eventId'] as String,
      eventTitle: event?['title'] as String? ?? '',
      amount: num.parse(json['amount'].toString()),
      status: json['status'] as String,
      createdAt: DateTime.parse(json['createdAt'] as String),
      receiptUrl: json['receiptUrl'] as String?,
      verifiedAt: json['verifiedAt'] == null ? null : DateTime.parse(json['verifiedAt'] as String),
    );
  }

  final String id;
  final String eventId;
  final String eventTitle;
  final num amount;
  final String status;
  final DateTime createdAt;
  final String? receiptUrl;
  final DateTime? verifiedAt;
}
