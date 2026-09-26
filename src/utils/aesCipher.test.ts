import { describe, expect, it } from 'vitest';
import { processAES } from '@/utils/aesCipher';
import { expectCipherError } from '@/test-utils';

const KEY_128 = '0123456789abcdef';
const KEY_192 = '0123456789abcdefghijklmn';
const KEY_256 = '0123456789abcdefghijklmnopqrstuv';

describe('processAES round trip', () => {
  it('round-trips text for each supported key size', () => {
    const text = 'Attack at dawn';
    for (const key of [KEY_128, KEY_192, KEY_256]) {
      const encrypted = processAES(text, key, 'encrypt').resultText;
      expect(processAES(encrypted, key, 'decrypt').resultText, `${key.length * 8}-bit key`).toBe(text);
    }
  });

  it('round-trips unicode text and empty-ish content', () => {
    const encrypted = processAES('Halo dunia 123', KEY_128, 'encrypt').resultText;
    expect(processAES(encrypted, KEY_128, 'decrypt').resultText).toBe('Halo dunia 123');
  });

  it('emits base64 ciphertext rather than raw binary', () => {
    const encrypted = processAES('Hello', KEY_128, 'encrypt').resultText;
    expect(encrypted).toMatch(/^[A-Za-z0-9+/=]+$/);
  });

  it('returns five visualization steps on encrypt', () => {
    const { steps } = processAES('Hello', KEY_128, 'encrypt');
    expect(steps).toHaveLength(5);
    expect(steps[0].matrixBefore).toHaveLength(4);
  });
});

describe('processAES validation', () => {
  it('rejects empty input', () => {
    expectCipherError(() => processAES('', KEY_128, 'encrypt'), 'EMPTY_INPUT');
  });

  it('rejects keys that are not 16, 24 or 32 bytes', () => {
    for (const key of ['short', 'a'.repeat(15), 'a'.repeat(17), 'a'.repeat(20), 'a'.repeat(31)]) {
      expectCipherError(() => processAES('Hello', key, 'encrypt'), 'AES_KEY_LENGTH');
    }
  });

  it('measures the key in bytes, not in characters', () => {
    // 'e' with an acute accent is 2 bytes in UTF-8, so 8 of them make a valid
    // 16-byte key even though the string is only 8 characters long. A naive
    // character count would have rejected this key.
    const accented = (count: number) => '\u00e9'.repeat(count);

    expect(new TextEncoder().encode(accented(8)).length).toBe(16);
    expect(processAES('Hello', accented(8), 'encrypt').steps).toHaveLength(5);

    expect(new TextEncoder().encode(accented(12)).length).toBe(24);
    expect(processAES('Hello', accented(12), 'encrypt').steps).toHaveLength(5);

    expect(new TextEncoder().encode(accented(16)).length).toBe(32);
    expect(processAES('Hello', accented(16), 'encrypt').steps).toHaveLength(5);

    // 9 of them is 18 bytes, which is not a valid AES key size.
    expectCipherError(() => processAES('Hello', accented(9), 'encrypt'), 'AES_KEY_LENGTH');
  });

  it('rejects decrypting with the wrong key', () => {
    const encrypted = processAES('Hello', KEY_128, 'encrypt').resultText;
    expectCipherError(
      () => processAES(encrypted, KEY_256, 'decrypt'),
      'AES_DECRYPT_FAILED'
    );
  });

  it('rejects ciphertext that is not valid base64 AES output', () => {
    expectCipherError(() => processAES('not-a-ciphertext', KEY_128, 'decrypt'), 'AES_DECRYPT_FAILED');
  });
});

describe('processAES determinism', () => {
  it.todo('should produce a stable ciphertext for a given key, which needs the native AES rewrite');
});
