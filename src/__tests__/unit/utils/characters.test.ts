import { describe, it, expect } from 'vitest';
import {
  getFirstGrapheme,
  normalizeBrushChar
} from '@/utils/characters';

describe('characters', () => {
  describe('getFirstGrapheme', () => {
    it('should return first ASCII character', () => {
      expect(getFirstGrapheme('Hello')).toBe('H');
    });

    it('should return first emoji (as grapheme cluster)', () => {
      expect(getFirstGrapheme('👋🏽Hello')).toBe('👋🏽');
    });

    it('should return first CJK character', () => {
      expect(getFirstGrapheme('你好')).toBe('你');
    });

    it('should handle empty string', () => {
      expect(getFirstGrapheme('')).toBe('');
    });

    it('should handle single character', () => {
      expect(getFirstGrapheme('X')).toBe('X');
    });

    it('should handle combining characters', () => {
      // é as e + combining acute accent
      expect(getFirstGrapheme('e\u0301abc')).toBe('e\u0301');
    });

    it('should handle flag emoji', () => {
      expect(getFirstGrapheme('🇺🇸USA')).toBe('🇺🇸');
    });

    it('should use fallback when Intl.Segmenter is unavailable', () => {
      // Save original state
      const hasSegmenter = 'Segmenter' in Intl;
      const originalSegmenter = (Intl as any).Segmenter;

      try {
        // Remove Segmenter from Intl
        delete (Intl as any).Segmenter;

        // Re-import to test the fallback path
        // We need to test the fallbackGrapheme function indirectly
        // by verifying the function still works without Segmenter
        const result = getFirstGrapheme('Hello');
        expect(result).toBe('H');
      } finally {
        // Restore
        if (hasSegmenter) {
          (Intl as any).Segmenter = originalSegmenter;
        }
      }
    });
  });

  describe('normalizeBrushChar', () => {
    it('should return first grapheme of input', () => {
      expect(normalizeBrushChar('Hello', '█')).toBe('H');
    });

    it('should return fallback for empty string', () => {
      expect(normalizeBrushChar('', '█')).toBe('█');
    });

    it('should return first whitespace character', () => {
      // Whitespace is a valid character, not empty
      expect(normalizeBrushChar('   ', '█')).toBe(' ');
    });

    it('should handle emoji input', () => {
      expect(normalizeBrushChar('👋🏽', '█')).toBe('👋🏽');
    });

    it('should handle CJK characters', () => {
      expect(normalizeBrushChar('你好世界', '█')).toBe('你');
    });

    it('should use provided fallback', () => {
      expect(normalizeBrushChar('', '*')).toBe('*');
    });
  });
});
