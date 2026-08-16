import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:hive_flutter/hive_flutter.dart';
import 'features/auth/auth_state.dart';
import 'features/auth/login_screen.dart';
import 'features/directory/directory_cache.dart';
import 'features/directory/directory_screen.dart';
import 'features/events/events_list_screen.dart';
import 'features/events/my_contributions_screen.dart';
import 'features/finance/finance_screen.dart';
import 'features/news/news_feed_screen.dart';

Future<void> main() async {
  WidgetsFlutterBinding.ensureInitialized();
  await Hive.initFlutter();
  await DirectoryCache.instance.init();
  runApp(const ProviderScope(child: VanigarAniApp()));
}

class VanigarAniApp extends StatelessWidget {
  const VanigarAniApp({super.key});

  @override
  Widget build(BuildContext context) {
    return MaterialApp(
      title: 'Vanigar Ani',
      theme: ThemeData(colorSchemeSeed: const Color(0xFF2F6F9E), useMaterial3: true),
      home: const _RootGate(),
    );
  }
}

/// Shows a splash while checking for a stored session, then routes to the
/// login screen or the signed-in home screen — no self-registration path
/// exists in either state (Constitution Principle V).
class _RootGate extends ConsumerWidget {
  const _RootGate();

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final loggedIn = ref.watch(authStateProvider);

    if (loggedIn == null) {
      return const Scaffold(body: Center(child: CircularProgressIndicator()));
    }
    if (loggedIn == false) {
      return const LoginScreen();
    }
    return const _HomeScreen();
  }
}

class _HomeScreen extends ConsumerStatefulWidget {
  const _HomeScreen();

  @override
  ConsumerState<_HomeScreen> createState() => _HomeScreenState();
}

class _HomeScreenState extends ConsumerState<_HomeScreen> {
  int _tab = 0;

  static const _screens = [NewsFeedScreen(), DirectoryScreen(), EventsListScreen(), MyContributionsScreen(), FinanceScreen()];

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      floatingActionButton: FloatingActionButton.small(
        tooltip: 'Log out',
        onPressed: () => ref.read(authStateProvider.notifier).logOut(),
        child: const Icon(Icons.logout),
      ),
      body: IndexedStack(index: _tab, children: _screens),
      bottomNavigationBar: NavigationBar(
        selectedIndex: _tab,
        onDestinationSelected: (index) => setState(() => _tab = index),
        destinations: const [
          NavigationDestination(icon: Icon(Icons.newspaper), label: 'News'),
          NavigationDestination(icon: Icon(Icons.people), label: 'Directory'),
          NavigationDestination(icon: Icon(Icons.event), label: 'Events'),
          NavigationDestination(icon: Icon(Icons.receipt_long), label: 'My contributions'),
          NavigationDestination(icon: Icon(Icons.account_balance_wallet), label: 'Finance'),
        ],
      ),
    );
  }
}
