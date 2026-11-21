import { describe, expect, it } from 'vitest';
import { parseAmount } from './parse';

describe('parseAmount', () => {
  it.each([
    ['30000', 30_000],
    ['30 000', 30_000],
    ['30 000', 30_000],
    ['  42  ', 42],
    ['1250,50', 1_250.5],
    ['1 250,5 Kč', 1_250.5],
    ['500 kč', 500],
    ['500,-', 500],
    ['12.5', 12.5],
    ['30.000', 30_000],
    ['1.250.000', 1_250_000],
    ['1.250,75', 1_250.75],
    ['1,250.75', 1_250.75],
    ['0.500', 0.5],
    [',5', 0.5],
    ['-500', -500],
  ])('„%s“ → %d', (input, expected) => {
    expect(parseAmount(input)).toBe(expected);
  });

  it.each(['', '   ', 'abc', '12a', '1,2,3', '--5', 'Kč', '1e5', 'Infinity'])('„%s“ není číslo', (input) => {
    expect(parseAmount(input)).toBeNull();
  });
});
