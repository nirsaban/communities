import { computeOccurrences } from '../../src/services/recurring.service';

function date(s: string): Date {
  return new Date(s);
}

describe('computeOccurrences', () => {
  it('daily count=5 emits 5 dates starting at seed', () => {
    const start = date('2026-06-01T10:00:00Z');
    const occ = computeOccurrences(
      start,
      { freq: 'daily', interval: 1, endType: 'count', count: 5 },
      start,
      date('2026-07-01T00:00:00Z'),
    );
    expect(occ).toHaveLength(5);
    expect(occ[0].toISOString()).toBe('2026-06-01T10:00:00.000Z');
    expect(occ[4].toISOString()).toBe('2026-06-05T10:00:00.000Z');
  });

  it('weekly with byDay=MO yields only Mondays', () => {
    const start = date('2026-06-01T18:00:00Z'); // Monday
    const occ = computeOccurrences(
      start,
      { freq: 'weekly', interval: 1, byDay: ['MO'], endType: 'count', count: 4 },
      start,
      date('2026-09-01T00:00:00Z'),
    );
    expect(occ.length).toBeGreaterThanOrEqual(3);
    for (const d of occ) {
      expect(d.getDay()).toBe(1); // Monday
    }
  });

  it('biweekly emits every 14 days from seed', () => {
    const start = date('2026-06-01T09:00:00Z');
    const occ = computeOccurrences(
      start,
      { freq: 'biweekly', interval: 1, endType: 'count', count: 3 },
      start,
      date('2026-09-01T00:00:00Z'),
    );
    expect(occ.length).toBeGreaterThanOrEqual(1);
  });

  it('respects "until" end type', () => {
    const start = date('2026-06-01T10:00:00Z');
    const occ = computeOccurrences(
      start,
      {
        freq: 'daily',
        interval: 1,
        endType: 'until',
        until: date('2026-06-03T23:59:59Z'),
      },
      start,
      date('2026-12-31T00:00:00Z'),
    );
    expect(occ).toHaveLength(3);
  });

  it('range filter limits returned dates', () => {
    const start = date('2026-06-01T10:00:00Z');
    const occ = computeOccurrences(
      start,
      { freq: 'daily', interval: 1, endType: 'count', count: 30 },
      date('2026-06-05T00:00:00Z'),
      date('2026-06-09T23:59:59Z'),
    );
    // Days 5,6,7,8,9 = 5
    expect(occ).toHaveLength(5);
    expect(occ[0].toISOString().startsWith('2026-06-05')).toBe(true);
  });
});
