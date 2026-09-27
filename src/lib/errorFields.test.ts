import { describe, expect, it } from 'vitest';
import {
  CIPHER_ERROR_CODES,
  type CipherErrorCode,
} from '@/lib/cipherError';
import { FIELD_CODES, describedBy, isFieldInvalid, mappedErrorCodes } from '@/lib/errorFields';

describe('isFieldInvalid', () => {
  it('marks nothing when there is no error', () => {
    for (const role of Object.keys(FIELD_CODES) as (keyof typeof FIELD_CODES)[]) {
      expect(isFieldInvalid(role, null)).toBe(false);
    }
  });

  it('marks only the field the error actually belongs to', () => {
    // Entering a non-integer shift must flag the shift box, not the text area
    // next to it. Getting this wrong would point a screen reader at the wrong
    // field, which is worse than marking nothing at all.
    expect(isFieldInvalid('caesarShift', 'SHIFT_NOT_INTEGER')).toBe(true);
    expect(isFieldInvalid('inputText', 'SHIFT_NOT_INTEGER')).toBe(false);
    expect(isFieldInvalid('vigenereKey', 'SHIFT_NOT_INTEGER')).toBe(false);
  });

  it('separates the three RSA fields from each other', () => {
    expect(isFieldInvalid('rsaP', 'P_NOT_PRIME')).toBe(true);
    expect(isFieldInvalid('rsaQ', 'P_NOT_PRIME')).toBe(false);
    expect(isFieldInvalid('rsaE', 'P_NOT_PRIME')).toBe(false);

    expect(isFieldInvalid('rsaQ', 'Q_NOT_PRIME')).toBe(true);
    expect(isFieldInvalid('rsaP', 'Q_NOT_PRIME')).toBe(false);

    expect(isFieldInvalid('rsaE', 'E_NOT_COPRIME')).toBe(true);
    expect(isFieldInvalid('rsaP', 'E_NOT_COPRIME')).toBe(false);
  });

  it('attributes p = q to p, since p is the first value validated', () => {
    expect(isFieldInvalid('rsaP', 'P_EQUALS_Q')).toBe(true);
    expect(isFieldInvalid('rsaQ', 'P_EQUALS_Q')).toBe(false);
  });

  it('treats an unmapped code as invalid on no field', () => {
    // UNKNOWN carries no field information, so it must not light up an input.
    expect(isFieldInvalid('inputText', 'UNKNOWN')).toBe(false);
    expect(isFieldInvalid('rsaP', 'UNKNOWN')).toBe(false);
  });
});

describe('describedBy', () => {
  it('returns nothing at all while no error is showing', () => {
    // Empty rather than false, so React omits the attributes instead of
    // marking every input on the page invalid by default.
    expect(describedBy('inputText', null, 'validation-notice')).toEqual({});
    expect(describedBy('rsaP', null, 'validation-notice')).toEqual({});
  });

  it('points the field at the notice and marks it invalid when the code is its own', () => {
    expect(describedBy('rsaQ', 'Q_NOT_PRIME', 'validation-notice')).toEqual({
      'aria-invalid': true,
      'aria-describedby': 'validation-notice',
    });
  });

  it('leaves an unrelated field completely untouched', () => {
    // The spread is applied unconditionally in the JSX, so this is the branch
    // that stops q being flagged while p is the one at fault.
    expect(describedBy('rsaQ', 'P_NOT_PRIME', 'validation-notice')).toEqual({});
    expect(describedBy('inputText', 'P_NOT_PRIME', 'validation-notice')).toEqual({});
  });

  it('passes the notice id through unchanged, whatever it is', () => {
    expect(describedBy('rsaP', 'P_NOT_PRIME', 'some-other-id')).toEqual({
      'aria-invalid': true,
      'aria-describedby': 'some-other-id',
    });
  });
});

describe('FIELD_CODES coverage', () => {
  /**
   * The guard that keeps this map from rotting. Without it, a new error code
   * would be added to cipherError.ts, thrown by some cipher, shown in the
   * notice, and no field would ever be marked invalid, with nothing failing.
   */
  it('accounts for every error code, with only UNKNOWN deliberately unmapped', () => {
    const unmappedByDesign: CipherErrorCode[] = ['UNKNOWN'];

    const expected = CIPHER_ERROR_CODES.filter(
      (code) => !unmappedByDesign.includes(code),
    ).sort();

    expect(mappedErrorCodes().sort()).toEqual(expected);
  });

  it('has no duplicate entries, so every code resolves to one field', () => {
    const listed = Object.values(FIELD_CODES).flat();
    expect(new Set(listed).size).toBe(listed.length);
  });

  it('resolves each code to a single field rather than several', () => {
    const all = Object.values(FIELD_CODES).flat();
    const resolved = all.map((code) =>
      (Object.keys(FIELD_CODES) as (keyof typeof FIELD_CODES)[]).filter((role) =>
        (FIELD_CODES[role] as readonly string[]).includes(code),
      ),
    );

    expect(resolved.every((roles) => roles.length === 1)).toBe(true);
  });
});
