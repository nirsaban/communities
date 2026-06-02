import 'package:community_app/commons.dart';
import 'package:community_app/shared/widgets/password_strength_meter.dart';
import 'package:flutter/material.dart';
import 'package:flutter_test/flutter_test.dart';

Widget _harness(Widget child) {
  return MaterialApp(
    theme: AppTheme.light(),
    home: Directionality(
      textDirection: TextDirection.rtl,
      child: Scaffold(body: Padding(padding: const EdgeInsets.all(16), child: child)),
    ),
  );
}

void main() {
  group('PasswordStrengthMeter', () {
    test('scoreOf reflects length + class diversity', () {
      expect(PasswordStrengthMeter.scoreOf(''), 0);
      expect(PasswordStrengthMeter.scoreOf('aaaaaaaa'), 1); // length>=8, 1 class
      expect(PasswordStrengthMeter.scoreOf('aaaaaaaa1'), 2); // 2 classes
      expect(PasswordStrengthMeter.scoreOf('Aaaaaaaa1'), 3); // 3 classes
      expect(PasswordStrengthMeter.scoreOf('Aaaaaaaa1!@'), 3); // 11 chars + 4 classes
      expect(PasswordStrengthMeter.scoreOf('AaaaaaaaaaA1!@'), 4); // 14 chars + 4 classes
    });

    testWidgets('renders empty when password is empty', (tester) async {
      await tester.pumpWidget(_harness(const PasswordStrengthMeter(password: '')));
      // No strength label shown for empty password.
      expect(find.text('חלשה'), findsNothing);
      expect(find.text('חזקה'), findsNothing);
    });

    testWidgets('renders Hebrew label "חזקה" for strong password', (tester) async {
      await tester.pumpWidget(_harness(
        const PasswordStrengthMeter(password: 'AaaaaaaaaaaA1!@'),
      ));
      expect(find.text('חזקה'), findsOneWidget);
    });
  });
}
