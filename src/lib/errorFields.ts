import type { CipherErrorCode } from '@/lib/cipherError';

/**
 * Which form field each error code belongs to.
 *
 * The pages render a single error notice rather than one message per field, so
 * a field is marked invalid by asking which role it plays and checking whether
 * the current code belongs to it. Roles are used instead of raw element ids
 * because the same logical field has a different id on every page: the Caesar
 * shift is `shift-key` on /caesar but `caesar-shift` on /super-encryption.
 */
export const FIELD_CODES = {
  /** The free-text area that holds the message or the ciphertext. */
  inputText: [
    'EMPTY_INPUT',
    'MESSAGE_OUT_OF_RANGE',
    'CIPHERTEXT_NOT_NUMERIC',
    'CIPHERTEXT_OUT_OF_RANGE',
    'AES_CIPHERTEXT_FORMAT',
    'AES_DECRYPT_FAILED',
    'INPUT_TOO_LONG',
  ],
  /** Caesar shift on /caesar. */
  caesarShift: ['SHIFT_NOT_INTEGER'],
  /** Vigenere key. */
  vigenereKey: ['KEY_EMPTY', 'KEY_NO_LETTERS'],
  /** RSA prime p. P_EQUALS_Q is attributed here because p is the first value read. */
  rsaP: ['P_NOT_PRIME', 'P_EQUALS_Q'],
  /** RSA prime q. */
  rsaQ: ['Q_NOT_PRIME'],
  /** RSA public exponent. */
  rsaE: ['E_INVALID', 'E_NOT_COPRIME'],
  /** LFSR seed. */
  lfsrSeed: ['SEED_NOT_BINARY', 'SEED_TOO_SHORT', 'SEED_ALL_ZERO'],
  /** AES key. */
  aesKey: ['AES_KEY_LENGTH'],
} as const satisfies Record<string, readonly CipherErrorCode[]>;

export type FieldRole = keyof typeof FIELD_CODES;

const CODE_TO_FIELD: ReadonlyMap<CipherErrorCode, FieldRole> = new Map(
  (Object.entries(FIELD_CODES) as [FieldRole, readonly CipherErrorCode[]][]).flatMap(
    ([role, codes]) => codes.map((code) => [code, role] as const),
  ),
);

/**
 * True when `code` is the error currently being shown and it belongs to `role`.
 * A null code means nothing is wrong, so nothing is marked.
 */
export function isFieldInvalid(
  role: FieldRole,
  code: CipherErrorCode | null,
): boolean {
  if (!code) return false;
  return CODE_TO_FIELD.get(code) === role;
}

/** Every code that is attributed to some field, for the coverage test. */
export function mappedErrorCodes(): CipherErrorCode[] {
  return [...CODE_TO_FIELD.keys()];
}

/**
 * The props that tie a field to the shared error notice.
 *
 * Returned undefined rather than false so React omits the attributes entirely
 * while the field is fine, instead of marking every input invalid on every
 * page until an error happens.
 */
export function describedBy(
  role: FieldRole,
  code: CipherErrorCode | null,
  noticeId: string,
): {
  'aria-invalid'?: true;
  'aria-describedby'?: string;
} {
  if (!isFieldInvalid(role, code)) return {};
  return { 'aria-invalid': true, 'aria-describedby': noticeId };
}
