class DirectoryBearer {
  DirectoryBearer({required this.id, required this.fullName, required this.phone, required this.membershipNo, required this.status});

  factory DirectoryBearer.fromJson(Map<String, dynamic> json) {
    return DirectoryBearer(
      id: json['id'] as String,
      fullName: json['fullName'] as String,
      phone: json['phone'] as String,
      membershipNo: json['membershipNo'] as String,
      status: json['status'] as String,
    );
  }

  Map<String, dynamic> toJson() => {'id': id, 'fullName': fullName, 'phone': phone, 'membershipNo': membershipNo, 'status': status};

  final String id;
  final String fullName;
  final String phone;
  final String membershipNo;
  final String status;
}

class DirectoryAssignment {
  DirectoryAssignment({
    required this.postName,
    required this.jurisdictionNames,
    required this.status,
    required this.startDate,
    this.endDate,
  });

  factory DirectoryAssignment.fromJson(Map<String, dynamic> json) {
    final jurisdictions = (json['jurisdictions'] as List).map((j) => (j['jurisdictionUnit']['name'] as String)).toList();
    return DirectoryAssignment(
      postName: (json['post']?['name'] as String?) ?? 'Unknown post',
      jurisdictionNames: jurisdictions,
      status: json['status'] as String,
      startDate: DateTime.parse(json['startDate'] as String),
      endDate: json['endDate'] == null ? null : DateTime.parse(json['endDate'] as String),
    );
  }

  final String postName;
  final List<String> jurisdictionNames;
  final String status;
  final DateTime startDate;
  final DateTime? endDate;
}

class DirectoryBearerDetail extends DirectoryBearer {
  DirectoryBearerDetail({
    required super.id,
    required super.fullName,
    required super.phone,
    required super.membershipNo,
    required super.status,
    required this.assignments,
  });

  factory DirectoryBearerDetail.fromJson(Map<String, dynamic> json) {
    return DirectoryBearerDetail(
      id: json['id'] as String,
      fullName: json['fullName'] as String,
      phone: json['phone'] as String,
      membershipNo: json['membershipNo'] as String,
      status: json['status'] as String,
      assignments: (json['assignments'] as List).map((a) => DirectoryAssignment.fromJson(a as Map<String, dynamic>)).toList(),
    );
  }

  final List<DirectoryAssignment> assignments;
}
