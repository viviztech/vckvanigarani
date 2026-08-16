import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'event.dart';
import 'events_providers.dart';

class MyContributionsScreen extends ConsumerWidget {
  const MyContributionsScreen({super.key});

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final contributionsAsync = ref.watch(myContributionsProvider);

    return Scaffold(
      appBar: AppBar(
        title: const Text('My contributions'),
        actions: [
          // T031: manual "refresh my payment status" backstop — the
          // automatic reconciliation job (research.md §3) is what actually
          // guarantees a stuck PENDING gets resolved; this just lets a
          // bearer confirm it sooner without waiting on the job's cadence.
          IconButton(
            tooltip: 'Refresh payment status',
            icon: const Icon(Icons.refresh),
            onPressed: () => ref.invalidate(myContributionsProvider),
          ),
        ],
      ),
      body: contributionsAsync.when(
        loading: () => const Center(child: CircularProgressIndicator()),
        error: (_, _) => Center(
          child: Column(
            mainAxisSize: MainAxisSize.min,
            children: [
              const Text('Could not load your contributions.'),
              const SizedBox(height: 12),
              FilledButton(
                onPressed: () => ref.invalidate(myContributionsProvider),
                child: const Text('Retry'),
              ),
            ],
          ),
        ),
        data: (contributions) {
          if (contributions.isEmpty) {
            return const Center(child: Text('No contributions yet.'));
          }
          return RefreshIndicator(
            onRefresh: () => ref.refresh(myContributionsProvider.future),
            child: ListView.builder(
              itemCount: contributions.length,
              itemBuilder: (context, index) => _ContributionTile(contribution: contributions[index]),
            ),
          );
        },
      ),
    );
  }
}

class _ContributionTile extends StatelessWidget {
  const _ContributionTile({required this.contribution});
  final Contribution contribution;

  @override
  Widget build(BuildContext context) {
    return ListTile(
      title: Text(contribution.eventTitle),
      subtitle: Text('₹${contribution.amount}'),
      trailing: _StatusChip(status: contribution.status),
    );
  }
}

class _StatusChip extends StatelessWidget {
  const _StatusChip({required this.status});
  final String status;

  @override
  Widget build(BuildContext context) {
    final (label, color) = switch (status) {
      'VERIFIED' => ('Verified', Colors.green),
      'FAILED' => ('Failed', Colors.red),
      _ => ('Pending', Colors.orange),
    };
    return Chip(
      label: Text(label),
      backgroundColor: color.withValues(alpha: 0.15),
      labelStyle: TextStyle(color: color),
      side: BorderSide.none,
    );
  }
}
