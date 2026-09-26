import { describe, expect, it } from 'vitest';
import { processVigenere } from '@/utils/vigenereCipher';
import { expectCipherError } from '@/test-utils';

describe('processVigenere', () => {
  it('matches the textbook ATTACKATDAWN / LEMON vector', () => {
    expect(processVigenere('ATTACKATDAWN', 'LEMON', 'encrypt').resultText).toBe('LXFOPVEFRNHR');
    expect(processVigenere('LXFOPVEFRNHR', 'LEMON', 'decrypt').resultText).toBe('ATTACKATDAWN');
  });

  it('round-trips a mixed-case sentence with punctuation', () => {
    const text = 'Attack at dawn, 5 oclock!';
    const key = 'Lemon';
    const encrypted = processVigenere(text, key, 'encrypt').resultText;
    expect(processVigenere(encrypted, key, 'decrypt').resultText).toBe(text);
  });

  it('advances the key only on letters, so spaces do not consume key characters', () => {
    expect(processVigenere('A B', 'K', 'encrypt').resultText).toBe('K L');
  });

  it('is case-insensitive about the key', () => {
    expect(processVigenere('abc', 'key', 'encrypt').resultText).toBe(
      processVigenere('abc', 'KEY', 'encrypt').resultText
    );
  });

  it('strips non A-Z characters out of the key', () => {
    // 'k3y!' keeps only the letters K and Y, so the digit is dropped but the
    // letter after it still counts towards the key.
    expect(processVigenere('abc', 'k3y!', 'encrypt').resultText).toBe(
      processVigenere('abc', 'KY', 'encrypt').resultText
    );
    expect(processVigenere('abc', 'a-b-c', 'encrypt').resultText).toBe(
      processVigenere('abc', 'ABC', 'encrypt').resultText
    );
  });

  it('records one step per input character', () => {
    const { steps } = processVigenere('ab1', 'K', 'encrypt');
    expect(steps).toHaveLength(3);
  });

  it('rejects an empty or whitespace-only key', () => {
    expectCipherError(() => processVigenere('abc', '', 'encrypt'), 'KEY_EMPTY');
    expectCipherError(() => processVigenere('abc', '   ', 'encrypt'), 'KEY_EMPTY');
  });

  it('rejects a key that has no letters left after filtering', () => {
    expectCipherError(() => processVigenere('abc', '123', 'encrypt'), 'KEY_NO_LETTERS');
  });
});
