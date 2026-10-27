import { describe, expect, it } from 'vitest';
import { processCaesar } from '@/utils/caesarCipher';
import { processVigenere } from '@/utils/vigenereCipher';
import { processLFSR } from '@/utils/lfsrCipher';
import { processRSA } from '@/utils/rsaCipher';

describe('long input round trips', () => {
  it.each([3499, 10000])('preserves all %i characters through every pipeline stage', (length) => {
    const input = 'Attack at dawn! 123\n'.repeat(Math.ceil(length / 20) + 1).slice(0, length);
    const caesar = processCaesar(input, 3, 'encrypt');
    const vigenere = processVigenere(caesar.resultText, 'KEY', 'encrypt');
    const lfsr = processLFSR(vigenere.resultText, '1001', 'encrypt');
    const rsa = processRSA(lfsr.resultText, '17', '19', '11', 'encrypt');
    expect(caesar.steps).toHaveLength(length);
    expect(vigenere.steps).toHaveLength(length);
    expect(lfsr.steps).toHaveLength(length);
    expect(lfsr.resultText).toHaveLength(length * 2);
    expect(rsa.steps).toHaveLength(length * 2);
    const rsaBack = processRSA(rsa.resultText, '17', '19', '11', 'decrypt');
    const lfsrBack = processLFSR(rsaBack.resultText, '1001', 'decrypt');
    const vigenereBack = processVigenere(lfsrBack.resultText, 'KEY', 'decrypt');
    expect(processCaesar(vigenereBack.resultText, 3, 'decrypt').resultText).toBe(input);
  });
});
