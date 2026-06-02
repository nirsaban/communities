/// ILS-only currency helpers. The backend stores money in agorot (integer cents);
/// the mobile UI never multiplies/divides by 100 inline — always go through here.
///
/// Examples:
///   formatILS(0)      → '₪0'
///   formatILS(4900)   → '₪49'
///   formatILS(4950)   → '₪49.50'
///   formatILS(123456) → '₪1,234.56'
library;

String formatILS(int agorot) {
  final shekels = agorot ~/ 100;
  final remainder = agorot.remainder(100).abs();
  final whole = _withThousandsSep(shekels);
  if (remainder == 0) {
    return '₪$whole';
  }
  final cents = remainder.toString().padLeft(2, '0');
  return '₪$whole.$cents';
}

/// Optional "12 תשלומים של ₪X" line for installment plans. Returns null if the
/// plan is a single payment (so callers can hide the field cleanly).
String? formatInstallments({required int totalAgorot, required int installments}) {
  if (installments <= 1 || totalAgorot <= 0) return null;
  final perPayment = (totalAgorot / installments).round();
  return '$installments תשלומים של ${formatILS(perPayment)}';
}

String _withThousandsSep(int n) {
  final s = n.abs().toString();
  final buf = StringBuffer();
  for (var i = 0; i < s.length; i++) {
    if (i > 0 && (s.length - i) % 3 == 0) buf.write(',');
    buf.write(s[i]);
  }
  return n < 0 ? '-${buf.toString()}' : buf.toString();
}
