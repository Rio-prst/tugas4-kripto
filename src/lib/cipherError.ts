export type CipherErrorCode =
  // Caesar / Vigenere
  | 'EMPTY_INPUT'
  | 'SHIFT_NOT_INTEGER'
  | 'KEY_EMPTY'
  | 'KEY_NO_LETTERS'
  // RSA
  | 'P_NOT_PRIME'
  | 'Q_NOT_PRIME'
  | 'P_EQUALS_Q'
  | 'E_INVALID'
  | 'E_NOT_COPRIME'
  | 'MESSAGE_OUT_OF_RANGE'
  | 'CIPHERTEXT_NOT_NUMERIC'
  | 'CIPHERTEXT_OUT_OF_RANGE'
  // LFSR
  | 'SEED_NOT_BINARY'
  | 'SEED_TOO_SHORT'
  | 'SEED_ALL_ZERO'
  // AES
  | 'AES_KEY_LENGTH'
  | 'AES_DECRYPT_FAILED'
  // Shared
  | 'INPUT_TOO_LONG'
  | 'UNKNOWN';

export interface CipherErrorInfo {
  title: string;
  detail: string;
  hint?: string;
}

const MESSAGES: Record<CipherErrorCode, CipherErrorInfo> = {
  EMPTY_INPUT: {
    title: 'No input text',
    detail: 'Enter some text before running the cipher.',
  },
  SHIFT_NOT_INTEGER: {
    title: 'Shift must be a whole number',
    detail: 'The Caesar shift has to be an integer, otherwise the alphabet index is undefined.',
    hint: 'Try 3, 13, or 25. Negative values are allowed.',
  },
  KEY_EMPTY: {
    title: 'Key is required',
    detail: 'An empty Vigenere key would make the cipher an identity operation: the output would equal the input.',
    hint: 'Try "KEY", "ATTACKATDAWN", or any sequence of A-Z letters.',
  },
  KEY_NO_LETTERS: {
    title: 'Key contains no letters',
    detail: 'After removing everything that is not A-Z, the key is empty, so it cannot shift anything.',
  },
  P_NOT_PRIME: {
    title: 'p is not a prime number',
    detail: 'RSA requires p to be prime. A composite p would make the factorisation of n trivial.',
    hint: 'Small primes that work: 11, 13, 17, 19, 23, 29, 31, 41, 43, 47, 53, 59, 61, 67, 71.',
  },
  Q_NOT_PRIME: {
    title: 'q is not a prime number',
    detail: 'RSA requires q to be prime. A composite q would make the factorisation of n trivial.',
    hint: 'Small primes that work: 11, 13, 17, 19, 23, 29, 31, 41, 43, 47, 53, 59, 61, 67, 71.',
  },
  P_EQUALS_Q: {
    title: 'p and q must be different',
    detail: 'If p = q then n = p² and phi = (p-1)², which is not a valid RSA modulus.',
    hint: 'For example use p = 11 and q = 13.',
  },
  E_INVALID: {
    title: 'e is out of range',
    detail: 'The public exponent must satisfy 1 < e < phi(n).',
    hint: 'e = 7 is a common choice for small demonstration primes.',
  },
  E_NOT_COPRIME: {
    title: 'No private key exists for this e',
    detail: 'e must be coprime with phi(n). When gcd(e, phi) > 1 the congruence e·d ≡ 1 (mod phi) has no solution, so the key pair (e, d) cannot be generated at all.',
    hint: 'Change e, or change p and q so that phi is coprime with e.',
  },
  MESSAGE_OUT_OF_RANGE: {
    title: 'Message is larger than the modulus n',
    detail: 'RSA operates on integers in Z_n, so every block must satisfy 0 <= m < n. A character outside that range cannot be encrypted as a single block.',
    hint: 'Use larger primes, or restrict the input to characters whose code is below n.',
  },
  CIPHERTEXT_NOT_NUMERIC: {
    title: 'Ciphertext must be numbers',
    detail: 'Decryption expects the space-separated numbers produced by encryption.',
  },
  CIPHERTEXT_OUT_OF_RANGE: {
    title: 'Ciphertext block is out of range',
    detail: 'Each ciphertext number must be a residue in Z_n, so it has to satisfy 0 <= c < n.',
  },
  SEED_NOT_BINARY: {
    title: 'Seed must contain only 0 and 1',
    detail: 'The LFSR state is a bit string, so any other character has no meaning here.',
  },
  SEED_TOO_SHORT: {
    title: 'Seed is too short',
    detail: 'An LFSR needs at least 2 state bits to have two distinct XOR taps.',
    hint: '4 bits (e.g. 1001) is the classic maximal-length configuration and gives a period of 15.',
  },
  SEED_ALL_ZERO: {
    title: 'Seed is all zeros',
    detail: 'The all-zero state is an absorbing state: every new bit becomes 0 XOR 0 = 0, so the register can never leave it. The keystream would be all zeros, which means "encryption" would return the plaintext unchanged.',
    hint: 'Pick a seed with at least one 1, for example 1001 or 1010.',
  },
  AES_KEY_LENGTH: {
    title: 'AES key must be 16, 24, or 32 bytes',
    detail: 'AES only accepts key sizes of 128, 192, or 256 bits, which is 16, 24, or 32 bytes.',
    hint: 'A 16-character ASCII key is the simplest choice.',
  },
  AES_DECRYPT_FAILED: {
    title: 'Decryption failed',
    detail: 'The ciphertext could not be decrypted with this key. Either the key is wrong or the ciphertext has been altered or truncated.',
    hint: 'Check that the ciphertext was copied in full, including any padding characters.',
  },
  INPUT_TOO_LONG: {
    title: 'Input is too long',
    detail: 'This visualisation records one entry per character, so very long inputs produce tables that are slow to build and hard to read.',
  },
  UNKNOWN: {
    title: 'Something went wrong',
    detail: 'The cipher could not finish. Please try again with different parameters.',
  },
};

export function describeCipherError(code: CipherErrorCode, detail?: string): CipherErrorInfo {
  const base = MESSAGES[code] ?? MESSAGES.UNKNOWN;
  return detail ? { ...base, detail: `${base.detail} ${detail}` } : base;
}

export class CipherError extends Error {
  readonly code: CipherErrorCode;
  readonly detail?: string;

  constructor(code: CipherErrorCode, detail?: string) {
    const info = describeCipherError(code, detail);
    super(info.detail);
    this.name = 'CipherError';
    this.code = code;
    this.detail = detail;
  }

  get info(): CipherErrorInfo {
    return describeCipherError(this.code, this.detail);
  }
}

export function isCipherError(value: unknown): value is CipherError {
  return value instanceof CipherError;
}
