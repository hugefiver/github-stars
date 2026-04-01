import { describe, it, expect } from 'vitest';
import { getFundingIcon } from './funding-icons';

describe('getFundingIcon', () => {
  it('returns correct icon for known platforms', () => {
    expect(getFundingIcon('github')).toBe('💖');
    expect(getFundingIcon('patreon')).toBe('🎭');
    expect(getFundingIcon('ko-fi')).toBe('☕');
  });

  it('is case-insensitive', () => {
    expect(getFundingIcon('GitHub')).toBe('💖');
    expect(getFundingIcon('PATREON')).toBe('🎭');
    expect(getFundingIcon('Ko-Fi')).toBe('☕');
  });

  it('returns default icon for unknown platforms', () => {
    expect(getFundingIcon('unknown')).toBe('💰');
    expect(getFundingIcon('paypal')).toBe('💰');
  });
});
