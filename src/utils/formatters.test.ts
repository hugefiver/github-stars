import { describe, it, expect } from 'vitest';
import { formatDate, formatNumber } from './formatters';

describe('formatNumber', () => {
  it('returns number as-is below 1000', () => {
    expect(formatNumber(0)).toBe('0');
    expect(formatNumber(1)).toBe('1');
    expect(formatNumber(999)).toBe('999');
  });

  it('formats thousands with k suffix', () => {
    expect(formatNumber(1000)).toBe('1.0k');
    expect(formatNumber(1500)).toBe('1.5k');
    expect(formatNumber(10000)).toBe('10.0k');
    expect(formatNumber(123456)).toBe('123.5k');
  });
});

describe('formatDate', () => {
  it('formats ISO date string to locale date', () => {
    const result = formatDate('2024-01-15T00:00:00Z');
    expect(result).toBeTruthy();
    expect(typeof result).toBe('string');
  });
});
