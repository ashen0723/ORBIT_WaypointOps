import { isoDate, integer, objectBody } from './validation';
describe('Store request validation', () => {
  it('rejects overflow and timezone-bearing dates', () => {
    expect(() => isoDate('2026-02-30')).toThrow();
    expect(() => isoDate('2026-10-05T00:00:00Z')).toThrow();
  });
  it('rejects fractional quantities and forged identity fields', () => {
    expect(() => integer(1.5, 'qty', 1)).toThrow();
    expect(() => objectBody({ outletId: 'another-store' }, ['lines'])).toThrow();
  });
});
