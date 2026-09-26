import { describe, expect, it } from 'vitest';
import {
  CipherError,
  describeCipherError,
  isCipherError,
  type CipherErrorCode,
} from '@/lib/cipherError';

const ALL_CODES: CipherErrorCode[] = [
  'EMPTY_INPUT',
  'SHIFT_NOT_INTEGER',
  'KEY_EMPTY',
  'KEY_NO_LETTERS',
  'P_NOT_PRIME',
  'Q_NOT_PRIME',
  'P_EQUALS_Q',
  'E_INVALID',
  'E_NOT_COPRIME',
  'MESSAGE_OUT_OF_RANGE',
  'CIPHERTEXT_NOT_NUMERIC',
  'CIPHERTEXT_OUT_OF_RANGE',
  'SEED_NOT_BINARY',
  'SEED_TOO_SHORT',
  'SEED_ALL_ZERO',
  'AES_KEY_LENGTH',
  'AES_CIPHERTEXT_FORMAT',
  'AES_DECRYPT_FAILED',
  'INPUT_TOO_LONG',
  'UNKNOWN',
];

describe('describeCipherError', () => {
  it('gives every known code a title and a detail message', () => {
    for (const code of ALL_CODES) {
      const info = describeCipherError(code);
      expect(info.title.length, `${code} title`).toBeGreaterThan(0);
      expect(info.detail.length, `${code} detail`).toBeGreaterThan(0);
    }
  });

  it('appends a supplied detail to the base message', () => {
    const info = describeCipherError('E_INVALID', 'but e = 4 was entered.');
    expect(info.detail).toContain('1 < e < phi(n)');
    expect(info.detail).toContain('but e = 4 was entered.');
  });

  it('falls back to UNKNOWN for an unrecognised code', () => {
    const info = describeCipherError('NOPE' as CipherErrorCode);
    expect(info.title).toBe(describeCipherError('UNKNOWN').title);
  });
});

describe('CipherError', () => {
  it('exposes the code, the name and the info object', () => {
    const error = new CipherError('SEED_ALL_ZERO', 'The seed "0000" contains no 1.');
    expect(error).toBeInstanceOf(Error);
    expect(error.name).toBe('CipherError');
    expect(error.code).toBe('SEED_ALL_ZERO');
    expect(error.detail).toBe('The seed "0000" contains no 1.');
    expect(error.info.hint).toContain('1001');
  });

  it('keeps the detail in the message so it survives logging', () => {
    const error = new CipherError('P_NOT_PRIME', 'p = 10 is not prime.');
    expect(error.message).toContain('p = 10 is not prime.');
  });
});

describe('isCipherError', () => {
  it('recognises a CipherError and rejects anything else', () => {
    expect(isCipherError(new CipherError('EMPTY_INPUT'))).toBe(true);
    expect(isCipherError(new Error('boom'))).toBe(false);
    expect(isCipherError(null)).toBe(false);
    expect(isCipherError('EMPTY_INPUT')).toBe(false);
  });
});
