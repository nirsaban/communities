import { encodeCursor, decodeCursor, parsePagination } from '../../src/utils/pagination';

describe('cursor pagination', () => {
  it('round-trips a cursor', () => {
    const c = encodeCursor({ createdAt: new Date('2026-06-01T12:00:00Z'), _id: '6650a000a0b0c0d0e0f00001' });
    const back = decodeCursor(c);
    expect(back._id).toBe('6650a000a0b0c0d0e0f00001');
    expect(back.createdAt.toISOString()).toBe('2026-06-01T12:00:00.000Z');
  });

  it('defaults limit when missing or invalid', () => {
    expect(parsePagination({}).limit).toBe(20);
    expect(parsePagination({ limit: 'banana' }).limit).toBe(20);
    expect(parsePagination({ limit: '50' }).limit).toBe(50);
    expect(parsePagination({ limit: '9999' }).limit).toBe(100);
  });

  it('rejects malformed cursor', () => {
    expect(() => parsePagination({ cursor: 'not-a-real-cursor' })).toThrow(/cursor/);
  });
});
