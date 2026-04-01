import { describe, it, expect } from 'vitest';
import { getLanguageColor, languageColors } from './language-colors';

describe('getLanguageColor', () => {
  it('returns correct color for known languages', () => {
    expect(getLanguageColor('JavaScript')).toBe('#f1e05a');
    expect(getLanguageColor('TypeScript')).toBe('#3178c6');
    expect(getLanguageColor('Python')).toBe('#3572A5');
    expect(getLanguageColor('Rust')).toBe('#dea584');
  });

  it('returns fallback color for unknown languages', () => {
    expect(getLanguageColor('UnknownLang')).toBe(languageColors.Other);
  });

  it('handles C++ with both key forms', () => {
    expect(getLanguageColor('C++')).toBe('#f34b7d');
    expect(getLanguageColor('Cpp')).toBe('#f34b7d');
  });

  it('handles languages with special characters via normalization', () => {
    expect(getLanguageColor('F#')).toBe('#b845fc');
    expect(getLanguageColor('Objective-C')).toBe('#438eff');
  });
});
