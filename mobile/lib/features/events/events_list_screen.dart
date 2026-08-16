import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:razorpay_flutter/razorpay_flutter.dart';
import 'event.dart';
import 'events_providers.dart';
import 'events_service.dart';

class EventsListScreen extends ConsumerStatefulWidget {
  const EventsListScreen({super.key});

  @override
  ConsumerState<EventsListScreen> createState() => _EventsListScreenState();
}

class _EventsListScreenState extends ConsumerState<EventsListScreen> {
  Razorpay? _razorpay;
  bool _paying = false;

  @override
  void dispose() {
    _razorpay?.clear();
    super.dispose();
  }

  Future<void> _startPay(Event event) async {
    final amount = await _askAmount(event);
    if (amount == null) return;

    setState(() => _paying = true);
    try {
      final order = await ref.read(eventsServiceProvider).pay(event.id, amount);
      _openCheckout(event, order);
    } on EventClosedException {
      _snack('This event is no longer accepting payments.');
    } catch (_) {
      _snack('Could not start payment. Check your connection and try again.');
    } finally {
      if (mounted) setState(() => _paying = false);
    }
  }

  Future<num?> _askAmount(Event event) {
    final controller = TextEditingController(text: event.targetAmount?.toString() ?? '');
    return showDialog<num>(
      context: context,
      builder: (context) => AlertDialog(
        title: Text('Contribute to ${event.title}'),
        content: TextField(
          controller: controller,
          keyboardType: const TextInputType.numberWithOptions(decimal: true),
          autofocus: true,
          decoration: const InputDecoration(labelText: 'Amount (₹)', prefixText: '₹ '),
        ),
        actions: [
          TextButton(onPressed: () => Navigator.pop(context), child: const Text('Cancel')),
          FilledButton(
            onPressed: () {
              final value = num.tryParse(controller.text.trim());
              Navigator.pop(context, value != null && value > 0 ? value : null);
            },
            child: const Text('Pay'),
          ),
        ],
      ),
    );
  }

  /// FR-005/Constitution Principle III: this SDK callback never writes a
  /// Contribution itself — only the signature-verified webhook (or the
  /// reconciliation job) does that. Success here just means checkout
  /// completed; T031's manual refresh is how the bearer confirms it landed.
  void _openCheckout(Event event, PayOrder order) {
    final razorpay = Razorpay();
    _razorpay?.clear();
    _razorpay = razorpay;

    razorpay.on(Razorpay.EVENT_PAYMENT_SUCCESS, (PaymentSuccessResponse _) {
      _snack('Payment submitted — pull to refresh below to confirm it verified.');
      ref.invalidate(myContributionsProvider);
    });
    razorpay.on(Razorpay.EVENT_PAYMENT_ERROR, (PaymentFailureResponse response) {
      _snack('Payment ${response.message ?? 'failed'}.');
    });
    razorpay.on(Razorpay.EVENT_EXTERNAL_WALLET, (ExternalWalletResponse _) {});

    razorpay.open({
      if (order.keyId != null) 'key': order.keyId,
      'order_id': order.gatewayOrderId,
      'amount': (order.amount * 100).round(),
      'currency': order.currency,
      'name': 'Vanigar Ani',
      'description': event.title,
    });
  }

  void _snack(String message) {
    if (!mounted) return;
    ScaffoldMessenger.of(context).showSnackBar(SnackBar(content: Text(message)));
  }

  @override
  Widget build(BuildContext context) {
    final eventsAsync = ref.watch(eventsListProvider);

    return Scaffold(
      appBar: AppBar(title: const Text('Events')),
      body: eventsAsync.when(
        loading: () => const Center(child: CircularProgressIndicator()),
        error: (_, _) => _ErrorState(onRetry: () => ref.invalidate(eventsListProvider)),
        data: (events) {
          if (events.isEmpty) {
            return const Center(child: Text('No events for your jurisdiction yet.'));
          }
          return RefreshIndicator(
            onRefresh: () => ref.refresh(eventsListProvider.future),
            child: ListView.builder(
              itemCount: events.length,
              itemBuilder: (context, index) {
                final event = events[index];
                return ListTile(
                  title: Text(event.title),
                  subtitle: Text(event.purpose),
                  trailing: event.isOpen
                      ? FilledButton(
                          onPressed: _paying ? null : () => _startPay(event),
                          child: const Text('Pay'),
                        )
                      : const Chip(label: Text('Closed')),
                );
              },
            ),
          );
        },
      ),
    );
  }
}

class _ErrorState extends StatelessWidget {
  const _ErrorState({required this.onRetry});
  final VoidCallback onRetry;

  @override
  Widget build(BuildContext context) {
    return Center(
      child: Column(
        mainAxisSize: MainAxisSize.min,
        children: [
          const Text('Could not load events.'),
          const SizedBox(height: 12),
          FilledButton(onPressed: onRetry, child: const Text('Retry')),
        ],
      ),
    );
  }
}
