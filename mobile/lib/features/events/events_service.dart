import 'package:dio/dio.dart';
import '../../services/api_client.dart';
import 'event.dart';

class EventClosedException implements Exception {}

class PayOrder {
  PayOrder({
    required this.contributionId,
    required this.gatewayOrderId,
    required this.amount,
    required this.currency,
    required this.keyId,
  });

  factory PayOrder.fromJson(Map<String, dynamic> json) {
    return PayOrder(
      contributionId: json['contributionId'] as String,
      gatewayOrderId: json['gatewayOrderId'] as String,
      amount: num.parse(json['amount'].toString()),
      currency: json['currency'] as String,
      keyId: json['keyId'] as String?,
    );
  }

  final String contributionId;
  final String gatewayOrderId;
  final num amount;
  final String currency;
  final String? keyId;
}

class EventsService {
  EventsService(this._api);
  final ApiClient _api;

  Future<List<Event>> listEvents() async {
    final res = await _api.dio.get('/events');
    return (res.data as List).map((e) => Event.fromJson(e as Map<String, dynamic>)).toList();
  }

  /// FR-004/FR-006: server creates the Razorpay Order and a PENDING
  /// Contribution; the checkout SDK never writes anything itself.
  Future<PayOrder> pay(String eventId, num amountRupees) async {
    try {
      final res = await _api.dio.post('/events/$eventId/pay', data: {'amount': amountRupees});
      return PayOrder.fromJson(res.data as Map<String, dynamic>);
    } on DioException catch (e) {
      if (e.response?.statusCode == 409) throw EventClosedException();
      rethrow;
    }
  }

  /// T031 backstop: re-queries current status rather than trusting the
  /// checkout SDK's client-side callback — verification itself only ever
  /// happens server-side (webhook / reconciliation job).
  Future<List<Contribution>> listMyContributions() async {
    final res = await _api.dio.get('/contributions/me');
    return (res.data as List).map((c) => Contribution.fromJson(c as Map<String, dynamic>)).toList();
  }
}
