import 'package:flutter_riverpod/flutter_riverpod.dart';
import '../../services/api_client.dart';
import 'event.dart';
import 'events_service.dart';

final eventsServiceProvider = Provider<EventsService>((ref) => EventsService(ApiClient.instance));

final eventsListProvider = FutureProvider.autoDispose<List<Event>>((ref) {
  return ref.watch(eventsServiceProvider).listEvents();
});

/// T031: re-fetching this (pull-to-refresh or the explicit "Refresh status"
/// button) is the manual backstop alongside the automatic reconciliation
/// job — a bearer who closes the app mid-payment still gets reconciled by
/// the job either way, this just lets them see it sooner.
final myContributionsProvider = FutureProvider.autoDispose<List<Contribution>>((ref) {
  return ref.watch(eventsServiceProvider).listMyContributions();
});
