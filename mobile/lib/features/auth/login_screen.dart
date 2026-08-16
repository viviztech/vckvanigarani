import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import '../../services/auth_service.dart';
import 'auth_state.dart';

enum _Step { phone, code }

class LoginScreen extends ConsumerStatefulWidget {
  const LoginScreen({super.key});

  @override
  ConsumerState<LoginScreen> createState() => _LoginScreenState();
}

class _LoginScreenState extends ConsumerState<LoginScreen> {
  final _phoneController = TextEditingController();
  final _codeController = TextEditingController();
  _Step _step = _Step.phone;
  String? _error;
  bool _busy = false;

  @override
  void dispose() {
    _phoneController.dispose();
    _codeController.dispose();
    super.dispose();
  }

  Future<void> _requestOtp() async {
    setState(() {
      _busy = true;
      _error = null;
    });
    try {
      await ref.read(authServiceProvider).requestOtp(_phoneController.text.trim());
      setState(() => _step = _Step.code);
    } catch (_) {
      setState(() => _error = 'Could not reach the server. Check your connection and try again.');
    } finally {
      setState(() => _busy = false);
    }
  }

  Future<void> _verifyOtp() async {
    setState(() {
      _busy = true;
      _error = null;
    });
    try {
      await ref.read(authServiceProvider).verifyOtp(_phoneController.text.trim(), _codeController.text.trim());
      ref.read(authStateProvider.notifier).markLoggedIn();
    } on BearerNotFoundException {
      setState(() => _error = 'No account found for this number. Contact your admin to be added.');
    } on InvalidOtpException {
      setState(() => _error = 'Incorrect or expired code.');
    } catch (_) {
      setState(() => _error = 'Something went wrong. Please try again.');
    } finally {
      setState(() => _busy = false);
    }
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      body: Center(
        child: ConstrainedBox(
          constraints: const BoxConstraints(maxWidth: 360),
          child: Padding(
            padding: const EdgeInsets.all(24),
            child: Column(
              mainAxisSize: MainAxisSize.min,
              crossAxisAlignment: CrossAxisAlignment.stretch,
              children: [
                Text('Vanigar Ani', style: Theme.of(context).textTheme.headlineSmall),
                const SizedBox(height: 24),
                if (_step == _Step.phone) ..._phoneStep() else ..._codeStep(),
                if (_error != null) ...[
                  const SizedBox(height: 12),
                  Text(_error!, style: const TextStyle(color: Colors.red)),
                ],
              ],
            ),
          ),
        ),
      ),
    );
  }

  List<Widget> _phoneStep() {
    return [
      TextField(
        controller: _phoneController,
        keyboardType: TextInputType.phone,
        decoration: const InputDecoration(labelText: 'Phone number', hintText: '+91XXXXXXXXXX'),
        onChanged: (_) => setState(() {}),
      ),
      const SizedBox(height: 16),
      FilledButton(
        onPressed: _busy || _phoneController.text.trim().isEmpty ? null : _requestOtp,
        child: const Text('Send code'),
      ),
    ];
  }

  List<Widget> _codeStep() {
    return [
      Text('Code sent to ${_phoneController.text.trim()}'),
      const SizedBox(height: 12),
      TextField(
        controller: _codeController,
        keyboardType: TextInputType.number,
        maxLength: 6,
        decoration: const InputDecoration(labelText: '6-digit code'),
        onChanged: (_) => setState(() {}),
      ),
      const SizedBox(height: 16),
      FilledButton(
        onPressed: _busy || _codeController.text.trim().length != 6 ? null : _verifyOtp,
        child: const Text('Log in'),
      ),
      TextButton(
        onPressed: _busy ? null : () => setState(() => _step = _Step.phone),
        child: const Text('Back'),
      ),
    ];
  }
}
