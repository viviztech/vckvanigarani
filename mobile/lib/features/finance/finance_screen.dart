import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import '../events/event.dart';
import '../events/events_providers.dart';
import 'finance_dashboard.dart';
import 'finance_providers.dart';
import 'finance_service.dart';

/// FR-009/FR-011 read-only view for bearers holding a FINANCE_VIEW-capable
/// post — same data as admin-web's EventDashboard.tsx, without the CSV
/// export (FR-013 keeps that admin-only).
class FinanceScreen extends ConsumerWidget {
  const FinanceScreen({super.key});

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final eventsAsync = ref.watch(eventsListProvider);
    final selectedEventId = ref.watch(selectedFinanceEventIdProvider);

    return Scaffold(
      appBar: AppBar(title: const Text('Finance')),
      body: eventsAsync.when(
        loading: () => const Center(child: CircularProgressIndicator()),
        error: (_, _) => const Center(child: Text('Could not load events.')),
        data: (events) {
          if (events.isEmpty) {
            return const Center(child: Text('No events for your jurisdiction yet.'));
          }
          return ListView(
            padding: const EdgeInsets.all(16),
            children: [
              _EventPicker(events: events, selectedId: selectedEventId),
              const SizedBox(height: 16),
              if (selectedEventId != null) _DashboardView(eventId: selectedEventId),
            ],
          );
        },
      ),
    );
  }
}

class _EventPicker extends ConsumerWidget {
  const _EventPicker({required this.events, required this.selectedId});
  final List<Event> events;
  final String? selectedId;

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    return DropdownButtonFormField<String>(
      initialValue: selectedId,
      decoration: const InputDecoration(labelText: 'Event', border: OutlineInputBorder()),
      items: events
          .map((e) => DropdownMenuItem(value: e.id, child: Text('${e.title} (${e.status})', overflow: TextOverflow.ellipsis)))
          .toList(),
      onChanged: (value) => ref.read(selectedFinanceEventIdProvider.notifier).state = value,
    );
  }
}

class _DashboardView extends ConsumerWidget {
  const _DashboardView({required this.eventId});
  final String eventId;

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final dashboardAsync = ref.watch(financeDashboardProvider(eventId));

    return dashboardAsync.when(
      loading: () => const Padding(padding: EdgeInsets.only(top: 24), child: Center(child: CircularProgressIndicator())),
      error: (err, _) => Padding(
        padding: const EdgeInsets.only(top: 24),
        child: Center(
          child: Text(
            err is NoFinanceAccessException
                ? "You don't have finance access for this jurisdiction."
                : 'Could not load the dashboard.',
            textAlign: TextAlign.center,
          ),
        ),
      ),
      data: (dashboard) => _DashboardBody(dashboard: dashboard),
    );
  }
}

class _DashboardBody extends StatelessWidget {
  const _DashboardBody({required this.dashboard});
  final EventDashboard dashboard;

  @override
  Widget build(BuildContext context) {
    return Column(
      crossAxisAlignment: CrossAxisAlignment.stretch,
      children: [
        Row(
          children: [
            Expanded(child: _StatCard(label: 'Raised', value: '₹${dashboard.raised}')),
            const SizedBox(width: 12),
            Expanded(child: _StatCard(label: 'Target', value: dashboard.target != null ? '₹${dashboard.target}' : '—')),
          ],
        ),
        const SizedBox(height: 16),
        Text('By post', style: Theme.of(context).textTheme.titleMedium),
        const SizedBox(height: 8),
        if (dashboard.byPost.isEmpty)
          const Text('No verified contributions yet.')
        else
          ...dashboard.byPost.map(
            (row) => ListTile(
              contentPadding: EdgeInsets.zero,
              title: Text(row.postName),
              subtitle: Text('${row.contributorCount} contributor${row.contributorCount == 1 ? '' : 's'}'),
              trailing: Text('₹${row.totalAmount}'),
            ),
          ),
        const SizedBox(height: 16),
        Text('Paid (${dashboard.paid.length}) / Unpaid (${dashboard.unpaid.length})', style: Theme.of(context).textTheme.titleMedium),
        const SizedBox(height: 8),
        ...dashboard.paid.map((b) => _BearerTile(bearer: b, paid: true)),
        ...dashboard.unpaid.map((b) => _BearerTile(bearer: b, paid: false)),
      ],
    );
  }
}

class _StatCard extends StatelessWidget {
  const _StatCard({required this.label, required this.value});
  final String label;
  final String value;

  @override
  Widget build(BuildContext context) {
    return Card(
      child: Padding(
        padding: const EdgeInsets.all(16),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Text(label, style: Theme.of(context).textTheme.labelMedium),
            const SizedBox(height: 4),
            Text(value, style: Theme.of(context).textTheme.headlineSmall),
          ],
        ),
      ),
    );
  }
}

class _BearerTile extends StatelessWidget {
  const _BearerTile({required this.bearer, required this.paid});
  final DashboardBearer bearer;
  final bool paid;

  @override
  Widget build(BuildContext context) {
    return ListTile(
      contentPadding: EdgeInsets.zero,
      title: Text(bearer.fullName),
      subtitle: Text(bearer.phone),
      trailing: Chip(
        label: Text(paid ? 'Paid' : 'Unpaid'),
        backgroundColor: (paid ? Colors.green : Colors.grey).withValues(alpha: 0.15),
        labelStyle: TextStyle(color: paid ? Colors.green : Colors.grey.shade700),
        side: BorderSide.none,
      ),
    );
  }
}
