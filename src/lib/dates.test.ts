import { describe, expect, it } from 'vitest';
import { addDays, daysBetween, isISODate, toISODate } from './dates';
import { formatDate, formatDateLong, formatKc, formatKcSigned, formatPercent, plural } from './format';

describe('data', () => {
  it('pozná platné a neplatné datum', () => {
    expect(isISODate('2026-11-21')).toBe(true);
    expect(isISODate('2028-02-29')).toBe(true);
    expect(isISODate('2026-02-29')).toBe(false);
    expect(isISODate('2026-13-01')).toBe(false);
    expect(isISODate('2026-1-01')).toBe(false);
    expect(isISODate('21. 11. 2026')).toBe(false);
    expect(isISODate(20261121)).toBe(false);
  });

  it('počítá dny i přes změnu času a přes přestupný rok', () => {
    expect(daysBetween('2026-03-28', '2026-03-30')).toBe(2);
    expect(daysBetween('2026-10-24', '2026-10-26')).toBe(2);
    expect(daysBetween('2028-02-28', '2028-03-01')).toBe(2);
    expect(daysBetween('2026-11-21', '2026-11-01')).toBe(-20);
  });

  it('přičte dny přes konec měsíce a roku', () => {
    expect(addDays('2026-12-30', 3)).toBe('2027-01-02');
    expect(addDays('2026-03-01', -1)).toBe('2026-02-28');
  });

  it('dnešek bere v místním čase', () => {
    expect(toISODate(new Date(2026, 10, 21, 0, 30))).toBe('2026-11-21');
  });
});

describe('formátování', () => {
  const plain = (s: string) => s.replace(/\s/g, ' ');

  it('koruny bez desetin', () => {
    expect(plain(formatKc(30_000))).toBe('30 000 Kč');
    expect(plain(formatKc(1_250.6))).toBe('1 251 Kč');
    expect(plain(formatKc(-0.4))).toBe('0 Kč');
    expect(plain(formatKcSigned(-500))).toBe('−500 Kč');
    expect(plain(formatKcSigned(500))).toBe('+500 Kč');
  });

  it('procenta zaokrouhlí dolů', () => {
    expect(plain(formatPercent(0.996))).toBe('99 %');
    expect(plain(formatPercent(1))).toBe('100 %');
  });

  it('česká data', () => {
    expect(plain(formatDate('2026-11-21'))).toBe('21. 11. 2026');
    expect(plain(formatDateLong('2026-07-05'))).toBe('5. července 2026');
  });

  it('množná čísla', () => {
    expect([0, 1, 2, 4, 5, 22].map((n) => plural(n, 'den', 'dny', 'dní'))).toEqual(['dní', 'den', 'dny', 'dny', 'dní', 'dní']);
  });
});
