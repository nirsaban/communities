import { parseTtlToSeconds } from '../../src/services/token.service';

describe('parseTtlToSeconds', () => {
  it('parses ms / s / m / h / d', () => {
    expect(parseTtlToSeconds('500ms')).toBe(0);
    expect(parseTtlToSeconds('45s')).toBe(45);
    expect(parseTtlToSeconds('15m')).toBe(900);
    expect(parseTtlToSeconds('2h')).toBe(7200);
    expect(parseTtlToSeconds('30d')).toBe(2_592_000);
  });

  it('accepts plain numbers as seconds', () => {
    expect(parseTtlToSeconds('120')).toBe(120);
  });

  it('throws on garbage', () => {
    expect(() => parseTtlToSeconds('foo')).toThrow();
  });
});
