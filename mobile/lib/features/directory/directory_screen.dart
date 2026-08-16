import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'bearer.dart';
import 'directory_providers.dart';

class DirectoryScreen extends ConsumerStatefulWidget {
  const DirectoryScreen({super.key});

  @override
  ConsumerState<DirectoryScreen> createState() => _DirectoryScreenState();
}

class _DirectoryScreenState extends ConsumerState<DirectoryScreen> {
  final _controller = TextEditingController();

  @override
  void initState() {
    super.initState();
    // Empty query = browse everyone in scope, matching admin-web's default view.
    Future.microtask(() => ref.read(directoryControllerProvider.notifier).search(''));
  }

  @override
  void dispose() {
    _controller.dispose();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
    final state = ref.watch(directoryControllerProvider);

    return Scaffold(
      appBar: AppBar(title: const Text('Directory')),
      body: Column(
        children: [
          Padding(
            padding: const EdgeInsets.all(16),
            child: TextField(
              controller: _controller,
              decoration: const InputDecoration(
                labelText: 'Search by name',
                prefixIcon: Icon(Icons.search),
                border: OutlineInputBorder(),
              ),
              onSubmitted: (value) => ref.read(directoryControllerProvider.notifier).search(value),
            ),
          ),
          if (state.isFromCache)
            Container(
              width: double.infinity,
              color: Theme.of(context).colorScheme.surfaceContainerHighest,
              padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 8),
              child: Text(
                'Offline — showing cached results from ${_formatAge(state.cachedAt!)}',
                style: Theme.of(context).textTheme.bodySmall,
              ),
            ),
          Expanded(child: _buildBody(state)),
        ],
      ),
    );
  }

  Widget _buildBody(DirectoryState state) {
    if (state.loading) return const Center(child: CircularProgressIndicator());
    if (state.error != null) return Center(child: Padding(padding: const EdgeInsets.all(24), child: Text(state.error!, textAlign: TextAlign.center)));
    if (state.results.isEmpty) return const Center(child: Text('No bearers match this search.'));

    return ListView.builder(
      itemCount: state.results.length,
      itemBuilder: (context, index) {
        final bearer = state.results[index];
        return ListTile(
          title: Text(bearer.fullName),
          subtitle: Text(bearer.phone),
          trailing: Chip(
            label: Text(bearer.status),
            backgroundColor: (bearer.status == 'ACTIVE' ? Colors.green : Colors.grey).withValues(alpha: 0.15),
          ),
          onTap: () => _showDetail(bearer),
        );
      },
    );
  }

  void _showDetail(DirectoryBearer bearer) {
    showModalBottomSheet(
      context: context,
      isScrollControlled: true,
      builder: (context) => _BearerDetailSheet(bearerId: bearer.id, fallbackName: bearer.fullName),
    );
  }

  String _formatAge(DateTime cachedAt) {
    final diff = DateTime.now().difference(cachedAt);
    if (diff.inMinutes < 1) return 'just now';
    if (diff.inHours < 1) return '${diff.inMinutes}m ago';
    if (diff.inDays < 1) return '${diff.inHours}h ago';
    return '${diff.inDays}d ago';
  }
}

class _BearerDetailSheet extends ConsumerWidget {
  const _BearerDetailSheet({required this.bearerId, required this.fallbackName});
  final String bearerId;
  final String fallbackName;

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final detailAsync = ref.watch(_bearerDetailProvider(bearerId));

    return DraggableScrollableSheet(
      initialChildSize: 0.6,
      expand: false,
      builder: (context, scrollController) {
        return detailAsync.when(
          loading: () => const Center(child: CircularProgressIndicator()),
          error: (_, _) => const Center(child: Text('Could not load this bearer — try again when online.')),
          data: (detail) => ListView(
            controller: scrollController,
            padding: const EdgeInsets.all(16),
            children: [
              Text(detail.fullName, style: Theme.of(context).textTheme.titleLarge),
              Text(detail.phone, style: Theme.of(context).textTheme.bodyMedium),
              const SizedBox(height: 16),
              Text('Assignment history', style: Theme.of(context).textTheme.titleMedium),
              const SizedBox(height: 8),
              if (detail.assignments.isEmpty) const Text('No assignment history.'),
              ...detail.assignments.map(
                (a) => ListTile(
                  contentPadding: EdgeInsets.zero,
                  title: Text(a.postName),
                  subtitle: Text(a.jurisdictionNames.join(', ')),
                  trailing: Chip(
                    label: Text(a.status),
                    backgroundColor: (a.status == 'ACTIVE' ? Colors.green : Colors.grey).withValues(alpha: 0.15),
                  ),
                ),
              ),
            ],
          ),
        );
      },
    );
  }
}

final _bearerDetailProvider = FutureProvider.autoDispose.family<DirectoryBearerDetail, String>((ref, bearerId) {
  return ref.watch(directoryServiceProvider).getOne(bearerId);
});
