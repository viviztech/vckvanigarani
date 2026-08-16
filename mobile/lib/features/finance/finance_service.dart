import 'package:dio/dio.dart';
import '../../services/api_client.dart';
import 'finance_dashboard.dart';

/// FR-011: thrown when the caller holds no active FINANCE_VIEW-capable
/// Assignment (and no AdminScope) for any jurisdiction — distinct from a
/// plain network/server error so the UI can show a clear explanation
/// instead of a generic failure state.
class NoFinanceAccessException implements Exception {}

class FinanceService {
  FinanceService(this._api);
  final ApiClient _api;

  Future<EventDashboard> fetchDashboard(String eventId) async {
    try {
      final res = await _api.dio.get('/events/$eventId/dashboard');
      return EventDashboard.fromJson(res.data as Map<String, dynamic>);
    } on DioException catch (e) {
      if (e.response?.statusCode == 403) throw NoFinanceAccessException();
      rethrow;
    }
  }
}
