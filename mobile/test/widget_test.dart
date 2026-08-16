import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:flutter_test/flutter_test.dart';

import 'package:mobile/features/auth/login_screen.dart';

void main() {
  testWidgets('Login screen starts on the phone step with Send code disabled', (tester) async {
    await tester.pumpWidget(
      const ProviderScope(
        child: MaterialApp(home: LoginScreen()),
      ),
    );

    expect(find.text('Vanigar Ani'), findsOneWidget);
    expect(find.widgetWithText(TextField, 'Phone number'), findsOneWidget);

    final sendCodeButton = tester.widget<FilledButton>(find.widgetWithText(FilledButton, 'Send code'));
    expect(sendCodeButton.onPressed, isNull); // empty phone field — button starts disabled

    await tester.enterText(find.widgetWithText(TextField, 'Phone number'), '+919000000000');
    await tester.pump();

    final enabledButton = tester.widget<FilledButton>(find.widgetWithText(FilledButton, 'Send code'));
    expect(enabledButton.onPressed, isNotNull);
  });
}
