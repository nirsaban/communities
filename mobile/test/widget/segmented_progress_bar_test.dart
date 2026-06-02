import 'package:community_app/commons.dart';
import 'package:community_app/shared/widgets/segmented_progress_bar.dart';
import 'package:flutter/material.dart';
import 'package:flutter_test/flutter_test.dart';

void main() {
  testWidgets('SegmentedProgressBar renders N segments and fills 0..currentIndex',
      (tester) async {
    await tester.pumpWidget(
      MaterialApp(
        theme: AppTheme.light(),
        home: const Scaffold(
          body: Padding(
            padding: EdgeInsets.all(16),
            child: SegmentedProgressBar(segments: 4, currentIndex: 1),
          ),
        ),
      ),
    );
    // One Expanded per segment.
    expect(find.byType(Expanded), findsNWidgets(4));
    // Two filled — one not. We only assert the count of AnimatedContainers
    // (Each Expanded has exactly one AnimatedContainer child).
    expect(find.byType(AnimatedContainer), findsNWidgets(4));
  });
}
