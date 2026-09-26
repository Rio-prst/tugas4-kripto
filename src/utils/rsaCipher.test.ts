import { describe, expect, it } from 'vitest';
import { isPrime, modInverse, processRSA } from '@/utils/rsaCipher';
import { expectCipherError } from '@/test-utils';

const P = '11';
const Q = '13';
const E = '7';

describe('isPrime', () => {
  it('accepts small primes', () => {
    for (const n of [2, 3, 5, 7, 11, 13, 17, 19, 23, 29, 31, 7919]) {
      expect(isPrime(n), `${n} should be prime`).toBe(true);
    }
  });

  it('rejects composites, small numbers and non-integers', () => {
    for (const n of [0, 1, -7, 4, 9, 15, 100, 143, 7917, 2.5, Number.NaN]) {
      expect(isPrime(n), `${n} should not be prime`).toBe(false);
    }
  });
});

describe('modInverse', () => {
  it('finds the inverse when one exists', () => {
    expect(modInverse(3, 11)).toBe(4);
    expect(modInverse(7, 120)).toBe(103);
    expect(modInverse(1, 5)).toBe(1);
  });

  it('returns null when the value is not coprime with the modulus', () => {
    expect(modInverse(2, 4)).toBeNull();
    expect(modInverse(0, 5)).toBeNull();
  });
});

describe('processRSA key generation', () => {
  it('keeps the documented defaults', () => {
    const { mathDetails, publicKey, privateKey } = processRSA('H', P, Q, E, 'encrypt');
    expect(mathDetails).toEqual({ p: 11, q: 13, n: 143, phi: 120, e: 7, d: 103 });
    expect(publicKey).toEqual({ e: 7, n: 143 });
    expect(privateKey).toEqual({ d: 103, n: 143 });
  });

  it('always satisfies e * d = 1 (mod phi)', () => {
    // phi(143) = 120 = 2^3 * 3 * 5, so a usable e must be odd and divisible by
    // neither 3 nor 5.
    for (const e of [7, 11, 13, 17, 19, 23, 29, 31, 37, 41, 43, 47, 49, 53, 59, 61, 67, 71]) {
      const { mathDetails } = processRSA('H', P, Q, String(e), 'encrypt');
      const product = (mathDetails.e * mathDetails.d) % mathDetails.phi;
      expect(product, `e = ${e} with phi = ${mathDetails.phi}`).toBe(1);
    }
  });
});

describe('processRSA encryption', () => {
  it('matches a hand-computed block', () => {
    // 72^7 mod 143 = 19
    expect(processRSA('H', P, Q, E, 'encrypt').resultText).toBe('19');
  });

  it('emits space separated numbers so the output can be copy-pasted', () => {
    // H = 72 -> 19, i = 105 -> 118, both computed as m^7 mod 143.
    expect(processRSA('Hi', P, Q, E, 'encrypt').resultText).toBe('19 118');
  });

  it('round-trips text through encrypt then decrypt', () => {
    const text = 'Hello, world!';
    const encrypted = processRSA(text, P, Q, E, 'encrypt').resultText;
    const decrypted = processRSA(encrypted, P, Q, E, 'decrypt').resultText;
    expect(decrypted).toBe(text);
  });

  it('works with the larger primes used by super-encryption', () => {
    const text = 'Hi';
    const encrypted = processRSA(text, '17', '19', '11', 'encrypt').resultText;
    expect(processRSA(encrypted, '17', '19', '11', 'decrypt').resultText).toBe(text);
  });
});

describe('processRSA validation', () => {
  it('rejects a p or q that is not prime', () => {
    expectCipherError(() => processRSA('H', '10', Q, E, 'encrypt'), 'P_NOT_PRIME');
    expectCipherError(() => processRSA('H', P, '9', E, 'encrypt'), 'Q_NOT_PRIME');
  });

  it('rejects p equal to q', () => {
    expectCipherError(() => processRSA('H', P, P, E, 'encrypt'), 'P_EQUALS_Q');
  });

  it('rejects e outside 1 < e < phi', () => {
    expectCipherError(() => processRSA('H', P, Q, '1', 'encrypt'), 'E_INVALID');
    expectCipherError(() => processRSA('H', P, Q, '120', 'encrypt'), 'E_INVALID');
  });

  it('rejects e that is not a whole number', () => {
    expectCipherError(() => processRSA('H', P, Q, 'abc', 'encrypt'), 'E_INVALID');
    expectCipherError(() => processRSA('H', 'abc', Q, E, 'encrypt'), 'E_INVALID');
  });

  it('rejects e that shares a factor with phi, because no private key exists', () => {
    // phi(143) = 120, so every even e is not coprime with it.
    for (const e of [2, 4, 6, 10]) {
      const error = expectCipherError(
        () => processRSA('H', P, Q, String(e), 'encrypt'),
        'E_NOT_COPRIME'
      );
      expect(error.message).toContain('has no solution');
    }
  });

  it('rejects a character whose code is not below n', () => {
    // 'e' with an acute accent is code 233, which is above n = 143.
    expectCipherError(() => processRSA('\u00e9', P, Q, E, 'encrypt'), 'MESSAGE_OUT_OF_RANGE');
  });

  it('rejects non-numeric ciphertext on decrypt', () => {
    expectCipherError(() => processRSA('abc', P, Q, E, 'decrypt'), 'CIPHERTEXT_NOT_NUMERIC');
  });

  it('rejects a ciphertext block that is not below n', () => {
    expectCipherError(() => processRSA('200', P, Q, E, 'decrypt'), 'CIPHERTEXT_OUT_OF_RANGE');
  });
});
