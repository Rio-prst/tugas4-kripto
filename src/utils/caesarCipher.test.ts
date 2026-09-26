import { describe, expect, it } from 'vitest';
import { processCaesar } from '@/utils/caesarCipher';
import { expectCipherError } from '@/test-utils';

describe('processCaesar', () => {
  it('matches the textbook vector for a shift of 3', () => {
    expect(processCaesar('HELLO', 3, 'encrypt').resultText).toBe('KHOOR');
    expect(processCaesar('KHOOR', 3, 'decrypt').resultText).toBe('HELLO');
  });

  it('round-trips for every shift from 0 to 25', () => {
    const text = 'The Quick Brown Fox! 123';
    for (let shift = 0; shift < 26; shift++) {
      const encrypted = processCaesar(text, shift, 'encrypt').resultText;
      expect(processCaesar(encrypted, shift, 'decrypt').resultText, `shift ${shift}`).toBe(text);
    }
  });

  it('treats a shift of 26 and a shift of 0 as the identity', () => {
    expect(processCaesar('Hello', 26, 'encrypt').resultText).toBe('Hello');
    expect(processCaesar('Hello', 0, 'encrypt').resultText).toBe('Hello');
  });

  it('accepts negative shifts and wraps them into range', () => {
    expect(processCaesar('ABC', -1, 'encrypt').resultText).toBe('ZAB');
    expect(processCaesar('ABC', 0, 'encrypt').resultText).toBe('ABC');
  });

  it('preserves letter case and leaves non-letters untouched', () => {
    expect(processCaesar('aZ1 !', 5, 'encrypt').resultText).toBe('fE1 !');
  });

  it('handles an empty string without throwing', () => {
    expect(processCaesar('', 3, 'encrypt').resultText).toBe('');
  });

  it('records one step per input character', () => {
    const { steps } = processCaesar('abc', 1, 'encrypt');
    expect(steps).toHaveLength(3);
    expect(steps.every((step) => step.isAlphabetic)).toBe(true);
  });

  it('marks non-alphabetic characters in the step trace', () => {
    const { steps } = processCaesar('a1', 1, 'encrypt');
    expect(steps[0].isAlphabetic).toBe(true);
    expect(steps[1].isAlphabetic).toBe(false);
  });

  it('rejects a shift that is not a whole number', () => {
    expectCipherError(() => processCaesar('abc', 1.5, 'encrypt'), 'SHIFT_NOT_INTEGER');
    expectCipherError(() => processCaesar('abc', Number.NaN, 'encrypt'), 'SHIFT_NOT_INTEGER');
  });
});
