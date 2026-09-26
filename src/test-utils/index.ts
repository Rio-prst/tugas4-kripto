import { expect } from 'vitest';
import { CipherError, type CipherErrorCode } from '@/lib/cipherError';

/**
 * Runs `fn` and asserts it fails with a CipherError carrying `code`.
 * Returns the error so the caller can make further assertions on the message.
 */
export function expectCipherError(fn: () => unknown, code: CipherErrorCode): CipherError {
  let caught: unknown;
  let threw = false;

  try {
    fn();
  } catch (error) {
    caught = error;
    threw = true;
  }

  expect(threw, `expected a CipherError with code ${code}, but nothing was thrown`).toBe(true);
  expect(caught, 'expected a CipherError instance').toBeInstanceOf(CipherError);

  const error = caught as CipherError;
  expect(error.code).toBe(code);
  return error;
}
