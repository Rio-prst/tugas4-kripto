import { CipherError } from '@/lib/cipherError';

export const MAX_INPUT = {
  caesar: 5000,
  vigenere: 5000,
  lfsr: 512,
  rsa: 2048,
  aes: 4096,
  superEncryption: 512,
} as const;

export type CipherKey = keyof typeof MAX_INPUT;

export function checkInputLength(length: number, cipher: CipherKey): void {
  const limit = MAX_INPUT[cipher];
  if (length > limit) {
    throw new CipherError('INPUT_TOO_LONG', `The limit for this cipher is ${limit} characters, but the input has ${length}.`);
  }
}
