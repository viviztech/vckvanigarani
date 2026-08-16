import 'package:flutter_riverpod/flutter_riverpod.dart';
import '../../services/api_client.dart';
import 'finance_dashboard.dart';
import 'finance_service.dart';

final financeServiceProvider = Provider<FinanceService>((ref) => FinanceService(ApiClient.instance));

final selectedFinanceEventIdProvider = StateProvider<String?>((ref) => null);

final financeDashboardProvider = FutureProvider.autoDispose.family<EventDashboard, String>((ref, eventId) {
  return ref.watch(financeServiceProvider).fetchDashboard(eventId);
});
