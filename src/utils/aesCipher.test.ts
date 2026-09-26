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

  it('round-trips unicode, punctuation and a long input', () => {
    for (const text of [
      'Halo dunia 123',
      'symbols: !@#$%^&*()_+-=[]{}|;:\'",.<>/?',
      'a'.repeat(500),
      'éèê mixed with ascii',
    ]) {
      const encrypted = processAES(text, KEY_128, 'encrypt').resultText;
      expect(processAES(encrypted, KEY_128, 'decrypt').resultText, JSON.stringify(text.slice(0, 20))).toBe(text);
    }
  });

  it('handles a single character and a text of exactly 16 bytes', () => {
    for (const text of ['A', '0123456789abcdef']) {
      const encrypted = processAES(text, KEY_128, 'encrypt').resultText;
      expect(processAES(encrypted, KEY_128, 'decrypt').resultText).toBe(text);
    }
  });

  it('emits lower-case-free hexadecimal, one block after another', () => {
    const encrypted = processAES('Attack at dawn', KEY_128, 'encrypt').resultText;
    expect(encrypted).toMatch(/^[0-9A-F]+$/);
    expect(encrypted.length % 32).toBe(0);
  });
});

describe('processAES determinism', () => {
  it('produces the same ciphertext every run for the same key and text', () => {
    // This was impossible with CryptoJS passphrase mode, which generated a
    // random salt on every call. AES-ECB with a fixed key is deterministic,
    // which is exactly the weakness that motivates using a real mode of
    // operation such as CBC or GCM.
    const first = processAES('Attack at dawn', KEY_128, 'encrypt').resultText;
    const second = processAES('Attack at dawn', KEY_128, 'encrypt').resultText;
    expect(first).toBe(second);
  });
});

describe('processAES padding', () => {
  it('adds a whole padding block when the text already fills a block', () => {
    const result = processAES('0123456789abcdef', KEY_128, 'encrypt');
    expect(result.blockCount).toBe(2);
    expect(result.paddingBytes).toBe(16);
  });

  it('adds between 1 and 16 padding bytes otherwise', () => {
    expect(processAES('a', KEY_128, 'encrypt').paddingBytes).toBe(15);
    expect(processAES('0123456789abcde', KEY_128, 'encrypt').paddingBytes).toBe(1);
  });

  it('reports the padding it removed on decrypt', () => {
    const encrypted = processAES('0123456789abcdef', KEY_128, 'encrypt').resultText;
    expect(processAES(encrypted, KEY_128, 'decrypt').paddingBytes).toBe(16);
  });
});

describe('processAES block handling', () => {
  it('splits a long input into 16-byte blocks and traces only the first', () => {
    const result = processAES('a'.repeat(70), KEY_128, 'encrypt');
    expect(result.blockCount).toBe(5);
    expect(result.blocks).toHaveLength(5);
    expect(result.blocks.filter((block) => block.detailed)).toHaveLength(1);
    expect(result.blocks[0].detailed).toBe(true);
  });

  it('reports the key size, round count and mode of operation', () => {
    const result = processAES('Hello', KEY_256, 'encrypt');
    expect(result.keyBytes).toBe(32);
    expect(result.rounds).toBe(14);
    expect(result.modeOfOperation).toBe('ECB');
    expect(result.mode).toBe('encrypt');
  });
});

describe('processAES visualization', () => {
  it('shows every round of the cipher, not just the first one', () => {
    const { steps, rounds } = processAES('Hello', KEY_128, 'encrypt');
    // One step for the plaintext, one for key expansion, then SubBytes,
    // ShiftRows, MixColumns and AddRoundKey for each round except the last,
    // which has no MixColumns. Plus the final ciphertext readout.
    const expected = 2 + rounds * 4 - 1 + 1;
    expect(steps).toHaveLength(expected);
    expect(steps[0].title).toContain('Plaintext block');
    expect(steps[1].title).toContain('Key expansion');
    expect(steps[steps.length - 1].title).toContain('Ciphertext block');
  });

  it('never shows a MixColumns step for the final round', () => {
    const { steps, rounds } = processAES('Hello', KEY_128, 'encrypt');
    const mixSteps = steps.filter((step) => step.title.includes('MixColumns'));
    expect(mixSteps).toHaveLength(rounds - 1);
  });

  it('gives every step a 4x4 matrix set', () => {
    const { steps } = processAES('Hello', KEY_128, 'encrypt');
    for (const step of steps) {
      for (const matrix of [step.matrixBefore, step.matrixKey, step.matrixAfter]) {
        if (!matrix) continue;
        expect(matrix).toHaveLength(4);
        for (const row of matrix) {
          expect(row).toHaveLength(4);
          for (const cell of row) expect(cell).toMatch(/^[0-9A-F]{2}$/);
        }
      }
    }
  });

  it('mirrors the steps when decrypting', () => {
    const key = KEY_128;
    const encrypted = processAES('Attack at dawn', key, 'encrypt').resultText;
    const { steps } = processAES(encrypted, key, 'decrypt');
    expect(steps[0].title).toContain('Ciphertext block');
    expect(steps.some((step) => step.title.includes('InvShiftRows'))).toBe(true);
    expect(steps.some((step) => step.title.includes('InvSubBytes'))).toBe(true);
    expect(steps.some((step) => step.title.includes('InvMixColumns'))).toBe(true);
    expect(steps[steps.length - 1].title).toContain('Recovered plaintext');
  });

  it('ends the encrypt trace with the ciphertext it reports', () => {
    const result = processAES('Attack at dawn', KEY_128, 'encrypt');
    const finalStep = result.steps[result.steps.length - 1];
    expect(finalStep.extraInfo).toContain(result.blocks[0].outputHex);
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

    expect(processAES('Hello', accented(8), 'encrypt').keyBytes).toBe(16);
    expect(processAES('Hello', accented(12), 'encrypt').keyBytes).toBe(24);
    expect(processAES('Hello', accented(16), 'encrypt').keyBytes).toBe(32);

    // 9 of them is 18 bytes, which is not a valid AES key size.
    expectCipherError(() => processAES('Hello', accented(9), 'encrypt'), 'AES_KEY_LENGTH');
  });

  it('rejects ciphertext that is not hexadecimal', () => {
    expectCipherError(() => processAES('not hex!', KEY_128, 'decrypt'), 'AES_CIPHERTEXT_FORMAT');
    expectCipherError(() => processAES('0x1234', KEY_128, 'decrypt'), 'AES_CIPHERTEXT_FORMAT');
  });

  it('rejects ciphertext that is not a whole number of blocks', () => {
    expectCipherError(() => processAES('ABCD', KEY_128, 'decrypt'), 'AES_CIPHERTEXT_FORMAT');
  });

  it('rejects decrypting with the wrong key', () => {
    const encrypted = processAES('Attack at dawn', KEY_128, 'encrypt').resultText;
    expectCipherError(() => processAES(encrypted, KEY_256, 'decrypt'), 'AES_DECRYPT_FAILED');
  });

  it('rejects ciphertext that was tampered with', () => {
    const encrypted = processAES('Attack at dawn', KEY_128, 'encrypt').resultText;
    const flipped = (encrypted[0] === '0' ? '1' : '0') + encrypted.slice(1);
    expectCipherError(() => processAES(flipped, KEY_128, 'decrypt'), 'AES_DECRYPT_FAILED');
  });
});
